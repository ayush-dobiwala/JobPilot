"""Autofill request/response models."""

from pydantic import BaseModel

from app.models.common import LogEntry


class Applicant(BaseModel):
    """Applicant profile used to fill ATS forms."""

    name: str
    email: str
    phone: str | None = None
    linkedinUrl: str | None = None
    portfolioUrl: str | None = None
    workAuthStatus: str | None = None
    coverLetter: str | None = None


class AutofillRequest(BaseModel):
    """Input for POST /autofill."""

    formUrl: str
    applicant: Applicant


class AutofillResponse(BaseModel):
    """Output from POST /autofill."""

    logs: list[LogEntry]
    screenshotBase64: str | None = None


class ConfirmSubmitRequest(BaseModel):
    """Input for POST /confirm-submit."""

    formUrl: str


class ConfirmSubmitResponse(BaseModel):
    """Output from POST /confirm-submit."""

    logs: list[LogEntry]
