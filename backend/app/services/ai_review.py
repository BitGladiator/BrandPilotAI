"""AI review module (Groq Cloud / OpenAI-compatible brand governance reviewer).

Supports:
  - "groq" / "openai_compatible": calls Groq Cloud or OpenAI endpoint
  - "mock": offline heuristic reviewer for automated tests without API keys
"""
import json
import re
from typing import Any, Optional

import httpx

from app.config import Settings, get_settings
from app.schemas.review import ApprovedFact, ApprovedTerm, Finding, Guideline


class AIServiceError(Exception):
    """Safe, human-readable error raised by the AI layer."""


SYSTEM_PROMPT = """You are BrandPilot's AI brand-governance reviewer. You review the provided DRAFT against the supplied GUIDELINES, APPROVED TERMS, and APPROVED FACTS.

Categories to inspect:
1. "Terminology": Check if the draft uses words in the "Avoid" list of APPROVED TERMS. Recommend the preferred term and cite the term ID in evidence_ids.
2. "Claims": Check if statements in the draft contradict any APPROVED FACTS (severity "High", cite the fact ID). If a factual claim has no supporting approved fact, flag it with confidence "low" and evidence_ids [].
3. "Tone": Check if the draft conflicts with voice/tone GUIDELINES (e.g. superlatives, hype, clarity, tone). Cite the guideline ID.
4. "Accessibility": Check for vague link copy (e.g. "click here").

Rules:
- Do not invent brand rules. Only cite IDs that appear in the input.
- "excerpt" MUST be copied verbatim from the draft.
- Suggestions are actionable proposals; a human makes the final decision.
- If there are no issues, return {"findings": []}.

Respond with ONLY valid JSON, no markdown, in this shape:
{"findings":[{"category":"Terminology|Tone|Claims|Accessibility|Other","severity":"Low|Medium|High","excerpt":"verbatim text from draft","explanation":"why it conflicts","suggestion":"proposed rewrite","evidence_ids":["ID"],"confidence":"low|medium|high"}]}"""


def build_user_prompt(
    draft: str,
    guidelines: list[Guideline],
    facts: list[ApprovedFact],
    terms: Optional[list[ApprovedTerm]] = None,
) -> str:
    g = "\n".join(f"[{x.id}] {x.text}" for x in guidelines) or "(none supplied)"
    f = "\n".join(f"[{x.id}] {x.text}" for x in facts) or "(none supplied)"
    t = "\n".join(f"[{x.id or 'TERM'}] Preferred: \"{x.preferred}\", Avoid: {', '.join(x.avoid)}" for x in (terms or [])) or "(none supplied)"
    return f"GUIDELINES:\n{g}\n\nAPPROVED TERMS:\n{t}\n\nAPPROVED FACTS:\n{f}\n\nDRAFT:\n\"\"\"\n{draft}\n\"\"\""


# ---------- output parsing / grounding ----------

def _extract_json(raw: str) -> Any:
    if not raw or not raw.strip():
        raise AIServiceError("The AI service returned an empty response.")
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
    raise AIServiceError("The AI service returned output that could not be parsed.")


def parse_model_output(
    raw: str,
    draft: str,
    guidelines: list[Guideline],
    facts: list[ApprovedFact],
    terms: Optional[list[ApprovedTerm]] = None,
) -> list[Finding]:
    data = _extract_json(raw)
    items = data.get("findings") if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise AIServiceError("The AI service returned an unexpected response format.")

    known_ids = {g.id for g in guidelines} | {f.id for f in facts} | {t.id for t in (terms or []) if t.id}
    draft_lower = draft.lower()
    findings: list[Finding] = []

    for item in items:
        if not isinstance(item, dict):
            continue
        excerpt = str(item.get("excerpt", "")).strip()
        explanation = str(item.get("explanation", "")).strip()
        if not excerpt or not explanation:
            continue
        pos = draft_lower.find(excerpt.lower())
        if pos == -1:  # excerpt not in draft -> drop (anti-hallucination)
            continue
        excerpt = draft[pos : pos + len(excerpt)]

        category = str(item.get("category", "")).strip().title()
        if category.startswith("Term"):
            category = "Terminology"
        elif category.startswith("Claim") or category.startswith("Fact"):
            category = "Claims"
        elif category.startswith("Access"):
            category = "Accessibility"
        elif category not in {"Tone", "Claims", "Terminology", "Accessibility"}:
            category = "Tone" if category in {"Voice", "Style"} else "Other"

        severity = str(item.get("severity", "Medium")).strip().title()
        if severity not in {"Low", "Medium", "High"}:
            severity = "Medium"
        confidence = str(item.get("confidence", "medium")).strip().lower()
        if confidence not in {"low", "medium", "high"}:
            confidence = "medium"

        ev = item.get("evidence_ids") or []
        evidence = [e for e in (ev if isinstance(ev, list) else [ev]) if e in known_ids]

        if category == "Claims" and not evidence:
            confidence = "low"
            if "verif" not in explanation.lower():
                explanation += " No approved source was found, so this needs reviewer verification."

        findings.append(Finding(
            category=category, severity=severity, excerpt=excerpt, explanation=explanation,
            suggestion=str(item.get("suggestion", "")).strip(), evidence_ids=evidence,
            confidence=confidence, source="ai", start=pos, end=pos + len(excerpt)))
    return findings


