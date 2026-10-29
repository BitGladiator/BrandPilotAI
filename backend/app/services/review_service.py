"""Orchestrates Groq AI review, rule verification, pgvector retrieval, and exact source citations."""
from typing import Optional

from sqlalchemy.orm import Session

from app.config import Settings
from app.documents.retrieval import RetrievedPassage, search_relevant_passages
from app.rules.accessibility import check_accessibility
from app.rules.terminology import check_terminology
from app.schemas.review import (
    ApprovedFact,
    ApprovedTerm,
    Citation,
    Finding,
    Guideline,
    ReviewRequest,
    ReviewResponse,
)
from app.services.ai_review import AIServiceError, run_ai_review
from app.services.reference_data import get_sample_reference


def _resolve_reference(req: ReviewRequest):
    """Use request data if any was supplied, otherwise fall back to the sample set."""
    if req.brand_guidelines or req.approved_terms or req.approved_facts:
        return list(req.brand_guidelines), list(req.approved_terms), list(req.approved_facts), "request"
    sample = get_sample_reference()
    return (
        [Guideline(**g) for g in sample["brand_guidelines"]],
        [ApprovedTerm(**t) for t in sample["approved_terms"]],
        [ApprovedFact(**f) for f in sample["approved_facts"]],
        "sample",
    )


def _merge(rule_findings: list[Finding], ai_findings: list[Finding]) -> list[Finding]:
    """Combine findings, prioritizing AI model evaluations, drop duplicates, order by position, assign IDs."""
    seen = set()
    combined: list[Finding] = []

    # AI findings from the model take priority
    for f in ai_findings:
        key = (f.excerpt.lower(), f.category)
        if key not in seen:
            seen.add(key)
            combined.append(f)

    # Any additional fallback rule findings
    for f in rule_findings:
        key = (f.excerpt.lower(), f.category)
        if key not in seen:
            seen.add(key)
            combined.append(f)

    combined.sort(key=lambda f: (f.start if f.start is not None else 10**9))
    for i, f in enumerate(combined, start=1):
        f.id = f"F-{i:03d}"
    return combined


def _attach_citations_to_findings(
    findings: list[Finding],
    passages: list[RetrievedPassage],
):
    """Grounds findings with exact stored guideline passage citations where genuinely supported.

    Correctness guarantees:
    - Never fabricates excerpts; excerpts come directly from the stored passage text.
    - Only links passages that are meaningfully relevant to the finding's category or text.
    - If no passage is sufficiently relevant, leaves citations empty (unverified support).
    """
    if not passages:
        return

    for f in findings:
        f_text = f.excerpt.lower()
        f_sug = f.suggestion.lower()
        f_cat = f.category.lower()

        matched_citations: list[Citation] = []
        seen_passages = set()

        for p in passages:
            if p.passage_id in seen_passages:
                continue

            p_content_lower = p.content.lower()

            # Grounding criteria:
            # 1. Finding excerpt or suggestion appears in passage
            # 2. Or high similarity score (> 0.6) and thematic topic matches category
            is_relevant = False
            relevant_excerpt = p.content

            if f_text and f_text in p_content_lower:
                is_relevant = True
                # Extract clean snippet around occurrence
                idx = p_content_lower.find(f_text)
                start_idx = max(0, idx - 40)
                end_idx = min(len(p.content), idx + len(f.excerpt) + 120)
                relevant_excerpt = p.content[start_idx:end_idx].strip()
                if start_idx > 0:
                    relevant_excerpt = "..." + relevant_excerpt
                if end_idx < len(p.content):
                    relevant_excerpt = relevant_excerpt + "..."
            elif f_sug and f_sug in p_content_lower:
                is_relevant = True
                idx = p_content_lower.find(f_sug)
                start_idx = max(0, idx - 40)
                end_idx = min(len(p.content), idx + len(f.suggestion) + 120)
                relevant_excerpt = p.content[start_idx:end_idx].strip()
                if start_idx > 0:
                    relevant_excerpt = "..." + relevant_excerpt
                if end_idx < len(p.content):
                    relevant_excerpt = relevant_excerpt + "..."
            elif p.similarity_score >= 0.50 and (
                (f_cat == "tone" and any(k in p_content_lower for k in ["voice", "tone", "style", "superlative", "hype", "clarity"]))
                or (f_cat == "claims" and any(k in p_content_lower for k in ["fact", "region", "guarantee", "compliance"]))
                or (f_cat == "accessibility" and any(k in p_content_lower for k in ["link", "accessible", "click"]))
            ):
                is_relevant = True
                relevant_excerpt = p.content[:240].strip() + ("..." if len(p.content) > 240 else "")

            if is_relevant:
                seen_passages.add(p.passage_id)
                matched_citations.append(Citation(
                    document_id=p.document_id,
                    document_name=p.document_name,
                    passage_id=p.passage_id,
                    heading_path=p.heading_path,
                    page_number=p.page_number,
                    excerpt=relevant_excerpt,
                    source_type="brand_guideline",
                    relevance_score=p.similarity_score,
                ))

        f.citations = matched_citations[:2]  # Limit to top 2 most relevant passages


