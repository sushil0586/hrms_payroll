# Phase 2 Test Coverage Gap Analysis

Date: 2026-10-09
Scope: HR Admin Phase 1 IDs
Execution status: Discovery only. No tests were executed in this phase.

## Coverage Summary

| Coverage bucket | Functionality count | Percentage |
| --- | ---: | ---: |
| Fully covered by existing meaningful tests | 23 | 51% |
| Partially covered by existing tests | 22 | 49% |
| Uncovered | 0 | 0% |
| Total functionality groups | 45 | 100% |

There are no completely uncovered Phase 1 functionality groups at the grouped ID level. However, many groups are only partially covered because existing tests validate core paths but not all child screens, conditional actions, negative branches, RBAC variants, import edge cases, compact UI states, or approval/state-transition boundaries.

## Module-Wise Coverage

| Module | Functionality groups | Full | Partial | Uncovered | Coverage estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Command / launch / SaaS ops | included through CMD screens and API smoke | 1 | 5 | 0 | 70% |
| Workforce | 9 | 6 | 3 | 0 | 83% |
| Documents | 3 | 1 | 2 | 0 | 67% |
| Time / leave / attendance / roster | 8 | 3 | 5 | 0 | 69% |
| Payroll | 12 | 7 | 5 | 0 | 79% |
| Reports | 4 | 2 | 2 | 0 | 75% |
| Notifications | 5 | 1 | 4 | 0 | 60% |
| Setup / organization / workflows | 2 | 1 | 1 | 0 | 75% |
| Audit / imports | 2 | 0 | 2 | 0 | 50% |

Coverage estimates reflect assertion quality and breadth, not current pass/fail status.

## Priority Gaps

### P0: Must Cover Before Production Certification

| Gap ID | Functionality | Gap | Existing tests to improve/reuse | New test spec required |
| --- | --- | --- | --- | --- |
| HRADM-TG-P0-001 | HRADM-FNC-PAY-010 | Finance handoff mutation paths need explicit generate/transmit/acknowledge/audit-pack positive and negative checks, not only evidence lane readability | `payroll-handoff-flows.spec.ts`, `pilot-100-finance-handoff-compliance-certification.spec.ts` | Add focused handoff state-transition spec using existing payroll fixture |
| HRADM-TG-P0-002 | HRADM-FNC-PAY-012 | Adjustment/settlement submit/approve/reject/apply negative boundaries need explicit mapping | `payroll-adjustments-flows.spec.ts`, `payroll-settlements-flows.spec.ts` | Add approval lifecycle cases or extend existing specs |
| HRADM-TG-P0-003 | HRADM-FNC-TLA-004 | Attendance import commit and positive edit/save paths are not clearly certified in browser | `hr-admin-attendance-operations-workflow-certification.spec.ts`, `attendance-records-slim-options-qa.spec.ts` | Extend existing attendance spec with import positive/negative and saved edit verification |
| HRADM-TG-P0-004 | HRADM-FNC-TLA-006 | Shift/holiday/assignment/roster CRUD create/edit/import/resolve are not fully covered as browser mutation flows | `roster-shift-operations-compact-qa.spec.ts`, `governance-assignment-form-flows.spec.ts` | Add compact roster/shift CRUD plus conflict resolution spec |
| HRADM-TG-P0-005 | HRADM-FNC-NOTIF-001..004 | Notification template/event/delivery/diagnostic CRUD and test-send outcomes are only partially mapped | `notification-setup-crud-flows.spec.ts`, `production-notification-flows.spec.ts` | Extend existing notification setup spec; avoid duplicate queue tests |

### P1: High-Value Enterprise Coverage

| Gap ID | Functionality | Gap | Existing tests to improve/reuse | New test spec required |
| --- | --- | --- | --- | --- |
| HRADM-TG-P1-001 | HRADM-FNC-DOC-002 | Document category/requirement setup delete/archive/validation and governance locks need deeper browser proof | `configuration-form-flows.spec.ts`, `governance-assignment-form-flows.spec.ts` | Add document setup CRUD/impact cases |
| HRADM-TG-P1-002 | HRADM-FNC-DOC-003 | Generated letters need create/download/permission/error proof beyond visual/read coverage | `generated-letter-flows.spec.ts` | Improve existing spec with export/RBAC/error cases |
| HRADM-TG-P1-003 | HRADM-FNC-TLA-007 | Leave request import and HR Admin balance transaction review need focused browser proof | `leave-balance-import-flows.spec.ts`, `backend/apps/leave_management/tests.py` | Extend leave operations spec |
| HRADM-TG-P1-004 | HRADM-FNC-PAY-005 | Statutory declaration item review, proof verification, reject/lock browser states need explicit evidence | `payroll-statutory-flows.spec.ts` | Add statutory declaration item review cases |
| HRADM-TG-P1-005 | HRADM-FNC-PAY-011 | Provider mapping clone/activate/archive/simulate/export requires explicit browser/API assertions | `payroll-providers-flows.spec.ts` | Extend provider flows spec |
| HRADM-TG-P1-006 | HRADM-FNC-REP-004 | Operational report deep links need systematic route verification across all report families | individual report specs | Add common helper assertion to existing report specs |

### P2: UX, Maintainability, and De-Duplication

| Gap ID | Area | Gap | Action |
| --- | --- | --- | --- |
| HRADM-TG-P2-001 | UI shell | Multiple route smoke/UI audit specs overlap | Keep unified design spec canonical; demote old smoke specs to quick smoke |
| HRADM-TG-P2-002 | Visual | Snapshot specs do not validate business workflows | Keep visual specs as secondary evidence only |
| HRADM-TG-P2-003 | Audit/imports | Import history ledger has partial mapped coverage | Extend existing import history spec with every import source once bulk flows stabilize |
| HRADM-TG-P2-004 | Historical evidence | Historical QA docs are not machine-linked to test IDs | Add `@qa-id` or metadata block to specs in a future non-execution phase |

## Tests Requiring Improvement Instead of Replacement

| Existing test | Improve by |
| --- | --- |
| `payroll-handoff-flows.spec.ts` | Add actual handoff mutation assertions or explicitly delegate them to pilot/production suites |
| `payroll-adjustments-flows.spec.ts` | Add submit/approve/reject/apply lifecycle checks |
| `payroll-settlements-flows.spec.ts` | Add settlement lifecycle and negative locked-state checks |
| `hr-admin-attendance-operations-workflow-certification.spec.ts` | Add attendance import positive path and saved edit verification |
| `roster-shift-operations-compact-qa.spec.ts` | Add create/edit/import/conflict resolution assertions if not already present |
| `notification-setup-crud-flows.spec.ts` | Add preview/test-send/delivery failure assertions |
| `generated-letter-flows.spec.ts` | Add create/download/RBAC/error checks |
| `import-history-ledger-certification.spec.ts` | Link import batches back to employee, attendance, leave, and policy imports |
| `tier-one-route-smoke.spec.ts` / `route-smoke.spec.ts` | Keep only if they provide fast preflight value not covered by unified route certification |

