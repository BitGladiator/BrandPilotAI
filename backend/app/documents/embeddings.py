"""Embedding provider abstraction for semantic retrieval in BrandPilot."""
import hashlib
import math
import re
from abc import ABC, abstractmethod
from typing import Optional

import httpx

from app.config import Settings, get_settings


class EmbeddingServiceUnavailableError(Exception):
    """Raised when embedding provider is disabled or missing credentials."""
    pass


class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def dimension(self) -> int:
        pass

    @abstractmethod
    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        pass

    async def embed_query(self, query: str) -> list[float]:
        res = await self.embed_texts([query])
        return res[0]


class MockEmbeddingProvider(EmbeddingProvider):
    """Deterministic hash-based dense vector provider.

    Produces unit-length embeddings in dimension D without external API calls.
    Semantic similarity is preserved for overlapping word tokens and n-grams.
    """

    def __init__(self, dimension: int = 1536):
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        embeddings = []
        for text in texts:
            vec = [0.0] * self._dim
            tokens = re.findall(r"\b\w+\b", text.lower())
            if not tokens:
                vec[0] = 1.0
                embeddings.append(vec)
                continue

            for token in tokens:
                # Hash token to multiple bucket indices
                h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
                idx = h % self._dim
                vec[idx] += 1.0

                # Also bigram features
                h2 = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
                idx2 = h2 % self._dim
                vec[idx2] += 0.5

            # Normalize to unit length (L2 norm)
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            else:
                vec[0] = 1.0
            embeddings.append(vec)
        return embeddings


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI / OpenAI-compatible API embedding provider."""

    def __init__(self, api_key: str, base_url: str, model: str, dimension: int = 1536):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not self._api_key:
            raise EmbeddingServiceUnavailableError(
                "Embedding API key is not configured. Please set EMBEDDING_API_KEY in backend/.env."
            )

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "input": texts,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(f"{self._base_url}/embeddings", json=payload, headers=headers)
            if res.status_code != 200:
                raise EmbeddingServiceUnavailableError(
                    f"Embedding API request failed ({res.status_code}): {res.text[:200]}"
                )
            data = res.json()
            return [item["embedding"] for item in data["data"]]
        except httpx.RequestError as exc:
            raise EmbeddingServiceUnavailableError(f"Embedding network connection error: {exc}")


def get_embedding_provider(settings: Optional[Settings] = None) -> EmbeddingProvider:
    if settings is None:
        settings = get_settings()

    provider_name = settings.embedding_provider.lower().strip()
    if provider_name == "off":
        raise EmbeddingServiceUnavailableError(
            "Semantic retrieval is disabled (EMBEDDING_PROVIDER=off). Set EMBEDDING_PROVIDER=mock or EMBEDDING_PROVIDER=openai in backend/.env to enable guideline retrieval."
        )

    if provider_name == "mock":
        return MockEmbeddingProvider(dimension=settings.embedding_dim)

    if provider_name in {"openai", "openai_compatible", "groq"}:
        if not settings.embedding_api_key:
            raise EmbeddingServiceUnavailableError(
                "Embedding provider is configured as OpenAI/Groq but EMBEDDING_API_KEY is missing. Please set EMBEDDING_API_KEY in backend/.env or set EMBEDDING_PROVIDER=mock for offline testing."
            )
        return OpenAIEmbeddingProvider(
            api_key=settings.embedding_api_key,
            base_url=settings.embedding_base_url,
            model=settings.embedding_model,
            dimension=settings.embedding_dim,
        )

    # Fallback to mock
    return MockEmbeddingProvider(dimension=settings.embedding_dim)
