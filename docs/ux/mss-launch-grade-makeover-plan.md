# MSS Launch Grade Makeover Plan

Last updated: 2026-10-03
Owner: HRMS product/UX redesign track
Workspace: `/mss`

## Goal

Make Manager Self Service a daily manager workspace that is simple enough for non-HR users, but strong enough for payroll-impact approvals.

MSS should answer three questions quickly:

1. What needs my decision today?
2. What context do I need before deciding?
3. Did my decision update the employee workflow correctly?

## Current Route Inventory

| Route | Current purpose | Current issue |
| --- | --- | --- |
| `/mss` | Manager control center with action counts and shortcuts. | Good starting point, but needs clearer daily-priority framing and stronger separation between team work and personal ESS links. |
| `/mss/approvals` | Leave approvals and attendance regularization approvals in one queue page. | Too much responsibility on one screen: queue switching, list review, detail inspection, decision capture, pagination, and direct-link recovery all appear together. |
| `/mss/notifications` | Manager notification inbox using shared notification center. | Functionally useful, but should feel more manager-specific and route source links back to approval work cleanly. |
| `/ess` quick link | Manager's personal employee self-service. | Needed, but should not compete with manager decisions. |

## Design Principles

| Principle | MSS interpretation |
| --- | --- |
| Single responsibility | One screen should do one manager job: overview, leave decisions, attendance decisions, notifications, or personal ESS handoff. |
| Summary before list | Managers should see urgency and counts before opening rows. |
| Modal for decision | Approve/reject should happen in a focused modal, not inside a crowded details panel. |
| Context before action | Employee, dates, reason, balance/attendance context, payroll impact, and previous decisions must be visible before submit. |
| Right-aligned actions | Primary actions should live in predictable right-side or footer action zones. |
| No hidden blockers | Permission gaps, empty queues, stale direct links, and already-decided requests must explain what happened. |
| Same typography system | Use the central app typography, compact headings, consistent pills, and no oversized dense text blocks. |

## Target Information Architecture

Keep one MSS sidebar group, but split the current approval work into clearer submenus.

```text
MSS

Dashboard
  /mss

Approvals
  Leave approvals
  Attendance approvals
  Decision history

Notifications
  Inbox
  Failed delivery / action alerts

Self service
  Open ESS
```

Implementation can start with tabs or query-backed subviews inside `/mss/approvals`, then graduate to route aliases only if needed.

## Target Page Model

### 1. Manager Dashboard

Status: Completed.

Route: `/mss`

Purpose:

- Daily command center for managers.
- Show only the next actions that matter.
- Route managers to focused queues.

Screen structure:

```text
Manager Dashboard

[Team members] [Pending decisions] [Leave today] [Attendance exceptions]

Today's manager actions
  Leave approvals             3      [Open]
  Attendance regularizations  2      [Open]
  Team notifications          1      [Open]

Team snapshot
  On leave today
  Attendance exceptions today
  Payroll cutoff warnings

Personal workspace
  [Open ESS]
```

Quality bar:

- No approval detail on dashboard.
- No decision form on dashboard.
- Empty state should say "No manager decisions pending."
- Personal ESS links are secondary.

### 2. Leave Approvals

Route target: `/mss/approvals?queue=leave`

Status: Completed as a focused approval view with modal decision capture.

Purpose:

- Review and decide leave requests only.

Screen structure:

```text
Leave Approvals

[Pending] [Approved] [Rejected] [Cancelled]

Filters:
  Employee | Leave type | Date range | Status | Page size

List:
  Employee | Leave type | Dates | Units | Reason | Status | Action

[Review] opens modal:
  Employee context
  Leave balance and policy hints
  Request reason
  Evidence summary
  Team coverage hint
  Decision history
  [Approve] [Reject] [Close]
```

Modal should be used for:

- Review request detail.
- Approve leave.
- Reject leave with reason.
- View evidence/source context.

Do not keep full detail panel always visible on the page.

### 3. Attendance Approvals

Route target: `/mss/approvals?queue=attendance`

Status: Completed as a focused approval view with modal decision capture.

Purpose:

- Review attendance regularization only.

Screen structure:

```text
Attendance Approvals

[Pending] [Approved] [Rejected]

Filters:
  Employee | Date | Exception type | Status | Page size

List:
  Employee | Date | Current status | Requested status | Requested time | Reason | Action

[Review] opens modal:
  Current attendance record
  Requested correction
  Reason and evidence
  Payroll impact
  Previous correction attempts
  [Approve] [Reject] [Close]
```

Modal should be used for:

- Review correction detail.
- Approve regularization.
- Reject with clear reason.

### 4. Decision History

Route target: `/mss/approvals?queue=history`

Status: Navigation and read-only empty state completed. Completed-decision rows require a backend history endpoint.

Purpose:

- Let managers review decisions they already made.
- Reduce confusion after a request leaves the pending queue.

Screen structure:

```text
Decision History

Filters:
  Request type | Employee | Status | Date range

List:
  Employee | Request type | Period/date | Decision | Decision date | Comment | View

[View] opens read-only modal.
```

Quality bar:

- Read-only by default.
- Clear difference between pending work and historical audit.

### 5. Manager Notifications

Route: `/mss/notifications`

Status: Completed as a manager-focused alert triage workspace.

Purpose:

- Manager-specific alerts, not another approval queue.
- Route notifications to source workflows.

Screen structure:

```text
Manager Notifications

[Unread] [Action needed] [Failed delivery] [All]

List:
  Source | Message | Employee | Priority | Time | Status | Action

[Review] opens modal:
  Notification detail
  Delivery/read state
  Source workflow link
  [Open approval] [Mark read]
```

Quality bar:

- Source workflow links must land on the correct approval queue and selected item where possible.
- Notification review must not replace approval decisions.
- Filters, list, selected detail, and review modal use manager-specific labels instead of generic inbox copy.

## Phase Plan

| Phase | Scope | Status |
| --- | --- | --- |
| MSS-0 | Audit current MSS routes, responsibilities, docs, and tests. | Completed |
| MSS-1 | Redesign `/mss` dashboard into a clear manager daily action center. | Completed |
| MSS-2 | Split approvals into focused Leave, Attendance, and History tabs/subviews. | Completed |
| MSS-3 | Convert approval detail/decision panels into focused review modals. | Completed |
| MSS-4 | Tighten manager notifications with source workflow routing and modal review. | Completed |
| MSS-5 | Update MSS docs with screenshots, examples, positive/negative workflows. | In progress |
| MSS-6 | Browser certification: navigation, visual QA, approvals, rejection, empty states, permissions, direct links, and notifications. | In progress |

## Browser Certification Requirements

Every MSS page must have browser-based coverage for:

- Page load and auth routing.
- Sidebar and header navigation.
- Search or filter behavior where present.
- Empty state.
- Long list pagination.
- Open modal.
- Close modal without losing page context.
- Positive approval or read action where mutation is enabled.
- Negative validation, such as missing rejection reason.
- Permission-limited user behavior.
- Direct-link behavior for a selected approval item.
- Mobile and desktop layout screenshots.

## Acceptance Criteria

MSS can be considered launch-grade when:

- A manager can complete daily pending decisions without learning HR Admin.
- Leave and attendance approvals no longer feel mixed into one crowded page.
- Decision actions are modal-based and context-rich.
- All important actions are right-aligned or in modal footers.
- Pagination exists for long queues.
- Typography matches HR Admin and ESS.
- All links route to the intended queue/detail.
- Docs explain practical manager scenarios with examples.
- Browser tests prove both positive and negative workflows.
