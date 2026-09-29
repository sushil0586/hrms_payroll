# Troubleshooting

This page explains common issues and what to check first.

Use this page for a quick diagnosis. For detailed steps, open the focused troubleshooting pages:

- [Payroll Issues](payroll.md)
- [Access Issues](access.md)
- [Notification Issues](notifications.md)
- [Document Issues](documents.md)

If the issue is a status or term you do not understand, start with the [Glossary and Status Guide](../glossary.md).

## First Questions to Ask

| Question | Why it matters |
| --- | --- |
| Which workspace is affected? | The fix may belong to Tenant Admin, HR Admin, ESS, MSS, Finance Manager, or Platform Admin. |
| Is the issue for one user or many users? | One user usually means access/data issue. Many users can mean setup, provider, or plan issue. |
| Did this work before? | Recent setup, role, payroll, or provider changes may explain the issue. |
| Is there a blocker, warning, or failed status on screen? | The status usually identifies the owning page. |
| Is the record locked? | Locked payroll and completed workflow records may require a new version or adjustment. |

## I logged in but see Workspace Access

This means your account is active but HRMS cannot find a workspace route.

Ask an admin to check:

- Your tenant membership is active.
- A role is assigned.
- The role has permission for the required workspace.
- Your employee profile is linked if you need ESS or MSS.

## I cannot see a menu item

Menu items are permission controlled.

Ask an admin to check:

- Your assigned role.
- Permission keys attached to that role.
- Whether the feature is included in the tenant plan.

## A button is disabled

A disabled button usually means a required condition is not complete.

Common examples:

- No rows are selected.
- Required form fields are missing.
- The record is locked.
- You do not have manage permission.
- A workflow is already completed.

## Payroll cannot move forward

Check Payroll Control first.

Common blockers:

- Missing bank account.
- Missing legal entity, branch, or department.
- Missing salary assignment.
- Attendance or leave pending approval.
- Statutory setup incomplete.
- Inputs not locked.

Read [Payroll Issues](payroll.md) for detailed fixes.

## Notification delivery failed

Check Notification Delivery and Notification Queue.

Common causes:

- SMTP provider issue.
- Recipient email missing or invalid.
- Retry limit reached.
- Channel disabled.
- Template or event configuration incomplete.

Read [Notification Issues](notifications.md) for detailed fixes.

## Document rejected

Open the document review or ESS document page and read the rejection reason.

Common causes:

- Wrong document uploaded.
- File is unreadable.
- Expiry date missing.
- Name or identifier does not match employee record.

Read [Document Issues](documents.md) for detailed fixes.

## What to Include When Asking for Help

Send these details to an admin or support owner:

- Workspace and page name.
- Employee, payroll run, notification, or document reference.
- Exact status shown on screen.
- Action you were trying to perform.
- Error message or blocker text.
- Whether the issue affects one user or multiple users.
- Time when the issue happened.
- Screenshot if it does not contain sensitive information.
