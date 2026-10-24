# Organization and Employee Lifecycle — Phase 6 joined closure

Status: complete within the bounded Organization/Lifecycle UI makeover scope, 23 October 2026. All six planned phases are complete. OL-C03 remains an explicit permission-policy decision outside this UI acceptance.

## Delivered composition and scope

The [six-phase plan](hrms-organization-lifecycle-makeover-plan.md) applies the [Leave/Attendance UI/UX standard](hrms-ui-ux-standard.md) across 18 HR route patterns: nine Organization master variants, guided setup/CSV import, the unified lifecycle inbox, onboarding/probation/movement/exit queues and standalone/query editors, and two reports. The [inventory](hrms-organization-lifecycle-makeover-inventory.md) retains the route and backend ownership map. There is no dedicated Organization/Employment Lifecycle ESS/MSS editor family; adjacent role entry screens are checked as consumers, without inventing new routes.

Phases [2](hrms-organization-lifecycle-phase2-makeover.md), [3](hrms-organization-lifecycle-phase3-makeover.md), [4](hrms-organization-lifecycle-phase4-makeover.md) and [5](hrms-organization-lifecycle-phase5-makeover.md) describe field/domain preservation and their historical accepted artifacts. Phase 6 adds joined evidence on one immutable current build. Historical pass counts are not substituted for this run or added together as a single certification count.

The common pattern is a workspace task header, honestly scoped summary, committed operational filters, explicit selection/detail, internal table scroll, grouped forms, retained drafts, synchronous pending guards, meaningful known/unknown feedback, safe local return scope and one dialog dirty/busy owner with associated footer actions. Domain-specific fields and consequences remain distinct. Shared clearance/checklist owners display known identifier aliases and preserve current values absent from the options list.

## Final refinements

Reports replace the inherited `workflow.pending` placeholder with plain “No workflow linked”, omit redundant empty owner-reference text and give owner cells enough width for readable names. Raw identifiers may wrap inside their column. Search/filter/sort/date/export semantics are unchanged.

Organization catalog/new/edit pages now catch failed required reads before accessing their data and render their existing unavailable notices. Failed selected-detail reads leave the working catalog and an explicit unavailable selection. Session/permission gates still execute before those reads; no permission grant or demo population is introduced.

## Reuse in the next screen family

Use the [shared standard](hrms-ui-ux-standard.md) and its domain-specific adoption checklist together with these accepted compositions:

| Screen need | Reference and rule to retain |
| --- | --- |
| Master catalog with dependencies | Organization: one selected section, committed search/status/page scope, explicit Inspect action, dependency context and a deliberate missing/unavailable selection. Do not auto-select a different row. |
| Operational queue | Lifecycle and owning queues: distinguish loaded/matching/page counts; preserve committed filters through navigation; keep wide data in a named internal scroll region. Distinguish a genuine empty queue from no matches and service failure. |
| Standalone create/edit | Organization and lifecycle editors: task title and return action, named field groups, associated Save/Cancel footer, required labels, retained values and current options, and consequences explained beside the relevant action. |
| Query dialog | Owning lifecycle queues: use the shared shell, one dirty/busy owner, Escape/backdrop/close handling and focus restoration. Look up the authorized requested record independently of the current list page. |
| Multi-step or batch write | Guided setup/import: preview first, preserve confirmed partial results, distinguish known failures from unknown outcomes, and guard repeated submissions synchronously. Never imply a retry is safe when the result is unknown. |
| Report | Queue/aging reports: align visible evidence, filters, sort/date scope and CSV/manifest; distinguish page counts from complete matching population; fail closed on incomplete bounded collection. |
| Cross-screen handoff | Inbox/report to owning editor: pass only supported local return scope, preserve copied type/date filters, and verify the actual Cancel/return destination rather than only the link string. |

Start each new family with its own route/field/service inventory and rendered baseline. Keep existing business rules, permission ownership and effective-date behavior explicit; shared presentation does not make those rules interchangeable. Acceptance must name the immutable build, actual automated results, inspected image subset, retained artifacts and exact owned-resource teardown. These records are a reusable delivery pattern, not automatic certification of the next family.

## Finding disposition and boundaries

| Finding | Disposition |
| --- | --- |
| OL-C01 — capped report population | Resolved within the shared complete bounded collector: 100-row source pages, maximum 10,000, complete metadata/length/composite-key checks and fail-closed export. Same-count concurrent mutation remains outside the guarantee. |
| OL-C02 — ambiguous/page-local selection | Resolved within the implemented Organization, inbox and all four owning editor lookup scopes. Missing/unavailable records never silently open another item. |
| OL-C03 — lifecycle permission catalog split | Open policy decision. Existing broad HR context remains; UI makeover acceptance does not certify `lifecycle.view` as read-only or introduce operation-specific `lifecycle.manage` enforcement. |

