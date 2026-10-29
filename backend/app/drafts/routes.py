"""Draft lifecycle, revisions, reviewer approval workflow, and suggestion decision audit routes."""
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.config import get_settings
from app.db.models import (
    AuditEvent,
    Draft,
    DraftFinding,
    DraftRevision,
    ReviewerDecision,
    SuggestionDecision,
    User,
)
from app.db.session import get_db
from app.schemas.review import Citation, Finding, ReviewRequest
from app.services.review_service import review_draft

router = APIRouter(prefix="/drafts", tags=["Drafts & Approval Workflow"])


# ---------- Schemas ----------

class CreateDraftRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    draft_text: str = Field(min_length=1, max_length=10000)


class UpdateDraftRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    draft_text: Optional[str] = Field(default=None, max_length=10000)


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: Optional[str] = Field(default=None, max_length=2000)


class SuggestionActionRequest(BaseModel):
    action: Literal["accept", "dismiss", "override"]
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    comment: Optional[str] = None


class DraftSummaryResponse(BaseModel):
    id: str
    title: str
    current_status: str
    creator_id: str
    creator_name: str
    creator_email: str
    latest_revision_number: int
    created_at: datetime
    updated_at: datetime


class RevisionResponse(BaseModel):
    id: str
    draft_id: str
    revision_number: int
    author_id: Optional[str]
    draft_text: str
    review_summary: Optional[str] = None
    ai_status: Optional[str] = None
    needs_human_review: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FindingResponse(BaseModel):
    id: str
    revision_id: str
    rule_id: Optional[str] = None
    category: str
    severity: str
    excerpt: str
    explanation: str
    suggestion: str
    evidence_ids: list[str] = []
    confidence: str
    source: str
    start: Optional[int] = None
    end: Optional[int] = None
    citations: list[dict] = []
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DraftDetailResponse(BaseModel):
    id: str
    title: str
    current_status: str
    creator_id: str
    creator_name: str
    creator_email: str
    latest_revision: RevisionResponse
    findings: list[FindingResponse]
    decisions: list[dict]
    created_at: datetime
    updated_at: datetime


class AuditEventResponse(BaseModel):
    id: str
    draft_id: Optional[str]
    revision_id: Optional[str]
    actor_id: Optional[str]
    actor_email: Optional[str]
    action_type: str
    details: Optional[dict]
    created_at: datetime


# ---------- Helpers ----------

def record_audit_event(
    db: Session,
    action_type: str,
    actor_id: Optional[str],
    draft_id: Optional[str] = None,
    revision_id: Optional[str] = None,
    details: Optional[dict] = None,
):
    """Append-only immutable audit trail record."""
    event = AuditEvent(
        draft_id=draft_id,
        revision_id=revision_id,
        actor_id=actor_id,
        action_type=action_type,
        details=details or {},
    )
    db.add(event)


# ---------- Routes ----------

