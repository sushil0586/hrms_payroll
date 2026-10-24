# Employee Management makeover — Phase 2

Date: 22 October 2026. Scope: employee directory and selected employee details. Status: complete for the scoped directory/detail makeover and executed verification. No deployment.

## Implemented design

This phase follows the [Phase 1 baseline](hrms-employee-management-phase1-design-baseline.md) and [six-phase plan](hrms-employee-management-makeover-plan.md). It changes task hierarchy and interaction presentation; Phase 3 forms, Phase 4 access/bank redesign and Phase 5 imports remain separate.

- One Employees header, shorter task copy and New employee primary action. Removed duplicate dashboard navigation and decorative header pills.
- Directory totals wrap instead of becoming three stacked mobile cards. Status counts remain informational totals, with no duplicate status quick-filter links. Status is edited through the existing committed GET control; existing status URLs still work.
- Search stays visible. On mobile, the remaining filters use a single native disclosure, initially collapsed for default scope and expanded for committed non-default filters/sort. Its controls remain in the same GET form even when closed. Desktop keeps all controls visible, including manager/readiness in a second row; this deliberately replaces the earlier nested More filters proposal to keep one set of controls and no second disclosure layer.
- Kept six table columns, named keyboard scrolling, sorting, page-size choices, matching counts, full authorized collection semantics and committed paging. No export, bulk selection or backend query contract was added.
- Selected details occupy the full width below results. The directory no longer shrinks when a record is selected. Profile, Structure and Access/dates use readable columns on desktop and stack on mobile, with native section disclosures and document scrolling instead of a sticky narrow panel with its own scroll area.
- Employee identity is the detail heading. One Edit action and one secondary Actions menu replace duplicate Edit/Access entries; Close details is distinct. Existing access/bank actions and permission checks remain. The employee menu opts into native document links for these form destinations; other ActionMenu callers retain their default rendering.
- Same-document pointer/keyboard selection reveals and focuses the detail heading. Closing aborts the outstanding detail read, clears the selection and returns focus to the actual opener or the corresponding row identity for a direct URL entry. When the employee is on another results page, the directory region is the fallback; the current page/filter scope is preserved. Existing stale-response/abort guards and URL history synchronization remain.
- Wording narrows review/payout descriptions without changing warning predicates, permissions or business calculations. Existing “Ready” means no warnings from the current data checks, not payroll approval.

The CSS is scoped to the directory composition. Its outer layout selector must not also match the nested bank-account layout reused inside a directory dialog. Shared component defaults and other workspaces are unchanged by these new scoped rules.

## Verification record

Evidence: [employee-makeover-phase2-2026-10-22](../qa/evidence/employee-makeover-phase2-2026-10-22/). Production builds have separate directories and manifests. Owned PostgreSQL database `hrms_employee_phase2` on 55464, Django 8065 and Next 3265; demo data and outbound notification processing disabled. Fixtures use the existing guarded provisioning/cleanup command.

The existing directory suite is retained and adjusted to the current layout. Its old neighboring-page test incorrectly expected zero shared headers after the earlier global rollout. The new direct-selection history test initially went Back before the close URL committed; retained trace snapshots show navigation to `about:blank`. The corrected test asserts the committed close URL before testing Back/Forward. This stricter check then reproduced a real close URL stall in Firefox, rather than treating visual dismissal as navigation completion.

Initial rendered review exposed a real layout problem: native details content formed an implicit desktop box, stacking filters in one column, and inherited mobile action direction stacked Apply/Reset. These issues require source corrections and new geometry assertions, not weaker layout expectations. Earlier results/screenshots/traces remain diagnostic history.

The initial 36-case selection completed 30 passed / 6 failed / 0 skipped / 0 flaky: the outdated neighboring-header expectation and premature history action failed once per engine. Their original traces remain in `results/`. The next immutable build corrected the observed CSS and ran the corrected expectations plus geometry/page-error checks: **37 passed / 2 failed / 0 skipped / 0 flaky**, retained in `results-final/`. Direct-entry history failed in Firefox and WebKit; the failures exposed the close commit stall and WebKit hydration error.

Inspecting the retained WebKit direct-entry trace exposed React hydration error 418. A timestamp probe confirms Node emits `22 Oct 2026, 09:30 am` while WebKit emits `22 Oct 2026 at 09:30 AM` for the same instant and equivalent Kolkata timezone. The corrected detail view reuses the existing deterministic workspace timestamp formatter and explicitly labels Last updated (IST). Date-only employee values and stored timestamps are unchanged. The probe is diagnostic; the repaired production build requires fresh browser execution.

For selection/dismissal, source inspection showed local handlers also entering shared navigation capture and starting router navigation alongside local detail reads. These links now bypass shared navigation capture and use Next's integrated native history for selection-only URL changes. This synchronizes the URL without a redundant RSC/document read; the authorized detail GET, request cancellation, Back/Forward listener and href/modifier fallback remain. The installed Next 15.5.24 app-router explicitly integrates native pushState with useSearchParams. New assertions check the selected URL and absence of a stale navigation banner, plus action destinations and return context.

A destination test then reproduced a separate Access-menu navigation stall (“Loading Manage access” with no dialog). The employee menu now explicitly uses document-navigation anchors, matching the working Edit destination. This is an opt-in addition to the existing shared ActionMenu; its default Link branch is unchanged. That 42-case build completed **39 passed / 3 failed / 0 skipped / 0 flaky**; only the action-destination scenario failed, once per engine, retained in `results-complete/`. The menu correction has a new immutable build and repeats all 42 cases, including opening/closing Edit, Access and Bank dialogs without saving.

