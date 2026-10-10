# Phase 3C.1 Cross-Module E2E Plan

Date: 2026-10-10
Phase: Phase 3C.1 planning only
Execution status: Not Run. No tests, seed scripts, migrations, browser sessions or application code changes were executed in this phase.

## Objective

Prepare a complete, traceable cross-module end-to-end certification plan for HRMS/Payroll before execution. This plan links the Phase 1 HR Admin screen/functionality IDs, Phase 2 test mappings, Phase 3B certification evidence and known release gates into journey-level test coverage.

## Evidence Read

Planning used repository QA documentation and test inventory, including:

- `docs/qa/00-master-qa-plan.md`
- `docs/qa/01-screen-inventory.md`
- `docs/qa/02-functionality-matrix.md`
- `docs/qa/04-test-case-mapping.md`
- `docs/qa/05-test-coverage-gap-analysis.md`
- `docs/qa/06-master-test-case-register.md`
- `docs/qa/08-test-execution-results.md`
- `docs/qa/09-defect-register.md`
- `docs/qa/10-payroll-release-test-manifest.md`
- existing Playwright/API/backend test file inventory under `web/tests/e2e` and `backend/**/tests.py`

## Phase 3B Baseline Entering 3C

| Area | Latest certified status used for 3C planning | Release impact |
| --- | --- | --- |
| Backend/API foundation | Backend smoke and affected suites remediated through Phase 3B.1B | Ready as API foundation, still requires E2E state-chain proof |
| Workforce / Documents / Access | Phase 3B.2A resolved defects; scoped slice certified except optional no-access persona dependency | Ready for cross-module onboarding and ESS journeys |
| Time / Leave / Attendance / Roster | Phase 3B.3A stabilized duplicate leave-policy validation and roster rollout | Ready; delete/archive for shift assignments and roster templates remains product decision |
| Payroll | Phase 3B.4G conditionally certified against frozen 106-record manifest | Cross-module payroll execution must preserve open gates below |
| Organization / Setup / Workflow | Phase 3B.5B certified 57/57 scenarios | Ready for setup and workflow dependency journeys |
| Notifications / Reports / Audit / Imports | Phase 3B.6B certified 76/76 browser baseline for sandbox/in-app scope | Ready; real external email/SMS remains Phase 4 |
| Command Center / Launch / Operations | Phase 3B.7 functionally certified; Phase 3B.7A resolved handoff performance defect | Ready; non-handoff performance variance tracked separately |

## Explicit Release Gates

| Gate ID | Source | Status | Phase 3C handling |
| --- | --- | --- | --- |
| 3C-GATE-PAY-BANK-001 | `HRADM-DEF-20261009-013` | Open product/business decision | Keep missing primary bank-account readiness unresolved until approved stage-specific rule exists for calculation, review/output, bank advice and payment submission |
| 3C-GATE-PROV-001 | Phase 3B.4G provider incomplete-lane conditional scenario | Open conditional disposition | Do not count as passed without deterministic fixture or formal exclusion |
| 3C-GATE-PROV-002 | Phase 3B.4G production provider audit drilldown conditional scenario | Open conditional disposition | Do not count as passed without deterministic fixture or formal exclusion |
| 3C-GATE-EXT-NOTIF-001 | Phase 3B.6B sandbox boundary | Phase 4 gate | External email/SMS delivery is not locally certified; in-app/sandbox proof only |
| 3C-GATE-DEPLOY-RBAC-001 | Deployment boundary | Phase 4 gate | Deployed RBAC must be verified outside local-only certification |
| 3C-GATE-BACKUP-001 | Production operations boundary | Phase 4 gate | Backup/restore and disaster recovery remain launch/operations proof |
| 3C-GATE-REAL-HANDOFF-001 | External finance/provider boundary | Phase 4 gate | Real-tenant payroll handoff and payment/provider submissions require sandbox/staging or approved production rehearsal |

## Tracked Performance Risks

These are separate risks and do not reopen `HRADM-DEF-20261010-028`, which was resolved for `/hr-admin/payroll-handoff`.

| Risk ID | Route | Evidence | Phase 3C action |
| --- | --- | --- | --- |
| 3C-RISK-PERF-001 | `/hr-admin/payroll-providers` | Phase 3B.7A later full performance sample exceeded the 4s budget while handoff stayed under budget | Track in Phase 3C.5 performance-risk batch; open a new defect only if reproduced under controlled 3C conditions |
| 3C-RISK-PERF-002 | `/mss/approvals` | Phase 3B.7A later full performance sample exceeded the 4s budget while handoff stayed under budget | Track in Phase 3C.5 performance-risk batch; open a new defect only if reproduced under controlled 3C conditions |

## Cross-Module Journey Baseline

