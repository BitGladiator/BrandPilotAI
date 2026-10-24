"""Orchestrates Groq AI review and fallback rules into one response."""
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


async def review_draft(req: ReviewRequest, settings: Settings) -> ReviewResponse:
    guidelines, terms, facts, ref_source = _resolve_reference(req)
    draft = req.draft_text

    ai_findings: list[Finding] = []
    ai_status = "skipped"
    warnings: list[str] = []

    if settings.ai_enabled:
        try:
            ai_findings = await run_ai_review(draft, guidelines, facts, terms, settings)
            ai_status = "ok"
        except AIServiceError as exc:
            if settings.ai_required:
                raise
            ai_status = "unavailable"
            warnings.append(f"AI review was unavailable ({exc})")

    # If AI produced findings, they are the primary output from the Groq model.
    # Rule findings act as safety net if AI was skipped or unavailable.
    rule_findings: list[Finding] = []
    if ai_status != "ok" or not ai_findings:
        rule_findings = check_terminology(draft, terms)
        if settings.enable_accessibility_checks:
            rule_findings += check_accessibility(draft)

    findings = _merge(rule_findings, ai_findings)

    ai_count = len([f for f in findings if f.source == "ai"])
    rule_count = len(findings) - ai_count

    if findings:
        summary = (f"Review completed: {len(findings)} possible issue(s) identified "
                   f"({ai_count} AI model analyzed, {rule_count} rule-verified). "
                   "Please review each advisory proposal before approving.")
    elif ai_status == "unavailable":
        summary = "No rule-based issues found, but AI review was unavailable. Human review is still required."
    else:
        summary = "No issues found against the supplied references. Human review is still required."

    return ReviewResponse(
        findings=findings, review_summary=summary, needs_human_review=True,
        ai_status=ai_status, reference_source=ref_source, warnings=warnings)
