"""Request shapes. Pydantic checks every incoming value before our code sees it."""
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

PHONE_RE = re.compile(r"^\+?[0-9]{7,15}$")


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[HistoryItem] = Field(default_factory=list, max_length=20)

    @field_validator("message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message must not be blank")
        return v.strip()


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str
    relationship: str | None = Field(default=None, max_length=40)
    consent: bool

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        digits = re.sub(r"[\s\-()]", "", v)
        if not PHONE_RE.match(digits):
            raise ValueError("enter a valid phone number, e.g. +919876543210")
        return digits

    @field_validator("relationship")
    @classmethod
    def clean_relationship(cls, v: str | None) -> str | None:
        return v.strip() or None if v else None

    @field_validator("consent")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if v is not True:
            raise ValueError("consent is required to save a trusted contact")
        return v


class SafetyPlanIn(BaseModel):
    activities: list[str] = Field(default_factory=list, max_length=10)
    people: list[str] = Field(default_factory=list, max_length=10)
    professional_steps: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("activities", "people", "professional_steps")
    @classmethod
    def clean_items(cls, items: list[str]) -> list[str]:
        cleaned = [i.strip() for i in items if i and i.strip()]
        if any(len(i) > 200 for i in cleaned):
            raise ValueError("each item must be 200 characters or fewer")
        return cleaned


class AlertRequest(BaseModel):
    share_location: bool = False
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0, le=100000)
    sender_name: str | None = Field(default=None, max_length=40)


class AlertSendRequest(AlertRequest):
    confirm: bool = False


class LocationPreviewRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0, le=100000)


class DemoLocationUpdate(LocationPreviewRequest):
    sequence: int = Field(ge=1, le=10000)
