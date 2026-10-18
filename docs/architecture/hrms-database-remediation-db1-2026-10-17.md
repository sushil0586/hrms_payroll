# HRMS/Payroll Database Remediation DB-1

Date: 2026-10-17  
Environment: isolated local Docker PostgreSQL 16 and a disposable copy of the local SQLite QA database  
Decision: **CONDITIONAL**

DB-1 closes the targeted critical write-concurrency and payroll immutability risks. It does not certify the database for production: six broader P0 architecture findings remain, and multi-year calendar/year-end regression has not started.

## P0 disposition

| Risk | Result | Evidence / disposition |
| --- | --- | --- |
| DBR-002 leave balance concurrency | Closed for current mutable projection | All reserve, release, consume, reversal, and direct admin adjustment paths lock the balance inside an atomic transaction. Concurrent 6-unit reservations against 10 units produced one success, one insufficient-balance result, and a final 6 reserved / 4 available balance. |
| DBR-005 workflow concurrency/idempotency | Closed | Workflow instance and active step are locked in a single transaction. Identical terminal replay is idempotent; a conflicting replay is rejected. Leave requests and attendance regularizations lock their owner rows before downstream effects. Concurrent approve/reject produced exactly one decision and one action log. |
| DBR-006 payroll terminal immutability | Closed for identified terminal models | PostgreSQL triggers protect locked input snapshots, applied/voided adjustments and settlements, locked reviews, published batches/artifacts, accepted finance handoffs, reconciled deliveries, and approved/locked payroll runs. QuerySet update and raw SQL bypass attempts fail. An approved run permits only the valid transition to locked. |
| DBR-007 duplicate regular payroll runs | Closed for new explicitly classified runs | Added `run_kind` and conditional uniqueness for active regular runs by tenant, period, and normalized pay-group scope. Cancelled replacement and multiple supplementary runs remain valid. Concurrent create produced one success and one uniqueness conflict. |
| DBR-001 fiscal calendar | Open | Requires the calendar/year-end design phase. |
| DBR-003 immutable leave ledger | Open | Current balance projection is now serialized, but complete accrual/reservation/consumption/reversal ledger reconstruction remains required. |
| DBR-004 leave year close | Open | Requires persisted periods, close runs, carry-forward lots, and expiry processing. |
| DBR-008 accounting periods | Open | Finance handoffs still need internal period mapping and closed-period posting gates. |
| DBR-009 cross-tenant FK constraints | Open | API/service scoping remains in place; database-level composite ownership constraints require the separately planned schema phase. |
| DBR-010 retention/deletion | Open | Terminal payroll triggers prevent deletion of protected rows, but the complete archive, legal hold, and authorized purge model is not implemented. |

## Root causes and changes

### Leave and workflow

- `backend/apps/leave_management/services.py`
  - Added request-scoped `SELECT FOR UPDATE` balance locking.
  - Added an atomic post-lock insufficient-balance check to prevent concurrent over-allocation.
  - Made direct balance administration atomic.
  - Locked leave request rows for approve, reject, withdraw, and cancel operations.
  - Made same-result decision retries idempotent and conflicting terminal decisions explicit validation failures.
- `backend/apps/workflows/services.py`
  - Added one transaction boundary around workflow resolution.
  - Locked the workflow instance, current step, and next step in deterministic order.
  - Prevented duplicate action logs and conflicting terminal outcomes.
- `backend/apps/attendance/services.py`
  - Locked regularization and attendance rows before applying a decision.
  - Added idempotent same-result replay and conflict rejection.

### Payroll

- `backend/apps/payroll/models.py`
  - Added `PayrollRunKind`: regular, supplementary, off-cycle, and correction.
  - Added conditional unique constraints for active regular runs with and without a pay group.
- `backend/apps/payroll/migrations/0035_payrollrun_run_kind_and_more.py`
  - Adds `run_kind` as nullable without a migration default, creates constraints, then establishes the application default.
  - This deliberately preserves ambiguous historical records as unclassified rather than guessing their business meaning.
- `backend/apps/payroll/migrations/0036_terminal_financial_row_guards.py`
  - Adds PostgreSQL terminal-row mutation triggers for nine financial tables.
  - Guards apply to ORM saves, QuerySet updates, bulk operations, raw SQL updates, and deletes.
