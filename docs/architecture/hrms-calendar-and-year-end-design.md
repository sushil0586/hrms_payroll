# HRMS Calendar and Year-End Design

## Decision

The current system does **not** have a production-grade fiscal-year spine. Payroll calendars and periods are real persisted objects, and statutory declarations carry a financial-year code, but fiscal ownership, period close, reopen, and accounting-period controls are not modeled. Financial year and fiscal year should not become separate duplicate concepts: use one `FiscalCalendar`/`FiscalYear` domain and label it “Financial Year” for India.

## Current implementation

| Capability | Actual implementation | Assessment |
| --- | --- | --- |
| Tenant default | `Tenant` has country/timezone; launch accepts `financial_year` | Partial; launch input is not durable calendar governance |
| Legal-entity override | LegalEntity has country/timezone only | Fail |
| Configurable start/end | `PayrollCalendar.period_start_day`; launch seed derives April 1 | Partial; cadence is not fiscal governance |
| Persisted fiscal years | None | Fail |
| India April-March | Launch seeder defaults April 1 | Partial |
| International calendars | Payroll cadence/currency configurable | Partial; no fiscal period model |
| Payroll-to-FY mapping | Free-form config and `_payroll_financial_year_code()` | Fail for integrity |
| Open/close/reopen | None internally | Fail |
| Closed-period posting | Provider may report `PERIOD_CLOSED`; no local gate | Fail |
| Historical reporting | Dates and snapshots permit ad hoc reports | Partial |
| Tax year distinction | Declaration `financial_year_code` string | Partial |
| Overlap protection | Payroll period overlap checked in Python `clean()` | Partial; race-prone |

Evidence: `backend/apps/payroll/models.py:534-607`, `backend/apps/payroll/models.py:1219-1286`, `backend/apps/payroll/models.py:1433-1556`, `backend/apps/payroll/services.py:2590-2598`, `backend/apps/common/tenant_launch/seeders.py:1161-1168`, and `backend/apps/payroll/providers.py:2630-2707`.

## Target model

Extend existing tenant/legal-entity and payroll-period models:

1. `FiscalCalendar`
   - tenant, code, name, start month/day, timezone, country, default flag, status, version.
   - Optional legal-entity ownership; tenant default is explicit.
2. `FiscalYear`
   - calendar, code, start_date, end_date, status (`planned/open/soft_closed/closed/reopened`), version.
   - Unique calendar/code and PostgreSQL exclusion constraint preventing date overlap.
3. `FiscalPeriod`
   - fiscal year, sequence, period type, start/end, posting status, closed/reopened metadata.
   - Monthly periods are explicit rows; adjustments may use a controlled period 13.
4. `FiscalPeriodStatusEvent`
   - append-only action, actor, reason, timestamp, before/after, authorization snapshot.
5. Existing `PayrollPeriod`
   - add `fiscal_period` and optionally `tax_year`; snapshot IDs and boundaries into locked payroll input/calculation.
6. Existing `PayrollFinanceHandoff`
   - add target accounting period and posting/reversal references.

Do not create both `FinancialYear` and `FiscalYear`. A tax year may be a role/relationship to a fiscal year when jurisdictions differ; it is not another free-standing duplicate calendar.

## Lifecycle rules

- A fiscal calendar may be edited only before dependent years/transactions exist. Later changes create a new version effective in a future year.
- Opening requires complete, non-overlapping periods.
- Soft close blocks ordinary posting but permits approved close adjustments.
- Hard close blocks payroll posting, finance handoff, and configuration changes that would alter historical interpretation.
- Reopen requires a dedicated permission, dual approval for financial postings, reason, bounded scope, and immutable audit event.
- March payroll paid in April maps payroll earning/activity to the March fiscal period and cash/payment posting to the actual April accounting period. Both references must be persisted.
- Payroll period, statutory period, tax year, leave year, and accounting period remain distinct concepts connected by explicit FKs/snapshots.
- Historical payroll snapshots retain original fiscal IDs and boundaries even when a future calendar version is introduced.

## Migration strategy

1. Add nullable shadow tables/links without changing runtime behavior.
2. Derive candidate tenant calendars from country, launch inputs, payroll `config_snapshot.financial_year_start`, declarations, and periods.
3. Produce an ambiguity register for malformed FY codes, overlapping periods, conflicting legal-entity calendars, and March/April mappings.
4. Backfill only deterministic rows; require finance approval for ambiguity resolution.
5. Run dual-read reports comparing inferred versus persisted fiscal mapping.
6. Enforce non-null mapping for new payroll runs, then historical rows.
7. Enable close/posting gates only after staging reconciliation and rollback rehearsal.

## Required tests

- India April-March, January-December, and nonstandard fiscal years.
- Leap day, month-end, timezone boundary, and period overlap races.
- March payroll paid in April with separate expense/cash periods.
- Close, unauthorized close, closed posting, approved reopen, re-close.
- Calendar version change with immutable historical payroll.
- Legal-entity override and tenant fallback.
- Tax year different from pay/accounting period.
- Backup/restore retaining period status and audit sequence.

