# Phase 3A Test Execution Plan

Date: 2026-10-09
Scope: HR Admin current-release execution preparation only
Execution status: Batch 1 backend/API foundation executed on 2026-10-09; browser execution not started.

## Inputs Read

- Phase 1: `00-master-qa-plan.md`, `01-screen-inventory.md`, `02-functionality-matrix.md`
- Phase 2: `03-existing-test-inventory.md`, `04-test-case-mapping.md`, `05-test-coverage-gap-analysis.md`, `06-master-test-case-register.md`

## Scenario-Level Register Expansion

| Metric | Count |
| --- | ---: |
| Scenario rows prepared | 1439 |
| Executable test rows | 1186 |
| Playwright suite/group rows retained for traceability | 253 |
| Existing functionality mappings preserved | 45 |
| Gap specifications preserved | 9 |
| Current-release certified executions | 0 |

Suite/group rows are included because the Phase 2 discovery count included Playwright `test.describe` blocks as scenario-level traceability anchors. Execution batches should run executable test rows; suite rows remain planning/evidence containers.

## Module Distribution

| Module | Scenario Rows |
| --- | --- |
| Time/Leave/Attendance | 172 |
| Setup | 72 |
| Documents | 64 |
| Payroll | 282 |
| Unmapped/Adjacent | 420 |
| Reports | 72 |
| Workforce | 189 |
| Notifications | 52 |
| Command/Ops | 66 |
| Audit | 50 |

## Priority Distribution

| Priority | Scenario Rows |
| --- | --- |
| P0 | 476 |
| P1 | 833 |
| P2 | 130 |

## Execution Batches

| Batch | Priority | Scope | Purpose | Entry Criteria | Exit Criteria |
| --- | --- | --- | --- | --- | --- |
| 0 | P0 | Environment preflight only | Confirm local/staging target, credentials, data protection, ports, API base URLs | Backend and web config known; no production mutation target unless explicitly approved | Health/session smoke ready for execution |
| 1 | P0 | Backend domain/API foundation | Django backend tests for attendance, leave, payroll, documents, common HR Admin APIs, phase0 API smoke | Test database configured; no live tenant mutation | All P0 backend/API tests pass or defects logged |
| 2 | P0 | Workforce/documents/access | Employee directory/import/bank/access/document/onboarding tests | HR admin and limited-role credentials; tenant has isolated test data | CRUD/import/RBAC pass or defects logged |
| 3 | P0 | Attendance/leave/roster | Attendance records, regularization, roster, leave import/balance/policy tests | Roster, shift, employee, leave policy data available | Mutation, import, approval, and RBAC paths pass or defects logged |
| 4 | P0 | Payroll close spine | Payroll readiness, inputs, calculations, review, outputs, handoff, adjustments, settlements | Payroll period and safe employee data prepared; no real payout transmission | Close-cycle state transitions pass or defects logged |
| 5 | P1 | Reports/exports/audit | Individual report specs, export manifest/audit, deep links | Report seed data present; export directory safe | CSV/manifest/deep links pass or defects logged |
| 6 | P1 | Notifications/setup/workflows | Notification setup/delivery/diagnostics, organization/workflow setup | Notification provider calls mocked or safe sandbox | CRUD, preview, retry, and delivery diagnostics pass or defects logged |
| 7 | P2 | UX/visual/route audits | Unified design, compact hubs, visual baselines, route smoke | App stable after functional batches | No blocking UI regressions; screenshots archived |

## Phase 3B.1A Bootstrap Remediation Record - 2026-10-09

