"""Redis list consumer for automation jobs.

Node BullMQ (or any producer) can push JSON payloads to ``jobpilot:automation``.
This module BLPOPs those payloads and POSTs them to the local FastAPI handlers.

Alternatively, Node can call the HTTP endpoints directly and skip this consumer.
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

import httpx
import redis

from app.config import load_settings

REDIS_QUEUE_KEY = "jobpilot:automation"
logger = logging.getLogger(__name__)


def _endpoint_for_action(action: str) -> str:
    mapping = {
        "scrape": "/scrape",
        "autofill": "/autofill",
        "confirm-submit": "/confirm-submit",
    }
    if action not in mapping:
        raise ValueError(f"Unknown automation action: {action}")
    return mapping[action]


def handle_payload(base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST a queue payload to the matching local HTTP handler."""
    action = payload.get("action")
    if not isinstance(action, str):
        raise ValueError("Queue payload must include string 'action'")

    body = payload.get("payload", {})
    if not isinstance(body, dict):
        raise ValueError("Queue payload 'payload' must be an object")

    url = f"{base_url.rstrip('/')}{_endpoint_for_action(action)}"
    response = httpx.post(url, json=body, timeout=120.0)
    response.raise_for_status()
    result: dict[str, Any] = response.json()
    return result


def run_consumer_loop(*, block_timeout: int = 5) -> None:
    """BLPOP from Redis and dispatch automation jobs to local HTTP endpoints."""
    settings = load_settings()
    client = redis.from_url(settings.redis_url, decode_responses=True)
    base_url = settings.worker_internal_url

    logger.info("Queue consumer listening on %s -> %s", REDIS_QUEUE_KEY, base_url)

    while True:
        item = client.blpop(REDIS_QUEUE_KEY, timeout=block_timeout)
        if item is None:
            continue

        _queue_name, raw = item
        try:
            payload = json.loads(raw)
            if not isinstance(payload, dict):
                raise ValueError("Queue message must be a JSON object")
            result = handle_payload(base_url, payload)
            logger.info("Processed %s: %s", payload.get("action"), result)
        except Exception:
            logger.exception("Failed to process queue message: %s", raw)


def main() -> None:
    """CLI entrypoint: ``python -m app.queue_consumer``."""
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    run_consumer_loop()


if __name__ == "__main__":
    main()
