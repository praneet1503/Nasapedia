# NASA TechPort Explorer (Frontend)

V1 frontend for searching NASA TechPort projects.

## Requirements

- Node.js 18+ (recommended: 20)
- Backend API running locally at `http://localhost:8000`

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Configure environment variables:

- Copy `.env.local.example` to `.env.local`
- Set the backend base URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

3. Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How it talks to the backend

- The frontend uses native `fetch()` from the browser.
- All API calls go to `${NEXT_PUBLIC_API_BASE_URL}`:
  - `GET /api/projects` for search + filters + pagination (offset/limit)
  - `GET /api/projects/{id}` for the project detail page

API wrappers live in [lib/api.ts](lib/api.ts).

## Notes

- No auth, no analytics, no client-side state libraries.
- Designed to be Vercel-friendly (Next.js App Router).
