# Cross-workspace UI/UX gap tracker and rollout

Implementation follow-up: [shared UI/UX rollout and verification](hrms-ui-ux-rollout-certification.md). The original discovery/evidence baseline below remains historical; presentation adoption does not imply full workflow acceptance.

Audit date: 22 October 2026. Scope: current repository source and existing local documentation. No fresh browser, API, accessibility or staging execution. No application behavior changed by this audit.

Baseline: [shared standard](hrms-ui-ux-standard.md), [makeover reference](hrms-leave-attendance-makeover-reference.md) and [screen adoption checklist](hrms-ui-ux-screen-adoption-checklist.md).

## Inventory and interpretation

The current census contains **190 route patterns**: HR Admin 146, ESS 10, MSS 3, Tenant Admin 12, Platform Admin 10, Finance Manager 1, Support 2, and six public/access/documentation routes. A dynamic route represents potentially many records/variants. Child components, dialogs and runtime role combinations are not additional route counts.

- [All routes and evidence mappings](hrms-ui-ux-route-inventory.md)
- [Machine-readable inventory](hrms-ui-ux-route-inventory.json)
- Regenerate with `python3 docs/ui/tools/build_ui_ux_inventory.py` from the repository root. Review curated evidence mappings and update the snapshot date when intentionally refreshing the baseline.

| Status | Count | Meaning |
| --- | ---: | --- |
| aligned-scoped | 48 | Prior documentation explicitly covers this route's shared presentation; overall acceptance may remain conditional. Not a fresh pass or proof of every control. |
| partial-evidence | 8 | ESS implementation/review evidence exists; full current-standard alignment needs per-route reconciliation. |
| partial-shell | 11 | Tenant routes inherit the adopted shell and have prior shell evidence; their complete page workflow/layout is not accepted by this audit. |
| pending-review | 123 | Current-standard route acceptance has not been established in this audit. This is an evidence gap, not a claim that all 123 screens are visually defective. |

Every route has a next-review item below. The 48 scoped mappings include the exact 30-route HR Attendance family, 13 HR Leave routes, the Employee directory, ESS Leave/Attendance, MSS approvals and Tenant Leave Year. Overlapping campaign pass counts are not aggregated. Historical broad feature tests elsewhere in the repository do not automatically establish current UI/UX acceptance.

Source scanning follows literal local import/re-export dependencies and records selected shared component signals. Transitive presence can come through a utility and does not prove that a component renders. Absence can reflect another valid wrapper. Runtime permissions, lazy branches, dynamic imports, every ancestor layout and live browser behavior need explicit review. Fresh browser review is false for every row.

## Prioritized work register

Priority reflects recommended implementation order and reuse value, not an inferred production incident severity. P1 = next bounded work; P2 = subsequent screen-family rollout; P3 = later supporting surfaces. No person is assigned by this tracker.

### G01

**P1 — Reconcile the completed reference family and close cross-role acceptance gaps.**

Scope: 30 HR Attendance routes, 13 HR Leave routes, MSS approvals, ESS Leave and Tenant Leave Year. Their implementation is already documented; start from the latest closures rather than redesigning them again.

Evidence: [Attendance family](hrms-hr-admin-attendance-family-certification.md), [Leave Phase 2](hrms-leave-phase2-design-certification.md). Phase 2 records a clean 228-case Leave matrix but keeps MSS/frozen ESS/backend/cleanup evidence separate. Historical isolated passes must not be substituted for pending complete affected selections.

Next action: reconcile the existing certificate selections, shared-component changes and exact final artifact; execute only genuinely pending affected-role checks and review current desktop/mobile/short-height render states. Keep manual accessibility, large-report and operational limits explicit. Exit: current build/source provenance and a precise scoped acceptance update, with no blanket product or deployment claim.

### G02

Makeover checkpoint: [Phase 2 directory/detail implementation and verification](hrms-employee-management-phase2-makeover.md) follows the fresh Phase 1 design baseline. This bounded slice does not complete standalone create/edit, access/bank redesign or imports; those remain Phases 3–5 in the makeover plan.

