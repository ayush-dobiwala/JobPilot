"""FastAPI entrypoint for scrape, autofill, and queue-driven automation."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from app import __version__
from app.models.autofill import (
    AutofillRequest,
    AutofillResponse,
    ConfirmSubmitRequest,
    ConfirmSubmitResponse,
)
from app.models.scrape import ScrapeRequest, ScrapeResponse
from app.services.autofill_service import run_autofill, run_confirm_submit
from app.services.scrape_service import run_scrape

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

app = FastAPI(title="JobPilot Worker", version=__version__)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by Docker, Railway, and the Node API."""
    return {"status": "ok", "version": __version__}


@app.get("/fixtures/demo-apply.html")
def serve_demo_apply_fixture() -> FileResponse:
    """Serve the self-hosted dummy ATS application form."""
    path = FIXTURES_DIR / "demo_apply.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="demo_apply.html fixture not found")
    return FileResponse(path, media_type="text/html")


@app.get("/fixtures/demo-jobs-board.html")
def serve_demo_jobs_board_fixture() -> FileResponse:
    """Serve the local demo jobs board used by GenericScraper."""
    path = FIXTURES_DIR / "demo_jobs_board.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="demo_jobs_board.html fixture not found")
    return FileResponse(path, media_type="text/html")


@app.get("/fixtures/demo-job-posting.html")
def serve_demo_job_posting_fixture() -> FileResponse:
    """Serve a single JobPosting page used by Wishlist URL extraction tests."""
    path = FIXTURES_DIR / "demo_job_posting.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="demo_job_posting.html fixture not found")
    return FileResponse(path, media_type="text/html")


@app.post("/scrape", response_model=ScrapeResponse)
def scrape_jobs(body: ScrapeRequest) -> ScrapeResponse:
    """Open a job URL (or demo fixtures) and return title/company for Wishlist."""
    return run_scrape(body)


@app.post("/autofill", response_model=AutofillResponse)
def autofill_form(body: AutofillRequest) -> AutofillResponse:
    """Fill an ATS form, capture a screenshot, and stop before clicking Submit."""
    return run_autofill(body)


@app.post("/confirm-submit", response_model=ConfirmSubmitResponse)
def confirm_submit(body: ConfirmSubmitRequest) -> ConfirmSubmitResponse:
    """Click final Submit on the demo form after human confirmation."""
    return run_confirm_submit(body.formUrl)
