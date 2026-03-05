# Scripts Docs
This folder contains utility scripts used during development, local testing, and production migrations.

# Included scripts
- `seed_db.py` — Simple seeding helper to insert/update a couple of mock data for your project to start with. It is idempotent and safe to run multiple times.
- `migrate_to_neon.sh` — the script is for migrating your local database to production **neon** database. **( It only works intended for Neon )**.

General notes
- All Python scripts expect a working Python 3 environment with `sqlalchemy` installed. Install with `pip install sqlalchemy` or use your project's virtual environment.
- several scripts have `DATABASE_URL` environment variable dependencies. make sure to Export it to your shell before running the scripts.
- Backup and verification steps are critical. `migrate_to_neon.sh` will create a remote backup before performing restores — read prompts and logs carefully.

# Usage example for `migrate_to_neon.sh`:
```bash
DATABASE_URL="postgresql://user:PASS@host:5432/db?sslmode=require" \
LOCAL_CONN="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
./scripts/migrate_to_neon.sh
```

Safety & verification:
- the scripts have been created by ai but reviewed and tested by me, but always review the code before running on production.(**try not to break your laptop using the scripts**)
- The script prompts for explicit confirmation (`Type 'YES'`) before restoring into the remote database.(yeah it is attention hungry but it is for safety)

# Backend scripts :
--------------------------------------------------

- `backend/scripts/ingest_techport.py` — it fetches project data from NASA's TechPort API and ingests it into the local database.
      - it is an state of the art script with a resileince for api calls 
      - it uses a worker pool to speed up the ingestion process while respecting API rate limits.
- `backend/scripts/embed_projects.py` — it embeds all project from local or remote database for **semantic search** which basically reduces time to search for projects by 200ms.

# required keys
- `DATABASE_URL` — Required by most scripts to connect to Postgres.
- `LOCAL_CONN` — Required by `migrate_to_neon.sh` to reference the local DB connection string.
- `NASA_TECHPORT_API_KEY` — Required by `backend/scripts/ingest_techport.py` to fetch TechPort data.

