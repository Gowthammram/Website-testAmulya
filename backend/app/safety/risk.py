"""Rule-based message safety check.

HOW IT WORKS (simple English):
We look for phrases in the user's message and give one of three levels:
  - "none"     : nothing worrying found
  - "elevated" : signs of distress or hopelessness
  - "urgent"   : possible intent, plan or means to end one's life

LIMITATIONS (please read):
  * This is a keyword list. It WILL miss indirect or unusual wording,
    other languages and sarcasm, and it WILL sometimes flag harmless text.
  * It cannot predict or prevent suicide. It only decides how loudly the app
    offers real-world help.
  * Because of this, emergency help is ALWAYS visible in the UI, and nothing
    is ever sent to anyone automatically because of a level.
  * Real use needs review by qualified mental-health professionals.
"""
import re
from dataclasses import dataclass, field

MAX_CHARS = 2000

# Patterns run on text that is lowercased with apostrophes removed
# ("I'm" becomes "im", "can't" becomes "cant").
URGENT_PATTERNS: dict[str, list[str]] = {
    "intent_to_die": [
        r"\b(kill|end)\s+(myself|my\s+own\s+life|my\s+life)\b",
        r"\bi\s+(want|wanna|need)\s+to\s+die\b",
        r"\b(commit|committing)\s+suicide\b",
        r"\bim\s+(feeling\s+)?suicidal\b",
        r"\bgoing\s+to\s+(hurt|harm)\s+myself\b",
        r"\bdecided\s+to\s+(die|end\s+it)\b",
        r"\bdont\s+want\s+to\s+live\b",
        r"\bnot\s+want\s+to\s+be\s+alive\b",
    ],
    "plan_or_means": [
        r"\b(hang|shoot|drown|poison)\s+myself\b",
        r"\bjump\s+(off|from)\b",
        r"\boverdose\b",
        r"\b(slit|cut)\s+my\s+(wrists?|throat)\b",
        r"\b(pills|rope|gun|knife)\b.*\b(end\s+it|die|kill\s+myself)\b",
    ],
    "timeframe": [
        r"\b(tonight|today|right\s+now|soon)\b.*\b(die|end\s+it|kill\s+myself|end\s+my\s+life)\b",
        r"\bthis\s+is\s+goodbye\b",
        r"\bwrote\s+(a\s+)?(suicide\s+)?note\b",
    ],
    # A few common romanised Hindi phrases (not a complete list).
    "hindi_romanised": [
        r"\bmar\s*jaana\s+chah",
        r"\bmarna\s+chah",
        r"\bjeena\s+nahi\s+chah",
        r"\bkhudkushi\b",
        r"\bapni\s+jaan\s+de\b",
        r"\bsuicide\s+karna\b",
    ],
}

ELEVATED_PATTERNS: dict[str, list[str]] = {
    "hopelessness": [
        r"\bno\s+reason\s+to\s+live\b",
        r"\bcant\s+go\s+on\b",
        r"\bcant\s+take\s+it\s+anymore\b",
        r"\bno\s+way\s+out\b",
        r"\bgive\s+up\s+on\s+(life|everything)\b",
        r"\bhopeless\b",
        r"\bnothing\s+matters\b",
    ],
    "burden_or_worthless": [
        r"\b(burden|worthless)\b",
        r"\bbetter\s+off\s+without\s+me\b",
        r"\beveryone\s+would\s+be\s+better\b",
    ],
    "passive_death_wish": [
        r"\bwish\s+i\s+(was|were)\s+dead\b",
        r"\bwish\s+i\s+(would\s?nt|wouldnt)\s+wake\s+up\b",
        r"\bdont\s+want\s+to\s+be\s+here\b",
        r"\bsuicide\b",
    ],
    "self_harm": [
        r"\b(hurt|harm|cut)\s+myself\b",
        r"\bself\s*harm\b",
    ],
}


@dataclass
class RiskAssessment:
    level: str  # "none" | "elevated" | "urgent"
    categories: list[str] = field(default_factory=list)


def normalise(text: str) -> str:
    """Lowercase, drop apostrophes, collapse spaces, cap the length."""
    text = text[:MAX_CHARS].lower()
    for apostrophe in ("'", "’", "‘", "`"):
        text = text.replace(apostrophe, "")
    return re.sub(r"\s+", " ", text).strip()


def _matches(text: str, groups: dict[str, list[str]]) -> list[str]:
    found = []
    for category, patterns in groups.items():
        if any(re.search(p, text) for p in patterns):
            found.append(category)
    return found


def assess_message(message: str) -> RiskAssessment:
    text = normalise(message or "")
    urgent = _matches(text, URGENT_PATTERNS)
    if urgent:
        return RiskAssessment("urgent", urgent)
    elevated = _matches(text, ELEVATED_PATTERNS)
    if elevated:
        return RiskAssessment("elevated", elevated)
    return RiskAssessment("none", [])
