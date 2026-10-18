# HRMS/Payroll Loading-State Final Closure Continuation

Date: 2026-10-17  
Decision: **CONDITIONAL**

## Current status

| Status | Count |
|---|---:|
| Verified | 10 |
| Covered | 1 |
| Partial | 25 |
| Open | 10 |
| Total | 46 |

The current work closes LS-006 and advances LS-007, LS-008, and LS-009 from Open to Partial. No family was promoted without executed evidence. Thirty-five families still require some route-specific implementation or independent browser/API evidence, so application-wide loading-state certification is not complete.

## Resolved root causes

### Fixed-delay reconciliation

The remaining 900 ms `router.refresh()` delays were removed from leave policy/type/assignment actions, notification bulk retry, ESS request submission, payslip read receipts, ESS document upload, and statutory declarations. These operations now bind feedback to the actual React refresh transition through `useRefreshAfterMutation`.

Network rejection paths were added where a rejected `fetch` could previously leave an action disabled. Statutory declaration create/update, proof save/upload, and submission now restore controls and preserve draft values on transport failure. Action-specific pending labels distinguish API work from post-success refresh.

### Attendance query feedback

Attendance records and regularization controls previously called `router.push` directly, bypassing shared navigation feedback. Filter, clear, row-count, and pagination commands now use `useWorkspaceNavigationFeedback`, mark the local region busy, retain current content, and preserve latest-destination behavior.

Attendance bulk mutations now use stable `AsyncActionButton` states through API processing and transition-bound refresh.

### Import preview safety

Four workbenches contained duplicate employee-code lookup implementations:

- attendance record import;
- employee shift assignment import;
- leave policy assignment import;
- leave request import.

They now use one request-scoped resolver that aborts superseded or unmounted requests, rejects stale results, preserves bounded prefix/exact lookups, and surfaces connection failures as actionable preview errors. Preview and commit actions have stable accessible pending states and CSV input is retained.

### Automation drift

The ESS document test assumed the modal was always named `Upload document`. When the selected category already has an active document, the current UI correctly names it `Replace document`. The locator now accepts both current accessible names while preserving all field and workflow assertions.

## Browser evidence

| Scenario | Result |
|---|---|
| ESS document, statutory declaration, leave assignment neighboring workflows | 3 passed |
| HR notification queue and four-portal mutation regression | 2 passed |
| Attendance rapid filters at 2,000/750/300 ms plus regularization at 750 ms | 1 passed |
| Attendance import preview 2,000 ms connection failure, duplicate click, retained CSV, Retry | 1 passed |

The first broad neighboring run is retained as historical evidence: 4 passed before execution was stopped after one stale ESS modal-name assertion. The isolated targeted rerun passed after the locator repair.

The first attendance query run is also retained. It timed out before interaction because the shared Northstar fixture contained 27,566 attendance rows. The authoritative rerun used a disposable tenant and passed without increasing the timeout.

## Static and build verification

| Check | Result |
|---|---|
| TypeScript | Passed |
| Focused ESLint | Passed |
| Django system check | Passed |
| Next.js production build | Passed |
| Fixture teardown | Passed through disposable-workspace cleanup hooks |

The existing autoprefixer `end` compatibility warning remains and is unrelated to these changes. No backend business logic, payroll calculations, RBAC rules, tenant scoping, or API contracts changed.

## Commands

```text
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3174 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
PLAYWRIGHT_SKIP_WEB_SERVER=1 \
pnpm --dir web exec playwright test \
  tests/e2e/ess-control-center-certification.spec.ts \
  tests/e2e/ess-statutory-declarations-flows.spec.ts \
  tests/e2e/hr-admin-setup-policy-frontend-validation.spec.ts \
  --workers=1 --trace=retain-on-failure \
  --grep 'employee document center exposes|employee declaration workspace exposes|leave assignment remove dialog'

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3174 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
PLAYWRIGHT_SKIP_WEB_SERVER=1 \
pnpm --dir web exec playwright test \
  tests/e2e/hr-admin-documents-notifications-workflow-certification.spec.ts \
  tests/e2e/mutation-loading-feedback.spec.ts \
  --workers=1 --trace=retain-on-failure \
  --grep 'notification queue supports|HR Admin, ESS, MSS, and Tenant Admin'

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3174 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
PLAYWRIGHT_SKIP_WEB_SERVER=1 \
pnpm --dir web exec playwright test \
  tests/e2e/shared-navigation-loading-feedback.spec.ts \
  --workers=1 --trace=retain-on-failure \
  --grep 'imperative attendance filters'

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3174 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
PLAYWRIGHT_SKIP_WEB_SERVER=1 \
pnpm --dir web exec playwright test \
  tests/e2e/loading-state-import-recovery.spec.ts \
  --workers=1 --trace=retain-on-failure \
  --grep 'attendance import preview'

pnpm --dir web typecheck
pnpm --dir web exec eslint <focused loading-state files>
./.venv/bin/python backend/manage.py check
pnpm --dir web build
```

## Evidence

Evidence is stored in `docs/qa/evidence/loading-state-final-closure/`:

- `001-neighboring-workflows.log`: retained broad run with the historical modal-name failure;
- `002-targeted-rerun.log`: three corrected neighboring scenarios passed;
- `003-mutations-notifications.log`: notification and four-portal mutation tests passed;
- `004-attendance-query-feedback.log`: retained shared-fixture timeout;
- `005-attendance-query-feedback-isolated.log`: authoritative disposable-fixture pass;
- `006-import-lookup-regression.log`: prior lookup regression run;
- `007-import-preview-recovery.log`: retained seeded-code test setup failure;
- `008-import-preview-recovery-rerun.log`: authoritative failure/retry pass;
- `009-typecheck.log`, `010-eslint.log`, `011-django-check.log`, `012-production-build.log`: final checks.

## Remaining scope

The remaining 10 Open families are LS-004, LS-010, LS-012, LS-016, LS-022, LS-027, LS-028, LS-030, LS-032, and LS-037.

The remaining Partial families primarily need remote modal failure/Retry evidence, lower-risk CRUD persistence matrices, panel-level dashboard failure isolation, complete payroll operation UI matrices, and the broad native-fetch timeout/accessibility taxonomy. These are not silently treated as passing.

The frozen 963-case functional certification history is preserved. A full rerun was not performed, and production readiness is not claimed.
