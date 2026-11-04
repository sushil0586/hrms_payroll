# HRMS Document Surfaces Audit

Date: 2026-11-04

Verdict: **PASS (LOCAL CERTIFICATION)**

Scope:

- ESS -> Documents
- HR Admin -> Workforce -> Employee Documents
- Shared document review, reminder, download, validation, loading, table and pagination contracts

## Pre-remediation audit result

The initial audit found sound authorization and private-file foundations but gaps in the shared interaction contract. The findings below are retained as the pre-remediation baseline; the implemented and verified disposition is recorded in the certification section.

## ESS Documents findings

| Requested behavior | Status | Evidence and required correction |
| --- | --- | --- |
| Loading functionality | Partial | Filter updates expose `isFiltering` and a live status, uploads expose progress, and downloads use `AsyncDownloadButton`. Initial route loading and table-local overlay/skeleton are absent. Add route loading and preserve stable table dimensions during scoped refresh. |
| Sorting | Missing | No `sort` query exists in `page.tsx`, `DocumentCenterFilters`, table headers, or API request. Add server-backed sort allowlist and accessible sortable headers. |
| Header count clarity | Needs improvement | Counts exist inside `Document status`, but the page header has no concise total/pending/missing summary. Move or repeat canonical totals directly below the header and label global versus filtered/page counts. |
| Fixed header success | Partial | A durable `pageFeedback` receipt exists inside the status panel, not the upper page header. Persist the receipt at the page-workspace boundary and focus it after modal closure. |
| Three duplicate errors | Confirmed | Upload failure can render field errors, modal summary feedback, and an error toast simultaneously. Keep field errors plus one summary; suppress the toast for deterministic validation and retain toast only for asynchronous/transport failure. |
| Disabled not-allowed cursor | Defective shared styling | CSS declares `cursor: not-allowed` but also sets `pointer-events: none`; the pointer therefore lands on the parent and the cursor may not display. Remove pointer-event suppression while retaining native disabled behavior. |
| Hide pagination with no data | Missing | `PaginationBar` renders unconditionally after the empty state. Render it only when `total_count > 0`. |
| Ellipsis text/tooltip | Missing/inapplicable implementation | The document tables expose text buttons (`View`, `Upload`, `Replace`, `Download`) and no ellipsis action menu. If the approved design requires ellipsis, introduce an icon button with `aria-label`, visible hover/focus tooltip, and keyboard menu semantics; do not render raw `...` text. |
| Five-second success duration | Defective | Upload toast currently clears after 3.5 seconds. Standardize successful document toasts at five seconds. |

## HR Admin Employee Documents findings

| Requested behavior | Status | Evidence and required correction |
| --- | --- | --- |
| Loading functionality | Partial | Workspace sets `aria-busy` but does not render a visible table-local loading indicator. Reminder has button text state. Add route loading and a stable table overlay/status for filter, page, review refresh and reminder reconciliation. |
| Sorting | Missing | Query and queue have no `sort` property or sortable headers. Add a backend allowlist and stable sort with an ID tie-breaker. |
| Header count clarity | Needs improvement | Summary mixes global matching count with page-only pending/follow-up/expiry counts. Labels say “on page” but the visual hierarchy is unclear. Separate global queue totals from current-page diagnostics. |
| Fixed header success | Partial | Review/upload/reminder notices render inside the queue toolbar. Move durable success receipt to the upper workspace region and keep one five-second toast for immediate confirmation. |
| Three duplicate errors | Confirmed risk | Review forms can show a summary plus individual field errors; parent queue errors and action errors are separate but can remain visible across operations. Consolidate each operation to one summary and field messages, clear stale errors on new actions, and avoid duplicate toast text. |
| Disabled not-allowed cursor | Defective shared styling | Same global `pointer-events: none` conflict as ESS. |
| Hide pagination with no data | Missing | Pagination panel renders when `total_count` is zero. Hide the complete panel for an empty queue. |
| Remove pagination Apply button | Confirmed | Rows selector stores a draft and requires a separate Apply button. Change page size immediately and reset to page 1. |
| Ellipsis text/tooltip | Missing/inapplicable implementation | Current action is a visible `Inspect` button. No ellipsis control or tooltip exists. If converted, use the shared accessible action-menu pattern with a tooltip and keep Inspect available by keyboard. |
| Send reminder email | Partially implemented | UI calls `/employee-documents/reminders`; backend creates a deduplicated `documents.employee.expiry_attention` notification event. Actual email depends on an enabled email event/channel/template and delivery worker. Add UI outcome details and an isolated-provider integration test proving in-app/email routing, recipient, deduplication and audit. |
| Withdrawn document cannot be reviewed | Missing | Review is enabled whenever the user has `documents.verify`; record lifecycle status is not checked. Disable Review for withdrawn records in UI and reject forged PATCH review requests in the API. Provide an explanatory tooltip. |
| Approved-version download loader stops | Defective contract | “Download approved version” uses a normal `Link`/anchor in both detail and review surfaces instead of `AsyncDownloadButton`. Replace both with the shared async control and test success, failure, abort, repeated download and modal-close cleanup. |

