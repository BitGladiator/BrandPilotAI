from fastapi import APIRouter

from app.config import get_settings
from app.services.reference_data import get_sample_reference

router = APIRouter()


@router.get("/health", tags=["system"])
async def health():
    s = get_settings()
    return {"status": "ok", "ai_provider": s.ai_provider, "version": "0.2.0"}


@router.get("/sample-data", tags=["reference"])
async def sample_data():
    """Sample guidelines/terms/facts the frontend can load into its selector."""
    return get_sample_reference()
