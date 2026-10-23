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
    ai_provider: str  # mock | openai_compatible | off
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
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
    return Settings(
        cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
        max_draft_chars=_int("MAX_DRAFT_CHARS", 10000),
        max_reference_items=_int("MAX_REFERENCE_ITEMS", 200),
        ai_provider=os.getenv("AI_PROVIDER", "mock").strip().lower(),
        ai_api_key=os.getenv("AI_API_KEY", ""),
        ai_base_url=os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
        ai_model=os.getenv("AI_MODEL", "gpt-4o-mini"),
        ai_timeout_seconds=_int("AI_TIMEOUT_SECONDS", 30),
        ai_max_retries=_int("AI_MAX_RETRIES", 1),
        ai_required=_bool("AI_REQUIRED", False),
        enable_accessibility_checks=_bool("ENABLE_ACCESSIBILITY_CHECKS", True),
    )
