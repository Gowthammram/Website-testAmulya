"""Location sharing helpers (preview + demo recording only).

The web prototype NEVER sends real location data to anyone.
Real periodic sharing belongs in the Flutter app, after safety and legal review.
"""
from app.models import db


def maps_link(latitude: float, longitude: float) -> str:
    return f"https://www.google.com/maps?q={latitude:.5f},{longitude:.5f}"


def build_location_preview(latitude: float, longitude: float, accuracy_m: float | None) -> dict:
    accuracy_text = f"about {round(accuracy_m)} metres" if accuracy_m is not None else "unknown accuracy"
    return {
        "maps_link": maps_link(latitude, longitude),
        "shared_items": [
            f"Latitude and longitude ({accuracy_text})",
            "The time of each update",
        ],
        "not_shared": ["Your name (unless you entered one)", "Your video", "Your chat messages"],
    }


def record_demo_update(db_path: str, latitude: float, longitude: float, sequence: int) -> dict:
    """Store a TEST event. Coordinates are rounded to ~1 km so the log holds little precision."""
    return db.add_event(
        db_path, "location_update", "simulated",
        {"sequence": sequence, "approx_lat": round(latitude, 2), "approx_lng": round(longitude, 2)},
    )