- `backend/apps/common/api_serializers.py`, `backend/apps/common/api_views.py`
  - Expose optional `run_kind` without breaking existing clients; omitted values default to regular.
  - Return a deterministic conflict response for database-level concurrent duplicate creation.
- `backend/tests/test_db1_write_integrity.py`
  - Adds eight deterministic integrity tests, including four PostgreSQL-only lock/trigger concurrency tests.

## Historical-data preflight

The existing local QA SQLite database contains 111 payroll runs. A read-only scan found three active duplicate scopes containing 110 runs:

- `northstar-foods / p100local_p5-sep-2026 / pw-test-staging-launch-pay-group`: 9
- `northstar-foods / pw-test-staging-launch-period / no pay group`: 53
- `northstar-foods / pw-test-staging-launch-period / pw-test-staging-launch-pay-group`: 48

No row was deleted, merged, reclassified, or updated. Migration was tested against a disposable database copy: all 111 historical runs remained `run_kind = NULL`, all three duplicate scopes remained present, and the migration completed. Classification requires an explicit business/data-owner decision before those records can participate in regular-run uniqueness.

## Verification

### PostgreSQL integrity and lifecycle

```text
pytest tests/test_db1_write_integrity.py
8 passed

pytest tests/test_db1_write_integrity.py \
  test_phase0_api_smoke.py::test_hr_admin_payroll_review_approves_and_final_locks_run \
  test_phase0_api_smoke.py::test_hr_admin_payroll_finance_handoff_generate_and_transmit
10 passed, 3 deprecation warnings
```

Validated behavior:

- Two simultaneous leave reservations cannot over-allocate a balance.
- Approve-versus-reject race permits one terminal decision only.
- Duplicate decision retry does not create a second action log.
- Concurrent regular payroll creation permits one active run only.
- Supplementary runs and cancelled-run replacement remain valid.
- Locked run mutation fails through QuerySet update and raw SQL.
- Approved payroll business-field mutation fails; final lock succeeds.
- Real payroll review, final lock, publication prerequisites, and finance handoff remain functional.

### Migration compatibility

```text
python manage.py migrate --noinput
python manage.py makemigrations --check --dry-run
python manage.py migrate payroll 0034 --noinput
python manage.py migrate payroll --noinput
```

Results: clean forward migration, clean reverse to 0034, clean reapply, no model drift, and nine installed terminal guards.

### Focused regression

```text
pytest test_phase0_api_smoke.py::{manager approval,leave submit,withdraw,cancel,payroll input lock,payroll final lock,finance handoff}
```

Result: 6 passed and 1 unrelated date-sensitive fixture failure. On 2026-10-17, the direct-cancellation fixture selected `today + 28 days` (2026-11-14), a non-working day, and correctly received the existing “no working leave days” validation. No DB-1 behavior caused the failure. The critical PostgreSQL subset was rerun separately and passed 4/4 before the final 10/10 run.

```text
pnpm --dir web typecheck
```

Result: passed.

## Exact environment commands

The PostgreSQL tests used a disposable `postgres:16` container on local port 55432 with `DJANGO_SETTINGS_MODULE=config.settings.base`, database `hrms_db1_final`, and pytest `transaction=True`. The container and disposable legacy database copy were removed after verification. No production, staging, shared customer, or Northstar records were changed.

## Remaining gates

1. Obtain a business-owner classification for the 111 unclassified historical QA payroll runs before enforcing uniqueness on legacy data.
2. Implement DBR-001, DBR-003, DBR-004, DBR-008, DBR-009, and DBR-010 in their planned phases.
3. Add full immutable leave-ledger reconstruction and reconciliation before year-end processing.
4. Complete multi-year, fiscal-period, carry-forward, reversal, retention, and restore regression.
5. Rerun the date-sensitive leave cancellation scenario with deterministic working-day fixture data; no product change is indicated.

DB-1 is therefore **CONDITIONAL**: the scoped critical concurrency and financial write barriers pass on PostgreSQL, but the database is not production-ready while the remaining P0 architecture risks and multi-year gates are open.
