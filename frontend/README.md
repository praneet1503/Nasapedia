# NASA TechPort Explorer (Frontend)

V1 frontend for searching NASA TechPort projects.

## Requirements

- Node.js 18+ (recommended: 20)
- Backend API running at deployed Modal endpoints

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Configure environment variables:

- Copy `.env.local.example` to `.env.local`
- Set deployed Modal endpoint URLs:

```bash
NEXT_PUBLIC_API_PROJECTS_URL=https://praneetnrana--projects.modal.run
NEXT_PUBLIC_API_PROJECTS_ID_URL=https://praneetnrana--projects-id.modal.run
NEXT_PUBLIC_API_FEED_URL=https://praneetnrana--feed.modal.run
NEXT_PUBLIC_API_PROJECT_CLICK_URL=https://praneetnrana--projects-click.modal.run
NEXT_PUBLIC_API_ISS_URL=https://praneetnrana--iss.modal.run
```

3. Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How it talks to the backend

- The frontend uses native `fetch()` from the browser.
- API calls use explicit endpoint variables:
  - Projects search: `NEXT_PUBLIC_API_PROJECTS_URL`
  - Project details: `NEXT_PUBLIC_API_PROJECTS_ID_URL`
  - Feed: `NEXT_PUBLIC_API_FEED_URL`
  - Project click tracking: `NEXT_PUBLIC_API_PROJECT_CLICK_URL`
  - ISS tracker: `NEXT_PUBLIC_API_ISS_URL` (fallback supported: `NEXT_PUBLIC_API_URL`)

API wrappers live in [lib/api.ts](lib/api.ts).

## Notes

- No auth, no analytics, no client-side state libraries.
- Designed to be Vercel-friendly (Next.js App Router).
