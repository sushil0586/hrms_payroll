# HRMS Loading-State Final Closure and Independent Verification

Date: 2026-10-17  
Environment: local production-capable source with live Django backend and isolated Playwright workspaces  
Decision: **CONDITIONAL**

## Completion-pass addendum

The final continuation fixed the two previously observed post-save stalls at their shared source. `WorkspaceNavigationFeedback` was treating methodless React mutation forms as browser GET forms because `HTMLFormElement.method` defaults to `get`. It now intercepts only an explicitly declared GET form or a form with an explicit server action. Employee shift and roster saves use the shared pending button, a synchronous duplicate guard, network recovery, and one authoritative post-success navigation.

The Platform permission catalog now remounts its uncontrolled filter form from URL state after Reset, preventing stale visible filters from being combined with a new risk filter. The test waits for the exact reset URL and restored field values before continuing.

Final tracker state after evidence reconciliation:

| Status | Count |
| --- | ---: |
| Verified | 12 |
| Covered / technically dispositioned | 2 |
| Partial | 32 |
| Open | 0 |
| Total | 46 |

This remains **CONDITIONAL** because 32 broad families still lack one or more route-specific failure, persistence, focus, timeout, or fault-injection matrices. They are implemented or representatively covered; they are not relabelled as independently verified.

Additional executed evidence:

- shared loading-feedback suite: 31/31 passed after correcting the Tenant fault proxy to use the configured backend origin;
- governance and Platform permission suite: 16/16 passed;
- ESS/MSS/Tenant neighboring suite: 19/19 passed;
- payroll/report suite: 11 passed, 1 fixture-limited (`PLAYWRIGHT_PAYROLL_BACKGROUND_RUN_ID` absent); durable reload recovery remains covered by the prior real Redis/Celery disposable run;
- TypeScript: passed;
- focused ESLint: passed;
- Next production build: passed, 273 pages, with the pre-existing Autoprefixer warning only;
- Django system check: passed with zero issues;
- disposable `PW-QA-*` sandbox audit: zero tenants remained.

New evidence is retained in `docs/qa/evidence/loading-state-final-closure/007-payroll-report-regression.log` through `012-fixture-cleanup-final.log`. Historical failure and rerun logs remain intact.

## Executive result

The final implementation pass reconciled every previously `Open` interaction family. The authoritative 46-family tracker now contains:

| Status | Count |
| --- | ---: |
| Verified | 10 |
| Covered / technically dispositioned | 2 |
| Partial | 34 |
| Open | 0 |
| Total | 46 |

This is not application-wide loading-state certification. The 34 Partial families have working shared behavior or representative evidence, but still lack one or more route-specific failure, persistence, focus, or fault-injection checks recorded in the tracker.

## Source changes in this closure

- Removed fixed post-success delays from ESS attendance, ESS leave, leave policy assignment, leave type, and leave policy flows.
- Kept mutation feedback active through transition-aware refresh where the current screen remains mounted.
- Added accessible staged organization setup feedback with `aria-busy`, live step status, and shared pending controls.
- Made attendance and leave policy conflict checks abortable and latest-request-safe; failures now expose an explicit Retry action.
- Made Platform permission save recover from network exceptions without leaving controls disabled.
- Marked the Platform permission filter as a localized async region.
- Added an explicit `Checking workspace access` loading state for `/workspace-access`.
- Added focused browser coverage for remote employee dialogs, Tenant audit filters, Platform permission filters, and policy conflict races.

Primary files:

- `web/src/app/ess/attendance/attendance-workspace.tsx`
- `web/src/app/ess/leave/leave-workspace.tsx`
- `web/src/app/hr-admin/attendance-policy-assignments/attendance-policy-assignment-form.tsx`
- `web/src/app/hr-admin/leave-policy-assignments/leave-policy-assignment-form.tsx`
- `web/src/app/hr-admin/organization/organization-guided-setup.tsx`
- `web/src/app/hr-admin/leave-types/leave-type-form.tsx`
- `web/src/app/hr-admin/leave-policies/leave-policy-form.tsx`
- `web/src/app/platform-admin/permissions/page.tsx`
- `web/src/app/platform-admin/permissions/permission-catalog-actions.tsx`
- `web/src/app/workspace-access/loading.tsx`
- `web/tests/e2e/loading-state-final-open-families.spec.ts`
- `docs/qa/hrms-loading-state-coverage.csv`

