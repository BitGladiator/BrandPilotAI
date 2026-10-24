"""Environment-based configuration (no secrets in code)."""
import os
from dataclasses import dataclass

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

    @property
    def ai_enabled(self) -> bool:
        return self.ai_provider != "off"


def get_settings() -> Settings:
    """Read settings fresh each call (cheap; lets tests change env vars)."""
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173").strip()
    if origins == "*":
        cors_list = ["*"]
    else:
        cors_list = [o.strip() for o in origins.split(",") if o.strip()]
    
    # Priority for Groq / AI API Key
    api_key = (os.getenv("GROQ_API_KEY") or os.getenv("AI_API_KEY") or "").strip()
    
    # Provider: default to groq if key is present or AI_PROVIDER is set
    env_provider = os.getenv("AI_PROVIDER", "").strip().lower()
    if env_provider:
        provider = env_provider
    elif api_key:
        provider = "groq"
    else:
        provider = "mock"

    # Default Base URL: Groq Cloud endpoint
    default_base_url = "https://api.groq.com/openai/v1"
    base_url = os.getenv("AI_BASE_URL", default_base_url).rstrip("/")

    # Default model: Groq GPT model openai/gpt-oss-120b (or gpt-4o-mini)
    default_model = "openai/gpt-oss-120b"
    model = os.getenv("AI_MODEL", default_model).strip()

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
    )
