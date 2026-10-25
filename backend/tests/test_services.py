"""Tests for the database, trusted contact validation, notifications and location.
Uses a temporary database. NOTHING real is ever sent."""
import os
import tempfile
import unittest

from pydantic import ValidationError

from app.config import get_settings
from app.models import db
from app.models.schemas import AlertRequest, ChatRequest, ContactIn, SafetyPlanIn
from app.services import location, notify


class TempDbCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "test.db")
        db.init_db(self.path)

    def tearDown(self):
        self.tmp.cleanup()


class ContactTests(TempDbCase):
    def test_save_edit_delete_contact(self):
        self.assertIsNone(db.get_contact(self.path))
        db.save_contact(self.path, "Asha", "+919876543210", "Sister")
        self.assertEqual(db.get_contact(self.path)["name"], "Asha")
        db.save_contact(self.path, "Asha K", "+919876543210", None)
        self.assertEqual(db.get_contact(self.path)["name"], "Asha K")
        db.delete_contact(self.path)
        self.assertIsNone(db.get_contact(self.path))

    def test_validation_cleans_phone_and_requires_consent(self):
        c = ContactIn(name=" Asha ", phone="+91 98765-43210", relationship=" ", consent=True)
        self.assertEqual(c.phone, "+919876543210")
        self.assertEqual(c.name, "Asha")
        self.assertIsNone(c.relationship)
        with self.assertRaises(ValidationError):
            ContactIn(name="Asha", phone="+919876543210", consent=False)
        with self.assertRaises(ValidationError):
            ContactIn(name="Asha", phone="12ab", consent=True)
        with self.assertRaises(ValidationError):
            ContactIn(name="   ", phone="+919876543210", consent=True)

    def test_other_validation(self):
        with self.assertRaises(ValidationError):
            ChatRequest(message="   ")
        with self.assertRaises(ValidationError):
            ChatRequest(message="x" * 2001)
        with self.assertRaises(ValidationError):
            AlertRequest(latitude=123.0, longitude=10.0)
        plan = SafetyPlanIn(activities=[" walk ", ""], people=[], professional_steps=[])
        self.assertEqual(plan.activities, ["walk"])
        with self.assertRaises(ValidationError):
            SafetyPlanIn(activities=["x" * 201])


class PlanTests(TempDbCase):
    def test_plan_round_trip(self):
        self.assertEqual(db.get_plan(self.path)["activities"], [])
        db.save_plan(self.path, {"activities": ["walk"], "people": ["Asha"], "professional_steps": ["call 14416"]})
        self.assertEqual(db.get_plan(self.path)["people"], ["Asha"])


class NotifyTests(TempDbCase):
    contact = {"name": "Asha", "phone": "+919876543210"}

    def test_demo_send_is_simulated_never_delivered(self):
        result = notify.dispatch_alert(notify.DemoProvider(), self.path, self.contact, "msg", False, True)
        self.assertEqual(result.status, "simulated")
        self.assertFalse(result.delivered)
        events = db.list_events(self.path)
        self.assertEqual(events[0]["status"], "simulated")
        self.assertNotIn("+919876543210", str(events))  # phone number is masked in the log

    def test_requires_confirmation(self):
        with self.assertRaises(notify.ConfirmationRequired):
            notify.dispatch_alert(notify.DemoProvider(), self.path, self.contact, "msg", False, False)
        self.assertEqual(db.list_events(self.path), [])

    def test_provider_failure_is_reported_honestly(self):
        class Failing:
            name = "failing"

            def send(self, to_phone, message):
                raise notify.NotificationError("network down")

        result = notify.dispatch_alert(Failing(), self.path, self.contact, "msg", False, True)
        self.assertEqual(result.status, "failed")
        self.assertFalse(result.delivered)
        self.assertEqual(db.list_events(self.path)[0]["status"], "failed")

    def test_demo_mode_off_has_no_provider(self):
        os.environ["DEMO_MODE"] = "false"
        try:
            with self.assertRaises(notify.NotificationUnavailable):
                notify.get_provider(get_settings())
        finally:
            del os.environ["DEMO_MODE"]

    def test_demo_mode_defaults_to_on(self):
        os.environ.pop("DEMO_MODE", None)
        self.assertTrue(get_settings().demo_mode)

    def test_preview_lists_what_is_and_is_not_shared(self):
        p = notify.build_alert_preview(self.contact, None, "https://maps.example/q", True)
        self.assertEqual(p["recipient_phone_masked"], "*********3210")
        self.assertTrue(any("location" in s for s in p["shared_items"]))
        self.assertIn("Your personal video", p["not_shared"])
        self.assertIn("https://maps.example/q", p["message"])
        p2 = notify.build_alert_preview(self.contact, None, None, True)
        self.assertFalse(any("location" in s for s in p2["shared_items"]))
        self.assertNotIn("http", p2["message"])


