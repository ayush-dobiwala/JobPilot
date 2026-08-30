"""Shared pytest fixtures."""

import socket
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "app" / "fixtures"
DEMO_APPLY_FIXTURE = FIXTURES_DIR / "demo_apply.html"


@pytest.fixture
def demo_apply_file_url() -> str:
    """file:// URL for the demo ATS application fixture."""
    return DEMO_APPLY_FIXTURE.resolve().as_uri()


@pytest.fixture
def demo_apply_http_url() -> str:
    """Serve demo_apply.html over HTTP for reliable Selenium integration tests."""
    handler = partial(SimpleHTTPRequestHandler, directory=str(FIXTURES_DIR))

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        host, port = sock.getsockname()

    server = ThreadingHTTPServer((host, port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://{host}:{port}/demo_apply.html"
    server.shutdown()
    thread.join(timeout=2)


@pytest.fixture
def selenium_available() -> bool:
    """True when Chrome and chromedriver are likely usable."""
    from app.selenium_driver import can_create_driver

    return can_create_driver()
