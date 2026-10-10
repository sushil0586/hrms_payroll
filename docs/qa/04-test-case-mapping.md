# Phase 2 Test Case Mapping

Date: 2026-10-09
Scope: Existing tests mapped to Phase 1 HR Admin IDs
Execution status: Discovery only. No tests were executed in this phase.

## Mapping Rules

Coverage is credited only when existing tests contain meaningful assertions for the behavior. Route names and test names alone are not treated as proof.

Coverage labels:

- `Full`: existing tests include UI behavior plus meaningful assertion of state, API response, validation, RBAC, or side effect for the functionality group.
- `Partial`: existing tests cover route/shell/read behavior or backend logic, but not the full UI/API/business workflow.
- `None`: no existing meaningful test found in this phase.
- `Duplicate/overlap`: more than one suite targets the same behavior.

## Functionality Mapping

| Functionality ID | Module | Screen IDs | Existing mapped tests | Covered behaviors | Coverage |
| --- | --- | --- | --- | --- | --- |
| HRADM-FNC-WF-001 | Workforce | HRADM-SCR-WF-001 | `employee-directory-certification.spec.ts`, `pilot-100-workforce-certification.spec.ts`, `hr-admin-employee-production-certification.spec.ts` | filters, pagination, list metrics, empty state, search, read-only viewer | Full |
| HRADM-FNC-WF-002 | Workforce | HRADM-SCR-WF-001, HRADM-SCR-WF-C01 | `employee-directory-certification.spec.ts`, `pilot-100-workforce-certification.spec.ts` | selected employee detail, action menu visibility, fields | Full |
| HRADM-FNC-WF-003 | Workforce | HRADM-SCR-WF-002/003 | `employee-directory-certification.spec.ts`, `hr-admin-employee-production-certification.spec.ts` | create employee, backend create denial, edit denial; direct edit positive coverage less clear | Partial |
| HRADM-FNC-WF-004 | Workforce | HRADM-SCR-WF-004 | `employee-directory-certification.spec.ts`, `employee-fresh-access-visibility-certification-flows.spec.ts` | access create fixture, access denial, role visibility | Partial |
| HRADM-FNC-WF-005 | Workforce | HRADM-SCR-WF-005 | `employee-bank-accounts-certification.spec.ts`, `phase9e-bank-account-readiness.spec.ts` | create/read/update/primary switching/API read/no delete control | Full |
| HRADM-FNC-WF-006 | Workforce | HRADM-SCR-WF-001, HRADM-SCR-WF-C02 | `employee-directory-certification.spec.ts`, `phase9-bulk-upload-100-workforce-certification.spec.ts` | employee CSV template, preview, blocked rows, commit, directory verification | Full |
| HRADM-FNC-WF-007 | Workforce | HRADM-SCR-WF-001, HRADM-SCR-WF-C02 | `employee-directory-certification.spec.ts` | bank CSV template, validation, commit, payout readiness | Full |
| HRADM-FNC-WF-008 | Workforce | HRADM-SCR-WF-001, HRADM-SCR-WF-C02 | `employee-directory-certification.spec.ts` | manager CSV template, duplicate/self/missing validation, commit, coverage update | Full |
| HRADM-FNC-WF-009 | Workforce | HRADM-SCR-WF-006..018 | `employee-documents-onboarding-certification-flows.spec.ts`, `employee-probation-audit-role-certification-flows.spec.ts`, `employee-review-movement-exit-certification-flows.spec.ts`, `employee-lifecycle-certification-flows.spec.ts`, `lifecycle-aging-report-certification.spec.ts` | onboarding/probation/movement/exit queues and forms, lifecycle reports | Full for major flows; child edge cases partial |
| HRADM-FNC-DOC-001 | Documents | HRADM-SCR-DOC-001..003 | `employee-documents-onboarding-certification-flows.spec.ts`, `backend/apps/documents/tests.py`, `document-compliance-report-certification.spec.ts` | upload, queue, RBAC, verify/reject backend, reminders, report | Full |
| HRADM-FNC-DOC-002 | Documents | HRADM-SCR-DOC-004..009 | `employee-documents-onboarding-certification-flows.spec.ts`, `configuration-form-flows.spec.ts`, `governance-assignment-form-flows.spec.ts` | category/requirement setup forms and visual baselines | Partial |
| HRADM-FNC-DOC-003 | Documents | HRADM-SCR-DOC-010..011 | `generated-letter-flows.spec.ts`, `generated-letter-baseline.visual.spec.ts` | generated letter workspace, visual baseline | Partial |
| HRADM-FNC-TLA-001 | Time/Leave/Attendance | HRADM-SCR-TLA-001 | `time-to-payroll-control-certification.spec.ts`, `pilot-100-inputs-certification.spec.ts` | readiness cockpit, evidence drilldowns, employee denial | Full |
| HRADM-FNC-TLA-002 | Time/Leave/Attendance | HRADM-SCR-TLA-003 | `hr-admin-attendance-operations-workflow-certification.spec.ts`, `attendance-records-slim-options-qa.spec.ts`, `attendance-register-report-certification.spec.ts` | filters, empty state, derivation summary, pagination/UI compactness | Full |
| HRADM-FNC-TLA-003 | Time/Leave/Attendance | HRADM-SCR-TLA-003, HRADM-SCR-TLA-C01 | `hr-admin-attendance-operations-workflow-certification.spec.ts` | bulk action failure recovery and selection reset; positive state mutation less clear | Partial |
| HRADM-FNC-TLA-004 | Time/Leave/Attendance | HRADM-SCR-TLA-003/004, HRADM-SCR-TLA-C02 | `hr-admin-attendance-operations-workflow-certification.spec.ts`, `backend/apps/attendance/tests.py` | edit failure UX, derivation backend, import workbench not fully proven | Partial |
| HRADM-FNC-TLA-005 | Time/Leave/Attendance | HRADM-SCR-TLA-005/006 | `hr-admin-attendance-operations-workflow-certification.spec.ts`, `mss-rbac-approver-certification.spec.ts`, `backend/apps/attendance/tests.py` | regularization filters, approve/reject recovery, approval track, RBAC denials | Full |
| HRADM-FNC-TLA-006 | Time/Leave/Attendance | HRADM-SCR-TLA-007..020 | `hr-admin-attendance-operations-workflow-certification.spec.ts`, `roster-shift-operations-compact-qa.spec.ts`, `backend/apps/attendance/tests.py`, `roster-rollout-audit-report-certification.spec.ts` | shift inspector, roster rollout preview, schedule spine, conflicts | Partial: CRUD create/edit/import coverage not complete |
| HRADM-FNC-TLA-007 | Time/Leave/Attendance | HRADM-SCR-TLA-021..023 | `hr-admin-leave-request-operations-certification.spec.ts`, `leave-balance-import-flows.spec.ts`, `leave-balance-report-certification.spec.ts`, `backend/apps/leave_management/tests.py` | request/balance business logic, reports, balance review | Partial: HR Admin browser import/action edge cases need deeper mapping |
| HRADM-FNC-TLA-008 | Time/Leave/Attendance | HRADM-SCR-TLA-024..039 | `policy-governance-master-crud-flows.spec.ts`, `governance-assignment-form-flows.spec.ts`, `hr-admin-time-leave-policy-ui-audit.spec.ts`, `backend/apps/leave_management/tests.py`, `backend/apps/common/tests.py` | policy CRUD, assignment conflicts, delete/archive/deactivate backend | Full for backend/business; browser edge cases partial |
| HRADM-FNC-PAY-001 | Payroll | HRADM-SCR-PAY-001 | `payroll-readiness-flows.spec.ts`, `payroll-readiness-negative-gates-certification.spec.ts`, `payroll-readiness-bank-gate-certification.spec.ts` | readiness tabs, negative gates, bank blockers | Full |
| HRADM-FNC-PAY-002 | Payroll | HRADM-SCR-PAY-002 | `payroll-setup-flows.spec.ts` | tabs, CRUD, validation, mobile | Full |
| HRADM-FNC-PAY-003 | Payroll | HRADM-SCR-PAY-003 | `salary-setup-flows.spec.ts` | setup flow family; detailed assertion mapping pending | Partial |
| HRADM-FNC-PAY-004 | Payroll | HRADM-SCR-PAY-004 | `payroll-rules-flows.spec.ts`, `backend/apps/payroll/tests.py` | rule/version/evaluation backend and browser flows | Full |
| HRADM-FNC-PAY-005 | Payroll | HRADM-SCR-PAY-005, HRADM-SCR-PAY-C03 | `payroll-statutory-flows.spec.ts`, `payroll-statutory-rbac-certification.spec.ts`, `backend/apps/payroll/tests.py` | statutory setup/declarations and RBAC | Partial: declaration item browser proof needs detail |
| HRADM-FNC-PAY-006 | Payroll | HRADM-SCR-PAY-006 | `payroll-inputs-flows.spec.ts`, `pilot-100-payroll-input-snapshot-certification.spec.ts`, `backend/apps/common/tests.py` | snapshots, lock gates, schedule spine, reconciliation blockers | Full |
| HRADM-FNC-PAY-007 | Payroll | HRADM-SCR-PAY-007 | `payroll-calculations-flows.spec.ts`, `backend/apps/payroll/tests.py` | draft calculation, schedule spine context, compact calculation UI | Full |
| HRADM-FNC-PAY-008 | Payroll | HRADM-SCR-PAY-008 | `payroll-review-flows.spec.ts`, `payroll-review-exception-decision-certification.spec.ts`, `phase5g-payroll-negative-controls.spec.ts` | review desk, exception validation/recovery, approve/lock/negative controls | Full |
| HRADM-FNC-PAY-009 | Payroll | HRADM-SCR-PAY-009, HRADM-SCR-PAY-C01 | `payroll-outputs-flows.spec.ts`, `payroll-output-artifact-certification.spec.ts`, `phase6c-signed-artifact-grants.spec.ts`, `backend/apps/payroll/tests.py` | outputs, artifacts, signed access, reconciliation blockers | Full |
| HRADM-FNC-PAY-010 | Payroll | HRADM-SCR-PAY-010, HRADM-SCR-PAY-C02 | `payroll-handoff-flows.spec.ts`, `pilot-100-finance-handoff-compliance-certification.spec.ts`, `production-provider-callback-flows.spec.ts` | finance handoff desk, provider lanes, audit packs, retries/callbacks | Full for read/evidence; mutation edge cases partial |
| HRADM-FNC-PAY-011 | Payroll | HRADM-SCR-PAY-011 | `payroll-providers-flows.spec.ts`, `provider-certification-center-certification.spec.ts`, `phase6b-provider-callback-mutation.spec.ts` | provider connections/certification/callbacks/mappings | Partial: mapping simulation/export details need confirmation |
| HRADM-FNC-PAY-012 | Payroll | HRADM-SCR-PAY-012..017 | `payroll-adjustments-flows.spec.ts`, `payroll-settlements-flows.spec.ts`, `pilot-100-adjustments-settlements-close-certification.spec.ts` | adjustments/settlements workspaces and pilot close path | Partial: approval/apply negative paths need explicit mapping |
| HRADM-FNC-REP-001 | Reports | HRADM-SCR-REP-001..005 | `reporting-foundation-certification.spec.ts`, `hr-admin-report-workspace-submenu-certification.spec.ts` | catalog/family navigation | Full |
| HRADM-FNC-REP-002 | Reports | HRADM-SCR-REP-006..031 | individual `*-report-certification.spec.ts`, `pilot-100-full-report-export-regression.spec.ts` | filters, sort, pagination, rows across many reports | Full for many reports; not every report confirmed in this pass |
| HRADM-FNC-REP-003 | Reports | HRADM-SCR-REP-006..031 | individual report specs, `compliance-report-export-certification.spec.ts`, `compliance-report-manifest-certification.spec.ts`, `backend/tests/test_phase0_api_smoke.py` | CSV/manifest/export audit/RBAC | Full for export API; report-by-report gaps remain |
| HRADM-FNC-REP-004 | Reports | HRADM-SCR-REP-006..031 | individual report specs | operational deep links | Partial |
| HRADM-FNC-NOTIF-001 | Notifications | HRADM-SCR-NOTIF-002..004 | `notification-setup-crud-flows.spec.ts`, `hr-admin-notification-phase1-certification.spec.ts` | templates CRUD/preview/test-send family | Partial |
| HRADM-FNC-NOTIF-002 | Notifications | HRADM-SCR-NOTIF-005..007 | `notification-setup-crud-flows.spec.ts` | events CRUD family | Partial |
| HRADM-FNC-NOTIF-003 | Notifications | HRADM-SCR-NOTIF-008 | `production-notification-flows.spec.ts` | delivery configuration/read controls | Partial |
| HRADM-FNC-NOTIF-004 | Notifications | HRADM-SCR-NOTIF-009 | `production-notification-flows.spec.ts` | diagnostics route to queue/retry | Partial |
| HRADM-FNC-NOTIF-005 | Notifications | HRADM-SCR-NOTIF-010/011, HRADM-SCR-NOTIF-C01 | `production-notification-flows.spec.ts`, `phase6e-notification-provider-retry.spec.ts`, `backend/apps/documents/tests.py` | queue filters/retry/review/provider evidence | Full for retry/review; bulk retry edge cases partial |
| HRADM-FNC-SET-001 | Setup | HRADM-SCR-SET-001..003 | `organization-master-crud-flows.spec.ts`, `hr-admin-organization-production-certification.spec.ts`, `payroll-setup-flows.spec.ts` | organization CRUD, dependent options, legal entity setup | Full |
| HRADM-FNC-SET-002 | Setup | HRADM-SCR-SET-004..008 | `workflow-trace-flows.spec.ts`, `tier-two-workflow-flows.spec.ts`, `configuration-form-flows.spec.ts` | workflow template/assignment forms and traces | Partial |
| HRADM-FNC-AUD-001 | Audit | HRADM-SCR-AUD-001 | `employee-probation-audit-role-certification-flows.spec.ts`, `phase7e-security-audit-evidence.spec.ts`, `phase7h-audit-download-rejected-support.spec.ts` | audit filters, source links, security evidence | Partial |
| HRADM-FNC-AUD-002 | Audit | HRADM-SCR-AUD-002 | `import-history-ledger-certification.spec.ts`, import suites | import batch ledger and summaries | Partial |

