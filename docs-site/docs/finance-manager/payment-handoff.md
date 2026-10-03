# Payment Handoff

Use Payment Handoff to review payout-ready payroll files and bank advice evidence.

![Finance payment handoff](../assets/screenshots/finance-manager/control-center.png)

## On This Page

- [Payment Quick Navigation](#payment-quick-navigation)
- [Page Purpose](#page-purpose)
- [Main Sections](#main-sections)
- [Controls](#controls)
- [Review Checklist](#review-checklist)
- [Reconciliation checklist](#reconciliation-checklist)
- [When not to export or upload bank advice](#when-not-to-export-or-upload-bank-advice)
- [Positive and negative scenarios](#positive-and-negative-scenarios)
- [FAQ](#faq)

## Payment Quick Navigation

| I need to | Start here | Verify before finishing |
| --- | --- | --- |
| Confirm finance has the right payroll run | Latest handoff snapshot | Run name, period, bank profile, accounting profile, artifact count, and status. |
| Export bank advice | **Export bank advice** or **Bank advice** | File belongs to final run, row count is expected, bank format is correct, and total reconciles. |
| Reconcile against payroll | **Payroll register** + **Bank advice** | Same run, same employee population, same payable net total, and holds explained. |
| Check blockers before upload | **Exceptions** | Provider/payout exceptions are zero, resolved, or formally accepted. |
| Decide hold/proceed | [Reconciliation checklist](#reconciliation-checklist) | Decision note explains any difference, hold, exception, or manual process. |

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

## Positive and negative scenarios

| Scenario | Expected result |
| --- | --- |
| Final run, bank profile, artifacts, and totals match | Finance can export bank advice and proceed with payment process. |
| Bank advice total differs from payroll register | Hold payout until payroll explains, regenerates, or documents an approved hold. |
| Employee count differs | Hold payout unless the difference is an approved hold or excluded employee population. |
| Bank profile is missing or wrong | Do not upload; ask payroll operations to regenerate the handoff with the correct profile. |
| Provider exception affects payout data | Hold payout or escalate before bank upload. |
| Old/test/disposable run is selected | Do not use exported files for live payment. |

## FAQ

### Can finance use an old exported bank file?

Avoid it. Re-export from the final handoff so the file matches the latest payroll output and audit evidence.

### What if one employee should be held from payout?

The hold must be approved and documented. Bank advice total should then reconcile to the payable population after that hold.
