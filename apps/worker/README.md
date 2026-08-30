# @jobpilot/worker

Python 3.11 FastAPI service for job scraping and ATS autofill (Greenhouse/Lever-style forms). A Redis queue consumer can dispatch work from Node BullMQ, or Node can call the HTTP endpoints directly.

**Safety:** the worker fills forms and takes a screenshot, then **stops**. It never clicks final submit unless the user explicitly confirms via `POST /confirm-submit` on the demo fixture form.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/fixtures/demo-apply.html` | Self-hosted dummy ATS application form |
| `GET` | `/fixtures/demo-jobs-board.html` | Local jobs board for scraper tests |
| `POST` | `/scrape` | Scrape fixture board or return deterministic demo jobs |
| `POST` | `/autofill` | Fill form fields with Selenium, screenshot, stop before Submit |
| `POST` | `/confirm-submit` | Click Submit on demo form only (HITL confirmation) |

### Example requests

```bash
# Health
curl http://localhost:8000/health

# Scrape demo jobs by query (no live LinkedIn/Indeed)
curl -X POST http://localhost:8000/scrape \
  -H 'Content-Type: application/json' \
  -d '{"query":"python","url":null}'

# Autofill demo ATS form (served locally or via file:// in tests)
curl -X POST http://localhost:8000/autofill \
  -H 'Content-Type: application/json' \
  -d '{
    "formUrl":"http://localhost:8000/fixtures/demo-apply.html",
    "applicant":{
      "name":"Jane Doe",
      "email":"jane@example.com",
      "phone":"555-0100",
      "linkedinUrl":"https://linkedin.com/in/jane",
      "portfolioUrl":"https://jane.dev",
      "workAuthStatus":"authorized",
      "coverLetter":"Excited to apply."
    }
  }'

# Confirm submit (demo fixture only)
curl -X POST http://localhost:8000/confirm-submit \
  -H 'Content-Type: application/json' \
  -d '{"formUrl":"http://localhost:8000/fixtures/demo-apply.html"}'
```

## Local development

```bash
cd apps/worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# API server
uvicorn app.main:app --reload --port 8000

# Redis queue consumer (optional — Node can also call HTTP directly)
export REDIS_URL=redis://localhost:6379
export WORKER_INTERNAL_URL=http://localhost:8000
python -m app.queue_consumer
```

Queue payloads are JSON objects pushed to Redis list `jobpilot:automation`:

```json
{
  "action": "scrape",
  "payload": { "query": "react", "url": null }
}
```

Supported actions: `scrape`, `autofill`, `confirm-submit`.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis for queue consumer |
| `WORKER_INTERNAL_URL` | `http://localhost:8000` | Base URL the consumer POSTs to |
| `DATABASE_URL` | _(empty)_ | Reserved for future use |
| `CHROME_BIN` | _(auto)_ | Override Chrome/Chromium binary (set in Docker) |

## Tests & quality

```bash
pytest
ruff check app tests
mypy app
```

Selenium integration tests run when Chrome/Chromium is installed; otherwise they are skipped. Unit tests mock the WebDriver.

## Docker

The Dockerfile installs Chromium and driver dependencies for headless Selenium:

```bash
docker build -t jobpilot-worker .
docker run -p 8000:8000 jobpilot-worker
```

For autofill in Docker, point `formUrl` at a reachable URL (e.g. the worker's own `/fixtures/demo-apply.html`).

## Layout

```
app/
  autofill/       BaseFiller, DemoFormFiller, Greenhouse/Lever stubs
  fixtures/       demo_apply.html, demo_jobs_board.html
  models/         Pydantic request/response models
  scrapers/       BaseScraper, GenericScraper (no live LinkedIn/Indeed in tests)
  services/       HTTP handler orchestration
  queue_consumer.py
  selenium_driver.py
  main.py
tests/
```
