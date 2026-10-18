# HRMS/Payroll Loading States, Async Feedback, and UI Responsiveness Audit

Date: 2026-10-16  
Scope: implementation audit only; no application code changed  
Portals: HR Admin, ESS, MSS, Tenant Admin, Platform Admin

## Decision

**CONDITIONAL.** Initial portal loading and most high-value mutations have useful feedback, and durable payroll jobs have the strongest asynchronous lifecycle in the product. The application is not yet consistently trustworthy during same-route server navigation, row/detail selection, table filtering, download/export initiation, and several dialog or form mutations.

No P0 defect was proven by this static implementation audit. There are **37 P1** and **9 P2** interaction families in the machine-readable tracker. P1 means a frequent or business-sensitive user action can appear unresponsive, permit ambiguous repetition, lose context on failure, or display stale content. P2 means feedback exists but is incomplete or inconsistent.

Machine-readable tracker: `docs/qa/hrms-loading-state-coverage.csv`.

## Method

The audit inspected:

- Every `page.tsx`, `loading.tsx`, and `error.tsx` under the five portal route trees.
- Shared shell, dialog, pagination, toast, loading, error, notification, and employee-selector components.
- Client `fetch` calls, state flags, disabled controls, status/live regions, timers, router transitions, polling, cancellation, and request ordering.
- Server-component API reads in `web/src/lib/api.ts` and URL/search-parameter driven detail panels.
- Authentication, workspace access, payroll job persistence, imports, exports, documents, approvals, and administrative mutations.

No React Query, SWR, Apollo, or equivalent client data framework is used. Data access is primarily:

1. Server components calling `apiGet` with `cache: "no-store"`.
2. URL/search-parameter navigation to replace server-rendered tables, tabs, and detail panels.
3. Client components using native `fetch`, local pending state, and `router.refresh()`.

Static counts:

| Portal | Routed pages | Portal loading boundary | Portal error boundary |
| --- | ---: | ---: | ---: |
| HR Admin | 144 | 1 | 1 |
| ESS | 7 | 1 | 1 |
| MSS | 3 | 1 | 1 |
| Tenant Admin | 9 | 1 | **0** |
| Platform Admin | 9 | 1 | 1 |
| **Total** | **172** | **5** | **4** |

Ninety-seven implementation files directly call `fetch`. The audit grouped all 172 routes and their async interactions into 46 coverage rows. Purely synchronous disclosure toggles, preloaded dialogs, local tabs, and client-only formatting were intentionally not assigned loaders.

## Primary Reproduction

### Employee Directory detail panel

Route: `/hr-admin/employees`

The page is a server component. Clicking an employee identity changes `employeeId` in the URL. The new render performs:

1. Employee list retrieval.
2. Resolution of the selected list item.
3. `getHrAdminEmployeeDetail(selectedListItem.id)`.
4. Optional access or bank-account reads for action modes.
5. Replacement of the server-rendered detail drawer.

The clicked row does not become locally pending, the drawer has no skeleton, and there is no status announcement while the new server payload is produced. The portal `loading.tsx` exists, but a same-route search-parameter transition does not provide a reliable immediate indicator for this local interaction. The previous or empty detail state therefore looks frozen.

Root cause: row selection is implemented as a plain `Link` into a server-rendered query state with no client transition owner. There is no component that can set `aria-busy`, render a selected-row spinner, or enforce latest-selection presentation before the server response arrives.

Required remediation:

- Introduce a small client selection/navigation control around employee row links.
- Mark the selected row and detail region busy immediately.
- Render a dimensionally stable detail skeleton labelled `Loading employee details`.
- Keep the selected employee ID visible in pending state.
- Ensure rapid A to B selection can never display A after B is selected.
- On failure, retain list/filter/page state and offer retry for the selected ID.

## What Works

- Every portal has a stable `WorkspaceLoading` skeleton with `role="status"` and `aria-busy`; layout dimensions are substantially better than a blank screen or full-screen spinner.
- HR Admin, ESS, MSS, and Platform Admin have route error boundaries using a retryable workspace error state.
- Most create/edit forms keep an `isSubmitting` or `isSaving` state and disable a submit control.
- ESS leave, attendance, and document workflows provide inline status or toast feedback.
- MSS decision actions disable duplicate decisions and return errors to the dialog.
- Employee option search has debounce, visible option loading, an error hint, and a request-sequence guard that prevents stale results from being committed.
- Import History and two interactive report workspaces use `AbortController`, providing the best current cancellation pattern.
- Payroll background jobs persist the job ID, restore visibility after refresh, poll durable server state, expose real stages and item counts, disable duplicates, and show bounded retry only when the backend marks a job retryable.
- Existing compact layouts generally preserve the surrounding shell while work occurs.

