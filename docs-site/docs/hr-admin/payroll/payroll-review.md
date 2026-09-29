# Payroll Review

Payroll Review is where exceptions are reviewed and payroll is approved before outputs are generated.

## Purpose

Use this page to make the final HR/payroll decision before publishing outputs.

## Review decision principle

Every exception should have one of these outcomes:

- Fixed at source and recalculated.
- Accepted with a clear note.
- Rejected and returned to the owner.
- Deferred to a documented adjustment or next-cycle correction.

Do not leave severe exceptions unexplained before final approval.

## Page layout

| Section | Meaning |
| --- | --- |
| Review queue | Payroll reviews available for action. |
| Exception register | Items requiring decision. |
| Approval trail | Who submitted, approved, rejected, or locked payroll. |
| Final lock | Whether payroll review is frozen. |

![Payroll Review exception register](../../assets/screenshots/payroll/payroll-review-exceptions.png)

## Exception decision options

| Decision | Meaning |
| --- | --- |
| Approve | Accept the exception and allow payroll to continue. |
| Reject | Send the issue back for correction. |
| Mark reviewed | Acknowledge a non-blocking warning. |

## Buttons and actions

| Button | What it does |
| --- | --- |
| Submit review | Sends payroll for approval. |
| Approve payroll | Approves payroll review. |
| Reject payroll | Returns payroll for correction. |
| Final lock | Prevents further review changes. |
| Generate outputs | Creates payroll output artifacts after approval. |

## Workflow

1. Open Payroll Review.
2. Select the payroll run.
3. Review all exceptions.
4. Add decision notes where needed.
5. Submit review.
6. Approver approves payroll.
7. Lock final review.
8. Generate outputs.

## Approval evidence to keep

| Evidence | Why it matters |
| --- | --- |
| Exception notes | Explains why a warning was accepted. |
| Approver identity | Shows who approved payroll. |
| Approval timestamp | Proves payroll was approved before output publication. |
| Final totals | Confirms gross, deductions, and net pay at approval time. |
| Rejection notes | Shows why payroll was sent back. |

## Common mistakes

- Approving without checking exception register.
- Locking final review too early.
- Not documenting approval rationale.
- Generating outputs before finance review is complete.

## FAQ

### Who should approve payroll?

This depends on company policy. Usually payroll admin prepares, HR or finance approver reviews, and an authorized approver gives final approval.

### What if finance finds an issue after approval?

Do not edit outputs silently. Reopen through the approved correction process, recalculate if required, and regenerate outputs from the corrected run.