@router.post("", response_model=DraftDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_draft(
    req: CreateDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new draft, saves Revision 1, runs automated review, and records audit event."""
    draft = Draft(
        creator_id=current_user.id,
        title=req.title.strip(),
        current_status="draft",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    # Run review for revision 1
    settings = get_settings()
    review_res = await review_draft(ReviewRequest(draft_text=req.draft_text), settings, db=db)

    revision = DraftRevision(
        draft_id=draft.id,
        revision_number=1,
        author_id=current_user.id,
        draft_text=req.draft_text,
        review_summary=review_res.review_summary,
        ai_status=review_res.ai_status,
        needs_human_review=review_res.needs_human_review,
    )
    db.add(revision)
    db.commit()
    db.refresh(revision)

    # Persist findings
    finding_objs = []
    for f in review_res.findings:
        citations_data = [c.model_dump() for c in f.citations]
        rule_key = f.evidence_ids[0] if f.evidence_ids else (f.id or f.category)
        finding_unique_id = f"{revision.id}-{f.id or len(finding_objs)+1}"
        db_finding = DraftFinding(
            id=finding_unique_id,
            revision_id=revision.id,
            rule_id=rule_key,
            category=f.category,
            severity=f.severity,
            excerpt=f.excerpt,
            explanation=f.explanation,
            suggestion=f.suggestion,
            evidence_ids=f.evidence_ids,
            confidence=f.confidence,
            source=f.source,
            start=f.start,
            end=f.end,
            citations=citations_data,
            status="open",
        )
        db.add(db_finding)
        finding_objs.append(db_finding)
    db.commit()

    record_audit_event(
        db,
        action_type="draft_created",
        actor_id=current_user.id,
        draft_id=draft.id,
        revision_id=revision.id,
        details={"title": draft.title, "char_count": len(req.draft_text), "finding_count": len(finding_objs)},
    )
    db.commit()

    return DraftDetailResponse(
        id=draft.id,
        title=draft.title,
        current_status=draft.current_status,
        creator_id=current_user.id,
        creator_name=current_user.full_name,
        creator_email=current_user.email,
        latest_revision=RevisionResponse.model_validate(revision),
        findings=[FindingResponse.model_validate(f) for f in finding_objs],
        decisions=[],
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.get("", response_model=list[DraftSummaryResponse])
def list_drafts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists drafts. Creators see their own drafts; reviewers see all submitted or active drafts."""
    query = db.query(Draft)
    if current_user.role == "creator":
        query = query.filter(Draft.creator_id == current_user.id)
    
    drafts = query.order_by(Draft.updated_at.desc()).all()
    results = []
    for d in drafts:
        latest_rev = (
            db.query(DraftRevision)
            .filter(DraftRevision.draft_id == d.id)
            .order_by(DraftRevision.revision_number.desc())
            .first()
        )
        rev_num = latest_rev.revision_number if latest_rev else 1
        results.append(DraftSummaryResponse(
            id=d.id,
            title=d.title,
            current_status=d.current_status,
            creator_id=d.creator_id,
            creator_name=d.creator.full_name if d.creator else "Unknown",
            creator_email=d.creator.email if d.creator else "unknown@brandpilot.ai",
            latest_revision_number=rev_num,
            created_at=d.created_at,
            updated_at=d.updated_at,
        ))
    return results


@router.get("/queue", response_model=list[DraftSummaryResponse])
def get_reviewer_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["reviewer", "admin"])),
):
    """Reviewer queue: list drafts that are submitted or in_review."""
    drafts = (
        db.query(Draft)
        .filter(Draft.current_status.in_(["submitted", "in_review"]))
        .order_by(Draft.updated_at.asc())
        .all()
    )
    results = []
    for d in drafts:
        latest_rev = (
            db.query(DraftRevision)
            .filter(DraftRevision.draft_id == d.id)
            .order_by(DraftRevision.revision_number.desc())
            .first()
        )
        results.append(DraftSummaryResponse(
            id=d.id,
            title=d.title,
            current_status=d.current_status,
            creator_id=d.creator_id,
            creator_name=d.creator.full_name if d.creator else "Unknown",
            creator_email=d.creator.email if d.creator else "unknown@brandpilot.ai",
            latest_revision_number=latest_rev.revision_number if latest_rev else 1,
            created_at=d.created_at,
            updated_at=d.updated_at,
        ))
    return results


