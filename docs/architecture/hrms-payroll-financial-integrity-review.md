# HRMS Payroll Financial Integrity Review

## Overall assessment

Payroll has strong foundations: effective-dated salary/statutory configuration, locked input snapshots with hashes, calculation attempts and lines, adjustments, settlements, review/approval/final lock, immutable output snapshots, protected artifacts, finance handoffs, provider ledgers, idempotency keys, and durable Celery jobs. The main production risks are the missing fiscal/accounting close model, DB-bypassable immutability, duplicate regular-run protection, and incomplete payment/reversal accounting.

## Control assessment

| Control | Existing evidence | Result |
| --- | --- | --- |
| Period generation | PayrollCalendar and PayrollPeriod with Python overlap validation | Partial; no DB exclusion constraint |
| Pay-group/calendar consistency | `PayrollRun.clean()` and PayGroup validation | Pass through model API; DB bypass risk |
| Input lock | PayrollRun lock plus immutable PayrollInputSnapshot/hash | Pass with DB-bypass caveat |
| Calculation/recalculation | Attempt-number uniqueness and immutable source snapshots | Pass |
| Salary effective dating | Structure versions and employee assignments | Partial; overlap race not DB-protected |
| Retro adjustments | PayrollAdjustment and adjustment-sourced lines | Pass for modeled paths |
| Annual tax | Financial-year code/config driven | Partial; no fiscal FK or annual close object |
| Statutory rules | Packs, slabs, registrations, filing calendars, source hashes | Strong; overlap checks application-level |
| Full and final | Settlement and lines with terminal immutability | Strong; no employment-spell linkage |
| Payslip history | Published artifact snapshots/checksum/retention ref | Strong |
| Finance handoff | Immutable handoff/delivery/callback/retry ledgers | Strong; no internal accounting-period gate |
| Payment batches | Bank-advice artifacts/provider delivery | Partial; no employee payment instruction lifecycle |
| Duplicate run | Tenant/code uniqueness | Fail for same period/pay-group regular run |
| Background retry | Tenant idempotency, locks, bounded retries, stale recovery | Pass |

## Year-end and boundary behavior

- March payroll paid in April is technically calculable because period and pay date are separate. It is not financially complete because expense/tax/cash posting periods are not explicit persisted relationships.
- Annualization derives `financial_year_code` from configuration. Malformed or changed configuration can split one legal tax year across codes.
- Locked payroll inputs protect completed runs from later attendance, employee, salary, or policy edits. This is a significant strength.
- Immutability is enforced by model `save()/full_clean()`. Database bulk updates can bypass it, so it is not yet a hard financial control.
- Provider idempotency and callbacks are mature, but internal accounting-period close and corrective journal relationships are missing.

## Required remediation

P0:

1. Add fiscal/accounting period mapping and close/reopen gates.
2. Add one active regular payroll run per period/pay-group constraint; explicitly classify off-cycle/supplemental runs.
3. Harden terminal payroll/output/handoff invariants at the database/write-permission layer.
4. Make correction flows append reversals and replacement entries rather than mutate accepted financial facts.

P1:

1. Reference fiscal/tax years from declarations and annualization while retaining code snapshots.
2. Add payment batch/instruction/status-event models for bank-level reconciliation.
3. Add daterange exclusion constraints for effective payroll configuration.
4. Link full-and-final settlement to an employment spell and exit event.
5. Persist accounting journal IDs, reversal-of links, posting period, and provider reconciliation state.

## Verification required

- Gross/net/statutory reconciliation over regular, off-cycle, arrears, and final settlement.
- Duplicate creation under concurrent requests.
- Locked snapshot/config mutation attempts through save, bulk update, admin, and raw SQL test harness.
- March earning period/April pay and posting mappings.
- Closed period rejection, authorized reopen, correction in next open period.
- Provider retry/callback replay with no duplicate payment/posting.
- Payslip/artifact checksum and protected access after source configuration edits.
- Cross-tenant run/artifact/handoff relationship rejection.

