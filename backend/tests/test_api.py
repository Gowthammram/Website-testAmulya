"""API-level tests (need FastAPI + httpx installed; run with `pytest`).

The AI is forced to be unavailable and DEMO_MODE is on, so these tests can
never call a real AI service or contact a real person.
"""
import pytest

fastapi_testclient = pytest.importorskip("fastapi.testclient")


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("AMULYA_DB_PATH", str(tmp_path / "api.db"))
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("LLM_API_KEY", "")  # no AI -> fallback replies
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GROQ_API_KEY", "")
    from app.main import app

    with fastapi_testclient.TestClient(app) as c:
        yield c


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and body["demo_mode"] is True


def test_chat_fallback_when_ai_unavailable(client):
    body = client.post("/api/chat", json={"message": "I feel anxious"}).json()
    assert body["used_fallback"] is True and body["ai_used"] is False


def test_chat_urgent_message_suggests_emergency(client):
    body = client.post("/api/chat", json={"message": "I want to kill myself"}).json()
    assert body["risk_level"] == "urgent" and body["emergency_suggested"] is True


def test_chat_rejects_empty_message(client):
    assert client.post("/api/chat", json={"message": "   "}).status_code == 422


def test_contact_requires_consent_then_saves_and_deletes(client):
    bad = client.put("/api/contact", json={"name": "Asha", "phone": "+919876543210", "consent": False})
    assert bad.status_code == 422
    ok = client.put("/api/contact", json={"name": "Asha", "phone": "+919876543210", "consent": True})
    assert ok.json()["contact"]["name"] == "Asha"
    client.delete("/api/contact")
    assert client.get("/api/contact").json()["contact"] is None


def test_alert_needs_contact_and_confirmation_and_is_simulated(client):
    assert client.post("/api/emergency/alert-preview", json={}).status_code == 404
    client.put("/api/contact", json={"name": "Asha", "phone": "+919876543210", "consent": True})
    preview = client.post("/api/emergency/alert-preview", json={}).json()
    assert preview["demo_mode"] is True
    assert client.post("/api/emergency/alert-send", json={"confirm": False}).status_code == 400
    sent = client.post("/api/emergency/alert-send", json={"confirm": True}).json()
    assert sent["status"] == "simulated" and sent["delivered"] is False


def test_real_sending_unavailable_when_demo_mode_off(client, monkeypatch):
    client.put("/api/contact", json={"name": "Asha", "phone": "+919876543210", "consent": True})
    monkeypatch.setenv("DEMO_MODE", "false")
    assert client.post("/api/emergency/alert-send", json={"confirm": True}).status_code == 503


def test_location_validation_and_demo_update(client):
    assert client.post("/api/location/preview", json={"latitude": 999, "longitude": 0}).status_code == 422
    ok = client.post("/api/location/demo-update", json={"latitude": 12.9, "longitude": 77.5, "sequence": 1})
    assert ok.json()["status"] == "simulated"


def test_resources_include_112_and_tele_manas(client):
    numbers = [r["number"] for r in client.get("/api/emergency/resources").json()["resources"]]
    assert "112" in numbers and "14416" in numbers
