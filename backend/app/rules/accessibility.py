"""Basic rule-based accessibility / readability checks (optional extension)."""
import re

from app.schemas.review import Finding

_VAGUE_LINKS = re.compile(r"\b(click here|read more|learn more|here)\b", re.IGNORECASE)
_ALL_CAPS_RUN = re.compile(r"\b(?:[A-Z]{3,}\s+){1,}[A-Z]{3,}\b")
_MULTI_PUNCT = re.compile(r"[!?]{2,}")
_SENTENCE = re.compile(r"[^.!?\n]+[.!?]?")
LONG_SENTENCE_WORDS = 35


def check_accessibility(draft: str) -> list[Finding]:
    out: list[Finding] = []

    for m in re.finditer(r"\b(click here|read more)\b", draft, re.IGNORECASE):
        out.append(Finding(
            category="Accessibility", severity="Medium", excerpt=m.group(0),
            explanation="Vague link text is hard for screen-reader users, who often navigate by a list of links.",
            suggestion="Use descriptive link text that says where the link goes (e.g. \u201cView pricing plans\u201d).",
            confidence="medium", source="rule", start=m.start(), end=m.end()))

    for m in _ALL_CAPS_RUN.finditer(draft):
        out.append(Finding(
            category="Accessibility", severity="Low", excerpt=m.group(0),
            explanation="Long runs of ALL CAPS are harder to read and may be read letter-by-letter by assistive tools.",
            suggestion=m.group(0).capitalize(), confidence="medium", source="rule",
            start=m.start(), end=m.end()))

    for m in _MULTI_PUNCT.finditer(draft):
        out.append(Finding(
            category="Accessibility", severity="Low", excerpt=m.group(0),
            explanation="Repeated punctuation can be distracting and is announced awkwardly by screen readers.",
            suggestion=m.group(0)[0], confidence="medium", source="rule",
            start=m.start(), end=m.end()))

    for m in _SENTENCE.finditer(draft):
        sentence = m.group(0).strip()
        if len(sentence.split()) > LONG_SENTENCE_WORDS:
            out.append(Finding(
                category="Accessibility", severity="Low", excerpt=sentence,
                explanation=f"This sentence has more than {LONG_SENTENCE_WORDS} words, which can be hard to read.",
                suggestion="Split it into two or more shorter sentences.",
                confidence="medium", source="rule",
                start=draft.find(sentence), end=draft.find(sentence) + len(sentence)))
    return out