@router.get("/{draft_id}", response_model=DraftDetailResponse)
def get_draft_detail(
    draft_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    # Isolation: creator can only view their own drafts unless user is reviewer/admin
    if current_user.role == "creator" and draft.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this draft.")

    latest_rev = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id)
        .order_by(DraftRevision.revision_number.desc())
        .first()
    )
    if not latest_rev:
        raise HTTPException(status_code=404, detail="No revision found for draft.")

    findings = db.query(DraftFinding).filter(DraftFinding.revision_id == latest_rev.id).all()
    decisions = (
        db.query(ReviewerDecision)
        .filter(ReviewerDecision.draft_id == draft_id)
        .order_by(ReviewerDecision.created_at.desc())
        .all()
    )

    decisions_data = [
        {
            "id": dec.id,
            "decision": dec.decision,
            "comment": dec.comment,
            "reviewer_email": dec.reviewer.email if dec.reviewer else "Unknown",
            "created_at": dec.created_at.isoformat(),
        }
        for dec in decisions
    ]

    return DraftDetailResponse(
        id=draft.id,
        title=draft.title,
        current_status=draft.current_status,
        creator_id=draft.creator_id,
        creator_name=draft.creator.full_name if draft.creator else "Unknown",
        creator_email=draft.creator.email if draft.creator else "unknown@brandpilot.ai",
        latest_revision=RevisionResponse.model_validate(latest_rev),
        findings=[FindingResponse.model_validate(f) for f in findings],
        decisions=decisions_data,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.put("/{draft_id}", response_model=DraftDetailResponse)
async def update_draft(
    draft_id: str,
    req: UpdateDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates draft text or title. Creates a new immutable revision if text changes."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    if current_user.role == "creator" and draft.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own drafts.")

    if draft.current_status == "approved":
        raise HTTPException(status_code=400, detail="Approved drafts cannot be edited.")

    if draft.current_status == "submitted" and current_user.role == "creator":
        raise HTTPException(status_code=400, detail="Draft is currently in review. Wait for review decision before editing.")

    if req.title:
        draft.title = req.title.strip()

    latest_rev = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id)
        .order_by(DraftRevision.revision_number.desc())
        .first()
    )

    new_text = req.draft_text.strip() if req.draft_text else None

    # If text is updated and differs from latest revision, create next revision
    if new_text and (not latest_rev or new_text != latest_rev.draft_text):
        next_rev_num = (latest_rev.revision_number + 1) if latest_rev else 1

        # Run review
        settings = get_settings()
        review_res = await review_draft(ReviewRequest(draft_text=new_text), settings, db=db)

        new_rev = DraftRevision(
            draft_id=draft.id,
            revision_number=next_rev_num,
            author_id=current_user.id,
            draft_text=new_text,
            review_summary=review_res.review_summary,
            ai_status=review_res.ai_status,
            needs_human_review=review_res.needs_human_review,
        )
        db.add(new_rev)
        db.commit()
        db.refresh(new_rev)

        finding_objs = []
        for f in review_res.findings:
            rule_key = f.evidence_ids[0] if f.evidence_ids else (f.id or f.category)
            finding_unique_id = f"{new_rev.id}-{f.id or len(finding_objs)+1}"
            db_finding = DraftFinding(
                id=finding_unique_id,
                revision_id=new_rev.id,
                rule_id=rule_key,
                category=f.category,
                severity=f.severity,
                excerpt=f.excerpt,
                explanation=f.explanation,
                suggestion=f.suggestion,
                evidence_ids=f.evidence_ids,
                confidence=f.confidence,
                source=f.source,
                start=f.start,
                end=f.end,
                citations=[c.model_dump() for c in f.citations],
                status="open",
            )
            db.add(db_finding)
            finding_objs.append(db_finding)

        # If draft was rejected, editing resets status to draft
        if draft.current_status == "rejected":
            draft.current_status = "draft"

        db.commit()

        record_audit_event(
            db,
            action_type="draft_edited",
            actor_id=current_user.id,
            draft_id=draft.id,
            revision_id=new_rev.id,
            details={"revision_number": next_rev_num, "char_count": len(new_text)},
        )
        db.commit()
        latest_rev = new_rev

    db.refresh(draft)
    findings = db.query(DraftFinding).filter(DraftFinding.revision_id == latest_rev.id).all()
    return DraftDetailResponse(
        id=draft.id,
        title=draft.title,
        current_status=draft.current_status,
        creator_id=draft.creator_id,
        creator_name=draft.creator.full_name if draft.creator else "Unknown",
        creator_email=draft.creator.email if draft.creator else "unknown@brandpilot.ai",
        latest_revision=RevisionResponse.model_validate(latest_rev),
        findings=[FindingResponse.model_validate(f) for f in findings],
        decisions=[],
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.post("/{draft_id}/submit")
def submit_draft_for_review(
    draft_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creators submit drafts for reviewer approval."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    if current_user.role == "creator" and draft.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only submit your own drafts.")

    if draft.current_status == "submitted":
        raise HTTPException(status_code=400, detail="Draft is already submitted for review.")

    if draft.current_status == "approved":
        raise HTTPException(status_code=400, detail="Draft has already been approved.")

    draft.current_status = "submitted"
    db.commit()

    latest_rev = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id)
        .order_by(DraftRevision.revision_number.desc())
        .first()
    )

    record_audit_event(
        db,
        action_type="draft_submitted",
        actor_id=current_user.id,
        draft_id=draft.id,
        revision_id=latest_rev.id if latest_rev else None,
        details={"status": "submitted"},
    )
    db.commit()

    return {"status": "ok", "message": "Draft submitted to the reviewer queue.", "current_status": "submitted"}


