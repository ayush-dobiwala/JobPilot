from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_scrape_returns_demo_jobs_for_query() -> None:
    response = client.post("/scrape", json={"query": "python", "url": None})
    assert response.status_code == 200
    body = response.json()
    assert len(body["jobs"]) == 3
    assert all("python" in job["title"].lower() for job in body["jobs"])
    assert body["jobs"][0]["company"]
    assert "demo-apply.html" in body["jobs"][0]["url"]
    assert body["logs"]


def test_scrape_fixture_board_url() -> None:
    response = client.post(
        "/scrape",
        json={"query": None, "url": "http://localhost:8000/fixtures/demo-jobs-board.html"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["jobs"]) == 3
    assert body["jobs"][0]["title"] == "Senior Backend Engineer"


def test_demo_apply_fixture_route() -> None:
    response = client.get("/fixtures/demo-apply.html")
    assert response.status_code == 200
    assert "Submit Application" in response.text
    assert 'id="name"' in response.text
