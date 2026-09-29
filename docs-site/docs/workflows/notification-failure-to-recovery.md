# Notification Failure to Recovery

Use this workflow when email, in-app, or other notification delivery has failed or become retry capped.

## Outcome

The failed message is understood, retried if safe, or recorded with evidence for support, audit, or user follow-up.

![Notification queue](../assets/screenshots/hr-admin/notifications-queue.png)

## Owners

| Task | Owner |
| --- | --- |
| Review failed notification | HR Admin |
| Review channel health | HR Admin or platform operations |
| Confirm tenant user access | Tenant Admin |
| Investigate backend/provider issue | Support or technical operations |

## Step 1: Start from the Queue

1. Open **HR Admin > Notifications**.
2. Filter by **Failed**.
3. Open the failed item.
4. Read the subject, channel, template, recipient, latest failure, and attempt count.

Check:

- Is the recipient valid?
- Is the channel email, in-app, or another provider?
- Is the failure temporary or permanent?
- Has retry cap been reached?

Before retrying, classify the business impact. Payroll, access, compliance, and launch messages need faster escalation than low-priority informational messages.

## Step 2: Use Quick Review

1. Expand **Details and quick review**.
2. Check scheduled state, read state, retry policy, latest activity, and subject context.
3. Set status and priority if triage is required.
4. Save review notes.

Use **Full review** when:

- Payload details must be inspected.
- You need a complete audit decision.
- The same issue repeats across many recipients.

## Step 3: Check Channel Health

1. Open **Notification Delivery**.
2. Review channel cards.
3. Compare tracked, failed, retry capped, pending, delivered, and retry-ready counts.
4. Open failed-only view if the channel has repeated failures.

![Notification delivery health](../assets/screenshots/hr-admin/notification-delivery-health.png)

Common channel findings:

| Finding | Meaning | Action |
| --- | --- | --- |
| Connection refused | Provider or local delivery service unavailable | Escalate technical setup before retrying repeatedly. |
| Retry capped | Maximum retry attempts reached | Review before manual retry. |
| Pending increasing | Queue is not draining | Check worker/provider health. |
| Failed only on email | SMTP or address issue likely | Check email provider and recipient addresses. |
| In-app delivered but email failed | User can still see notification in app | Do not treat as total communication failure. |

## Step 4: Decide Retry, Hold, or Escalate

| Decision | Use when |
| --- | --- |
| Retry delivery | Failure is temporary and retry cap allows it. |
| Save review only | You need another owner to investigate. |
| Mark lower priority | Notification is informational and no longer urgent. |
| Escalate | Provider, SMTP, credential, DNS, or worker issue is suspected. |
| Contact user manually | Payroll, access, or compliance deadline depends on the notification. |

Do not retry repeatedly if:

- The failure is caused by missing provider configuration.
- Recipient address is invalid.
- Retry cap has already been reached.
- The message contains time-sensitive instructions that are now outdated.

If the failure affects many users or one full channel, stop individual retries and escalate the channel/provider issue.

## Step 5: Confirm Recovery

After retry or correction:

1. Refresh the notification queue.
2. Confirm status changed from failed.
3. Check latest activity timestamp.
4. Confirm delivered/read count increased if expected.
5. Keep audit notes for any manual action.

If recovery was completed manually, such as phone/email outside the system, record a review note so the notification history explains the outcome.

## Escalation Checklist

Include these details when escalating:

- Tenant or workspace.
- Notification subject.
- Recipient.
- Channel.
- Template.
- Attempt count.
- Latest failure message.
- Time of latest activity.
- Whether in-app delivery succeeded.
- Business impact, such as payroll, document request, or approval deadline.

## Related Pages

- [Notifications](../hr-admin/notifications.md)
- [Notification Delivery](../hr-admin/notifications.md#notification-delivery)
- [Tenant Admin Users](../tenant-admin/users.md)
- [Troubleshooting](../troubleshooting/index.md)
