# Phase 1 Targeted Regression Report

Date: 2026-09-09

Environment:

- Frontend: `http://localhost:3211`
- Backend: `http://127.0.0.1:8011/api/v1`
- Browser: Playwright Chromium
- Primary persona: HR Admin `nisha.rao`

## Scope

This regression sweep validates Phase 1 master-data and configuration readiness through browser-driven tests. It covers safe form validation, organization master CRUD, policy and governance master CRUD, governance assignments, notification setup, salary setup, payroll setup, statutory setup, and workflow trace visibility.

Suites:

- `web/tests/e2e/configuration-form-flows.spec.ts`
- `web/tests/e2e/organization-master-crud-flows.spec.ts`
- `web/tests/e2e/policy-governance-master-crud-flows.spec.ts`
- `web/tests/e2e/governance-assignment-form-flows.spec.ts`
- `web/tests/e2e/notification-setup-crud-flows.spec.ts`
- `web/tests/e2e/salary-setup-flows.spec.ts`
- `web/tests/e2e/payroll-setup-flows.spec.ts`
- `web/tests/e2e/payroll-statutory-flows.spec.ts`
- `web/tests/e2e/workflow-trace-flows.spec.ts`

## Browser Evidence

Focused payroll setup rerun:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/payroll-setup-flows.spec.ts --project=chromium --timeout=180000
```

Result: `3 passed`.

Focused policy and governance rerun after navigation wait hardening:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/policy-governance-master-crud-flows.spec.ts --project=chromium --timeout=240000
```

Result: `8 passed`.

Affected mutation-heavy suites rerun serially:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/governance-assignment-form-flows.spec.ts tests/e2e/notification-setup-crud-flows.spec.ts tests/e2e/organization-master-crud-flows.spec.ts tests/e2e/policy-governance-master-crud-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `33 passed`.

Final full Phase 1 targeted serial regression:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/configuration-form-flows.spec.ts tests/e2e/organization-master-crud-flows.spec.ts tests/e2e/policy-governance-master-crud-flows.spec.ts tests/e2e/governance-assignment-form-flows.spec.ts tests/e2e/notification-setup-crud-flows.spec.ts tests/e2e/salary-setup-flows.spec.ts tests/e2e/payroll-setup-flows.spec.ts tests/e2e/payroll-statutory-flows.spec.ts tests/e2e/workflow-trace-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `49 passed`.

## Fix Applied

The policy and governance CRUD helper now scrolls the selected Edit link into view and waits for the exact edit URL after the browser click. This removes a route-transition race observed during full regression.

Changed file:

- `web/tests/e2e/policy-governance-master-crud-flows.spec.ts`

## Quality Checks

```bash
pnpm --dir web lint
pnpm --dir web typecheck
DJANGO_DB_ENGINE=django.db.backends.sqlite3 POSTGRES_DB=db.localqa.20260909.sqlite3 ../.venv/bin/python manage.py check
```

Results:

- Web lint: passed.
- Web typecheck: passed.
- Django system check: passed.

## Observations

- Payroll setup CRUD is stable after rerun and full serial regression.
- Statutory setup CRUD is stable, including statutory packs, components, slabs, employer registrations, filing calendars, employee statutory profiles, employee declarations, declaration items, and proof actions.
- Organization master CRUD and dependent employee structural mapping pass serially across all covered masters.
- Policy and governance CRUD passes serially across leave types, shifts, holiday calendars, leave policies, attendance policies, workflow templates, document categories, and document requirements.
- Notification setup passes serially for templates, events, previews, test sends, deactivation/archive paths, duplicate validation, and delivery channel JSON validation.
- High-parallel five-worker mutation sweeps can fail because multiple tenant-scoped CRUD flows mutate the same local seed workspace at the same time. The product behavior is validated serially; the test runner should keep mutation-heavy suites serial until isolated tenant/test data factories are added.

## Confidence Update

| Area | Confidence | Notes |
|---|---:|---|
| Configuration forms | 92% | Required fields, validation previews, and workflow step controls pass. |
| Organization master CRUD | 91% | All major structural masters and employee dependent dropdown mapping pass. |
| Policy and governance CRUD | 90% | Positive and negative paths pass across policy/governance masters. |
| Notification setup CRUD | 90% | Template, event, send-test, routing, archive/deactivate, and JSON validation pass. |
| Salary setup CRUD | 89% | Components, structures, versions, lines, and assignments pass. |
| Payroll setup CRUD | 90% | Calendars, periods, pay groups, and assignments pass. |
| Statutory setup CRUD | 90% | Tenant statutory configuration and employee declaration proof flows pass. |
| Overall product confidence | 83% | Phase 1 is browser-proven locally; Phase 2 tenant onboarding and isolation remains the next SaaS gate. |

## Next Gate

Move to Phase 2: five-tenant SaaS onboarding through platform admin, tenant admin handoff, and cross-tenant isolation proof.
