"""Orchestrates deterministic rules + AI review into one response."""
from app.config import Settings
from app.rules.accessibility import check_accessibility
from app.rules.terminology import check_terminology
from app.schemas.review import (ApprovedFact, ApprovedTerm, Finding, Guideline,
                                ReviewRequest, ReviewResponse)
from app.services.ai_review import AIServiceError, run_ai_review
from app.services.reference_data import get_sample_reference


def _resolve_reference(req: ReviewRequest):
    """Use request data if any was supplied, otherwise fall back to the sample set."""
    if req.brand_guidelines or req.approved_terms or req.approved_facts:
        return req.brand_guidelines, req.approved_terms, req.approved_facts, "request"
    sample = get_sample_reference()
    return (
        [Guideline(**g) for g in sample["brand_guidelines"]],
        [ApprovedTerm(**t) for t in sample["approved_terms"]],
        [ApprovedFact(**f) for f in sample["approved_facts"]],
        "sample",
    )


def _merge(rule_findings: list[Finding], ai_findings: list[Finding]) -> list[Finding]:
    """Combine, drop AI duplicates of rule findings, order by position, assign IDs."""
    seen = {(f.excerpt.lower(), f.category) for f in rule_findings}
    combined = list(rule_findings)
    for f in ai_findings:
        if (f.excerpt.lower(), f.category) in seen:
            continue
        seen.add((f.excerpt.lower(), f.category))
        combined.append(f)
    combined.sort(key=lambda f: (f.start if f.start is not None else 10**9))
    for i, f in enumerate(combined, start=1):
        f.id = f"F-{i:03d}"
    return combined


async def review_draft(req: ReviewRequest, settings: Settings) -> ReviewResponse:
    guidelines, terms, facts, ref_source = _resolve_reference(req)
    draft = req.draft_text

    rule_findings = check_terminology(draft, terms)
    if settings.enable_accessibility_checks:
        rule_findings += check_accessibility(draft)

    ai_findings: list[Finding] = []
    ai_status = "skipped"
    warnings: list[str] = []
    if settings.ai_enabled:
        try:
            ai_findings = await run_ai_review(draft, guidelines, facts, settings)
            ai_status = "ok"
        except AIServiceError as exc:
            if settings.ai_required:
                raise
            ai_status = "unavailable"
            warnings.append(f"AI review was unavailable ({exc}) Showing rule-based results only.")

    findings = _merge(rule_findings, ai_findings)

    if findings:
        summary = (f"Review completed: {len(findings)} possible issue(s) found "
                   f"({len(rule_findings)} rule-based, {len(findings) - len(rule_findings)} AI-assisted). "
                   "Please review each suggestion before approving.")
    elif ai_status == "unavailable":
        summary = "No rule-based issues found, but AI review was unavailable. Human review is still required."
    else:
        summary = "No issues found against the supplied references. Human review is still required."

    return ReviewResponse(
        findings=findings, review_summary=summary, needs_human_review=True,
        ai_status=ai_status, reference_source=ref_source, warnings=warnings)
