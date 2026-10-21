# HR Admin page audit

Date: 2026-10-19. Target: `https://hrms.accerio.in`. **Initial audit decision: functional standardization required; no acceptance PASS.** The user reports that staging was deployed. This audit inspects the running UI and local source separately; it does not establish that the deployed build is identical to the inspected local source.

Local source HEAD: `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161`; tracked worktree clean at final verification. Staging image/source equivalence was not established.

## Scope actually executed

- Inventoried all **146 HR Admin route files**: 118 static paths and 28 dynamic route patterns. Archetypes: 62 workspaces, 22 create forms, 22 edit forms, five other detail/review patterns and 35 reports. These are source-file classifications, not 146 independently tested workflows.
- Scanned route-local component imports, page API functions, permission-source signals, filter patterns and table/header usage. Each route has its own source references and required checks in the [coverage tracker](hrms-hr-admin-coverage-tracker.md) and [machine-readable inventory](../qa/evidence/hr-admin-page-audit/route-inventory.json).
- Opened all **28 top-level HR Admin navigation destinations** in a separate tab using the existing authorized signed-in Chrome session, plus Leave Policies and Attendance Records: **30 distinct routes with desktop render observations**. Main headings loaded and no document-level overflow was observed in the initial route sampling. This is not an accessibility or functional test pass for those pages. Subsequent Attendance pagination encountered a separately retained error below.
- Executed targeted non-mutating filter/history/selection interactions on Attendance and Leave Policies. No import/approval/archive/delete/bulk/close/payroll mutation was intentionally submitted, and credentials/cookies were not extracted. Server GET handlers may themselves materialize data; read-only UI interactions are not proof that backend reads have no side effects.
- No application source, deployed configuration or release-gate status changed. Only audit documents and local evidence were added. No new browser test-runner suite, API/PostgreSQL regression, responsive-device certification, screen-reader review or formal WCAG assessment ran.

The other **116 route patterns lack live browser coverage in this audit**. Dynamic forms need authorized real synthetic IDs; workflow changes need isolated fixtures. Inventory/heuristic signals must not be reported as completed functional certification. Longitudinal, cross-role, mobile and mutation coverage remains explicitly open.

## Confirmed defects and risks

| ID | Priority | Finding | Evidence / scope |
|---|---|---|---|
| HA-F01 | P1 | Attendance Back navigation restores filtered rows but not controls. | Reproduced: Absent → Apply → Clear → Back. URL contained `status=absent&page=1&page_size=25`, one result row, but Status showed All. `attendance-record-bulk-manager.tsx:127` seeds state from props once; page retains component identity across URL changes. |
| HA-F02 | P1 | A hidden selected Attendance record remains eligible for bulk submission. | Select a visible non-absent row, apply Absent: one visible checkbox, zero checked visible rows, **Set status (1)** remained enabled. No bulk action executed. `attendance-record-bulk-manager.tsx:201` preserves selected IDs; `handleBulkAction` sends them directly. |
| HA-F03 | P1 | Attendance pagination commits unsubmitted draft filters and requests the old next-page position. | Choose Absent without Apply, click Next: URL becomes `status=absent&page=2&page_size=25`. `goToPage` uses draft values through `buildFilterHref` around line170. The following render hit a network-error screen; that transport failure's root cause is **unclassified**, not proven to be caused by pagination. |
| HA-F04 | P2 | Apply is a decorative control in Leave Policies/Types while filtering is already immediate. | Policies:9rows → choose draft →1row before Apply; click Apply →1row; reload →9rows, no filter URL. Both buttons have no handler and `type="button"`: `leave-policy-list.tsx:174`, `leave-types-workbench.tsx:88`. Types behavior verified in source only. |
| HA-F05 | P1 | Reports filter/count a bounded initial server page as though it were the report dataset. | Source: Attendance Register fetches page1/500, Documents and Lifecycle reports also request500 but their endpoints cap at100. Reports then filter/sort and paginate that array without following `has_next` or using `total_count`. Large-data runtime reproduction remains open. This can omit off-page matches and disagree with full-scope exports. |
| HA-F06 | P1 | Attendance Register filter-fetch failures do not produce explicit error/retry feedback. | Source: `attendance-register-report-workspace.tsx:101` converts non-OK responses to null; a network catch restores original items. Active filters can remain above stale/unfiltered rows. Fault injection was not executed against staging. |
| HA-U01 | P2 | HR Admin does not consume the same Accerio shell theme as ESS/MSS. | `workspace-chrome.tsx:293` adds `.accerio-workspace` only for employee/manager tones. `accerio.css:1` explicitly retains the legacy admin theme. Actual HR Admin renders use the old HRMS/blue/dark-sidebar presentation. This was intentional scope isolation previously, not evidence of an accidental CSS regression. |
| HA-U02 | P2 | Repeated context blocks reduce usable workspace and hierarchy. | Actual Attendance/Leave screens repeat page title/description, operations banner, summary strip and queue header. Thirteen route dependency scans flag the header/operations-strip composition for review. Reduce duplication without deleting useful operational context. |

Full source paths and exact reproduction observations: [defects.json](../qa/evidence/hr-admin-page-audit/defects.json). Two Attendance screenshots were actually captured and displayed in the conversation; local PNG files were not exported, so no screenshot-path claim is made.

