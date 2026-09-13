# Payroll Finance Manager User Guide

Date: 2026-09-13

## Purpose

The Payroll Finance Manager owns payroll payment readiness, bank advice validation, finance handoff, statutory payment readiness, and payroll report reconciliation. This role checks that approved payroll numbers can safely move to payment, accounting, and compliance processes.

## Main Workspace

- Payroll handoff: `/hr-admin/payroll-handoff`
- Report catalog: `/hr-admin/reports`
- Payroll register report: `/hr-admin/reports/payroll-register`
- Bank advice report: `/hr-admin/reports/bank-advice`
- Finance exceptions report: `/hr-admin/reports/finance-handoff-exceptions`
- Export audit report: `/hr-admin/reports/export-audits`

## What The Payroll Finance Manager Can Do

- Review payroll totals after HR approval.
- Validate bank advice totals, payment counts, and missing bank exceptions.
- Review statutory and deduction totals.
- Export finance handoff reports.
- Confirm report export audit entries and source hashes.
- Review provider filing or payment evidence where available.
- Mark finance readiness after reconciliation.

## What This Role Should Not Do

- Do not edit employee HR profile data unless separately assigned HR Admin permissions.
- Do not publish payslips before payroll approval.
- Do not release payment files if unresolved exceptions remain.
- Do not manually alter exported files without recording the reason and keeping original evidence.

## First Login Checklist

1. Open report catalog.
2. Confirm finance/payroll reports are visible.
3. Open payroll register.
4. Open bank advice.
5. Open finance handoff exceptions.
6. Open export audit history.
7. Confirm each page loads live data and no placeholder fallback is shown.

## Payroll Register Review

1. Select pay period.
2. Select legal entity or pay group if available.
3. Confirm employee count.
4. Confirm gross pay.
5. Confirm deductions.
6. Confirm employer contributions.
7. Confirm net pay.
8. Use pagination to review rows across the dataset.
9. Export only after filters are correct.
10. Compare exported totals with on-screen totals.

## Bank Advice Review

1. Open Bank Advice.
2. Confirm pay period and bank/payment batch.
3. Review payable employee count.
4. Review total net pay.
5. Check for missing bank account, invalid IFSC, hold salary, or blocked employee cases.
6. Download/export only when exceptions are cleared or accepted.
7. Record export audit reference.

## Finance Handoff Workflow

1. Confirm HR has completed payroll review.
2. Open handoff workspace.
3. Review payroll totals.
4. Review exception summary.
5. Open export audit to confirm report evidence.
6. Download payroll register, bank advice, and statutory summary.
7. Confirm totals match.
8. Mark handoff ready only when exceptions are resolved or formally accepted.

## Compliance And Statutory Review

For statutory/TDS reports:

1. Confirm the report period.
2. Confirm employee coverage.
3. Check taxable earnings and deduction totals.
4. Check statutory deduction totals.
5. Confirm filing calendar due dates if available.
6. Export report and verify export audit entry.
7. Keep the source hash with the finance/compliance evidence pack.

## Export Audit Verification

Use export audit history to prove:

- Who exported a report.
- Which report was exported.
- Which filters were used.
- When it was exported.
- Whether source hash/checksum exists.
- Whether the export can be traced back to the source data.

## Common Issues

| Issue | What to check |
| --- | --- |
| Bank advice total does not match payroll register | Filters, employee hold status, payment eligibility |
| Export audit missing | Export did not complete, API failure, report not audit-enabled |
| Missing bank details | Employee bank setup and validation |
| Compliance report has zero rows | Statutory artifacts or payroll calculation data may not exist for the period |
| Finance handoff blocked | Open exceptions, unapproved payroll, missing report evidence |

## Completion Criteria

Finance signoff is complete when:

- Payroll register totals are reviewed.
- Bank advice is reviewed.
- Exceptions are cleared or formally accepted.
- Required exports are generated.
- Export audit evidence exists.
- Finance handoff status is updated.