## Highest-Impact Gaps

### 1. Same-route query navigation has no shared pending contract

Severity: P1

This is the dominant pattern. Employee detail, MSS reviews, attendance record edit state, ESS detail/filter tabs, payroll evidence selection, Platform tenant selection, Tenant audit filters, report filters, and pagination are mostly links or GET forms. They retain old content while the server renders but do not identify the invoked control or affected region as pending.

Recommended shared capability:

- `PendingLink` and `PendingForm` wrappers using React transitions.
- A navigation context in `WorkspaceChrome` for sidebar/mobile/search navigation.
- A table-region pending pattern that leaves rows stable and sets `aria-busy`.
- A detail-panel skeleton for server-backed row selection.
- Main-heading focus after completed route navigation.

### 2. Mutation feedback is implemented repeatedly and inconsistently

Severity: P1

Many components correctly disable a button, but labels, status announcements, `finally` handling, form preservation, and post-success refresh differ. Some static button labels simply become disabled. Several flows report success, wait approximately 900 ms, and then refresh, leaving ambiguity about whether persisted data is already usable.

Recommended shared capability:

- `AsyncButton` with icon/spinner, pending label, and duplicate prevention.
- `AsyncStatus` with polite pending/success and alert failure semantics.
- A mutation wrapper that normalizes JSON errors, guarantees `finally`, accepts an idempotency key where supported, and never clears form input on recoverable failure.
- An explicit `Refreshing…` state after mutation success until refreshed server data is visible.

### 3. Filters, sorting, and pagination appear inert under latency

Severity: P1

Dozens of tables use URL navigation without table-local feedback. A route skeleton is too broad and may not appear for query-only transitions. The correct treatment is not to blank the page; keep rows and dimensions stable, identify the active filter/page control, and mark only the results region busy.

### 4. Remote dialog/drawer opening is indistinguishable from a missed click

Severity: P1

Locally preloaded dialogs should remain immediate and need no loader. Query-driven edit/view/access/review panels do require pending feedback. Employee edit/access/bank, MSS reviews, attendance review/edit, payslip detail when server-backed, and Platform tenant detail need a trigger state and stable panel skeleton.

### 5. Downloads and exports lack truthful lifecycle feedback

Severity: P1

Native download links provide no preparing state and cannot render API error detail. Reports, payslips, provider pack exports, artifacts, and compliance packages need a preparing indicator. Bounded files can use fetch/blob with surfaced HTTP errors; long exports must use a real backend job state. Completion must mean a response/artifact exists, not merely that a click occurred.

### 6. Tenant Admin lacks a route error boundary

Severity: P1

Tenant Admin has a loading boundary but no `error.tsx`. A failed context or server read falls through to a broader error experience and lacks a tenant-workspace retry surface. The error boundary must preserve the URL, fail closed, avoid exposing tenant data, and support retry.

### 7. Timeouts, aborts, and request ordering are not standardized

Severity: P1

Most native fetches have no abort signal or timeout classification. A request may remain pending indefinitely. Employee search guards stale commits but does not cancel superseded work. Import lookup implementations do not consistently have either guard. Only a few list/report workspaces use `AbortController`.

Recommended policy:

- Abort read/search requests on superseding input or unmount.
- Use operation-specific timeouts, not arbitrary UI delays.
- Treat abort as silent replacement, not an error toast.
- Retry mutations only by explicit user action or an idempotent backend contract.
- Keep a request ID guard even when aborting, because abort is cooperative.

### 8. Payroll jobs need connection-health feedback

Severity: P1

The durable payroll model is correct, but failed status polls are silently ignored. The user can continue seeing `Queued` or `Processing` without knowing that status is stale. Add last-updated time and `Reconnecting` after bounded consecutive poll failures. Do not convert network uncertainty into job failure and do not invent progress percentages.

### 9. Authentication transitions are incomplete

Severity: P1

Login disables while the API runs, but successful authentication followed by slow workspace navigation remains indefinitely submitting. Logout has no pending state, duplicate guard, catch, or failure message. Workspace authorization checks use generic route loading rather than an explicit access-check state.

## Portal Findings

### HR Admin

The 144-page surface is the largest risk concentration. Initial route loading is covered, but list/detail and filter transitions are not. Priority areas are Employee Directory, attendance records and regularizations, policy edit/impact workflows, lifecycle queues, payroll CRUD/controls, provider actions, and all report/export routes.

