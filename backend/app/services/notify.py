"""Emergency messaging to the trusted contact.

SAFETY RULES BUILT IN:
  * Nothing is sent unless `confirm=True` (the user pressed a confirm button).
  * In DEMO_MODE the DemoProvider only records a test event. Nothing is sent
    and the result says "simulated", never "sent".
  * No real provider exists yet. To add one later (an SMS service), write a
    class with `send(to_phone, message)` that raises NotificationError on failure.
"""
from dataclasses import dataclass
from typing import Protocol

from app.config import Settings
from app.models import db


class NotificationError(Exception):
    """A provider could not deliver the message."""


class ConfirmationRequired(Exception):
    """The user has not confirmed sending."""


class NotificationUnavailable(Exception):
    """No safe provider is configured."""


class NotificationProvider(Protocol):
    name: str

    def send(self, to_phone: str, message: str) -> None: ...


class DemoProvider:
    """Pretends to send. Delivers nothing."""

    name = "demo"

    def send(self, to_phone: str, message: str) -> None:
        return None


def get_provider(settings: Settings) -> NotificationProvider:
    if settings.demo_mode:
        return DemoProvider()
    raise NotificationUnavailable(
        "No real notification provider is configured. Keep DEMO_MODE=true for the prototype."
    )


def mask_phone(phone: str) -> str:
    return "*" * max(len(phone) - 4, 0) + phone[-4:]


def build_alert_message(contact_name: str, sender_name: str | None, maps_link: str | None) -> str:
    who = sender_name.strip() if sender_name and sender_name.strip() else "someone who listed you as a trusted contact"
    text = (
        f"Hi {contact_name}, this is an automated message from the Amulya app. "
        f"{who} may be going through a very hard time and would value hearing from you. "
        "Please call or check in with them as soon as you can."
    )
    if maps_link:
        text += f" Their approximate location, shared with their consent: {maps_link}"
    return text


def build_alert_preview(
    contact: dict, sender_name: str | None, maps_link: str | None, demo_mode: bool
) -> dict:
    shared = ["Your message text shown below", "Your trusted contact's name (the contact already knows it)"]
    if sender_name and sender_name.strip():
        shared.append("The display name you entered")
    if maps_link:
        shared.append("Your approximate location at this moment")
    return {
        "recipient_name": contact["name"],
        "recipient_phone_masked": mask_phone(contact["phone"]),
        "message": build_alert_message(contact["name"], sender_name, maps_link),
        "shared_items": shared,
        "not_shared": ["Your personal video", "Your chat messages", "Your safety plan"],
        "demo_mode": demo_mode,
        "note": (
            "DEMO MODE: nothing will be sent. A test event is recorded on this computer only."
            if demo_mode
            else "This would send a real message."
        ),
    }


@dataclass
class DispatchResult:
    status: str  # "simulated" | "sent" | "failed"
    delivered: bool
    detail: str


def dispatch_alert(
    provider: NotificationProvider, db_path: str, contact: dict, message: str,
    includes_location: bool, confirm: bool,
) -> DispatchResult:
    if not confirm:
        raise ConfirmationRequired("Explicit confirmation is required before sending.")

    log = {"recipient": mask_phone(contact["phone"]), "provider": provider.name,
           "includes_location": includes_location}
    try:
        provider.send(contact["phone"], message)
    except NotificationError as exc:
        db.add_event(db_path, "alert", "failed", {**log, "error": str(exc)[:200]})
        return DispatchResult("failed", False, "The message could not be sent. Please call your contact directly.")

    if provider.name == "demo":
        db.add_event(db_path, "alert", "simulated", log)
        return DispatchResult("simulated", False, "Demo mode: no message was sent. A test event was recorded.")
    db.add_event(db_path, "alert", "sent", log)
    return DispatchResult("sent", True, "The message was handed to the provider.")