Movement completion still uses the existing effective-history service, cross-entity/same-day guards, resulting-assignment linkage and current/future behavior. Exit approval/clearance can place Active employees On Notice; completion requires clearance/access checks and marks Exited when saved; cancellation does not automatically restore Active. No new future scheduler, settlement, statutory, release-letter, document or access-deactivation operation is implied. Existing one-to-one record uniqueness and transaction/idempotency limits remain.

Formal assistive technology, physical-device/native-zoom, exhaustive security/domain/tenant permutations, large-load/concurrent consistency and deployment remain separate. Adjacent employee/Documents/workflow/notification/payroll systems retain their own owning acceptance records.

## Joined verification

Evidence: [Phase 6 execution](../qa/evidence/organization-lifecycle-phase6-2026-10-23/README.md), [final verification](../qa/evidence/organization-lifecycle-phase6-2026-10-23/final-verification.json), [visual review](../qa/evidence/organization-lifecycle-phase6-2026-10-23/visual-review.json).

One immutable production build, `UuqoCQnZQ4xZr8Z1E7TUz` in `web/.next/organization-lifecycle-phase6-closure`, passed build/type validation and focused ESLint. All 817 runtime, seven backend-contract and 18 test/helper/config hashes agree with the final source. The final six-file runtime delta is recorded against Phase 5; no backend/schema/permission change is included. Protected serializers/Shifts and generated Next/TypeScript configuration match HEAD.

**153 browser checks passed**, with one worker, zero retries, unexpected results, flaky cases or skipped cases: 150 main cases (50 each in Chromium, Firefox and WebKit) plus three same-build inline-inspector checks. The main selection includes Organization 33, lifecycle/onboarding/probation/reports 45, movements 30, exits/shared-owner consumer 33 and joined checks nine. Frozen suite adapters preserve the previously accepted business assertions; their small evidence/port/fault-path adaptations are pinned. Six report contract tests and six existing PostgreSQL movement/exit tests passed separately; the latter emitted three dependency deprecation warnings. These counts describe this run, not the sum of earlier phase runs.

The joined cases exercise both reports' real return links for all four record types, readable owner/workflow wording, four Organization read-failure paths and 17 lifecycle queue/options/editor read-failure paths per engine, without page errors. Missing/foreign/off-page records, empty/no-match distinctions, draft/pending/known/unknown outcomes, partial guided/import results, keyboard/focus, current/future movement history and exit clearance/access/cancellation retain the recorded suite assertions.

Fresh retained CSV and manifest bytes contain **128 rows per report**, beyond a single 100-row source page, with matching SHA-256 checksums and effective-date metadata. Main report checks also exercise incomplete/overlap/churn/unavailable source handling and fail-closed exports. Inline inspection verifies full register/detail width, no document overflow and actual focus return at 1440/320px in all three engines.

There are **531 captures**, of which **22 representative final images** were inspected: Organization six, lifecycle six, movements two, exits two, joined reports/roles four and inline detail two. The manifest records dimensions and hashes for every capture and names the inspected subset. Tall images were viewed at reduced scale; capture generation is not exhaustive manual visual or assistive-technology certification.

### Role observations and explicit policy follow-up

Adjacent employee `/ess/profile` and manager `/mss` entries remain usable. Both sessions lack the HR workspace and receive `/access-denied` on the HR lifecycle page. Direct lifecycle API reads return **403 for the employee and 200 for the manager**, consistently across engines. The existing lifecycle-view-only fixture can also perform its previously supported bulk-owner write (200). These observations expose the existing broad backend HR-context gate; they do not certify least privilege or read-only view semantics. OL-C03 stays open for an explicitly scoped authorization-policy decision and migration; this makeover changes no role grants or backend gate.

### Cleanup and delivery boundary

The isolated database reconciliation found all **141** checked tenant-related model counts zero, all **16** recorded primary fixtures and **7** foreign fixtures absent, and every recorded temporary fixture directory absent. Exact owned backend/proxy/Next processes, PostgreSQL container/anonymous volume, private audit runtime and temporary helpers were removed. Ports 3278/8078/8079/55476 are free. Existing repository audit files and previous accepted family builds were preserved; the accepted current build remains available. No commit or deployment was performed.

This closes the Organization/Lifecycle UI plan and its joined handoffs within the stated bounds. The wider HRMS rollout tracker retains workflow/notifications, payroll and other families as separate implementation work.


## Subsequent filter coverage audit

The [filter/UI/UX coverage audit](hrms-organization-lifecycle-test-coverage.md) adds 45 unique cases and records 63 supplemental browser passes, 29 report contract passes and three backend passes on build `2_ug_WlGuCGPMTYVZJF2_`. It fixes an owner-filter Exit leak and clipped inbox Rows text. That supplement pins the current two-file runtime/backend delta, control/value matrix, inspected samples and cleanup. The 153-case closure execution above remains the historical acceptance of its original build; it is not relabeled as an exhaustive filter matrix or a rerun on the supplemental build. OL-C03 remains open.
