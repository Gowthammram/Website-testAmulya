"""Tests for the rule-based safety check and the chat workflow.
No network and no real AI calls: a fake AI object is used instead."""
import unittest

from app.safety.resources import get_resources
from app.safety.risk import assess_message
from app.services.chat import handle_chat
from app.services.llm import LLMUnavailable, prepare_messages


class FakeLLM:
    def __init__(self):
        self.calls = 0

    def generate(self, system, messages):
        self.calls += 1
        return "I hear you. That sounds really hard."


class BrokenLLM:
    def generate(self, system, messages):
        raise LLMUnavailable("simulated outage")


class RiskTests(unittest.TestCase):
    def test_urgent_phrases(self):
        for text in [
            "I want to kill myself",
            "I'm going to end my life tonight",
            "i dont want to live anymore",
            "I want to die",
            "I'm suicidal",
            "mujhe marna chahta hu",
            "I wrote a note",
            "thinking about taking an overdose",
        ]:
            with self.subTest(text=text):
                self.assertEqual(assess_message(text).level, "urgent")

    def test_elevated_phrases(self):
        for text in [
            "I feel completely hopeless",
            "everyone would be better off without me",
            "I can’t go on like this",
            "I wish I was dead",
            "what is suicide awareness month?",
        ]:
            with self.subTest(text=text):
                self.assertEqual(assess_message(text).level, "elevated")

    def test_harmless_text_is_none(self):
        for text in ["I had a rough day at work", "This exam is killing me", "", "hello"]:
            with self.subTest(text=text):
                self.assertEqual(assess_message(text).level, "none")

    def test_curly_apostrophes_and_case(self):
        self.assertEqual(assess_message("I’M SUICIDAL").level, "urgent")

    def test_very_long_input_does_not_crash(self):
        self.assertEqual(assess_message("a " * 50000).level, "none")


class ChatTests(unittest.TestCase):
    def setUp(self):
        self.resources = get_resources()

    def test_urgent_never_calls_ai_and_suggests_emergency(self):
        llm = FakeLLM()
        result = handle_chat("I want to kill myself", [], llm, self.resources)
        self.assertEqual(llm.calls, 0)
        self.assertEqual(result.risk_level, "urgent")
        self.assertTrue(result.emergency_suggested)
        self.assertIn("112", result.reply)
        self.assertIn("14416", result.reply)

    def test_normal_message_uses_ai(self):
        result = handle_chat("I feel a bit anxious", [], FakeLLM(), self.resources)
        self.assertTrue(result.ai_used)
        self.assertFalse(result.used_fallback)
        self.assertFalse(result.emergency_suggested)

    def test_ai_failure_uses_fallback(self):
        result = handle_chat("I feel a bit anxious", [], BrokenLLM(), self.resources)
        self.assertTrue(result.used_fallback)
        self.assertFalse(result.ai_used)
        self.assertIn("breathe", result.reply)

    def test_no_api_key_uses_fallback(self):
        result = handle_chat("hello", [], None, self.resources)
        self.assertTrue(result.used_fallback)

    def test_elevated_with_ai_failure_still_offers_help(self):
        result = handle_chat("I feel hopeless", [], BrokenLLM(), self.resources)
        self.assertTrue(result.emergency_suggested)
        self.assertIn("14416", result.reply)

    def test_prepare_messages_alternates_and_starts_with_user(self):
        history = [
            {"role": "assistant", "content": "Hi"},
            {"role": "user", "content": "a"},
            {"role": "user", "content": "b"},
            {"role": "assistant", "content": "c"},
        ]
        msgs = prepare_messages(history, "d")
        self.assertEqual(msgs[0]["role"], "user")
        roles = [m["role"] for m in msgs]
        self.assertTrue(all(roles[i] != roles[i + 1] for i in range(len(roles) - 1)))
        self.assertEqual(msgs[-1]["role"], "user")


if __name__ == "__main__":
    unittest.main()
