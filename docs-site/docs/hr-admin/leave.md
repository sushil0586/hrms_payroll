# Leave

Leave manages balances, leave transactions, leave requests, carry-forward, expiry, and payroll-related leave evidence.

## Purpose

Use Leave to keep employee leave balances accurate and to resolve leave items that affect payroll.

## Use this page when

- A leave balance needs correction.
- Leave transactions are pending approval.
- Carry-forward or expiry must be applied.
- Payroll readiness shows leave blockers.
- Employee balance history needs review.

## Page sections

| Section | Meaning |
| --- | --- |
| Balance summary | Current balance by employee and leave policy. |
| Transactions | Credits, debits, corrections, carry-forward, expiry, and approvals. |
| Action form | Manual balance action for controlled corrections. |
| Import area | Bulk leave balance updates through CSV. |
| Approval queue | Pending balance transactions requiring action. |

![Leave balance operations](../assets/screenshots/hr-admin/leave-balances.png)

## Leave statuses and transaction states

| Status | Meaning | Typical action |
| --- | --- | --- |
| Pending | Leave request or balance transaction is waiting for approval. | Approve or reject before payroll lock. |
| Approved | Leave is accepted and can affect balance/payroll. | Confirm payable-day impact. |
| Rejected | Leave request was not accepted. | Ensure reason is clear. |
| Cancelled | Request was withdrawn or cancelled. | Confirm it no longer affects payroll. |
| Credited | Balance was added. | Check reason and policy. |
| Debited | Balance was reduced. | Confirm linked leave or correction. |
| Expired | Balance was removed by expiry. | Confirm expiry policy. |
| Carried forward | Balance moved to next period. | Check carry-forward cap. |

## Common actions

| Action | Meaning |
| --- | --- |
| Credit | Add leave balance. |
| Debit | Reduce leave balance. |
| Correction | Fix an incorrect balance. |
| Carry forward | Move eligible balance to next period. |
| Expiry | Remove balance after policy expiry. |

## When to use manual balance actions

Manual actions should be controlled and explainable.

| Situation | Use manual action? | Note |
| --- | --- | --- |
| One employee balance imported incorrectly | Yes | Use correction with reason. |
| Policy accrual is wrong for many employees | No | Fix policy or assignment first. |
| Carry-forward needs year-end processing | Yes, if policy supports it | Keep evidence of cap and period. |
| Payroll needs LWP correction | Yes, if approved | Add notes and confirm payroll impact. |
| Repeated monthly manual corrections | No | This usually means setup is wrong. |

## Buttons

| Button | What it does |
| --- | --- |
| Apply action | Applies one manual balance transaction. |
| Preview import | Validates imported leave rows. |
| Commit ready rows | Saves valid imported rows. |
| Approve | Approves a pending transaction. |
| Reject | Rejects a pending transaction with reason. |

## Payroll impact

Leave can affect:

- Payable days.
- Leave without pay.
- Salary deduction.
- Leave encashment.
- Carry-forward and expiry reporting.
- Full-and-final settlement.

Before payroll inputs are locked, pending leave requests and pending balance transactions should be closed or explicitly accepted as not affecting payroll.

## Month-end leave checklist

| Check | Expected result |
| --- | --- |
| Pending leave in payroll period | Approved, rejected, or documented as not payroll-impacting. |
| LWP / unpaid leave | Reflected correctly for payroll. |
| Balance corrections | Approved with reason. |
| Carry-forward / expiry | Completed only for the correct policy period. |
| Repeated corrections | Investigated as policy or assignment issue. |
| Payroll Control | No leave blockers remain. |

## Good practice

- Use manual correction only when the reason is clear.
- Do not repeatedly correct balances manually when the policy itself is wrong.
- Keep notes clear because leave corrections may affect payroll and audit.

## FAQ

### Why does leave affect payroll?

Approved unpaid leave, absent days, encashment, and settlement can change payable days and net pay.

### Can leave be approved after payroll inputs are locked?

It can be approved operationally, but the locked payroll run may not reflect it. Follow the payroll correction or rerun process if it changes pay.

### What should I do if many employees have wrong balances?

Check leave policy, accrual rules, assignments, and import source. Avoid fixing many employees manually unless the root cause is understood.

### Should rejected leave have notes?

Yes. Clear rejection notes reduce employee confusion and future support requests.
