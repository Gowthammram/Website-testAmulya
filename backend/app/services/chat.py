"""The chat workflow: safety check first, AI second, fallback always available."""
from dataclasses import dataclass
import logging

from app.safety.responses import (
    ELEVATED_ADDITION,
    SYSTEM_PROMPT,
    build_fallback_reply,
    build_urgent_reply,
)
from app.safety.risk import assess_message
from app.services.llm import LLMClient, LLMUnavailable, prepare_messages

logger = logging.getLogger(__name__)


@dataclass
class ChatResult:
    reply: str
    risk_level: str
    emergency_suggested: bool  # tells the UI to show help options (it never sends anything)
    ai_used: bool
    used_fallback: bool
    provider: str = "fallback"


def handle_chat(
    message: str, history: list[dict], llm: LLMClient | None, resources: list[dict]
) -> ChatResult:
    risk = assess_message(message)

    # Urgent: fixed reply. We do not wait for, or trust, the AI here.
    if risk.level == "urgent":
        return ChatResult(build_urgent_reply(resources), "urgent", True, False, False, "safety_rules")

    suggested = risk.level == "elevated"
    if llm is None:
        return ChatResult(
            build_fallback_reply(risk.level, resources, message),
            risk.level,
            suggested,
            False,
            True,
            "fallback",
        )

    system = SYSTEM_PROMPT + (ELEVATED_ADDITION if suggested else "")
    try:
        reply = llm.generate(system, prepare_messages(history, message))
        provider = getattr(llm, "last_used_provider", "ai")
        return ChatResult(reply, risk.level, suggested, True, False, provider)
    except LLMUnavailable as exc:
        logger.warning(f"AI generation failed ({exc}). Falling back to canned response.")
        return ChatResult(
            build_fallback_reply(risk.level, resources, message),
            risk.level,
            suggested,
            False,
            True,
            "fallback",
        )
