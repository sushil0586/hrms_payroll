# Phase 2 Existing Test Inventory

Date: 2026-10-09
Scope: HR Admin first, based on Phase 1 IDs
Execution status: Discovery only. No tests were executed in this phase.

## Discovery Method

Static inventory reviewed test files under:

- `web/tests/e2e`
- `web/tests/visual`
- `web/tests/helpers`
- `backend/apps/*/tests.py`
- `backend/tests/test_*.py`

Virtualenv package tests were excluded from repository coverage counts. The inventory is based on test declarations, route/API references, assertions, and historical QA evidence files in `docs/qa`.

## Inventory Counts

| Category | Count |
| --- | ---: |
| Repository test files discovered | 277 |
| Playwright E2E spec files | 259 |
| Playwright visual spec files | 6 |
| Backend test files | 12 |
| Test scenarios/functions discovered | 1,439 |
| Phase 1 HR Admin modules | 9 |
| Phase 1 HR Admin screens, including child surfaces | 152 |
| Phase 1 functionality groups | 45 |

Every discovered test file had at least one HRMS domain signal such as HR Admin, payroll, attendance, leave, employee, document, notification, report, audit, import, workflow, or organization. This does not mean every file maps directly to HR Admin Phase 1; tenant admin, platform admin, ESS, MSS, public, support, and finance tests are retained as adjacent/integration evidence where they validate cross-module behavior.

## High-Value Existing Test Files