Final artifact: `YSkTTqDoThEfgu9mX_5SM`, directory `.next/employee-makeover-phase2-accepted`, [source/test manifest](../qa/evidence/employee-makeover-phase2-2026-10-22/accepted-provenance.json). Five application files differ from Phase 1: directory page, selection/detail component, the new responsive filter disclosure, scoped pattern CSS, and opt-in native links in ActionMenu. No backend model, API payload, calculation, migration or dependency changed.

The repeated executions are not additive unique product workflows. Source/build manifests and per-run traces identify each stage; screenshot folders are separate (`final/`, `complete/`, `accepted/`) so later captures do not overwrite their preceding review evidence. The successful build retains an existing unrelated globals.css Autoprefixer warning about `end` support, plus its cache-serialization warning; no unrelated global CSS was changed to silence it.

## Full-suite result and final focus follow-up

The full fixed selection completed **42 passed / 0 failed / 0 skipped / 0 flaky** (14 cases per engine, retries disabled), in `results-accepted.json` / `browser-accepted.txt`, on build `YSkTTqDoThEfgu9mX_5SM`. It covers the retained nine directory scenarios plus five new disclosure, focus/history, layout and dialog-destination scenarios.

A final bounded change adds a directory-region focus fallback for deep links whose employee is not on the visible results page. Build `YgYbuc4Xd-2x40gXSP6kJ`, `.next/employee-makeover-phase2-finalized`, differs from the full-suite artifact only in `employee-detail-selection.tsx`; the [finalized manifest](../qa/evidence/employee-makeover-phase2-2026-10-22/finalized-provenance.json) records the hashes and exact selected tests. The full 42 are not claimed as rerun on that artifact. Its focused selection covers off-page close, normal pointer/keyboard selection with detail axe, direct-entry history/page errors, and all three dialog destinations in each engine. The focused follow-up completed **12 passed / 0 failed / 0 skipped / 0 flaky** (four cases per engine, retries disabled), recorded in `results-finalized.json` / `browser-finalized.txt`. It adds three off-page scenario/engine combinations and repeats nine relevant combinations from the full suite; these are not 54 unique workflows. The current application and executed test hashes match the finalized manifest.

The broad 42-case run checks directory reflow at 1440/1024/768/390/320 through the combined selections, named keyboard table scrolling, real API ownership/employee denials, scoped header/filter/table axe and new detail axe. API assertions are part of the browser case count, not extra backend test counts. Successful writes and exhaustive domain scenarios are not inferred.

 Initial runs are not final acceptance.

## Acceptance boundaries

The suite targets search/apply/reset/history, combined filters, sorting/paging/unapplied drafts, selected-detail read failure/retry, keyboard table access, responsive layouts, existing create-dialog dirty close, ownership/employee denials, scoped automated accessibility and neighboring page presentation. New cases cover collapsed mobile filter serialization, automatic expansion for committed scope, full-width selected detail, pointer/keyboard focus restoration and direct-entry history.

This phase does not certify employee saves, all permission/custom-role combinations, access updates, bank writes, imports, very large tenant performance or every historical/data state. Formal WCAG, actual assistive technology, native zoom and physical-device assessments remain unexecuted. Scoped automated scans are not a whole-screen accessibility certificate. Document-navigation modal focus remains distinct from the same-document detail behavior verified here.

## Visual review, quality and cleanup

Twelve final representative images were individually inspected across the full-suite and finalized artifacts: desktop directory, 1024px layout, mobile 390/320, committed mobile filters, detail error, full-width desktop detail, mobile detail, off-page close, and the three existing dialog destinations. [Review and quality manifest](../qa/evidence/employee-makeover-phase2-2026-10-22/review-and-quality.json) lists their exact paths/hashes. Intermediate visual review found the filter layout corrections described above. This is representative review, not inspection of every screenshot/state. Dialog images confirm entry-point continuity; they do not complete Phase 3/4 redesign.

Review examples: [desktop directory](../qa/evidence/employee-makeover-phase2-2026-10-22/accepted/chromium-layout-1440.png), [mobile directory](../qa/evidence/employee-makeover-phase2-2026-10-22/accepted/chromium-layout-390.png), [full-width detail](../qa/evidence/employee-makeover-phase2-2026-10-22/finalized/chromium-detail-pointer-1440.png), [off-page close](../qa/evidence/employee-makeover-phase2-2026-10-22/finalized/chromium-offpage-close-390.png).

Production builds, final full ESLint and TypeScript checks exited zero. Build-generated TypeScript configuration files were restored to their pre-task Git content before the final standalone type check. Existing unrelated build warnings are retained, not suppressed. Scoped axe results are attached to their browser cases; broader manual accessibility assessment remains open.

Guarded fixture teardown verified zero tenants, users, employee documents and document artifacts in the owned database. [Database cleanup](../qa/evidence/employee-makeover-phase2-2026-10-22/database-cleanup.json) and [resource cleanup](../qa/evidence/employee-makeover-phase2-2026-10-22/resource-cleanup.json) record disposal of the task-owned services, container/anonymous volume and intermediate builds. The two passing artifacts, screenshots and historical failure traces are retained. Unrelated services/data and audit history were preserved; no pre-task media hash baseline is claimed.

## Scoped decision and next phase

Phase 2 is complete for directory/detail presentation, selected-state navigation/focus and the executed regressions above. Visual consistency is accepted within the reviewed scope; exhaustive state coverage, domain certification and manual accessibility remain bounded as stated. No deployment or release-gate advancement occurred.

Proceed next to Phase 3 create/edit makeover, particularly standalone stepper consistency, duplicate form framing, validation across all steps and long/short/mobile form layout. Access/bank redesign, import workflows and joined family closure remain Phases 4–6.
