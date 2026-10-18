# Phase L1 Employee Directory Loading Feedback

Date: 2026-10-16  
Status: PASS for LS-002 only

## Root Cause And Remediation

The directory was a server component whose selected row and detail drawer changed only after query navigation and detail reads completed. Phase L1 adds a client selection boundary around the existing server-owned directory. It immediately highlights the selected row, fetches detail through the existing authenticated proxy, and renders a fixed-height accessible skeleton inside the drawer.

Each request has an AbortController and monotonically increasing request identity. Superseded responses cannot update the panel. Successful details are cached to avoid Back/Forward flicker. Direct query URLs retain server-provided initial detail. Failures remain inside the detail panel and expose Retry without clearing the table, filters, page, or scroll position.

No employee API, business rule, RBAC, tenant scope, or data contract changed.

## Files

- `web/src/app/hr-admin/employees/employee-detail-selection.tsx`
- `web/src/app/hr-admin/employees/page.tsx`
- `web/src/app/globals.css`
- `web/tests/e2e/hr-admin-employee-detail-loading.spec.ts`
- `docs/qa/hrms-loading-state-coverage.csv`
- `docs/qa/hrms-loading-state-audit.md`

## Executed Evidence

```text
pnpm --dir web typecheck
PASS

PLAYWRIGHT_PORT=3123 pnpm --dir web exec playwright test tests/e2e/hr-admin-employee-detail-loading.spec.ts --workers=1 --reporter=line
5 passed (36.6s)

PLAYWRIGHT_PORT=3124 pnpm --dir web exec playwright test tests/e2e/hr-admin-employee-detail-loading.spec.ts --workers=1 --reporter=line --grep 'acknowledges selection'
750 ms delayed API: final indicator measurement 126 ms
2,000 ms delayed API: final indicator measurement 139 ms
2 passed (23.1s)

PLAYWRIGHT_PORT=3126 pnpm --dir web exec playwright test tests/e2e/employee-directory-certification.spec.ts --workers=1 --reporter=line --grep 'directory controls'
1 passed (22.3s)

pnpm --dir web build
PASS
```

The first browser attempt after restart was invalid because no backend was listening. A second setup attempt revealed `web/.env.local` targets port 8001; the local QA backend and supported demo workspace were then started on that configured port. These environment failures were not counted as product results.

## Coverage

- Desktop and 390 x 844 compact mobile layout.
- Artificial 750 ms and 2,000 ms detail latency.
- Immediate row highlight, panel `aria-busy`, polite loading status, and stable skeleton.
- Rapid A to B to C selection with out-of-order responses.
- Panel-level service failure and successful Retry.
- Query URL preservation, direct query loading, and Back/Forward cached restoration.
- Existing pagination, filters, detail values, and action links.

## L2-L6 Guidance

Keep server-rendered list ownership while introducing the smallest client boundary around the async surface. Pair cancellation with response identity checks, keep errors local to the affected panel, and retain server-provided initial state for direct URLs. This pattern is suitable for other query-driven drawers and dialogs without introducing a new global data framework.
