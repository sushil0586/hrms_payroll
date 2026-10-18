# HRMS Loading State Phase L2: Shared Navigation and Query Feedback

Date: 2026-10-16  
Decision: **CONDITIONAL**

Phase L2 adds immediate, localized feedback to the persistent workspace shell without changing APIs, authorization, tenant scope, entitlements, or business behavior. Application-wide loading coverage is not claimed: the 46-family tracker still contains module-specific P1/P2 work.

## Implemented Patterns

- `WorkspaceNavigationFeedback` wraps the persistent shell for HR Admin, ESS, MSS, Tenant Admin, and Platform Admin.
- Same-origin links and shared GET filter forms immediately expose a compact `role=status`, `aria-live=polite` message.
- The nearest table, toolbar, pagination, or navigation region receives `aria-busy=true` and a stable 2 px progress treatment.
- GET filters use client routing with `scroll: false`, preserve the current content during refresh, and retain URL Back/Forward semantics.
- Workspace search uses the same pending contract.
- Pending visual motion is disabled under `prefers-reduced-motion: reduce` while status meaning remains.
- Tenant Admin now has the same route-level actionable error/Retry boundary as the other four portals.

The shared boundary remains mounted during route changes. An earlier route-keyed remount cleared L1's panel state and was removed before final verification.

## Tracker Reconciliation

| Family | Outcome | Evidence |
| --- | --- | --- |
| LS-003 Employee Directory filters/pagination | Verified | Rapid A/B/C requests at 2,000/750/300 ms; latest URL won; old rows remained; Back/Forward restored query state; 2,000 ms pagination indicator appeared in 106 ms. |
| LS-024 Tenant Admin route errors | Partial | Error boundary and production build verified; injected 403/500/timeout and successful Retry browser execution remains. |
| LS-033 shared GET tables | Partial | Central mechanism and representative directory path verified; all approximately 60 table families were not individually executed. |
| LS-034 five-shell navigation | Partial | Immediate feedback exercised in all shells; completion focus transfer is not implemented. |
| LS-044 error/retry parity | Partial | Tenant boundary gap fixed; client mutation error taxonomy remains. |
| LS-045 accessibility | Partial | Keyboard activation, polite status, `aria-busy`, mobile layout, and reduced motion verified; modal/polling/focus contracts remain. |

## Measured Feedback

The final full portal run produced these 750 ms delayed-route indicator times: HR Admin 73 ms, ESS 95 ms, MSS 104 ms, Tenant Admin 153 ms, and Platform Admin 39 ms. All indicators appeared within the test's 500 ms immediate-feedback guard. A 2,000 ms employee-directory pagination transition reported feedback in 106 ms.

The MSS indicator was observed at 104 ms, but that run's destination did not commit before timeout against a local fixture containing 900 manager approval records. Subsequent isolated MSS setup attempts also timed out before `DOMContentLoaded`. This is retained as environment/fixture evidence, not counted as successful destination completion and not classified as a shared feedback defect.

L1 remained intact after the shared integration: the five detail-panel scenarios passed, with indicator appearance at 172 ms for a 750 ms response and 113 ms for a 2,000 ms response.

## Verification Results

- Shared navigation suite: 6 passed, 1 MSS destination timeout in the final matrix. Historical MSS feedback evidence retained; destination completion remains unverified in the final run.
- Employee Directory existing certification: 1 passed.
- Employee detail loading suite: 5 passed.
- ESLint for changed source/tests: passed.
- TypeScript: passed.
- Production Next.js build: passed. The pre-existing Autoprefixer `end` compatibility warning remains.

## Exact Commands

```bash
pnpm --dir web exec eslint src/components/shell/workspace-navigation-feedback.tsx src/components/shell/workspace-chrome.tsx src/app/tenant-admin/error.tsx tests/e2e/shared-navigation-loading-feedback.spec.ts tests/e2e/hr-admin-employee-detail-loading.spec.ts
pnpm --dir web typecheck
PLAYWRIGHT_PORT=3142 pnpm --dir web exec playwright test tests/e2e/shared-navigation-loading-feedback.spec.ts --workers=1 --reporter=line
PLAYWRIGHT_PORT=3143 pnpm --dir web exec playwright test tests/e2e/shared-navigation-loading-feedback.spec.ts --workers=1 --reporter=line --grep 'Control Center navigation'
PLAYWRIGHT_PORT=3144 pnpm --dir web exec playwright test tests/e2e/shared-navigation-loading-feedback.spec.ts --workers=1 --reporter=line --grep 'Self service navigation'
PLAYWRIGHT_PORT=3145 pnpm --dir web exec playwright test tests/e2e/employee-directory-certification.spec.ts tests/e2e/hr-admin-employee-detail-loading.spec.ts --workers=1 --reporter=line --grep 'directory controls|Employee Master Detail loading feedback'
PLAYWRIGHT_PORT=3146 pnpm --dir web exec playwright test tests/e2e/hr-admin-employee-detail-loading.spec.ts --workers=1 --reporter=line
pnpm --dir web build
```

## Remaining Findings

- P1: destination-heading focus after successful workspace navigation is unresolved.
- P1: Tenant Admin route failures need injected failure/Retry browser evidence.
- P1: module-specific tables, tabs, disclosures, dialogs, mutations, and background jobs still need direct delayed/error/race verification.
- P2: page-specific empty-state, cached refresh, and control-level behavior remains governed by the open tracker rows.
- Environment: the shared local MSS fixture's 900-item approval queue makes development-server navigation evidence resource-sensitive.

The L2 result is **CONDITIONAL**: the shared implementation and representative paths are sound, but the audit's 46 interaction families are not fully reconciled.

## Phase L2A Addendum

The conditional shared-navigation items were closed on 2026-10-16. The scoped L2A result is PASS: deterministic and 900-record MSS paths passed, destination heading focus is verified without query focus theft, rapid routes and filters are latest-intent-wins, and genuine Tenant backend failure/Retry passed. See `docs/qa/hrms-loading-state-l2a-navigation-closure-2026-10-16.md`. The original L2 failures above remain preserved as historical evidence.
