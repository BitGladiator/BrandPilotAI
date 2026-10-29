"""Environment-based configuration (no secrets in code)."""
import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


@dataclass(frozen=True)
class Settings:
    cors_origins: list[str]
    max_draft_chars: int
    max_reference_items: int
    ai_provider: str  # groq | openai_compatible | mock | off
    ai_api_key: str
    ai_base_url: str
    ai_model: str
    ai_timeout_seconds: int
    ai_max_retries: int
    ai_required: bool
    enable_accessibility_checks: bool

    # Database
    database_url: str

    # Auth
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_expire_minutes: int

    # Document upload & storage
    max_upload_size_bytes: int
    document_storage_dir: str

    # Embeddings & pgvector retrieval
    embedding_provider: str  # mock | openai | voyage | off
    embedding_api_key: str
    embedding_base_url: str
    embedding_model: str
    embedding_dim: int
    chunk_size: int
    chunk_overlap: int
    max_retrieved_passages: int

    @property
    def ai_enabled(self) -> bool:
        return self.ai_provider != "off"

    @property
    def embedding_enabled(self) -> bool:
        return self.embedding_provider != "off"


def get_settings() -> Settings:
    """Read settings fresh each call (cheap; lets tests change env vars)."""
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173").strip()
    if origins == "*":
        cors_list = ["*"]
    else:
        cors_list = [o.strip() for o in origins.split(",") if o.strip()]
    
    api_key = (os.getenv("GROQ_API_KEY") or os.getenv("AI_API_KEY") or "").strip()
    
    env_provider = os.getenv("AI_PROVIDER", "").strip().lower()
    if env_provider:
        provider = env_provider
    elif api_key:
        provider = "groq"
    else:
        provider = "mock"

    default_base_url = "https://api.groq.com/openai/v1"
    base_url = os.getenv("AI_BASE_URL", default_base_url).rstrip("/")
    default_model = "openai/gpt-oss-120b"
    model = os.getenv("AI_MODEL", default_model).strip()

    # Database URL
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres@127.0.0.1:5433/brandpilot",
    ).strip()

    # Document upload
    storage_dir = os.getenv("DOCUMENT_STORAGE_DIR", "storage/documents").strip()
    max_upload = _int("MAX_UPLOAD_SIZE_BYTES", 10 * 1024 * 1024)  # 10 MB

    # Embeddings
    emb_provider = os.getenv("EMBEDDING_PROVIDER", "mock").strip().lower()
    emb_api_key = (os.getenv("EMBEDDING_API_KEY") or api_key).strip()
    emb_base_url = os.getenv("EMBEDDING_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    emb_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small").strip()
    emb_dim = _int("EMBEDDING_DIM", 1536)

    return Settings(
        cors_origins=cors_list,
        max_draft_chars=_int("MAX_DRAFT_CHARS", 10000),
        max_reference_items=_int("MAX_REFERENCE_ITEMS", 200),
        ai_provider=provider,
        ai_api_key=api_key,
        ai_base_url=base_url,
        ai_model=model,
        ai_timeout_seconds=_int("AI_TIMEOUT_SECONDS", 30),
        ai_max_retries=_int("AI_MAX_RETRIES", 2),
        ai_required=_bool("AI_REQUIRED", False),
        enable_accessibility_checks=_bool("ENABLE_ACCESSIBILITY_CHECKS", True),
        database_url=db_url,
        jwt_secret_key=os.getenv("JWT_SECRET_KEY", "brandpilot-atelier-secret-key-change-in-production"),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        jwt_expire_minutes=_int("JWT_EXPIRE_MINUTES", 1440),
        max_upload_size_bytes=max_upload,
        document_storage_dir=storage_dir,
        embedding_provider=emb_provider,
        embedding_api_key=emb_api_key,
        embedding_base_url=emb_base_url,
        embedding_model=emb_model,
        embedding_dim=emb_dim,
        chunk_size=_int("CHUNK_SIZE", 500),
        chunk_overlap=_int("CHUNK_OVERLAP", 100),
        max_retrieved_passages=_int("MAX_RETRIEVED_PASSAGES", 5),
    )