## Duplicate Coverage

| Area | Duplicate/overlap | Recommended canonical suite |
| --- | --- | --- |
| Employee directory | employee directory, pilot workforce, employee production | `employee-directory-certification.spec.ts` |
| Payroll setup/close | granular payroll, pilot 100, production close, user journey | granular payroll specs for module QA; pilot/production for release rehearsal |
| Reports | individual report specs, report hub, pilot export regression | individual report specs for function; pilot regression for breadth |
| Route UI | route smoke, full route audit, unified design, visual snapshots | `hr-admin-unified-design-full-route-certification.spec.ts` |

## Additional Test Case Specifications Required

| New spec ID | Priority | Module | Target functionality | Scenario type |
| --- | --- | --- | --- | --- |
| HRADM-NEW-P0-001 | P0 | PAY | HRADM-FNC-PAY-010 | Positive/negative state transition: generate, transmit, acknowledge, audit pack, retry |
| HRADM-NEW-P0-002 | P0 | PAY | HRADM-FNC-PAY-012 | Approval lifecycle: submit, approve, reject, apply, locked-state denial |
| HRADM-NEW-P0-003 | P0 | TLA | HRADM-FNC-TLA-004 | Attendance import: valid, duplicate, invalid employee, partial commit, audit link |
| HRADM-NEW-P0-004 | P0 | TLA | HRADM-FNC-TLA-006 | Roster/shift CRUD and conflict resolution browser proof |
| HRADM-NEW-P0-005 | P0 | NOTIF | HRADM-FNC-NOTIF-001..004 | Template/event/delivery/diagnostic CRUD plus preview/test-send/error cases |
| HRADM-NEW-P1-001 | P1 | DOC | HRADM-FNC-DOC-002/003 | Document setup and generated letters mutation/RBAC/export |
| HRADM-NEW-P1-002 | P1 | TLA | HRADM-FNC-TLA-007 | Leave import and balance transaction review browser proof |
| HRADM-NEW-P1-003 | P1 | PAY | HRADM-FNC-PAY-005/011 | Statutory declaration item review and provider mapping lifecycle |
| HRADM-NEW-P1-004 | P1 | REP | HRADM-FNC-REP-004 | Systematic report deep-link verification helper |
| HRADM-NEW-P2-001 | P2 | AUD | HRADM-FNC-AUD-002 | Import history source-to-ledger traceability |

No new automation was generated in Phase 2. These are specifications only.
## Phase 3B.1B Coverage Impact - 2026-10-09

Fresh backend/API execution closed the current-release blocker defects from Phase 3B.1A and converted the scoped backend/API smoke evidence to Passed. This does not remove browser coverage gaps identified in Phase 2.

Coverage impact:

| Area | Previous Status | Phase 3B.1B Status |
| --- | --- | --- |
| Tenant/RBAC/session backend smoke | Failed | Passed |
| Launch audit remediation backend smoke | Failed | Passed |
| Payroll readiness/statutory/input backend smoke | Failed | Passed |
| Payroll provider/handoff backend smoke | Failed | Passed |
| Leave edge-date backend smoke | Failed | Passed |
| Browser P0 gaps | Not Run | Not Run |

Remaining priority: execute browser-based QA for the P0 gaps and compact/professional HR Admin UI model. Backend/API readiness is no longer blocking that next phase.

## Phase 3B.2 Coverage Impact - 2026-10-09

Fresh browser execution was completed for the HR Admin P0 Workforce/Documents/Access slice. Coverage status changed only where fresh current-release evidence exists.

| Area | Previous Status | Phase 3B.2 Status | Evidence |
| --- | --- | --- | --- |
| Workforce directory/search/filter/pagination/detail | Historical/partial browser evidence | Passed with fresh browser evidence | `docs/qa/evidence/phase3b2/01-workforce-playwright.log` |
| Employee create/edit/access/offboarding persistence | Historical/partial browser evidence | Passed with fresh browser and API confirmation | `docs/qa/evidence/phase3b2/01-workforce-playwright.log` |
| Employee/bank/manager bulk imports | Historical browser evidence | Passed with fresh browser evidence | `docs/qa/evidence/phase3b2/01-workforce-playwright.log` |
| Employee bank accounts | Not Run in master register | Passed with fresh browser evidence | `docs/qa/evidence/phase3b2/01-workforce-playwright.log` |
| Employee document upload/queue/RBAC | Backend evidence only for current release | Passed with fresh browser evidence | `docs/qa/evidence/phase3b2/02-documents-playwright.log` |
| Document category/requirement setup | Partial / Not Run | Passed for category and requirement CRUD scenarios executed | `docs/qa/evidence/phase3b2/02-documents-playwright.log` |
| Onboarding completion guard | Not Run | Failed, but classified as stale test-data expectation; requires corrected revalidation | `HRADM-DEF-20261009-007` |
| HR Admin access and workspace RBAC | Backend passed; browser Not Run | Mostly passed; two non-product blockers remain | `HRADM-DEF-20261009-008`, `HRADM-DEF-20261009-009` |
| Compact tablet/mobile coverage for scoped screens | Gap | Added and passed after QA-label correction | `web/tests/e2e/hr-admin-workforce-documents-access-responsive-certification.spec.ts` |

Updated remaining gaps from this slice:

| Gap ID | Priority | Status After Phase 3B.2 | Required Action |
| --- | --- | --- | --- |
| HRADM-TG-P1-001 | P1 | Reduced: category/requirement CRUD executed and passed; delete/archive/governance-lock depth still not proven | Add targeted setup negative/archive cases later if required |
| HRADM-TG-P1-002 | P1 | Still open | Generated letters create/download/RBAC/error proof was not part of this batch |
| HRADM-TG-P2-001 | P2 | Partially addressed | New scoped responsive spec should be canonical for Workforce/Documents/Access compact checks |
| HRADM-TG-P2-004 | P2 | Newly confirmed | Add explicit scenario metadata/IDs in Playwright specs to avoid stale duplicate expectations |

Phase 3B.2 does not change Payroll, Time/Leave/Attendance/Roster, Notifications, Reports, or Audit gap status. Those modules still require their planned browser certification batches.

## Phase 3B.2A Coverage Impact - 2026-10-09

Phase 3B.2A remediated and revalidated the three browser defects from the Workforce/Documents/Access slice.

| Area | Phase 3B.2 Status | Phase 3B.2A Status | Evidence |
| --- | --- | --- | --- |
| Onboarding completion guard | Failed due stale test data | Passed with real open blocking checklist item | `docs/qa/evidence/phase3b2a/02-documents-onboarding-related-rerun.log` |
| MSS read-only routing | Failed due stale heading assertion | Passed with current `Manager approvals` copy | `docs/qa/evidence/phase3b2a/03-access-rbac-rerun.log` |
| Payroll finance workspace routing | Failed due missing local seed credential | Passed after supported local seed command | `docs/qa/evidence/phase3b2a/03-access-rbac-rerun.log` |
| Scoped tablet/mobile compact UI | Passed in Phase 3B.2 | Passed again | `docs/qa/evidence/phase3b2a/04-responsive-rerun.log` |

