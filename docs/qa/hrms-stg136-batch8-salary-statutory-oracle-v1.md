# Batch 8 Salary and Statutory Oracle v1

Date: 2026-10-27\
Version: `STG136-SALARY-ORACLE-1.0`\
Approval status: **Approved for deterministic non-statutory QA only; statutory policy approval absent**

## Scope

This oracle is independent of production payroll calculation helpers. It certifies persisted configuration arithmetic only. It does not approve or assert Indian income tax, PF, ESI, professional tax, LWF, bonus, gratuity, overtime, leave encashment, arrears, or provider rules.

| Case | Jurisdiction/entity | Effective date | Inputs | Independent expected result | Rule source | Status |
|---|---|---|---|---|---|---|
| SAL-OR-001 | Synthetic India entity | 2026-04-01 | Fixed monthly earning INR 55,000; 12 months | Annualized fixed earning INR 660,000 | Arithmetic: `55,000 x 12` | Approved QA case |
| SAL-OR-002 | Synthetic India entity | 2026-04-01 | Annual CTC INR 1,260,000 | Monthly reference amount INR 105,000 | Arithmetic: `1,260,000 / 12` | Approved QA case |
| SAL-OR-003 | Synthetic India entity | 2026-04-01 to 2027-03-31 | One active salary assignment | Exactly one applicable assignment inside the interval; none outside | Effective-date interval identity | Approved QA case |
| SAL-OR-004 | Synthetic India entity | Future date | Current and future non-overlapping assignments | Current date resolves current assignment; future date resolves revision | Effective-date precedence | Draft; not executed in this batch |
| SAL-OR-005 | Not approved | Any | Statutory deduction or employer contribution | No expected amount | Authoritative legal specification required | Blocked |
| SAL-OR-006 | Not approved | Any | Payable-day, LOP, overtime, proration or rounding | No expected amount | Approved tenant payroll policy required | Blocked |

## Reconciliation Rules

- Monetary values use exact decimal arithmetic; binary floating-point is prohibited.
- Configuration identity is tenant, employee, structure version and effective-date range.
- Active assignment ranges must not overlap for one employee.
- A future revision must not alter historical assignment rows or finalized payroll snapshots.
- Gross-to-net, deductions and employer cost are out of scope until component rules and effective-dated legal specifications are approved.

No statutory rate, threshold, ceiling, exemption, rounding convention or payroll formula was inferred.
