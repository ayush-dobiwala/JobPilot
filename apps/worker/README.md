# @jobpilot/worker

Python 3.11 FastAPI service. Selenium scrapers and ATS autofill (Greenhouse/Lever), plus the BullMQ consumer, are implemented in **build step 6**.

**Safety:** the worker fills forms and takes a screenshot, then stops. It never clicks final submit unless the user confirms.

Step 1 includes a `/health` endpoint, env-based settings, Docker/pytest/mypy/ruff layout, and a dummy HTML fixture directory for later integration tests.
