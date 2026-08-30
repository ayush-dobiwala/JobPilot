"""Demo ATS form filler for local fixtures."""

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from app.autofill.base import BaseFiller
from app.models.autofill import Applicant
from app.models.common import LogEntry


def _is_demo_form_url(form_url: str) -> bool:
    normalized = form_url.lower()
    return "demo-apply" in normalized or "demo_apply" in normalized


class DemoFormFiller(BaseFiller):
    """Fill the self-hosted demo ATS application form."""

    def can_handle(self, form_url: str) -> bool:
        return _is_demo_form_url(form_url)

    def fill(self, driver: WebDriver, applicant: Applicant) -> list[LogEntry]:
        wait = WebDriverWait(driver, 10)
        logs: list[LogEntry] = [
            LogEntry(step="navigate", message="DemoFormFiller loaded demo application form.")
        ]

        wait.until(EC.presence_of_element_located((By.ID, "application-form")))

        field_map: list[tuple[str, str | None, str]] = [
            ("name", applicant.name, "name"),
            ("email", applicant.email, "email"),
            ("phone", applicant.phone, "phone"),
            ("linkedin", applicant.linkedinUrl, "linkedin"),
            ("portfolio", applicant.portfolioUrl, "portfolio"),
            ("cover_letter", applicant.coverLetter, "cover letter"),
        ]

        for element_id, value, label in field_map:
            if not value:
                continue
            element = wait.until(EC.element_to_be_clickable((By.ID, element_id)))
            element.clear()
            element.send_keys(value)
            logs.append(LogEntry(step="fill", message=f"Filled {label} field."))

        if applicant.workAuthStatus:
            select_element = wait.until(EC.element_to_be_clickable((By.ID, "work_auth")))
            Select(select_element).select_by_value(applicant.workAuthStatus)
            logs.append(LogEntry(step="fill", message="Selected work authorization status."))

        logs.append(
            LogEntry(
                step="stop",
                message="Autofill complete — Submit button was not clicked (HITL safety).",
            )
        )
        return logs
