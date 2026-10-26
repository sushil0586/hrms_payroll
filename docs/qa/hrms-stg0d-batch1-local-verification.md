# STG-0D Batch-1 Local Verification

Date: 2026-10-26
Environment: local application with disposable PostgreSQL 16; no staging use

## Results

| Check | Result |
|---|---|
| PostgreSQL-backed scenario tests | **6 passed** in 25.84 seconds |
| Production-built Playwright, Chromium, one worker | **6 passed** in 24.6 seconds |
| TypeScript (`pnpm --dir web typecheck`) | Passed |
| Focused ESLint | Passed |
| Django system check | Passed, zero issues |
| Migration drift | None |
| Production frontend build | Passed; existing CSS `flex-end` compatibility warning retained |
| Disposable PostgreSQL containers after teardown | 0 |
| Backend listener after teardown | 0 |

## Commands

```bash
DJANGO_SETTINGS_MODULE=config.settings.base \
DJANGO_DB_ENGINE=django.db.backends.postgresql \
POSTGRES_DB=hrms_stg0d POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 \
./.venv/bin/pytest -q backend/tests/test_stg0d_batch1_onboarding_integrity.py

HRMS_API_BASE_URL=http://127.0.0.1:18080/api/v1 \
HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_PORT=31880 \
STG0D_RUN_REF=<unique-run> \
pnpm --dir web exec playwright test \
  tests/e2e/stg0d-batch1-onboarding.spec.ts \
  --workers=1 --config=playwright.config.ts

pnpm --dir web typecheck
pnpm --dir web exec eslint tests/e2e/stg0d-batch1-onboarding.spec.ts
DJANGO_SETTINGS_MODULE=config.settings.local ./.venv/bin/python backend/manage.py check
DJANGO_SETTINGS_MODULE=config.settings.local ./.venv/bin/python backend/manage.py makemigrations --check --dry-run
HRMS_ENABLE_DEMO_DATA=false pnpm --dir web build
```

## Historical Attempts

Historical failed attempts were retained diagnostically and were not counted as passes:

1. A nonexistent test settings module failed before collection.
2. Local settings selected SQLite, which correctly failed on PostgreSQL-specific trigger migrations. The valid run used `config.settings.base` and PostgreSQL 16.
3. Browser run 1 filled the login form before hydration and emitted no request.
4. Browser run 2 exposed the same pre-hydration issue on the Create button.
5. Browser run 3 revealed that the API-session helper authenticates but does not navigate.
6. Browser run 4 used an unavailable Next.js `/api/auth/session` proxy.

The final suite uses the existing same-origin login API solely to establish browser cookies, waits on real navigation readiness, and verifies tenant scope through the supported Tenant Admin console endpoint. All business mutations remain UI-initiated.

## Persisted-State Evidence

The final disposable database contained one unique tenant per attempted run, with no duplicate code from rejected submissions. The successful final run produced an active Enterprise tenant, one provisioned administrator and one active membership. Earlier failed-browser tenants remained only inside the disposable database so historical attempts were not rewritten; the entire database container was then removed.

No live email, payroll finalization or external provider action occurred.
