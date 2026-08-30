"""Greenhouse ATS autofill — delegates to demo filler for fixture URLs."""

from app.autofill.base import BaseFiller
from app.autofill.demo import DemoFormFiller, _is_demo_form_url
from app.autofill.generic import GenericFormFiller


def get_greenhouse_filler(form_url: str) -> BaseFiller:
    """Return the appropriate filler for a Greenhouse-style form URL."""
    if _is_demo_form_url(form_url):
        return DemoFormFiller()
    return GenericFormFiller()