| Item | Result | Evidence |
| --- | --- | --- |
| Root-cause trace | Seeded pending leave landed entirely on Saturday/Sunday under the seeded Mon-Fri shift; leave policy correctly calculated zero working leave days | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` and code trace |
| Fix | Bootstrap pending leave seed now chooses the next two contiguous weekdays from the anchor date | `backend/apps/common/management/commands/bootstrap_demo_workspace.py` |
| Regression coverage | Seed helper verifies 2026-10-09 anchors to 2026-10-26/2026-10-27; leave service still rejects weekend-only requests | `docs/qa/evidence/phase3b1/07-bootstrap-remediation-focused.log` |
| Two previous seed failures | Passed | `docs/qa/evidence/phase3b1/07-bootstrap-remediation-focused.log` |
| Full API smoke revalidation | 331 passed, 25 failed, 0 blocked/errors | `docs/qa/evidence/phase3b1/08-phase0-api-smoke-after-bootstrap-fix.log` |

Batch 1 status after Phase 3B.1A: bootstrap blocker resolved, but backend/API foundation is **not yet release-certified** because 25 smoke assertions remain failed. Browser certification should wait for triage or explicit risk acceptance.

## Phase 3B.1 Batch 1 Execution Record - 2026-10-09

Batch 1 was executed module-wise using `backend/.venv/bin/python -m pytest` from the dedicated Django test environment. Pytest-django created isolated test databases; the smoke log confirms `Creating test database for alias 'default' ('file:memorydb_default?mode=memory&cache=shared')`. No production database, browser mutation suite, or production configuration was used.

| Batch Item | Command Scope | Result | Duration | Evidence | Classification |
| --- | --- | --- | ---: | --- | --- |
| Attendance domain tests | `apps/attendance/tests.py` | Passed 21/21 | 21.60s | `docs/qa/evidence/phase3b1/01-attendance.log` | Certified for this batch |
| Common/setup/domain tests | `apps/common/tests.py` | Passed 17/17 | 26.36s | `docs/qa/evidence/phase3b1/02-common.log` | Certified for this batch |
| Documents domain tests | `apps/documents/tests.py` | Passed 5/5 | 23.02s | `docs/qa/evidence/phase3b1/03-documents.log` | Certified for this batch |
| Leave domain tests | `apps/leave_management/tests.py` | Passed 27/27 | 41.96s | `docs/qa/evidence/phase3b1/04-leave-management.log` | Certified for this batch |
| Payroll domain tests | `apps/payroll/tests.py` | Passed 17/17 | 22.55s | `docs/qa/evidence/phase3b1/05-payroll.log` | Certified for this batch |
| Phase0 API smoke | `tests/test_phase0_api_smoke.py` | 11 passed, 2 failed, 343 blocked/errors | 1026.03s | `docs/qa/evidence/phase3b1/06-phase0-api-smoke.log` | Release blocker: `HRADM-DEF-20261009-001` |

Exit criteria status: Batch 1 remains **not fully certified**. `HRADM-DEF-20261009-001` is resolved, but `HRADM-DEF-20261009-002..006` track 25 current smoke failures. The isolated backend domain suites passed and remain valid evidence for their scoped functionality.

Recommended next step: triage the 25 remaining API smoke failures, then re-run `backend/tests/test_phase0_api_smoke.py`. Proceed to Batch 2 browser P0 workforce/documents/access only after backend/API risk is accepted or cleared.

## Recommended First Execution Batch

Batch 1 should run backend/API foundation first because it is fastest to isolate business-rule failures before browser suites consume data. Recommended initial files:

- `backend/apps/attendance/tests.py`
- `backend/apps/common/tests.py`
- `backend/apps/documents/tests.py`
- `backend/apps/leave_management/tests.py`
- `backend/apps/payroll/tests.py`
- `backend/tests/test_phase0_api_smoke.py`

Then move to the first browser P0 slice:

- `web/tests/e2e/employee-directory-certification.spec.ts`
- `web/tests/e2e/employee-documents-onboarding-certification-flows.spec.ts`
- `web/tests/e2e/ess-notifications-launch-certification.spec.ts`
- `web/tests/e2e/governance-assignment-form-flows.spec.ts`
- `web/tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts`
- `web/tests/e2e/hr-admin-documents-notifications-ui-audit.spec.ts`
- `web/tests/e2e/hr-admin-documents-notifications-workflow-certification.spec.ts`
- `web/tests/e2e/notification-setup-crud-flows.spec.ts`
- `web/tests/e2e/organization-master-crud-flows.spec.ts`
- `web/tests/e2e/payroll-adjustments-flows.spec.ts`
- `web/tests/e2e/payroll-adjustments-report-certification.spec.ts`
- `web/tests/e2e/payroll-calculations-flows.spec.ts`
- `web/tests/e2e/payroll-handoff-flows.spec.ts`
- `web/tests/e2e/payroll-inputs-flows.spec.ts`
- `web/tests/e2e/payroll-review-exception-decision-certification.spec.ts`
- `web/tests/e2e/payroll-review-exceptions-report-certification.spec.ts`
- `web/tests/e2e/payroll-review-flows.spec.ts`
- `web/tests/e2e/payroll-settlements-report-certification.spec.ts`

## Prerequisites

- Confirm target environment: local test stack, staging, or other isolated tenant.
- Confirm credentials for HR admin, tenant admin, employee, manager, payroll operator, finance/provider roles where required.
- Confirm `PLAYWRIGHT_BASE_URL`, `HRMS_API_BASE_URL`, and seed password variables.
- Confirm whether mutation suites may create/update test employees, payroll runs, documents, notification configs, imports, and provider evidence.
- Freeze current test data snapshot or use disposable tenant data before P0 mutation batches.
- Capture evidence path convention before execution: trace, screenshot, video, API response, and generated artifact location.

## Data Safety

- Do not run mutation suites against production tenant data unless the user explicitly approves the target and rollback plan.
- Prefer local disposable database or staging tenant with test identifiers.
- Disable real payroll provider transmission, real bank advice transmission, and real notification delivery unless providers are sandboxed.
- Preserve import source files and created object IDs in execution notes.
- Treat payroll publish, handoff transmit, statutory filing, and provider retry suites as release-blocking P0 operations.

## Release-Blocking Criteria

A defect blocks release if it affects any P0 scenario involving:

- RBAC/tenant isolation failure or unauthorized HR Admin access.
- Payroll input lock, calculation, review approval, output publish, signed artifact access, or finance handoff integrity.
- Attendance/leave data corruption that impacts payroll.
- Employee master import/access/bank data mutation failure that blocks payroll readiness.
- Report export/audit evidence failure for compliance-critical reports.
- Notification/provider retry behavior that leaks data or fails silently.
- UI blocking issue preventing HR users from completing compact single-responsibility workflows.

## Unresolved Dependencies

- Fresh current-release evidence is required for every historical-pass row.
- Several scenario mappings are heuristic because many tests are cross-workspace or broad certification suites.
- Some weak assertion rows need code review before execution to decide whether to keep, improve, or demote.
- P0 gap specs from Phase 2 remain unautomated and must not be counted as existing execution coverage.

Phase 3A stops here.
## Phase 3B.1B Completion Note - 2026-10-09

Backend/API foundation revalidation is complete for the remediated smoke failures.

Completed batches:

| Batch | Status | Evidence |
| --- | --- | --- |
| Original Phase 3B.1A failure slice | Passed | Superseded by full smoke rerun |
| Complete Phase 0 API smoke | Passed, 356/356 | `docs/qa/evidence/phase3b1/10-phase0-api-smoke-after-3b1b-rerun.log` |
| Affected payroll/common/leave suites | Passed, 63/63 | `docs/qa/evidence/phase3b1/11-affected-backend-suites-after-3b1b.log` |

Recommended next batch: begin browser certification with the first P0 HR Admin Playwright slice from this plan, prioritizing compact HR Admin operations, payroll handoff/readiness, leave/attendance approval paths, and tenant/RBAC navigation. Do not carry backend defects `HRADM-DEF-20261009-002..006` as open blockers into browser testing; reopen only if browser evidence reproduces a user-facing failure.

## Phase 3B.2 Browser Batch Execution Record - 2026-10-09

Batch executed: HR Admin P0 browser certification for Workforce, Documents, and Access/RBAC.

Environment and safety:

| Item | Verified Result |
| --- | --- |
| Browser runtime | Playwright Chromium via `web/playwright.config.ts` |
| Frontend | Local Next dev server on `PLAYWRIGHT_PORT=3211` |
| Backend | Local Django API `http://127.0.0.1:8011/api/v1` |
| Database | Dedicated SQLite file `backend/db.phase3b2_browser.sqlite3` |
| Seed | `bootstrap_demo_workspace --password Password@123` |
| Production data | Not used |
| External side effects | No real provider, payroll, bank, or notification submission approved or executed |

