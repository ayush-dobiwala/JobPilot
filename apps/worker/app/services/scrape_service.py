"""Scrape orchestration."""

from app.models.scrape import ScrapeRequest, ScrapeResponse
from app.scrapers.generic import GenericScraper


def run_scrape(request: ScrapeRequest) -> ScrapeResponse:
    """Execute scraping via GenericScraper (no live LinkedIn/Indeed in tests)."""
    scraper = GenericScraper()
    jobs, logs = scraper.scrape(request.query, request.url)
    return ScrapeResponse(jobs=jobs, logs=logs)