Coverage conclusion: the scoped Workforce, Documents, and Access browser slice is current-release certified except the optional no-access persona scenario, which remains a test-environment dependency. This does not alter remaining open module gaps for Time/Leave/Attendance/Roster, Payroll, Notifications, Reports, Generated Letters, or Audit/import traceability.

## Phase 3B.3 Coverage Impact - 2026-10-09

Fresh browser execution was completed for the HR Admin Time/Leave/Attendance/Roster slice. Existing mapped tests were reused first; two focused P0 scenarios were added only after confirming gaps.

| Gap ID | Previous Status | Phase 3B.3 Status | Evidence / Remaining Risk |
| --- | --- | --- | --- |
| HRADM-TG-P0-003 | Open: attendance import commit and positive edit/save not certified | Closed for positive browser commit/edit persistence | `web/tests/e2e/hr-admin-time-leave-attendance-roster-p0-gap-certification.spec.ts`; evidence `docs/qa/evidence/phase3b3/07-new-p0-gap-spec-revalidation-current-ui.log` |
| HRADM-TG-P0-004 | Open: roster/shift mutation and conflict flows incomplete | Reduced: create/edit/conflict/rollout preview passed; delete remains unsupported by current API | `docs/qa/evidence/phase3b3/09-roster-gap-revalidation-create-template.log`; no `DELETE` handlers exist for employee shift assignments or roster templates |
| HRADM-TG-P1-003 | Open: leave import/balance review | Reduced for balance import; leave request import remains future coverage | `docs/qa/evidence/phase3b3/01-existing-leave-attendance-playwright.log` |

Additional observations:

| Area | Observation | Action |
| --- | --- | --- |
| Compact UX | Leave policy advanced controls are intentionally collapsed in the compact model. Tests now open the relevant sections before asserting fields. | Keep this pattern for future compact UI automation. |
| Roster delete | Product currently supports create/update/conflict/rollout but not delete for shift assignments or roster templates. | Product owner should decide whether archive/delete is required for enterprise 90% readiness. |
| Leave policy duplicate validation | Duplicate policy create path returns backend 500/`IntegrityError` while UI reports save failure. | Fix as `HRADM-DEF-20261009-010`; add explicit assertion for HTTP 400/field validation. |
| Responsive breadth | Phase 3B.3 includes existing mobile/compact checks for attendance and roster pages, but not every child screen in this module. | Keep a later full responsive UI sweep in the UX consistency phase. |

## Phase 3B.3A Coverage Impact - 2026-10-09

| Gap / Defect | Previous Status | Phase 3B.3A Status | Evidence |
| --- | --- | --- | --- |
| HRADM-DEF-20261009-010 | Open P1: duplicate leave-policy create returned backend 500 | Closed: API returns HTTP 400 field validation and browser asserts 400 | `docs/qa/evidence/phase3b3a/02-backend-leave-policy-duplicate-focused-rerun.log`, `docs/qa/evidence/phase3b3a/04-browser-leave-policy-duplicate-regression-rerun.log` |
| Phase 3B.3 skipped roster rollout scenario | Not Run/Skipped | Passed with current compact async employee search and department-scope controls | `docs/qa/evidence/phase3b3a/07-formerly-skipped-roster-rollout-revalidated-rerun.log` |
| Shift/roster delete/archive | Capability gap | Still product decision | No delete endpoints were added. Destructive actions remain out of scope without approved requirements. |

Coverage conclusion: Time/Leave/Attendance/Roster P0 browser stabilization is complete. Remaining gaps are product decisions or later UX breadth work, not current failed certification evidence.

## Phase 3B.4 Payroll Coverage Impact - 2026-10-09

Fresh payroll browser certification was attempted across all Payroll screens and child workflows. Existing mapped Playwright tests were reused first. No new Playwright tests were added because the pass exposed prerequisite and stale-contract blockers that must be stabilized before meaningful gap automation can be written.

| Gap ID | Previous Status | Phase 3B.4 Status | Evidence / Remaining Risk |
| --- | --- | --- | --- |
| HRADM-TG-P0-001 | Open: finance handoff mutation paths need explicit generate/transmit/ack/audit-pack/retry | Still open / blocked | Handoff workspace passed, but output-to-handoff, provider callback, retry and P100 finance handoff scenarios failed on missing output/handoff prerequisites. See `HRADM-DEF-20261009-012`. |
| HRADM-TG-P0-002 | Open: adjustment/settlement submit/approve/reject/apply negative boundaries | Reduced only for workspace visibility; lifecycle still open | Adjustment and settlement workspace flows passed, but pilot lifecycle certification failed because the required local pilot run was missing. See `HRADM-DEF-20261009-012`. |
| HRADM-NEW-P1-003 | Open: statutory proof review and provider mappings depth | Partially executed, not closed | Statutory browser CRUD/import passed in core flow and provider center passed, but stale UI assertions and provider mapping depth still prevent closure. |
| Payroll reports/UI compact coverage | Historical/partial | Partial | Several payroll report polish/certification scenarios passed, but frontend-validation heading assertions, typography audit and finance-report runner hang prevent full report/UI certification. |

Coverage conclusion: Payroll has meaningful fresh browser evidence for setup, inputs, statutory CRUD/import, output workspace, handoff workspace, provider center, reports, and RBAC denial paths, but it is not 90% enterprise-grade certified yet. The next stabilization pass must first create deterministic local payroll lifecycle data and update stale compact UI test contracts.

## Phase 3B.4A Coverage Impact - 2026-10-09

Phase 3B.4A reduced the payroll blocker set but does not replace the full Phase 3B.4 certification batch.

| Gap / Defect | Previous Status | Phase 3B.4A Status | Evidence / Remaining Risk |
| --- | --- | --- | --- |
| HRADM-TG-P0-001 finance handoff mutation paths | Blocked by missing local lifecycle data | Reduced: P100 generate/transmit/ack/reconcile, bank advice, exceptions and payroll register export passed | `docs/qa/evidence/phase3b4a/39-p100-finance-handoff-focused-revalidation-final.log`; provider callback/retry worker full-batch rerun still pending |
| HRADM-TG-P0-002 adjustment/settlement lifecycle | Blocked by missing pilot run | Reduced: P100 adjustment/settlement/close lifecycle passed | `docs/qa/evidence/phase3b4a/22-p100-lifecycle-focused-revalidation-rerun3.log`; broader negative/RBAC rerun still pending |
| Payroll output/payslip artifacts | Blocked by missing P100 output batch | Reduced: 100 payslips, register artifact, ESS access, signed access and publication report passed | `docs/qa/evidence/phase3b4a/31-p100-output-focused-revalidation-final.log` |
| Payroll report source/export | Failed/blocked by runner and report source pagination | Closed for payroll-register focused report | `docs/qa/evidence/phase3b4a/42-finance-report-revalidation-final.log`; report source now filters `artifact_kind=register` |
| Compact UI stale assertions | Widespread stale contracts | Reduced for focused impacted payroll suites | Evidence under `docs/qa/evidence/phase3b4a/08..42`; complete full-batch rerun needed |
| Missing primary bank readiness severity | Open requirements question | Still open | Keep `Blocked` until product confirms `Warning` is acceptable for payment-risk workflow |

