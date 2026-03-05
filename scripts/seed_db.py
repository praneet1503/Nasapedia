import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("Please set DATABASE_URL environment variable")

engine = create_engine(DATABASE_URL)

sample = [
    {
        "id": 999001,
        "title": "Seed: Sample Project Alpha",
        "description": "Sample seeded project Alpha.",
        "status": "Active",
    },
    {
        "id": 999002,
        "title": "Seed: Sample Project Beta",
        "description": "Sample seeded project Beta.",
        "status": "Completed",
    },
]

with engine.begin() as conn:
    for p in sample:
        conn.execute(
            text(
                "INSERT INTO projects (id, title, description, status) VALUES (:id, :title, :description, :status) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status"
            ),
            **p,
        )

print("Seed complete")
