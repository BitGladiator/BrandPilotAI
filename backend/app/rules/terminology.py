"""Deterministic terminology check against the approved-term list."""
import re

from app.schemas.review import ApprovedTerm, Finding


def _match_case(original: str, replacement: str) -> str:
    if original.isupper() and len(original) > 1:
        return replacement.upper()
    if original[:1].isupper():
        return replacement[:1].upper() + replacement[1:]
    return replacement


def check_terminology(draft: str, terms: list[ApprovedTerm]) -> list[Finding]:
    findings: list[Finding] = []
    for idx, term in enumerate(terms, start=1):
        evidence_id = term.id or f"TERM{idx:02d}"
        for avoided in term.avoid:
            avoided = avoided.strip()
            if not avoided:
                continue
            # whole-word match, allow simple plural ("consumer" -> "consumers")
            pattern = re.compile(rf"(?<!\w){re.escape(avoided)}(s)?(?!\w)", re.IGNORECASE)
            for m in pattern.finditer(draft):
                plural = bool(m.group(1))
                suggestion = _match_case(m.group(0), term.preferred + ("s" if plural else ""))
                findings.append(
                    Finding(
                        category="Terminology",
                        severity="Low",
                        excerpt=m.group(0),
                        explanation=(
                            f"The approved term list prefers \u201c{term.preferred}\u201d "
                            f"instead of \u201c{avoided}\u201d."
                        ),
                        suggestion=suggestion,
                        evidence_ids=[evidence_id],
                        confidence="high",
                        source="rule",
                        start=m.start(),
                        end=m.end(),
                    )
                )
    return findings