Execution order used:

1. Workforce/Employee Directory existing Playwright suites.
2. Documents/Onboarding/Document setup existing Playwright suites.
3. Access/workspace RBAC existing Playwright suites.
4. New focused responsive compact UI coverage for tablet/mobile gaps confirmed in Phase 2/3A.

Actual batch outcomes:

| Batch | Status | Follow-up |
| --- | --- | --- |
| Workforce | Passed 7/7 | No retest required unless related code changes. |
| Documents | 4/5 passed | Fix onboarding completion-guard test data and rerun that scenario. |
| Access/RBAC | 10 passed, 2 failed, 2 not run | Align stale MSS heading assertion; seed or document `payroll.finance`; rerun failed/blocked access slice. |
| Responsive compact UI | Passed 2/2 after QA-label correction | Keep new responsive spec as the scoped canonical compact evidence for Workforce/Documents/Access. |

Revalidation plan before next browser phase:

| Priority | Action | Target |
| --- | --- | --- |
| P0 | Rewrite onboarding completion guard to submit an open blocking checklist item or true missing-document blocker, then rerun the single failed scenario. | `employee-documents-onboarding-certification-flows.spec.ts` |
| P1 | Update duplicate read-only auth suite to current MSS heading or delegate the assertion to the newer access journey suite. | `deployed-readonly-auth-routing.spec.ts` |
| P1 | Add/verify seeded payroll finance persona before finance workspace certification. | `bootstrap_demo_workspace` or test environment credentials |

Next recommended browser batch after this retest: Time/Leave/Attendance P0, covering leave queues, attendance regularizations, attendance record import/edit, shift/roster compact operations, and time-to-payroll readiness.

## Phase 3B.2A Remediation and Revalidation Record - 2026-10-09

Revalidation was completed for the three Phase 3B.2 browser defects.

| Item | Outcome |
| --- | --- |
| Onboarding completion guard | Corrected test fixture to keep one blocking checklist item open; focused and related reruns passed. |
| MSS heading assertion | Updated duplicate read-only routing suite to current heading copy; access rerun passed. |
| Payroll finance credentials | Seeded with `seed_pilot_named_users` in the isolated local database; finance workspace routing passed. |
| Responsive compact check | Reran and passed tablet/mobile scoped screens. |
| Optional no-access scenario | Still Not Run because `PLAYWRIGHT_LIVE_NO_ACCESS_USERNAME` was not configured. This is not a blocker for Phase 3B.3. |

Next recommended batch remains Phase 3B.3 Time/Leave/Attendance P0 browser certification. Carry forward no open failed/blocking defects from Workforce/Documents/Access; only the optional no-access persona dependency remains.

## Phase 3B.3 Completion and Next Batch Recommendation - 2026-10-09

Phase 3B.3 Time/Leave/Attendance/Roster browser certification is complete for the scoped P0 batch.

| Area | Result | Follow-up |
| --- | --- | --- |
| Leave management, balances, policies, holiday calendars | Passed | Continue with future leave import/detail coverage under P1. |
| Attendance records, imports, regularizations | Passed | Positive import commit and edit/save persistence are now certified. |
| Shift assignments and roster templates | Passed with capability gap | Create/edit/conflict/rollout preview certified; delete/archive requires product decision because no delete API exists. |
| RBAC and compact UI checks | Passed for executed scope | Keep full every-screen responsive/UX consistency sweep as a later phase. |

Recommended next execution batch: Phase 3B.4 Payroll certification, prioritizing payroll handoff transitions, adjustment/settlement lifecycle, statutory declaration item review, provider mappings, and payroll compact responsive behavior. Do not begin automatically without user approval.

## Phase 3B.3A Stabilization Completion - 2026-10-09

Phase 3B.3A is complete. The duplicate leave-policy backend 500 was fixed and revalidated, and the previously skipped roster rollout scenario was executed successfully.

| Stabilization Item | Status | Next Action |
| --- | --- | --- |
| `HRADM-DEF-20261009-010` duplicate leave-policy validation | Resolved | Keep regression coverage in backend and browser suites. |
| Formerly skipped roster rollout scenario | Passed | No remaining Phase 3B.3 skipped scenario in stabilization scope. |
| Shift assignment / roster template delete/archive | Product decision | Do not implement delete endpoints until requirements are approved. |

Next recommended batch remains Phase 3B.4 Payroll certification.

## Phase 3B.4 Payroll Certification Outcome and Next Plan - 2026-10-09

Phase 3B.4 executed the planned payroll browser certification pass and stopped after payroll scope.

| Area | Result | Follow-up |
| --- | --- | --- |
| Payroll setup, salary setup, statutory setup, inputs | Partial pass | Reconcile stale compact UI assertions, then rerun failed frontend-validation/import scenarios. |
| Calculations and review | Failed/partial | Update stale selected-detail assertions and provide deterministic ready review data for lifecycle tests. |
| Outputs and payslip artifacts | Workspace passed; lifecycle failed | Seed or create deterministic locked review/output batch before artifact, register, download and ESS-scope certification. |
| Finance handoff/provider | Workspace/provider center passed; lifecycle blocked | Provide deterministic sandbox handoff with provider delivery states, then rerun transmit/ack/retry/audit-pack tests. |
| Adjustments and settlements | Workspace passed; lifecycle blocked | Seed or create the required local pilot run before approval/apply/close certification. |
| Payroll reports/UI | Partial | Rerun finance report in isolation; update compact page readiness assertions; resolve typography audit threshold. |

