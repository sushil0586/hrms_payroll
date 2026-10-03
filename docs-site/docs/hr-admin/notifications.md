# HR Admin Notifications

Use **Notifications** to confirm that HRMS messages are triggered, delivered, retried, reviewed, and audited correctly.

Notifications matter because many HRMS workflows depend on timely communication:

- New users must receive invite and password setup emails.
- Employees must know when leave, attendance, documents, tax declarations, and payslips need action.
- Managers must receive approval tasks.
- HR, payroll, and finance users must see blockers and close actions.
- Failed delivery must be visible before it becomes a support issue.

## What Notifications Owns

| Area | What it controls | Example |
| --- | --- | --- |
| Events | Business actions that create notifications. | Leave request submitted. |
| Templates | Subject/body/channel content. | `Your leave request was approved`. |
| Queue | Individual notification records. | Email to `aditi.gupta1789@gmail.com`. |
| Delivery status | Pending, delivered, failed, read, retry-capped. | Email failed due SMTP issue. |
| Channel health | Email, in-app, push, SMS, or configured provider status. | Email has 2 retry-capped records. |
| Retry and review | Manual triage, retry, hold, or escalation. | Retry after SMTP credentials fixed. |
| Evidence | Audit trail for what was sent and what happened. | Template, recipient, attempt count, latest failure. |

![Notification queue filters and summary](../assets/screenshots/hr-admin/notifications-queue.png)

![Notification delivery channel health](../assets/screenshots/hr-admin/notification-delivery-health.png)

## Use This Page When

- A user says they did not receive an email.
- Invite or password reset emails need verification.
- Manager did not receive approval alert.
- Employee did not receive rejection or status update.
- Payslip, payroll, or finance handoff notification must be proven.
- Notification Delivery shows failed, retry-ready, or retry-capped messages.
- A template needs correction.
- A new workflow needs event-based communication.
- Final signoff needs delivery evidence.

## Must-Test Notification Matrix

Use this matrix before public launch or stage signoff.

| Business event | Recipient | Channel | Why it matters | Expected result |
| --- | --- | --- | --- | --- |
| New tenant admin invite | Tenant Admin | Email | User cannot set up account without it. | Setup link email received. |
| New HR Admin invite | HR Admin | Email | HR cannot operate workspace. | Setup link email received. |
| New employee invite | Employee | Email | Employee cannot access ESS. | Setup link email received. |
| Password reset requested | Requesting user | Email | User is blocked from login. | Reset link email received. |
| Leave request submitted | Manager | Email and/or in-app | Manager must approve. | Approval alert visible. |
| Leave approved | Employee | Email and/or in-app | Employee needs status confirmation. | Approval update visible. |
| Leave rejected | Employee | Email and/or in-app | Employee needs reason. | Rejection reason visible. |
| Attendance correction submitted | Manager | Email and/or in-app | Manager must approve. | Approval alert visible. |
| Attendance approved/rejected | Employee | Email and/or in-app | Employee needs status confirmation. | Status update visible. |
| Document rejected | Employee | Email and/or in-app | Employee must upload correction. | Correction reason visible. |
| Tax declaration/proof rejected | Employee | Email and/or in-app | Employee must correct before TDS/payroll. | Correction reason visible. |
| Payslip published | Employee | Email and/or in-app | Employee must know payslip is available. | Payslip alert visible. |
| Payroll review requested | Payroll/HR approver | Email and/or in-app | Payroll close can be delayed. | Review alert visible. |
| Payroll handoff completed | Finance Manager | Email and/or in-app | Finance needs payout/register evidence. | Handoff alert visible. |
| Launch blocker assigned | HR/Admin owner | In-app and optionally email | Go-live blocker needs action. | Owner alert visible. |

If any high-impact notification fails, do not rely on “maybe it will arrive later.” Check queue status and channel health.

## Notification Areas

