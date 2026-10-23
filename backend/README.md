# BrandPilot AI — Backend

FastAPI service that reviews draft content against brand guidelines, approved terms and approved facts.
It combines **deterministic rule checks** (terminology, basic accessibility) with an **AI review** (tone/voice, claims/factual consistency).
Suggestions are advisory: `needs_human_review` is always `true` and nothing is auto-approved.

## Setup
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # edit values; never commit .env
uvicorn app.main:app --reload --port 8000
```
- Interactive docs: http://localhost:8000/docs
- Health: `GET /api/health`
- Tests: `pytest`

## Environment variables
See `.env.example`. Key ones: `CORS_ORIGINS`, `MAX_DRAFT_CHARS`, `AI_PROVIDER` (`mock` | `openai_compatible` | `off`),
`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_TIMEOUT_SECONDS`, `AI_REQUIRED`.
`AI_PROVIDER=mock` runs an offline heuristic reviewer, so the app works end to end with no API key.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/review` | Review a draft |
| GET | `/api/health` | Health check |
| GET | `/api/sample-data` | Sample guidelines / terms / facts for the UI |

### POST /api/review
```json
{
  "draft_text": "Our consumer app is the best, available in 12 regions.",
  "brand_guidelines": [{"id": "VOICE-01", "text": "Use clear, friendly language"}],
  "approved_terms": [{"id": "TERM01", "preferred": "customer", "avoid": ["consumer"]}],
  "approved_facts": [{"id": "FACT01", "text": "The service is available in 10 regions"}]
}
```
All three reference lists are optional. If none are sent, the bundled sample set is used (`reference_source: "sample"`).

Response:
```json
{
  "findings": [
    {"id": "F-001", "category": "Terminology", "severity": "Low", "excerpt": "consumer",
     "explanation": "The approved term list prefers “customer” instead of “consumer”.",
     "suggestion": "customer", "evidence_ids": ["TERM01"], "confidence": "high",
     "source": "rule", "start": 4, "end": 12}
  ],
  "review_summary": "Review completed: ...",
  "needs_human_review": true,
  "ai_status": "ok",
  "reference_source": "request",
  "warnings": []
}
```
Extra fields beyond the shared contract (`source`, `start`, `end`, `ai_status`, `reference_source`, `warnings`) are additive; the frontend may ignore them.
`start`/`end` are character offsets into `draft_text` for highlighting.

Categories: `Terminology`, `Tone`, `Claims`, `Accessibility`, `Other`. Severity: `Low|Medium|High`. Confidence: `low|medium|high`.

### Errors
| Status | `error` | When |
|---|---|---|
| 422 | `invalid_request` | empty/too-long draft, malformed JSON, wrong field types (`details` lists fields) |
| 502 | `ai_unavailable` | AI failed **and** `AI_REQUIRED=true` |
| 500 | `internal_error` | unexpected failure (generic message, no internals/draft text leaked) |

By default (`AI_REQUIRED=false`) an AI failure still returns **200** with rule-based findings, `ai_status: "unavailable"` and a `warnings` entry.

## Architecture
```
app/
  main.py                 app, CORS, error handlers
  config.py               env-based settings
  routes/                 health.py, review.py
  schemas/review.py       Pydantic request/response models (shared contract)
  rules/                  terminology.py (deterministic), accessibility.py (basic)
  services/
    review_service.py     runs rules + AI, merges, dedupes, assigns F-001… IDs
    ai_review.py          prompt, provider call, JSON parsing & grounding
    reference_data.py     loads data/sample_reference.json
  data/sample_reference.json
tests/                    pytest suite
```
Flow: validate → resolve reference data → terminology + accessibility rules → AI review → merge → response.

### AI grounding safeguards (`ai_review.py`)
- Prompt restricts the model to the supplied draft/guidelines/facts and requires JSON only.
- Findings whose `excerpt` is not found in the draft are dropped (anti-hallucination).
- `evidence_ids` not present in the supplied input are removed.
- A `Claims` finding with no supporting source is forced to `confidence: "low"` and marked "needs reviewer verification" rather than asserted false.
- Empty, malformed, timeout, rate-limit and provider errors become `AIServiceError` (retry per `AI_MAX_RETRIES`), never a crash.

## Known limitations
- Terminology matching is whole-word with simple plurals only (no stemming/inflections).
- The `mock` AI reviewer is a heuristic for demos/tests, not a language model; use `openai_compatible` for real tone/claim review.
- Reference data is request-supplied or a JSON seed file; there is no database or authentication.
- No rate limiting; add one at the hosting layer before public deployment.

## Libraries
FastAPI, Pydantic v2, Uvicorn, httpx, python-dotenv, pytest.