## Phase 3B.5 Coverage Impact - 2026-10-09

| Area | Previous Coverage | Fresh Phase 3B.5 Result | Updated Gap / Risk |
| --- | --- | --- | --- |
| Organization hierarchy and master setup | Full by historical mapping | Passed fresh browser certification for 15 applicable scenarios; 3 existing conditional skips remain documented. | No open product gap for organization masters. Serial execution is required until timestamp-based fixture collisions are removed. |
| Setup and policy masters | Partial/full mixed | Passed fresh browser certification for policy/governance master CRUD, duplicate checks, frontend validation, advanced controls and responsive UI. | No additional automation required before retest. |
| Governance assignment lifecycle | Partial | 8 passed, 6 failed in existing coverage. | Open gap: deterministic prerequisites for leave/attendance/workflow/shift assignment lifecycles, resolution inspector and roster rollout. Tracked by `HRADM-DEF-20261009-020` and `HRADM-DEF-20261009-021`. |
| Workflow hub and operations navigation | Partial | HR Admin workflow hub, filters, links, ops routes and mobile overflow passed. | HR Admin hub coverage upgraded to fresh passed. |
| Tier-two workflow journeys | Partial | 3 journey scenarios failed due stale headings and missing notification fixture. | Open gap: cross-workspace workflow journey assertions and deterministic ESS/MSS notification/workflow data. Tracked by `HRADM-DEF-20261009-022`. |

Phase 3B.5 module-wise browser coverage estimate after fresh execution:

| Module Area | Passed / Scheduled | Coverage Status |
| --- | ---: | --- |
| Organization masters | 15 / 18 | 83% executed pass; remaining 3 are conditional skips, not product failures. |
| Setup/policy masters | 17 / 17 | 100% for scheduled master CRUD/validation scope. |
| Governance assignments | 8 / 14 | 57% until lifecycle fixture and validation defects are resolved. |
| Workflow hub/ops | 5 / 5 | 100% for HR Admin hub/ops route scope. |
| Tier-two workflow journeys | 0 / 3 | 0% certified for failed journey scenarios; current pages loaded but assertions/data are stale. |

Recommended new work is remediation/revalidation, not additional duplicate coverage: stabilize assignment fixtures, align workflow validation and cross-workspace journey assertions to verified current UI, then rerun the 9 failed scenarios plus the 3 conditional organization skips if their prerequisites can be made deterministic.

Coverage conclusion: Payroll lifecycle automation is now stable enough for a complete Phase 3B.4 browser rerun. The remaining high-value work is full rerun coverage, product confirmation on missing-bank readiness severity, and any follow-up for provider callback/retry scenarios not included in the focused stabilization set.

## Phase 3B.4B Coverage Impact - 2026-10-09

Full payroll browser revalidation was attempted after stabilization. Coverage improved for the P100 lifecycle path but full certification remains blocked.

| Gap / Area | Phase 3B.4B Status | Evidence / Remaining Risk |
| --- | --- | --- |
| HRADM-TG-P0-001 finance handoff mutation paths | Reduced but not closed | P100 finance handoff/compliance passed; provider callback/retry specs still failed. |
| HRADM-TG-P0-002 adjustment/settlement lifecycle | Closed for P100 positive lifecycle | Adjustment/settlement/close batch passed 3/3. Broader negative lifecycle fixtures still need cleanup. |
| Payroll register artifact >100 payslips | Closed | Backend regression passed with 100 payslips before one register artifact. |
| Missing primary bank readiness | Open product decision | Current behavior blocks payroll readiness; legacy test expects warning. Calculation/publishing/payment semantics need product confirmation before expectation changes. |
| Payroll reports | Mostly passed | Payroll register, adjustment and close readiness reports passed; frontend validation is separate and stale. |
| Frontend validation / compact UI contract | Open automation gap | 14 validation scenarios fail before reaching form assertions because old page-title expectations do not match compact pages. |
| Provider callback/retry | Open P0/P1 risk | Callback mutation HTTP 400 and retry worker fixture failure prevent provider recovery certification. |

Coverage conclusion: Not Certified. Phase 3B.4B provides positive evidence for core workspaces, adjustment/settlement lifecycle, P100 output/handoff and payroll reports, but provider recovery, artifact access/legacy disposable fixtures, compact frontend validation contracts and the missing-bank decision prevent payroll release certification.

## Phase 3B.4C Coverage Impact - 2026-10-09

Targeted remediation converted the stale frontend validation cluster and two lifecycle fixture scenarios back to passing coverage. Provider callback authentication/replay coverage is now positive again, but provider retry execution is still not certified.

| Area | Phase 3B.4C Status | Remaining Risk |
| --- | --- | --- |
| Compact payroll validation screens | Covered in focused rerun, 14/14 passed | Full payroll rerun still required for certification evidence. |
| Review exception and negative controls | Covered in focused rerun, 2/2 passed | Uses disposable payroll lifecycle operator with employee lookup permission. |
| Provider callback authentication/idempotency | Covered in focused rerun | Evidence labels now verified through current UI semantics. |
| Provider retry worker | Still open | Retry/job reached `skipped:skipped`; no release certification for provider retry recovery. |
| Output artifact access and disposable finance handoff | Partially open | TDS readiness indexing, blocked disposable handoff prerequisites, and artifact download selector/selection need follow-up. |
| Missing bank readiness classification | Open product decision | Calculation, approval/output, and payment submission severity must be confirmed separately. |

Coverage conclusion: Payroll remains Not Certified after Phase 3B.4C. The failure count is smaller and better classified, but final certification should not start until provider retry and disposable output/handoff fixtures are deterministic or explicitly descoped by product decision.

## Phase 3B.4D Coverage Impact - 2026-10-09

Phase 3B.4D closed the targeted final blocker cluster for focused revalidation, while preserving the requirement for a full certification rerun.

| Area | Phase 3B.4D Status | Remaining Risk |
| --- | --- | --- |
| Provider retry worker | Covered in focused rerun | Fresh disposable failed delivery is created before retry scheduling; worker reaches executed/completed. Full payroll rerun still required. |
| Finance handoff artifacts | Covered in focused rerun | Selected handoff readiness now uses summary counts, so pagination no longer hides required artifacts. Full payroll rerun still required. |
| TDS readiness / PDF tax output | Covered in focused rerun | TDS readiness can now inspect payslip render/tax-sheet evidence from setup payload. Full report regression still required in final rerun. |
| Artifact access/download | Covered in focused rerun | HR register download and ESS denial are deterministic; ESS own payslip download remains positive. Full RBAC/artifact batch still required. |
| Missing bank readiness classification | Open product decision | Code evidence supports Blocked for payment submission/bank transfer risk. Product must confirm whether earlier calculation/review stages should display Warning or Blocked. |
| Original scenario count drift | Open QA inventory item | 16 report/UI scenarios from original 106 remain absent from the current executable 90-scenario inventory. They are not counted as passed and must be reconciled before final certification. |

