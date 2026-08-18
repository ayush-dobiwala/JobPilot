"""FastAPI entrypoint. Scrape/autofill routes are added in build step 6."""

from fastapi import FastAPI

from app import __version__

app = FastAPI(title="JobPilot Worker", version=__version__)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by Docker, Railway, and the Node API."""
    return {"status": "ok", "version": __version__}
