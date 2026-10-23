from app.services import ai_review
from app.services.ai_review import AIServiceError

TERMS = [{"id": "TERM01", "preferred": "customer", "avoid": ["consumer"]}]
FACTS = [{"id": "FACT01", "text": "The service is available in 10 regions"}]
GUIDE = [{"id": "VOICE-01", "text": "Use clear, friendly language"}]


def post(client, **body):
    return client.post("/api/review", json=body)


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_sample_data(client):
    r = client.get("/api/sample-data")
    assert r.status_code == 200 and r.json()["approved_terms"]


def test_valid_input_returns_contract_fields(client):
    r = post(client, draft_text="Our consumer app is great.", approved_terms=TERMS)
    assert r.status_code == 200
    body = r.json()
    assert body["needs_human_review"] is True
    f = next(x for x in body["findings"] if x["category"] == "Terminology")
    assert f["excerpt"] == "consumer" and f["suggestion"] == "customer"
    assert f["evidence_ids"] == ["TERM01"] and f["id"].startswith("F-")


def test_empty_input_rejected(client):
    r = post(client, draft_text="")
    assert r.status_code == 422 and r.json()["error"] == "invalid_request"


def test_whitespace_input_rejected(client):
    assert post(client, draft_text="   \n ").status_code == 422


def test_too_long_rejected(client):
    assert post(client, draft_text="a" * 2001).status_code == 422


def test_malformed_request(client):
    assert client.post("/api/review", content="not json",
                       headers={"Content-Type": "application/json"}).status_code == 422
    assert client.post("/api/review", json={"wrong": "field"}).status_code == 422
    assert post(client, draft_text="hi", approved_terms="oops").status_code == 422


def test_plural_and_case_matching(client):
    r = post(client, draft_text="Consumers love it. Each consumer wins.", approved_terms=TERMS)
    sug = [f["suggestion"] for f in r.json()["findings"] if f["category"] == "Terminology"]
    assert sug == ["Customers", "customer"]


def test_no_findings_returns_empty_array(client):
    r = post(client, draft_text="Our customers sign in daily.", approved_terms=TERMS,
             brand_guidelines=GUIDE, approved_facts=FACTS)
    body = r.json()
    assert body["findings"] == [] and body["needs_human_review"] is True


def test_fact_conflict_detected(client):
    r = post(client, draft_text="We are available in 12 regions.", approved_facts=FACTS)
    f = r.json()["findings"][0]
    assert f["category"] == "Claims" and f["evidence_ids"] == ["FACT01"] and f["severity"] == "High"


def test_unsupported_claim_flagged_for_verification(client):
    r = post(client, draft_text="We serve 5000 customers.", approved_facts=FACTS)
    f = r.json()["findings"][0]
    assert f["confidence"] == "low" and f["evidence_ids"] == []


def test_tone_hype_flagged(client):
    r = post(client, draft_text="The best product ever.", brand_guidelines=GUIDE)
    assert any(f["category"] == "Tone" for f in r.json()["findings"])


def test_sample_fallback_when_no_reference(client):
    r = post(client, draft_text="Our consumer portal.")
    assert r.json()["reference_source"] == "sample"
    assert any(f["category"] == "Terminology" for f in r.json()["findings"])


def test_accessibility_click_here(client):
    r = post(client, draft_text="To learn pricing, click here.", approved_terms=TERMS)
    assert any(f["category"] == "Accessibility" for f in r.json()["findings"])


def test_ai_error_degrades_gracefully(client, monkeypatch):
    async def boom(*a, **k):
        raise AIServiceError("the AI provider timed out.")
    monkeypatch.setattr("app.services.review_service.run_ai_review", boom)
    r = post(client, draft_text="Our consumer app.", approved_terms=TERMS)
    body = r.json()
    assert r.status_code == 200 and body["ai_status"] == "unavailable"
    assert body["warnings"] and body["findings"]  # rule findings still returned


def test_ai_required_returns_502(client, monkeypatch):
    async def boom(*a, **k):
        raise AIServiceError("down")
    monkeypatch.setattr("app.services.review_service.run_ai_review", boom)
    monkeypatch.setenv("AI_REQUIRED", "true")
    r = post(client, draft_text="hello world", approved_terms=TERMS)
    assert r.status_code == 502 and r.json()["error"] == "ai_unavailable"


def test_cors_header(client):
    r = client.options("/api/review", headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


# ---- AI output parsing (malformed / hallucinated output) ----
DRAFT = "We are the best. Available in 12 regions."


def parse(raw):
    from app.schemas.review import ApprovedFact, Guideline
    return ai_review.parse_model_output(
        raw, DRAFT, [Guideline(**GUIDE[0])], [ApprovedFact(**FACTS[0])])


def test_parse_handles_code_fences():
    raw = '```json\n{"findings":[{"category":"Tone","excerpt":"the best","explanation":"hype","evidence_ids":["VOICE-01"]}]}\n```'
    assert parse(raw)[0].excerpt == "the best"


def test_parse_rejects_garbage_and_empty():
    for bad in ["", "   ", "sorry, I can't", "[1,2"]:
        try:
            parse(bad)
            assert False, "should raise"
        except AIServiceError:
            pass


def test_parse_drops_hallucinated_excerpt_and_unknown_evidence():
    raw = ('{"findings":[{"category":"Tone","excerpt":"not in draft","explanation":"x"},'
           '{"category":"Claims","excerpt":"12 regions","explanation":"conflict","evidence_ids":["FAKE-9"]}]}')
    out = parse(raw)
    assert len(out) == 1 and out[0].evidence_ids == [] and out[0].confidence == "low"
    assert "verif" in out[0].explanation.lower()
