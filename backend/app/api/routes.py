"""All HTTP endpoints. They stay thin: real logic lives in app/services and app/safety,
so a Flutter app (or tests) can reuse the same endpoints."""
from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.models import db
from app.models.schemas import (
    AlertRequest,
    AlertSendRequest,
    ChatRequest,
    ContactIn,
    DemoLocationUpdate,
    LocationPreviewRequest,
    SafetyPlanIn,
)
from app.safety.resources import get_resources
from app.services import location, notify
from app.services.chat import handle_chat
from app.services.llm import build_llm_client

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    s = get_settings()
    has_ai = bool(s.gemini_api_key or s.groq_api_key or s.llm_api_key)
    return {
        "status": "ok",
        "demo_mode": s.demo_mode,
        "ai_configured": has_ai,
        "providers": {
            "gemini": bool(s.gemini_api_key),
            "groq": bool(s.groq_api_key),
            "anthropic": bool(s.llm_api_key),
        },
    }


# ---- chat --------------------------------------------------------------------
@router.post("/chat")
def chat(body: ChatRequest):
    result = handle_chat(
        body.message,
        [h.model_dump() for h in body.history],
        build_llm_client(get_settings()),
        get_resources(),
    )
    return {
        "reply": result.reply,
        "risk_level": result.risk_level,
        "emergency_suggested": result.emergency_suggested,
        "ai_used": result.ai_used,
        "used_fallback": result.used_fallback,
        "provider": result.provider,
        "disclaimer": "Amulya is not a replacement for professional care.",
    }


# ---- trusted contact -----------------------------------------------------------
def _public_contact(row: dict | None) -> dict | None:
    if row is None:
        return None
    return {k: row[k] for k in ("name", "phone", "relationship", "consented_at")}


@router.get("/contact")
def read_contact():
    return {"contact": _public_contact(db.get_contact(get_settings().db_path))}


@router.put("/contact")
def write_contact(body: ContactIn):
    row = db.save_contact(get_settings().db_path, body.name, body.phone, body.relationship)
    return {"contact": _public_contact(row)}


@router.delete("/contact")
def remove_contact():
    db.delete_contact(get_settings().db_path)
    return {"contact": None}


# ---- safety plan ---------------------------------------------------------------
@router.get("/safety-plan")
def read_plan():
    return db.get_plan(get_settings().db_path)


@router.put("/safety-plan")
def write_plan(body: SafetyPlanIn):
    return db.save_plan(get_settings().db_path, body.model_dump())


# ---- emergency -------------------------------------------------------------------
@router.get("/emergency/resources")
def resources():
    return {"resources": get_resources(), "verify_before_release": True}


def _maps_link_for(body: AlertRequest) -> str | None:
    if body.share_location and body.latitude is not None and body.longitude is not None:
        return location.maps_link(body.latitude, body.longitude)
    return None


def _require_contact() -> dict:
    contact = db.get_contact(get_settings().db_path)
    if contact is None:
        raise HTTPException(status_code=404, detail="Add a trusted contact first.")
    return contact


@router.post("/emergency/alert-preview")
def alert_preview(body: AlertRequest):
    contact = _require_contact()
    return notify.build_alert_preview(
        contact, body.sender_name, _maps_link_for(body), get_settings().demo_mode
    )


@router.post("/emergency/alert-send")
def alert_send(body: AlertSendRequest):
    settings = get_settings()
    contact = _require_contact()
    try:
        provider = notify.get_provider(settings)
    except notify.NotificationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    link = _maps_link_for(body)
    message = notify.build_alert_message(contact["name"], body.sender_name, link)
    try:
        result = notify.dispatch_alert(
            provider, settings.db_path, contact, message, link is not None, body.confirm
        )
    except notify.ConfirmationRequired as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": result.status, "delivered": result.delivered, "detail": result.detail}


# ---- location (preview and demo only) ----------------------------------------------
@router.post("/location/preview")
def location_preview(body: LocationPreviewRequest):
    return location.build_location_preview(body.latitude, body.longitude, body.accuracy_m)


@router.post("/location/demo-update")
def location_demo_update(body: DemoLocationUpdate):
    if not get_settings().demo_mode:
        raise HTTPException(status_code=503, detail="Real location sharing is not available in the web prototype.")
    event = location.record_demo_update(get_settings().db_path, body.latitude, body.longitude, body.sequence)
    return {"status": "simulated", "delivered": False, "event": event}


@router.get("/location/config")
def location_config():
    return {"interval_seconds": get_settings().location_interval_seconds}


# ---- test events and data deletion -----------------------------------------------------
@router.get("/events")
def events():
    return {"events": db.list_events(get_settings().db_path)}


@router.delete("/data")
def delete_everything():
    db.delete_all_data(get_settings().db_path)
    return {"deleted": True}
