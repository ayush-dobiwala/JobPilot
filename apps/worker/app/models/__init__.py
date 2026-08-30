"""Pydantic models for scrape/autofill payloads."""

from app.models.autofill import (
    Applicant,
    AutofillRequest,
    AutofillResponse,
    ConfirmSubmitRequest,
    ConfirmSubmitResponse,
)
from app.models.common import LogEntry
from app.models.scrape import Job, ScrapeRequest, ScrapeResponse

__all__ = [
    "Applicant",
    "AutofillRequest",
    "AutofillResponse",
    "ConfirmSubmitRequest",
    "ConfirmSubmitResponse",
    "Job",
    "LogEntry",
    "ScrapeRequest",
    "ScrapeResponse",
]
