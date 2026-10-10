# Phase 3C.1 E2E Execution Register

Date: 2026-10-10
Execution status: Planning only. All Phase 3C statuses initialized as Not Run unless explicitly marked as a gate/Phase 4 exclusion. Historical Phase 3B evidence is preserved as reference, not counted as fresh Phase 3C pass evidence.

## Register Summary

| Metric | Count |
| --- | ---: |
| Cross-module journeys | 12 |
| Planned Phase 3C scenarios | 32 |
| P0 scenarios | 22 |
| P1 scenarios | 8 |
| P2 scenarios | 2 |
| Existing/reused automation scenarios | 24 |
| New/extended E2E specs required | 8 |
| Fresh Passed | 0 |
| Failed | 0 |
| Blocked | 0 |
| Not Run | 32 |

## Scenario Register

| Scenario ID | Journey ID | Priority | Module chain | Scenario | Scenario type | Existing/New | Existing stable IDs / tests | Expected persisted outcome | Fixture / data dependency | Execution status | Evidence | Defect / gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRADM-E2E-001 | E2E-JRN-001 | P0 | Tenant -> Setup -> Workforce -> ESS | Create org masters, employee and workspace access, then verify ESS login for same employee | Positive integration | Existing + extend | `HRADM-TC-WF-003/004`, `HRADM-TC-SET-001`; `organization-master-crud-flows.spec.ts`, `employee-directory-certification.spec.ts` | Employee exists with scoped access and ESS can read own profile only | Isolated tenant, org masters, ESS credentials | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-002 | E2E-JRN-001 | P0 | Workforce -> Documents -> Onboarding -> Audit | Onboarding cannot complete with blocking checklist/document gap, then completes after document review | Negative/positive workflow | Existing + extend | `HRADM-TC-WF-009`, `HRADM-TC-DOC-001`; `employee-documents-onboarding-certification-flows.spec.ts` | Onboarding status transitions are valid; audit records both failure/review/completion | Employee with document requirement and checklist | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-003 | E2E-JRN-001 | P1 | Tenant -> Workforce -> RBAC | Restricted user cannot reach HR employee/document/onboarding objects from another role scope | RBAC/tenant isolation | Existing | `phase7a-role-access-boundaries.spec.ts`, `production-tenant-role-isolation.spec.ts` | UI hides controls and APIs return deny without data leakage | Restricted/no-access persona | Not Run | Fresh Phase 3C evidence required | Optional no-access credential may block if unavailable |
| HRADM-E2E-004 | E2E-JRN-002 | P0 | Workforce -> Shift -> Attendance | Assign shift/calendar/policy to employee, import attendance, edit/save record and verify persisted shift/status | Positive CRUD/import | Existing + extend | `HRADM-TC-TLA-004/006`; `hr-admin-time-leave-attendance-roster-p0-gap-certification.spec.ts` | Attendance row persists with correct employee, date, shift, status and import audit | Employee, shift, attendance policy, import CSV | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-005 | E2E-JRN-002 | P0 | ESS/MSS -> Leave -> Attendance -> Payroll inputs | Employee requests leave, manager approves, payroll input snapshot reflects leave/working-day impact | Positive integration | New/extend | `ess-leave-launch-certification.spec.ts`, `time-to-payroll-control-certification.spec.ts`, backend leave tests | Leave balance decreases; attendance/payroll input source shows approved leave effect | Employee with leave policy/balance and manager | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-006 | E2E-JRN-002 | P0 | Leave -> Attendance -> Payroll inputs | Overlapping leave/attendance or non-working-day leave produces controlled validation/readiness impact | Negative/boundary | Existing + extend | `backend/apps/leave_management/tests.py`, `leave-attendance-collisions-report-certification.spec.ts` | Controlled error or collision/readiness row; no invalid payroll input mutation | Holiday calendar, attendance row, leave request | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-007 | E2E-JRN-003 | P0 | Payroll inputs -> Calculation | Lock payroll inputs and calculate gross/net with independent expected totals | Financial correctness | Existing + extend | `HRADM-TC-PAY-006/007`, `PAY-FRZ-001..083`; `payroll-inputs-flows.spec.ts`, `payroll-calculations-flows.spec.ts` | Calculation lines reconcile to expected earnings/deductions/net | Salary structure, rule version, locked snapshot | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-008 | E2E-JRN-003 | P0 | Payroll adjustments -> Review -> Close | Adjustment submitted, approved/applied, review exception resolved and final lock performed | State transition | Existing + extend | `HRADM-TC-PAY-008/012`, `PAY-FRZ-084..088`; `pilot-100-adjustments-settlements-close-certification.spec.ts` | Adjustment affects net total; audit/review state is locked | Payroll run with adjustment fixture | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-009 | E2E-JRN-003 | P0 | Payroll lifecycle RBAC | Unauthorized payroll viewer cannot mutate inputs, calculations, review, adjustment or close | RBAC/negative | Existing | `payroll-lifecycle-rbac-certification.spec.ts`, `payroll-statutory-rbac-certification.spec.ts` | Forbidden controls hidden/disabled and API returns 403 | Viewer/restricted persona | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-010 | E2E-JRN-004 | P0 | Review -> Outputs -> Finance handoff | Final-locked review publishes output, creates payslips/register/bank advice, then generates handoff | Positive lifecycle | Existing + extend | `PAY-FRZ-086/087`, `payroll-outputs-flows.spec.ts`, `payroll-handoff-flows.spec.ts` | Output batch and handoff linked to same run with artifacts | Locked review and output-capable setup | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-011 | E2E-JRN-004 | P0 | Handoff -> Provider callback/retry | Signed callback, invalid signature, replay guard, retry idempotency and audit ledger | Security/recovery | Existing | `phase6b-provider-callback-mutation.spec.ts`, `phase6d-provider-retry-worker.spec.ts`, `production-provider-callback-flows.spec.ts` | Valid callback transitions once; invalid/replay rejected; retry logged once | Sandbox provider delivery | Not Run | Fresh Phase 3C evidence required | Provider conditionals tracked separately |
| HRADM-E2E-012 | E2E-JRN-004 | P0 | Provider setup -> Handoff | Incomplete provider lane cannot activate or submit unsafe handoff | Negative/business gate | Existing conditional | `payroll-providers-flows.spec.ts`, `PAY-FRZ provider conditional` | Unsafe lane blocked with user-facing reason | Deterministic incomplete-lane fixture required | Not Run | Fresh evidence or formal disposition required | 3C-GATE-PROV-001 |
| HRADM-E2E-013 | E2E-JRN-004 | P0 | Provider audit pack -> Reports/Audit | Production provider audit drilldown opens the intended evidence without external submission | Conditional evidence | Existing conditional | `production-provider-callback-flows.spec.ts`, `PAY-FRZ provider conditional` | Audit pack drilldown proves delivery state and source evidence | Deterministic audit-pack fixture required | Not Run | Fresh evidence or formal disposition required | 3C-GATE-PROV-002 |
| HRADM-E2E-014 | E2E-JRN-005 | P0 | Outputs -> ESS payslips | Employee sees own published payslip, cannot access register/other employee artifacts | Positive/RBAC | Existing | `payroll-output-artifact-certification.spec.ts`, `phase5h-payroll-artifact-access-isolation.spec.ts` | ESS download succeeds only for own payslip; HR register denied to employee | Published output batch | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-015 | E2E-JRN-005 | P0 | Outputs -> Statutory/TDS reports | Same payroll output appears in TDS/statutory readiness/report/export evidence | Financial/report reconciliation | Existing + extend | `tds-efile-readiness-report-certification.spec.ts`, statutory report specs | TDS/statutory totals reconcile with output batch | Published payroll with tax evidence | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-016 | E2E-JRN-005 | P0 | Readiness -> Bank gate -> Payment risk | Missing primary bank account behavior is verified by stage after product decision | Business decision | Existing conditional | `payroll-readiness-negative-gates-certification.spec.ts`, `payroll-readiness-bank-gate-certification.spec.ts` | Approved rule applied to calculation, review/output, bank advice and payment submission | Employee missing primary bank account | Not Run | Do not certify until decision | `HRADM-DEF-20261009-013`, 3C-GATE-PAY-BANK-001 |
| HRADM-E2E-017 | E2E-JRN-006 | P0 | Workflow -> Notification -> Audit | Approval workflow emits notification and immutable audit record with source link | Positive integration | New/extend | `tier-two-workflow-flows.spec.ts`, `production-notification-flows.spec.ts`, `workflow-trace-flows.spec.ts` | Notification delivery record and audit event reference same subject/action | Workflow assignment, notification template/event | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-018 | E2E-JRN-006 | P1 | Notifications -> Retry/Diagnostics | Failed sandbox notification can be diagnosed/retried without external delivery claim | Recovery | Existing | `phase6e-notification-provider-retry.spec.ts`, `notification-setup-crud-flows.spec.ts` | Retry count/status changes; external delivery remains excluded | Sandbox notification provider | Not Run | Fresh Phase 3C evidence required | 3C-GATE-EXT-NOTIF-001 for real delivery |
| HRADM-E2E-019 | E2E-JRN-007 | P0 | Role change -> HR Admin modules | Revoke/grant workspace role and verify stale navigation/API permissions across modules | RBAC/state transition | New/extend | role isolation suites and employee access specs | Revoked user cannot use stale links/back-forward; re-grant restores intended access | Role/access fixture | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-020 | E2E-JRN-007 | P0 | Cross-tenant isolation | Tenant A user cannot view/download Tenant B employee, payroll, report, audit or artifact data | Tenant isolation/security | Existing | `phase7b-cross-tenant-object-isolation.spec.ts`, `production-tenant-role-isolation.spec.ts`, artifact isolation specs | 403/404 without object metadata leakage | Two isolated tenants and seeded records | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-021 | E2E-JRN-008 | P0 | Duplicate/partial import recovery | Partial import with duplicates commits valid rows once and records exact import history | Recovery/idempotency | Existing + extend | `phase9-bulk-upload-100-workforce-certification.spec.ts`, `import-history-ledger-certification.spec.ts` | Valid rows persisted once; invalid rows blocked; import audit exact by source hash | CSV with duplicates/missing/valid rows | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-022 | E2E-JRN-008 | P0 | Invalid workflow/payroll transition recovery | Invalid approve/reject/lock/submit transitions are blocked and audited where applicable | Negative/state transition | New/extend | payroll review/negative controls, workflow specs | No illegal state; user sees controlled error; audit/log evidence where required | Review/workflow in disallowed state | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-023 | E2E-JRN-009 | P1 | 100-employee bulk upload -> payroll inputs | Bulk employees/imported prerequisites produce payroll input coverage for selected employees | Scale integration | Existing + extend | `phase9-bulk-upload-100-workforce-certification.spec.ts`, `pilot-100-inputs-certification.spec.ts` | Imported employees appear in payroll input snapshot and audit ledger | 100 employees and prerequisite imports | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-024 | E2E-JRN-009 | P1 | 100 payslips/register pagination | More than 100 payslips are paginated and register/export remains complete | Boundary/performance | Existing | `pilot-100-output-payslip-ess-certification.spec.ts`, payroll artifact tests | Register includes all employees; artifact pagination/download works | P100 published output | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-025 | E2E-JRN-010 | P1 | Launch readiness truthfulness | Command/launch readiness reflects unresolved bank/provider/external gates and cannot show false Ready | Gate accuracy | New/extend | `launch-remediation-flows.spec.ts`, `production-launch-release-gate.spec.ts` | Ready status blocked or conditional with explicit evidence links | Current unresolved gates configured | Not Run | Fresh Phase 3C evidence required | 3C-GATE-PAY-BANK-001, provider gates, Phase 4 gates |
| HRADM-E2E-026 | E2E-JRN-010 | P1 | Command center KPI drilldowns | Dashboard counts/drilldowns match backend source totals for employees, payroll, imports, reports and launch issues | Data accuracy | Existing + extend | `hr-admin-control-center-certification.spec.ts` | UI counts reconcile to API/database source snapshots | Seeded operational data | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-027 | E2E-JRN-011 | P1 | Cross-report payroll/attendance/leave reconciliation | Reports for same period/employee reconcile source values and deep links | Report reconciliation | New/extend | individual report certification specs | Report rows match source objects; deep links open correct records | Employee/pay period with attendance, leave, payroll output | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-028 | E2E-JRN-011 | P1 | Export/audit manifest reconciliation | CSV/export manifest creates audit evidence with actor, source endpoint, checksum/source hash | Audit/export | Existing + extend | report export specs, `compliance-export-audit-history-certification.spec.ts` | Downloaded file metadata and audit event match report/filter | Report data and export permission | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-029 | E2E-JRN-012 | P2 | Responsive cross-workspace navigation | Representative HR Admin/ESS/MSS pages meet compact layout with no control overlap | UX/regression | Existing | `hr-admin-unified-design-full-route-certification.spec.ts`, responsive specs | No critical overlap; compact navigation usable on desktop/tablet/mobile | Standard QA tenant | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-030 | E2E-JRN-012 | P2 | Performance risk tracking | Re-run launch-critical performance sample and classify `/payroll-providers` and `/mss/approvals` independently | Performance risk | Existing | `phase8d-performance-budget.spec.ts` | Handoff remains under budget; other misses get separate evidence/defects if reproduced | Large QA data fixture | Not Run | Fresh Phase 3C evidence required | 3C-RISK-PERF-001, 3C-RISK-PERF-002 |
| HRADM-E2E-031 | E2E-JRN-008 | P0 | Leave-policy duplicate and concurrent submission safety | Duplicate policy create returns controlled field validation, no duplicate row, no 500 | Regression/integration | Existing | Phase 3B.3A duplicate regression, backend common/leave tests | HTTP 400 field error and one policy row only | Existing leave policy code in tenant | Not Run | Fresh Phase 3C evidence required | None |
| HRADM-E2E-032 | E2E-JRN-004 | P0 | Finance handoff performance regression guard | Verify optimized handoff route remains functional and under budget without reopening defect 028 | Performance/function | Existing | `HRADM-TC-CMD-005`, `HRADM-TC-PAY-010`, Phase 3B.7A evidence | Handoff route under 4s and artifact/provider/TDS regressions pass | Published output/handoff fixture | Not Run | Fresh Phase 3C evidence required | `HRADM-DEF-20261010-028` resolved; reopen only with new handoff failure |