**P2 — Employee detail, create/edit, bank and access surfaces.**

The directory has [scoped standardization evidence](hrms-hr-admin-employees-standardization-certification.md); do not extend its acceptance to the four child route patterns automatically. Verify whether existing create/edit dialogs and imports match the new baseline in their current consumers.

Next action: inventory owned form/dialog components, field governance, filter selection, detail navigation and permission separation. Reuse shared section/validation/focus patterns. Exit: actual create/edit/error and read-only workflows, bank/access permission negatives, mobile long forms and directory regression with scoped evidence.

### G03

Implementation checkpoint: Presentation adoption implemented in ESS Attendance; current verification is recorded in the rollout report. The original ESS ownership/calendar/correction contract is preserved.

**P1 — ESS Attendance convergence review.**

The [ESS-2 certificate](hrms-ess2-attendance-certification.md) establishes a real monthly calendar/list and corrections contract; later shell/shared-table changes have their own affected evidence. The [unified Attendance plan](hrms-attendance-unified-makeover-plan.md) remains a plan, not evidence of a second completed whole-role makeover.

Next action: compare actual current ESS Attendance renders with HR/MSS shared patterns and verify only concrete differences. Preserve explicit timezone, No record, finalized-history meaning, calendar/list/back navigation and independent correction history. Exit: reviewed desktop/mobile/short-height and keyboard states plus own-scope/closed-history regression; no invented punch or projection functionality.

### G04

**P2 — Reconcile the other eight ESS routes.**

Dashboard, Profile, Documents, Payslips, Statutory Declarations, Requests, Notifications and Settings have substantial earlier implementation and remediation history in the [ESS tracker](hrms-ess-coverage-tracker.md). They are not untouched legacy screens.

Next action: reconcile latest certificates per route against subsequent shell/modal/filter changes; inspect current forms, empty/error/disabled and narrow/zoom states. Keep existing statutory/publication/storage gates distinct. Exit: route-specific current-standard evidence and an explicit list of shared changes needing regression; preserve earlier successful contracts.

### G05

Implementation checkpoint: Implemented truthful general-queue action labels and guidance, plus shared compact presentation and keyboard table access. The historical destination finding below is retained for context.

**P1 — MSS dashboard action destination and hierarchy review.**

Source: [MSS dashboard](../../web/src/app/mss/page.tsx), `buildManagerActions`. “Today exceptions” links to `/mss/approvals?queue=attendance`; “Team on leave” links to `/mss/approvals?queue=leave`. These are general request queues, not source-proven filtered populations for those summary signals. This is a confirmed destination mismatch in source; impact on actual populated workflows remains unexecuted.

Next action: verify whether an authorized matching destination/filter exists. Use truthful queue wording or an existing supported destination; do not invent a team-calendar/exception API. Also inspect repeated action/summary hierarchy against the compact approvals page. Exit: count/action meaning agrees with the destination under populated, empty and permission-restricted states; preserve manager scope and ESS switching.

### G06

Implementation checkpoint: The shared notification header and table/dialog presentation have been adopted; notification permission/delivery policies are unchanged.

**P2 — MSS Notifications.**

Source: [notification route](../../web/src/app/mss/notifications/page.tsx); inherits the Accerio MSS shell. No route-specific current-standard acceptance is mapped here.

Next action: inspect its composed notification center/detail, unread state, secure deep links, return context, pagination and feedback. Reuse existing notification components; do not add an announcement system. Exit: real read/unread and authorized navigation behavior plus empty/error/mobile/keyboard evidence, without leaking employee or foreign-manager data.

### G07

Implementation checkpoint: Shared content appearance and existing modal lifecycle are now adopted in Tenant Admin. Full permission/state/transition permutations remain a separate acceptance scope.

**P2 — Tenant Admin page-content rollout.**

Eleven routes outside Leave Year inherit explicit Accerio shell appearance; that alone does not accept their membership/role dialogs, tables, financial calendars, governance or settings forms. [Layout](../../web/src/app/tenant-admin/layout.tsx) and [Leave blocker closure](hrms-leave-blocker-closure-certification.md) provide source/shell context.

