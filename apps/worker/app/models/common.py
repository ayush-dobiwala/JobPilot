"""Shared Pydantic models."""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(tz=UTC)


class LogEntry(BaseModel):
    """Structured log line returned by scrape/autofill operations."""

    step: str
    message: str
    timestamp: datetime = Field(default_factory=utc_now)
