# HRMS Loading State Phase L2A: Navigation Closure

Date: 2026-10-16  
Decision: **PASS for the Phase L2A shared navigation/query scope**

Application-wide loading-state certification is not claimed. Module-specific dialogs, mutations, uploads, reports, and background jobs remain represented by separate rows in the 46-family tracker.

## Root Causes Closed

1. The MSS test used a shared 900-record approval queue for correctness setup. A disposable Enterprise workspace now proves behavior with four deterministic employees and owned manager fixtures; cleanup is verified. A separate read-only Northstar run retains realistic 900-record evidence.
2. Pending state previously cleared on any route-key change. Navigation now owns an exact destination and React transition lifecycle, so superseded transitions cannot clear or overwrite the latest intent.
3. Destination headings are streamed after the URL and shell commit. A one-time session-scoped focus intent survives shell remounts and a `MutationObserver` focuses the actual heading when it appears. Query-only changes never create focus intent.
4. Tenant Admin lacked executed failure recovery. A real local backend fault proxy proved the route boundary. `reset()` and `router.refresh()` did not reissue the failed server request; same-URL reload is now used for fatal route Retry.
5. Route error messages were not explicitly alerts. `WorkspaceErrorState` now exposes its actionable failure block with `role=alert`.

No payroll, employee, attendance, leave, RBAC, tenant-scope, entitlement, or API contract behavior changed.

## Final Browser Evidence

- L2A shared suite: **11 passed** in 3.4 minutes with one worker.
- 750 ms indicator latency: HR Admin 99 ms, ESS 125 ms, Tenant Admin 116 ms, Platform Admin 46 ms.
- MSS disposable workspace: passed; four employees; fixture cleanup verified.
- MSS shared realistic fixture: 900 approvals; indicator 177 ms; destination usable in 1,394 ms.
- Mobile ESS transition: 2,000 ms delay; keyboard activation, reduced motion, compact width, and heading focus passed.
- Rapid route A to B to C: 2,000/750/300 ms; only C committed after all responses completed.
- Rapid filter A to B to C: 2,000/750/300 ms; only C committed; old rows stayed visible.
- Pagination: 2,000 ms delay; indicator appeared in 163 ms.
- Back, Forward, refresh, query restoration, and completed-state cleanup passed.
- Tenant backend failure: delayed 750 ms HTTP 500; pending cleared; alert rendered; same-URL Retry restored live data.

## Regression and Build

- L1 employee detail suite: **5 passed**. Final indicator measurements were 137 ms at 750 ms delay and 155 ms at 2,000 ms delay.
- Existing Employee Directory certification: **1 passed**.
- ESLint: passed.
- TypeScript: passed.
- Production Next.js build: passed with only the pre-existing Autoprefixer `end` compatibility warning.
- Disposable MSS workspace query after cleanup: zero matching tenants.

## Modified Files

- `web/src/components/shell/workspace-navigation-feedback.tsx`
- `web/src/components/shell/workspace-chrome.tsx`
- `web/src/components/patterns/workspace-error-state.tsx`
- `web/src/app/tenant-admin/error.tsx`
- `web/tests/helpers/isolated-qa-workspace.ts`
- `web/tests/e2e/shared-navigation-loading-feedback.spec.ts`
- `docs/qa/hrms-loading-state-audit.md`
- `docs/qa/hrms-loading-state-coverage.csv`

## Remaining Work Outside L2A

- LS-044 remains partial for client-side mutation timeout/offline/403/error taxonomy across all modules.
- LS-045 remains partial for modal, mutation, upload, and background-job announcement/focus contracts.
- Page-specific async behavior remains governed by the other open P1/P2 tracker families.

The frozen 963-case inventory and Northstar data were not modified. No broad L3 execution was started.