Recommended next phase: Phase 3B.4A Payroll Stabilization and Revalidation.

Priority order:

1. Create a deterministic local payroll browser seed/rehearsal command or fixture path for one complete payroll lifecycle: employee, salary assignment, input snapshot, calculation, approved review, locked output batch, finance handoff, provider delivery, payroll register and payslip artifacts.
2. Update stale Playwright contracts for the compact HR Admin payroll model using current page landmarks/test IDs instead of old H1 text and ambiguous text locators.
3. Confirm the missing-bank-account readiness severity with product; align either the UI/business rule or the test expectation.
4. Rerun focused failed suites first, then rerun the complete Phase 3B.4 payroll batch.
5. Only after the above passes, add any genuinely missing focused tests for remaining handoff/provider and adjustment/settlement edge cases.

## Phase 3B.4A Completion and Next Execution Plan - 2026-10-09

Phase 3B.4A focused stabilization is complete. The deterministic local payroll lifecycle fixture is available in the isolated QA database, focused P100 output/handoff/adjustment/report flows pass, and the report runner no longer blocks isolated execution.

Next recommended batch: full Phase 3B.4 payroll browser rerun.

Execution order:

1. Rerun core payroll screens: readiness, setup, salary, rules, statutory, inputs, calculations and review.
2. Rerun lifecycle suites: adjustments, settlements, close controls, outputs, payslips and artifact access.
3. Rerun finance handoff/provider suites: handoff workspace, P100 finance handoff, provider callbacks, retry worker, provider mappings and audit packs.
4. Rerun RBAC/negative controls and payroll report/UI suites.
5. Reconcile totals against the original 106-scenario Phase 3B.4 batch and update certification status only from fresh rerun evidence.

Prerequisites:

| Prerequisite | Status |
| --- | --- |
| Local isolated QA DB | Ready: `backend/db.phase3b2_browser.sqlite3` |
| P100 workforce/input/snapshot fixture | Ready |
| P100 locked input/calculation/output/handoff fixture | Ready for focused scope; verify before full rerun |
| Finance persona | Ready through supported local seed credentials |
| External provider/payment rails | Must remain sandboxed/mocked |
| Missing primary bank severity | Product confirmation still required before changing expected result |

## Phase 3B.4B Completion and Next Plan - 2026-10-09

Phase 3B.4B completed the full payroll browser rerun using the current executable file set. Payroll remains Not Certified.

Next recommended stabilization batch: Phase 3B.4C.

Priority order:

1. Product decision: confirm whether missing primary bank account should be `Blocked` for payment/disbursement readiness while possibly remaining `Warning` for calculation-only readiness.
2. Fix or retire stale compact frontend-validation expectations so scenarios assert the form validation behavior instead of obsolete page titles.
3. Repair disposable lifecycle fixture helpers so output artifact, review decision, negative controls, ESS artifact access and register export scenarios can select current employees/artifacts.
4. Investigate provider callback HTTP 400 and retry worker setup failure; classify product defect versus automation fixture.
5. Rerun only failed/not-run Phase 3B.4B scenarios, then rerun the full payroll file set once the failure clusters are clean.

## Phase 3B.4C Completion and Next Plan - 2026-10-09

Phase 3B.4C completed targeted remediation and focused revalidation. Do not launch the final full payroll certification rerun yet.

Recommended next stabilization batch before full rerun:

1. Fix or deliberately re-fixture provider retry worker so retryable sandbox deliveries execute to `executed:completed` with queue evidence.
2. Build a disposable output/handoff fixture that includes bank advice and statutory report artifacts before transmit.
3. Update artifact access isolation to select a published payslip/register artifact deterministically, or confirm whether accounting exports must expose a `Download file` link.
4. Decide and document missing-bank readiness severity for calculation, approval/output, and payment submission.
5. Reconcile the 16 original 106-scenario drift IDs before the final full rerun; do not count missing scenarios as certified.

Recommended next execution batch: Phase 3B.4D focused cleanup for the four remaining open items, then Phase 3B.4E final full payroll browser certification.

## Phase 3B.4D Completion and Next Plan - 2026-10-09

Phase 3B.4D focused cleanup is complete. The remaining provider retry, disposable handoff artifact, TDS readiness and artifact access blockers passed focused revalidation. Static checks also passed.

Do not mark Payroll Certified from this focused pass alone. The next execution batch should be Phase 3B.4E final full payroll browser certification.

Phase 3B.4E prerequisites:

| Prerequisite | Status |
| --- | --- |
| Isolated local QA DB | Ready: `backend/db.phase3b2_browser.sqlite3` |
| Sandbox provider/payment operations | Required; no real external submission |
| Provider retry fixture | Ready for focused scope via fresh disposable failed delivery |
| Finance handoff artifact readiness | Ready for focused scope; selected handoff readiness no longer depends on paged artifact rows |
| TDS PDF-tax readiness | Ready for focused scope; payslip render detail available in setup payload |
| Artifact access/download | Ready for focused scope using deterministic register artifact |
| Missing bank-account severity | Open product decision; do not change expected behavior without confirmation |
| Original 106 versus current 90 drift | Open QA reconciliation item; identify/restore/descoped 16 missing scenario records before final certification signoff |

Recommended Phase 3B.4E order:

1. Re-list current payroll Playwright inventory and reconcile it against the original 106 scheduled scenarios before execution.
2. Run the complete current payroll browser file set in small batches: core payroll, adjustments/settlements, outputs/artifacts, finance handoff/provider, RBAC/negative controls, reports/UI.
3. Preserve Phase 3B.4D evidence as focused retest history, but certify only from fresh full-rerun results.
4. Keep missing-bank readiness as an explicit product decision if still unresolved; do not falsely pass the affected readiness scenario.

