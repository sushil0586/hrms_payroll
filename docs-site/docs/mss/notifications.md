# Manager Notifications

Use Manager Notifications to triage manager-facing alerts, delivery status, and linked team workflow events without mixing them with your personal ESS inbox.

![MSS notifications](../assets/screenshots/mss/notifications.png)

## Page Purpose

The manager notification page is an alert triage workspace. It tells you what happened, whether delivery succeeded, and which source workflow should be opened before you act.

## Main Sections

| Section | What it shows | How to use it |
| --- | --- | --- |
| Alert filters | Search, status, channel, priority, source type, and page size. | Narrow the view before opening a message. |
| Team alert list | Manager alerts for leave, attendance, documents, payroll, or delivery failures. | Select one alert at a time. |
| Selected alert | Message summary, delivery channel, priority, source reference, and read state. | Confirm context, then open review or source workflow. |
| Review notification modal | Full message and delivery/read controls. | Mark read/unread or open the linked approval/source page. |

## Controls

| Control | Purpose |
| --- | --- |
| Approvals | Open the manager approval workspace. |
| Decision history | Review completed decision context when available. |
| ESS inbox | Switch to your personal employee notifications. |
| Apply filters | Refresh the alert list using selected filters. |
| Clear filters | Return to the full manager alert list. |
| Select | Make one alert active in the detail panel. |
| Review notification | Open the focused detail modal. |
| Open source | Open the related approval or workflow. |
| Mark read / Mark unread | Update the alert's read state. |

## Manager notification priorities

| Priority | Example | Action |
| --- | --- | --- |
| High | Payroll-period approval risk or failed urgent delivery. | Open immediately and complete the source workflow. |
| Normal action | Leave or attendance request waiting for decision. | Review during daily manager check-in. |
| Informational | Team status or system update. | Read when convenient. |
| Failed / retry capped | Delivery failed but in-app record exists. | Review in-app and tell HR if external delivery is needed. |

## Source workflow guidance

Use the source link whenever available. The notification tells you something happened; the source workflow is where the decision or correction should happen.

Examples:

- Leave approval notification: open **Approvals** and decide there.
- Attendance exception notification: open the linked regularization request.
- Failed delivery notice: open detail, confirm whether action is still required, then escalate if needed.

## Practical examples

### Leave approval alert

1. Open **Manager Notifications**.
2. Filter **Subject type** to `Leave request`.
3. Select the alert.
4. Open **Review notification** if you need the delivery trail.
5. Click **Open source** and approve or reject from **Manager approvals**.

### Failed delivery alert

1. Filter **Status** to `Failed`.
2. Select the failed alert.
3. Review the latest delivery state.
4. Open the source workflow and confirm whether the item still needs action.
5. Tell HR if external delivery must be retried outside the in-app workflow.

## Good Practice

- Open failed or retry-capped notifications first.
- Use the linked workflow instead of acting only from the notification text.
- Clear unread messages after decisions are complete.

## FAQ

### Should I approve from a notification alone?

No. Open the linked approval or workflow so you can review the full request context before deciding.

### What if the notification is old?

Open the source workflow and check current status. If the request is already approved, rejected, or cancelled, no further action may be needed.
