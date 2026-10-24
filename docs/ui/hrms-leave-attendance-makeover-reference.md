# Leave and Attendance makeover: implementation reference

Snapshot: 21 October 2026. Repository baseline: `07ccc8e0` (`feat: complete attendance and leave admin workflows`), following `2dbfecf0` (`feat: complete ESS experience and staging operations`). This is a source/documentation reconstruction, not a new runtime certification or live staging review.

Use the [cross-workspace UI/UX standard](hrms-ui-ux-standard.md) for new implementations and the [adoption checklist](hrms-ui-ux-screen-adoption-checklist.md) for review. This record explains the examples behind that standard. The records below overlap in coverage and use different artifacts: their pass counts must not be added into one product total.

## 1. What the makeover established

The implementation converges on existing Accerio tokens and shared components rather than a second design system. It replaces repeated banners, legacy role chrome, oversized sections and inconsistent action surfaces with compact headers, useful summaries, consistent query controls, readable tables and accessible action dialogs.

The work also corrected functional problems revealed during design review: incomplete report populations, stale browser-restored filters, invalid bulk selections, asynchronous form lifetime errors, ambiguous import identities, misleading balance summaries, stale mutation views and streamed navigation failures. Future adoption must preserve those fixes; matching a screenshot alone is insufficient.

## 2. Implemented scope by workspace

| Workspace | Leave | Attendance | Important boundary |
| --- | --- | --- | --- |
| HR Admin | Applications/review; balances/ledger and operations; types/policies/assignments with create/edit/import; Leave Year; balance report | Operations; Records/edit/import; regularizations/review; monthly close; shifts; employee assignments; roster templates; attendance policies/assignments; holiday calendars; report landing and five reports | Attendance family covers 30 route patterns; not every possible policy/custom-role combination |
| ESS | Own entitlements, application/evidence, history/detail, approval steps, withdrawal/cancellation; later full-history query/calendar and shared presentation | Complete monthly calendar/list, selected-day details, stored shifts/hours/exceptions, own regularization submission/history, timezone/finalized protection | Existing employee-effective leave-year/holiday projections remain unavailable; missing attendance is not inferred absence |
| MSS | Shared Accerio shell and compact approvals queue/detail/decision presentation; duplicate global actions removed | Existing attendance queue participates in shared approvals presentation and preserved decision contracts | No completed broad standalone MSS attendance redesign is claimed |
| Tenant Admin | Shared shell/year-control presentation and authorized Leave Years navigation entry | Listed in the unified convergence plan | Menu entry preserves existing permission and database-hidden overrides; full attendance governance convergence is not certified |

The [unified Attendance plan](hrms-attendance-unified-makeover-plan.md) remains a planning baseline. It is not evidence that every role's Attendance surface has completed the same rollout. At this snapshot that plan and the HR Admin standardization evidence directory are untracked in Git; tracked certificates link to local evidence which needs deliberate inclusion when packaging the documentation for another checkout.

## 3. Shared shell and page language

The [19 October shell/dialog review](hrms-shared-shell-dialog-design-review.md) recorded legacy problems and recommendations, before implementation: a narrow dark HR sidebar, crowded topbar, oversized long-form popup, decorative tab semantics and internal implementation copy.

The [global shell certificate](hrms-hr-admin-global-shell-certification.md) records the later implementation and scoped verification. Shared `WorkspaceChrome`, HR adapter and `workspace-shell.css` supply the Accerio shell. The later Leave Phase 2 extends shared appearance through ESS/MSS and consolidates MSS page hierarchy. Do not read the early proposal's “no implementation” status as the final state, or its absence of a footer as a requirement to remove the implemented compact shared footer.

Page content uses `PageIntro`, existing workspace panels/fields, `MetricTile`, shared status badges, named table scroll regions, pagination and `HrAdminActionModal`. The central `workspace-patterns.css` carries reusable compact styles. Role menus and business actions remain caller-owned.

## 4. HR Admin Leave progression