class LocationTests(TempDbCase):
    def test_preview(self):
        p = location.build_location_preview(12.97160, 77.59460, 35.4)
        self.assertIn("12.97160,77.59460", p["maps_link"])
        self.assertIn("35 metres", p["shared_items"][0])

    def test_demo_update_is_simulated_and_rounded(self):
        event = location.record_demo_update(self.path, 12.971599, 77.594563, 1)
        self.assertEqual(event["status"], "simulated")
        self.assertEqual(event["detail"]["approx_lat"], 12.97)

    def test_delete_all_data(self):
        db.save_contact(self.path, "Asha", "+919876543210", None)
        location.record_demo_update(self.path, 1.0, 2.0, 1)
        db.delete_all_data(self.path)
        self.assertIsNone(db.get_contact(self.path))
        self.assertEqual(db.list_events(self.path), [])


class EnsembleTests(unittest.TestCase):
    def test_response_scoring(self):
        from app.services.llm import score_support_response

        # Empathetic, supportive, well-sized response
        good = "I hear you, and it is completely valid that you feel overwhelmed. Take a gentle breath. I am right here with you."
        good_score = score_support_response(good)
        self.assertGreater(good_score, 10.0)

        # Toxic positivity response
        toxic = "Cheer up, everything will be fine and you have so much to live for! Don't worry!"
        toxic_score = score_support_response(toxic)
        self.assertLess(toxic_score, good_score)

        # Empty
        self.assertEqual(score_support_response(""), 0.0)

    def test_ensemble_picks_better_response(self):
        from app.services.llm import EnsembleComparatorClient, LLMUnavailable

        class MockClientA:
            name = "gemini"
            def generate(self, system, messages):
                return "Cheer up! Everything will be fine!"

        class MockClientB:
            name = "groq"
            def generate(self, system, messages):
                return "I hear how heavy things feel right now. Let's take a slow breath together. What is on your mind?"

        ensemble = EnsembleComparatorClient([MockClientA(), MockClientB()])
        chosen = ensemble.generate("sys", [{"role": "user", "content": "hi"}])
        self.assertIn("heavy", chosen)
        self.assertEqual(ensemble.last_used_provider, "groq")

    def test_ensemble_survives_single_provider_failure(self):
        from app.services.llm import EnsembleComparatorClient, LLMUnavailable

        class FailingClient:
            name = "gemini"
            def generate(self, system, messages):
                raise LLMUnavailable("Quota exceeded")

        class WorkingClient:
            name = "groq"
            def generate(self, system, messages):
                return "I am here with you. Take your time."

        ensemble = EnsembleComparatorClient([FailingClient(), WorkingClient()])
        chosen = ensemble.generate("sys", [{"role": "user", "content": "hi"}])
        self.assertIn("here with you", chosen)
        self.assertEqual(ensemble.last_used_provider, "groq")


if __name__ == "__main__":
    unittest.main()
