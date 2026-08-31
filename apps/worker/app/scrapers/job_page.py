"""Fetch a job description page and extract title + company."""

from __future__ import annotations

import json
import os
import re
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

import httpx

from app.models.common import LogEntry
from app.models.scrape import Job


USER_AGENT = (
    "Mozilla/5.0 (compatible; JobPilot/1.0; +https://jobpilot-a7i.pages.dev) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


class _PageSignalsParser(HTMLParser):
    """Collect title, meta tags, h1, and JSON-LD blocks from HTML."""

    def __init__(self) -> None:
        super().__init__()
        self.title: str | None = None
        self.h1s: list[str] = []
        self.meta: dict[str, str] = {}
        self.json_ld: list[Any] = []
        self._capture: str | None = None
        self._buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: (value or "") for key, value in attrs}
        if tag == "title":
            self._capture = "title"
            self._buffer = []
        elif tag == "h1":
            self._capture = "h1"
            self._buffer = []
        elif tag == "meta":
            key = attr_map.get("property") or attr_map.get("name")
            content = attr_map.get("content", "").strip()
            if key and content:
                self.meta[key.lower()] = content
        elif tag == "script" and "ld+json" in attr_map.get("type", "").lower():
            self._capture = "jsonld"
            self._buffer = []

    def handle_endtag(self, tag: str) -> None:
        if self._capture == "title" and tag == "title":
            text = "".join(self._buffer).strip()
            self.title = text or self.title
            self._capture = None
            self._buffer = []
        elif self._capture == "h1" and tag == "h1":
            text = re.sub(r"\s+", " ", "".join(self._buffer)).strip()
            if text:
                self.h1s.append(text)
            self._capture = None
            self._buffer = []
        elif self._capture == "jsonld" and tag == "script":
            raw = "".join(self._buffer).strip()
            self._capture = None
            self._buffer = []
            if not raw:
                return
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                return
            if isinstance(parsed, list):
                self.json_ld.extend(parsed)
            else:
                self.json_ld.append(parsed)

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._buffer.append(data)


def _hostname_company(url: str) -> str:
    host = urlparse(url).hostname or "company"
    host = host.replace("www.", "")
    parts = [p for p in host.split(".") if p and p not in {"com", "ca", "co", "io", "jobs", "careers"}]
    if not parts:
        parts = host.split(".")[:1]
    label = parts[0] if parts else "Company"
    # jobs.rbc.com -> rbc
    if label.lower() in {"jobs", "careers", "boards", "apply"} and len(parts) > 1:
        label = parts[1]
    return label.replace("-", " ").title()


def _clean(text: str | None) -> str | None:
    if not text:
        return None
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned or None


def _from_job_posting(node: Any) -> tuple[str | None, str | None, str | None]:
    if not isinstance(node, dict):
        return None, None, None
    types = node.get("@type")
    type_list = types if isinstance(types, list) else [types]
    type_names = {str(t).lower() for t in type_list if t}
    if "jobposting" not in type_names:
        # Walk nested graph
        if "@graph" in node and isinstance(node["@graph"], list):
            for child in node["@graph"]:
                title, company, desc = _from_job_posting(child)
                if title or company:
                    return title, company, desc
        return None, None, None

    title = _clean(node.get("title") if isinstance(node.get("title"), str) else None)
    description = None
    raw_desc = node.get("description")
    if isinstance(raw_desc, str):
        description = _clean(re.sub(r"<[^>]+>", " ", raw_desc))

    company = None
    org = node.get("hiringOrganization")
    if isinstance(org, dict):
        company = _clean(org.get("name") if isinstance(org.get("name"), str) else None)
    elif isinstance(org, str):
        company = _clean(org)

    return title, company, description


def _split_title_company(combined: str) -> tuple[str | None, str | None]:
    patterns = (
        r"^(?P<title>.+?)\s+[|\u2013\u2014-]\s+(?P<company>.+)$",
        r"^(?P<title>.+?)\s+at\s+(?P<company>.+)$",
        r"^(?P<title>.+?)\s+·\s+(?P<company>.+)$",
    )
    for pattern in patterns:
        match = re.match(pattern, combined, flags=re.IGNORECASE)
        if match:
            return _clean(match.group("title")), _clean(match.group("company"))
    return _clean(combined), None


def extract_from_html(html: str, url: str) -> Job:
    parser = _PageSignalsParser()
    parser.feed(html)

    title: str | None = None
    company: str | None = None
    description: str | None = None

    for block in parser.json_ld:
        t, c, d = _from_job_posting(block)
        title = title or t
        company = company or c
        description = description or d

    og_title = _clean(parser.meta.get("og:title") or parser.meta.get("twitter:title"))
    site_name = _clean(parser.meta.get("og:site_name"))
    page_title = _clean(parser.title)
    h1 = _clean(parser.h1s[0]) if parser.h1s else None

    if not title:
        for candidate in (h1, og_title, page_title):
            if not candidate:
                continue
            split_title, split_company = _split_title_company(candidate)
            title = split_title
            company = company or split_company
            if title:
                break

    company = company or site_name or _hostname_company(url)
    title = title or "Role from job link"
    if not description:
        description = _clean(parser.meta.get("og:description") or parser.meta.get("description"))
    if not description:
        description = f"Saved from {url}"

    return Job(title=title[:200], company=company[:120], url=url, description=description[:2000])


