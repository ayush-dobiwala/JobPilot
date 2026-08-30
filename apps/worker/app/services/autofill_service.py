"""Autofill orchestration."""

import base64
from collections.abc import Callable

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from app.autofill.registry import resolve_filler
from app.models.autofill import AutofillRequest, AutofillResponse, ConfirmSubmitResponse
from app.models.common import LogEntry
from app.selenium_driver import create_driver


def _is_demo_form_url(form_url: str) -> bool:
    normalized = form_url.lower()
    return "demo-apply" in normalized or "demo_apply" in normalized


def _capture_screenshot(driver: WebDriver) -> str:
    png_bytes = driver.get_screenshot_as_png()
    return base64.b64encode(png_bytes).decode("ascii")


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
    finally:
        driver.quit()

    return AutofillResponse(logs=logs, screenshotBase64=screenshot)


def run_confirm_submit(
    form_url: str,
    *,
    driver_factory: Callable[[], WebDriver] | None = None,
) -> ConfirmSubmitResponse:
    """Click final Submit on the demo form only (HITL confirmation step)."""
    factory = driver_factory or create_driver
    if not _is_demo_form_url(form_url):
        return ConfirmSubmitResponse(
            logs=[
                LogEntry(
                    step="reject",
                    message="confirm-submit is only allowed for the demo fixture form.",
                )
            ]
        )

    logs: list[LogEntry] = [
        LogEntry(step="start", message=f"Confirm submit for demo form: {form_url}")
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
            # file:// fixtures may not fire native submit in all headless builds
            driver.execute_script(
                "document.getElementById('application-form')"
                ".dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));"
            )
            wait.until(EC.visibility_of_element_located((By.ID, "success")))
        logs.append(LogEntry(step="submit", message="Clicked Submit on demo application form."))
    finally:
        driver.quit()

    return ConfirmSubmitResponse(logs=logs)