| Test file | Type | Scenarios | Primary modules | Assertion quality | Historical execution evidence |
| --- | --- | ---: | --- | --- | --- |
| `web/tests/e2e/employee-directory-certification.spec.ts` | Playwright E2E | 6 | WF, AUD, RBAC | Strong: UI, API, RBAC denials, import validation, pagination | Passed evidence in `hr-admin-95-readiness-improvement-plan-2026-09-15.md` and public launch docs |
| `web/tests/e2e/employee-bank-accounts-certification.spec.ts` | Playwright E2E | 2 | WF, PAY readiness dependency | Strong: create/read/update/primary switching/API verification | Historical file referenced by readiness plan; no direct run line found in this pass |
| `web/tests/e2e/employee-documents-onboarding-certification-flows.spec.ts` | Playwright E2E | 4 | DOC, WF, RBAC | Strong: upload, queue, RBAC denials, onboarding form/queue | Historical certification docs exist for related phase |
| `web/tests/e2e/employee-probation-audit-role-certification-flows.spec.ts` | Playwright E2E | 4 | WF, AUD, ESS/MSS | Strong: probation, audit filters, role surfaces | Historical certification docs exist for related phase |
| `web/tests/e2e/employee-review-movement-exit-certification-flows.spec.ts` | Playwright E2E | discovered | WF | Expected strong by naming; detailed assertion review pending | Historical certification docs exist for related phase |
| `web/tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts` | Playwright E2E | 4 | TLA, RBAC | Strong: filters, bulk failure recovery, regularization review, roster inspector, negative APIs | Passed evidence in 2026-10-08/2026-10-09 QA docs for selected scenarios |
| `web/tests/e2e/hr-admin-leave-management-production-certification.spec.ts` | Playwright E2E | discovered | TLA | Partial review only; likely leave operations | Not reliably linked in this phase |
| `web/tests/e2e/hr-admin-leave-request-operations-certification.spec.ts` | Playwright E2E | discovered | TLA | Partial review only | Not reliably linked in this phase |
| `web/tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts` | Playwright E2E | 3 | TLA, RBAC | Strong: read-only roles and backend denials | Not reliably linked in this phase |
| `web/tests/e2e/attendance-records-slim-options-qa.spec.ts` | Playwright E2E | discovered | TLA | UI/UX targeted; assertion review pending | Not reliably linked in this phase |
| `web/tests/e2e/roster-shift-operations-compact-qa.spec.ts` | Playwright E2E | discovered | TLA | UI/UX targeted; assertion review pending | Not reliably linked in this phase |
| `web/tests/e2e/payroll-setup-flows.spec.ts` | Playwright E2E | 5 | PAY, SET | Strong: tabs, CRUD, validation, mobile | Passed evidence in 2026-09-09 and 2026-09-15 docs |
| `web/tests/e2e/salary-setup-flows.spec.ts` | Playwright E2E | discovered | PAY | Strong by suite family; detailed assertions pending | Passed evidence in 2026-09-15 batch |
| `web/tests/e2e/payroll-rules-flows.spec.ts` | Playwright E2E | discovered | PAY | Strong by suite family; detailed assertions pending | Passed evidence in 2026-09-15 batch |
| `web/tests/e2e/payroll-readiness-flows.spec.ts` | Playwright E2E | discovered | PAY | Strong by suite family; detailed assertions pending | Passed evidence in 2026-10-09 E90 docs |
| `web/tests/e2e/payroll-inputs-flows.spec.ts` | Playwright E2E | discovered | PAY, TLA integration | Strong by suite family; detailed assertions pending | Passed evidence in 2026-10-09 E90 docs |
| `web/tests/e2e/payroll-calculations-flows.spec.ts` | Playwright E2E | discovered | PAY | Strong by suite family; detailed assertions pending | Passed evidence in `hrms-enterprise-90-phase-tracker-2026-10-09.md` |
| `web/tests/e2e/payroll-review-flows.spec.ts` | Playwright E2E | 3 | PAY | Strong: compact payload, exception validation, recovery, mobile/history | Passed evidence in 2026-10-09 E90 docs |
| `web/tests/e2e/payroll-outputs-flows.spec.ts` | Playwright E2E | discovered | PAY | Strong by suite family; detailed assertions pending | Passed evidence in 2026-10-09 E90 docs |
| `web/tests/e2e/payroll-handoff-flows.spec.ts` | Playwright E2E | 2 | PAY | Medium/strong: evidence lanes, mobile/history; mostly read/navigation | Passed evidence in 2026-10-09 E90 docs |
| `web/tests/e2e/payroll-providers-flows.spec.ts` | Playwright E2E | discovered | PAY | Strong by suite family; detailed assertions pending | Historical batch evidence exists |
| `web/tests/e2e/payroll-adjustments-flows.spec.ts` | Playwright E2E | 2 | PAY | Medium: workspace/read evidence; mutation depth unclear | Passed evidence in 2026-10-09 E90 docs |
| `web/tests/e2e/payroll-settlements-flows.spec.ts` | Playwright E2E | discovered | PAY | Medium/strong by suite family | Historical batch evidence exists |
| `web/tests/e2e/payroll-statutory-flows.spec.ts` | Playwright E2E | discovered | PAY | Strong by suite family; detailed assertions pending | Historical batch evidence exists |
| `web/tests/e2e/payroll-statutory-rbac-certification.spec.ts` | Playwright E2E | discovered | PAY, RBAC | RBAC targeted | Not reliably linked in this phase |
| `web/tests/e2e/notification-setup-crud-flows.spec.ts` | Playwright E2E | discovered | NOTIF | CRUD suite; detailed assertions pending | Passed evidence in older targeted regression docs |
| `web/tests/e2e/production-notification-flows.spec.ts` | Playwright E2E | 6 | NOTIF, PAY | Medium: queue/review/diagnostics/delivery/read flows | Not reliably linked in this phase |
| `web/tests/e2e/hr-admin-notification-phase1-certification.spec.ts` | Playwright E2E | discovered | NOTIF | Certification suite; detailed assertions pending | Not reliably linked in this phase |
| `web/tests/e2e/organization-master-crud-flows.spec.ts` | Playwright E2E | discovered | SET | Strong CRUD/import/dependent dropdown by historical docs | Passed evidence in 2026-09-15 readiness plan |
| `web/tests/e2e/configuration-form-flows.spec.ts` | Playwright E2E | discovered | SET, TLA, NOTIF, WF | Form validation/navigation suite | Passed evidence in 2026-09-09 targeted regression |
| `web/tests/e2e/workflow-trace-flows.spec.ts` | Playwright E2E | discovered | SET | Workflow trace suite | Historical targeted regression evidence |
| `web/tests/e2e/import-history-ledger-certification.spec.ts` | Playwright E2E | discovered | AUD | Import ledger targeted | Not reliably linked in this phase |
| `web/tests/e2e/compliance-export-audit-history-certification.spec.ts` | Playwright E2E | 3 | AUD, REP | Strong: export audit create/read/RBAC | Not reliably linked in this phase |
| `web/tests/e2e/hr-admin-unified-design-full-route-certification.spec.ts` | Playwright E2E | 3 | All HR Admin UI | Strong for route shell/heading/unified model, weak for business logic | Passed evidence in `hr-admin-unified-design-route-functionality-matrix-2026-10-09.md` |
| `web/tests/e2e/hr-admin-full-route-ui-audit.spec.ts` | Playwright E2E | discovered | All HR Admin UI | UI audit helper-based | Not reliably linked in this phase |
| `web/tests/e2e/hr-admin-dynamic-route-ui-audit.spec.ts` | Playwright E2E | discovered | Dynamic HR Admin routes | UI audit helper-based | Not reliably linked in this phase |
| `web/tests/e2e/hr-admin-compact-hubs-certification.spec.ts` | Playwright E2E | discovered | CMD, TLA, PAY, REP, SET | Compact hub UX | Not reliably linked in this phase |
| `web/tests/e2e/hr-admin-e90-8-final-ux-certification.spec.ts` | Playwright E2E | discovered | All HR Admin UI | Unified compact UX | Not reliably linked in this phase |
| `web/tests/visual/operational-baseline.visual.spec.ts` | Playwright visual | 2 template tests | PAY, WF, DOC, NOTIF, REP, AUD, SET | Visual snapshot only | Snapshot files exist; execution status not inferred |
| `web/tests/visual/configuration-form-baseline.visual.spec.ts` | Playwright visual | 2 template tests | WF, TLA, SET, NOTIF | Visual snapshot only | Snapshot files exist; execution status not inferred |
| `web/tests/visual/governance-assignment-baseline.visual.spec.ts` | Playwright visual | 2 template tests | TLA, DOC, SET | Visual snapshot only | Snapshot files exist; execution status not inferred |
| `backend/apps/attendance/tests.py` | Backend unit/integration | 21 | TLA, PAY integration | Strong: schedule spine, derivation, collision, regularization track | Not run in this phase |
| `backend/apps/leave_management/tests.py` | Backend unit/integration | 27 | TLA, PAY integration | Strong: conflicts, assignment resolution, balances, approval track, overlap | Not run in this phase |
| `backend/apps/payroll/tests.py` | Backend unit/integration | 17 | PAY | Strong: rule context, calculations, payslip/tax sheet, reconciliation blockers | Not run in this phase |
| `backend/apps/documents/tests.py` | Backend unit/integration | 5 | DOC, NOTIF | Strong: upload, HR verification, rejection/reupload, reminders | Not run in this phase |
| `backend/apps/common/tests.py` | Backend API/integration | 17 | SET, TLA, PAY | Strong: option metadata, schedule preview, payroll snapshot, lock blockers, delete/archive policies | Not run in this phase |
| `backend/tests/test_phase0_api_smoke.py` | Backend API | 356 | CMD, REP, AUD, HR Admin API broad | Strong: many API status/body/RBAC assertions | Not run in this phase |