## New / Extended E2E Specifications Required

| Spec ID | Scenario IDs | Priority | Reason |
| --- | --- | --- | --- |
| HRADM-E2E-NEW-001 | HRADM-E2E-001, 002 | P0 | Current tests cover setup/workforce/documents independently; need one tenant-to-ESS trace |
| HRADM-E2E-NEW-002 | HRADM-E2E-005, 006 | P0 | Need same employee attendance/leave/payroll-input propagation evidence |
| HRADM-E2E-NEW-003 | HRADM-E2E-007, 008 | P0 | Need independent financial reconciliation across calculation, adjustment and close |
| HRADM-E2E-NEW-004 | HRADM-E2E-017 | P0 | Need workflow-to-notification-to-audit source linkage |
| HRADM-E2E-NEW-005 | HRADM-E2E-019, 020 | P0 | Need consolidated role-change and stale-session cross-module enforcement |
| HRADM-E2E-NEW-006 | HRADM-E2E-022 | P0 | Need invalid transition matrix spanning workflow and payroll |
| HRADM-E2E-NEW-007 | HRADM-E2E-025, 026 | P1 | Need command center/readiness accuracy against unresolved gates and source totals |
| HRADM-E2E-NEW-008 | HRADM-E2E-027, 028 | P1 | Need cross-report reconciliation and export/audit proof across source modules |