Coverage conclusion: targeted payroll blockers are ready for final full payroll certification rerun. Payroll is not yet fully certified because Phase 3B.4D did not execute the complete payroll inventory and did not close the missing-bank product decision or 16-scenario drift.

## Phase 3B.4E Coverage Impact - 2026-10-09

Phase 3B.4E executed every scenario currently enumerated by the payroll browser inventory. Current executable coverage improved materially, but certification gates are still open.

| Area | Phase 3B.4E Status | Remaining Risk |
| --- | --- | --- |
| Current payroll browser inventory | Executed 83/83 current scenarios | Original plan expected 106; current inventory is 83, leaving 23 unresolved drift records compared with the original certification baseline. |
| Core payroll setup/salary/rules/inputs/calculations/review | Mostly covered and passing | Missing-bank readiness and statutory RBAC failure prevent clean core certification. |
| Missing primary bank readiness classification | Open product decision | Current UI/API behavior is `Blocked`; existing scenario expects `Warning`. Payment submission should not be falsely certified until product confirms stage-specific severity. |
| Statutory RBAC viewer and dependent denial paths | Open failure/not-run cluster | One viewer scenario failed on expected evidence-view copy; two following RBAC scenarios did not run in the same file. |
| P100 lifecycle and finance handoff certification | Open failure cluster | P100 adjustment status refresh and output run heading/navigation failed, so the complete close/output/finance handoff lifecycle is not certified. |
| Provider callback/retry/idempotency | Covered and passing | Signed callback, replay guard, bad signature, retry worker and production retry evidence passed in current executable scenarios. |
| Output artifacts, TDS readiness, downloads and ESS denial | Covered and passing in current inventory | Previous 4D fixes held in final rerun; artifact pagination evidence passed. |
| Payroll reports and compact UI validation | Covered and passing in current inventory | Report/UI validation gaps are reduced, but the original 16 report/UI drift records remain unreconciled. |

Coverage conclusion: Payroll remains Not Certified after Phase 3B.4E. The current executable inventory is much healthier (75/83 passed), but enterprise release certification requires resolving the P100 lifecycle failures, statutory RBAC failure/not-run scenarios, missing-bank product decision, skipped scenario disposition and 106-to-83 scenario-count drift.

## Phase 3B.4F Coverage Impact - 2026-10-09

Phase 3B.4F resolved the remaining focused failure clusters and froze the release inventory.

| Area | Phase 3B.4F Status | Remaining Risk |
| --- | --- | --- |
| Scenario inventory drift | Controlled | Frozen manifest created at `docs/qa/10-payroll-release-test-manifest.md`; 106 records accounted as 83 current + 23 restored/reclassified baseline scenarios. Restored scenarios are not counted as passed until final execution. |
| Statutory/output/handoff RBAC | Covered in focused rerun | 3/3 scenarios passed after aligning statutory viewer expectation to current read-only evidence behavior. |
| P100 adjustment/settlement/close | Covered in focused rerun | P100 adjustment evidence passed after scoped setup query. |
| P100 finance handoff/register report | Covered in focused rerun | Backend output setup now returns register artifacts across batches and referenced batches; P100 finance scenario passed. |
| Payroll register source beyond first page | Covered by backend regression | Regression extended to verify multiple register artifacts and associated batches beyond the selected/default output page. |
| Provider conditional skips | Open disposition | Incomplete-lane activation and provider audit drilldown remain skipped by test conditions; they are not certified as passed. |
| Missing primary bank readiness classification | Open product decision | `HRADM-DEF-20261009-013` remains the main certification gate. Current behavior is `Blocked`; product must approve stage-specific expected behavior. |

Coverage conclusion: Payroll is stabilized and ready for a final full certification rerun of the frozen 106-record manifest, but it is not yet Certified. The final rerun must execute current and restored scenarios and must preserve the bank-account readiness decision as an explicit gate unless approved.

## Phase 3B.4G Coverage Impact - 2026-10-09

Phase 3B.4G executed the frozen payroll release manifest and restored drift scenarios with fresh browser evidence.

| Area | Phase 3B.4G Status | Remaining Risk |
| --- | --- | --- |
| Frozen 106-record manifest | Accounted and executed | 107 raw tests map to 106 frozen records because `PAY-FRZ-106` is a two-test statutory filing pair. No unexplained scenario drift remains. |
| Core setup, salary, rules, statutory, inputs and calculations | Covered | All passed except the missing-bank negative gate, which remains an open product decision. |
| Close/readiness warning path | Covered after focused fixture rerun | Restored warning/blocked close-readiness and warning calculation/review trace scenarios passed after using the current async employee search UI. |
| Payroll close/output/handoff lifecycle | Covered | Phase 5 close controls, outputs, P100 adjustment/settlement/close and P100 finance handoff passed. |
| Reports and exports | Covered | Payroll register, input exceptions, adjustments, review exceptions, settlements, payslip publication, salary variance, statutory deductions and statutory filing reports passed, including employee denial checks. |
| Provider callback/retry/security | Covered for executable scenarios | Signed callbacks, replay protection, bad signatures, retry worker, production retry evidence, provider ready rehearsal and provider center passed. |
| Provider conditional coverage | Open disposition | Incomplete-lane activation and production provider audit drilldown remain skipped by test conditions; release owner must decide fixture restoration or conditional exclusion. |
| Missing primary bank readiness classification | Open certification gate | Current implementation is `Blocked`; expected `Warning` is unapproved. Product must define stage-specific behavior before full certification. |

Coverage conclusion: Conditionally Certified for the executed payroll scope. The module is not Fully Certified until `HRADM-DEF-20261009-013` is approved/resolved and the two provider conditional scenarios are formally dispositioned.

## Phase 3B.5A Coverage Impact - 2026-10-10

Phase 3B.5A closed the targeted Organization, Setup and Workflow browser gaps opened in Phase 3B.5.

| Area | Phase 3B.5A Status | Remaining Risk |
| --- | --- | --- |
| Workflow assignment validation | Covered | Current compact UI validation and backend field-error mapping are aligned; no validation weakening was made. |
| Governance assignment lifecycle fixtures | Covered | Deterministic employees, departments and policies are created through supported APIs/services; persistence is verified by reopening browser edit screens. |
| Attendance policy resolution | Covered | Disposable department fixture prevents historical data from controlling resolution; equal-priority/narrower-scope and employee override behavior passed. |
| Shift assignment and roster rollout | Covered | Existing lifecycle scenarios passed in focused/affected rerun; delete/archive capability remains a product decision from prior coverage notes, not a failed test. |
| Tier-two workflow journeys | Covered | HR Admin attendance review, ESS notification detail and MSS approval modal decision context passed against current compact headings and deterministic in-app notification fixture. |
| Organization UI conditional skips | Covered under mock prerequisite | Three previously skipped scenarios passed with the spec-required local mock API. Live tenant/browser evidence remains covered by the organization master serial batch from Phase 3B.5. |

