"""Crisis-support resources shown to the user.

IMPORTANT: These numbers must be re-verified before any real release.
You can override the list without changing code by setting the
CRISIS_RESOURCES_JSON environment variable.
"""
import json
import os

DEFAULT_RESOURCES: list[dict] = [
    {
        "id": "emergency-112",
        "name": "India emergency number",
        "number": "112",
        "description": "For immediate danger to life. Connects to police, ambulance and fire services.",
        "verified": False,
    },
    {
        "id": "tele-manas",
        "name": "Tele-MANAS",
        "number": "14416",
        "description": "Free mental-health support line run by the Government of India.",
        "verified": False,
    },
]


def get_resources() -> list[dict]:
    raw = os.getenv("CRISIS_RESOURCES_JSON", "").strip()
    if raw:
        try:
            data = json.loads(raw)
            if isinstance(data, list) and data:
                return data
        except json.JSONDecodeError:
            pass  # fall back to the safe defaults below
    return [dict(r) for r in DEFAULT_RESOURCES]