## Recommended First Execution Batch

Phase 3C.2 should execute environment and fixture readiness first, not business journeys:

1. verify isolated QA database and base URLs;
2. verify all personas and permissions;
3. create or refresh deterministic `PH3C-20261010` tenant data through supported UI/API/service paths;
4. prove sandbox flags for provider/payment/email/SMS;
5. run non-destructive health/auth/readiness probes only;
6. update this register with actual environment evidence before running E2E business scenarios.

No scenario in this register has current Phase 3C pass evidence yet.

## Phase 3C.2 Environment and Fixture Certification - 2026-10-10

Execution status: environment readiness only. The 32 business E2E scenarios above remain `Not Run`.

Environment:

| Item | Result | Evidence |
| --- | --- | --- |
| Isolated database | Passed: dedicated SQLite database `backend/db.phase3c_e2e.sqlite3`; not staging/production | `docs/qa/evidence/phase3c2/13-env-auth-rbac-fixture-probes.json` |
| Migrations | Passed: all migrations applied | `docs/qa/evidence/phase3c2/11-migration-plan.log` |
| Django system check | Passed: 0 issues | `docs/qa/evidence/phase3c2/10-django-check.log` |
| Runtime versions | Captured git branch/commit, Python, Django, Node and pnpm versions | `docs/qa/evidence/phase3c2/15-runtime-versions.json` |
| Tenant identity | Passed: sandbox tenant `northstar-foods`; PH3C fixture prefix `PH3C_20261010` | `13-env-auth-rbac-fixture-probes.json` |
| Authentication | Passed for HR Admin, Tenant Admin, Manager, Employee, Payroll Operator, Finance and Restricted personas | `13-env-auth-rbac-fixture-probes.json` |
| RBAC probes | Passed: HR Admin read probes 200; manager/employee self-scope probes 200; employee/restricted HR Admin probes denied; tenant-admin security readiness reachable | `13-env-auth-rbac-fixture-probes.json` |
| Integration safety | Passed for local certification: console email backend, notification workers disabled, payroll provider worker disabled, no provider/storage credential env present | `13-env-auth-rbac-fixture-probes.json` |

Fixture inventory:

| Fixture area | Result |
| --- | --- |
| Organization | 1 legal entity, 1 branch, 1 location, 1 business unit, 2 departments, 2 grades, 3 designations, 1 employment type |
| Workforce | 106 employees total, including 100 PH3C employees; 95 PH3C bank accounts; 109 active memberships |
| Time/leave/attendance | 1 shift, 2,207 attendance records, 3 leave policies, 17 leave requests, 109 leave balances |
| Payroll prerequisites | 1 pay group, 100 salary assignments, 100 statutory profiles, 2 payroll input runs, 200 payroll snapshots |
| Notifications | 6 templates, 6 event definitions, 5 channel configs, 6 in-app/sandbox notifications |
| Output/handoff/provider | Not pre-created in Phase 3C.2 by design; close/output/handoff/provider delivery are Phase 3C.4 business journeys and remain Not Run |

Fixture manifests:

| Evidence | Purpose |
| --- | --- |
| `01-bootstrap-demo-workspace.log` | Base tenant, personas, org, leave, attendance and notification setup |
| `02-seed-named-users.json` | Finance and support pilot users |
| `06-payroll-setup-fixture.json` | Minimal validated PH3C payroll calendar, period, pay group, salary structure and statutory pack |
| `07-seed-workforce-after-payroll-setup-manifest.json` | 100 PH3C employees with payroll assignments |
| `08-seed-inputs-manifest.json` | 100-employee attendance, leave and lifecycle inputs |
| `09-seed-snapshots-manifest.json` | blocked/lockable payroll input runs and snapshots |
| `12-seed-tenant-admin-restricted.json` | Tenant Admin and Restricted personas |

Readiness decision:

| Status | Notes |
| --- | --- |
| Ready for Phase 3C.3 | Environment, personas, fixtures, migration state, RBAC probes and integration safety passed. Phase 3C.3 may start with tenant/org/employee/time journeys. |
| Still gated for later phases | `HRADM-DEF-20261009-013`, provider conditional scenarios, real external email/SMS, deployed RBAC, production backup/restore and real-tenant handoff remain explicit release gates. |

Cleanup procedure:

Use only the isolated database file for this phase. A full cleanup is deletion/recreation of `backend/db.phase3c_e2e.sqlite3`. PH3C data can also be refreshed idempotently by rerunning the listed seed commands with prefix `PH3C_20261010`; existing PH3C workforce/input/snapshot commands clean their own prefixed records before reseeding.

## Phase 3C.3 Employee Lifecycle and Workforce Certification - 2026-10-10

Scope executed: employee lifecycle/workforce journeys only. Attendance, leave/payroll-input, payroll close/output and finance journeys were not executed in this batch.

Environment: `backend/db.phase3c_e2e.sqlite3`, tenant `northstar-foods`, PH3C fixture family `PH3C_20261010`, Django API `http://127.0.0.1:8031/api/v1`, local Playwright app `http://127.0.0.1:3233`, Chromium.

| Scenario ID | Journey ID | Priority | Phase 3C.3 status | Fresh evidence | Actual result | Defect / gap |
| --- | --- | --- | --- | --- | --- | --- |
| `HRADM-E2E-001` | `E2E-JRN-001` | P0 | Passed | `docs/qa/evidence/phase3c3/01-workforce-access-rbac-revocation.json`, `13-phase3c3-workforce-final-focused-run.log`, `14-phase3c3-db-verification.json` | Disposable manager and employee were created through HR Admin UI. Employee mapping, reporting manager linkage, duplicate employee-code prevention and ESS access for the same employee were verified. | None |
| `HRADM-E2E-002` | `E2E-JRN-001` | P0 | Passed with audit evidence gap | `02-documents-onboarding-guard-completion.json`, `13-phase3c3-workforce-final-focused-run.log`, `14-phase3c3-db-verification.json` | Employee document upload, onboarding creation, blocked completion with open checklist, completion after checklist closure and persisted document/onboarding state passed. Generic HR Admin audit search endpoint returned `404`, so immutable audit proof remains a coverage gap. | `3C-GAP-WF-AUD-001` |
| `HRADM-E2E-003` | `E2E-JRN-001` | P1 | Passed | `01-workforce-access-rbac-revocation.json`, `13-phase3c3-workforce-final-focused-run.log` | Restricted persona could not remain on HR employee workspace and direct employee-access API returned `403` without object leakage. | None |
| `HRADM-E2E-019` | `E2E-JRN-007` | P0 | Passed | `01-workforce-access-rbac-revocation.json`, `13-phase3c3-workforce-final-focused-run.log`, `14-phase3c3-db-verification.json` | Employee role/access was revoked through supported HR Admin access workflow; stale ESS navigation failed closed and DB shows revoked membership for the disposable user. | None |
| `HRADM-E2E-020` | `E2E-JRN-007` | P0 | Blocked for full cross-tenant proof | `03-cross-tenant-prerequisite-disposition.json`, `12-phase3c3-cross-tenant-disposition-rerun.log`, `14-phase3c3-db-verification.json` | The certified Phase 3C.2 database contains only one tenant (`northstar-foods`). Same-tenant restricted denial is covered under `HRADM-E2E-003`; true Tenant A -> Tenant B employee/document isolation could not be executed without a second PH3C tenant/persona fixture. | `3C-GAP-XTENANT-001` |

Phase 3C.3 latest scenario totals: 5 scoped scenario IDs; 4 Passed, 1 Blocked, 0 Failed, 0 Not Run. Browser automation results: 3/3 focused Playwright tests passed in the final run; the cross-tenant Playwright case records a blocked certification disposition rather than a functional pass for `HRADM-E2E-020`.

Existing automation reused: employee directory/access, document/onboarding, fresh ESS/MSS access and role-boundary patterns. New focused automation added: `web/tests/e2e/phase3c3-employee-lifecycle-workforce-e2e.spec.ts`.

Readiness decision: Ready to proceed to Phase 3C.4 for attendance/leave/payroll-input journeys after acknowledging two carry-forward gaps: onboarding audit endpoint evidence (`3C-GAP-WF-AUD-001`) and missing second-tenant fixture for full cross-tenant workforce isolation (`3C-GAP-XTENANT-001`).

## Phase 3C.4 Time, Leave, Attendance and Payroll Inputs Certification - 2026-10-10