## Existing controls that should be preserved

- Tenant-scoped document lookup and export permission checks.
- Private artifact download endpoints.
- Idempotent daily reminder key and duplicate suppression.
- Upload progress, uncertainty-safe feedback, and retained draft behavior.
- Version and review history.
- Employee and cross-tenant access denial.
- Focus restoration for current detail/review interactions.

## Development phases

### Phase D1 - Shared interaction corrections

- Correct disabled cursor behavior without weakening native disabled controls.
- Add shared five-second document toast and durable upper receipt.
- Consolidate validation feedback so field errors and one summary remain.
- Add accessible ellipsis/action-menu tooltip only where product design approves the action-menu pattern.

### Phase D2 - ESS Documents

- Add initial and scoped loading states.
- Add server-backed sorting and accessible headers.
- Clarify global/filtered/page counts.
- Hide empty pagination.
- Certify upload, replace, view, download, filter, sort, pagination, validation, refresh and responsive behavior.

### Phase D3 - HR Admin Employee Documents

- Add visible scoped loading, sorting and clear queue counts.
- Make page size apply immediately.
- Hide empty pagination.
- Move success receipt to the upper workspace region.
- Disable withdrawn review in UI and API.
- Replace approved-version links with bounded async downloads.

### Phase D4 - Reminder delivery

- Verify event definition, email channel, template and recipient resolution.
- Exercise one bounded isolated email provider.
- Verify in-app/email delivery, retry, deduplication, redaction, audit and failure feedback.
- Do not use real employee recipients.

### Phase D5 - Certification

- Fresh PostgreSQL and production-built Next.js.
- One Playwright worker initially.
- Desktop, tablet and mobile screenshots.
- Keyboard, focus, live-region, tooltip/menu and scoped axe checks.
- API, PostgreSQL, artifact checksum, audit, notification and tenant/RBAC reconciliation.
- Exact-ID cleanup and zero residual private files.

## QA acceptance matrix

1. Empty, one-row, one-page, multi-page and stale-page datasets.
2. Every supported sort field in both directions, stable across pagination and refresh.
3. Search plus every dropdown combination; Enter and Apply behavior.
4. Valid upload, missing fields, invalid type, spoofed file, oversized file, date errors and duplicate active category.
5. One summary plus field errors; no third duplicate error surface.
6. Success toast visible for five seconds and durable upper receipt survives modal closure/navigation.
7. Disabled controls expose native disabled semantics, not-allowed cursor and explanatory tooltip where needed.
8. Approved-version download returns to idle after success/failure and never traps modal closure.
9. Withdrawn document review is disabled and forged API PATCH is denied without audit success.
10. Reminder sends exactly one intended event per eligible document/day and reports skipped records truthfully.
11. Cross-employee, cross-tenant, anonymous and permission-limited access fail closed.
12. No horizontal page overflow; table scroll is labelled and keyboard operable.

## Initial decision

Proceed with D1 through D3 locally. D4 must use an approved isolated provider configuration. Do not claim the Documents module above 95% until D5 completes with all P0 controls passing.
# Document Surfaces Remediation and Quality Certification

## Certification verdict

