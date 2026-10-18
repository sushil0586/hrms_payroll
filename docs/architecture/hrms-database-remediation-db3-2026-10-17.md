# HRMS/Payroll Database Remediation DB-3

Date: 2026-10-17  
Decision: **CONDITIONAL PASS**

## Risk disposition

| Risk | Disposition | Evidence |
| --- | --- | --- |
| DBR-003 immutable leave ledger | Partial closure | New explicitly governed periods use append-only movements and protected projections. Existing 1,186 unclassified balances and 240 historical transactions remain unchanged and require approved opening-ledger classification. |
| DBR-004 leave year close | Partial closure | Persisted periods, durable/idempotent close runs, per-employee resume items, carry-forward lots, expiry, forfeiture, close/reopen, and retry are implemented. Administrative APIs/UI and scheduled Celery dispatch remain rollout gates. |
| DBR-009 tenant integrity | Reduced for DB-3 relations | PostgreSQL triggers protect period, balance, ledger, close-run, lot, and allocation tenant/policy references. The wider application risk remains open. |
| DBR-011 cross-year requests | Resolved for governed periods | Requests are split into dated reservations and exact period/lot consumption; compatibility tenants retain legacy behavior. |
| DBR-012 carry-forward provenance | Resolved for governed periods | Earliest-expiry lots, partial expiry, exact consumption, and exact pre-expiry reversal are persisted. |
| DBR-013 lifecycle proration | Partial | Existing join-month logic remains. Exit, anniversary, rehire, and transfer conversion require approved policy semantics. |
| DBR-014 assignment temporal integrity | Open | DB-3 snapshots the selected policy in each period but does not retrofit effective dates and overlap constraints onto all assignment records. |
| DBR-018 cross-entity transfer orchestration | Open | Entity-specific period precedence exists; preserve/convert/encash/forfeit transfer decisions are not assumed. |

Database production readiness remains **NO-GO** while historical classification and remaining P0 risks are open.

## Implemented domain

### Persisted periods and close lifecycle

- `LeavePolicyPeriod`: tenant/policy-owned leave-year boundaries with optional legal-entity override, policy snapshot, and planned/open/closed/locked state.
- `LeavePolicyPeriodStatusEvent`: append-only, authorized, tenant-scoped close/reopen/lock audit.
- `LeaveYearCloseRun`: durable idempotency key, queued/running/succeeded/failed state, attempts, counts, request/result/error snapshots.
- `LeaveYearCloseItem`: resumable employee-level outcomes; successful items are not credited twice on retry.

Tenant-wide policy periods act as the default. An applicable legal-entity period takes precedence. Leave periods remain distinct from DB-2 fiscal/accounting periods.

### Immutable ledger and projection

`LeaveBalanceTransaction` now supports:

- opening;
- accrual;
- reservation and release;
- consumption and reversal;
- credit/debit adjustment;
- carry-forward;
- expiry and forfeiture;
- encashment and reversal;
- correction provenance through `source_transaction`.

Each governed movement has a tenant-scoped idempotency key, signed availability delta, effective date, policy period, optional request/close-run source, before/after balance, and evidence metadata.

`LeaveBalance` remains the materialized projection and now stores period, expired/forfeited totals, ledger version, and checksum. PostgreSQL rejects direct projection updates for governed balances. Applied ledger entries and period-status events are append-only.

### Entitlement provenance

- `LeaveEntitlementLot` records granted/remaining units, effective date, expiry, source transaction, and priority.
- Consumption order is earliest expiry, then effective date, then priority.
- `LeaveRequestAllocation` records dated period reservations and exact consumed lot allocations.
- Cancellation restores the exact original lots before expiry.
- Cancellation after expiry is rejected with an actionable requirement for an authorized compensating correction; unrestricted leave is never silently credited.

## Rollover algorithm

1. Lock the close-run command and source balance rows in deterministic employee order.
2. Calculate positive available units from the governed source projection.
3. `carried = min(available, approved cap)`.
4. Append source-period `forfeiture` for `available - carried`.
5. Append target-period `carry_forward` for `carried`.
6. Create separate expiring and base lots using the explicit approved close-run inputs.
7. Persist employee-level success or failure.
8. Retry only failed/pending items; transaction and close-item uniqueness prevent double credit.
9. Block ordinary source-period movements once close is running or succeeded.
10. Permit formal close only after a successful close run.

Carry caps, expiring units, and expiry dates are explicit run inputs and snapshots. DB-3 does not infer an expiry rule that is absent from policy configuration.

## Worked example evidence

The architecture example executed exactly:

```text
Prior available:                     18.00
Forfeiture at source close:          -8.00
Carry-forward into target period:   +10.00
Expiring lot through 2027-06-29:      4.00
Base carry-forward lot:               6.00
Consumption on 2027-05-10:           -6.00
Consumption order: expiring 4, base 2
Expiry on 2027-06-30:                 0.00
Remaining base lot:                   4.00
```

A second scenario consumed only 2 units. The expiry job appended an exact 2-unit expiry movement and left a reconciled 6-unit available balance.

## PostgreSQL and regression evidence