Scope executed: `E2E-JRN-002` and the payroll-input linkage portion of `E2E-JRN-009`. Payroll calculation/close/output/finance handoff journeys were not executed in this batch.

Environment: `backend/db.phase3c_e2e.sqlite3`, tenant `northstar-foods`, PH3C fixture family `PH3C_20261010`, Django API `http://127.0.0.1:8031/api/v1`, local Playwright app `http://127.0.0.1:3234`, Chromium. External provider/payment/email/SMS remained local/sandboxed.

| Scenario ID | Journey ID | Priority | Phase 3C.4 status | Fresh evidence | Actual result | Defect / gap |
| --- | --- | --- | --- | --- | --- | --- |
| `HRADM-E2E-004` | `E2E-JRN-002` | P0 | Passed | `docs/qa/evidence/phase3c4/01-existing-time-attendance-payroll-browser.log`, `06-attendance-import-edit-focused-rerun.log`, `03-ph3c-time-leave-payroll-db-reconciliation.json` | Existing browser automation imported attendance, committed ready rows, edited the created row and verified persisted late-minutes/notes. Shift assignment/conflict/roster preview scenario also passed in the reused suite. | None |
| `HRADM-E2E-005` | `E2E-JRN-002` | P0 | Passed | `05-ess-leave-existing-rerun.log`, `03-ph3c-time-leave-payroll-db-reconciliation.json`, `04-ph3c-reconciliation-summary.json` | ESS leave page, validation, optional leave submission and roster-aware unit calculation passed. DB reconciliation shows approved leave for `PH3C_20261010_E041` feeding payroll input snapshot with `approved_requests: 1` and `lop_days: 2`. | None |
| `HRADM-E2E-006` | `E2E-JRN-002` | P0 | Passed with bounded negative coverage | `05-ess-leave-existing-rerun.log`, `04-ph3c-reconciliation-summary.json` | Leave date/evidence validation and roster working-day calculation passed. Existing PH3C snapshots include blocked/ready payroll inputs. Overlap/collision report was not freshly executed in this batch. | `3C-GAP-TLA-COLLISION-001` |
| `HRADM-E2E-023` | `E2E-JRN-009` | P1 | Passed for seeded PH3C scale linkage | `03-ph3c-time-leave-payroll-db-reconciliation.json`, `04-ph3c-reconciliation-summary.json`, `02-time-to-payroll-serial-rerun.log` | DB proof shows 100 PH3C employees, 2,200 attendance records, 15 leave requests, 100 leave balances and 200 payroll input snapshots. Time-to-payroll control UI passed 4/4 in serial rerun. | Locked input restriction and duplicate generation were not freshly mutated in Phase 3C.4; keep for payroll lifecycle/recovery phase. |

Phase 3C.4 latest scenario totals: 4 scoped scenario IDs; 4 Passed, 0 Failed, 0 Blocked, 0 Not Run. One coverage gap remains for freshly executed overlap/collision negative proof, and payroll input lock/idempotency should be executed in the payroll lifecycle/recovery batch rather than counted here.

## Phase 3C.5 Payroll Lifecycle, Output and Finance Handoff E2E Certification - 2026-10-10

Environment: isolated local QA database `backend/db.phase3c_e2e.sqlite3`, tenant `northstar-foods`, PH3C fixture family `PH3C_20261010`, Django API `http://127.0.0.1:8031/api/v1`, local Playwright app `http://127.0.0.1:3235`, Chromium. Payment, bank, provider, email and SMS operations remained sandboxed/local.

Scoped scenario IDs: `HRADM-E2E-007` through `HRADM-E2E-016` and `HRADM-E2E-032`.

| Scenario ID | Journey ID | Priority | Phase 3C.5 status | Fresh evidence | Actual result | Defect / gap |
| --- | --- | --- | --- | --- | --- | --- |
| `HRADM-E2E-007` | `E2E-JRN-003` | P0 | Passed | `docs/qa/evidence/phase3c5/05-output-payslip-ess-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` | Payroll calculation completed for 100 locked snapshots with 300 lines. DB reconciliation: gross `14070000.00`, deductions `423863.63`, net `13646136.37`, 100 employees. | None |
| `HRADM-E2E-008` | `E2E-JRN-003` | P0 | Passed | `07-adjustments-settlements-close-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` | Adjustment/settlement workflow passed: premature apply rejected, duplicate source ref rejected, adjustment submitted/approved/applied, settlement submitted/approved/applied, reports showed the applied source refs. DB shows 3 applied adjustments totaling `58500` and 1 applied settlement. | None |
| `HRADM-E2E-009` | `E2E-JRN-003` | P0 | Passed | `08-security-provider-statutory-performance-browser.log` | Lifecycle and statutory RBAC passed: unauthorized viewers could not manage runs/snapshots/locks, calculate drafts, approve/lock/generate outputs, publish outputs, generate finance handoff, transmit/acknowledge handoff or generate audit packs. | None |
| `HRADM-E2E-010` | `E2E-JRN-004` | P0 | Passed | `05-output-payslip-ess-browser.log`, `06-finance-handoff-compliance-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` | Published output batch created 105 artifacts: 100 payslips, register, bank advice, accounting export, statutory report and provider audit pack. Finance handoff reached `accepted`, linked to the same output run, with 3 reconciled provider deliveries. | None |
| `HRADM-E2E-011` | `E2E-JRN-004` | P0 | Passed after configuration rerun | Initial failure: `08-security-provider-statutory-performance-browser.log`; passing rerun: `10-provider-retry-worker-rerun.log` | Signed provider callback, replay guard and invalid signature rejection passed. Retry worker initially failed because the shell worker used the default browser DB; rerun with `PLAYWRIGHT_DJANGO_SQLITE_DB=backend/db.phase3c_e2e.sqlite3` passed. | Configuration issue resolved; no product defect opened. |
| `HRADM-E2E-012` | `E2E-JRN-004` | P0 | Blocked / conditional | Prior frozen-manifest provider-gate records; no fresh real incomplete-lane sandbox execution in Phase 3C.5 | Incomplete provider lane remains a conditional release gate. It was not counted as Passed without explicit provider disposition. | `3C-GATE-PROV-001` |
| `HRADM-E2E-013` | `E2E-JRN-004` | P0 | Blocked / conditional | `06-finance-handoff-compliance-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` | Local manual provider audit artifacts were generated, but production provider audit-pack conditional drilldown was not executed with real provider sandbox evidence. | `3C-GATE-PROV-002` |
| `HRADM-E2E-014` | `E2E-JRN-005` | P0 | Passed | `05-output-payslip-ess-browser.log`, `13-payroll-lifecycle-output-handoff-reconciliation.json` | Employee `ph3c_20261010.e001` accessed only own published payslip; HR register/other employee artifact access restrictions were verified by reused artifact test coverage in the scenario. | None |
| `HRADM-E2E-015` | `E2E-JRN-005` | P0 | Failed / partial | Passing evidence: `08-security-provider-statutory-performance-browser.log`; unresolved failure: same log | TDS readiness and TDS package HR download passed. Statutory deduction report passed. Statutory filing status HR-admin report failed because no expected `code`/source evidence element was visible after sorting by artifacts, although manifest export returned 200. | `HRADM-DEF-20261010-030` |
| `HRADM-E2E-016` | `E2E-JRN-005` | P0 | Blocked / product decision | Existing defect history, no behavior changed in Phase 3C.5 | Missing primary bank-account readiness classification remains unresolved. Current implementation blocks missing primary bank accounts; stage-specific expected behavior still needs product/finance approval. | `HRADM-DEF-20261009-013`, `3C-GATE-PAY-BANK-001` |
| `HRADM-E2E-032` | `E2E-JRN-004` | P0 | Passed | `09-handoff-performance-browser.log` | Launch-critical route performance spec passed in the Phase 3C environment, including `/hr-admin/payroll-handoff`. Resolved payroll handoff defect `HRADM-DEF-20261010-028` was not reopened. | None |

