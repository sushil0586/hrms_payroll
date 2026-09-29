# Finance Manager

Finance Manager is the workspace for payroll payout review, bank advice export, statutory filing evidence, provider delivery status, and finance-close audit proof.

![Finance control center](../assets/screenshots/finance-manager/control-center.png)

## What Finance Can Do

| Area | Purpose | Best next action |
| --- | --- | --- |
| Control Center | See payroll close, payout, provider, statutory, and audit signals in one place. | Start here before approving or exporting finance files. |
| Payments | Review the latest handoff snapshot and export bank advice or payroll register files. | Use when finance needs payout-ready files. |
| Compliance | Open statutory filing status, challan proof, and statutory deductions evidence. | Use before statutory filing or liability confirmation. |
| Audit | Review callback events, retry events, completed jobs, stale jobs, and export audit evidence. | Use when finance or auditors ask how the handoff was produced and delivered. |

## How To Read The Page

The page is built around finance signoff.

- The top metrics show finance exposure: latest net pay, handoff count, bank artifacts, reconciled deliveries, and provider exceptions.
- **Close and payout priorities** is the action queue. Anything marked Review or Blocked should be cleared before final signoff.
- **Latest handoff snapshot** shows which payroll run, bank profile, accounting export, and artifact count are currently in focus.
- **Evidence coverage** gives finance a quick audit posture for provider callbacks, retry events, completed jobs, and stale jobs.

## Common Actions

| Action | Use when | Result |
| --- | --- | --- |
| Export bank advice | The payout file is needed for bank upload or finance review. | Downloads bank advice data. |
| Export filings | Statutory filing rows are needed for compliance review. | Downloads statutory filing status data. |
| Open audit history | Finance needs evidence of exports, callbacks, or handoff activity. | Opens the audit history from the HR Admin reporting area. |
| Open manifest | Finance needs a manifest of handoff evidence. | Downloads or opens handoff manifest evidence. |
| Review receipts | Provider delivery needs reconciliation. | Opens provider filing receipt evidence. |

## Finance Signoff Checklist

Before final approval:

- Confirm the latest payroll run is the intended period.
- Confirm latest net pay matches the payroll review output.
- Export and review bank advice.
- Check provider exceptions are zero or accepted with finance approval.
- Confirm statutory filing evidence is available.
- Confirm audit history has enough evidence for later review.

## Finance decision rules

| Situation | Decision |
| --- | --- |
| Net pay matches payroll output and bank advice | Proceed to payment process. |
| Net pay differs from payroll output | Hold payout and ask payroll to explain or regenerate output. |
| Bank advice row count differs from payroll register | Hold payout until row difference is explained. |
| Provider exception can affect amount, employee, or bank file | Hold payout or escalate. |
| Provider exception is informational and documented | Proceed only after finance owner accepts it. |
| Statutory evidence is missing | Hold statutory filing and ask payroll/compliance owner to regenerate or document exception. |

## Evidence finance should keep

| Evidence | Why it matters |
| --- | --- |
| Payroll register | Reconciles employee rows, earnings, deductions, and net pay. |
| Bank advice | Supports actual payout upload or payment instruction. |
| Handoff manifest | Shows which artifacts were generated and handed over. |
| Provider receipts | Shows delivery or callback status from provider systems. |
| Exception notes | Explains why finance proceeded, held, or escalated. |
| Statutory files | Supports statutory filing, challan, and audit review. |

## Related Pages

- [Finance Task Recipes](task-recipes.md)
- [Payment Handoff](payment-handoff.md)
- [Compliance Evidence](compliance-evidence.md)
- [Audit Evidence](audit-evidence.md)
- [Payroll Handoff](../hr-admin/payroll/payroll-handoff.md)
- [Payroll Outputs](../hr-admin/payroll/payroll-outputs.md)
