# Phase 1C-F Statutory Setup CRUD Report

Date: 2026-09-09
Environment: local dev
Frontend: `http://localhost:3211`
Backend: `http://127.0.0.1:8011/api/v1`

## Scope

This pass moved payroll statutory from read/review smoke coverage into browser-driven statutory configuration, employee declaration, and proof action coverage.

Covered through Playwright:

- Statutory pack create, read, update, duplicate-code rejection, country, jurisdiction, status, effective dates, currency, statutory profile, validation profile, and config profile controls.
- Statutory component create, read, update, pack dropdown, salary component dropdown, statutory type, contribution owner, calculation method, wage base, treatment, registration, applicability, rounding, formula, status, and config profile controls.
- Statutory slab create, read, update, component dropdown, slab order, dates, amount range, employee/employer rates, fixed amounts, wage ceiling, state, applicability, status, and config profile controls.
- Employer registration create, read, update, pack/component/org scope dropdowns, registration references, registration number, employer identifier, jurisdiction, filing authority, provider, status, dates, source, and config profile controls.
- Filing calendar create, read, update, pack/component/registration dropdowns, filing type, frequency, period dates, due/grace dates, filing window, status, filing authority, provider, output profile, source, and config profile controls.
- Employee statutory profile create, read, update, employee/pack dropdowns, PAN, UAN, PF/ESI flags, PF/ESI identifiers, PT/LWF state, tax regime, declaration status, previous employment fields, source, and config profile controls.
- Employee statutory declaration create, read, update, employee/profile/pack dropdowns, financial year, declaration profile, proof window, status, tax regime, totals, rejection reason, source, and config profile controls.
- Declaration item create, read, update, declaration dropdown, item kind, section/component codes, declared/verified amounts, proof status, proof document/artifact references, source, config profile, and item rejection reason controls.
- Declaration lifecycle actions through the browser: submit, verify, and lock.
- Proof item verification action through the browser.
- Existing read workspace coverage for metrics, proof review queue, declaration detail, component catalog, registration coverage, filing obligations, and source hashes.
- Mobile viewport usability for all statutory CRUD forms.
- Horizontal overflow checks on the touched statutory page.

## Product Changes

- Added browser-facing proxy routes for statutory mutation/action endpoints:
  - `payroll-statutory-packs`
  - `payroll-statutory-components`
  - `payroll-statutory-slabs`
  - `payroll-statutory-employer-registrations`
  - `payroll-statutory-filing-calendars`
  - `employee-statutory-profiles`
  - `employee-statutory-declarations`
  - `employee-statutory-declaration-items`
- Added editable statutory setup controls:
  - `web/src/app/hr-admin/payroll-statutory/payroll-statutory-crud-console.tsx`
- Mounted the CRUD console on:
  - `web/src/app/hr-admin/payroll-statutory/page.tsx`
- Expanded the dedicated statutory Playwright suite:
  - `web/tests/e2e/payroll-statutory-flows.spec.ts`

## Evidence

Focused Playwright:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test tests/e2e/payroll-statutory-flows.spec.ts --project=chromium --timeout=180000
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

- Statutory setup browser CRUD confidence: from `55%` to `88%`.
- Current configuration confidence: from `88%` to `90%`.
- Current overall product confidence: from `78%` to `80%`.

Confidence is not higher yet because this was a focused local phase. A broad role regression and five-tenant onboarding run should happen before treating the product as launch-ready.

## Phase 1 Status

Phase 1 master data and configuration CRUD depth is now functionally complete at the planned module level. Next work should move into Phase 2 SaaS tenant onboarding and isolation, with a targeted regression sweep for Phase 1 routes.
