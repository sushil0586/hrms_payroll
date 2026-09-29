# Payment Handoff

Use Payment Handoff to review payout-ready payroll files and bank advice evidence.

![Finance payment handoff](../assets/screenshots/finance-manager/control-center.png)

## Page Purpose

Payment Handoff helps finance confirm that payroll output is ready to move into the payment process.

## Main Sections

| Section | What it shows | How to use it |
| --- | --- | --- |
| Latest net pay | Total net pay from the latest payroll output. | Compare with payroll review totals. |
| Handoffs | Number of finance handoffs and accepted handoffs. | Confirm the handoff exists and has been accepted when required. |
| Bank artifacts | Finance output files generated for payment. | Confirm bank advice is available before payout. |
| Latest handoff snapshot | Payroll run, bank file profile, accounting export profile, and artifact count. | Validate the selected payroll run before exporting files. |

## Controls

| Control | Purpose |
| --- | --- |
| Export bank advice | Download payout-ready bank advice data. |
| Payroll register | Download the payroll register for finance reconciliation. |
| Bank advice | Open the bank advice export. |
| Exceptions | Open handoff exceptions that may block finance close. |

## Review Checklist

- Payroll run name matches the intended payroll period.
- Bank profile is present.
- Accounting export profile is present if finance accounting export is required.
- Artifact count is greater than zero.
- Bank advice totals match latest net pay.
- No unresolved provider exception blocks payout.

## Reconciliation checklist

| Check | Expected result |
| --- | --- |
| Run identity | Payroll register, bank advice, and handoff snapshot show the same run and period. |
| Employee count | Bank advice row count matches expected payable employees. |
| Net pay | Bank advice total matches latest net pay after approved holds. |
| Bank profile | Format and bank profile match the company payout process. |
| Accounting profile | Accounting export is present if finance posting is required. |
| Exceptions | Blockers are zero or have accepted finance notes. |

## When not to export or upload bank advice

- Latest handoff is not the intended payroll period.
- Payroll output totals changed after finance review.
- Bank profile is blank or wrong.
- Employee row count is unexpectedly different.
- Provider exception affects payout data.
- You are looking at a test or disposable run.

## FAQ

### Can finance use an old exported bank file?

Avoid it. Re-export from the final handoff so the file matches the latest payroll output and audit evidence.

### What if one employee should be held from payout?

The hold must be approved and documented. Bank advice total should then reconcile to the payable population after that hold.