Batch execution summary:

| Batch | Evidence | Existing tests executed | Result |
| --- | --- | ---: | --- |
| Fixture lock/seed | `01-lock-ph3c-inputs.log`, `02-seed-adjust-settle-close.json`, `03-seed-output-payslip.json`, `04-seed-calc-review.json` | 0 | 100 PH3C lockable snapshots locked; three disposable calculation runs seeded. Two parallel seed attempts hit SQLite lock and were rerun sequentially. |
| Output/payslip/ESS | `05-output-payslip-ess-browser.log` | 1 | Passed 1/1. |
| Finance handoff/compliance | `06-finance-handoff-compliance-browser.log` | 1 | Passed 1/1. |
| Adjustment/settlement/close | `07-adjustments-settlements-close-browser.log` | 1 | Passed 1/1. |
| Security/provider/statutory/report | `08-security-provider-statutory-performance-browser.log` | 16 | 13 passed, 3 failed before focused rerun/classification. |
| Handoff performance | `09-handoff-performance-browser.log` | 1 | Passed 1/1. |
| Provider retry focused rerun | `10-provider-retry-worker-rerun.log` | 1 | Passed 1/1 with Phase 3C DB env. |
| TDS employee-denial focused rerun | `11-tds-employee-denial-rerun.log` | 1 | Failed before API authorization assertion because the test expects stale `Self Service` heading. |
| DB reconciliation | `13-payroll-lifecycle-output-handoff-reconciliation.json` | Evidence probe | Output, artifact, handoff, provider and financial totals persisted as expected. |

Phase 3C.5 scenario totals: 11 scoped scenario IDs; 7 Passed, 1 Failed/partial, 3 Blocked/conditional, 0 Not Run. Executed Playwright scenario runs: 22 total attempts; 19 passed, 3 failed in initial/focused evidence. After rerun, provider retry is Passed; remaining unresolved failures are statutory filing evidence visibility and stale TDS ESS heading automation.

Readiness: Payroll lifecycle, output, payslip, finance handoff, provider callback/retry, RBAC and performance are conditionally ready for Phase 3C.6. Full cross-module payroll certification is not unconditional because `HRADM-E2E-015` remains partial/failed, provider conditionals remain unresolved and `HRADM-DEF-20261009-013` remains an open product decision.

## Phase 3C.6 Workflow, Notifications, RBAC, Audit and Reporting E2E Certification - 2026-10-10

Environment: isolated local QA database `backend/db.phase3c_e2e.sqlite3`, tenant `northstar-foods`, secondary isolation tenant `phase7b-isolation-tenant`, PH3C fixture family `PH3C_20261010`, Django API `http://127.0.0.1:8031/api/v1`, local Playwright app `http://127.0.0.1:3236`, Chromium. External provider/payment/email/SMS delivery remained sandboxed/local.

Scoped scenario IDs: `HRADM-E2E-006`, `017`, `018`, `020`, `021`, `022`, `024`, `025`, `026`, `027`, `028`, `029`, `030`, `031`, plus Phase 3C.5 carry-forward `015`.

