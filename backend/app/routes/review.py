from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_db
from app.schemas.review import ErrorResponse, ReviewRequest, ReviewResponse
from app.services.ai_review import AIServiceError
from app.services.review_service import review_draft

router = APIRouter()


@router.post(
    "/review",
    response_model=ReviewResponse,
    responses={422: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
    tags=["review"],
    summary="Review a draft against brand guidelines, terms and facts",
)
async def review(req: ReviewRequest, db: Session = Depends(get_db)):
    try:
        return await review_draft(req, get_settings(), db=db)
    except AIServiceError as exc:  # only reached when AI_REQUIRED=true
        return JSONResponse(
            status_code=502,
            content={"error": "ai_unavailable", "message": str(exc)},
        )
