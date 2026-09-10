# Phase 1C-B Salary Setup CRUD Report

Date: 2026-09-09
Environment: local dev
Frontend: `http://localhost:3211`
Backend: `http://127.0.0.1:8011/api/v1`

## Scope

This pass converted salary setup from read-only browser coverage into functional browser CRUD coverage.

Covered through Playwright:

- Salary setup overview loads live data without demo fallback.
- Page actions are visible for Payroll Setup, Readiness, Inputs, Rules, and Calculations.
- Metrics render for components, structures, active versions, and assigned employees.
- Catalog, version matrix, structure composition, employee salary coverage, and structure detail sections render.
- Empty salary structures/versions/lines/assignments render safely.
- Salary component create and update work through the browser.
- Salary structure create and update work through the browser.
- Salary structure version create and update work through the browser.
- Salary structure component line create and update work through the browser.
- Employee salary assignment create and update work through the browser.
- Dropdowns use live tenant/API options for component type, value type, status, pay group, structure, structure version, component, and employee.
- Textboxes are covered for code, name, references, currency, dates, annual CTC, amount, percentage, assignment reason, and config profile refs.
- Toggles are covered for taxable, proratable, and active line.
- Mobile viewport keeps the salary setup controls visible and without horizontal overflow.

## Product Changes

- Added Next proxy routes for the existing backend salary setup CRUD APIs:
  - `/api/hr-admin/salary-components`
  - `/api/hr-admin/salary-structures`
  - `/api/hr-admin/salary-structure-versions`
  - `/api/hr-admin/salary-structure-components`
  - `/api/hr-admin/employee-salary-assignments`
- Added a compact HR admin browser CRUD console on `/hr-admin/salary-setup`.
- Kept all configuration values editable as tenant data or refs; no salary behavior is hardcoded into the UI.
- Added responsive layout rules for the salary setup CRUD console.

## Evidence

Focused Playwright:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test tests/e2e/salary-setup-flows.spec.ts --workers=1 --timeout=300000 --reporter=line
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

- Salary setup browser CRUD confidence: from `75%` to `88%`.
- Current configuration confidence: from `81%` to `83%`.
- Current overall product confidence: from `70%` to `72%`.

Confidence is not higher yet because payroll setup CRUD, statutory setup CRUD, notification setup CRUD, and remaining assignment rollout CRUD still need the same granular browser depth.

## Remaining Phase 1 Work

- Assignment and rollout CRUD expansion.
- Notification setup CRUD expansion.
- Payroll setup CRUD expansion.
- Statutory setup CRUD expansion.
- Broader regression after each expanded CRUD slice.
