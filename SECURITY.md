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
  - Review migrations in `supabase/migrations/*` before applying.
  - Limit DB credentials scope and use separate accounts for dev and production.
- [ ] **Open-source & legal**
  - Review any AI-generated text for license and attribution issues.

## Helpful tools & commands
- `npm audit` / `npm audit fix`
- `pip-audit`
- `bandit -r backend/app`
- `safety check` (from PyUp)
- `npx snyk test` (requires Snyk account for some features)

## Reporting security issues
If you find a high-severity security problem, create an issue titled `[security] <short description>` and do not include secrets or detailed exploit steps in the public issue. Use the `.github/ISSUE_TEMPLATE/security_issue.md` template where appropriate.