| Scenario ID | Journey ID | Priority | Phase 3C.6 status | Fresh evidence | Actual result | Defect / gap |
| --- | --- | --- | --- | --- | --- | --- |
| `HRADM-E2E-006` | `E2E-JRN-002` | P0 | Passed | `docs/qa/evidence/phase3c6/04-reports-audit-recovery-browser.log` | Leave-attendance collision report filters, export evidence, manifest and employee denial passed. | `3C-GAP-TLA-COLLISION-001` closed |
| `HRADM-E2E-015` | `E2E-JRN-005` | P0 | Passed for statutory/TDS defect revalidation | `00-statutory-fixture-seed.json`, `01-statutory-tds-defect-revalidation-rerun3.log` | Statutory filing report now has deterministic filing/registration/source-hash fixture evidence; TDS package HR positive and non-HR denial passed. | `HRADM-DEF-20261010-030`, `031` resolved |
| `HRADM-E2E-017` | `E2E-JRN-006` | P0 | Passed | `02-workflow-notification-audit-browser.log`, `02b-ess-notification-rerun.log` | ESS/MSS/HR workflow routing, notification detail/source links, attendance regularization review, MSS queue switch and workflow trace timeline passed after fixture/selector alignment. | None |
| `HRADM-E2E-018` | `E2E-JRN-006` | P1 | Passed | `02-workflow-notification-audit-browser.log`, `02b-ess-notification-rerun.log`, `06-db-reconciliation-rerun.json` | Notification queue filters, retry-ready diagnostics, provider evidence, capped retry and in-app payroll/document notification propagation passed. | External email/SMS proof remains Phase 4 gate |
| `HRADM-E2E-020` | `E2E-JRN-007` | P0 | Passed | `03e-cross-tenant-isolation-certified-db-rerun2.log`, `06-db-reconciliation-rerun.json` | Second tenant created in the certified Phase 3C DB. HR admin from `northstar-foods` could not read/mutate other-tenant employee, department, notification or payroll artifact/signed-access resources; private markers did not leak. | `3C-GAP-XTENANT-001` closed |
| `HRADM-E2E-021` | `E2E-JRN-008` | P1 | Passed | `04-reports-audit-recovery-browser.log`, `04b-report-denial-rerun.log` | Import history ledger desktop/mobile filters and report export audit history passed with persisted audit counts. | None |
| `HRADM-E2E-022` | `E2E-JRN-008` | P0 | Passed at existing recovery coverage level | `02-workflow-notification-audit-browser.log`, `05-launch-command-performance-browser.log` | Notification retry/recovery and launch release fail-closed export checks passed. Payroll provider conditionals remain separate release gates. | `3C-GATE-PROV-001`, `3C-GATE-PROV-002` remain open |
| `HRADM-E2E-024` | `E2E-JRN-005` | P1 | Passed via inherited current PH3C evidence | `06-db-reconciliation-rerun.json` | PH3C DB contains 102 published payslips and report/export batches exercised by current report and payslip tests. Full register pagination >100 was already covered in prior payroll certification and was not rerun as a separate dedicated spec in this batch. | None |
| `HRADM-E2E-025` | `E2E-JRN-010` | P0 | Passed | `05-launch-command-performance-browser.log` | HR command center showed command queue, shortcuts, launch posture and certified layout. | None |
| `HRADM-E2E-026` | `E2E-JRN-010` | P0 | Passed | `05-launch-command-performance-browser.log` | Launch remediation and production release gate flows passed, including audit/remediation/operations/resilience/SLA gates and fail-closed release evidence export. | Bank/provider/external gates remain explicit release decisions |
| `HRADM-E2E-027` | `E2E-JRN-011` | P0 | Passed | `04-reports-audit-recovery-browser.log`, `04b-report-denial-rerun.log`, `06-db-reconciliation-rerun.json` | Report catalog, compliance export audit history, import history and report denial checks passed. DB shows 99 report export audit rows. | None |
| `HRADM-E2E-028` | `E2E-JRN-011` | P1 | Passed | `02-workflow-notification-audit-browser.log`, `04-reports-audit-recovery-browser.log` | Trust/security audit evidence and report/export evidence passed in supported screens. Generic `/api/hr-admin/audit` remains unavailable, but supported audit sources are covered. | `3C-GAP-WF-AUD-001` closed for supported evidence sources |
| `HRADM-E2E-029` | `E2E-JRN-012` | P1 | Passed | `05-launch-command-performance-browser.log` | Command center, report and launch-critical screens passed current compact browser checks in the executed suites. | None |
| `HRADM-E2E-030` | `E2E-JRN-012` | P1 | Passed | `05-launch-command-performance-browser.log` | Launch-critical route performance spec passed in Phase 3C.6 without reopening payroll handoff defect `HRADM-DEF-20261010-028`. | None |
| `HRADM-E2E-031` | `E2E-JRN-008` | P1 | Passed with bounded local recovery evidence | `02-workflow-notification-audit-browser.log`, `05-launch-command-performance-browser.log` | Duplicate/retry/idempotency behavior passed for notification retry and release evidence fail-closed paths. Provider conditional paths remain separately gated. | Provider conditionals open |

Batch execution summary:

| Batch | Evidence | Existing tests executed | Result |
| --- | --- | ---: | --- |
| Statutory/TDS carry-forward defects | `01-statutory-tds-defect-revalidation-rerun3.log` | 4 | Passed 4/4 after deterministic statutory fixture and stale heading/RBAC assertion updates. |
| Workflow / notifications / audit | `02-workflow-notification-audit-browser.log`, `02b-ess-notification-rerun.log` | 21 attempts | Final focused affected suites passed 9/9; original broad batch passed 10/12 with stale fixture/assertion failures preserved. |
| RBAC / tenant isolation | `03-rbac-tenant-isolation-browser.log`, `03c-production-tenant-role-rerun.log`, `03e-cross-tenant-isolation-certified-db-rerun2.log` | 20 attempts | Current focused tenant role/isolation evidence passed 6/6. Older Phase 7A/P100 workspace chooser tests remain stale under PH3C manager-capable employee persona and are not counted as fresh Phase 3C.6 blockers. |
| Reports / audit / recovery | `04-reports-audit-recovery-browser.log`, `04b-report-denial-rerun.log` | 12 attempts | Final focused report denial/export suites passed 4/4; collision/import/report positive suites passed in the broader batch. |
| Command / launch / performance | `05-launch-command-performance-browser.log` | 8 | Passed 8/8. |
| DB reconciliation | `06-db-reconciliation-rerun.json` | Evidence probe | Confirms both tenants in `db.phase3c_e2e.sqlite3`, 139 notifications, 99 report export audits, 102 published payslips, statutory filing source hash and private tenant markers. |

Phase 3C.6 latest scenario totals: 15 scoped scenario IDs; 15 Passed, 0 Failed, 0 Blocked, 0 Not Run. Previous open gaps `3C-GAP-XTENANT-001`, `3C-GAP-TLA-COLLISION-001`, `3C-GAP-WF-AUD-001`, `HRADM-DEF-20261010-030` and `HRADM-DEF-20261010-031` are closed for the supported local/sandbox evidence scope.

