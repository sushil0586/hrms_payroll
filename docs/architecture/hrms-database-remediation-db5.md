# HRMS/Payroll Database Remediation DB-5

Date: 2026-10-17  
Decision: **CONDITIONAL PASS**  
Database production readiness: **NO-GO**

## Scope and outcome

DB-5 adds a canonical effective-dated employment timeline and integrates it with movement processing plus leave and attendance policy resolution. It hardens concurrent salary, pay-group and statutory assignment writes, preserves immutable payroll/finance snapshots, exposes a read-only classification API, and adds compact effective-date controls for leave and attendance assignments.

All execution used disposable PostgreSQL 16 databases and synthetic Playwright tenants. No Northstar, staging, production, customer, or shared certification data was modified.

## Risk disposition

| Risk | Status | Outcome |
|---|---|---|
| DBR-014 | Partial | Dated policy assignments, business-date resolution and race-safe exact-scope overlap guards implemented; legacy NULL ranges remain unclassified. |
| DBR-016 | Partial | Canonical `EmploymentSpell`/`EmploymentAssignment` and movement linkage implemented; existing ambiguous employee histories are not backfilled. |
| DBR-017 | Partial | Multiple spells are representable, but exit remains OneToOne and rehire continuity policy/workflow is unapproved. |
| DBR-018 | Controlled blocker | Cross-entity completion fails atomically before mutation pending approved leave/payroll/statutory/fiscal/continuity rules. |
| DBR-019 | Partial | Active salary, pay-group and statutory employee ranges are race-safe; remaining version/slab/pack classes need separate measured constraints. |

No DB-5 P0 risk required an unapproved decision. The unresolved lifecycle risks are P1, are fail-closed, and prevent a full pass.

## Implemented architecture

- `EmploymentSpell` separates stable employee identity from each contract/service period.
- `EmploymentAssignment` versions legal entity, branch, location, department, business unit, cost center, designation, grade, employment type and reporting manager.
- New complete employee creates initialize spell/assignment atomically from the approved create request.
- Completed same-entity movement locks movement, employee and current assignment, closes the old range, creates the new version and links it idempotently.
- Future movements create a planned version without prematurely changing the current `Employee` projection.
- PostgreSQL triggers reject overlap and cross-tenant organization/manager references through ORM create, bulk operations and raw SQL.
- Transaction advisory locks make range validation safe under concurrent inserts.
- Leave and attendance policy assignments carry effective windows and resolve against employment scope on the actual business date.
- Legacy fallback is explicit (`legacy_employee_projection`); no migration guesses historical state.
- Historical classification is tenant-scoped and read-only.

Supporting matrices:

- `docs/architecture/hrms-db5-effective-date-relationship-matrix.md`
- `docs/architecture/hrms-db5-lifecycle-transition-matrix.md`
- `docs/architecture/hrms-db5-historical-classification-report.md`
- `docs/architecture/hrms-db5-impact-matrix.md`

## Source changes

### Backend and schema

- `backend/apps/employee_lifecycle/models.py`
- `backend/apps/employee_lifecycle/effective_services.py`
- `backend/apps/employee_lifecycle/migrations/0002_employmentassignment_and_more.py`
- `backend/apps/employee_lifecycle/migrations/0003_db5_effective_date_integrity_guards.py`
- `backend/apps/leave_management/models.py`, `services.py`, migrations `0009`/`0010`
- `backend/apps/attendance/models.py`, `services.py`, migrations `0009`/`0010`
- `backend/apps/common/api_serializers.py`, `api_views.py`, `api_urls.py`

### Frontend and tests

- Leave and attendance policy assignment form values/forms and leave CSV import workbench
- `web/src/lib/types.ts`
- `backend/tests/test_db5_effective_employment_integrity.py`
- `backend/tests/test_phase0_api_smoke.py`
- `web/tests/e2e/db5-effective-policy-transition.spec.ts`

## Correctness and compatibility

The same synthetic employee resolves the old department policy on 2026-06-30 and the transferred department policy on 2026-07-01 for both leave and attendance. A future movement retains the old current projection until its effective date. Concurrent identical assignment inserts produce exactly one commit. Cross-tenant legal entity and organization references are rejected at the database boundary.

DB-1 through DB-4B protections remain intact: the integrated PostgreSQL run passed 56 tests. Existing payroll calculations, posted rows, payslip artifacts, accounting periods, leave ledgers, legal holds and retention controls were not changed.

## Required policy decisions and remaining work

1. Approve cross-legal-entity treatment for leave balances, carry-forward lots, payroll split/FnF, statutory registrations, tenure continuity, fiscal calendars and finance mappings.
2. Approve exit-to-spell linkage and same/new-entity rehire continuity; then replace the OneToOne exit operational limitation additively.
3. Approve a governed retroactive-correction workflow. The schema supports correction links, but ordinary same-day replacement remains blocked.
4. Classify legacy employment and policy histories from attributable evidence. Do not infer dates from mutable current rows.
5. Extend race-safe effective-range protection to payroll versions, slabs and statutory packs only after overlap preflight and compatibility review.
6. Implement monthly attendance-close governance (DBR-015) before certifying late corrections after payroll close.

## Verification

- PostgreSQL DB-5 focused scenarios: passed, including real two-connection concurrency.
- DB-1 through DB-5 integrated regression: **56 passed**.
- Neighboring movement API: **1 passed**.
- Production-built Playwright effective policy flow: **1 passed**, with no HTTP 5xx before workflow completion.
- Leave-viewer API/RBAC neighbor: **1 passed**; leave-type listing remained available and unauthorized mutations remained denied.
- Migration forward/rollback/reapply: passed.
- Django checks and migration drift: passed.
- TypeScript and targeted ESLint: passed.
- Next.js production build: passed with the existing Autoprefixer warning.
- Synthetic historical classification and cleanup: passed; no residual tenant.

Detailed command and failure/rerun history is retained in `docs/qa/evidence/db5-2026-10-17/001-db5-execution-evidence.md`.

## Decision

DB-5 is a **CONDITIONAL PASS**. The implemented same-entity, effective-dated path is protected and evidenced end to end. Full DB-5 closure is blocked by approved business-policy decisions for rehire, exit continuity, retroactive correction and cross-legal-entity transfer, plus controlled classification of legacy records. Database production readiness remains **NO-GO**.
