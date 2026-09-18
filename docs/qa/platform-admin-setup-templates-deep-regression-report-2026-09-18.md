# Platform Admin Setup Templates Deep Regression Report

Date: 2026-09-18  
Module: Platform Admin > Setup Templates  
Execution mode: Browser-based Playwright Chromium with live local API  
Spec: `web/tests/e2e/platform-admin-setup-templates-deep-regression.spec.ts`

## Scope

This pass focused on Setup Templates lifecycle correctness, negative behavior, versioning, tenant isolation, published immutability, adoption preview/apply reconciliation, and enterprise UX guardrails.

## Certified Workflows

| Area | Result |
| --- | --- |
| Draft v1 creation | Passed |
| Guided item authoring for Leave Type, Leave Policy, Shift, Holiday Calendar, Attendance Policy | Passed |
| Advanced JSON override inside guided item authoring | Passed |
| Draft item edit/delete | Passed |
| Refresh persistence after item mutations | Passed |
| Publish v1 | Passed |
| Published item UI locks | Passed |
| Published item backend mutation denial for create/update/delete | Passed |
| First adoption preview and apply | Passed |
| Baseline-only evidence adoption | Passed |
| Same-version compare/no-op upgrade disabled | Passed |
| Clone v2 from published v1 | Passed |
| v2 draft edit/delete/add | Passed |
| Publish v2 | Passed |
| Upgrade compare: add/change/remove/unchanged classification | Passed |
| Upgrade apply: created/updated/skipped result reconciliation | Passed |
| Repeat compare after upgrade | Passed |
| Tenant A/Tenant B isolation and selected-tenant browser history | Passed |
| Invalid JSON, invalid reference, self-dependency validation | Passed |
| Draft preview/adoption backend denial | Passed |
| Invalid policy-pack URL/API denial | Passed |
| Non-platform access denial | Passed |
| Desktop and mobile horizontal overflow smoke | Passed |

## Product Fixes Made During Regression

| ID | Module/Page | Issue | Type | Fix | Severity |
| --- | --- | --- | --- | --- | --- |
| ST-DR-001 | Setup Templates upgrade apply | Unchanged items could be rewritten during upgrade and same-version upgrades were allowed as no-op adoptions. | Functional / Audit | `compare_policy_pack_upgrade` now marks same/no-action upgrades as not upgradeable. `upgrade_policy_pack_for_tenant` now rejects no-action upgrades and records unchanged linked items as skipped evidence instead of updating runtime records. | High |

## Current Defect Report

| ID | Module/Page | Issue | Type | Steps to Reproduce | Expected | Actual | Severity | Screenshot/Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| None open | Setup Templates | No open functional blocker found in local deep certification. | N/A | Run focused local spec. | All lifecycle/negative assertions pass. | Passed locally. | N/A | Playwright run below |

## Observations / UX Notes

- Advanced JSON override works as an advanced section inside each supported guided item type. It is not a standalone item type in the Item type dropdown.
- Browser-native required fields still apply to guided runtime fields even when Advanced JSON override is used. The UI is workable, but a future refinement could disable guided required attributes when advanced JSON is active.
- Same-version compare now clearly lands in a non-upgradeable/manual-review state and Apply upgrade remains disabled.
- Apply result now reconciles better with compare: changed items update, added items create, unchanged/removed items are represented as skipped evidence.

## Validation Evidence

Local:

```bash
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/platform-admin-setup-templates-deep-regression.spec.ts --project=chromium --workers=1
```

Result: `2 passed (46.9s)`

Backend:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_tenant_onboarding_api.py -q
```

Result: `24 passed`

Static checks completed before report update:

```bash
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
cd backend && ./.venv/bin/python manage.py check
```

Result: passed.

## Pending

- Deployed rerun against `https://hrms.accerio.in` is pending until this branch is checked in and deployed, because the deep regression includes backend behavior changes that staging will not have until deployment.