def _fetch_html_httpx(url: str) -> str:
    with httpx.Client(follow_redirects=True, timeout=12.0, headers={"User-Agent": USER_AGENT}) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.text


def _fetch_html_selenium(url: str) -> str | None:
    # Browser cold-start is slow on free hosts — only when explicitly enabled.
    if os.environ.get("JOB_PAGE_USE_BROWSER", "").lower() not in {"1", "true", "yes"}:
        return None
    try:
        from app.selenium_driver import can_create_driver, create_driver
    except Exception:
        return None
    if not can_create_driver():
        return None
    driver = create_driver(headless=True)
    try:
        driver.set_page_load_timeout(20)
        driver.get(url)
        return driver.page_source or None
    finally:
        driver.quit()


def _looks_complete(job: Job) -> bool:
    weak_titles = {"role from job link", "role from application link"}
    if job.title.lower().strip() in weak_titles:
        return False
    return len(job.company.strip()) >= 2 and len(job.title.strip()) >= 4


def _llm_refine(job: Job, html: str) -> Job | None:
    if os.environ.get("JOB_PAGE_USE_AI", "true").lower() in {"0", "false", "no"}:
        return None
    if _looks_complete(job):
        return None

    api_key = (os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY") or "").strip()
    if not api_key:
        return None

    is_openrouter = api_key.startswith("sk-or-")
    base = (
        os.environ.get("OPENAI_BASE_URL")
        or ("https://openrouter.ai/api/v1" if is_openrouter else "https://api.openai.com/v1")
    ).rstrip("/")
    model = os.environ.get("OPENAI_MODEL") or (
        "openai/gpt-4o-mini" if is_openrouter else "gpt-4o-mini"
    )

    # Keep prompt small — strip tags roughly
    text = re.sub(r"(?is)<script.*?>.*?</script>", " ", html)
    text = re.sub(r"(?is)<style.*?>.*?</style>", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()[:4000]

    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Extract the job posting company name and job title from the page text. "
                    'Return JSON only: {"company":"...","title":"...","description":"short summary"}'
                ),
            },
            {
                "role": "user",
                "content": f"URL: {job.url}\nGuess so far: {job.company} / {job.title}\n\nPage text:\n{text}",
            },
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if is_openrouter:
        headers["HTTP-Referer"] = "https://jobpilot-a7i.pages.dev"
        headers["X-Title"] = "JobPilot"

    try:
        with httpx.Client(timeout=12.0) as client:
            response = client.post(f"{base}/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            parsed = json.loads(content)
    except Exception:
        return None

    company = _clean(parsed.get("company") if isinstance(parsed.get("company"), str) else None)
    title = _clean(parsed.get("title") if isinstance(parsed.get("title"), str) else None)
    description = _clean(
        parsed.get("description") if isinstance(parsed.get("description"), str) else None
    )
    if not company and not title:
        return None
    return Job(
        title=(title or job.title)[:200],
        company=(company or job.company)[:120],
        url=job.url,
        description=(description or job.description or "")[:2000],
    )


def scrape_job_page(url: str) -> tuple[Job, list[LogEntry]]:
    logs: list[LogEntry] = [
        LogEntry(step="navigate", message=f"Opening job page: {url}"),
    ]

    html: str | None = None
    try:
        html = _fetch_html_httpx(url)
        logs.append(LogEntry(step="fetch", message="Downloaded page HTML."))
    except Exception as exc:  # noqa: BLE001 — surface to logs, try Selenium
        logs.append(LogEntry(step="fetch_http", message=f"Direct fetch failed: {exc}"))

    if (not html or len(html) < 200) and os.environ.get("JOB_PAGE_USE_BROWSER", "").lower() in {
        "1",
        "true",
        "yes",
    }:
        selenium_html = _fetch_html_selenium(url)
        if selenium_html:
            html = selenium_html
            logs.append(LogEntry(step="fetch_browser", message="Loaded page with headless browser."))

    if not html:
        company = _hostname_company(url)
        logs.append(
            LogEntry(
                step="fallback",
                message="Could not read the page — saved link with company guessed from the URL.",
            )
        )
        return (
            Job(
                title="Role from job link",
                company=company,
                url=url,
                description=f"Could not extract details automatically. Open the link to review: {url}",
            ),
            logs,
        )

    job = extract_from_html(html, url)
    logs.append(
        LogEntry(
            step="parsed",
            message=f"Found “{job.title}” at {job.company} from page signals.",
        )
    )

    refined = _llm_refine(job, html)
    if refined:
        job = refined
        logs.append(
            LogEntry(
                step="ai",
                message=f"AI refined details to “{job.title}” at {job.company}.",
            )
        )
    elif _looks_complete(job):
        logs.append(LogEntry(step="skip_ai", message="Page already had clear title/company — skipped AI."))

    logs.append(LogEntry(step="complete", message="Ready to save on your Wishlist."))
    return job, logs
