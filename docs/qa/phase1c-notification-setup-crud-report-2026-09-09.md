# Phase 1C-D Notification Setup CRUD Report

Date: 2026-09-09
Environment: local dev
Frontend: `http://localhost:3211`
Backend: `http://127.0.0.1:8011/api/v1`

## Scope

This pass moved notification setup from reliability smoke coverage into browser-driven configuration CRUD coverage.

Covered through Playwright:

- Notification template create, read, update, archive, and duplicate-code rejection.
- Notification template channel-dependent fields for in-app and email authoring.
- Template metadata guided fields and raw metadata JSON validation.
- Template preview and controlled test-send creation through the browser.
- Notification event create, read, update, deactivate/reactivate, and duplicate-code rejection.
- Event module, trigger, audience, channel, template, priority, delay, role, membership, and recipient snapshot controls.
- Event preview and controlled test-send creation through the browser.
- Notification delivery channel configuration update for backend, delivery state, sender identity, provider config JSON, delivery policy JSON, max attempts, and retry backoff.
- Delivery configuration invalid JSON handling.
- Horizontal overflow checks on touched notification setup pages.

## Product Changes

- Added field-level duplicate validation for notification templates using tenant, code, and channel.
- Added field-level duplicate validation for notification events using tenant and code.
- Improved notification authoring error rendering so field-specific API validation is visible in the browser.
- Added a dedicated notification setup Playwright suite:
  - `web/tests/e2e/notification-setup-crud-flows.spec.ts`

## Evidence

Focused Playwright:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test tests/e2e/notification-setup-crud-flows.spec.ts --workers=1 --timeout=300000 --reporter=line
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

- Notification setup browser CRUD confidence: from `65%` to `88%`.
- Current configuration confidence: from `85%` to `87%`.
- Current overall product confidence: from `74%` to `76%`.

Confidence is not higher yet because payroll setup CRUD, statutory setup CRUD, and broader cross-role regression still need the same granular browser depth.

## Remaining Phase 1 Work

- Payroll setup CRUD expansion.
- Statutory setup CRUD expansion.
- Broader regression after each expanded CRUD slice.
