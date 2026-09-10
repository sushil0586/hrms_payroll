# Phase 1C-C Assignment And Rollout CRUD Report

Date: 2026-09-09
Environment: local dev
Frontend: `http://localhost:3211`
Backend: `http://127.0.0.1:8011/api/v1`

## Scope

This pass expanded assignment and rollout coverage from form visibility into full browser-driven CRUD and rollout proof.

Covered through Playwright:

- Leave policy assignment create, read, update, deactivate, and edit reload.
- Attendance policy assignment create, read, update, deactivate, and edit reload.
- Workflow template assignment create, read, update, deactivate, and edit reload.
- Employee shift assignment create and update across fixed, weekly rotation, and temporary override modes.
- Weekly rotation controls, anchor date, rotation step add/update, span-day inputs, and shift dropdowns.
- Shift roster template create, read, update, preview rollout, and apply rollout.
- Roster rollout target employees multi-select, template dropdown, scope dropdowns, effective dates, and primary assignment toggle.
- Conflict-governance panels for leave, attendance, and shift assignment forms.
- Existing edit surfaces for leave policy, attendance policy, document requirements, and assignment setup continue to load live data without demo fallback.
- Horizontal overflow checks remain in place for all touched pages.

## Product Changes

- Fixed backend shift roster rollout by importing `Employee` in `apps.attendance.services`; rollout preview/apply no longer raises `NameError`.
- Improved roster rollout UI error formatting so structured API validation messages are visible instead of a generic fallback.
- Tightened Playwright API-response capture to match exact proxy paths, preventing conflict-check responses from being mistaken for create/update responses.
- Made edit-record setup deterministic by waiting for the browser edit link and `/edit` URL transition.

## Evidence

Focused Playwright:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test tests/e2e/governance-assignment-form-flows.spec.ts --workers=1 --timeout=300000 --reporter=line
```

Result: `12 passed`

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

- Assignment and rollout browser CRUD confidence: from `65%` to `87%`.
- Current configuration confidence: from `83%` to `85%`.
- Current overall product confidence: from `72%` to `74%`.

Confidence is not higher yet because notification setup CRUD, payroll setup CRUD, statutory setup CRUD, and broader cross-role regression still need the same granular browser depth.

## Remaining Phase 1 Work

- Notification setup CRUD expansion.
- Payroll setup CRUD expansion.
- Statutory setup CRUD expansion.
- Broader regression after each expanded CRUD slice.