Recommended slices: Users/Roles → Setup/Settings/Plan → Financial Calendars → Security/Support Access/Audit/Data Governance → dashboard reconciliation. Next action: identify reusable form/table/dialog gaps before page edits. Exit: current-standard interactions with privilege-escalation, support-scope, close/lock and export negatives appropriate to each slice.

### G08

Implementation checkpoint: Platform/Finance explicitly adopt the shared Accerio shell, branding and truthful navigation search. Source adoption and current browser evidence are recorded separately from the historical finding below.

**P1 shared discovery; P2 implementation — Platform Admin and Finance Manager shell adoption.**

Confirmed source difference: both [Platform layout](../../web/src/app/platform-admin/layout.tsx) and [Finance layout](../../web/src/app/finance-manager/layout.tsx) call `WorkspaceChrome` without `appearance="accerio"`; the [component default](../../web/src/components/shell/workspace-chrome.tsx) is `standard`. Platform header search copy also implies tenants/leads/templates/status search, while the shared search contract is navigation/shortcuts. No new live render defect is claimed.

Next action: review permitted navigation, truthful search naming, legacy content dependencies and affected financial/operator workflows. Implement shell convergence as a bounded slice with representative populated routes before broader content rollout. Do not globally change the component default to migrate every consumer implicitly. Exit: actual desktop/mobile navigation, active ancestry, identity/search/logout, keyboard and affected page regression. Financial handoff and platform tenant/support authority remain unchanged.

### G09

Implementation checkpoint: Document content appearance/table access and narrow summary/status layout fixes are implemented. Existing storage, verification and release restrictions remain.

**P2 — HR document and letter families.**

Scope: employee documents/create/review; documents catalog; categories and requirements/create/edit; generated letters. The [HR tracker](hrms-hr-admin-coverage-tracker.md) records earlier raw-table/history review signals, which are candidates rather than reproduced defects.

Next action: inspect composed filters, named table regions, requirement/evidence context, review dialogs, upload/download and partial outcomes. Exit: real authorized upload/review/download where supported, format/failure behavior, protected artifacts and responsive/keyboard checks. Keep storage/provider/quarantine/release gates separate.

### G10

Current family checkpoint: [Organization/Lifecycle joined closure](hrms-organization-lifecycle-phase6-closure.md) completes all six planned UI phases across 18 route patterns and nine Organization master variants. One current immutable build passed 150 main browser checks plus three inline checks across Chromium/Firefox/WebKit, six report contract tests and six existing movement/exit domain tests; retained exports, 531 captures/22 inspected samples and exact cleanup are recorded. The report label/wrapping polish, required-read fallback guards and joined return/shared-consumer checks are complete. OL-C01/OL-C02 are resolved within declared bounds. OL-C03 remains an explicit policy follow-up: manager API reads and existing view-only bulk writes remain permitted by the broad backend HR context, despite HR workspace UI denial for adjacent roles. No backend permission migration or whole-HRMS certification is implied. Historical inventory acceptance counts are unchanged.

Subsequent [filter/UI/UX audit](hrms-organization-lifecycle-test-coverage.md): 45 added unique cases, 63 supplemental browser passes, 29 report contracts and three backend checks. Corrected unowned Exits in owner-filtered inbox results and clipped Rows text. The new source-matched build/evidence supplements the historical closure without recasting its 153 checks as exhaustive filter coverage. Dynamic identities and combinations remain bounded as documented.

Implementation checkpoint: The shared presentation/table adoption is implemented across the remaining HR compositions. This does not certify all listed domain workflows or repair every pre-existing query contract.

**P2 — Remaining HR families, in bounded stages.**

The [146-route tracker](hrms-hr-admin-coverage-tracker.md) retains domain-level detail; this register does not reset prior functional verification.

Recommended order:

1. Organization and employee lifecycle: complete within the [six-phase UI closure](hrms-organization-lifecycle-phase6-closure.md); retain OL-C03 as a separate permission-policy follow-up.
2. Workflow configuration, assignments/traces and notification operations.
3. Payroll configuration and effective-dated forms.
4. Payroll inputs/cycle/review/adjustments/settlements.
5. Outputs/finance/provider surfaces and remaining reports.
6. Dashboard, audit, remediation and remaining operational hubs.

Payroll stages 3–5 are now bounded by the [35-route inventory](hrms-payroll-makeover-inventory.md) and [seven-phase makeover plan](hrms-payroll-makeover-plan.md). Phase 1 rendered baseline remains the next execution step; documentation does not establish workflow acceptance.

For each stage, enumerate exact routes from the inventory, inspect its existing certificates and select the closest pattern. Prioritize demonstrated wrong-scope selection, misleading report population and inaccessible action defects ahead of decorative changes. Exit: slice-specific adoption checklist, negative domain cases and real visual review; no payroll/statutory rule changes from presentation work.

### G11

Implementation checkpoint: Support adopts shared standalone content styling, and embedded documentation headings preserve one H1. Marketing/account/documentation retain their appropriate standalone layouts.

**P3 — Support, authentication, access and documentation surfaces.**

Scope: Support and domain snapshot, root, login, password flows, workspace-access and docs catch-all. Support layout currently performs access checking without a `WorkspaceChrome` wrapper. Some public screens reasonably need a different composition; sharing tokens/validation does not require adding an authenticated sidebar.

Next action: classify public versus authenticated tasks; inspect their real headings/forms/status/error semantics and support grants. Exit: appropriate shared styling and accessible task behavior while preserving reset security, access denial and support scope. Do not force operational tables or menus onto public forms.

## Shared-component work queue

No new shared component defect is marked runtime-reproduced by this source audit. Existing safeguards are acceptance constraints, not automatic rewrite targets.

| Order | Shared area | Next check | Consumer proof |
| --- | --- | --- | --- |
| 1 | Shell and truthful search | Explicit role appearance, actual search scope, active ancestry and mobile navigation | Platform/Finance plus existing HR/ESS/MSS/Tenant representatives |
| 2 | Filter/history boundary | Immediate versus committed semantics; restored controls; stale reads | Paged queue, immediate catalog and report |
| 3 | Modal/form behavior | Long/short/mobile content, busy/dirty guard and useful focus return | Policy form, manager decision and reopen confirmation |
| 4 | Table/pagination | Hydration-safe panning, reachable row actions and page-scoped selection | Wide populated tables in each affected role |
| 5 | Feedback/import/report helpers | Canonical outcomes, exact identity, completeness and scope | Real negative and successful workflows, not mirrored implementation assertions |

## Rollout sequence and update rules

Start with G01/G03 evidence reconciliation and G05 destination review; conduct G08 shared-shell discovery alongside those bounded reviews. Then implement only identified gaps, followed by Employee detail (G02), document family (G09), other ESS/MSS content (G04/G06), Tenant (G07), remaining HR (G10) and supporting surfaces (G11). Adjust the sequence when a demonstrated correctness or access defect warrants it.

For each slice, record the exact route set, baseline artifact, affected shared consumers, actual changes, checks and real screenshot review. Update the route mapping/status and owning certificate together. Do not infer “aligned” from imports, inherit an old PASS onto a changed artifact or convert an unexecuted review into a defect count.

Documentation-only validation for this inventory: census/count reconciliation, local file/link checks, repeatable generation and whitespace review. Browser/API testing remains unexecuted in this audit. No release gate or deployment decision changed.

## Presentation rollout checkpoint — 22 October 2026

The shared rollout is implemented. The additive [execution map](../qa/evidence/ui-ux-rollout-2026-10-22/presentation-coverage.json) records passing three-engine presentation scopes for all 190 route patterns, across separately identified broad and closure artifacts. The [rollout report](hrms-ui-ux-rollout-certification.md) records exact results, fixes, grouped coverage and limitations. Original status labels above describe the discovery baseline; they are not current unresolved styling-defect counts. Full workflow, custom-role and manual accessibility acceptance remains bounded by the owning domain records and checklist.