# ---------- Groq / OpenAI provider ----------

async def _call_openai_compatible(messages: list[dict], s: Settings) -> str:
    if not s.ai_api_key:
        raise AIServiceError("Groq API key is not configured. Please add GROQ_API_KEY in backend/.env.")
    payload = {
        "model": s.ai_model,
        "messages": messages,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {s.ai_api_key}",
        "Content-Type": "application/json",
    }
    last_err = "unknown error"
    for _ in range(s.ai_max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=s.ai_timeout_seconds) as client:
                r = await client.post(f"{s.ai_base_url}/chat/completions", json=payload, headers=headers)
            if r.status_code == 429:
                last_err = "the AI provider rate limit was reached"
                continue
            if r.status_code >= 500:
                last_err = f"the AI provider had an internal error ({r.status_code})"
                continue
            if r.status_code in (401, 403):
                raise AIServiceError("The Groq/AI provider rejected the credentials. Please verify your GROQ_API_KEY.")
            if r.status_code >= 400:
                err_msg = ""
                try:
                    err_json = r.json()
                    err_msg = err_json.get("error", {}).get("message", "")
                except Exception:
                    pass
                raise AIServiceError(f"The AI provider rejected the request ({r.status_code}): {err_msg or r.text[:150]}.")
            return r.json()["choices"][0]["message"]["content"]
        except httpx.TimeoutException:
            last_err = "the AI provider timed out"
        except httpx.HTTPError as exc:
            last_err = f"could not reach {s.ai_base_url}: {str(exc)}"
        except (KeyError, IndexError, ValueError):
            raise AIServiceError("The AI provider returned an unexpected response.")
    raise AIServiceError(f"AI review failed: {last_err}.")


# ---------- offline mock reviewer for testing without keys ----------

_HYPE = re.compile(
    r"\b(best|revolutionary|world-class|best-in-class|unbeatable|game-changing|"
    r"guaranteed?|#1|number one|cutting-edge|perfect|flawless|amazing)\b", re.IGNORECASE)
_ABSOLUTE = re.compile(r"\b(100%|always|never|every single|zero risk|risk-free)\b", re.IGNORECASE)
_NUM_UNIT = re.compile(r"(\d[\d,]*)\s+([A-Za-z]+)")


def _mock_review(draft: str, guidelines: list[Guideline], facts: list[ApprovedFact]) -> str:
    out: list[dict] = []
    hype_ref = next((g.id for g in guidelines if "hype" in g.text.lower() or "superlative" in g.text.lower()),
                    guidelines[0].id if guidelines else None)

    if guidelines:
        for m in _HYPE.finditer(draft):
            out.append({"category": "Tone", "severity": "Medium", "excerpt": m.group(0),
                        "explanation": "Promotional or superlative wording may conflict with the supplied voice guidelines.",
                        "suggestion": "Use specific, factual wording instead.",
                        "evidence_ids": [hype_ref] if hype_ref else [], "confidence": "medium"})

    for sent in re.split(r"(?<=[.!?])\s+", draft):
        sent = sent.strip()
        if not sent:
            continue
        handled = False
        for num, unit in _NUM_UNIT.findall(sent):
            for fact in facts:
                for fnum, funit in _NUM_UNIT.findall(fact.text):
                    if funit.lower() == unit.lower():
                        handled = True
                        if fnum.replace(",", "") != num.replace(",", ""):
                            out.append({"category": "Claims", "severity": "High", "excerpt": sent,
                                        "explanation": f"The draft says {num} {unit}, but the approved fact says {fnum} {funit}.",
                                        "suggestion": f"Use the approved figure: {fnum} {funit}.",
                                        "evidence_ids": [fact.id], "confidence": "medium"})
        if not handled and (_NUM_UNIT.search(sent) or _ABSOLUTE.search(sent)):
            out.append({"category": "Claims", "severity": "Medium", "excerpt": sent,
                        "explanation": "This claim is not supported by any supplied approved fact; a reviewer should verify it.",
                        "suggestion": "Confirm the claim with a source or soften the wording.",
                        "evidence_ids": [], "confidence": "low"})
    return json.dumps({"findings": out})


# ---------- public entry point ----------

async def run_ai_review(
    draft: str,
    guidelines: list[Guideline],
    facts: list[ApprovedFact],
    *args,
    **kwargs,
) -> list[Finding]:
    # Handle variable arguments seamlessly: (draft, guidelines, facts, terms, settings) or (draft, guidelines, facts, settings)
    terms: list[ApprovedTerm] = []
    settings: Optional[Settings] = None

    for arg in args:
        if isinstance(arg, Settings):
            settings = arg
        elif isinstance(arg, list):
            terms = arg

    if settings is None:
        settings = kwargs.get("settings") or get_settings()
    if not terms and "terms" in kwargs:
        terms = kwargs["terms"]

    provider = settings.ai_provider
    if provider == "mock":
        raw = _mock_review(draft, guidelines, facts)
    elif provider in {"openai_compatible", "groq"}:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(draft, guidelines, facts, terms)},
        ]
        raw = await _call_openai_compatible(messages, settings)
    else:
        raise AIServiceError(f"Unknown AI_PROVIDER '{provider}'.")
    return parse_model_output(raw, draft, guidelines, facts, terms)
