# NASA TechPort Explorer

A small web application to explore NASA TechPort projects. This repository includes a FastAPI backend, a Next.js frontend, and a local Supabase configuration for development.


## 🚀 Quickstart

Prerequisites:
- Node.js (recommended 18+)
- Python 3.10+
- `npx` / `npm`
- Supabase CLI (optional for local Postgres) - `npm i -g supabase`

Backend
1. Create and activate a Python environment. Example:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   cd backend
   python3 -m pip install -r requirements.txt
   ```
3. Configure a local database:
   - For quick dev, use local Supabase: `npx supabase start` and then `npx supabase db push`.
   - Or set `DATABASE_URL` to a Postgres instance:
     ```bash
     export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
     ```
4. Start the backend:
   ```bash
   cd backend
   python3 -m uvicorn app.main:app --reload --port 8000
   ```

Frontend
1. Install dependencies and start dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. The dev server defaults to port 3000 (may fall back to 3001 if in use).


## Project structure
```
backend/        # FastAPI backend
frontend/       # Next.js frontend (app router)
supabase/       # Local supabase config, migrations, seeds
LICENSE
README.md
```


## Features
- Full-text search and filters
- Pagination (20 projects per page) with numbered pages and compact pagination control
- Sort by alphabetical, relevance, newest/oldest
- CORS configured for local development


## ⚠️ Note about content and audits
Some parts of this project's documentation and content may have been generated or assisted by AI. **Please review all generated content for accuracy and legal compliance.**

**Security check required (IMMEDIATE ACTION):**
- Conduct a full security audit before publishing or deploying. See `SECURITY.md` for a checklist and recommended commands.


## Contributing
- Open issues for bugs or feature requests.
- For security issues, use the security issue template or add `[security]` to the issue title.


## License
This project is licensed under the terms of the LICENSE file in this repository.