| Area | Purpose | When to use |
| --- | --- | --- |
| Notifications queue | Search, filter, review, retry, and update delivery records. | One user or one notification needs investigation. |
| Notification Delivery | Channel health, provider failures, retry capacity, and queue links. | Many failures or one channel looks unhealthy. |
| Templates | Channel-specific message body and subject. | Content, variables, link, or wording is wrong. |
| Events | Business triggers connected to templates. | A workflow action should create a message but does not. |
| Review pages | Deep payload, provider, attempt, and retry evidence. | Payroll, access, compliance, or repeated failure needs audit. |

## Notification Statuses

| Status | Meaning | Typical action |
| --- | --- | --- |
| Pending | Created but not delivered yet. | Check queue health if pending grows. |
| Delivered | Provider or in-app channel accepted delivery. | No action unless user still reports issue. |
| Read | User opened or read in-app message where supported. | No action. |
| Failed | Delivery attempt failed. | Review failure and decide retry or escalation. |
| Retry ready | Failure can be retried by policy. | Retry after checking root cause. |
| Retry capped | Maximum retry attempts reached. | Escalate or manually follow up; do not retry blindly. |
| Held / reviewed | HR triaged and paused or annotated item. | Follow owner decision. |

## Start With Business Impact

Not every failure deserves the same urgency.

| Notification type | Impact if failed | Priority |
| --- | --- | --- |
| Invite or password reset | User blocked from access. | Critical |
| Leave/attendance approval pending near payroll close | Payroll or employee status may be delayed. | High |
| Document/tax rejection | Employee may miss correction deadline. | High |
| Payroll review, payslip, finance handoff | Payroll close or employee communication affected. | Critical |
| Launch blocker assigned | Go-live blocker may remain unresolved. | High |
| General informational update | Usually lower impact. | Normal |

## Queue Review Flow

Use this for one user or one event.

1. Open **HR Admin > Notifications**.
2. Search by recipient email, employee name, subject, event, or template.
3. Filter by status if needed.
4. Open **Details and quick review** for fast triage.
5. Open **Review** for full payload/provider evidence.
6. Decide retry, hold, manual follow-up, or escalation.

## Queue Filters

| Filter | Meaning | Example use |
| --- | --- | --- |
| Status | Pending, delivered, failed, read, retry-ready, retry-capped. | Find failed invite emails. |
| Channel | Email, in-app, push, SMS, or configured channel. | Check email-only failures. |
| Priority | Normal, high, critical. | Payroll alerts first. |
| Retry state | Whether retry is allowed. | Find retry-ready records. |
| Search | Subject, employee, template, event, recipient. | Search `m4407998@gmail.com`. |

## Queue Actions

| Action | What it does | Use carefully when |
| --- | --- | --- |
| Select | Marks one item for bulk action. | Only select same type/status records. |
| Review | Opens full notification details. | Access, payroll, compliance, repeated failure. |
| Details and quick review | Expands inline triage controls. | Simple status/priority/read-state update. |
| Retry delivery | Attempts delivery again. | Root cause is fixed or temporary. |
| Save review | Saves status, priority, notes, or read state. | Triage decision needs audit trail. |

## Quick Review Versus Full Review

| Review mode | Use when | Avoid when |
| --- | --- | --- |
| Details and quick review | You need fast triage: status, priority, read state, retry decision. | You need template variables or provider payload. |
| Full review | You need payload, template, provider, attempt history, retry evidence. | You are only scanning low-risk informational records. |

Use full review for payroll, access, compliance, launch, failed invite, password reset, and repeated channel failures.

## Notification Delivery Channel Health

Use **Notification Delivery** when one channel or many notifications are failing.

Channel health fields:

| Field | Meaning | What to do |
| --- | --- | --- |
| Tracked | Total notifications observed for channel. | Baseline volume. |
| Failed | Failed delivery count. | Open failed-only queue. |
| Retry capped | Items that exhausted attempts. | Review root cause and escalate. |
| Pending | Waiting to be processed. | If growing, check worker/provider health. |
| Delivered or read | Successfully delivered/read. | Confirms channel partly works. |
| Latest failure | Most recent error. | Use for technical triage. |
| Observed providers | Provider names seen for channel. | Confirm expected SMTP/in-app provider. |

Channel buttons:

| Button | Opens |
| --- | --- |
| Open queue | All notifications for that channel. |
| Failed only | Failed notifications for that channel. |
| Retry ready | Notifications ready for retry. |

## Template Design Standard

Good templates are short, actionable, and role-aware.

| Template part | Standard | Example |
| --- | --- | --- |
| Subject | Say what happened. | `Leave request pending approval` |
| First line | State the action or decision. | `Riya Sharma submitted a leave request.` |
| Required action | Tell recipient what to do. | `Open MSS to approve or reject.` |
| Link | Open correct workspace page. | Manager link opens MSS approval item. |
| Variables | Render real employee/request values. | Employee name, date, status. |
| Tone | Clear and professional. | Avoid internal codes unless useful. |

Avoid:

- Very long subjects.
- Internal template names in employee-facing text.
- Links that open the wrong workspace.
- Missing variables like `{employee_name}`.

## Event And Template Setup Checklist

| Check | Expected result |
| --- | --- |
| Event | Trigger matches the business process. |
| Recipient | Correct role or user receives message. |
| Channel | Email and/or in-app is intentional. |
| Template | Subject and body explain what happened and what to do. |
| Variables | Preview shows real values and no missing placeholders. |
| Link | Opens correct workspace page for recipient role. |
| Test delivery | Test message succeeds before activation. |
| Audit | Change is visible through review or audit evidence. |

## Example: New User Invite Email

Business case: Tenant Admin or HR Admin creates a new user. User must receive setup email.

Test flow:

1. Create or invite user.
2. Use a real test inbox.
3. Confirm email arrives.
4. Open link.
5. Set password.
6. Sign in.
7. Confirm user lands in correct workspace.

Expected result:

- Notification queue has invite event.
- Email status is delivered.
- User is not stuck on Workspace Access unless role/profile is intentionally missing.

If user does not receive email:

1. Search notification queue by email address.
2. Confirm recipient email is correct.
3. Check failed/retry-capped status.
4. Check Notification Delivery email channel.
5. Retry only after SMTP/provider issue is fixed.

## Example: Password Reset Email

Business case: User clicks **Forgot password**.

Test flow:

1. Open login page.
2. Click forgot password.
3. Enter user email.
4. Submit.
5. Confirm reset email arrives.
6. Open reset link.
7. Set new password.
8. Sign in again.

Expected result:

- Reset email arrives quickly.
- Link is valid.
- User can sign in with new password.

If a direct mail-provider test works but the reset email does not arrive, check whether the application created a notification event and whether the recipient user exists and is active.

## Example: Leave Request Notifications

Business case: Employee applies leave and manager must approve.

Expected notifications:

| Step | Recipient | Expected message |
| --- | --- | --- |
| Employee submits leave | Manager | Approval request. |
| Manager approves | Employee | Leave approved. |
| Manager rejects | Employee | Leave rejected with reason. |
| Manager overdue | HR Admin / fallback owner | Escalation or pending approval alert if configured. |

Test flow:

1. Employee applies leave from ESS.
2. Search notification queue by employee/manager.
3. Confirm manager receives approval alert.
4. Manager approves/rejects from MSS.
5. Confirm employee receives status update.

If manager does not receive alert, verify Employee Master manager mapping and workflow route before blaming email.

## Example: Attendance Regularization Notifications

Business case: Employee submits missed punch correction.

Expected notifications:

| Step | Recipient | Expected message |
| --- | --- | --- |
| Employee submits correction | Manager | Attendance approval request. |
| Manager approves/rejects | Employee | Attendance decision. |
| Request overdue | HR Admin / Time Office | Escalation if configured. |

