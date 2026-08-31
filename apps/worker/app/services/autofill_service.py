"""Autofill orchestration."""

from __future__ import annotations

import base64
from collections.abc import Callable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from app.autofill.registry import resolve_filler
from app.models.autofill import Applicant, AutofillRequest, AutofillResponse, ConfirmSubmitResponse
from app.models.common import LogEntry
from app.selenium_driver import create_driver


def _is_demo_form_url(form_url: str) -> bool:
    normalized = form_url.lower()
    return "demo-apply" in normalized or "demo_apply" in normalized


def _capture_screenshot(driver: WebDriver) -> str:
    png_bytes = driver.get_screenshot_as_png()
    return base64.b64encode(png_bytes).decode("ascii")


def _split_name(full_name: str) -> tuple[str, str]:
    parts = [p for p in full_name.strip().split() if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _applicant_fields(applicant: Applicant) -> dict[str, str]:
    first, last = _split_name(applicant.name)
    fields: dict[str, str] = {
        "name": applicant.name,
        "first_name": first,
        "last_name": last,
        "email": applicant.email,
    }
    optional = {
        "phone": applicant.phone,
        "location": applicant.location,
        "linkedin": applicant.linkedinUrl,
        "portfolio": applicant.portfolioUrl,
        "github": applicant.githubUrl,
        "website": applicant.websiteUrl or applicant.portfolioUrl,
        "work_auth": applicant.workAuthStatus,
        "cover_letter": applicant.coverLetter,
        "current_title": applicant.currentTitle,
        "years_experience": applicant.yearsExperience,
        "start_date": applicant.startDate,
        "relocation": applicant.relocation,
        "additional_info": applicant.additionalInfo,
        "resume_filename": applicant.resumeFileName,
    }
    for key, value in optional.items():
        if value:
            fields[key] = value
    return fields


def _missing_fields(applicant: Applicant) -> list[str]:
    missing: list[str] = []
    if not applicant.name.strip():
        missing.append("name")
    if not applicant.email.strip():
        missing.append("email")
    if not (applicant.phone or "").strip():
        missing.append("phone")
    if not (applicant.linkedinUrl or "").strip():
        missing.append("linkedin")
    if not (applicant.workAuthStatus or "").strip():
        missing.append("work_authorization")
    if not (applicant.resumeFileName or applicant.resumeText):
        missing.append("resume")
    return missing


def build_review_url(
    form_url: str,
    applicant: Applicant,
    *,
    company: str | None = None,
    role: str | None = None,
) -> str:
    """Build a URL the candidate can open with fields pre-filled (demo forms)."""
    fields = _applicant_fields(applicant)
    if company:
        fields["company"] = company
    if role:
        fields["role"] = role

    parts = urlsplit(form_url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.update(fields)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def run_autofill(
    request: AutofillRequest,
    *,
    driver_factory: Callable[[], WebDriver] | None = None,
) -> AutofillResponse:
    """Fill a form with Selenium, capture a screenshot, and stop before submit."""
    factory = driver_factory or create_driver
    logs: list[LogEntry] = [
        LogEntry(step="start", message=f"Autofill started for {request.formUrl}")
    ]
    missing = _missing_fields(request.applicant)
    if missing:
        logs.append(
            LogEntry(
                step="profile_gaps",
                message="Missing in JobPilot profile: " + ", ".join(missing),
            )
        )

    driver = factory()
    screenshot: str | None = None
    filled_fields = _applicant_fields(request.applicant)
    review_url = build_review_url(
        request.formUrl,
        request.applicant,
        company=request.company,
        role=request.roleTitle,
    )
    try:
        # Load the review URL so the form already shows query-param fills,
        # then Selenium completes file upload + any remaining controls.
        driver.get(review_url if _is_demo_form_url(request.formUrl) else request.formUrl)
        filler = resolve_filler(request.formUrl)
        logs.append(
            LogEntry(step="filler", message=f"Using {filler.__class__.__name__} for form.")
        )
        fill_logs = filler.fill(driver, request.applicant)
        logs.extend(fill_logs)
        # Scroll to top for a clean interview screenshot of the filled form.
        driver.execute_script("window.scrollTo(0, 0);")
        screenshot = _capture_screenshot(driver)
        logs.append(LogEntry(step="screenshot", message="Captured filled-form screenshot."))
        logs.append(
            LogEntry(
                step="review_ready",
                message=(
                    "Open the review link in your browser to see the same filled form, "
                    "edit if needed, submit yourself, then mark Applied in JobPilot."
                ),
            )
        )
    finally:
        driver.quit()

    return AutofillResponse(
        logs=logs,
        screenshotBase64=screenshot,
        filledFields=filled_fields,
        reviewUrl=review_url,
        missingFields=missing,
    )


def run_confirm_submit(
    form_url: str,
    *,
    driver_factory: Callable[[], WebDriver] | None = None,
) -> ConfirmSubmitResponse:
    """Optional demo-only submit click. Prefer human submit via review URL."""
    factory = driver_factory or create_driver
    if not _is_demo_form_url(form_url):
        return ConfirmSubmitResponse(
            logs=[
                LogEntry(
                    step="skip",
                    message="Human already submitted on the live form — worker confirm skipped.",
                )
            ]
        )

    logs: list[LogEntry] = [
        LogEntry(step="start", message=f"Optional demo confirm for: {form_url}")
    ]
    driver = factory()
    try:
        driver.get(form_url)
        wait = WebDriverWait(driver, 10)
        submit = wait.until(EC.element_to_be_clickable((By.ID, "submit-btn")))
        submit.click()
        try:
            wait.until(EC.visibility_of_element_located((By.ID, "success")))
        except TimeoutException:
            driver.execute_script(
                "document.getElementById('application-form')"
                ".dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));"
            )
            wait.until(EC.visibility_of_element_located((By.ID, "success")))
        logs.append(LogEntry(step="submit", message="Clicked Submit on demo application form."))
    finally:
        driver.quit()

    return ConfirmSubmitResponse(logs=logs)
