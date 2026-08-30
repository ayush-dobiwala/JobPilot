"""Scrape request/response models."""

from pydantic import BaseModel

from app.models.common import LogEntry


class ScrapeRequest(BaseModel):
    """Input for POST /scrape."""

    query: str | None = None
    url: str | None = None


class Job(BaseModel):
    """Normalized job listing."""

    title: str
    company: str
    url: str
    description: str


class ScrapeResponse(BaseModel):
    """Output from POST /scrape."""

    jobs: list[Job]
    logs: list[LogEntry]
