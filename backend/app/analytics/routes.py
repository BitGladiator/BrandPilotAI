"""Routes for recurring-issues analytics dashboard."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.analytics_service import get_recurring_issues_analytics
from app.auth.dependencies import get_optional_user
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/recurring-issues")
def get_recurring_issues(
    date_from: Optional[datetime] = Query(None, description="ISO format start date"),
    date_to: Optional[datetime] = Query(None, description="ISO format end date"),
    category: Optional[str] = Query(None, description="Category filter"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Authenticated endpoint returning recurring-issues analytics computed from real persisted events."""
    return get_recurring_issues_analytics(
        db=db,
        user=current_user,
        date_from=date_from,
        date_to=date_to,
        category_filter=category,
    )