**PASS (local certification)** for the remediated ESS and HR Admin document contracts. The production-built frontend, task-owned PostgreSQL tenant, real Django APIs, notification queue, responsive browser flows, and governed cleanup all passed. This is local qualification only and is not evidence of staging deployment or staging behavior.

## Implemented remediation

- Added route-level loading states for ESS Documents and HR Admin Employee Documents.
- Added stable server-side sorting for upload date, title, category, verification status, expiry, and HR employee ordering.
- Added sorting controls to both document queues and preserved sort state in scoped navigation/history.
- Hidden pagination when a filtered result set is empty.
- Removed the redundant HR page-size Apply action; changing page size now refreshes from page one.
- Moved durable success receipts above the document workspace and retained five-second transient success feedback.
- Reduced ESS deterministic upload validation to field errors plus one summary; server-failure toast remains reserved for uncertain/server outcomes.
- Preserved visible `Inspect` actions instead of introducing an ambiguous ellipsis-only control. Compact overflow menus must use the existing accessible action-menu and tooltip contract if later required.
- Replaced direct HR document download navigation with the shared async download control, including approved-version downloads, so loading always resolves to idle or an actionable retry state.
- Disabled review for withdrawn records in the UI and added an API-level `409` guard to prevent direct-request bypass.
- Restored a visible `not-allowed` cursor for disabled buttons by removing the CSS rule that prevented pointer hit testing.
- Certified reminder creation through the existing deduplicated document notification path and delivery through an isolated email backend. No live provider or real recipient was used.

## Verification results

| Gate | Result |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS |
| Production Next.js build | PASS (existing autoprefixer warning at `globals.css:4686`) |
| Django system check | PASS, 0 issues |
| Migration drift | PASS, no changes detected |
| PostgreSQL/API focused tests | PASS, 4 passed / 390 deselected |
| Task-owned document Playwright certification | PASS, 5/5 in one final run |
| HR Admin Playwright document campaign | PASS, 10 distinct scenarios (8 initial pass; 2 assertion-label failures passed on focused rerun) |
| Accessibility | PASS within the HR review dialog scan; zero violations in the selected rule set |
| Task-owned ESS browser coverage | PASS: upload validation, responsive containment, all sort modes, pagination persistence, empty state and disabled-action cursor |
| Isolated reminder delivery | PASS: one configured email, intended synthetic recipient, delivered queue/log state and sensitive-term redaction assertions |
| Cleanup | PASS: task-owned workspace cleanup verified absence after every browser run |

The PostgreSQL slice covers reminder notification creation and delivery, stable title sorting, and immutable withdrawn-document review. The browser packages cover all 10 ESS sort choices and all 12 HR queue sort choices, responsive layouts, filter/paging persistence, dialog focus and dirty-state protection, backend validation, duplicate-submit blocking, uncertain outcomes, RBAC, reminder receipts, keyboard flow, and accessibility semantics.

## Requested-point reconciliation

1. Loading: route loading plus scoped queue/history status is implemented on ESS and HR Admin.
2. Sorting: every exposed sort field/direction was exercised through the browser against real APIs.
3. Header counts: global matching totals and page-local counts are explicitly labelled.
4. Success feedback: durable upper receipts and five-second transient success toasts are implemented.
5. Duplicate errors: deterministic validation uses field messages plus one summary; uncertain transport failures use one toast.
6. Disabled actions: native disabled semantics remain and the visible cursor is `not-allowed`.
7. Empty pagination: the entire pagination surface is absent for zero results.
8. Page size: HR Admin applies immediately without a second Apply action.
9. Reminders: the API creates one eligible event and the isolated queue delivers it to the synthetic employee email.
10. Withdrawn review: UI action is disabled and a forged review API request fails with `409` without mutation.
11. Approved download: shared bounded async controls return from loading after completion/failure.
12. Ellipsis: **Not Applicable by current design**. Primary actions remain visible `Inspect`, `View`, `Upload`, `Replace`, and `Download` controls with accessible names. An ellipsis is not rendered as decorative text and is not needed to discover these actions.

## Residual limits

- No live email provider was contacted; provider account configuration remains an environment concern.
- No shared staging environment was changed or tested by this certification.
- The unrelated legacy ESS suite still references the absent `riya.sharma` seed, but it is superseded for this scope by the passing task-owned document certification suite.