```text
DB-3 focused PostgreSQL scenarios: 12 passed
Integrated leave + DB-1 + DB-2 + DB-3 + focused APIs: 67 passed
Django system check: passed
Migration drift: none
TypeScript: passed
Clean PostgreSQL migration: passed
Rollback leave_management 0007 -> 0005: passed
Reapply leave_management 0005 -> 0007: passed
```

Covered scenarios include:

- calendar-year and April-March periods;
- legal-entity period precedence;
- exact carry cap, split expiry lots, earliest-expiry consumption;
- no-op expiry after full use and partial unused expiry;
- cross-year reservation and consumption in two periods;
- duplicate and concurrent rollover execution;
- worker interruption, durable failure, and safe retry;
- late approval/movement gate after rollover starts;
- audited close/reopen and unauthorized denial;
- exact cancellation restoration and post-expiry correction gate;
- compensating adjustment without source mutation;
- period overlap, projection bypass, append-only, and cross-tenant trigger rejection;
- mid-year policy change preserving period snapshots and prior ledger;
- existing submit, approve, withdraw, cancel, and DB-1 concurrency regressions.

Two existing tests used dates that became Saturdays on 2026-10-17. Their fixtures now use existing deterministic weekday helpers; application behavior was not changed.

## Historical migration safety

`backend/db.sqlite3` was copied to `/tmp` and only the copy was migrated.

```text
Balances before/after:                  1186 / 1186
Transactions before/after:               240 / 240
Audited balance component values equal:  true
Audited transaction values equal:        true
Automatically classified balances:          0
Automatically classified transactions:      0
Periods created from history:                0
Close runs created from history:             0
```

Historical distribution remains 1,167 balances for 2026, 18 for 2027, and 1 for 2028. The integer year alone was not accepted as evidence of calendar boundary, policy version, legal entity, or entitlement provenance.

## Files changed

- `backend/apps/leave_management/models.py`
- `backend/apps/leave_management/services.py`
- `backend/apps/leave_management/year_end_services.py`
- `backend/apps/leave_management/migrations/0006_leave_year_immutable_ledger.py`
- `backend/apps/leave_management/migrations/0007_leave_period_status_audit.py`
- `backend/apps/leave_management/tests.py`
- `backend/apps/iam/permission_catalog.py`
- `backend/tests/test_db3_leave_year_integrity.py`
- `backend/tests/test_phase0_api_smoke.py`

DB-1 and DB-2 files remain part of the same uncommitted remediation stack but are not reattributed to DB-3.

## Exact principal commands

```bash
docker run -d --name hrms-db3-postgres -e POSTGRES_DB=hrms_db3 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 55433:5432 postgres:16
DJANGO_SETTINGS_MODULE=config.settings.base DJANGO_DB_ENGINE=django.db.backends.postgresql POSTGRES_DB=hrms_db3 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55433 ./.venv/bin/pytest -q tests/test_db3_leave_year_integrity.py
DJANGO_SETTINGS_MODULE=config.settings.base DJANGO_DB_ENGINE=django.db.backends.postgresql POSTGRES_DB=hrms_db3 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55433 ./.venv/bin/pytest -q apps/leave_management/tests.py tests/test_db1_write_integrity.py tests/test_db2_fiscal_integrity.py tests/test_db3_leave_year_integrity.py tests/test_phase0_api_smoke.py::test_employee_can_submit_leave_request tests/test_phase0_api_smoke.py::test_employee_can_withdraw_pending_leave_request tests/test_phase0_api_smoke.py::test_employee_can_cancel_approved_leave_directly_when_policy_allows_it tests/test_phase0_api_smoke.py::test_manager_can_approve_pending_leave_and_regularization
./.venv/bin/python manage.py check
./.venv/bin/python manage.py makemigrations --check --dry-run
pnpm --dir web typecheck
```

## Conditions and unresolved decisions

1. Ports 3000 and 8000 were unavailable, so Playwright was not run. No browser PASS is claimed.
2. Period and close-run administration APIs/UI are not yet exposed. Activation must remain a controlled administrative/fixture operation.
3. Celery may safely retry the durable service, but scheduled task registration and operational monitoring are not yet configured.
4. Existing roles are not silently granted `leave.periods.close` or `leave.periods.reopen`; explicit role synchronization and approval are required.
5. Historical opening transactions require a reconciliation/classification report and approval. No synthetic openings were created.
6. Legal-entity transfer must explicitly choose preserve, convert, encash, or forfeit.
7. Exit/rehire and anniversary-cycle proration require approved effective-dated rules.
8. Post-expiry cancellation must specify whether units immediately re-expire or return through an approved correction. Current behavior safely blocks automatic restoration.

## Decision

**DB-3 is CONDITIONALLY PASSED for new explicitly governed leave periods.** The immutable ledger, carry-forward, expiry, cross-year allocation, close/retry, and concurrency controls are verified on PostgreSQL 16. DBR-003 and DBR-004 remain partially open until historical classification, administrative activation surfaces, Celery scheduling, and the listed lifecycle policy decisions are completed.

Database production readiness remains **NO-GO**.