Most form submits already have a boolean busy state, so remediation should centralize presentation and error semantics rather than redesign forms. Payroll calculations/publication already use durable jobs; surrounding payroll setup and financial lifecycle commands need equally clear operation-specific states and persistence confirmation.

### ESS

All seven pages inherit loading and error boundaries. Leave, attendance, and documents have solid mutation states but weak URL-driven filter/detail transitions. Payslip downloads need preparing/failure feedback. Statutory declarations use a broad pending state across multiple item commands. Dashboard parallel reads do not isolate a slow or failed panel.

### MSS

All three pages inherit loading and error boundaries. Approval decision submission is covered; queue switching, pagination, and opening the selected leave/attendance review are not. This has the same stale-panel and missed-click perception as Employee Directory.

### Tenant Admin

Nine pages have initial loading but no portal error boundary. Membership and role actions have partial pending states; support access and change requests often use static labels and broad notices. Trust-audit filtering and pagination have no local pending signal.

### Platform Admin

Nine pages have loading/error boundaries. The console and launch workspace have mutation pending states, but one broad state can block unrelated controls and does not always identify the active stage. Tenant and panel selection are query-driven and need latest-selection behavior. Platform onboarding retries must remain idempotent to avoid duplicate tenants or admins.

## Route Inventory

All routed pages were included through these implementation families:

| Portal | Route families inventoried |
| --- | --- |
| HR Admin | Dashboard; employees/access/bank accounts; attendance records/regularizations/operations; attendance/leave policies and assignments; leave balances/requests/types; documents/categories/requirements; lifecycle/onboarding/probation/movements/exits; organization; notifications/events/templates/delivery/diagnostics; shifts/rosters; workflows/templates/assignments; salary; payroll inputs/calculation/review/outputs/handoff/adjustments/settlements/rules/setup/statutory/providers/readiness; SaaS controls; launch remediation; import history; audit; reports and 34 report detail routes. |
| ESS | Dashboard, attendance, documents, leave, notifications, payslips, statutory declarations. |
| MSS | Dashboard, approvals, notifications. |
| Tenant Admin | Dashboard, plan, roles, security readiness, settings, setup, support access, trust audit, users. |
| Platform Admin | Dashboard, admins, audit logs, launch, leads, onboarding, permissions, policy packs, tenants. |

The tracker maps each family to route count, trigger, dependency, current feedback, defect, recommendation, source, and required regression. The route count total is 172; overlapping interaction rows are intentional and are not a second route denominator.

## Root-Cause Patterns

1. **Server ownership without client transition ownership.** Search-parameter links initiate server work but no client component can render pending state immediately.
2. **Portal-level loading is too coarse.** One loading file per portal covers initial navigation, not local query transitions or one slow panel.
3. **Async UI is hand-built repeatedly.** Native fetch state, toasts, labels, errors, and refresh timing differ across approximately 97 files.
4. **Refresh is treated as an afterthought.** Mutation completion and refreshed server-data usability are often separate but presented as one event.
5. **Cancellation is exceptional.** Only a small number of search/report workspaces abort superseded reads.
6. **Download navigation bypasses UI error handling.** Native links cannot distinguish preparation, rejection, and completion.
7. **Broad pending flags reduce clarity.** Multi-action consoles often know that something is busy but not which record or stage.
8. **Focus and announcements are not contractual.** Some live regions exist, but route completion, remote dialog opening, and polling announcements are inconsistent.

## Implementation Plan

### Phase A: shared primitives and the reference defect

1. Add `AsyncButton`, `AsyncStatus`, `PendingLink`, and a table/detail busy pattern.
2. Add a shared cancellable read helper with request sequencing and timeout taxonomy.
3. Repair Employee Directory selection first, including skeleton, selected ID, latest-selection behavior, error/retry, and accessible announcement.
4. Add Tenant Admin `error.tsx` using the existing workspace error component.
5. Add route navigation pending state to `WorkspaceChrome` and focus the destination heading.

### Phase B: shared list/detail migrations

Apply the reference pattern to:

- MSS leave/attendance reviews.
- Attendance records and regularizations.
- ESS attendance/leave detail and filters.
- HR lifecycle/document/onboarding queues.
- Platform tenant/panel selection.
- Tenant trust audit and all shared pagination.

### Phase C: mutations, imports, and dependent fields

- Replace bespoke submit labels/status blocks incrementally with shared primitives.
- Centralize employee option search and remove duplicate import-search implementations.
- Add abort/request ordering to dependent conflict checks and search APIs.
- Separate mutation completion from server refresh completion.
- Verify form/file preservation after recoverable errors.

### Phase D: payroll, exports, and long-running work

