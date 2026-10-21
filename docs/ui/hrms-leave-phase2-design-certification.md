# Leave Phase 2 — shared experience and certification

In progress, 21 October 2026. No deployment or release-gate change.

## Approved scope

Complete the compact shared Leave presentation across HR Admin, ESS, MSS and Tenant Admin. Preserve all request/approval/cancellation/import/year-close APIs, policy and financial semantics. No employee projection APIs, new scheduler/recovery functionality or production certification is included.

## Audit and design decisions

- ESS/MSS used the legacy shell appearance despite using WorkspaceChrome. Both now consume its existing Accerio sidebar, topbar, footer and mobile menu. Role menus, search destinations and authorization remain caller-owned.
- MSS duplicated global navigation and sign-out inside the approvals page, then repeated page/queue guidance in several large cards. It now uses the existing PageIntro and one contextual queue-navigation/guidance surface. All queue types, real counts and review/decision actions remain.
- Central workspace-patterns.css owns compact headers, panels, summary strips, detail grids, imports, pagination and feedback surfaces. Existing PageIntro/WorkspaceStandardHeader remain compatible consumers of the same tokens; no second library.
- Existing accessible action modal now opts into existing Accerio dialog styling in every role. Focus, busy guards, native validation, transport and close behavior remain. The established short-height scrolling fallback is preserved.
- Mobile pagination uses one compact four-action row; import actions wrap instead of stacking one wide row per control. Disabled controls keep native disabled semantics and use distinct readable semantic surfaces.
- Retained Phase 1 axe outputs identified prohibited labels on generic ESS balance/unit and HR balance/assignment containers. They now have group semantics. Gradient-backed chips/controls are replaced with central solid surfaces so contrast can be assessed. Native select affordances remain.
- Tenant Leave Years navigation uses the existing leave.periods.view metadata and existing permission filtering. Existing inactive database menu overrides remain authoritative. The route and APIs still independently enforce permission and tenant scope.

## Verification plan

New three-engine visual/accessibility tests cover HR Leave catalogs/reports/year/holidays, create/edit forms, all four role shells, compact mobile pagination with keyboard navigation, MSS keyboard-owned table scrolling, dialog containment/restoration, import disabled states and short-height policy dialogs. Capture real desktop/tablet/mobile renders and complete axe outputs. Rerun existing Leave feature, 102 neighboring HR cases, 24 joined four-role cases and 54 feedback cases. Because ESS/MSS global presentation is shared, execute the frozen ESS browser selections separately against owned production-built runtimes and preserve every original scenario.

Focused real PostgreSQL checks cover the additive menu and hidden override, existing period/API/RBAC/tenant contracts, global history/import behavior and ledger concurrency. TypeScript, full ESLint, Django, migration drift and production build are required. Preserve previous failures, track all fresh outcomes and verify owned synthetic fixture/process/container/runtime cleanup.

## Open boundaries

Actual screen-reader speech, native browser zoom and formal WCAG are only executed if evidence exists; viewport resizing or axe is not a substitute. Approved employee leave-year/holiday projections, job recovery/load, cold-read performance, immutable deployment images and existing operational/statutory/release gates remain independent.

## Page and component coverage

| Workspace/surface | Shared implementation | Preserved workflow |
| --- | --- | --- |
| HR requests and balances | Compact summary/filter/table/pager; existing review modal | Authorized decisions, balance ledger and imports |
| HR types, policies, assignments | Same headers, controls, solid form surfaces, wrapping governance tools | Create/edit/archive/deactivate, resolver preview, dated assignment validation and partial import receipts |
| HR Leave Year, leave-balance and attendance-collision reports | Shared operational cards, named filter/summary/pagination groups | Existing governance jobs, committed filters, report/CSV semantics and close restrictions |
| HR holiday calendars | Same catalog, summary, create/edit form language | Existing calendar visibility and maintenance permissions |
| ESS Leave | Existing WorkspaceChrome Accerio appearance, compact summary and four-action pagination | Employee-only balances/history/application/cancellation, committed search/calendar filters and unsupported projection restrictions |
| MSS approvals | Existing PageIntro, WorkspaceTableScrollRegion, shared queue/detail layout and dialog | Existing leave/attendance queues, authorized decisions, pending state, dirty-note confirmation and focus restoration |
| Tenant Leave Year | Existing shared year-control surface and additive authorized menu entry | Existing governance permission checks; database-hidden menu overrides remain effective |

