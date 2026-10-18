# HRMS/Payroll Database Remediation DB-2

Date: 2026-10-17  
Decision: **CONDITIONAL PASS**

## Scope and risk disposition

DB-2 addressed the fiscal-calendar and accounting-posting findings from the frozen schema risk register.

| Risk | DB-2 disposition | Evidence |
| --- | --- | --- |
| DBR-001 | Resolved for new governed writes | Persisted tenant/entity fiscal calendars, fiscal years, accounting periods, lifecycle events, overlap guards, and payroll mappings. Historical activation remains controlled. |
| DBR-008 | Resolved for governed payroll finance handoffs | Payment-date posting-period mapping, open-period service guard, PostgreSQL write trigger, audited reopen, and bypass regression. |
| DBR-004 | Open | Leave-year close, carry-forward lots, expiry, and immutable leave ledger remain a separate remediation phase. Fiscal calendars do not silently become leave years. |
| DBR-009 | Partially reduced | PostgreSQL tenant-scope triggers now protect the new fiscal/payroll references. The broader cross-tenant FK inventory remains open. |

DBR-003, DBR-004, DBR-009, and DBR-010 remain P0. DBR-001 and DBR-008 are not a claim of database production readiness because historical activation and browser administration are not complete.

## Approved business rules implemented

1. `FiscalCalendar` and `FiscalYear` are the canonical domain. “Financial Year” is the India-facing label, not a duplicate model.
2. Calendar ownership precedence is legal-entity active default, then tenant active default. Statutory/tax periods remain distinct.
3. April-March is represented through configuration for India; no universal April boundary is hardcoded.
4. Earning period uses payroll period end date. Payment/accounting posting uses pay date. A March payroll paid in April therefore retains separate March earning and April payment mappings.
5. Accounting periods may be `planned`, `open`, `soft_closed`, `closed`, or `locked`. Only `open` accepts finance posting.
6. Financial-year close requires every accounting period to be closed or locked.
7. Close/reopen requests require permission, reason, and tenant-scoped idempotency key. Audit events are append-only.
8. Calendar boundary changes after dependent years exist require a new version. Existing payroll mappings and snapshots are not rewritten.
9. Existing records are left unclassified when deterministic evidence is absent.

## Schema and code changes

### Models

- `FiscalCalendar`: versioned tenant or legal-entity definition with explicit boundaries and effective dates.
- `FiscalYear`: persisted start/end and lifecycle state.
- `AccountingPeriod`: explicit boundaries, kind, lifecycle state, and close/reopen metadata.
- `FiscalYearStatusEvent` and `AccountingPeriodStatusEvent`: immutable authorization/audit trail.
- `PayrollPeriod`: optional earning and payment accounting-period references.
- `PayrollRun`: fiscal year, earning/payment periods, and immutable mapping snapshot.
- `PayrollFinanceHandoff`: posting period/date and linked correction/reversal reference.

### Database enforcement

- PostgreSQL overlap triggers for fiscal years and accounting periods, including bulk/raw write paths.
- Audited-transition triggers reject direct financial-year and accounting-period state mutation.
- Append-only event triggers reject audit update/delete.
- Closed-period trigger rejects handoff transition to `transmitted` or `accepted`.
- Tenant-scope triggers protect fiscal year, accounting period, payroll period/run, handoff period, and reversal references.
- Referenced accounting-period boundaries are immutable.

### Services and APIs

- Request-scoped fiscal calendar and accounting-period resolution.
- Transactional, row-locked, idempotent period and financial-year transitions.
- Payroll run creation persists earning/payment mappings and rejects missing governed periods.
- Finance handoff generation resolves the payment-date accounting period.
- Finance handoff transmission locks the handoff and posting period independently and rejects non-open periods.
- Added `finance.periods.close` and `finance.periods.reopen` permissions.

The PostgreSQL endpoint test exposed and fixed one pre-release defect: locking a handoff with a nullable `select_related()` join generated an invalid `FOR UPDATE` query. Lock scope is now restricted to the handoff row before explicitly locking the period row.

## Mandatory scenario results

| Scenario | Result |
| --- | --- |
| India financial-year transition | PASS |
| March earnings paid in April | PASS; March earning and April payment periods persisted separately |
| Calendar-year tenant | PASS |
| Legal-entity calendar override | PASS |
| Duplicate/overlapping year or period | PASS; ORM and PostgreSQL bypass paths rejected |
| Posting in closed period | PASS; service, API, and database bypass rejected |
| Authorized reopen and correction window | PASS; audited and idempotent |
| Unauthorized reopen/close | PASS; permission denied |
| Concurrent close versus posting | PASS; consistent row lock ordering serialized operations |
| Mid-year calendar boundary edit | PASS; rejected after dependent year creation |
| Historical payroll after calendar creation | PASS; mapping remains unchanged |
| Cross-tenant period assignment | PASS; ORM and queryset bypass rejected |
| Migration with ambiguous history | PASS; no automatic classification |

