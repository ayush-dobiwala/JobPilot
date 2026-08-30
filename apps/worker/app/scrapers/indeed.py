"""Indeed job board scraper — not used in tests (live scraping disabled)."""

from app.models.common import LogEntry
from app.models.scrape import Job
from app.scrapers.base import BaseScraper


class IndeedScraper(BaseScraper):
    """Placeholder Indeed scraper; live scraping is intentionally disabled."""

    def scrape(self, query: str | None, url: str | None) -> tuple[list[Job], list[LogEntry]]:
        logs = [
            LogEntry(
                step="skip",
                message="IndeedScraper is disabled in tests and demo mode. Use GenericScraper.",
            )
        ]
        return [], logs
