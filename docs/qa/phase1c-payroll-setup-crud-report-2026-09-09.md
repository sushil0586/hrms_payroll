# Phase 1C-E Payroll Setup CRUD Report

Date: 2026-09-09
Environment: local dev
Frontend: `http://localhost:3211`
Backend: `http://127.0.0.1:8011/api/v1`

## Scope

This pass moved payroll setup from read-only workspace coverage into browser-driven configuration CRUD coverage.

Covered through Playwright:

- Payroll calendar create, read, update, and duplicate-code rejection.
- Payroll calendar code, name, frequency, timezone, currency, start-day, active flag, and config profile controls.
- Payroll period create, read, update, calendar dropdown, date fields, status dropdown, and config profile controls.
- Pay group create, read, update, calendar dropdown, status dropdown, default currency, legal entity, branch, location, department, employment type, and config profile controls.
- Pay group assignment create, read, update, employee dropdown, pay group dropdown, effective dates, status dropdown, and config profile controls.
- Existing read workspace coverage for summary tiles, calendar rail, pay group matrix, period windows, assignment table, selected pay group detail, and navigation actions.
- Mobile viewport usability for all payroll setup CRUD forms.
- Horizontal overflow checks on the touched payroll setup page.

## Product Changes

- Added browser-facing proxy routes for payroll setup mutation endpoints:
  - `web/src/app/api/hr-admin/payroll-calendars`
  - `web/src/app/api/hr-admin/payroll-periods`
  - `web/src/app/api/hr-admin/pay-groups`
  - `web/src/app/api/hr-admin/pay-group-assignments`
- Added editable payroll setup controls to the HR admin payroll setup workspace:
  - `web/src/app/hr-admin/payroll-setup/payroll-setup-crud-console.tsx`
- Mounted the CRUD console on:
  - `web/src/app/hr-admin/payroll-setup/page.tsx`
- Expanded the dedicated payroll setup Playwright suite:
  - `web/tests/e2e/payroll-setup-flows.spec.ts`

## Evidence

Focused Playwright:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test tests/e2e/payroll-setup-flows.spec.ts --project=chromium --timeout=90000
```

Result: `3 passed`

Quality checks:

```bash
pnpm --dir web lint
pnpm --dir web typecheck
DJANGO_DB_ENGINE=django.db.backends.sqlite3 POSTGRES_DB=db.localqa.20260909.sqlite3 ../.venv/bin/python manage.py check
```

Result:

- Web lint: passed
- Web typecheck: passed
- Django check: passed

## Confidence Movement

- Payroll setup browser CRUD confidence: from `60%` to `88%`.
- Current configuration confidence: from `87%` to `88%`.
- Current overall product confidence: from `76%` to `78%`.

Confidence is not higher yet because statutory setup CRUD still needs the same granular browser depth, and Phase 2 five-tenant onboarding plus role isolation still need a fresh full run after Phase 1 closes.

## Remaining Phase 1 Work

- Statutory setup CRUD expansion.
- Broader regression after statutory setup is complete.