Coverage conclusion: The 12 unresolved Phase 3B.5 scenarios are covered with passing evidence. Recommended next step is a final module-wide Phase 3B.5 regression before declaring unconditional Organization/Setup/Workflow certification.

## Phase 3B.5B Coverage Impact - 2026-10-10

Phase 3B.5B executed the full original 57-scenario Organization, Setup and Workflow browser inventory after targeted remediation.

| Area | Phase 3B.5B Status | Remaining Risk |
| --- | --- | --- |
| Scenario inventory | Covered | Original 57 and current Playwright 57 reconcile exactly; no missing, renamed, merged or unexplained new scenarios. |
| Organization hierarchy and mappings | Covered | Legal entity/branch/location/business unit/department/cost center/grade/designation/employment type CRUD, employee mapping, import, RBAC and responsive polish passed. |
| Setup and policy masters | Covered | Validation, CRUD, duplicate checks, advanced controls, filters and scoped document requirements passed. |
| Governance assignments | Covered | Previously failed assignment lifecycle, resolution and roster rollout scenarios passed in the full suite. |
| Workflow and tier-two journeys | Covered | Workflow hub, template/assignment routes, ops pages, trace filters, HR Admin regularization, ESS notification and MSS approval modal passed. |
| Authorization / tenant isolation | Covered for this module scope | Organization read-only role and backend denial checks passed; no new P0/P1 authorization issue found. |

Coverage conclusion: Organization, Setup and Workflow browser scope is Certified for the original Phase 3B.5 inventory. No open coverage gap remains for the 57-scenario release scope.

## Phase 3B.6 Coverage Impact - 2026-10-10

| Area | Phase 3B.6 Status | Remaining Risk |
| --- | --- | --- |
| Notifications | Covered and passed after current-UI assertion alignment | In-app/sandbox delivery, retry, notification detail/source links and ESS payslip notification proof passed. No real external delivery proof was attempted. |
| Reports | Partially covered | 46/53 passed. Compliance report hub/summary and report assertion drift remain open; reports are not fully certified. |
| Compliance exports and manifests | Partially covered | CSV exports/manifests mostly passed, but export audit history now stores full query-bearing source endpoints while one test expected normalized base paths. |
| Audit / security evidence | Not certified | 2/2 security audit scenarios failed at tenant-admin console prerequisite/heading before support lifecycle and audit-pack proof. |
| Imports | Partially covered | Import history and leave-balance import passed; 100-employee browser bulk upload failed at missing shift-assignment import workbench. |
| Responsive / compact UI | Partially covered | Report polish checks largely passed, but `/hr-admin/notifications` has control overlap defects against the unified compact UI model. |

Coverage conclusion: Phase 3B.6 is not fully certified. Notifications can be treated as certified for sandbox/in-app proof; Reports, Audit and full Imports need Phase 3B.6A remediation and focused rerun.

## Phase 3B.6A Coverage Impact - 2026-10-10

Phase 3B.6A closed the targeted Notifications, Reports, Audit and Imports browser gaps opened in Phase 3B.6.

| Area | Phase 3B.6A Status | Remaining Risk |
| --- | --- | --- |
| Notifications compact UI | Covered in focused rerun | Notification queue/control overlap no longer reproduces in the report operations UI audit. External email/SMS delivery remains out of scope and sandbox-only. |
| Reports foundation and compliance summary | Covered in focused rerun | Current report headings, pagination, employee denial and provider filing drilldown assertions passed. Full 53-scenario reports rerun still required for final certification. |
| Compliance export audit | Covered in focused rerun | Query-bearing export source endpoints and batched export generation passed with audit evidence. Full export/report regression still required. |
| Audit / security evidence | Covered in focused rerun | Tenant-admin support lifecycle and rejected support audit/download evidence passed against current headings and messages. Full audit/security rerun still required. |
| Imports / 100-employee bulk upload | Covered in focused rerun | Full browser import chain passed for employees, bank accounts, manager mappings, shift assignments, attendance records, leave-policy assignments, leave requests and payroll inputs. |
| Large employee option resolution | Covered by implementation and browser evidence | Import workbenches now resolve beyond the first employee option page using prefix search plus exact fallback. Additional nonuniform-code import datasets can be added later if product requires. |

Coverage conclusion: targeted Phase 3B.6 failures are remediated with passing evidence. The next gate is Phase 3B.6B full regression over the 76 original scenarios; do not mark the whole module Certified solely from the focused 3B.6A rerun.

## Phase 3B.6B Coverage Impact - 2026-10-10

Phase 3B.6B executed the full original 76-scenario Notifications, Reports, Audit and Imports browser inventory after targeted remediation.

| Area | Phase 3B.6B Status | Remaining Risk |
| --- | --- | --- |
| Scenario inventory | Covered | Original 76 and current Playwright 76 reconcile exactly across 33 files; no missing, renamed, merged or unexplained new scenarios. |
| Notifications | Covered | Template/event/channel CRUD, in-app/sandbox delivery, retry, queue diagnostics, source links, ESS notification proof and compact responsive behavior passed. Real external email/SMS delivery remains out of sandbox scope. |
| Reports | Covered after focused retest | Report catalog, HR core, attendance, compliance, export audit, CSV/manifest exports, checksums, employee denial paths, filters, pagination, drilldowns and responsive layouts passed. Initial compliance export timeouts were preserved and then resolved with compact source payloads and focused retest evidence. |
| Compliance export performance | Covered | Provider receipts, statutory/challan exports and compliance summary now use compact finance-handoff source pages while preserving artifact/delivery coverage. This removes the 11.6s full-payload dependency that caused timeout failures in the large QA DB. |
| Audit / security evidence | Covered | Tenant-admin support lifecycle, rejected support access, trust audit visibility and downloadable audit-pack evidence passed without expanding unauthorized access. |
| Imports | Covered | Import history, leave-balance import and 100-employee bulk workflow passed, including shift assignments, attendance records, leave-policy assignments, leave requests, payroll inputs, batched commit behavior and exact committed import-audit lookup. |
| Responsive / compact UI | Covered for scoped screens | Notification, report, audit/import and report-family desktop/tablet/mobile checks passed. |

Coverage conclusion: Notifications, Reports, Audit and Imports are Certified for the Phase 3B.6B browser scope. External email/SMS delivery proof is intentionally excluded and remains a Phase 4 launch gate.

## Phase 3B.7 Coverage Impact - 2026-10-10