Check attendance policy, workflow route, and manager MSS access if notification is missing.

## Example: Document Rejection Notification

Business case: HR rejects bank proof because IFSC is unreadable.

Expected notification:

- Recipient: employee.
- Channel: email and/or in-app according to tenant setup.
- Message: rejection reason and next action.
- Link: ESS document upload page or document item.

Good message:

`Your bank proof was rejected. Upload a clearer document showing account holder name, account number, and IFSC.`

Bad message:

`Document invalid.`

## Example: Payslip Published Notification

Business case: Payroll publishes September payslips.

Expected notification:

- Recipient: employees included in published payroll.
- Channel: in-app and/or email.
- Link: ESS payslips.
- Content: payroll month, availability, and action.

Before sending:

1. Confirm payroll output is final.
2. Confirm payslips are published.
3. Confirm employees have ESS access.
4. Send or trigger notification.
5. Check delivered count.

Do not notify employees before payroll output is final.

## Example: Payroll Review And Finance Handoff

Business case: Payroll run is ready for review or finance handoff.

Expected notifications:

| Event | Recipient | Why |
| --- | --- | --- |
| Payroll review requested | Payroll Admin / HR approver | Review exceptions and approval. |
| Payroll approved | Payroll Admin / Finance | Prepare outputs or handoff. |
| Handoff ready | Finance Manager | Download/register/payment evidence. |
| Handoff failed | Payroll Admin / Finance | Fix provider or manual handoff. |

Use full review for these notifications because payroll evidence may be needed later.

## Retry Decision Guide

| Finding | Retry? | What to do |
| --- | --- | --- |
| Temporary timeout and provider is now healthy | Yes | Retry eligible items and confirm status. |
| Recipient email is wrong | No | Fix recipient source record first. |
| User account missing/inactive | No | Fix user/profile/access first. |
| Retry cap reached | Not immediately | Review root cause and escalate if needed. |
| Channel setup is failing for many records | No | Escalate provider setup before retrying. |
| Message is now outdated | No | Save review note and use manual follow-up if needed. |
| In-app delivered but email failed | Maybe | Decide if email is required for that process. |

## Negative Scenario: User Did Not Receive Invite

1. Search queue by recipient email.
2. Confirm invite notification exists.
3. If no notification exists, check user creation/invite action.
4. If notification exists but failed, open review and read latest failure.
5. Confirm SMTP/provider health in **Notification Delivery**.
6. Confirm email spelling and user status.
7. Retry only after fixing root cause.
8. If urgent, manually contact user and record review note.

## Negative Scenario: Direct SMTP Test Works But App Email Does Not

This means SMTP credentials may be valid, but the application event path may be wrong.

Check:

| Check | Why |
| --- | --- |
| Event created | App must create notification record. |
| Template active | Event needs active template/channel. |
| Recipient resolved | User/employee email must exist. |
| Queue worker | Pending records must be processed. |
| Failure message | Provider may reject only specific recipient/content. |

Do not stop at direct SMTP success. Confirm app-triggered notification reaches the queue and changes to delivered.

## Negative Scenario: Retry Cap Reached

Retry capped means automatic attempts are exhausted.

1. Open full review.
2. Read latest failure and attempt count.
3. Decide whether message is still useful.
4. Fix root cause.
5. Escalate to support/technical operations if provider setup is failing.
6. Use manual follow-up for urgent access, payroll, or compliance messages.
7. Save review note.

## Negative Scenario: Template Link Opens Wrong Workspace

Example: Manager approval email opens ESS instead of MSS.

Fix:

1. Open template preview.
2. Check link target and recipient role.
3. Update template link.
4. Send test message to manager user.
5. Confirm link opens MSS approval page.
6. Activate corrected template.

## Negative Scenario: Notification Sent To Wrong Person

Likely causes:

