"""Autofill integration tests via FastAPI TestClient and optional real Selenium."""

from unittest.mock import patch

import pytest
from app.main import app
from app.selenium_driver import can_create_driver
from fastapi.testclient import TestClient

client = TestClient(app)

APPLICANT = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-0100",
    "location": "Toronto, ON",
    "linkedinUrl": "https://linkedin.com/in/jane",
    "portfolioUrl": "https://jane.dev",
    "githubUrl": "https://github.com/jane",
    "workAuthStatus": "authorized",
    "coverLetter": "Excited to join the team.",
    "currentTitle": "Software Engineer",
    "yearsExperience": "1-3",
    "relocation": "hybrid",
    "resumeFileName": "Jane_Doe_Resume.txt",
    "resumeText": "Jane Doe\nSoftware Engineer\nBuilt APIs with TypeScript.",
}


def test_autofill_endpoint_with_mocked_driver(demo_apply_file_url: str) -> None:
    # Demo forms use the instant fast path (no Chrome) unless DEMO_AUTOFILL_USE_BROWSER is set.
    response = client.post(
        "/autofill",
        json={"formUrl": demo_apply_file_url, "applicant": APPLICANT},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reviewUrl"]
    assert "autosubmit=1" in body["reviewUrl"]
    assert body["filledFields"]["email"] == "jane@example.com"
    assert any(log["step"] == "fast_path" for log in body["logs"])
    assert any(log["step"] == "stop" for log in body["logs"])


def test_confirm_submit_skips_non_demo_url() -> None:
    response = client.post(
        "/confirm-submit",
        json={"formUrl": "https://boards.greenhouse.io/acme/jobs/123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert any(log["step"] == "skip" for log in body["logs"])


@pytest.mark.skipif(not can_create_driver(), reason="Chrome/Chromium or chromedriver not available")
def test_autofill_against_demo_fixture_with_real_selenium(
    demo_apply_http_url: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Demo forms use the instant fast path unless browser mode is forced.
    monkeypatch.setenv("DEMO_AUTOFILL_USE_BROWSER", "1")
    response = client.post(
        "/autofill",
        json={"formUrl": demo_apply_http_url, "applicant": APPLICANT},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["screenshotBase64"]
    assert len(body["logs"]) >= 3
    assert any(log["step"] == "screenshot" for log in body["logs"])


@pytest.mark.skipif(not can_create_driver(), reason="Chrome/Chromium or chromedriver not available")
def test_confirm_submit_demo_form(demo_apply_http_url: str) -> None:
    response = client.post("/confirm-submit", json={"formUrl": demo_apply_http_url})
    assert response.status_code == 200
    body = response.json()
    assert any(log["step"] == "submit" for log in body["logs"])


def test_queue_consumer_dispatches_to_local_handler() -> None:
    from app.queue_consumer import handle_payload

    with patch("app.queue_consumer.httpx.post") as mock_post:
        mock_post.return_value.json.return_value = {"jobs": [], "logs": []}
        mock_post.return_value.raise_for_status.return_value = None
        result = handle_payload(
            "http://localhost:8000",
            {"action": "scrape", "payload": {"query": "react", "url": None}},
        )

    assert result == {"jobs": [], "logs": []}
    mock_post.assert_called_once()
    assert mock_post.call_args.args[0] == "http://localhost:8000/scrape"
