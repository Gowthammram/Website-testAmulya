"""Fixed (non-AI) wording and the instructions we give the AI model.

For urgent messages we do NOT depend on the AI service at all. A fixed,
carefully written reply is always available, even if the internet is down.
"""

SYSTEM_PROMPT = """You are Amulya, a supportive emotional-care companion. You are not a therapist or doctor.
Rules:
- Listen first. Reflect the person's feelings in warm, plain, short sentences.
- Never judge, blame, shame, threaten, or guilt the person.
- Never promise outcomes ("everything will be fine") or claim you can keep them safe.
- Offer at most one or two small, manageable steps (for example slow breathing,
  naming 5 things they can see, drinking water, or contacting a trusted person).
- Gently encourage reaching out to a trusted person or a professional support line.
- Do not give medical, medication or method information.
- If the person may be in danger, tell them to contact emergency services (112 in India)
  or Tele-MANAS (14416) and to be with another person.
- Reply in the same language the person uses. Keep replies under 120 words."""

ELEVATED_ADDITION = (
    "\nThe person's message shows signs of serious distress. Acknowledge their pain, "
    "ask gently whether they are safe right now, and mention that human support is available."
)


def _numbers(resources: list[dict]) -> str:
    return " or ".join(f"{r['name']} ({r['number']})" for r in resources)


def build_urgent_reply(resources: list[dict]) -> str:
    return (
        "I'm really glad you told me. What you're feeling matters, and you deserve support "
        "from a real person right now. If you might act on these thoughts, please contact "
        f"{_numbers(resources)}, or go to someone near you. If you can, move away from "
        "anything you could use to hurt yourself and stay with another person. "
        "I can't contact anyone for you on my own, but the help options below are one tap "
        "away, and I'm here to keep talking."
    )


def build_fallback_reply(level: str, resources: list[dict], message: str = "") -> str:
    msg = message.strip().lower()

    if any(w in msg for w in ["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "greetings"]):
        base = (
            "Hello! I'm Amulya, your supportive companion. I'm here to listen, offer a calming space, "
            "and help you find human support whenever you need it. How are you feeling today?"
        )
    elif any(w in msg for w in ["who are you", "what are you", "your name", "what can you do"]):
        base = (
            "I am Amulya, an AI-assisted emotional-support companion. You can chat about what's on your mind, "
            "practice grounding exercises, review your safety plan, or record a personal reminder video. "
            "How can I support you right now?"
        )
    elif any(w in msg for w in ["how are you", "how are you doing", "how do you do", "how's it going"]):
        base = (
            "Thank you for asking! I'm here and ready to listen. Whatever is on your mind today, whether big "
            "or small, I'm here for you. How has your day been going?"
        )
    elif any(w in msg for w in ["thank", "thanks", "feeling better", "good now", "much better", "doing well", "i am fine", "i'm fine"]):
        base = (
            "I'm really glad to hear that. Taking a moment to check in with yourself is always a positive step. "
            "Remember that I'm here whenever you need a listening ear or a quiet space to reflect."
        )
    elif any(w in msg for w in ["stress", "stressed", "overwhelm", "pressure", "work", "exam", "school", "tired", "exhausted", "burnout"]):
        base = (
            "It sounds like there's a lot on your plate right now, and carrying all of that can be deeply exhausting. "
            "Remember it's okay to slow down and give yourself permission to rest. "
            "Would you like to talk more about what's feeling heavy, or take a quick breathing pause together?"
        )
    elif any(w in msg for w in ["anxious", "anxiety", "panic", "scared", "fear", "afraid", "worry", "worried", "nervous"]):
        base = (
            "I hear you, and it's completely okay that you're feeling anxious. When feelings get overwhelming, "
            "our bodies feel it too. Let's take a slow breath together: breathe in gently for 4 counts, "
            "hold for 4, and breathe out for 6. Focus on the ground beneath your feet. I'm right here with you."
        )
    elif any(w in msg for w in ["sad", "crying", "cry", "depressed", "depression", "unhappy", "hurts", "hurting", "pain", "down", "heartbroken"]):
        base = (
            "I'm so sorry things are feeling painful right now. Your feelings are real and valid, and it's okay "
            "to feel down. You don't have to carry this all alone. Is there someone in your life you feel "
            "comfortable opening up to today?"
        )
    elif any(w in msg for w in ["lonely", "alone", "nobody", "no one", "isolated", "left out"]):
        base = (
            "Feeling lonely can be really heavy and draining. Even when it feels like no one understands, "
            "please remember that your life matters, and you are not alone right now. I'm here to listen. "
            "What is feeling most difficult right now?"
        )
    elif any(w in msg for w in ["ground", "grounding", "breathe", "breathing", "exercise", "calm down", "relax"]):
        base = (
            "Let's do a 5-4-3-2-1 grounding exercise. Look around your space right now and name: "
            "5 things you can see, 4 things you can touch, 3 sounds you can hear, 2 things you can smell, "
            "and take 1 slow, deep breath. Take all the time you need."
        )
    else:
        base = (
            "I hear you, and I appreciate you sharing that with me. I'm here with you. "
            "Try this: breathe in slowly for 4 counts, hold for 4, and breathe out for 6. "
            "Repeat a few times. What would feel most supportive for you right now?"
        )

    if level == "elevated":
        base += f" If things feel too heavy, you can also contact {_numbers(resources)}."
    return base

