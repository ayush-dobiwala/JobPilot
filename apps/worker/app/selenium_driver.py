"""Selenium WebDriver factory."""

import os
import shutil
from typing import TYPE_CHECKING

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

if TYPE_CHECKING:
    from selenium.webdriver.remote.webdriver import WebDriver


def is_chrome_available() -> bool:
    """Return True when a Chrome/Chromium binary is on PATH or in common locations."""
    env_bin = os.environ.get("CHROME_BIN")
    if env_bin and os.path.isfile(env_bin):
        return True
    candidates = (
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/chromium",
    )
    return any(shutil.which(path) or os.path.isfile(path) for path in candidates)


def create_driver(*, headless: bool = True) -> "WebDriver":
    """Create a headless Chrome WebDriver via webdriver-manager."""
    options = Options()
    chrome_bin = os.environ.get("CHROME_BIN")
    if chrome_bin:
        options.binary_location = chrome_bin
    elif os.path.isfile("/usr/bin/chromium"):
        options.binary_location = "/usr/bin/chromium"
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")

    chromedriver_path = (
        os.environ.get("CHROMEDRIVER_PATH")
        or shutil.which("chromedriver")
        or ("/usr/bin/chromedriver" if os.path.isfile("/usr/bin/chromedriver") else None)
    )
    if chromedriver_path:
        service = Service(chromedriver_path)
    else:
        service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)


def can_create_driver() -> bool:
    """Return True when Chrome and a local chromedriver binary are available.

    Does not attempt network downloads (webdriver-manager) so CI/offline skips cleanly.
    """
    if not is_chrome_available():
        return False
    if os.environ.get("CHROMEDRIVER_PATH"):
        return True
    return bool(shutil.which("chromedriver") or os.path.isfile("/usr/bin/chromedriver"))