## Phase 3B.4E Completion and Next Plan - 2026-10-09

Phase 3B.4E executed the current payroll browser inventory and stopped after payroll scope. Payroll is Not Certified.

Final rerun evidence:

| Batch | Evidence | Result |
| --- | --- | --- |
| Inventory list | `docs/qa/evidence/phase3b4e/00-current-payroll-inventory-list.log` | 83 tests in 33 files |
| Core payroll | `docs/qa/evidence/phase3b4e/01-core-payroll-final-rerun.log` | 24 passed, 2 failed, 2 not run |
| Lifecycle/output/provider | `docs/qa/evidence/phase3b4e/02-lifecycle-output-provider-final-rerun.log` | 22 passed, 2 failed, 2 skipped |
| RBAC/reports/UI | `docs/qa/evidence/phase3b4e/03-rbac-reports-ui-final-rerun.log` | 29 passed |
| Static checks | `docs/qa/evidence/phase3b4e/04-backend-check.log`, `docs/qa/evidence/phase3b4e/05-web-tsc.log` | Passed |

Next recommended stabilization batch: Phase 3B.4F.

Priority order:

1. Resolve `HRADM-DEF-20261009-019`: inspect P100 adjustment setup refresh and payroll-output batch selection; rerun the two failed P100 lifecycle scenarios.
2. Resolve `HRADM-DEF-20261009-018`: confirm whether statutory viewer copy changed or read-only evidence affordance is missing; rerun all three statutory/output/handoff RBAC scenarios.
3. Get product approval for `HRADM-DEF-20261009-013`: classify missing primary bank account separately for calculation, approval/output, payslip publication and payment submission.
4. Reconcile 106 original scenarios to the 83 current executable scenarios, including the known 16 report/UI drift records and the additional 7 current inventory differences.
5. Explicitly disposition the two skipped provider scenarios before certification.

Recommended retest scope after fixes: failed/not-run/skipped scenarios first, then a full payroll browser rerun of the current inventory, plus any restored missing critical scenarios.

## Phase 3B.4F Completion and Next Plan - 2026-10-09

Phase 3B.4F completed targeted stabilization and inventory freeze. Do not start the full payroll suite automatically.

Completed:

1. Frozen 106-record payroll release manifest created: `docs/qa/10-payroll-release-test-manifest.md`.
2. `HRADM-DEF-20261009-018` resolved in focused RBAC rerun.
3. `HRADM-DEF-20261009-019` resolved in focused P100 adjustment/finance reruns and backend regression.
4. Backend and TypeScript static checks passed.

Remaining certification gates:

1. `HRADM-DEF-20261009-013`: missing primary bank account readiness classification requires product/business approval.

## Phase 3B.4G Completion and Next Plan - 2026-10-09

Phase 3B.4G executed the frozen payroll release manifest. Do not count intermediate diagnostic reruns as additional coverage.

Final manifest execution evidence:

1. Inventory: `docs/qa/evidence/phase3b4g/08-frozen-manifest-playwright-list-final.log`.
2. Core/setup/readiness: `docs/qa/evidence/phase3b4g/01b-core-setup-readiness-inputs-statutory.log`.
3. Lifecycle/output/provider/RBAC/P100: `docs/qa/evidence/phase3b4g/02-lifecycle-output-provider-rbac.log`.
4. Reports/restored report coverage: `docs/qa/evidence/phase3b4g/03-reports-and-polish.log`, with final statutory report correction evidence in `05-statutory-report-focused-rerun-final.log`.
5. Restored warning/close-readiness fixture correction: `docs/qa/evidence/phase3b4g/07-warning-close-readiness-focused-rerun-final.log`.
6. Static checks: `docs/qa/evidence/phase3b4g/09-web-tsc.log`, `docs/qa/evidence/phase3b4g/10-backend-check.log`.

Certification result:

| Gate | Result |
| --- | --- |
| 106-record manifest reconciliation | Passed: all records accounted; 107 raw tests map to 106 records because `PAY-FRZ-106` has two raw tests. |
| Mandatory executable scenario execution | Completed with exceptions: 103 records passed, 1 failed, 2 conditional/skipped. |
| Financial correctness / lifecycle evidence | Passed for executed calculation, review, close, output, P100 and handoff flows. |
| Authorization/security/provider evidence | Passed for executed RBAC, artifact isolation, callback, replay, bad-signature and retry-worker flows. |
| Missing bank-account rule | Failed/open: `HRADM-DEF-20261009-013`. |
| Provider conditional scenarios | Open disposition: incomplete-lane activation and production provider audit drilldown skipped by condition. |

Next recommended step: obtain product/business decision for `HRADM-DEF-20261009-013` and QA/product disposition for the two conditional provider scenarios. Phase 3B.5 may proceed only as conditional unless those gates are closed.

## Phase 3B.5 Completion and Next Plan - 2026-10-09

Phase 3B.5 executed the HR Admin Organization, Setup and Workflow browser certification scope against the isolated local QA tenant/database. Do not begin Phase 3B.6 automatically.

Execution evidence:

1. Inventory: `docs/qa/evidence/phase3b5/00-organization-setup-workflow-inventory.log`.
2. Environment issue, not counted as certification evidence: `docs/qa/evidence/phase3b5/01-organization-master-browser.log`.
3. Parallel fixture collision diagnostic, not counted as final organization status: `docs/qa/evidence/phase3b5/01b-organization-master-browser-env-fixed.log`.
4. Organization master counted evidence: `docs/qa/evidence/phase3b5/01c-organization-master-browser-serial.log`.
5. Setup/policy/governance assignment evidence: `docs/qa/evidence/phase3b5/02-policy-governance-assignment-browser.log`.
6. Workflow/ops/tier-two evidence: `docs/qa/evidence/phase3b5/03-workflow-ops-browser.log`.

Result summary:

| Scope | Result |
| --- | --- |
| Existing scenarios scheduled | 57 |
| New scenarios added | 0 |
| Passed | 45 |
| Failed | 9 |
| Skipped/Blocked | 3 |
| Not Run | 0 |
| Certification recommendation | Conditionally Certified |

Open gates before full Phase 3B.5 certification:

1. `HRADM-DEF-20261009-020`: workflow assignment field-level validation message rendering/expectation.
2. `HRADM-DEF-20261009-021`: deterministic governance assignment lifecycle fixtures for policy, employee, shift and roster rollout prerequisites.
3. `HRADM-DEF-20261009-022`: tier-two workflow journey heading/data alignment and deterministic ESS/MSS notification fixture.

Recommended next execution batch: Phase 3B.5A targeted remediation and focused revalidation for the 9 failed scenarios plus the 3 conditional organization skips if their prerequisites can be made deterministic. Keep Phase 3B.6 on hold until Phase 3B.5A defects are resolved or formally accepted.
2. Provider conditional skipped scenarios need explicit disposition or deterministic fixtures.
3. The final payroll certification run must execute the frozen 106-record manifest. The restored 23 records are not passed until executed.

Recommended next execution batch: Phase 3B.4G final full payroll certification rerun, only after recording the bank-account decision or explicitly accepting it as an open certification exception.

## Phase 3B.5A Completion and Next Plan - 2026-10-10

Phase 3B.5A completed targeted remediation and focused revalidation for Organization, Setup and Workflow. Do not begin Phase 3B.6 automatically.

Completed:

1. All 9 failed Phase 3B.5 scenarios were revalidated and passed.
2. All 3 previously skipped organization UI scenarios were attempted under their required mock API prerequisite and passed.
3. Affected governance/tier-two regression passed after explicit timeout adjustment for long local live CRUD flows.
4. Web TypeScript and Django system checks passed.

Evidence:

1. Focused governance and assignment reruns: `docs/qa/evidence/phase3b5a/01` through `05`, `11`, `13` through `19`, and `22`.
2. Tier-two workflow reruns: `docs/qa/evidence/phase3b5a/06`, `07`, `08`.
3. Organization mock-prerequisite rerun: `docs/qa/evidence/phase3b5a/09-organization-master-ui-mock-rerun.log`.
4. Affected regression: `docs/qa/evidence/phase3b5a/21-affected-regression-rerun-final3.log` plus `22-workflow-assignment-focused-timeout-rerun.log`.
5. Static checks: `docs/qa/evidence/phase3b5a/23-web-tsc.log`, `24-backend-check.log`.

Next recommended execution batch: Phase 3B.5B final module-wide regression for the original 57 Organization/Setup/Workflow scenarios, using the stabilized deterministic fixtures. Proceed to Phase 3B.6 only after that module-wide regression is passed or formally dispositioned.

## Phase 3B.5B Completion and Next Plan - 2026-10-10

Phase 3B.5B completed the final Organization, Setup and Workflow browser certification rerun. Do not begin Phase 3B.6 automatically.

Certification evidence:

1. Inventory reconciliation: `docs/qa/evidence/phase3b5b/00-current-organization-setup-workflow-inventory.log`.
2. Preflight: `docs/qa/evidence/phase3b5b/01-backend-health.json`, `02-auth-check.json`.
3. Organization live DB batch: `docs/qa/evidence/phase3b5b/03-organization-live-browser.log`.
4. Organization mock-prerequisite batch: `docs/qa/evidence/phase3b5b/04-organization-mock-ui-browser.log`.
5. Policy/setup master batch: `docs/qa/evidence/phase3b5b/05-policy-setup-master-browser.log`.
6. Governance assignment batch: `docs/qa/evidence/phase3b5b/06-governance-assignment-browser.log`.
7. Workflow/tier-two batch: `docs/qa/evidence/phase3b5b/08-workflow-tier-two-browser-rerun-final.log`, with final focused workflow hub rerun in `09-workflow-hub-focused-rerun-final.log`.
8. Static checks: `docs/qa/evidence/phase3b5b/10-web-tsc.log`, `11-backend-check.log`.

Final status:

| Gate | Result |
| --- | --- |
| Original 57 scenario reconciliation | Passed: current inventory is 57, no drift. |
| Mandatory applicable execution | Passed: 57/57 scenarios passed after preserving rerun history. |
| P0/P1 authorization, tenant isolation, governance or workflow defects | None open for this scope. |
| Previously failed/skipped scenarios | Verified in full suite. |
| Unsupported assumptions | None recorded. |

Next recommended execution batch: Phase 3B.6 may be planned next, but only after explicit user approval. Organization, Setup and Workflow scope is Certified.

## Phase 3B.6 Completion and Next Plan - 2026-10-10

Phase 3B.6 completed browser certification execution for Notifications, Reports, Audit and Imports. Do not begin Phase 3B.7 automatically.

Evidence:

1. Inventory and preflight: `docs/qa/evidence/phase3b6/00-current-notifications-reports-audit-imports-inventory.log`, `01-backend-health.json`, `02-auth-check.json`.
2. Notifications: `03-notifications-browser.log` plus focused revalidation `04` through `09`.
3. Reports: `10-report-hubs-ui-browser.log`, `11-report-detail-export-browser.log`.
4. Imports and audit: `12-imports-audit-browser.log`.
5. Bulk import: `13-bulk-upload-100-browser.log`.

| Gate | Result |
| --- | --- |
| Frozen scenario baseline | Passed: 76 current scenarios fixed before execution. |
| Mandatory applicable execution | Completed: 76/76 executed. |
| Passed / Failed / Blocked / Not Run | 66 passed, 10 failed, 0 blocked/skipped, 0 not run. |
| Notifications | Certified for sandbox/in-app proof. |
| Reports | Not Certified until compliance/report failures and notification UI overlap are remediated. |
| Audit | Not Certified until tenant-admin trust audit prerequisites are restored/aligned. |
| Imports | Conditionally Certified; import history and leave-balance import pass, but full 100-employee browser import chain fails. |