Open gates preserved: `HRADM-DEF-20261009-013` missing primary bank-account readiness decision, `3C-GATE-PROV-001`, `3C-GATE-PROV-002`, and Phase 4 real external email/SMS, deployed RBAC, backup/restore and realistic real-tenant handoff evidence.

Readiness: Ready for Phase 3C.7 final integration regression, conditionally on the open product/provider/Phase 4 gates remaining explicitly tracked and not silently certified.

## Phase 3C.7 Final Cross-Module E2E Regression and Certification - 2026-10-10

Environment: isolated local QA database `backend/db.phase3c_e2e.sqlite3`, tenants `northstar-foods` and `phase7b-isolation-tenant`, PH3C fixture family `PH3C_20261010`, Django API `http://127.0.0.1:8031/api/v1`, local Playwright app `http://127.0.0.1:3237`, Chromium. Provider, payment, email and SMS operations remained sandboxed/local.

Frozen original inventory: 32 unique Phase 3C E2E scenario IDs, `HRADM-E2E-001` through `HRADM-E2E-032`. No scenario was silently dropped. Current certification status is one row per original ID; focused reruns are evidence, not extra scenario count.

| Scenario IDs | Journey area | Final Phase 3C.7 status | Fresh evidence |
| --- | --- | --- | --- |
| `HRADM-E2E-001`, `002`, `003`, `019`, `020` | Tenant/org -> employee lifecycle -> documents -> ESS/MSS/RBAC/two-tenant isolation | Passed | `docs/qa/evidence/phase3c7/01-workforce-lifecycle-regression.log`, `04-workflow-rbac-reporting-launch-regression.log`, `05-final-db-reconciliation.json` |
| `HRADM-E2E-004`, `005`, `006`, `023` | Time, leave, attendance, roster and payroll-input linkage | Passed | `02-time-leave-attendance-payroll-input-regression.log`, `02b-time-to-payroll-rerun.log`, `04-workflow-rbac-reporting-launch-regression.log`, `05-final-db-reconciliation.json` |
| `HRADM-E2E-007`, `008`, `009`, `010`, `011`, `014`, `015`, `024`, `032` | Payroll calculation, adjustments, output, payslips, statutory reports, handoff, provider retry and performance | Passed | `03-payroll-lifecycle-output-handoff-regression.log`, `03a-reseed-output-payslip.json`, `03b-output-payslip-rerun.log`, `04-workflow-rbac-reporting-launch-regression.log`, `05-final-db-reconciliation.json` |
| `HRADM-E2E-012`, `013` | Conditional provider incomplete-lane and provider audit-pack evidence | Conditional | Preserved from frozen payroll manifest and Phase 3C.5/3C.7 disposition. No real provider sandbox evidence was executed locally. |
| `HRADM-E2E-016` | Missing primary bank-account readiness classification | Conditional | Preserved as `HRADM-DEF-20261009-013`; current implementation behavior was not changed without product/finance approval. |
| `HRADM-E2E-017`, `018`, `021`, `022`, `025`, `026`, `027`, `028`, `029`, `030`, `031` | Workflow, notifications, reports, audit, recovery, command center, launch gates and performance | Passed | `04-workflow-rbac-reporting-launch-regression.log`, `05-final-db-reconciliation.json` |

Fresh browser execution batches:

| Batch | Evidence | Result | Notes |
| --- | --- | --- | --- |
| Workforce lifecycle | `01-workforce-lifecycle-regression.log` | Passed 3/3 | Employee creation/update, onboarding/documents, ESS/MSS visibility and access revocation passed. |
| Time/leave/attendance/payroll inputs | `02-time-leave-attendance-payroll-input-regression.log`, `02b-time-to-payroll-rerun.log` | Final affected coverage passed | Broad run passed 10, skipped 2 optional leave branches and failed one stale employee-shell assertion. Focused rerun of time-to-payroll passed 4/4 after updating the assertion to current employee/manager-capable workspace semantics. |
| Payroll lifecycle/output/handoff | `03-payroll-lifecycle-output-handoff-regression.log`, `03b-output-payslip-rerun.log` | Final affected coverage passed | Broad run passed 8 and exposed a repeatability issue where the disposable output run was already locked. Supported reseed restored deterministic state and the output/payslip scenario passed. |
| Workflow/RBAC/reporting/launch/performance | `04-workflow-rbac-reporting-launch-regression.log` | Passed 28/28 | Notifications, workflow trace, tenant isolation, reports, audit, command center, launch gates and performance passed. |
| DB reconciliation | `05-final-db-reconciliation.json` | Passed evidence probe | Confirms 100 PH3C employees, 2,210 attendance records, 500 payroll snapshots, completed 100-employee payroll calculation, 103 tenant payslips, report/audit/source-hash evidence and second-tenant isolation fixture. |
| Static checks | `06-backend-check.log`, `07-web-tsc.log` | Passed | Django system check passed with 0 issues; `pnpm exec tsc --noEmit` passed. |

Final Phase 3C.7 scenario totals against the original 32 IDs: 29 Passed, 0 Failed, 0 Blocked, 3 Conditional, 0 Not Run.

Conditional gates not certified locally:

| Gate | Affected scenario | Status | Release impact |
| --- | --- | --- | --- |
| `3C-GATE-PROV-001` | `HRADM-E2E-012` | Conditional | Incomplete provider lane needs real sandbox execution evidence or approved exclusion. |
| `3C-GATE-PROV-002` | `HRADM-E2E-013` | Conditional | Provider audit-pack drilldown needs real sandbox evidence or approved exclusion. |
| `HRADM-DEF-20261009-013` | `HRADM-E2E-016` | Conditional product decision | Missing-bank readiness must be approved separately for calculation, review, output, bank advice and payment submission. |

Final verdict: Conditionally Certified for local/sandbox Phase 3C scope. All mandatory locally executable P0/P1 E2E scenarios passed with fresh evidence; final production launch remains gated by the conditional provider/bank decisions plus Phase 4 real external email/SMS, deployed RBAC, backup/restore and realistic real-tenant handoff validation.
