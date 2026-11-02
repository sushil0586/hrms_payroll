# HRMS Leave UI/UX Completion Matrix

Date: 2026-11-02

## Scope

This phase applies the common interaction contract only to Leave surfaces. Attendance, payroll, employee, organization, notification, and other modules remain outside this phase.

In-scope screens:

- HR Admin: Leave Types, Leave Policies, Policy Assignments, Leave Requests, Leave Balances, and Leave Year.
- ESS: Apply Leave and My Requests.
- MSS: Leave queue, decision panel, and decision history.
- Leave reports: Leave Balance and Leave/Attendance Collisions.

## Required Contract

Every applicable screen must be checked for:

1. Consistent compact header, title, actions, and alignment.
2. Explicit filter submission, Enter-key submission where text search exists, and reliable dropdown-only filtering.
3. Truthful table or action loading state without duplicate submission.
4. Supported sorting with visible current order.
5. Bounded pagination, canonical page recovery, and hidden pagination for empty data.
6. Field-specific validation, one useful summary, focus on correction, and zero mutation for deterministic invalid input.
7. Accurate error/warning color and accessible alert semantics without duplicate messages.
8. One five-second success toast plus a durable receipt when navigation or dialog closure can hide the toast.
9. Functional Inspect, Edit, Save, Cancel, Close, Approve, Reject, Withdraw, and Remove controls where supported.
10. Modal/drawer focus entry, Escape/Close behavior, and trigger-focus restoration.
11. API, PostgreSQL, audit, tenant, and role evidence for business mutations.
12. Keyboard operation, live-region feedback, mobile/tablet containment, refresh persistence, and browser-history behavior.

## Screen Matrix

| Surface | Header/layout | Filters | Loading | Sorting | Pagination | Validation/feedback | Actions/focus | Integrity/security | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Leave Types | Passed | Passed | Passed | Passed | Passed | Passed | Passed | Browser/API evidence passed | Locally verified |
| Leave Policies | Passed | Passed | Passed | Passed | Passed | Passed | Passed | Browser/API evidence passed | Locally verified |
| Policy Assignments | Passed | Passed | Passed | Passed | Passed | Passed | Passed | Exact lookup, overlap, import and RBAC passed | Locally verified |
| HR Leave Requests | Passed | Passed | Passed | Passed | Passed | Passed | Passed | Rejection validation, retry and persistence passed | Locally verified |
| Leave Balances | Passed | Passed | Passed | Server order | Passed | Passed | Passed | Maker-checker, tenant denial and PostgreSQL passed | Locally verified |
| Leave Year | Passed | Not applicable | Passed | Not applicable | Data-set dependent | Passed | Passed | Create, validation and transition cancellation passed | Locally verified |
| ESS Apply Leave | Passed | Passed | Passed | Passed | Empty-aware | Passed | Passed | API/PostgreSQL/attachment lifecycle passed | Locally verified; retention policy pending |
| ESS My Requests | Passed | Passed | Passed | Passed | Passed | Passed | Passed | Withdraw/cancel governance and duplicate suppression passed | Locally verified |
| MSS Leave Queue/History | Passed | Passed | Passed | Passed | Passed | Passed | Passed | Approve/reject, attachment and durable state passed | Locally verified |
| Leave Balance Report | Passed | Passed | Not applicable to local filtering | Passed | Passed | Passed | Passed | Export completeness and tenant/RBAC passed | Locally verified |
| Leave/Attendance Collisions | Passed | Passed | Not applicable to local filtering | Passed | Passed | Passed | Passed | Cross-domain report evidence passed | Locally verified |

“Implemented” is not a certification verdict. A screen becomes complete only after its applicable contract is exercised in a production-built browser with API and persistence evidence where required.

## Confirmed Audit Dispositions

- Global disabled button styling already uses `cursor: not-allowed`; page-specific duplication is unnecessary.
- Leave report filtering is synchronous over server-provided rows, so an artificial loading spinner is not required.
- Policy resolution uses POST because the request contains scoped resolution inputs, but it does not mutate business state.
- Full-document navigation after create/edit/decision is retained where it produces the canonical server-filtered destination and durable success receipt.
- MSS leave decision success toast now uses the shared five-second duration; errors use the shared eight-second duration.

## Completion Gate

- Run the Leave-only production build and one-worker browser suites against isolated PostgreSQL.
- Exercise desktop, tablet, and mobile representative viewports.
- Reconcile browser outcomes with API, PostgreSQL, audit, tenant, and role evidence.
- Record defects per screen; do not mark a screen complete from static source inspection.
- Preserve shared staging as unchanged unless separately authorized.

## Verification Record

Current-source verification completed on 2026-11-02 against task-owned PostgreSQL 16 and the production-built Next.js application:

- Connected Leave action suite: **17/17 passed** with one Playwright worker.
- Leave balance ledger suite: **8/8 passed** in Chromium, including independent pagination, page-size 12/25/50 behavior, empty and stale-page recovery, maker-checker approve/reject, retry, tenant/RBAC denial, keyboard scrolling, responsive screenshots and scoped axe checks.
- Leave import suite: **3/3 passed**, covering exact and fuzzy employee resolution, overlapping assignments, malformed priority/date/boolean/unit values, lookup retry, one-write behavior and PostgreSQL reconciliation.
- Connected report and leave-year suite: **11/11 passed** in Chromium, covering every report sort mode, committed filters, stale and empty pagination, browser history, complete export/manifest evidence, failure retry, leave-year maker controls, tenant/RBAC denial, mobile/tablet screenshots, keyboard scrolling and scoped axe checks.
- Focused Django/PostgreSQL regression: **12/12 passed**.
- Schedule, payroll-output and Leave runtime regression: **57/57 passed** on PostgreSQL 16 after replacing expired calendar fixtures, removing an illegal terminal timestamp rewrite and allowing supported guided roster patterns to normalize their generated steps.
- Attachment boundary regression: **6/6 passed** for empty, exact-limit, oversized, executable, spoofed and corrupt document inputs. The connected withdrawal browser case also passed client executable rejection, server spoofed-PDF rejection, pending-state preservation and the subsequent valid exactly-once withdrawal.
- Production build: **313/313 routes generated**; TypeScript, ESLint, Django system checks, migration drift and `git diff --check` passed.

Defects corrected during this verification:

- Leave balance page-size refresh now sends the newly selected page size instead of the previous render value.
- Leave balance browser-history changes reconcile client ledger state from URL filters.
- Balance and completion Playwright suites now invoke the guarded canonical fixture module instead of removed evidence-directory compatibility scripts.
- The report/leave-year Playwright suite now invokes the guarded canonical `prepare_final` fixture and uses current button semantics plus authenticated browser-session API checks.
- Predefined weekly roster templates now generate their documented rotation steps while custom weekly rotations still require explicit entries.

## Remaining Decisions

- `CRUD-02119` and `CRUD-02125` remain Partial. Employee-document replacement/removal and retention semantics require approved Product Owner and QA Owner policy; no approval record exists.
- `CRUD-05363` has additional current-source browser and PostgreSQL boundary evidence, but remains Partial until its full frozen audit/private-storage evidence contract is reconciled. `CRUD-05367` remains Partial pending complete browser isolation-feedback evidence; neither is promoted by analogy.
- Shared staging remains **136 Not Run**. No deployment or staging workflow was executed by this verification.
