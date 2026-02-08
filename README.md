# NASA TechPort Explorer

A small web application to explore NASA TechPort projects. This repository includes a FastAPI backend, a Next.js frontend, and is configured to use a Postgres database (Neon recommended) for development and production.

## Apps/Tools/Websites used to make this project possible !
- postgres (for database)
- vercel (for web deployment)
- modal (for scalable backend hosting)
- 

## 🚀 Quickstart

Prerequisites:
- Node.js (recommended 18+)
- Python 3.10+
- `npx` / `npm`
- Neon PostgreSQL (recommended) — use the Neon Console to create a project and obtain `DATABASE_URL`

Backend (Modal)
1. Create and activate a Python environment. Example:
   ```zsh
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```zsh
   cd backend
   python3 -m pip install -r requirements.txt
   ```
3. Create Modal secrets for the backend:
    ```zsh
    modal secret create nasa-techport-secrets \
       DATABASE_URL="$DATABASE_URL"
    ```
4. Run the backend locally with Modal:
   ```zsh
   modal serve backend/modal_app.py
   ```
   Expected output includes a web URL for the endpoints and a log line showing the app name `nasa-techport-backend`.
5. Deploy to production:
   ```zsh
   modal deploy backend/modal_app.py
   ```

Frontend
1. Install dependencies and start dev server:
   ```zsh
   cd frontend
   npm install
   npm run dev
   ```
2. The dev server defaults to port 3000 (may fall back to 3001 if in use).


## Project structure
```
backend/        # FastAPI backend
backend/modal_app.py  # Modal entrypoints (HTTP endpoints)
frontend/       # Next.js frontend (app router)
migrations/     # SQL migrations for Neon/Postgres
scripts/        # Helper scripts (migration, seed, smoke tests)
LICENSE
README.md
```

## Neon (Postgres) setup
- Create a Neon project and copy the connection string (DATABASE_URL).
- Apply migrations:
  ```zsh
  psql "$DATABASE_URL" -f migrations/0001_create_projects.sql
  ```
- Seed (optional):
  ```zsh
  DATABASE_URL="$DATABASE_URL" python3 scripts/seed_db.py
  ```
- Smoke test (insert/read):
  ```zsh
  DATABASE_URL="$DATABASE_URL" python3 scripts/smoke_test_db.py
  ```

## Features
- Full-text search and filters
- Pagination (20 projects per page) with numbered pages and compact pagination control
- Sort by alphabetical, relevance, newest/oldest
- CORS configured for local development

## Modal endpoints (deployed URLs will differ, see Modal dashboard):
**these are modal keypoints of mine the developmental server if you don't have any modal deployment running, you can run this urls as api key to access the endpoints**
- `GET /health` — https://praneetnrana--health.modal.run
- `GET /api/projects` — https://praneetnrana--projects.modal.run (query params: `q`, `trl_min`, `trl_max`, `organization`, `technology_area`, `order`, `limit`, `offset`)
- `GET /api/projects/{project_id}` — https://praneetnrana--projects-id.modal.run


## ⚠️ Note about content and audits
Some parts of this project's documentation and content may have been generated or assisted by AI. **Please review all generated content for accuracy and legal compliance.**

**Security check required (IMMEDIATE ACTION):**
- Conduct a full security audit before publishing or deploying. See `SECURITY.md` for a checklist and recommended commands.


## Contributing
- Open issues for bugs or feature requests.
- For security issues, use the security issue template or add `[security]` to the issue title.
- Pull requests are welcome! Please ensure tests pass and follow the existing code style.
- For major changes, open an issue first to discuss the proposed changes.


## License
This project is licensed under the terms of the MIT LICENSE file in this repository.
