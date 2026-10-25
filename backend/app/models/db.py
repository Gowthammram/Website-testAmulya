"""Tiny SQLite storage using Python's built-in sqlite3 (no extra packages).

This prototype has ONE user per database file (no accounts yet).
Data is stored as plain text on your laptop. For production you would add
accounts and encryption (see docs/PRIVACY.md).
"""
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(path: str) -> None:
    with closing(_connect(path)) as conn, conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS contact (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                relationship TEXT,
                consented_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS safety_plan (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                kind TEXT NOT NULL,
                status TEXT NOT NULL,
                detail TEXT NOT NULL
            );
            """
        )


# ---- trusted contact -------------------------------------------------------
def get_contact(path: str) -> dict | None:
    with closing(_connect(path)) as conn:
        row = conn.execute("SELECT * FROM contact WHERE id = 1").fetchone()
    return dict(row) if row else None


def save_contact(path: str, name: str, phone: str, relationship: str | None) -> dict:
    with closing(_connect(path)) as conn, conn:
        conn.execute(
            """INSERT INTO contact (id, name, phone, relationship, consented_at)
               VALUES (1, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone,
               relationship=excluded.relationship, consented_at=excluded.consented_at""",
            (name, phone, relationship, _now()),
        )
    return get_contact(path)  # type: ignore[return-value]


def delete_contact(path: str) -> None:
    with closing(_connect(path)) as conn, conn:
        conn.execute("DELETE FROM contact WHERE id = 1")


# ---- safety plan -----------------------------------------------------------
EMPTY_PLAN = {"activities": [], "people": [], "professional_steps": []}


def get_plan(path: str) -> dict:
    with closing(_connect(path)) as conn:
        row = conn.execute("SELECT data FROM safety_plan WHERE id = 1").fetchone()
    return json.loads(row["data"]) if row else dict(EMPTY_PLAN)


def save_plan(path: str, plan: dict) -> dict:
    with closing(_connect(path)) as conn, conn:
        conn.execute(
            """INSERT INTO safety_plan (id, data, updated_at) VALUES (1, ?, ?)
               ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at""",
            (json.dumps(plan), _now()),
        )
    return plan


# ---- event log (demo/test events) ------------------------------------------
def add_event(path: str, kind: str, status: str, detail: dict) -> dict:
    created = _now()
    with closing(_connect(path)) as conn, conn:
        cur = conn.execute(
            "INSERT INTO events (created_at, kind, status, detail) VALUES (?, ?, ?, ?)",
            (created, kind, status, json.dumps(detail)),
        )
    return {"id": cur.lastrowid, "created_at": created, "kind": kind, "status": status, "detail": detail}


def list_events(path: str, limit: int = 50) -> list[dict]:
    with closing(_connect(path)) as conn:
        rows = conn.execute(
            "SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [{**dict(r), "detail": json.loads(r["detail"])} for r in rows]


def delete_all_data(path: str) -> None:
    """Used by 'Delete all my data' in Settings."""
    with closing(_connect(path)) as conn, conn:
        conn.executescript("DELETE FROM contact; DELETE FROM safety_plan; DELETE FROM events;")
