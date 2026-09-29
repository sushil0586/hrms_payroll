# Payroll Setup

Payroll Setup defines the calendar, periods, pay groups, and employee assignments used by payroll.

## Purpose

Use this page before running payroll for a tenant, or when payroll structure changes.

## Setup concepts

| Concept | Meaning |
| --- | --- |
| Calendar | Defines payroll frequency, currency, timezone, and period start behavior. |
| Period | A payroll window such as 01 Sep to 30 Sep. |
| Pay group | A group of employees paid together. |
| Assignment | Mapping of employees to pay groups. |

## Recommended screen design pattern

Each setup tab should work like a focused workbench:

1. A compact summary of existing records.
2. Search and filters for long lists.
3. Paginated table or list.
4. One create/edit form for the selected record.
5. Clear primary action at the bottom or top-right.
6. Drilldown only when extra fields would overcrowd the tab.

This keeps setup manageable as the tenant grows from a few employees to hundreds of employees.

## Tabs

| Tab | Purpose | Example |
| --- | --- | --- |
| Calendars | Create and maintain payroll calendars. | India Monthly Payroll |
| Periods | Maintain monthly payroll windows. | September 2026 |
| Pay groups | Create payroll cohorts. | Monthly Staff, Contract Staff |
| Assignments | Assign employees to pay groups. | Employee A to Monthly Staff |


![Payroll Setup calendars tab](../../assets/screenshots/payroll/payroll-setup-calendars.png)

## Calendar fields

| Field | Meaning |
| --- | --- |
| Code | Unique system code for the payroll calendar. |
| Name | User-friendly calendar name. |
| Frequency | Monthly, weekly, or other payroll frequency. |
| Timezone | Timezone used for cutoffs. For India use Asia/Kolkata. |
| Currency code | Payroll currency, such as INR. |
| Period start day | Day of month on which payroll period starts. |
| Config profile reference | Optional reference to advanced configuration. |
| Active calendar | Whether this calendar is available for use. |

## Before creating a calendar

Confirm:

- Payroll frequency.
- Currency.
- Timezone.
- Period start day.
- Whether the same calendar can serve all employees.
- Whether a separate calendar is needed for contractors, weekly workers, or another country.

## Period fields

| Field | Meaning |
| --- | --- |
| Period name | User-facing period label. |
| Start date | First date included in payroll. |
| End date | Last date included in payroll. |
| Status | Draft, active, locked, closed, or similar period state. |
| Calendar | Calendar that owns this period. |

## Pay group fields

| Field | Meaning |
| --- | --- |
| Code | Unique pay group identifier. |
| Name | User-friendly name. |
| Calendar | Payroll calendar used by the group. |
| Legal entity / branch / department filters | Optional filters for employee grouping. |
| Active | Whether new assignments can use this group. |

## Buttons and actions

| Button | What it does |
| --- | --- |
| New | Clears the form for a new record. |
| Create calendar | Creates a payroll calendar. |
| Create period | Creates a payroll period. |
| Create pay group | Creates a pay group. |
| Assign employee | Creates employee pay group assignment. |
| Save / Update | Saves changes to the selected record. |

## Recommended setup workflow

1. Create a calendar.
2. Create payroll periods for upcoming months.
3. Create pay groups.
4. Assign employees to pay groups.
5. Open Payroll Control and check setup health.

## Long-list handling

Use pagination and filters when records grow:

| List | Recommended filters |
| --- | --- |
| Calendars | Status, frequency, currency. |
| Periods | Calendar, month, status. |
| Pay groups | Calendar, legal entity, active status. |
| Assignments | Employee, department, pay group, status. |

Avoid showing every historical period or assignment in one long page. Users should be able to find the current payroll period without scrolling through old records.

## Common mistakes

- Creating multiple active calendars with similar names.
- Period dates overlapping.
- Employees missing pay group assignment.
- Assigning employees to the wrong pay group.
- Using unclear codes that are hard to audit later.

## FAQ

### Should I create a new calendar every month?

No. Create one reusable calendar and create monthly periods under it.

### When should I create a separate pay group?

Create a separate pay group when employees follow different payroll timing, rules, provider handoff, or review process.

### Should payroll setup be changed during an active run?

Avoid it unless the change is required to fix a blocker. If a payroll run is already locked or calculated, check whether a rerun is required.
