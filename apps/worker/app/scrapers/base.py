"""Base scraper interface."""

from abc import ABC, abstractmethod

from app.models.common import LogEntry
from app.models.scrape import Job


class BaseScraper(ABC):
    """Interface for job board scrapers."""

    @abstractmethod
    def scrape(self, query: str | None, url: str | None) -> tuple[list[Job], list[LogEntry]]:
        """Return normalized jobs and structured logs."""
