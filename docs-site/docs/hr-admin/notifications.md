# HR Admin Notifications

Notification pages manage event templates, delivery channels, failed delivery queues, retries, and diagnostics.

## Purpose

Use Notifications to make sure HRMS messages are created, delivered, retried, and audited correctly.

## Use this page when

- Users say they did not receive an email or in-app notification.
- Notification Delivery shows failed or retry-capped channels.
- A template needs preview or correction.
- A new workflow needs event-based communication.
- Payroll, document, leave, attendance, or launch notifications need evidence.

## Notification areas

| Area | Purpose |
| --- | --- |
| Notifications queue | Search, filter, review, retry, and update delivery records. |
| Notification delivery | Channel health, provider failures, retry capacity, and queue links. |
| Templates | Channel-specific message body and subject content. |
| Events | Business events that trigger templates. |
| Review pages | Deep payload, delivery, provider, and retry evidence. |


![Notification queue filters and summary](../assets/screenshots/hr-admin/notifications-queue.png)

![Notification delivery channel health](../assets/screenshots/hr-admin/notification-delivery-health.png)

## Notification statuses

| Status | Meaning | Typical action |
| --- | --- | --- |
| Pending | Created but not delivered yet. | Check queue health if pending grows. |
| Delivered | Provider or in-app channel accepted delivery. | No action unless user still reports issue. |
| Read | User opened or read the in-app message where supported. | No action. |
| Failed | Delivery attempt failed. | Review failure and decide retry or escalation. |
| Retry ready | Failure can be retried by policy. | Retry only after checking root cause. |
| Retry capped | Maximum retry attempts reached. | Escalate or use manual follow-up; do not retry blindly. |
| Held / reviewed | HR has triaged and paused or annotated the item. | Follow owner decision. |

## Start with impact

Not every notification failure has the same urgency.

| Notification type | Impact if failed |
| --- | --- |
| Password reset, invite, or access message | High. User may be blocked from login. |
| Payroll approval, payslip, or finance handoff alert | High. Payroll or finance timeline may be affected. |
| Document rejection or compliance deadline | High if it blocks readiness. |
| Leave or attendance reminder | Medium. Manager or employee follow-up may be needed. |
| Informational update | Low unless policy requires delivery evidence. |

## Notifications queue

Use the notification queue to review notification delivery status.

### What you can do

- Search notification records.
- Filter by status, channel, priority, and retry state.
- Review failed notifications.
- Retry eligible notifications.
- Open full review for provider evidence.

### Queue filters

| Filter | Meaning |
| --- | --- |
| Status | Pending, delivered, failed, read, retry-ready, or retry-capped. |
| Channel | Email, in-app, push, SMS, or configured channel. |
| Priority | Normal, high, critical, or internal priority. |
| Retry state | Whether the record can be retried. |
| Search | Subject, employee, template, event, or recipient. |

### Queue actions

| Action | Meaning |
| --- | --- |
| Select | Marks one notification for bulk operation. |
| Review | Opens full notification review page. |
| Details and quick review | Expands inline triage controls. |
| Retry delivery | Sends an eligible notification again. |
| Save review | Saves changed status, priority, or read state. |

## Quick review vs full review

| Review mode | Use when |
| --- | --- |
| Details and quick review | You need fast triage: status, priority, read state, retry decision. |
| Full review | You need payload, template, provider, attempt history, or audit evidence. |

Use full review when a notification affects payroll, access, compliance, launch, or a repeated channel failure.

## Notification delivery

Use Notification Delivery to review channel health and delivery configuration.

### What you can do

- Check email, in-app, push, or other channel health.
- Open channel-specific queues.
- Review latest failures.
- Update provider and retry configuration.

### Channel health fields

| Field | Meaning |
| --- | --- |
| Tracked | Total notifications observed for the channel. |
| Failed | Failed delivery count. |
| Retry capped | Items that cannot retry because limit is reached. |
| Pending | Waiting to be processed. |
| Delivered or read | Successfully delivered or read. |
| Latest failure | Most recent failure message. |
| Observed providers | Provider names seen for the channel. |

### Channel buttons

| Button | Opens |
| --- | --- |
| Open queue | All notifications for that channel. |
| Failed only | Failed notifications for that channel. |
| Retry ready | Notifications ready for retry. |

## Retry decision guide

| Finding | Retry? | What to do |
| --- | --- | --- |
| Temporary timeout and provider is now healthy | Yes | Retry eligible items and confirm status. |
| Recipient email is wrong | No | Fix recipient source record first. |
| Retry cap reached | Not immediately | Review root cause and escalate if needed. |
| Channel setup is failing for many records | No | Escalate channel/provider setup before retrying. |
| Message is now outdated | No | Save review note and use manual follow-up if needed. |
| In-app delivered but email failed | Maybe | Decide if email is required for that process. |

## Notification templates

Templates define message content for specific channels.

### What you can do

- Create templates.
- Preview template output.
- Send test notifications.
- Edit or archive templates.

### Template checks

- Subject is short and understandable.
- Body says what happened and what action is required.
- Links open the correct workspace page.
- Variables render correctly in preview.
- Test notification succeeds before activation.

## Notification events

Events connect business workflows to notification templates.

### Examples

- Document rejected.
- Payroll payslip published.
- Attendance regularization approved.
- Leave request pending.
- Support access approved.

## Template and event setup checklist

| Check | Expected result |
| --- | --- |
| Event | Trigger matches the business process. |
| Template | Subject and body explain what happened and what to do. |
| Variables | Preview shows real values and no missing placeholders. |
| Link | Opens the correct workspace page for the recipient role. |
| Channel | Email, in-app, or other channel is intentional. |
| Test delivery | Test message succeeds before activation. |
| Audit | Change is visible through review or audit evidence. |

## Full review checklist

- Recipient is correct.
- Channel and provider are correct.
- Template matches the event.
- Payload variables are present.
- Failure reason is understandable.
- Retry is used only for temporary failures.
- Retry-capped items are escalated instead of retried repeatedly.

## Evidence to capture

| Situation | Evidence |
| --- | --- |
| User says message was not received | Notification title, recipient, channel, status, latest activity. |
| Payroll or launch alert failed | Failure reason, attempt count, manual follow-up, owner. |
| Provider/channel failure | Channel health counts, latest failure, provider name, time window. |
| Template issue | Template name, preview output, corrected version. |
| Retry performed | Who retried, when, status after retry. |

## Good practice

- Test templates before activation.
- Keep subject lines short and clear.
- Use retry only when the failure is temporary.
- Keep failed queue reviewed so important alerts are not missed.
- Use full review for payload or provider investigation; use quick review for simple triage.

## FAQ

### Should I retry every failed message?

No. Retry only when the root cause is temporary or fixed. Wrong recipient, bad setup, or outdated messages should not be retried blindly.

### What if email failed but in-app notification was delivered?

Check the business process. Some messages require email; others can be accepted through in-app delivery with a review note.

### Why do retry-capped messages matter?

Retry-capped means the system has already exhausted automatic attempts. Repeated manual retry without fixing the root cause creates noise and can confuse users.

### When should I escalate to technical operations?

Escalate when failures affect many records, pending queue grows, a provider/channel is unavailable, or the latest failure points to setup or infrastructure.