Total journeys identified: 12.

| Priority | Count | Purpose |
| --- | ---: | --- |
| P0 | 8 | Mandatory launch-critical employee, time, payroll, finance, RBAC, audit and recovery chains |
| P1 | 3 | High-value enterprise depth across bulk import, launch readiness and report reconciliation |
| P2 | 1 | Broad UX/responsive/performance health across already-certified module surfaces |

Journey details are frozen in `docs/qa/12-e2e-journey-matrix.md`.

## Deterministic Fixture Model

Phase 3C execution should use one isolated local QA tenant/database only. Recommended fixture prefix: `PH3C-20261010`.

Minimum data set:

- one tenant with legal entity, branch, location, business unit, department, grade, designation, cost center and employment type;
- HR admin, payroll admin, finance/payroll viewer, manager/MSS approver, ESS employee, tenant admin, support/admin audit persona and restricted/no-access persona where configured;
- at least six employees covering ready payroll, missing-bank payroll blocker, manager/subordinate, document-required, leave-balance, shift-roster and terminated/inactive cases;
- active leave type, leave policy, attendance policy, holiday calendar, shift definition, shift assignment, roster template and rollout;
- attendance records including present, absent, leave-collision, regularization and import-created records;
- approved and rejected leave/regularization workflows;
- salary components, salary structure/version, pay group/calendar, payroll assignments, statutory setup, payroll input snapshots, calculation run, review, final lock, output batch, payslips, register, bank advice, finance handoff and provider delivery rows;
- notification templates/events/delivery settings and in-app queue records;
- audit and import history rows traceable by source hash.

External integrations:

- provider callbacks/retries must use sandboxed or mocked callbacks;
- payment/bank transfer submission must not be real;
- email/SMS must remain sandboxed/in-app in Phase 3C;
- production backup/restore and real-tenant payroll handoff are Phase 4 gates.

## Entry Criteria for Phase 3C.2

- Phase 3C.1 docs accepted as the baseline.
- Current local app build and isolated QA database identified.
- Credentials for HR admin, payroll admin, finance/payroll viewer, manager, employee, tenant admin and restricted/no-access persona confirmed or explicitly marked unavailable.
- Provider/payment/email/SMS sandbox flags confirmed.
- Payroll bank-account readiness gate and two conditional provider scenarios remain explicitly tracked, not silently assumed.
- No Phase 3C test execution has started before baseline signoff.

## Exit Criteria for Phase 3C

- Every P0 journey executed or explicitly blocked with release impact.
- Every mandatory cross-module state transition verified through UI plus API/database/audit evidence where applicable.
- No unresolved P0/P1 tenant isolation, authorization, financial-integrity, workflow-integrity or operational-integrity defect.
- Payroll bank-account decision either approved or recorded as a release blocker/accepted exclusion.
- Conditional provider scenarios dispositioned with owner and release impact.
- Phase 4 gates clearly separated from local certification claims.

## Execution Sequence

| Phase | Scope | Primary journeys | Exit intent |
| --- | --- | --- | --- |
| Phase 3C.2 | Environment and fixture certification | All setup dependencies | Prove isolated tenant, roles, safe data, fixture idempotency and sandbox boundaries |
| Phase 3C.3 | Tenant/org/employee/time integration | E2E-JRN-001, 002, 009 | Certify tenant setup through ESS access, attendance, leave and payroll-input prerequisites |
| Phase 3C.4 | Payroll lifecycle and finance integration | E2E-JRN-003, 004, 005 | Certify complete payroll calculation through output, reports, finance handoff and provider evidence |
| Phase 3C.5 | Workflow, notifications, audit, RBAC, recovery and performance risks | E2E-JRN-006, 007, 008, 010, 012 | Certify cross-module controls, failed operations, retries, audit trails and non-handoff route performance risks |
| Phase 3C.6 | Final cross-module regression and signoff | All P0/P1 journeys | Reconcile execution register, defects, release gates and Phase 4 exclusions |

## Coverage Summary

| Coverage class | Count | Notes |
| --- | ---: | --- |
| Journey scenarios planned in `13-e2e-execution-register.md` | 32 | All initialized as Not Run for current Phase 3C execution |
| Existing automation reused or represented | 24 | Existing Playwright/API/backend suites cover module-level pieces; execution must prove cross-module continuity |
| New E2E specifications required | 8 | Genuine integration gaps where current tests cover modules but not persisted journey continuity |
| P0 scenarios | 22 | Mandatory before local cross-module certification |
| P1 scenarios | 8 | Enterprise-readiness depth and reconciliation |
| P2 scenarios | 2 | UX/performance breadth |

Phase 3C.1 stops here. No Phase 3C.2 execution is started by this document.
