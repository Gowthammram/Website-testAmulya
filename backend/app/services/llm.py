"""AI model access: Google Gemini, Groq, Anthropic, and an ensemble comparator.

The API keys stay here on the server, never in the browser.
When both Gemini and Groq are configured, both are queried concurrently,
scored according to supportive companion criteria (empathy, brevity,
grounding, and safety), and the best response is returned.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from typing import Protocol

from app.config import Settings

logger = logging.getLogger(__name__)


class LLMUnavailable(Exception):
    """Raised for ANY problem talking to the AI (network, key, timeout, empty reply)."""


class LLMClient(Protocol):
    def generate(self, system: str, messages: list[dict]) -> str: ...


class GeminiClient:
    def __init__(self, api_key: str, model: str = "gemini-3.5-flash-lite", timeout: float = 20.0):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.name = "gemini"

    def _query_model(self, model: str, system: str, messages: list[dict]) -> str:
        import httpx

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        contents = []
        for m in messages:
            role = "user" if m.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": str(m.get("content", ""))}]})

        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": 400,
                "temperature": 0.7,
            },
        }

        response = httpx.post(url, json=payload, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise LLMUnavailable(f"Gemini ({model}) returned no candidates")
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        if not text:
            raise LLMUnavailable(f"Gemini ({model}) empty reply")
        return text

    def generate(self, system: str, messages: list[dict]) -> str:
        candidate_models = [self.model]
        # Resilient fallbacks in case configured model hits 429 quota, 503 high demand, or timeouts
        for fallback in ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error = None
        for m in candidate_models:
            try:
                return self._query_model(m, system, messages)
            except Exception as exc:
                last_error = exc
                logger.warning(f"Gemini model {m} attempt failed: {exc}")
                continue

        raise LLMUnavailable(f"Gemini error: {last_error}") from last_error


class GroqClient:
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile", timeout: float = 20.0):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.url = "https://api.groq.com/openai/v1/chat/completions"
        self.name = "groq"

    def generate(self, system: str, messages: list[dict]) -> str:
        import httpx

        groq_messages = [{"role": "system", "content": system}]
        for m in messages:
            groq_messages.append({"role": m.get("role", "user"), "content": str(m.get("content", ""))})

        payload = {
            "model": self.model,
            "messages": groq_messages,
            "max_tokens": 400,
            "temperature": 0.7,
        }

        try:
            response = httpx.post(
                self.url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise LLMUnavailable("Groq returned no choices")
            text = choices[0].get("message", {}).get("content", "").strip()
        except Exception as exc:
            raise LLMUnavailable(f"Groq error: {type(exc).__name__}") from exc

        if not text:
            raise LLMUnavailable("Groq empty reply")
        return text


class AnthropicClient:
    def __init__(self, api_key: str, model: str, url: str, timeout: float):
        self.api_key, self.model, self.url, self.timeout = api_key, model, url, timeout
        self.name = "anthropic"

    def generate(self, system: str, messages: list[dict]) -> str:
        import httpx

        try:
            response = httpx.post(
                self.url,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 400,
                    "system": system,
                    "messages": messages,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            blocks = response.json().get("content", [])
            text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()
        except Exception as exc:
            raise LLMUnavailable(type(exc).__name__) from exc
        if not text:
            raise LLMUnavailable("empty reply")
        return text


def score_support_response(text: str) -> float:
    """Evaluate candidate response against Amulya companion principles:
    1. Warmth, active listening, and empathy
    2. Brevity (under 120 words; ideal 35-100 words)
    3. Grounding / manageable step
    4. Absence of toxic positivity or false promises
    """
    if not text or not text.strip():
        return 0.0

    words = text.split()
    count = len(words)
    score = 10.0

    # 1. Brevity: penalize overly verbose lectures (>130 words) or too-terse answers (<12 words)
    if count > 130:
        score -= min(6.0, (count - 130) * 0.1)
    elif count < 12:
        score -= 4.0
    elif 30 <= count <= 100:
        score += 2.0

    lower = text.lower()

    # 2. Empathy and compassionate presence (+)
    empathy_tokens = [
        "hear", "listening", "feel", "with you", "valid", "gently", "take your time",
        "breathe", "support", "heavy", "here for you", "matters", "pace", "safe", "space"
    ]
    found_empathy = sum(1 for t in empathy_tokens if t in lower)
    score += min(5.0, found_empathy * 0.8)

    # 3. Actionable / grounding suggestions (+)
    grounding_tokens = [
        "breath", "breathing", "ground", "water", "reach out", "trusted", "call", "step", "walk"
    ]
    if any(g in lower for g in grounding_tokens):
        score += 1.5

    # 4. Penalize false promises or dismissive language (-)
    toxic_tokens = [
        "everything will be fine", "everything will be okay", "dont worry", "don't worry",
        "cheer up", "it's not that bad", "its not that bad", "look on the bright side"
    ]
    for tt in toxic_tokens:
        if tt in lower:
            score -= 3.5

    return max(0.0, score)


class EnsembleComparatorClient:
    """Queries multiple configured AI providers (Gemini and Groq) simultaneously,
    scores their responses on supportive companion criteria, and returns the best response."""

    def __init__(self, clients: list):
        self.clients = clients
        self.last_used_provider: str = "ensemble"

    def generate(self, system: str, messages: list[dict]) -> str:
        if not self.clients:
            raise LLMUnavailable("No AI clients configured")

        if len(self.clients) == 1:
            client = self.clients[0]
            self.last_used_provider = getattr(client, "name", "ai")
            return client.generate(system, messages)

        # Query all configured clients concurrently
        results: list[dict] = []
        executor = ThreadPoolExecutor(max_workers=len(self.clients))
        try:
            future_to_client = {
                executor.submit(c.generate, system, messages): c
                for c in self.clients
            }
            for future in as_completed(future_to_client):
                client = future_to_client[future]
                cname = getattr(client, "name", "unknown")
                try:
                    text = future.result()
                    if text:
                        score = score_support_response(text)
                        results.append({
                            "provider": cname,
                            "text": text,
                            "score": score
                        })
                        # Fast-path: return immediately once an empathetic, solid answer arrives
                        if score >= 11.0:
                            break
                except Exception as exc:
                    logger.warning(f"Provider {cname} failed: {exc}")
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

        if not results:
            raise LLMUnavailable("All configured AI providers failed")

        # Pick candidate with highest empathy/support score
        results.sort(key=lambda r: r["score"], reverse=True)
        best = results[0]
        self.last_used_provider = best["provider"]
        return best["text"]


def build_llm_client(settings: Settings) -> LLMClient | None:
    """Builds Gemini, Groq, or ensemble comparator based on configured keys."""
    clients = []
    timeout = max(settings.llm_timeout_seconds, 15.0)

    # 1. Google Gemini
    if settings.gemini_api_key:
        clients.append(
            GeminiClient(settings.gemini_api_key, settings.gemini_model, timeout)
        )

    # 2. Groq
    if settings.groq_api_key:
        clients.append(
            GroqClient(settings.groq_api_key, settings.groq_model, timeout)
        )

    # 3. Anthropic Claude (if explicitly provided)
    if settings.llm_api_key:
        clients.append(
            AnthropicClient(settings.llm_api_key, settings.llm_model, settings.llm_api_url, timeout)
        )

    if not clients:
        return None

    return EnsembleComparatorClient(clients)


def prepare_messages(history: list[dict], message: str, max_turns: int = 10) -> list[dict]:
    """Make the conversation valid for the API: starts with 'user', roles alternate."""
    cleaned: list[dict] = []
    for item in [*history[-max_turns:], {"role": "user", "content": message}]:
        role = item["role"] if item["role"] in ("user", "assistant") else "user"
        content = str(item["content"])[:2000]
        if cleaned and cleaned[-1]["role"] == role:
            cleaned[-1]["content"] += "\n" + content
        else:
            cleaned.append({"role": role, "content": content})
    while cleaned and cleaned[0]["role"] != "user":
        cleaned.pop(0)
    return cleaned
