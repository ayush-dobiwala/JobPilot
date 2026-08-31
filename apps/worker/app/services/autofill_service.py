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


def _applicant_fields(applicant: Applicant) -> dict[str, str]:
    fields: dict[str, str] = {
        "name": applicant.name,
        "email": applicant.email,
    }
    if applicant.phone:
        fields["phone"] = applicant.phone
    if applicant.linkedinUrl:
        fields["linkedin"] = applicant.linkedinUrl
    if applicant.portfolioUrl:
        fields["portfolio"] = applicant.portfolioUrl
    if applicant.workAuthStatus:
        fields["work_auth"] = applicant.workAuthStatus
    if applicant.coverLetter:
        fields["cover_letter"] = applicant.coverLetter
    return fields


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
        driver.get(request.formUrl)
        filler = resolve_filler(request.formUrl)
        logs.append(
            LogEntry(step="filler", message=f"Using {filler.__class__.__name__} for form.")
        )
        fill_logs = filler.fill(driver, request.applicant)
        logs.extend(fill_logs)
        screenshot = _capture_screenshot(driver)
        logs.append(LogEntry(step="screenshot", message="Captured autofill screenshot."))
        logs.append(
            LogEntry(
                step="review_ready",
                message=(
                    "Open the review URL, verify fields, submit yourself, "
                    "then mark Applied in JobPilot."
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