## Browser evidence

Final focused run:

```text
3 passed (42.3s)
```

Verified behavior:

- Employee remote edit hydration under a 2,000 ms delay acknowledged within the required 500 ms window, retained the selected detail region, preserved the exact employee ID, and opened the correct populated dialog.
- Tenant Trust Audit filtering under a 750 ms delay retained the audit ledger and localized `aria-busy` to the selected panel.
- Platform permission filtering under a 2,000 ms delay retained catalog content, marked the filter region busy, and cleared feedback after completion.
- Attendance policy conflict requests with 2,000/750 ms ordering cancelled stale work, exposed an actionable failure, retried safely, and rendered only the latest successful result.

Historical rerun evidence is retained:

- The first audit test used a strict locator matching two valid ledgers; it was narrowed without weakening behavior.
- The first Platform filter run exposed the missing local async-region marker; source was fixed and the test passed.
- The first final rerun read query state before the client selection update; the test now derives and waits for the exact clicked employee ID.

## Neighboring regression

The combined neighboring run produced `15 passed`, `3 skipped`, and `3 failed` in 5.1 minutes.

The failures were not changed to passes:

1. Employee shift assignment persisted through the API but remained on the edit page with `Saving...`; this was outside the files changed in this closure and needs an isolated rerun/root-cause check.
2. Shift roster template remained on the create page with `Saving...`; the backend record was captured, so navigation/reconciliation needs an isolated check.
3. Permission catalog certification retained previous search and assignability filters while adding `risk=critical`, yielding a legitimate zero-result intersection; the expectation for visible `Critical` content is stale for that combined filter state.

Before the correctly configured run, four governance cases also failed because the test helper inferred the frontend URL as an API base. Rerunning with `HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1` removed those 404s.

No security, payroll-integrity, tenant-isolation, or authorization defect was observed in this closure.

## Static and build verification

- TypeScript: passed.
- Focused ESLint: passed.
- `git diff --check`: passed.
- Django system check: passed, zero issues.
- Next.js production build: passed for 273 static pages and all dynamic routes.
- Existing warning retained: Autoprefixer reports mixed support for `end` at `globals.css:4531`; this is not introduced by this closure.

## Fixture cleanup

The final audit found eight clearly owned sandbox tenants from earlier loading-state runs. Each used the `pw-qa-` prefix and `@playwright.qa.invalid` ownership marker. They were removed through the supported `manage_playwright_workspace --cleanup` command.

Final audit:

```text
playwright_owned_tenants_after_cleanup= 0
[]
```

Northstar and ambiguous historical data were not modified.

## Exact commands

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3174 PLAYWRIGHT_SKIP_WEB_SERVER=1 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
pnpm --dir web exec playwright test \
  tests/e2e/loading-state-final-open-families.spec.ts \
  --workers=1 --reporter=line

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3174 PLAYWRIGHT_SKIP_WEB_SERVER=1 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
pnpm --dir web exec playwright test \
  tests/e2e/governance-assignment-form-flows.spec.ts \
  tests/e2e/hr-admin-organization-master-ui.spec.ts \
  tests/e2e/mutation-loading-feedback.spec.ts \
  tests/e2e/platform-admin-permission-catalog-certification.spec.ts \
  --workers=1 --reporter=line

pnpm --dir web exec tsc --noEmit
pnpm --dir web exec eslint <modified loading-state files>
pnpm --dir web build
./.venv/bin/python backend/manage.py check
./.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref <owned-seed> --cleanup
```

## Remaining evidence gates

The tracker is the exact source of truth for the 34 Partial families. Highest-priority remaining checks are:

- Isolated reproduction of the shift-assignment and roster-template post-save navigation stalls.
- Failed server-backed employee access/bank dialog opening with trigger-focus restoration.
- Full attendance regularization persistence after reload.
- Tenant role/status and Platform permission mutation persistence matrices.
- Provider rehearsal durability and remaining payroll setup refresh reconciliation.
- Broad report-family fault injection rather than representative report coverage only.
- Slow/revoked session access checks proving no unauthorized content flash.

The frozen 963-case functional certification evidence is preserved. This loading-state closure does not claim production readiness.
