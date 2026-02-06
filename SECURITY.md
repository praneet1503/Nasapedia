# Security Checklist & Guidance

This document highlights recommended security checks to perform before deploying or releasing this project.

## Priority checklist
- [ ] **Dependency audit**
  - Run: `cd frontend && npm audit` and `npm audit fix` if needed
  - Run: `cd backend && pip-audit` (or `python -m pip install pip-audit`)
- [ ] **Secret scanning**
  - Ensure no secrets or credentials are committed (check `.env`, `.env.local`, `backend/.env`).
- [ ] **Static analysis**
  - Python: `pip install bandit && bandit -r backend/app`
  - JavaScript/TypeScript: `npm run lint` (configure ESLint) and `npm audit`
- [ ] **CORS & headers**
  - Verify `backend/app/main.py` CORS allowlist only includes dev hostnames.
  - Consider adding CSP, HSTS, and other relevant production headers.
- [ ] **Database & migrations**
  - Review SQL migrations in `migrations/*` before applying to Neon/Postgres.
  - Limit DB credentials scope and use separate accounts for dev and production.
  - Verify extensions used are supported by Neon.
- [ ] **Open-source & legal**
  - Review any AI-generated text for license and attribution issues.

## Helpful tools & commands
- `npm audit` / `npm audit fix`
- `pip-audit`
- `bandit -r backend/app`
- `safety check` (from PyUp)
- `npx snyk test` (requires Snyk account for some features)

## Recent automated dependency updates
A dependency fix tool detected and automatically updated vulnerable packages. Please review the changes and test the application.

- Updated packages (automated fix):
  - `next` -> patched to v15.5.12
  - `react-server-dom-webpack` -> updated to secure version
  - `react-server-dom-parcel` -> updated to secure version

Recommended follow-ups:
- Run the test/build pipeline locally (`npm run build`, `npm test` if available) to confirm compatibility.
- Review `frontend/package-lock.json` diff and ensure no unexpected package changes.
- Pin versions in `package.json` if necessary to avoid unexpected future upgrades.

## Reporting security issues
If you find a high-severity security problem, create an issue titled `[security] <short description>` and do not include secrets or detailed exploit steps in the public issue. Use the `.github/ISSUE_TEMPLATE/security_issue.md` template where appropriate.
