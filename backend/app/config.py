"""All settings are read from environment variables in ONE place.

Why: secrets (like AI API keys) must never be written in code or sent to
the browser. They live in a `.env` file on your laptop, which Git ignores.
"""
import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

# python-dotenv reads backend/.env if the package is installed.
try:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env", override=True)
except ImportError:  # the app still works with real environment variables
    pass


@dataclass(frozen=True)
class Settings:
    llm_api_key: str
    llm_model: str
    llm_api_url: str
    llm_timeout_seconds: float
    demo_mode: bool
    db_path: str
    allowed_origins: list[str]
    location_interval_seconds: int
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"


def _as_bool(value: str, default: bool) -> bool:
    if value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_settings() -> Settings:
    """Read settings fresh each call, so tests can change them safely."""
    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    llm_key = os.getenv("LLM_API_KEY", "").strip()

    # Automatically identify if Gemini key was put in LLM_API_KEY
    if not gemini_key and (llm_key.startswith("AIzaSy") or llm_key.startswith("AQ.")):
        gemini_key = llm_key

    # Ignore template placeholders
    placeholders = {"put-your-key-here", "put-your-gemini-key-here", "put-your-groq-key-here"}
    if gemini_key in placeholders:
        gemini_key = ""
    if groq_key in placeholders:
        groq_key = ""
    if llm_key in placeholders:
        llm_key = ""

    return Settings(
        llm_api_key=llm_key,
        llm_model=os.getenv("LLM_MODEL", "claude-sonnet-5-5"),
        llm_api_url=os.getenv("LLM_API_URL", "https://api.anthropic.com/v1/messages"),
        llm_timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "20")),
        # DEMO_MODE=true means NO real SMS/notification can ever be sent.
        demo_mode=_as_bool(os.getenv("DEMO_MODE", ""), default=True),
        db_path=os.getenv("AMULYA_DB_PATH", str(BACKEND_DIR / "amulya.db")),
        allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
        # Real emergencies: 5-6 minutes. Kept configurable for demos.
        location_interval_seconds=int(os.getenv("LOCATION_INTERVAL_SECONDS", "300")),
        gemini_api_key=gemini_key,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        groq_api_key=groq_key,
        groq_model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
    )