## Duplicated / Overlapping Mappings

| Functionality | Duplicate suites | Recommendation |
| --- | --- | --- |
| HRADM-FNC-WF-001/002 | employee directory, pilot workforce, employee production certification | Keep `employee-directory-certification` as canonical; use pilot/production for data-volume regression |
| HRADM-FNC-PAY-006..010 | granular payroll specs, pilot 100, production payroll close, user journey phase 5 | Keep granular specs as canonical; use pilot/production for end-to-end release rehearsals |
| HRADM-FNC-REP-002/003 | individual report specs plus pilot full export regression | Keep individual specs for report-specific behavior; use pilot regression for breadth |
| UI shell/compactness | route smoke, full route UI audit, unified design certification, visual snapshots | Keep unified design spec as canonical compact model; smoke/visual tests are secondary |

## Obsolete / Needs Review

| Test | Reason |
| --- | --- |
| `web/tests/e2e/tier-one-route-smoke.spec.ts` | Assertion count appears low/zero in static scan; useful only as smoke if helper assertions are indirect |
| `web/tests/e2e/route-smoke.spec.ts` | Potential overlap with route/UI audit suites |
| Older `phase*` payroll close specs | May duplicate newer granular payroll and pilot 100 suites; retain only if they cover unique negative controls |
| Visual baseline snapshots | Valuable for regression, but not proof of functionality or business correctness |

## Unmapped Tests

No test file was removed from consideration. Tests outside HR Admin are classified as adjacent rather than mapped directly. These include tenant admin, platform admin, ESS, MSS, public, support, and finance-manager workspaces.
