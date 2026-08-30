"""Resolve the correct autofill implementation for a form URL."""

from urllib.parse import urlparse

from app.autofill.base import BaseFiller
from app.autofill.demo import DemoFormFiller
from app.autofill.generic import GenericFormFiller
from app.autofill.greenhouse import get_greenhouse_filler
from app.autofill.lever import get_lever_filler


def resolve_filler(form_url: str) -> BaseFiller:
    """Pick a filler based on URL host/path heuristics."""
    parsed = urlparse(form_url)
    host = parsed.netloc.lower()
    path = parsed.path.lower()

    if DemoFormFiller().can_handle(form_url):
        return DemoFormFiller()

    if "greenhouse.io" in host or "boards.greenhouse" in path:
        return get_greenhouse_filler(form_url)

    if "lever.co" in host or "jobs.lever" in path:
        return get_lever_filler(form_url)

    return GenericFormFiller()