Recommended next execution batch: Phase 3B.6A targeted remediation and focused revalidation for defects `HRADM-DEF-20261010-023` through `027`. Prioritize notification compact-control overlap, compliance report timeout/drilldown, audit tenant-admin prerequisite and missing shift-assignment import workbench before any Phase 3B.7 work.

## Phase 3B.6A Completion and Next Plan - 2026-10-10

Phase 3B.6A completed targeted remediation and focused revalidation for Notifications, Reports, Audit and Imports. Do not begin Phase 3B.7 automatically.

Completed:

1. All 10 failed Phase 3B.6 browser scenarios were revalidated and passed.
2. Defects `HRADM-DEF-20261010-023` through `HRADM-DEF-20261010-027` are resolved in focused evidence.
3. The 100-employee browser bulk upload chain passed end-to-end after import workbench wiring, large employee lookup fixes, batched shift/attendance commits and exact import-audit lookup.
4. Web TypeScript and Django system checks passed.

Evidence:

1. Reports/audit focused rerun: `docs/qa/evidence/phase3b6/15-phase3b6a-report-audit-focused-rerun.log`, `18-phase3b6a-audit-download-focused-rerun-final2.log`.
2. Compliance export audit rerun: `docs/qa/evidence/phase3b6/21-phase3b6a-compliance-export-audit-focused-rerun-final2.log`.
3. Bulk upload final rerun: `docs/qa/evidence/phase3b6/27-phase3b6a-bulk-upload-focused-rerun-final5.log`.
4. Static checks: `docs/qa/evidence/phase3b6/28-phase3b6a-web-tsc.log`, `29-phase3b6a-backend-check.log`.

Next recommended execution batch: Phase 3B.6B final full regression for the original 76 Notifications, Reports, Audit and Imports scenarios, using the stabilized workbenches and current UI assertions. Proceed to Phase 3B.7 only after Phase 3B.6B passes or remaining exceptions are formally dispositioned.

## Phase 3B.6B Completion and Next Plan - 2026-10-10

Phase 3B.6B completed a final browser certification rerun for Notifications, Reports, Audit and Imports. Do not begin Phase 3B.7 automatically.

Completed:

1. Original 76-scenario inventory reconciled to the current executable Playwright inventory with no removals, merges or unexplained drift.
2. All 76 original scenarios received fresh Phase 3B.6B execution evidence.
3. Notifications passed 17/17 with sandboxed queue, retry, diagnostics, source links and ESS notification proof.
4. Reports passed 53/53 after preserving the initial compliance export timeout failures and applying a compact-source performance fix plus focused retest.
5. Audit/security evidence passed 2/2 for tenant support lifecycle, trust audit visibility and audit-pack download.
6. Imports passed 4/4, including the 100-employee browser bulk upload workflow and exact import-audit lookup.
7. Web TypeScript and Django system checks passed.

Evidence:

1. Inventory and preflight: `docs/qa/evidence/phase3b6/31-phase3b6b-backend-health.json`, `32-phase3b6b-frozen-inventory.log`.
2. Main browser batches: `33-phase3b6b-notifications-browser.log`, `34-phase3b6b-report-hubs-ui-browser.log`, `35-phase3b6b-report-detail-export-browser.log`, `36-phase3b6b-imports-audit-browser.log`, `37-phase3b6b-bulk-upload-100-browser.log`.
3. Compliance retest history and final pass: `38`, `45`, `46`, `47`, `48` Phase 3B.6B compliance logs.
4. Static checks: `49-phase3b6b-web-tsc.log`, `50-phase3b6b-backend-check.log`.

| Gate | Result |
| --- | --- |
| Original 76 scenario reconciliation | Passed: current inventory is 76, no unexplained drift. |
| Mandatory applicable execution | Passed: 76/76 scenarios passed after preserving rerun history. |
| P0/P1 report accuracy, RBAC, security, audit or import defects | None open for this scope. |
| New import workbenches and bulk commit changes | Verified by 100-employee browser bulk upload chain. |
| External email/SMS delivery | Explicitly excluded from sandbox certification; remains Phase 4 launch gate. |

Next recommended execution batch: Phase 3B.7 can be planned next after explicit user approval. Phase 3B.6B scope is Certified.

## Phase 3B.7 Completion and Next Plan - 2026-10-10

Phase 3B.7 completed browser certification execution for Command Center, Launch Readiness and Operations. Do not begin Phase 3C automatically.

Completed:

1. Direct 27-scenario inventory was discovered and frozen before execution.
2. Command center, launch remediation, SaaS operations, control plane, resilience, SLA, release gates and commercial gating received fresh browser evidence.
3. Stale route/copy/tab assertions were aligned to current UI semantics.
4. Launch remediation modal stacking and HR mobile menu/search stacking were fixed and revalidated.
5. Commercial entitlement and usage-limit negative controls passed with browser/API evidence.
6. Web TypeScript and Django system checks passed.

Evidence: `docs/qa/evidence/phase3b7/00-current-command-launch-ops-inventory.log`, `01-backend-health.json`, `20-final-core-27-clean-rerun.log`, `21-affected-shell-nav-rerun.log`, `22-performance-budget-rerun.log`, `23-web-tsc.log`, `24-backend-check.log`.

| Gate | Result |
| --- | --- |
| Direct scenario reconciliation | Passed: 27 current direct scenarios, no unexplained drift. |
| Latest Passed / Failed / Blocked / Not Run | 26 passed, 1 failed, 0 blocked/skipped, 0 not run. |
| Command Center | Certified. |
| Launch Readiness | Certified. |
| Operations | Certified. |
| RBAC / commercial gating | Certified for executed browser/API evidence. |
| Performance | Not certified for payroll handoff route; `HRADM-DEF-20261010-028` open. |