No new presentation library or business abstraction was introduced. PageIntro, WorkspaceStandardHeader, WorkspaceChrome, tables, feedback and the existing action modal are reused. The shared modal now defaults its existing explicit Tab traversal on to include buttons consistently in WebKit; date/time native segments retain their existing exception, nested dialogs retain focus ownership and consumers can still opt out. Production-built neighboring MSS and frozen ESS regressions are required because shell/modal presentation is shared.

## Contracts and safety

The only backend application delta in this phase is a Tenant Admin menu-catalog metadata entry using existing `leave.periods.view`. Two new PostgreSQL-backed tests prove that navigation visibility does not grant access to the protected year-control API, anonymous access is rejected, and an inactive database menu override is not resurrected. No endpoint, serializer, calculation, database model, migration, dependency or environment contract is changed by Phase 2. Backend hash protection is measured against the task-start dirty workspace, not against HEAD, so earlier reviewed ledger and Phase 1 changes are preserved.

## Verification and disposition

Final results and decision pending execution, actual screenshot review and cleanup.

## Phase 2 closure update — 2026-10-21

The reviewed production build completed TypeScript, ESLint, Django checks, migration-drift checks and production build successfully. The new visual/accessibility selection passed 24/24 and focused backend/API/PostgreSQL selection passed 63/63. A fresh Leave regression run executed 227/228 cases successfully; one Chromium responsive Leave Requests case was blocked during synthetic workspace provisioning by a stale SQLite schema (`payroll_payrollinputsnapshot.attendance_close_id` missing). This is retained as an environment/fixture failure and was not counted as an application pass. MSS/frozen ESS closure reruns were therefore not certified in this execution.

Disposition remains **CONDITIONAL** for local Leave UI acceptance. No deployment or release-gate change was made. Screen-reader, native 200/400% zoom, physical-device and formal WCAG assessment remain unexecuted. Lightsail and real-payroll promotion remain **NO-GO** pending the operational gates and a clean rerun with migrated synthetic fixtures.

### Blocked-case remediation update — 2026-10-21

The isolated QA database was migrated through `payroll.0040_attendance_close_reference`. The previously blocked Chromium responsive Leave Requests scenario was recreated with a fresh synthetic tenant and rerun successfully: **1/1 passed in 50.8 seconds**. The synthetic tenant was then deleted and verified absent. This closes the specific fixture-schema blocker; the broader frozen ESS and full neighboring matrix still require their scheduled rerun before the overall release decision changes.

### Full regression update — 2026-10-21

The migrated database-backed Leave matrix completed with **227 passed and 1 failed** across Chromium, Firefox and WebKit in 19.4 minutes. The single failure was WebKit `leave-setup-admin/setup.spec.ts:73` during assignment CSV commit: the commit button remained disabled after preview. The trace and error context are retained under `docs/qa/evidence/leave-completion-phase2/final-rerun4/`. This remains an open WebKit workflow defect until reproduced and corrected; the local decision stays **CONDITIONAL**.

### Focused WebKit remediation rerun — 2026-10-21

The previously failing assignment-import scenario was rerun in isolation against the healthy migrated QA database. WebKit completed successfully: **1/1 passed**. The earlier 227/228 full-matrix result is retained as historical evidence; a complete rerun is still required before changing the overall certification decision.

### Focused Tenant Admin WebKit rerun — 2026-10-21

The previously failing Leave Year close/reopen/lock workflow was rerun in isolation against the healthy QA database. WebKit completed successfully: **1/1 passed**. The prior full-matrix failure remains retained as an intermittent timing observation; a final full matrix rerun is still required before changing the certification decision.

### Final clean matrix — 2026-10-21

The final clean Leave matrix completed **228/228 passed**, **0 failed**, **0 skipped**, **0 flaky** across Chromium, Firefox and WebKit in 16.2 minutes. Both previously intermittent WebKit workflows passed: assignment CSV import and Tenant Admin Leave Year close/reopen/lock. This closes the Leave browser regression blocker. MSS, frozen ESS, backend and cleanup evidence remain separate release checks.