| Slice | Delivered behavior / reusable lesson | Primary record |
| --- | --- | --- |
| Applications | Compact request queue and review, committed filtering/paging, guarded decisions/overrides and explicit outcomes | [Applications](hrms-hr-admin-leave-applications-certification.md) |
| Balances | Ledger/operations presentation, scoped selection and governed mutation/import feedback | [Balances](hrms-hr-admin-leave-balances-certification.md) |
| Setup | Types, policies and dated assignments; consistent list/create/edit, validation, imports and governance states | [Setup](hrms-hr-admin-leave-setup-certification.md) |
| Year/report | Reasoned close/reopen/lock, duplicate guards, durable jobs, complete report population and export/search parity | [Final supported workflows](hrms-hr-admin-leave-final-certification.md) |
| Re-audit | Found mixed-unit aggregates, ambiguous policy names, incomplete lookup and unsupported risk interpretations | [Historical re-audit](hrms-hr-admin-leave-reaudit.md) |
| Correctness/feedback | Canonical quantity interpretation, ambiguity rejection, readable backend errors, preserved inputs, focus and confirmed-save receipts | [Correctness](hrms-hr-admin-leave-correctness-certification.md), [feedback](hrms-leave-feedback-certification.md) |
| Four-role closure | Joined real application/approval/cancellation and year history; streaming/hydration and shell issues investigated | [Initial assessment](hrms-leave-four-workspace-certification.md), [later blocker closure](hrms-leave-blocker-closure-certification.md) |
| Functional Phase 1 | ESS filtering before pagination, complete historical type/calendar projections, exact import identities/conflict lookup | [Phase 1](hrms-leave-functional-completion-phase1-certification.md) |
| Design Phase 2 | Shared role shell, compact MSS hierarchy, solid surfaces, compact mobile pagination/import layout, semantic group fixes and shared dialogs | [Phase 2 and closure updates](hrms-leave-phase2-design-certification.md) |

The re-audit is a historical findings list, not a current unresolved-defect inventory: later correctness/completion certificates address parts of it. Likewise, the initial four-workspace FAIL is followed by explicit blocker closure; retain both for traceability.

### Functional fixes that must survive future styling

- Full report collection replaced first-page truncation. Stable ordering and matching search semantics keep UI/CSV populations meaningful.
- Native committed GET forms preserve URL scope; paging/export cannot consume unapplied drafts. Filter-subtree restoration handles browser-persisted values without resetting business workspaces.
- Capturing a form before an awaited request avoids accessing an expired event `currentTarget` after a successful create.
- Governed year transitions collect the operator's actual reason rather than inventing authorization claims. Durable response/polling reconciliation avoids refresh/reload transport races.
- Debounced assignment checks are cancelled before save/navigation; stale results cannot overwrite current feedback.
- Reserved/available quantities use their canonical backend meaning. Mixed units and unsupported risk/financial interpretations must not reappear.
- Import lookup rejects ambiguous identity; exact employee-code reads and complete authorized policy/pair checks replace loaded-page guesses.
- Preview becomes stale when relevant inputs change. Partial writes and supplementary audit uncertainty are reported separately.

## 5. ESS Leave and Attendance patterns

[ESS-3 Leave](hrms-ess3-leave-certification.md) established own-scoped entitlement/application/detail/evidence and configured lifecycle behavior in shared Accerio content. Its original page-local filters were explicitly bounded. [Functional Phase 1](hrms-leave-functional-completion-phase1-certification.md) later applies search/type/UTC-period/date/day filters before pagination and supplies complete matching calendar counts/historical filter types. Do not copy the earlier page-local limitation into a new implementation.

Source entry points: `web/src/app/ess/leave/leave-workspace.tsx`, its route page, and `web/src/app/ess/leave-request-lifecycle-actions.tsx`. Preserve evidence authorization, backend chargeability/approval decisions, policy-controlled withdrawal/cancellation and authoritative post-action refresh. Generic history counts are not entitlement calculations.

[ESS-2 Attendance](hrms-ess2-attendance-certification.md) replaced a limited latest-record view with an authorized bounded monthly calendar and independently paginated list/history. It includes every date and uses **No record** for missing data. Stored daily detail, tenant timezone, explicit UTC correction inputs, day/list navigation, history deep links and finalized protections are part of the contract. Source is under `web/src/app/ess/attendance/` with its own approved calendar presentation; calendar-specific CSS does not justify cloning shared shell/filter/dialog styles.

After a correction succeeds, a failed read refresh disables further correction actions until GET recovery. It must not repeat POST. Fast day clicks reuse the already authorized month rather than triggering competing reads. Finalized historical rows do not show live current-policy derivation as historical evidence.

## 6. HR Admin Attendance family

The [A1 Records pilot](hrms-hr-admin-a1-attendance-certification.md) established bounded records safety and shared patterns. The [attendance-family certificate](hrms-hr-admin-attendance-family-certification.md) expands these across 30 routes, with the exact inventory in `docs/qa/evidence/hr-admin-standardization/attendance-family/routes.json`.

Implementation entry points under `web/src/app/hr-admin/`:

