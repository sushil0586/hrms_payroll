# Finance Task Recipes

Use these recipes when you know the finance task but not the exact control.

## On This Page

- [Recipe Index](#recipe-index)
- [Export Bank Advice](#export-bank-advice)
- [Reconcile Bank Advice Against Payroll Register](#reconcile-bank-advice-against-payroll-register)
- [Review Payroll Handoff Before Payout](#review-payroll-handoff-before-payout)
- [Review Statutory Liability Evidence](#review-statutory-liability-evidence)
- [Hold A Payout](#hold-a-payout)
- [Investigate Provider Exceptions](#investigate-provider-exceptions)
- [Prepare Audit Evidence](#prepare-audit-evidence)
- [When To Escalate](#when-to-escalate)
- [Good finance notes](#good-finance-notes)

## Recipe Index

| Need | Start here |
| --- | --- |
| Export payout file | [Export Bank Advice](#export-bank-advice) |
| Reconcile payout against payroll | [Reconcile Bank Advice Against Payroll Register](#reconcile-bank-advice-against-payroll-register) |
| Review handoff before payment | [Review Payroll Handoff Before Payout](#review-payroll-handoff-before-payout) |
| Check statutory evidence | [Review Statutory Liability Evidence](#review-statutory-liability-evidence) |
| Stop payment safely | [Hold A Payout](#hold-a-payout) |
| Investigate provider risk | [Investigate Provider Exceptions](#investigate-provider-exceptions) |
| Prepare close/audit pack | [Prepare Audit Evidence](#prepare-audit-evidence) |

## Export Bank Advice

1. Open **Finance Manager > Control Center**.
2. Confirm the latest payroll run and net pay are correct.
3. Check **Provider exceptions**.
4. Select **Export bank advice**.
5. Open the downloaded file and confirm employee count, amount columns, and bank profile.
6. Store or upload the file according to your company finance process.

Expected result: bank advice is exported only for the final reviewed run and can be reconciled to payroll output.

## Reconcile Bank Advice Against Payroll Register

1. Export **Payroll register**.
2. Export **Bank advice**.
3. Compare payroll run name and period in both files.
4. Compare employee count.
5. Compare total net pay or payout amount.
6. Check employees intentionally held from payout.
7. Record the reconciliation result before bank upload.

Expected result: finance can explain the payable amount, row count, and any approved exclusions before uploading to bank.

## Review Payroll Handoff Before Payout

1. Open **Finance Manager > Payments**.
2. Review payroll run, bank profile, accounting export, and artifact count.
3. Open **Payroll register** to confirm run totals.
4. Open **Bank advice** to confirm payout rows.
5. Open **Exceptions** if the action queue shows blocked or review items.
6. Sign off only after exceptions are explained or cleared.

Expected result: payout proceeds only when run identity, artifacts, bank profile, and exceptions are acceptable.

## Review Statutory Liability Evidence

1. Open **Finance Manager > Compliance**.
2. Export statutory filings.
3. Open challan proof if available.
4. Open statutory deductions for component-level review.
5. Compare liability numbers against payroll review output.
6. Escalate mismatch before filing or payment.

Expected result: statutory evidence is complete enough for filing/payment, or the blocker is documented and escalated.

## Hold A Payout

Use this when finance should not release payment yet.

1. Capture the payroll run, period, and issue.
2. Do not upload the bank advice file.
3. Notify payroll/HR owner with the mismatch or blocker.
4. Ask for corrected output, documented exception, or re-handoff.
5. Re-export finance files after correction.
6. Keep the hold reason with finance close notes.

Expected result: no bank upload happens from a questionable file, and the hold reason is traceable.

## Investigate Provider Exceptions

1. Open **Finance Manager > Control Center**.
2. Find **Provider exceptions** in the action queue.
3. Select **Inspect risk**.
4. Review failed, rejected, or dead-lettered provider records.
5. Confirm whether retry, manual correction, or provider support is needed.
6. Keep evidence before approving finance close.

Expected result: provider risk is either resolved, manually accepted, or escalated before finance signoff.

## Prepare Audit Evidence

1. Open **Finance Manager > Audit**.
2. Check callback, retry, completed job, and stale job counts.
3. Select **Open audit history**.
4. Download or review export audit records.
5. Keep the audit pack reference with finance close notes.

Expected result: finance can later prove which files were generated, reviewed, delivered, and accepted.

## When To Escalate

Escalate to HR Admin or payroll operations when:

- Net pay changed after finance review.
- Bank advice rows do not match payroll output.
- Provider exceptions are blocked or unresolved.
- Statutory files are missing for the payroll run.
- Audit evidence is incomplete or stale jobs remain open.

## Good finance notes

Use short notes that explain the decision:

- "Proceed: bank advice total matches payroll register for September run."
- "Hold: bank advice has 2 fewer rows than payroll register."
- "Escalated: provider receipt missing for statutory filing export."
- "Accepted exception: provider retry succeeded, receipt attached."
