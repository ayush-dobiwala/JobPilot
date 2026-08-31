"""Demo ATS form filler for local fixtures."""

from __future__ import annotations

from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from app.autofill.base import BaseFiller
from app.models.autofill import Applicant
from app.models.common import LogEntry

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def _is_demo_form_url(form_url: str) -> bool:
    normalized = form_url.lower()
    return "demo-apply" in normalized or "demo_apply" in normalized


def _split_name(full_name: str) -> tuple[str, str]:
    parts = [p for p in full_name.strip().split() if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _ensure_resume_file(applicant: Applicant) -> Path:
    """Write a text resume fixture the file input can attach."""
    path = FIXTURES_DIR / "demo_resume_upload.txt"
    body = applicant.resumeText or (
        f"{applicant.name}\n{applicant.email}\n"
        f"{applicant.phone or ''}\n{applicant.location or ''}\n"
        f"LinkedIn: {applicant.linkedinUrl or ''}\n"
        f"Portfolio: {applicant.portfolioUrl or ''}\n"
        f"GitHub: {applicant.githubUrl or ''}\n\n"
        f"{applicant.currentTitle or 'Candidate'}\n"
        "Prepared by JobPilot for interview demo autofill.\n"
    )
    path.write_text(body.strip() + "\n", encoding="utf-8")
    return path


class DemoFormFiller(BaseFiller):
    """Fill the self-hosted professional demo ATS application form."""

    def can_handle(self, form_url: str) -> bool:
        return _is_demo_form_url(form_url)

    def fill(self, driver: WebDriver, applicant: Applicant) -> list[LogEntry]:
        wait = WebDriverWait(driver, 12)
        logs: list[LogEntry] = [
            LogEntry(step="navigate", message="Opened Meridian Careers demo application form.")
        ]

        wait.until(EC.presence_of_element_located((By.ID, "application-form")))
        first, last = _split_name(applicant.name)

        text_fields: list[tuple[str, str | None, str]] = [
            ("first_name", first or None, "first name"),
            ("last_name", last or None, "last name"),
            ("email", applicant.email, "email"),
            ("phone", applicant.phone, "phone"),
            ("location", applicant.location, "location"),
            ("linkedin", applicant.linkedinUrl, "LinkedIn"),
            ("portfolio", applicant.portfolioUrl, "portfolio"),
            ("github", applicant.githubUrl, "GitHub"),
            ("website", applicant.websiteUrl or applicant.portfolioUrl, "website"),
            ("current_title", applicant.currentTitle, "current title"),
            ("start_date", applicant.startDate, "start date"),
            ("cover_letter", applicant.coverLetter, "cover letter"),
            ("additional_info", applicant.additionalInfo, "additional info"),
        ]

        for element_id, value, label in text_fields:
            if not value:
                logs.append(LogEntry(step="missing", message=f"Skipped {label} — not in profile."))
                continue
            element = wait.until(EC.element_to_be_clickable((By.ID, element_id)))
            element.clear()
            element.send_keys(value)
            logs.append(LogEntry(step="fill", message=f"Filled {label}."))

        if applicant.yearsExperience:
            select_element = wait.until(EC.element_to_be_clickable((By.ID, "years_experience")))
            Select(select_element).select_by_value(applicant.yearsExperience)
            logs.append(LogEntry(step="fill", message="Selected years of experience."))
        else:
            logs.append(LogEntry(step="missing", message="Skipped years of experience — not set."))

        if applicant.workAuthStatus:
            select_element = wait.until(EC.element_to_be_clickable((By.ID, "work_auth")))
            try:
                Select(select_element).select_by_value(applicant.workAuthStatus)
            except Exception:
                Select(select_element).select_by_value("authorized")
            logs.append(LogEntry(step="fill", message="Selected work authorization."))
        else:
            logs.append(LogEntry(step="missing", message="Skipped work authorization — not set."))

        if applicant.relocation:
            select_element = wait.until(EC.element_to_be_clickable((By.ID, "relocation")))
            Select(select_element).select_by_value(applicant.relocation)
            logs.append(LogEntry(step="fill", message="Selected relocation preference."))

        resume_path = _ensure_resume_file(applicant)
        resume_input = wait.until(EC.presence_of_element_located((By.ID, "resume")))
        resume_input.send_keys(str(resume_path.resolve()))
        display_name = applicant.resumeFileName or resume_path.name
        driver.execute_script(
            "document.getElementById('resume_filename').textContent = arguments[0];",
            f"Attached: {display_name}",
        )
        logs.append(LogEntry(step="fill", message=f"Attached resume file ({display_name})."))

        logs.append(
            LogEntry(
                step="stop",
                message="Autofill complete — Submit was not clicked (you review first).",
            )
        )
        return logs