| Area | Phase 3B.7 Status | Remaining Risk |
| --- | --- | --- |
| Scenario inventory | Covered | Direct 27-scenario inventory frozen from current Playwright discovery; no removed or unexplained direct scenarios. |
| HR Admin command center | Covered | Dashboard, launch audit, guardrails, command queue, sidebar/topbar links and route health passed. |
| Launch readiness / remediation | Covered | Launch blockers, filters, audit download, manage/acknowledge modal, assignment routing and release-gate links passed. |
| SaaS operations / control / resilience / SLA | Covered | Operations posture, commercial plan/entitlements/usage limits, resilience and SLA pages passed. |
| Commercial gating and RBAC | Covered | Starter-plan entitlement denial and active-membership usage-limit denial passed with browser/API evidence. |
| Responsive shell and accessibility | Covered for scoped HR screens | Mobile HR menu and workspace search/menu stacking passed after UI fix. |
| Performance budget | Open | `/hr-admin/payroll-handoff` repeatedly exceeded local document-response budget. |

Coverage conclusion: Command Center, Launch Readiness and Operations are functionally Certified for Phase 3B.7. Overall Phase 3B.7 is Conditionally Certified until payroll-handoff performance is remediated or formally accepted as a release exception.
## Phase 3B.7A Coverage Impact - 2026-10-10

| Area | Phase 3B.7A Status | Remaining Risk |
| --- | --- | --- |
| Payroll handoff performance | Covered | Handoff setup payload is now compact for the browser page; payroll handoff document response revalidated under the 4s budget at 2.85s, 3.11s and 3.34s in post-fix sample sets. |
| Payroll handoff functionality | Covered | Handoff evidence lanes, artifact pagination/download, finance reports, statutory reports and TDS readiness passed focused browser regressions. |
| API compatibility | Covered with opt-in behavior | Existing API callers still receive output batches by default; detailed payslip render payloads are available only when requested with `include_payslip_detail=true`. |
| Broader launch performance suite | Open risk outside original defect | Later full performance runs failed on `/hr-admin/payroll-providers` and `/mss/approvals` while payroll handoff passed. Track these as separate route-performance risks if Phase 3C requires repeated full-suite stability. |

Coverage conclusion: `HRADM-DEF-20261010-028` is remediated for the payroll handoff route. Phase 3C readiness is acceptable for the handoff blocker, but a broader performance stability pass should be scheduled if the release gate requires every launch-critical route to pass repeatedly, not just the remediated handoff route.

## Phase 3C.3 Coverage Impact - 2026-10-10

| Area | Phase 3C.3 Status | Remaining Risk |
| --- | --- | --- |
| Tenant/org to employee continuity | Covered for workforce scope | HR Admin UI employee creation, duplicate prevention, manager mapping, ESS visibility and DB persistence passed for disposable PH3C3 records. |
| Employee documents and onboarding | Covered with evidence limitation | Upload, onboarding guard, checklist completion and DB persistence passed. Generic HR Admin audit search is not available at `/api/hr-admin/audit`, so immutable audit evidence remains unverified for this journey. |
| Role provisioning and ESS/MSS | Covered | Fresh employee/manager workspace access passed. Employee sees only ESS; manager reaches MSS approvals. |
| Restricted persona | Covered for same-tenant HR workforce objects | Restricted persona was denied employee-access API with `403` and did not remain on the HR employees route. |
| Lifecycle access revocation | Covered | Revoking employee tenant membership through HR Admin access workflow blocked stale ESS access and persisted `revoked` membership state. |
| Full cross-tenant workforce isolation | Blocked | Phase 3C.2 certified only one tenant (`northstar-foods`). A second isolated PH3C tenant/persona fixture is required before `HRADM-E2E-020` can be certified for Tenant A -> Tenant B employee/document object isolation. |

New gaps:

| Gap ID | Scenario ID | Priority | Summary | Required next action |
| --- | --- | --- | --- | --- |
| `3C-GAP-WF-AUD-001` | `HRADM-E2E-002` | P1 | Onboarding/document workflow passed, but generic HR Admin audit evidence was not verified because `/api/hr-admin/audit` returned `404`. | Identify the supported audit evidence source for employee lifecycle events, or add a scoped audit evidence endpoint/test if product requires generic HR Admin audit search. |
| `3C-GAP-XTENANT-001` | `HRADM-E2E-020` | P0 | Full cross-tenant employee/document isolation could not run with only one certified tenant fixture. | Add deterministic second PH3C tenant/persona fixture, then execute the object-isolation scenario for employee/document IDs. |

Coverage conclusion: Phase 3C.3 employee lifecycle/workforce scope is conditionally certified for same-tenant employee creation, access, documents, onboarding guard and revocation workflows. Full cross-tenant proof and lifecycle audit evidence remain open before complete workforce E2E signoff.

## Phase 3C.4 Coverage Impact - 2026-10-10

| Area | Phase 3C.4 Status | Remaining Risk |
| --- | --- | --- |
| Attendance import and edit persistence | Covered | Focused serial browser rerun passed import preview/commit, edit/save and persisted record evidence. |
| Shift assignments / roster conflict handling | Covered at existing automation level | Reused scenario passed create/edit/conflict/rollout preview. Destructive delete/archive remains a prior product decision, not a Phase 3C.4 failure. |
| ESS leave validation and unit calculation | Covered | ESS leave suite passed date/evidence validation, optional submission and roster-aware working-day calculation. |
| Leave to payroll input propagation | Covered by seeded PH3C evidence | DB reconciliation shows approved leave for `PH3C_20261010_E041` reflected in payroll input snapshot with `approved_requests: 1`, `present_days: 20`, `lop_days: 2`. |
| 100-employee payroll-input linkage | Covered for seeded fixture | 100 employees, 2,200 attendance rows, 15 leave requests and 200 payroll input snapshots verified in `db.phase3c_e2e.sqlite3`. |
| Duplicate input generation / lock restrictions | Deferred | Not freshly mutated in this time/attendance/leave batch. Execute under payroll lifecycle/recovery scenarios to avoid mixing payroll lock semantics into Phase 3C.4. |

New gap:

| Gap ID | Scenario ID | Priority | Summary | Required next action |
| --- | --- | --- | --- | --- |
| `3C-GAP-TLA-COLLISION-001` | `HRADM-E2E-006` | P1 | Fresh overlap/collision report execution was not run in Phase 3C.4. Negative leave validation and roster working-day calculation passed, but collision/report proof is inherited from earlier module certification. | Run focused leave-attendance collision/report scenario in the recovery/report reconciliation batch, or add it to Phase 3C.6 final regression. |

Coverage conclusion: Phase 3C.4 is certified for attendance import/edit, shift/roster positive/conflict coverage, ESS leave validation, roster-aware leave units and seeded leave/attendance-to-payroll-input propagation. Collision/report negative proof and payroll input lock/idempotency remain tracked outside this batch.

## Phase 3C.5 Payroll Lifecycle / Output / Finance Handoff Coverage Update - 2026-10-10