### Attendance failure classification

The filter/control mismatch, hidden-selection state and draft-pagination URL are real browser-observed UI defects. Existing backend authorization/locks are not shown bypassed. The rendered error after the pagination test said “HR admin could not load the current workspace” and “network error”; the captured browser log was `TypeError: network error`. The subsequent public `/login` and `/api/v1/health/` probes returned200. That recovery does not prove the cause environmental or excuse the failure. Preserve it as an open transport/application diagnostic with timestamps; inspect correlated server/request lifecycle logs before changing network/session code.

## Shared implementation findings

The repository already has the required foundation. `WorkspaceChrome`, `WorkspaceStandardHeader`, `WorkspaceStandardPanel`, `WorkspaceFilterBar`, `WorkspaceDataTable`, named keyboard-scroll regions, `PaginationBar`, existing dialogs/forms and Accerio semantic tokens should be reused. `WorkspaceFilterBar` currently renders a div; it supplies styling, not form submission, URL synchronization or request state.

Ten queue components initialize filter state directly from `currentFilters`: Attendance Records, Regularizations, Leave Requests, Documents, Lifecycle, Onboardings, Probation Reviews, Movements, Exits and Notifications. Only Attendance history failure was reproduced live; do not label all ten broken from the signature alone. Test each with the same shared state contract.

Inventory signals also flag 68 route closures with local array filtering and 68 with raw tables. Those are **review signals, not counts of defective pages**: local filtering is valid for a proven complete dataset, and a raw semantic table can be accessible. Confirm completeness, global sort/count semantics, named overflow behavior and responsive action access before replacing stable components.

Employees currently loads the full array then filters/paginates it locally (`employees/page.tsx:256`), although `getHrAdminEmployeePage` already exists (`lib/api.ts:455`). This is a reuse/performance candidate, not a proven truncated-filter defect: the unpaginated array contract must be checked before changing it. Preserve manager/readiness semantics, access controls and detail navigation in any migration.

## Proposed shared target to implement

See [the common experience standard](hrms-hr-admin-experience-standard.md). It defines one compact shell/header hierarchy, truthful scoped metrics, a real filter form with draft/committed URL state, safe selection, consistent tables/details/forms, explicit errors and responsive/keyboard acceptance. Domain workflows remain different where their contracts differ; visual consistency must not invent universal approvals or payroll rules.

Default filter behavior: draft edits → Apply/Enter → URL/state/result synchronization → page1. Pagination/export uses committed state. Clear commits defaults and clears selection. Back/Forward/reload restore the same state. Local-immediate filtering is allowed only for explicitly complete catalogs with no misleading Apply action. Sorting/export must use matching full-dataset semantics or clearly disclose a narrower scope.

## Remediation order and complexity

| Slice | Scope | Complexity | Exit evidence |
|---|---|---|---|
| HR-A1 | Attendance filter/history/selection pilot; classify the network failure | M | Deterministic reproductions fail before/pass after, no hidden selected rows, committed-state pagination, backend lock/RBAC unchanged. |
| HR-A2 | Shared filter form/query state and ten queues; Leave Policies/Types | M–L | Reusable adapter tested on both server queues and complete catalogs, Enter/Clear/history/pagination matrix per route. |
| HR-A3 | 35 reports: projection limits, screen/export/count parity and errors | L | Match beyond initial page, stable server ordering, scoped totals, identical export query and fault/retry evidence; API work explicitly reviewed. |
| HR-A4 | Accerio HR shell plus 22 create / 22 edit and master/detail templates | L | One header/spacing/status/form/dialog standard; permissions, validation, focus and mobile regression. |
| HR-A5 | Payroll/statutory/provider/close consoles and remaining operational hubs | L/high impact | Preserve all calculations/audit/history; synthetic role and lock negatives; no new provider or live-rail capability. |
| HR-A6 | Complete route acceptance and impacted ESS/MSS neighbors | L | Chromium/Firefox/WebKit, responsive/keyboard checks, appropriate API/PostgreSQL regressions, builds and cleanup; exact executed totals. |

Do not perform a one-shot global CSS or state rewrite. Start with the Attendance pilot because its selection ambiguity can affect which records an administrator intends to change. No live fix or deployment was performed during this audit.

## Evidence and open acceptance

[Route inventory CSV](../qa/evidence/hr-admin-page-audit/route-inventory.csv), [inventory summary](../qa/evidence/hr-admin-page-audit/inventory-summary.json), [API function/path index](../qa/evidence/hr-admin-page-audit/api-function-paths.json), [browser observations](../qa/evidence/hr-admin-page-audit/browser-observations.json), [defects](../qa/evidence/hr-admin-page-audit/defects.json) and [post-error public health](../qa/evidence/hr-admin-page-audit/public-health-after-navigation.json) are retained. `inventory.py` can regenerate source signals; browser results remain a separate manually observed artifact and must not be overwritten as passes by regeneration.

**Current status: audit baseline and standard prepared; functional remediation and all-route acceptance OPEN.** Existing ESS certification and production gates are not advanced. All 146 route files are accounted for; 30 have desktop render observations, two have focused filter interactions, and zero mutation workflows are certified by this assessment.
