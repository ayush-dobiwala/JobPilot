"""Generic form filler using name/id/label heuristics."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from app.autofill.base import BaseFiller
from app.autofill.demo import DemoFormFiller
from app.models.autofill import Applicant
from app.models.common import LogEntry


class GenericFormFiller(BaseFiller):
    """Attempt to fill common ATS fields by id, name, or label text."""

    _HEURISTICS: list[tuple[tuple[str, ...], str | None]] = [
        (("name", "full_name", "fullname"), "name"),
        (("email", "email_address"), "email"),
        (("phone", "tel", "mobile"), "phone"),
        (("linkedin", "linkedin_url"), "linkedinUrl"),
        (("portfolio", "website", "personal_website"), "portfolioUrl"),
        (("cover_letter", "coverletter", "message"), "coverLetter"),
    ]

    def can_handle(self, form_url: str) -> bool:
        return True

    def fill(self, driver: WebDriver, applicant: Applicant) -> list[LogEntry]:
        if DemoFormFiller().can_handle(driver.current_url):
            return DemoFormFiller().fill(driver, applicant)

        wait = WebDriverWait(driver, 10)
        logs: list[LogEntry] = [
            LogEntry(step="generic", message="GenericFormFiller applying field heuristics.")
        ]

        for keys, attr in self._HEURISTICS:
            value = getattr(applicant, attr) if attr else None
            if not value:
                continue
            filled = self._try_fill(driver, wait, keys, value)
            if filled:
                logs.append(LogEntry(step="fill", message=f"Filled field matching {keys[0]!r}."))

        if applicant.workAuthStatus:
            auth_keys = ("work_auth", "work-authorization", "visa")
            if self._try_select(driver, wait, auth_keys, applicant.workAuthStatus):
                logs.append(
                    LogEntry(step="fill", message="Selected work authorization via heuristic.")
                )

        logs.append(
            LogEntry(
                step="stop",
                message="Generic autofill complete — Submit was not clicked.",
            )
        )
        return logs

    def _try_fill(
        self,
        driver: WebDriver,
        wait: WebDriverWait[WebDriver],
        keys: tuple[str, ...],
        value: str,
    ) -> bool:
        for key in keys:
            for selector in (
                (By.ID, key),
                (By.NAME, key),
                (By.CSS_SELECTOR, f"input[name*='{key}']"),
                (By.CSS_SELECTOR, f"textarea[name*='{key}']"),
            ):
                try:
                    element = wait.until(EC.element_to_be_clickable(selector))
                    element.clear()
                    element.send_keys(value)
                    return True
                except Exception:
                    continue
        return False

    def _try_select(
        self,
        driver: WebDriver,
        wait: WebDriverWait[WebDriver],
        keys: tuple[str, ...],
        value: str,
    ) -> bool:
        for key in keys:
            for selector in ((By.ID, key), (By.NAME, key)):
                try:
                    element = wait.until(EC.element_to_be_clickable(selector))
                    Select(element).select_by_value(value)
                    return True
                except Exception:
                    continue
        return False