| Area | Coverage Status | Evidence |
| --- | --- | --- |
| Payroll calculation and gross-to-net reconciliation | Covered | `docs/qa/evidence/phase3c5/05-output-payslip-ess-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` |
| Adjustment and settlement lifecycle | Covered | `07-adjustments-settlements-close-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` |
| Payroll lifecycle RBAC | Covered | `08-security-provider-statutory-performance-browser.log` |
| Output publish, payslips, register and ESS ownership | Covered | `05-output-payslip-ess-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` |
| Finance handoff, artifacts and provider reconciled deliveries | Covered | `06-finance-handoff-compliance-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` |
| Provider callback/retry idempotency path | Covered after rerun | `08-security-provider-statutory-performance-browser.log`, `10-provider-retry-worker-rerun.log` |
| Payroll handoff performance regression guard | Covered | `09-handoff-performance-browser.log` |

Remaining gaps / risks:

| Gap ID | Scenario | Status | Risk |
| --- | --- | --- | --- |
| `HRADM-DEF-20261010-030` | `HRADM-E2E-015` | Open | Statutory filing status report evidence/source marker was not visible in the browser report after artifact sorting; statutory filing evidence display remains partial. |
| `HRADM-DEF-20261010-031` | `HRADM-E2E-015` | Open test gap | Employee TDS package denial test stops at stale ESS heading assertion before API denial proof. |
| `3C-GATE-PROV-001` | `HRADM-E2E-012` | Open conditional | Incomplete provider lane safety not freshly executed in Phase 3C.5. |
| `3C-GATE-PROV-002` | `HRADM-E2E-013` | Open conditional | Production provider audit-pack drilldown still lacks real sandbox provider evidence/formal disposition. |
| `HRADM-DEF-20261009-013` | `HRADM-E2E-016` | Open product decision | Missing primary bank-account readiness classification remains unapproved by payroll/finance owner. |

Coverage conclusion: Phase 3C.5 is conditional. Core payroll lifecycle/output/handoff coverage is strong, but statutory filing evidence, TDS negative automation and release-gate decisions must be resolved before unconditional cross-module payroll signoff.

## Phase 3C.6 Coverage Impact - 2026-10-10

| Area | Phase 3C.6 Status | Remaining Risk |
| --- | --- | --- |
| Workflow routing and notification propagation | Covered | ESS document notification, ESS payroll notification, MSS approval switching, HR attendance review, workflow trace and retry diagnostics passed. External email/SMS delivery is excluded and remains Phase 4. |
| Notification retry/recovery | Covered | Queue filters, full review retry, bulk retry, capped retry and diagnostics passed through browser automation. |
| RBAC and tenant isolation | Covered | Current scoped role/tenant proof passed, including actual two-tenant negative employee/department/notification/payroll artifact access and mutation denial in `db.phase3c_e2e.sqlite3`. |
| Audit and reporting | Covered through supported sources | Report catalog/export audit/import history/collision report/trust-security audit evidence passed. Generic `/api/hr-admin/audit` is not available, so supported audit sources are the certified evidence path. |
| Statutory/TDS carry-forward | Covered | Statutory filing report now has deterministic filing/calendar evidence and TDS package positive/negative paths passed. |
| Command center / launch / operations / performance | Covered | Command center, launch remediation, production release gate and launch-critical performance passed in Phase 3C.6. |
| Recovery / idempotency | Covered for local notification/release evidence paths | Provider incomplete-lane and audit-pack conditionals remain release gates and are not counted as passed. |

Closed gaps:

| Gap / Defect ID | Status | Evidence |
| --- | --- | --- |
| `3C-GAP-XTENANT-001` | Closed | `docs/qa/evidence/phase3c6/03e-cross-tenant-isolation-certified-db-rerun2.log`, `06-db-reconciliation-rerun.json` |
| `3C-GAP-TLA-COLLISION-001` | Closed | `docs/qa/evidence/phase3c6/04-reports-audit-recovery-browser.log` |
| `3C-GAP-WF-AUD-001` | Closed for supported audit sources | `02-workflow-notification-audit-browser.log`, `04b-report-denial-rerun.log` |
| `HRADM-DEF-20261010-030` | Closed for local Phase 3C statutory report fixture | `00-statutory-fixture-seed.json`, `01-statutory-tds-defect-revalidation-rerun3.log` |
| `HRADM-DEF-20261010-031` | Closed | `01-statutory-tds-defect-revalidation-rerun3.log` |

Coverage conclusion: Phase 3C.6 is certified for the scoped local/sandbox workflow, notification, RBAC, audit, reporting and operations E2E scope. Remaining risks are product/release gates rather than newly discovered functional gaps: missing-bank readiness decision, provider conditionals and Phase 4 external/deployed evidence.

## Phase 3C.7 Final Cross-Module Coverage - 2026-10-10

Original Phase 3C inventory: 32 unique E2E scenario IDs. Final local/sandbox coverage: 29 Passed, 3 Conditional, 0 Failed, 0 Blocked, 0 Not Run.

| Coverage area | Final status | Evidence |
| --- | --- | --- |
| Tenant/org/employee/documents/ESS/MSS lifecycle | Covered | `docs/qa/evidence/phase3c7/01-workforce-lifecycle-regression.log` |
| Time/leave/attendance/roster/payroll-input linkage | Covered | `02-time-leave-attendance-payroll-input-regression.log`, `02b-time-to-payroll-rerun.log`, `05-final-db-reconciliation.json` |
| Payroll calculation/adjustment/output/payslip/statutory/handoff/provider retry | Covered for local/sandbox scope | `03-payroll-lifecycle-output-handoff-regression.log`, `03b-output-payslip-rerun.log`, `05-final-db-reconciliation.json` |
| Workflow/notifications/RBAC/two-tenant isolation/audit/reporting/recovery | Covered | `04-workflow-rbac-reporting-launch-regression.log`, `05-final-db-reconciliation.json` |
| Command center/launch readiness/performance | Covered | `04-workflow-rbac-reporting-launch-regression.log`, `06-backend-check.log`, `07-web-tsc.log` |

Remaining non-certified gates:

| Gap / Gate | Affected IDs | Status |
| --- | --- | --- |
| Missing bank-account readiness product decision | `HRADM-E2E-016` | Conditional; not certified until business owner approves expected behavior. |
| Provider incomplete-lane sandbox proof | `HRADM-E2E-012` | Conditional; requires real sandbox evidence or approved exclusion. |
| Provider audit-pack drilldown sandbox proof | `HRADM-E2E-013` | Conditional; requires real sandbox evidence or approved exclusion. |
| Real external email/SMS, deployed RBAC, backup/restore, real-tenant handoff | Phase 4 gates | Explicitly excluded from local Phase 3C certification. |

Coverage conclusion: Phase 3C.7 closes all locally executable cross-module coverage gaps. The product is conditionally certified for local/sandbox cross-module E2E scope, with remaining gaps limited to documented release/product/provider gates.
