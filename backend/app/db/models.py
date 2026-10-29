"""SQLAlchemy relational models for BrandPilot."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON, TypeDecorator
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.db.session import Base


def _gen_uuid() -> str:
    return str(uuid.uuid4())


class PortableJSON(TypeDecorator):
    """Uses JSONB on PostgreSQL and standard JSON on SQLite/others."""
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="creator")  # creator | reviewer | admin
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    documents = relationship("Document", back_populates="uploaded_by")
    drafts = relationship("Draft", back_populates="creator")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    uploaded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)  # stored file name on disk
    original_name = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="uploaded")  # uploaded | processing | indexed | error
    error_message = Column(Text, nullable=True)
    extracted_metadata = Column(PortableJSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    uploaded_by = relationship("User", back_populates="documents")
    passages = relationship("GuidelinePassage", back_populates="document", cascade="all, delete-orphan")


class GuidelinePassage(Base):
    __tablename__ = "guideline_passages"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    heading_path = Column(String(500), nullable=True)
    char_offset_start = Column(Integer, nullable=True)
    char_offset_end = Column(Integer, nullable=True)
    embedding = Column(Vector(1536), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="passages")


class Draft(Base):
    __tablename__ = "drafts"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    creator_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="Untitled Draft")
    current_status = Column(String(50), nullable=False, default="draft")  # draft | submitted | in_review | approved | rejected
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    creator = relationship("User", back_populates="drafts")
    revisions = relationship("DraftRevision", back_populates="draft", cascade="all, delete-orphan", order_by="DraftRevision.revision_number")
    decisions = relationship("ReviewerDecision", back_populates="draft", cascade="all, delete-orphan")


class DraftRevision(Base):
    __tablename__ = "draft_revisions"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    draft_id = Column(String(36), ForeignKey("drafts.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_number = Column(Integer, nullable=False)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    draft_text = Column(Text, nullable=False)
    review_summary = Column(Text, nullable=True)
    ai_status = Column(String(50), nullable=True)
    needs_human_review = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    draft = relationship("Draft", back_populates="revisions")
    author = relationship("User")
    findings = relationship("DraftFinding", back_populates="revision", cascade="all, delete-orphan")
    decisions = relationship("ReviewerDecision", back_populates="revision", cascade="all, delete-orphan")


class DraftFinding(Base):
    __tablename__ = "draft_findings"

    id = Column(String(50), primary_key=True, default=_gen_uuid)
    revision_id = Column(String(36), ForeignKey("draft_revisions.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(100), nullable=True, index=True)
    category = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=False, default="Medium")
    excerpt = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=False, default="")
    evidence_ids = Column(PortableJSON, nullable=False, default=list)
    confidence = Column(String(20), default="medium")
    source = Column(String(20), default="rule")  # rule | ai
    start = Column(Integer, nullable=True)
    end = Column(Integer, nullable=True)
    citations = Column(PortableJSON, nullable=False, default=list)
    status = Column(String(50), nullable=False, default="open")  # open | accepted | dismissed | overridden
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    revision = relationship("DraftRevision", back_populates="findings")


class ReviewerDecision(Base):
    __tablename__ = "reviewer_decisions"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    draft_id = Column(String(36), ForeignKey("drafts.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_id = Column(String(36), ForeignKey("draft_revisions.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision = Column(String(50), nullable=False)  # approved | rejected
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    draft = relationship("Draft", back_populates="decisions")
    revision = relationship("DraftRevision", back_populates="decisions")
    reviewer = relationship("User")


class SuggestionDecision(Base):
    __tablename__ = "suggestion_decisions"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    revision_id = Column(String(36), ForeignKey("draft_revisions.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id = Column(String(50), nullable=False, index=True)
    rule_id = Column(String(100), nullable=True, index=True)
    action = Column(String(50), nullable=False)  # accept | dismiss | override
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    draft_id = Column(String(36), ForeignKey("drafts.id", ondelete="SET NULL"), nullable=True, index=True)
    revision_id = Column(String(36), ForeignKey("draft_revisions.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False, index=True)
    details = Column(PortableJSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    dataset_version = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=False)
    matching_policy = Column(String(100), nullable=False, default="category_and_normalized_span")
    sample_count = Column(Integer, nullable=False)
    true_positives = Column(Integer, nullable=False)
    false_positives = Column(Integer, nullable=False)
    false_negatives = Column(Integer, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1 = Column(Float, nullable=False)
    metrics_by_category = Column(PortableJSON, nullable=False, default=dict)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