| Cause | Fix |
| --- | --- |
| Employee manager is wrong | Fix Employee Master manager. |
| Workflow route points to wrong role | Fix workflow template. |
| User email belongs to wrong person | Fix Tenant Admin user or Employee Master email. |
| Old manager request created before transfer | Reassign or escalate according to policy. |

Always fix the source routing issue before retrying.

## Full Review Checklist

- Recipient is correct.
- User is active.
- Employee profile and role/access are correct.
- Channel and provider are correct.
- Template matches event.
- Variables rendered correctly.
- Link opens correct workspace.
- Failure reason is understandable.
- Retry is used only for temporary failures.
- Retry-capped items are escalated instead of retried repeatedly.
- Manual follow-up is recorded when used.

## Evidence To Capture

| Situation | Evidence |
| --- | --- |
| User says message was not received | Recipient, subject, channel, status, latest activity. |
| Invite/password reset failed | User email, event, failure reason, retry/manual action. |
| Payroll or launch alert failed | Failure reason, attempt count, owner, manual follow-up. |
| Provider/channel failure | Channel health counts, latest failure, provider, time window. |
| Template issue | Template name, preview output, corrected version. |
| Retry performed | Who retried, when, status after retry. |

## Before Marking Notification Work Complete

| Check | Expected result |
| --- | --- |
| Invite email | Delivered to a real test inbox. |
| Password reset | Delivered and reset link works. |
| Leave request | Manager receives approval alert. |
| Leave decision | Employee receives approved/rejected status. |
| Attendance request | Manager receives approval alert. |
| Document rejection | Employee receives correction reason. |
| Tax declaration rejection | Employee receives correction reason. |
| Payslip publish | Employee receives payslip availability alert if enabled. |
| Payroll review/handoff | Approver/finance receives alert if enabled. |
| Failed queue | Failed records can be reviewed with reason. |
| Retry | Retry works only after root cause is fixed. |
| Audit | Notification evidence can be shown. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| No email received | Failed notification, wrong recipient, spam, provider issue, event not created. | Search queue, check channel health, verify event/template. |
| Email delivered but user cannot act | Link opens wrong workspace or user lacks access. | Fix template link or workspace access. |
| Manager did not get approval | Manager missing, inactive, lacks MSS, or workflow route wrong. | Fix Employee Master/access/workflow. |
| Many emails failed | Provider/channel issue. | Check Notification Delivery, escalate technical setup. |
| In-app delivered but email failed | Email channel issue only. | Decide whether email is required; retry if fixed. |
| Retry keeps failing | Root cause not fixed. | Stop retrying and escalate. |
| Template has missing values | Variable mismatch. | Fix template and test preview. |

## FAQ

### Should I retry every failed message?

No. Retry only when the root cause is temporary or fixed. Wrong recipient, bad setup, missing user, or outdated messages should not be retried blindly.

### What if email failed but in-app notification was delivered?

Check the business process. Some messages require email; others can be accepted through in-app delivery with a review note.

### Why do retry-capped messages matter?

Retry-capped means the system exhausted automatic attempts. Repeated manual retry without fixing root cause creates noise and can confuse users.

### Which emails are critical for launch?

Invite, password reset, leave/attendance approval, document/tax rejection, payslip publication, payroll review, finance handoff, and launch blocker assignment.

### When should I escalate to technical operations?

Escalate when failures affect many records, pending queue grows, a provider/channel is unavailable, credentials are rejected, DNS/SPF/DKIM is suspected, or latest failure points to setup/infrastructure.

## Related Guides

- [Notification Failure to Recovery](../workflows/notification-failure-to-recovery.md)
- [Notification Issues](../troubleshooting/notifications.md)
- [Tenant Admin Users](../tenant-admin/users.md)
- [Workflows](workflows.md)
- [Documents](documents.md)
- [Leave Management](leave.md)
- [Attendance](attendance.md)
- [Payroll Control](payroll/payroll-control.md)
