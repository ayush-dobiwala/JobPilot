"""Generic scraper for local fixtures and deterministic demo data."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

from app.models.common import LogEntry
from app.models.scrape import Job
from app.scrapers.base import BaseScraper

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
JOBS_BOARD_FIXTURE = FIXTURES_DIR / "demo_jobs_board.html"


class _JobsBoardParser(HTMLParser):
    """Parse demo_jobs_board.html into job records."""

    def __init__(self) -> None:
        super().__init__()
        self.jobs: list[Job] = []
        self._in_listing = False
        self._title: str | None = None
        self._url: str | None = None
        self._company: str | None = None
        self._description: str | None = None
        self._capture: str | None = None
        self._buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value for key, value in attrs if value is not None}
        if tag == "li" and "job-listing" in attr_map.get("class", "").split():
            self._in_listing = True
            self._title = None
            self._url = None
            self._company = None
            self._description = None
            return
        if not self._in_listing:
            return
        if tag == "a" and "job-title" in attr_map.get("class", "").split():
            self._capture = "title"
            self._buffer = []
            self._url = attr_map.get("href")
        elif tag == "span" and "job-company" in attr_map.get("class", "").split():
            self._capture = "company"
            self._buffer = []
        elif tag == "p" and "job-description" in attr_map.get("class", "").split():
            self._capture = "description"
            self._buffer = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "li" and self._in_listing:
            if self._title and self._company and self._url and self._description:
                self.jobs.append(
                    Job(
                        title=self._title,
                        company=self._company,
                        url=self._url,
                        description=self._description,
                    )
                )
            self._in_listing = False
            self._capture = None
            return
        if self._capture and tag in {"a", "span", "p"}:
            text = "".join(self._buffer).strip()
            if self._capture == "title":
                self._title = text
            elif self._capture == "company":
                self._company = text
            elif self._capture == "description":
                self._description = text
            self._capture = None
            self._buffer = []

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._buffer.append(data)


def _demo_jobs_for_query(query: str) -> list[Job]:
    """Return three deterministic remote SWE jobs matching the query."""
    slug = query.strip().lower().replace(" ", "-") or "software-engineer"
    companies = ("Nimbus Labs", "Orbit Systems", "Vertex Cloud")
    titles = (
        f"Remote {query.title()} Engineer",
        f"Senior {query.title()} Developer",
        f"Staff {query.title()} — Remote",
    )
    return [
        Job(
            title=title,
            company=company,
            url=f"https://example.com/jobs/{slug}-{index}",
            description=(
                f"Fully remote {query} role building production systems. "
                "No live LinkedIn/Indeed scraping in tests."
            ),
        )
        for index, (title, company) in enumerate(zip(titles, companies, strict=True))
    ]


def _is_fixture_board_url(url: str) -> bool:
    normalized = unquote(url).lower()
    return "demo_jobs_board" in normalized or normalized.endswith("/fixtures/demo-jobs-board.html")


def _read_fixture_board() -> list[Job]:
    html = JOBS_BOARD_FIXTURE.read_text(encoding="utf-8")
    parser = _JobsBoardParser()
    parser.feed(html)
    return parser.jobs


class GenericScraper(BaseScraper):
    """Scrape local fixtures or return deterministic demo jobs."""

    def scrape(self, query: str | None, url: str | None) -> tuple[list[Job], list[LogEntry]]:
        logs: list[LogEntry] = [
            LogEntry(step="init", message="GenericScraper started (no live LinkedIn/Indeed).")
        ]

        if url and _is_fixture_board_url(url):
            logs.append(
                LogEntry(step="fixture", message=f"Reading local jobs board fixture: {url}")
            )
            jobs = _read_fixture_board()
            logs.append(
                LogEntry(step="complete", message=f"Parsed {len(jobs)} jobs from fixture board.")
            )
            return jobs, logs

        if url and url.startswith("file://"):
            path = Path(unquote(urlparse(url).path))
            if path.name == "demo_jobs_board.html" and path.exists():
                logs.append(LogEntry(step="fixture", message=f"Reading file URL: {url}"))
                html = path.read_text(encoding="utf-8")
                parser = _JobsBoardParser()
                parser.feed(html)
                jobs = parser.jobs
                logs.append(
                    LogEntry(step="complete", message=f"Parsed {len(jobs)} jobs from file fixture.")
                )
                return jobs, logs

        if query:
            logs.append(
                LogEntry(
                    step="demo",
                    message=f"No fixture URL provided; returning demo jobs for query={query!r}.",
                )
            )
            jobs = _demo_jobs_for_query(query)
            logs.append(LogEntry(step="complete", message=f"Generated {len(jobs)} demo jobs."))
            return jobs, logs

        logs.append(
            LogEntry(step="complete", message="No query or fixture URL; returning empty list.")
        )
        return [], logs