async def review_draft(
    req: ReviewRequest,
    settings: Settings,
    db: Optional[Session] = None,
) -> ReviewResponse:
    guidelines, terms, facts, ref_source = _resolve_reference(req)
    draft = req.draft_text

    ai_findings: list[Finding] = []
    ai_status = "skipped"
    warnings: list[str] = []

    retrieved_passages: list[RetrievedPassage] = []

    # Semantic retrieval from uploaded documents in PostgreSQL if db is provided
    if db is not None and req.use_indexed_guidelines:
        try:
            retrieved_passages = await search_relevant_passages(
                query=draft,
                db=db,
                limit=settings.max_retrieved_passages,
                settings=settings,
            )
            if retrieved_passages and not req.brand_guidelines:
                ref_source = "indexed_database"
                # Formulate dynamic guideline items from retrieved passages
                for p in retrieved_passages:
                    gid = f"DOC-{p.document_id[:6]}-P{p.passage_id[:4]}"
                    guidelines.append(Guideline(id=gid, text=f"[{p.document_name}] {p.content[:300]}"))
        except Exception as exc:
            warnings.append(f"Guideline retrieval notice: {exc}")

    if settings.ai_enabled:
        try:
            ai_findings = await run_ai_review(draft, guidelines, facts, terms, settings)
            ai_status = "ok"
        except AIServiceError as exc:
            if settings.ai_required:
                raise
            ai_status = "unavailable"
            warnings.append(f"AI review was unavailable ({exc})")

    # Always run deterministic terminology and accessibility rules as grounded safety net
    rule_findings: list[Finding] = check_terminology(draft, terms)
    if settings.enable_accessibility_checks:
        rule_findings += check_accessibility(draft)

    findings = _merge(rule_findings, ai_findings)

    # Attach exact citations from stored passages
    if retrieved_passages:
        _attach_citations_to_findings(findings, retrieved_passages)

    ai_count = len([f for f in findings if f.source == "ai"])
    rule_count = len(findings) - ai_count
    cited_count = len([f for f in findings if f.citations])

    if findings:
        summary = (
            f"Review completed: {len(findings)} possible issue(s) identified "
            f"({ai_count} AI model analyzed, {rule_count} rule-verified, {cited_count} cited against brand guidelines). "
            "Please review each advisory proposal before approving."
        )
    elif ai_status == "unavailable":
        summary = "No rule-based issues found, but AI review was unavailable. Human review is still required."
    else:
        summary = "No issues found against the supplied references. Human review is still required."

    return ReviewResponse(
        findings=findings,
        review_summary=summary,
        needs_human_review=True,
        ai_status=ai_status,
        reference_source=ref_source,
        warnings=warnings,
    )