- `attendance-records/`: committed filters, page-scoped bulk eligibility, protected edit/import and real read failure boundaries.
- `attendance-regularizations/`: named GET filter form, committed pagination, date validation, canonical page recovery and review.
- `attendance-close/`: ordered reads, loading/empty/error states, guarded mutations, real snapshot values and a reason dialog for reopen.
- `shifts/`, `employee-shift-assignments/`, `shift-roster-templates/`, `attendance-policies/`, `attendance-policy-assignments/`, `holiday-calendars/`: shared catalog/form/table language with each route's established query contract.
- `reports/attendance*`, `reports/leave-attendance-collisions/`, `reports/roster-rollout-audit/`: complete authorized source collection, consistent search and explicit failure instead of partial reports.

Immediate catalogs/reports use the shared immediate-query hook; paginated assignment/roster queues use committed GET forms. A single universal Apply conversion would regress this documented distinction.

The report assembler requests source pages of 100, verifies population/ID completeness and enforces a 10,000-row interactive bound. A changing population is retried once. Separate screen/export reads are not a database snapshot, and equal-count concurrent value changes are not proven detectable.

One actual WebKit defect exposed unreliable reopen focus restoration after pointer activation; the real opener is focused before the modal opens. Browser-restored assignment/roster filters were also reproduced and fixed at the shared GET boundary. Future UI cleanup must retain these behaviors.

## 7. MSS and shared actions

Source entry points: `web/src/app/mss/approvals/page.tsx`, `manager-decision-panel.tsx` and the existing review-action component. The page now uses `PageIntro`, shared table scrolling/status/pagination and one contextual queue guidance surface. Leave, attendance and history queues retain real counts, detail access and existing authorization.

The modal remains the shared existing lifecycle despite its HR-specific component name. Dirty decision notes, duplicate prevention, backend intermediate/final decision meaning, error focus and opener restoration are behavioral requirements. Do not recreate a manager-only dialog or copy global sign-out/workspace navigation into its page.

## 8. Latest recorded evidence and limits

These are documentation-reported executions, not checks newly run while preparing this reference.

| Campaign | Latest relevant recorded outcome | Interpretation |
| --- | --- | --- |
| HR global shell | 15 main browser passes + 3 supplementary responsive passes | Scoped shell PASS; not whole-product acceptance |
| ESS-2 Attendance | 24 browser and 28 API/PostgreSQL passes | Scoped functional PASS; release conditional |
| ESS-3 Leave | 75 browser passes including ESS neighbors; 66 backend passes | Historical artifact; later Leave changes have their own selections |
| HR Leave final | 153 runner executions, including 3 Node collector cases; 72 backend passes | Supported Year/report and neighboring family scope |
| Leave blocker closure | 309 final executions comprising 297 UI executions + 12 helpers; 170 backend executions / 160 distinct checks | Repeats included; scoped function PASS, four-role acceptance conditional |
| Leave functional Phase 1 | 255 distinct project/case combinations, including helpers | Not a fresh frozen ESS-204 execution |
| Leave Phase 2 | Final clean Leave browser matrix 228/228; separate 24/24 visual/accessibility and 63/63 focused backend | Prior failed/intermittent runs retained; remaining MSS/frozen ESS/cleanup checks remain separate |
| HR Attendance family | 186 browser + 12 utility executions; 36 backend passes; separate neighbor/repeat proofs | Local function PASS; overall family experience conditional |

Phase 2's headings initially say “In progress”; its appended final clean-matrix update records the later 228/228 result. Do not stop reading at an earlier 227/228 failure or isolated rerun. Conversely, the final browser result does not certify separately pending selections.

Evidence is in each certificate's linked root. HR Attendance includes 270 primary route screenshots (30 × three widths × three engines), logs, failure traces, source/build provenance, accessibility outputs and cleanup receipts. Image capture totals are not counts of individually reviewed images.

Remaining boundaries include broader affected/frozen-role regressions where pending; actual assistive technology/native zoom/physical devices/formal accessibility where unexecuted; scale and point-in-time report consistency; employee projection APIs; scheduler/worker recovery and production infrastructure/statutory gates. The precise limits differ by campaign and must be read in its certificate. No blanket accessibility, production or deployment acceptance follows from visual convergence.

## 9. Recommended reference order for the next screen

1. Read the shared standard and identify the target page pattern.
2. Inspect the closest source example from this map and its latest certificate/closure.
3. Check the shared component API and current styles; preserve its navigation, hydration, error and focus contracts.
4. Record domain differences instead of copying Leave/Attendance policy into another module.
5. Complete the adoption checklist, attach real workflow and visual evidence, and update the owning coverage tracker.
