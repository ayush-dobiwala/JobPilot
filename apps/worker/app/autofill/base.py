"""Shared autofill interface. Implementations never click final submit without confirmation."""

from abc import ABC, abstractmethod

from selenium.webdriver.remote.webdriver import WebDriver

from app.models.autofill import Applicant
from app.models.common import LogEntry


class BaseFiller(ABC):
    """Interface for ATS form fillers."""

    @abstractmethod
    def can_handle(self, form_url: str) -> bool:
        """Return True when this filler should handle the given form URL."""

    @abstractmethod
    def fill(self, driver: WebDriver, applicant: Applicant) -> list[LogEntry]:
        """Fill form fields without clicking final submit."""