@router.post("/{draft_id}/decide")
def review_decision(
    draft_id: str,
    req: DecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["reviewer", "admin"])),
):
    """Reviewers approve or reject submitted drafts. Self-approval is strictly forbidden."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    # ENFORCE RULE: Creator cannot approve their own draft
    if draft.creator_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized self-approval: Creators cannot approve or decide on their own drafts.",
        )

    if draft.current_status not in ["submitted", "in_review"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot decide on draft in '{draft.current_status}' state. Must be submitted or in_review.",
        )

    latest_rev = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id)
        .order_by(DraftRevision.revision_number.desc())
        .first()
    )
    if not latest_rev:
        raise HTTPException(status_code=404, detail="No revision found for draft.")

    decision_obj = ReviewerDecision(
        draft_id=draft.id,
        revision_id=latest_rev.id,
        reviewer_id=current_user.id,
        decision=req.decision,
        comment=req.comment.strip() if req.comment else None,
    )
    db.add(decision_obj)

    draft.current_status = req.decision
    db.commit()

    record_audit_event(
        db,
        action_type=f"draft_{req.decision}",
        actor_id=current_user.id,
        draft_id=draft.id,
        revision_id=latest_rev.id,
        details={"decision": req.decision, "comment": req.comment},
    )
    db.commit()

    return {
        "status": "ok",
        "decision": req.decision,
        "current_status": draft.current_status,
        "comment": req.comment,
        "reviewer_email": current_user.email,
    }


@router.post("/{draft_id}/suggestions/{finding_id}")
def record_suggestion_decision(
    draft_id: str,
    finding_id: str,
    req: SuggestionActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Records an accept, dismiss, or override action on an advisory finding."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    latest_rev = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id)
        .order_by(DraftRevision.revision_number.desc())
        .first()
    )
    if not latest_rev:
        raise HTTPException(status_code=404, detail="No revision found.")

    finding = (
        db.query(DraftFinding)
        .filter(DraftFinding.revision_id == latest_rev.id, DraftFinding.id == finding_id)
        .first()
    )
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found on current revision.")

    new_status = "accepted" if req.action == "accept" else ("dismissed" if req.action == "dismiss" else "overridden")
    finding.status = new_status

    decision = SuggestionDecision(
        revision_id=latest_rev.id,
        finding_id=finding.id,
        rule_id=finding.rule_id,
        action=req.action,
        actor_id=current_user.id,
        previous_value=req.previous_value or finding.excerpt,
        new_value=req.new_value or finding.suggestion,
        comment=req.comment,
    )
    db.add(decision)

    record_audit_event(
        db,
        action_type=f"suggestion_{req.action}",
        actor_id=current_user.id,
        draft_id=draft.id,
        revision_id=latest_rev.id,
        details={
            "finding_id": finding.id,
            "rule_id": finding.rule_id,
            "category": finding.category,
            "action": req.action,
        },
    )
    db.commit()

    return {"status": "ok", "action": req.action, "finding_id": finding.id, "finding_status": finding.status}


@router.get("/{draft_id}/revisions", response_model=list[RevisionResponse])
def get_draft_revisions(
    draft_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns immutable revision history for the draft."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    if current_user.role == "creator" and draft.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    revs = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id)
        .order_by(DraftRevision.revision_number.asc())
        .all()
    )
    return [RevisionResponse.model_validate(r) for r in revs]


@router.post("/{draft_id}/restore/{revision_id}", response_model=DraftDetailResponse)
async def restore_revision(
    draft_id: str,
    revision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restores draft to a historical revision by creating a NEW revision with the historical text."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    if current_user.role == "creator" and draft.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    hist_rev = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id, DraftRevision.id == revision_id)
        .first()
    )
    if not hist_rev:
        raise HTTPException(status_code=404, detail="Historical revision not found.")

    latest_rev = (
        db.query(DraftRevision)
        .filter(DraftRevision.draft_id == draft_id)
        .order_by(DraftRevision.revision_number.desc())
        .first()
    )
    next_rev_num = (latest_rev.revision_number + 1) if latest_rev else 1

    # Run review for restored content
    settings = get_settings()
    review_res = await review_draft(ReviewRequest(draft_text=hist_rev.draft_text), settings, db=db)

    new_rev = DraftRevision(
        draft_id=draft.id,
        revision_number=next_rev_num,
        author_id=current_user.id,
        draft_text=hist_rev.draft_text,
        review_summary=review_res.review_summary,
        ai_status=review_res.ai_status,
        needs_human_review=review_res.needs_human_review,
    )
    db.add(new_rev)
    db.commit()
    db.refresh(new_rev)

    finding_objs = []
    for f in review_res.findings:
        rule_key = f.evidence_ids[0] if f.evidence_ids else (f.id or f.category)
        finding_unique_id = f"{new_rev.id}-{f.id or len(finding_objs)+1}"
        db_finding = DraftFinding(
            id=finding_unique_id,
            revision_id=new_rev.id,
            rule_id=rule_key,
            category=f.category,
            severity=f.severity,
            excerpt=f.excerpt,
            explanation=f.explanation,
            suggestion=f.suggestion,
            evidence_ids=f.evidence_ids,
            confidence=f.confidence,
            source=f.source,
            start=f.start,
            end=f.end,
            citations=[c.model_dump() for c in f.citations],
            status="open",
        )
        db.add(db_finding)
        finding_objs.append(db_finding)

    record_audit_event(
        db,
        action_type="revision_restored",
        actor_id=current_user.id,
        draft_id=draft.id,
        revision_id=new_rev.id,
        details={
            "restored_from_revision_id": hist_rev.id,
            "restored_revision_number": hist_rev.revision_number,
            "new_revision_number": next_rev_num,
        },
    )
    db.commit()

    return DraftDetailResponse(
        id=draft.id,
        title=draft.title,
        current_status=draft.current_status,
        creator_id=draft.creator_id,
        creator_name=draft.creator.full_name if draft.creator else "Unknown",
        creator_email=draft.creator.email if draft.creator else "unknown@brandpilot.ai",
        latest_revision=RevisionResponse.model_validate(new_rev),
        findings=[FindingResponse.model_validate(f) for f in finding_objs],
        decisions=[],
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.get("/{draft_id}/audit", response_model=list[AuditEventResponse])
def get_draft_audit_trail(
    draft_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns append-only audit trail for the draft."""
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    if current_user.role == "creator" and draft.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.draft_id == draft_id)
        .order_by(AuditEvent.created_at.asc())
        .all()
    )

    results = []
    for ev in events:
        actor = db.query(User).filter(User.id == ev.actor_id).first() if ev.actor_id else None
        results.append(AuditEventResponse(
            id=ev.id,
            draft_id=ev.draft_id,
            revision_id=ev.revision_id,
            actor_id=ev.actor_id,
            actor_email=actor.email if actor else None,
            action_type=ev.action_type,
            details=ev.details,
            created_at=ev.created_at,
        ))
    return results
