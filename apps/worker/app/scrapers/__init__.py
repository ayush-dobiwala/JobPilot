"""Site scrapers (LinkedIn, Indeed, generic)."""

from app.scrapers.base import BaseScraper
from app.scrapers.generic import GenericScraper
from app.scrapers.indeed import IndeedScraper
from app.scrapers.linkedin import LinkedInScraper

__all__ = ["BaseScraper", "GenericScraper", "IndeedScraper", "LinkedInScraper"]