## Historical classification evidence

A copy of `backend/db.sqlite3` was migrated in `/tmp`; the source database was not modified.

```text
payroll_runs: 111
runs_with_fiscal_year: 0
runs_with_earning_period: 0
runs_with_payment_period: 0
payroll_periods_with_earning_period: 0
finance_handoffs: 31
handoffs_with_posting_period: 0
```

This is intentional. No date, country, free-form financial-year code, or launch snapshot was treated as sufficient evidence to classify an existing financial record.

## Verification evidence

```text
PostgreSQL 16 DB-2 integrity suite: 12 passed
Combined DB-1/DB-2 plus finance/API regressions: 24 passed, 3 deprecation warnings
Focused finance handoff closed/reopen/transmit scenario: passed
Full migration on clean PostgreSQL: passed
Rollback payroll 0039 -> 0036: passed
Forward payroll 0036 -> 0039: passed
manage.py check: passed
makemigrations --check --dry-run: no changes
pnpm --dir web typecheck: passed
```

Commands used:

```bash
docker run -d --name hrms-db2-postgres -e POSTGRES_DB=hrms_db2 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16
DJANGO_SETTINGS_MODULE=config.settings.base DJANGO_DB_ENGINE=django.db.backends.postgresql POSTGRES_DB=hrms_db2 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55432 ./.venv/bin/pytest -q tests/test_db2_fiscal_integrity.py
DJANGO_SETTINGS_MODULE=config.settings.base DJANGO_DB_ENGINE=django.db.backends.postgresql POSTGRES_DB=hrms_db2 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55432 ./.venv/bin/pytest -q tests/test_db1_write_integrity.py tests/test_db2_fiscal_integrity.py tests/test_phase0_api_smoke.py::test_hr_admin_payroll_finance_handoff_generate_and_transmit tests/test_phase0_api_smoke.py::test_finance_handoff_viewer_role_cannot_perform_provider_actions tests/test_phase0_api_smoke.py::test_hr_admin_payroll_finance_handoff_requires_published_output_batch tests/test_phase0_api_smoke.py::test_hr_admin_payroll_readiness_uses_tenant_configuration
./.venv/bin/python manage.py check
./.venv/bin/python manage.py makemigrations --check --dry-run
pnpm --dir web typecheck
```

## Files changed for DB-2

- `backend/apps/payroll/models.py`
- `backend/apps/payroll/fiscal_services.py`
- `backend/apps/payroll/services.py`
- `backend/apps/payroll/migrations/0037_payrollfinancehandoff_posting_date_and_more.py`
- `backend/apps/payroll/migrations/0038_fiscal_integrity_triggers.py`
- `backend/apps/payroll/migrations/0039_fiscal_year_transition_guards.py`
- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/iam/permission_catalog.py`
- `backend/tests/test_db2_fiscal_integrity.py`
- `backend/tests/test_phase0_api_smoke.py`

DB-1 files `0035`, `0036`, and `test_db1_write_integrity.py` remain part of the uncommitted remediation stack but are not newly attributed to DB-2.

## Conditions and rollout gates

1. The application stack was unavailable on ports 3000/8000, so targeted Playwright administration coverage was not executed. No browser PASS is claimed.
2. No fiscal-calendar administration API/UI was introduced in DB-2. Activation must remain an approved fixture/administrative operation until those surfaces exist and are certified.
3. Existing tenant roles are not silently granted the new critical close/reopen permissions. Controlled role-catalog synchronization and explicit assignment are required before activation.
4. The 111 historical QA runs and 31 handoffs require a deterministic classification report and finance approval before any backfill.
5. Correction/reversal execution remains subject to the existing finance workflow; the schema now records `reversal_of`, but a full next-open-period correction workflow is a future acceptance gate.
6. Remaining P0 risks DBR-003, DBR-004, DBR-009, and DBR-010 must be closed or formally accepted before database production readiness.

## Decision

**DB-2 is CONDITIONALLY PASSED for the implemented fiscal/calendar and accounting-posting scope.** New governed payroll writes have deterministic period mapping and closed-period posting protection at service and database layers. Production/database readiness remains **NO-GO** pending the listed gates and remaining P0 remediation.
