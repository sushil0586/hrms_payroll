# HRMS/Payroll Phase L6A Loading-State Closure

Date: 2026-10-16  
Decision: **CONDITIONAL**

## Scope and outcome

The 46-family tracker was reconciled before implementation. This increment closes the employee-search acknowledgment latency defect, hardens the commit/recovery path for eight CSV import workbenches, and resolves the Playwright browser/API authentication-context mismatch without changing application authentication.

Current unique tracker status:

| Status | Count | IDs |
|---|---:|---|
| Verified | 9 | LS-001, LS-002, LS-003, LS-005, LS-024, LS-033, LS-034, LS-036, LS-042 |
| Covered | 1 | LS-043 |
| Partial | 21 | LS-006, LS-011, LS-013, LS-014, LS-015, LS-017, LS-018, LS-019, LS-020, LS-021, LS-025, LS-029, LS-031, LS-035, LS-038, LS-039, LS-040, LS-041, LS-044, LS-045, LS-046 |
| Open | 15 | LS-004, LS-007, LS-008, LS-009, LS-010, LS-012, LS-016, LS-022, LS-023, LS-026, LS-027, LS-028, LS-030, LS-032, LS-037 |

No family was marked verified without browser evidence. LS-006 moved from open to partial because commit failure/recovery is now verified, while the duplicated preview lookup race behavior remains unresolved.

## Confirmed root causes and changes

### Employee search acknowledgment

The 366 ms audited latency included the intentional 250 ms network debounce. The control exposed no visual state until the debounce expired. `EmployeeSearchSelect` now announces `Preparing employee search` immediately, then changes to the truthful API state `Updating employee options`. Existing abort, latest-request-wins, retained options, and Retry behavior remain intact.

Final browser measurement: **40 ms** acknowledgment. The delayed A/B/C requests completed out of order, but only C remained visible. A 750 ms failure retained prior options and Retry recovered.

### CSV import commit and recovery

Eight workbenches called `fetch` directly. A transport exception could bypass their state reset and leave the commit action disabled. They now use one transport helper that converts network exceptions into an actionable row result. Existing validation and mutation contracts are unchanged.

The workbenches now:

- reject duplicate commit calls with both a synchronous guard and disabled accessible pending action;
- preserve CSV and row state after failure;
- distinguish success status from an alert requiring attention;
- restore the control after completion and support explicit re-preview before retry;
- avoid reporting successful completion when any row failed.

Affected imports: employees, manager mappings, bank accounts, attendance records, shift assignments, leave-policy assignments, leave requests, and organization masters.

Final delayed-failure measurement: **174 ms** acknowledgment under a 2,000 ms aborted request; one POST after a forced duplicate; CSV retained; alert exposed; retry path restored.

### Browser/API authentication evidence

The legacy report test used Playwright `page.request`, whose separate HTTP client did not send the production-mode Secure browser cookie on local HTTP. Real browser requests were authorized. `requestWithBrowserSession` now performs evidence requests in the page context with same-origin credentials. It does not inject tokens or bypass authorization. The HR Admin CSV, manifest, and export-audit checks returned 200; the employee negative checks remained 401/403.

The complete report scenario initially exposed a drilldown-navigation stall (`Loading Open` remained visible and the URL did not change). An isolated rerun completed the same full HR Admin scenario in 23.7 seconds. This is classified as a transient navigation/environment result, retained in history, and moves LS-041 only to partial because the broad 35-report delayed/error matrix is still incomplete.

## Verification

| Check | Result |
|---|---|
| Search delay/race/failure/Retry | Passed; 40 ms final acknowledgment |
| Employee import 2 s transport failure/duplicate/recovery | Passed; 174 ms final acknowledgment; one request |
| Focused final Playwright batch | 2 passed |
| Leave-balance report authorization-context and drilldown | Passed on isolated rerun; initial navigation stall retained |
| Employee unauthorized report/export check | Passed |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Production Next.js build | Passed; existing autoprefixer `end` warning retained |
| Django system check | Passed |
| Fixture cleanup | Test cleanup hooks completed without error and verified disposable workspaces absent |

## Commands

```text
HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test \
  tests/e2e/loading-state-gap-closure.spec.ts --workers=1 --reporter=line --trace=retain-on-failure

HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test \
  tests/e2e/loading-state-import-recovery.spec.ts --workers=1 --reporter=line --trace=retain-on-failure

HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test \
  tests/e2e/loading-state-import-recovery.spec.ts tests/e2e/loading-state-gap-closure.spec.ts \
  --grep 'employee CSV import|employee lookup' --workers=1 --reporter=line --trace=retain-on-failure

HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test \
  tests/e2e/leave-balance-report-certification.spec.ts --workers=1 --reporter=line --trace=retain-on-failure

pnpm --dir web typecheck
pnpm --dir web exec eslint <L6A focused files>
pnpm --dir web build
./.venv/bin/python backend/manage.py check
```

## Evidence

Evidence is under `docs/qa/evidence/loading-state-l6a/`:

- `001-loading-state-gap-closure.log`: search pass plus preserved neighboring logout failure.
- `002-import-recovery.log`: initial strict-locator test failure and trace.
- `003-import-recovery-rerun.log`: corrected initial import pass.
- `004-report-auth-context.log`: browser-context authorization succeeded; initial drilldown stall; employee denial passed.
- `005-focused-final.log`: final two-test pass and latency measurements.
- `006-production-build.log`: production build.
- `007-django-check.log`: backend system check.
- `008-typecheck.log` and `009-eslint.log`: final static checks.
- `010-report-drilldown-reproduction.log`: isolated full HR Admin report scenario passed.

## Remaining risks and decision

The remaining 36 partial/open families are listed exactly above. Highest-priority unresolved work includes preview lookup cancellation in CSV imports, the broad report delayed/error matrix (LS-041), portal-specific mutations and dialogs, and the broad error/accessibility/timeout matrices.

Phase L6A is **CONDITIONAL**. The changes are verified and preserve business behavior, RBAC, tenant scoping, and API contracts, but application-wide loading-state certification is not justified until the remaining families are implemented and independently regressed. Production readiness is not claimed.
