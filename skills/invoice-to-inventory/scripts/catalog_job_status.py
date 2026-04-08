#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def load_status(path: Path):
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    return {}


def write_status(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')


def update_status(path: Path, **fields):
    status = load_status(path)
    status.update(fields)
    status['updatedAt'] = now_iso()
    write_status(path, status)
    return status


def append_event(path: Path, kind: str, message: str, extra: dict | None = None):
    status = load_status(path)
    events = status.get('events', [])
    event = {
        'time': now_iso(),
        'kind': kind,
        'message': message,
    }
    if extra:
        event['extra'] = extra
    events.append(event)
    status['events'] = events[-50:]
    status['updatedAt'] = now_iso()
    write_status(path, status)
    return status
