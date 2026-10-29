"""Pydantic request/response models = the shared JSON contract."""
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.config import get_settings

Category = Literal["Terminology", "Tone", "Claims", "Accessibility", "Other"]
Severity = Literal["Low", "Medium", "High"]
Confidence = Literal["low", "medium", "high"]


class Guideline(BaseModel):
    id: str = Field(min_length=1, max_length=50)
    text: str = Field(min_length=1, max_length=2000)


class ApprovedTerm(BaseModel):
    id: Optional[str] = Field(default=None, max_length=50)
    preferred: str = Field(min_length=1, max_length=200)
    avoid: list[str] = Field(default_factory=list)


class ApprovedFact(BaseModel):
    id: str = Field(min_length=1, max_length=50)
    text: str = Field(min_length=1, max_length=2000)


class Citation(BaseModel):
    document_id: str
    document_name: str
    passage_id: str
    heading_path: Optional[str] = None
    page_number: Optional[int] = None
    excerpt: str
    source_type: Literal["brand_guideline", "policy", "approved_term", "approved_fact"] = "brand_guideline"
    relevance_score: Optional[float] = None


class ReviewRequest(BaseModel):
    draft_text: str
    brand_guidelines: list[Guideline] = Field(default_factory=list)
    approved_terms: list[ApprovedTerm] = Field(default_factory=list)
    approved_facts: list[ApprovedFact] = Field(default_factory=list)
    # Optional toggle to retrieve passages from indexed database guidelines
    use_indexed_guidelines: bool = True

    @field_validator("draft_text")
    @classmethod
    def validate_draft(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("draft_text must not be empty")
        limit = get_settings().max_draft_chars
        if len(v) > limit:
            raise ValueError(f"draft_text is too long (max {limit} characters)")
        return v

    @model_validator(mode="after")
    def validate_reference_size(self):
        limit = get_settings().max_reference_items
        total = len(self.brand_guidelines) + len(self.approved_terms) + len(self.approved_facts)
        if total > limit:
            raise ValueError(f"too many reference items (max {limit})")
        return self


class Finding(BaseModel):
    id: str = ""
    category: Category
    severity: Severity = "Medium"
    excerpt: str
    explanation: str
    suggestion: str = ""
    evidence_ids: list[str] = Field(default_factory=list)
    confidence: Confidence = "medium"
    source: Literal["rule", "ai"] = "rule"
    start: Optional[int] = None
    end: Optional[int] = None
    citations: list[Citation] = Field(default_factory=list)


class ReviewResponse(BaseModel):
    findings: list[Finding]
    review_summary: str
    needs_human_review: bool = True  # always true: AI never auto-approves
    ai_status: Literal["ok", "skipped", "unavailable"] = "skipped"
    reference_source: Literal["request", "sample", "indexed_database"] = "request"
    warnings: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[list[dict]] = None