Next recommended execution batch: Phase 3B.7A targeted performance remediation for `/hr-admin/payroll-handoff`, followed by focused `phase8d-performance-budget.spec.ts` rerun and any impacted payroll-handoff smoke checks. Phase 3C should wait until this exception is resolved or explicitly accepted.
## Phase 3B.7A Completion and Next Plan - 2026-10-10

Phase 3B.7A completed targeted remediation and revalidation for the `/hr-admin/payroll-handoff` performance blocker. Do not begin Phase 3C automatically.

Completed:

1. Reproduced the original performance defect with the existing `phase8d-performance-budget.spec.ts`.
2. Captured baseline browser timings, payload size, component size and backend query/build profile.
3. Reduced handoff browser setup payload from about 3.84MB to 68KB by making detailed payslip artifacts opt-in and omitting unused output batches from the handoff page request.
4. Preserved TDS readiness by explicitly opting that report into detailed payslip render evidence.
5. Revalidated payroll handoff under the 4s document-response budget in post-fix performance samples.
6. Ran handoff/artifact/report/provider/RBAC/TDS focused browser regressions plus TypeScript and Django checks.

Evidence: `docs/qa/evidence/phase3b7a/01-baseline-performance-budget.log`, `03-api-profile-before.json`, `05-api-profile-after-payslip-opt-in.json`, `13-api-profile-after-output-batches-opt-out.json`, `10-performance-after-run2-samples.json`, `15-performance-after-run4-samples.json`, `22-performance-after-run5-final-samples.json`, `16-functional-regression-payroll-handoff-artifacts-reports.log`, `17-provider-statutory-rbac-regression.log`, `18-tds-readiness-regression.log`, `19-web-tsc.log`, `20-backend-check.log`.

| Gate | Result |
| --- | --- |
| Payroll handoff performance blocker | Passed: handoff document response now under 4s in latest post-fix samples. |
| Functional handoff regression | Passed: handoff/artifact/report/TDS focused regressions passed. |
| Provider/RBAC regression | Passed with one existing conditional skip. |
| Static checks | Passed. |
| Full launch performance suite | Mixed: passed once after fix, then failed on non-handoff routes `/hr-admin/payroll-providers` and `/mss/approvals`; track separately if required. |

Recommended next step: Phase 3C may proceed from the payroll-handoff blocker perspective. If the release gate requires repeated full-suite route performance stability, open a separate targeted performance pass for the non-handoff route variance before Phase 3C signoff.

## Phase 3C.5 Execution Plan Result - 2026-10-10

Executed payroll lifecycle/output/finance handoff journeys only: `HRADM-E2E-007` through `HRADM-E2E-016` plus `HRADM-E2E-032`.

Batch order completed:

1. Verified PH3C fixture state and locked the PH3C lockable payroll input run.
2. Seeded disposable PH3C calculation runs for output/payslip, adjustment/settlement and calc-review evidence.
3. Executed output/payslip/ESS workflow.
4. Executed finance handoff/compliance workflow.
5. Executed adjustment/settlement/close workflow.
6. Executed payroll lifecycle RBAC, provider callback/retry, statutory/TDS and handoff performance batches.
7. Captured DB reconciliation evidence for payroll totals, artifacts, handoff and provider states.

Execution outcome: 7 scoped scenario IDs Passed, 1 Failed/partial, 3 Blocked/conditional, 0 Not Run.

Recommended next step: proceed to Phase 3C.6 only conditionally. Resolve or formally accept `HRADM-DEF-20261010-030`, `HRADM-DEF-20261010-031`, provider conditionals `3C-GATE-PROV-001/002` and missing-bank decision `HRADM-DEF-20261009-013` before consolidated Phase 3C release signoff.

## Phase 3C.6 Execution Plan Result - 2026-10-10

Executed remaining cross-module workflow, notification, RBAC, audit, reporting, recovery, command-center and launch-readiness journeys.

Batch order completed:

1. Seeded deterministic statutory filing/registration prerequisite for the Phase 3C DB.
2. Revalidated statutory filing and TDS package carry-forward defects.
3. Executed workflow, notification retry, notification source-link and security/trust audit suites.
4. Executed RBAC and tenant-isolation suites, then corrected the two-tenant fixture helper to target `backend/db.phase3c_e2e.sqlite3` and reran the isolation proof.
5. Executed reports, export audit, import history and leave-attendance collision report suites.
6. Executed command center, launch remediation, release gate and performance suites.
7. Captured DB reconciliation for tenants, notifications, report export audits, payslips, statutory filing evidence and private tenant markers.

Execution outcome: 15 scoped scenario IDs Passed, 0 Failed, 0 Blocked, 0 Not Run.

Recommended next step: proceed to Phase 3C.7 final integration regression. Keep `HRADM-DEF-20261009-013`, provider conditionals `3C-GATE-PROV-001/002`, real external email/SMS delivery, deployed RBAC, production backup/restore and realistic real-tenant handoff as explicit release gates; do not certify those from local Phase 3C.6 evidence.

## Phase 3C.7 Execution Plan Result - 2026-10-10

Execution completed against the frozen 32-scenario Phase 3C E2E inventory.

Executed batches:

1. Workforce lifecycle and access regression.
2. Time, leave, attendance and payroll-input regression, followed by focused time-to-payroll rerun.
3. Payroll lifecycle, output, handoff, provider retry and statutory regression, followed by deterministic output/payslip reseed and rerun.
4. Workflow, notification, RBAC, two-tenant isolation, reports, audit, command-center, launch-readiness and performance regression.
5. Database reconciliation and static checks.

Final result: 29 Passed, 0 Failed, 0 Blocked, 3 Conditional, 0 Not Run.

Certification decision: Conditionally Certified for local/sandbox Phase 3C. Ready for Phase 4 production launch validation only with explicit carry-forward gates: `HRADM-DEF-20261009-013`, `3C-GATE-PROV-001`, `3C-GATE-PROV-002`, real external email/SMS delivery, deployed RBAC, backup/restore and realistic real-tenant payroll handoff.
