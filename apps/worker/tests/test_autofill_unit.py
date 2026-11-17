"""Unit tests for autofill fill logic with a mocked Selenium driver."""

from unittest.mock import MagicMock, patch

import pytest
from app.autofill.demo import DemoFormFiller
from app.models.autofill import Applicant


@pytest.fixture
def applicant() -> Applicant:
    return Applicant(
        name="Jane Doe",
        email="jane@example.com",
        phone="555-0100",
        linkedinUrl="https://linkedin.com/in/jane",
        portfolioUrl="https://jane.dev",
        workAuthStatus="authorized",
        coverLetter="Excited to apply.",
    )


def test_demo_form_filler_can_handle_fixture_url() -> None:
    filler = DemoFormFiller()
    assert filler.can_handle("http://localhost:8000/fixtures/demo-apply.html")
    assert filler.can_handle("file:///tmp/demo_apply.html")


@patch("app.autofill.demo.WebDriverWait")
def test_demo_form_filler_fills_fields(mock_wait_cls: MagicMock, applicant: Applicant) -> None:
    driver = MagicMock()
    driver.current_url = "file:///demo_apply.html"

    mock_wait = mock_wait_cls.return_value
    mock_element = MagicMock()

    def until(condition: object) -> MagicMock:
        _ = condition
        return mock_element

    mock_wait.until.side_effect = until

    select_patch = patch("app.autofill.demo.Select")
    with select_patch as mock_select_cls:
        mock_select = mock_select_cls.return_value
        logs = DemoFormFiller().fill(driver, applicant)

    assert any(log.step == "fill" and "name" in log.message for log in logs)
    assert mock_element.send_keys.call_count >= 5
    mock_select.select_by_value.assert_called_once_with("authorized")
    assert any(log.step == "stop" for log in logs)


@patch("app.autofill.demo.WebDriverWait")
def test_demo_form_filler_skips_empty_optional_fields(
    mock_wait_cls: MagicMock,
) -> None:
    driver = MagicMock()
    mock_wait = mock_wait_cls.return_value
    mock_element = MagicMock()
    mock_wait.until.return_value = mock_element

    applicant = Applicant(name="Jane Doe", email="jane@example.com")
    logs = DemoFormFiller().fill(driver, applicant)

    # first name, last name, email, plus always-attached resume file input
    assert mock_element.send_keys.call_count == 4
    assert any(log.step == "fill" and "first name" in log.message for log in logs)
    assert any(log.step == "fill" and "email" in log.message for log in logs)
    assert any(log.step == "missing" and "phone" in log.message for log in logs)
    assert any(log.step == "stop" for log in logs)
