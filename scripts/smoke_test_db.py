#!/usr/bin/env python3
"""Smoke test: insert a temp row and read it back. Exits non-zero on failure.
Usage: DATABASE_URL="postgresql://user:pass@host:5432/db" python3 scripts/smoke_test_db.py
"""
import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("Please set DATABASE_URL environment variable")

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text("CREATE TEMP TABLE IF NOT EXISTS smoke_test (id SERIAL PRIMARY KEY, name TEXT);"))
        res = conn.execute(text("INSERT INTO smoke_test (name) VALUES (:n) RETURNING id;"), {"n": "smoke-1"}).first()
        rid = res[0]
        row = conn.execute(text("SELECT name FROM smoke_test WHERE id = :id"), {"id": rid}).first()
        assert row[0] == "smoke-1"
    except Exception as e:
        print("Smoke test failed:", e)
        sys.exit(1)

print("Smoke test passed")