- Add payroll poll connection health and last-updated time.
- Add preparing/error states to report, payslip, provider, and artifact downloads.
- Use backend job state for any export or provider operation proven long-running.
- Revalidate idempotency, RBAC, tenant isolation, audit events, and finance integrity.

### Phase E: accessibility and performance certification

- Slow-network and delayed-response Playwright coverage across all five portals.
- Failed, timed-out, aborted, retried, and out-of-order request coverage.
- Keyboard focus, screen-reader announcements, and reduced-motion checks.
- Measure indicator appearance latency, time to usable data, layout shift, long tasks, and stale-content windows.

## Acceptance Standards

- Visible feedback begins within 100 ms of a meaningful asynchronous action.
- Existing content remains stable unless replacement is required for correctness.
- A pending mutation cannot be submitted twice.
- Every recoverable failure returns controls to an actionable state and preserves user input.
- Latest search/filter/selection intent wins; stale responses cannot overwrite it.
- Pending, empty, success, warning, and error states are visually and semantically distinct.
- Status messages use polite announcements; failures use alerts; polling does not repeatedly announce unchanged state.
- Reduced motion removes decorative animation without removing status meaning.
- Long-running progress uses backend stages or item counts only.
- Financial and security actions retain RBAC, tenant scope, idempotency, and audit behavior.

## Required Regression Strategy

The tracker defines row-level regression expectations. The shared minimum suite should include:

1. Employee A to B rapid selection with delayed and out-of-order detail responses.
2. Slow filter, sort, and pagination across one representative table per portal.
3. Remote dialog/drawer open, failure, retry, focus entry, Escape, and focus restoration.
4. Slow and failed form mutations with duplicate clicks and input preservation.
5. Approval/rejection persistence for HR Admin and MSS.
6. Upload/import state preservation and partial-failure reporting.
7. Report and protected-artifact download success, authorization failure, and server failure.
8. Payroll submit, queued, running, reconnecting, succeeded, failed, retryable, reload recovery, and unauthorized access.
9. Login, logout, workspace redirect, revoked permission, and failed access checks.
10. Screen-reader status assertions, reduced motion, mobile layout stability, and no overlapping controls.

## Audit Boundary

This audit did not change application source, business logic, API contracts, tests, or permissions. It is based on the checked-in implementation and identifies remediation work requiring executed browser/network evidence. A static audit cannot certify actual indicator timing or perceived smoothness; those measurements belong to the implementation and verification phases.

## Phase L1 Verification

LS-002 was implemented and verified on 2026-10-16. Employee row selection is acknowledged immediately, the detail drawer owns its loading/error state, superseded requests are aborted and identity-checked, successful details are cached, and query navigation remains compatible with direct URLs and browser history.

- Delayed detail at 750 ms: skeleton visible in 126 ms.
- Delayed detail at 2,000 ms on a 390 x 844 viewport: skeleton visible in 139 ms.
- Focused loading, stale-response, retry, and history suite: 5 passed.
- Existing directory controls/detail/actions regression: 1 passed.
- TypeScript: passed.
- Production Next.js build: passed with the pre-existing Autoprefixer `end` compatibility warning.

Implementation and command evidence is recorded in `docs/qa/hrms-loading-state-l1-employee-directory-2026-10-16.md`.

## Phase L2 Verification

LS-003 was verified and shared progress was recorded for LS-024, LS-033, LS-034, LS-044, and LS-045 on 2026-10-16. The persistent workspace shell now reports same-origin navigation and GET query transitions immediately, preserves existing content during refresh, applies localized `aria-busy`, announces status politely, and disables decorative motion when reduced motion is requested. Tenant Admin now has route-level Retry parity with the other portals.

The result is conditional because destination focus transfer, injected Tenant Admin failure recovery, and page-specific table/dialog/mutation families still require direct evidence. Full implementation, timings, commands, and the retained MSS resource-limited run are recorded in `docs/qa/hrms-loading-state-l2-shared-navigation-2026-10-16.md`.

## Phase L2A Closure

The shared navigation and query-feedback scope passed on 2026-10-16. LS-024, LS-033, and LS-034 are now verified. Destination focus survives streamed shell remounts, query-only transitions do not steal focus, latest route/query intent wins, and pending UI clears after completion, supersession, or route error. Tenant Admin's real delayed backend-500 boundary and successful same-URL Retry were executed.

The 11-test shared suite, realistic 900-record MSS evidence, disposable fixture cleanup, regression results, and remaining out-of-scope families are documented in `docs/qa/hrms-loading-state-l2a-navigation-closure-2026-10-16.md`.