## Test Quality Observations

- Strong suites combine browser UI assertions with direct API verification and explicit RBAC denial checks. Examples: `employee-directory-certification.spec.ts`, `employee-bank-accounts-certification.spec.ts`, `employee-documents-onboarding-certification-flows.spec.ts`, `payroll-setup-flows.spec.ts`.
- Medium suites validate navigation/readiness/visual layout but do not always mutate data or assert backend side effects. Examples: several UI audit, visual baseline, and report polish specs.
- Weak or partial suites are route-smoke or visual-only checks. They are valuable for shell regressions but cannot certify business workflows.
- Existing backend tests are strong for business logic but do not validate HR Admin UI behavior.
- Historical pass evidence exists for some suites, but Phase 2 did not execute tests and does not infer current pass status from file presence.

## Unmapped / Adjacent Test Categories

| Category | Examples | Reason not fully mapped to HR Admin Phase 1 |
| --- | --- | --- |
| Platform admin | `platform-admin-*`, public lead/provisioning tests | Adjacent tenant setup and permission catalog coverage, not HR Admin screen coverage |
| Tenant admin | `tenant-admin-*` | Supports role/RBAC setup, not HR Admin UI directly |
| ESS/MSS | `ess-*`, `mss-*` | Cross-module workflow dependencies for leave/attendance/documents/payroll, but not HR Admin screens |
| Support/security | `phase7*`, support console, tenant trust | Security evidence adjacent to HR Admin audit/compliance |
| Public/auth | public signup, auth routing | Workspace access dependencies only |

## Duplicate / Overlap Patterns

- Payroll report coverage appears in both individual report certification specs and broader pilot/full-report export regression specs.
- Route/UI shell coverage appears in `route-smoke`, `tier-one-route-smoke`, `hr-admin-full-route-ui-audit`, `hr-admin-unified-design-full-route-certification`, and visual baseline specs.
- Employee directory/import coverage appears in `employee-directory-certification`, pilot workforce, and public launch evidence.
- Payroll close lifecycle appears in granular payroll specs, `user-journey-phase5-payroll-close-workflow`, pilot 100 suites, and production close suites.

These overlaps should be reused as layered coverage, not duplicated by new automation unless a specific Phase 1 function remains uncovered.
