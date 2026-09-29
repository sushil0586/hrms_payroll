# Notification Issues

Use this page when email, in-app, or other notifications are failed, retry capped, delayed, or not visible to users.

## Start Here

Open **HR Admin > Notifications** and filter by the affected status.

![Notification queue](../assets/screenshots/hr-admin/notifications-queue.png)

Then open **Notification Delivery** if the issue affects many notifications or one channel.

![Notification delivery health](../assets/screenshots/hr-admin/notification-delivery-health.png)

## Email Failed

Check:

| Check | What to look for |
| --- | --- |
| Recipient email | Missing, misspelled, or invalid address |
| Provider status | SMTP or email provider error |
| Latest failure | Connection refused, authentication failure, timeout, rejected recipient |
| Attempt count | Whether retry cap is close or reached |
| Template | Correct template and subject context |
| Channel | Email channel enabled |

Common fixes:

- Correct recipient email.
- Retry after provider is healthy.
- Fix SMTP/provider credentials outside HRMS if the provider rejects authentication.
- Use in-app notification or manual contact for urgent payroll/compliance messages.

If many email notifications fail together, treat it as a channel issue instead of a recipient issue.

## Retry Capped

Retry capped means the system already tried the maximum configured attempts.

Before retrying:

1. Read the latest failure.
2. Confirm the root cause is fixed.
3. Confirm the message is still useful.
4. Add a review note if manual retry is used.

Do not retry capped messages blindly. It can create repeated failures and confuse users.

## In-App Delivered but Email Failed

This means the user may still see the message inside HRMS.

Check:

- Whether the business process requires email specifically.
- Whether in-app delivery is enough.
- Whether the user is active and can log in.
- Whether a manual follow-up is needed.

Examples:

| Message type | Email failure impact |
| --- | --- |
| Informational update | In-app may be enough. |
| Password reset or invite | Email failure must be fixed. |
| Payroll approval reminder | Manual follow-up may be needed. |
| Compliance deadline | Escalate if email is required. |

## Pending Queue Is Growing

Possible causes:

- Delivery worker is not running.
- Provider is slow or unavailable.
- Channel is disabled.
- Queue is overloaded.
- Backend delivery task is failing.

Actions:

1. Open **Notification Delivery**.
2. Compare pending, failed, delivered, and retry-ready counts.
3. Check latest activity time.
4. Escalate to technical operations if pending grows across channels.

## User Says They Did Not Receive a Message

Check:

1. Search the notification queue by recipient.
2. Confirm status.
3. Confirm recipient address.
4. Ask user to check spam or promotions if email delivered.
5. Confirm user can see in-app notifications.
6. Resend only if the original message is still valid.

Do not resend outdated approval, payroll, or compliance instructions. Create a new valid communication or use manual follow-up with notes.

## Template Looks Wrong

Check:

- Template selected by the event.
- Subject and body preview.
- Variables and missing placeholders.
- Link destination and recipient role.
- Whether the template was changed recently.

Fix the template, send a test message, then retry or resend only when the original message is still appropriate.

## Escalation Details

Include:

- Recipient.
- Channel.
- Template or subject.
- Notification ID or visible title.
- Failure message.
- Attempt count.
- Latest activity time.
- Whether in-app delivery succeeded.
- Whether this affects one user or many users.

## Related Guides

- [Notifications](../hr-admin/notifications.md)
- [Notification Failure to Recovery](../workflows/notification-failure-to-recovery.md)
- [Access Issues](access.md)
- [Tenant Admin Users](../tenant-admin/users.md)
