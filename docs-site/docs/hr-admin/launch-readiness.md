# HR Admin Launch Readiness

Launch Readiness helps HR Admin users clear operational blockers before production use, first payroll, or customer go-live.

## On This Page

- [Launch Readiness Quick Navigation](#launch-readiness-quick-navigation)
- [Purpose](#purpose)
- [Use this page when](#use-this-page-when)
- [Page sections](#page-sections)
- [Common blockers](#common-blockers)
- [Workflow](#workflow)
- [Example: Clear a Missing Employee Role Blocker](#example-clear-a-missing-employee-role-blocker)
- [Example: Clear an Organization Master Blocker](#example-clear-an-organization-master-blocker)
- [Example: Assign Owner and Due Date](#example-assign-owner-and-due-date)
- [Example: Complete Go-Live Handoff Evidence](#example-complete-go-live-handoff-evidence)
- [Do not close a blocker if](#do-not-close-a-blocker-if)

## Launch Readiness Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Understand go-live status | [Page sections](#page-sections) | [Common blockers](#common-blockers) |
| Clear employee access blocker | [Example: Clear a Missing Employee Role Blocker](#example-clear-a-missing-employee-role-blocker) | [Workflow](#workflow) |
| Clear organization setup blocker | [Example: Clear an Organization Master Blocker](#example-clear-an-organization-master-blocker) | [Common blockers](#common-blockers) |
| Assign owner and due date | [Example: Assign Owner and Due Date](#example-assign-owner-and-due-date) | [Workflow](#workflow) |
| Complete go-live handoff evidence | [Example: Complete Go-Live Handoff Evidence](#example-complete-go-live-handoff-evidence) | [Do not close a blocker if](#do-not-close-a-blocker-if) |

## Purpose

Use this page to route launch blockers, assign owners, record risk decisions, and keep evidence current.

![Launch remediation](../assets/screenshots/hr-admin/launch-remediation.png)

## Use this page when

- The dashboard shows launch blockers.
- A go-live gate is blocked or overdue.
- A launch issue needs an owner or escalation.
- You need to download audit evidence for launch signoff.
- Platform Admin or Tenant Admin asks whether HR operations are launch-ready.

## Page sections

| Section | Meaning |
| --- | --- |
| Summary metrics | Open assignments, blockers, warnings, overdue items, ignored decisions, escalations. |
| Filters | Search by gate, owner, module, status, severity, or due state. |
| Remediation cards | Each card explains the blocker, owner role, status, due date, and action. |
| Action button | Opens the source page that must be fixed. |
| Manage action | Assign owner, update due date, acknowledge, escalate, close, or ignore with reason. |
| Download audit | Exports launch audit evidence where allowed. |

## Common blockers

| Blocker | Source page |
| --- | --- |
| Missing employee role or manager role | Employees or Tenant Admin access |
| Organization master incomplete | Organization |
| Employee master warnings | Employees |
| Attendance or leave policy missing | Policies, Attendance, Leave |
| Payroll setup incomplete | Payroll Setup, Salary Setup, Payroll Rules, Statutory |
| Notification delivery unhealthy | Notifications or Notification Delivery |
| Public app URL or API base URL issue | Ops Health or platform operations |

## Workflow

1. Open **HR Admin > Launch Readiness**.
2. Filter to **Open** and **Blocker**.
3. Open the highest-risk item first.
4. Use the action button to reach the source page.
5. Fix the source issue.
6. Return to Launch Readiness.
7. Assign or close the remediation item.
8. Download audit evidence if signoff is required.

## Example: Clear a Missing Employee Role Blocker

Use this when Launch Readiness shows **Employee role missing**, **ESS access missing**, or **Workspace access incomplete**.

### Scenario

Accerio India has onboarded employee **Aditi Gupta**. The employee can log in, but lands on **Workspace Access** instead of ESS because no employee workspace role is available.

### Steps

1. Open **HR Admin > Launch Readiness**.
2. Filter **Severity** to **Blocker**.
3. Open the blocker named **Employee role** or **IAM workspace access**.
4. Click **Review workspace access**.
5. Confirm whether the user exists in Tenant Admin.
6. Open **Tenant Admin > Users** if role assignment is needed.
7. Assign the employee role or the correct ESS-access role.
8. Return to **HR Admin > Launch Readiness**.
9. Click **Manage** on the blocker.
10. Add a note such as `Employee role assigned to Aditi Gupta; ESS login verified.`
11. Close the blocker only after the employee reaches ESS successfully.

### Expected result

- The user no longer lands on Workspace Access.
- ESS opens for the employee.
- The launch gate count improves.
- Audit evidence shows who changed access.

## Example: Clear an Organization Master Blocker

Use this when Launch Readiness says **Organization master incomplete**, **Missing branch**, **Missing legal entity**, or **Missing department**.

### Scenario

Payroll cannot start because several employees are active but do not have legal entity, branch, department, or location mapped.

### Steps

1. Open **HR Admin > Launch Readiness**.
2. Open the organization blocker.
3. Click **Review organization** or **Review employees**.
4. In **Organization**, confirm legal entity, location, branch, department, and designation masters exist.
5. In **Employees**, filter for missing structure warnings.
6. Correct the employee records or import corrected rows.
7. Return to Launch Readiness.
8. Refresh or retry the gate check.
9. Close the blocker only when the source page shows no missing organization values.

### Expected result

- Employees have valid organization values.
- Employee Master readiness improves.
- Payroll readiness no longer blocks because of missing structure.

## Example: Assign Owner and Due Date

Use this when the issue cannot be solved immediately.

### Scenario

Notification delivery is blocked because SMTP credentials are not verified. HR cannot fix the provider credentials, so the task must move to IT or platform support.

### Steps

1. Open the notification delivery blocker.
2. Click **Manage**.
3. Set owner role to the team that can fix it, such as `platform-admin` or `support`.
4. Add due date.
5. Add escalation note: `SMTP provider verification pending; app delivery blocked.`
6. Save.

### Expected result

- The blocker remains visible.
- The correct owner appears on the remediation item.
- The decision is audit-ready.

## Example: Complete Go-Live Handoff Evidence

Use this before HR Admin confirms that the tenant can move from setup or pilot use to production operation.

### Scenario

Accerio India is ready for go-live. HR must prove that employee access, organization setup, leave, attendance, documents, notifications, payroll readiness, and operational health are ready or consciously accepted.

### Steps

1. Open **HR Admin > Launch Readiness**.
2. Filter to **Blocker** and **Open**.
3. Resolve or assign every blocker before signoff.
4. Filter to **Warnings**.
5. For each warning, either fix the source issue or add a clear accepted-risk note.
6. Open **Employees** and confirm active employees do not have unexplained structure, access, manager, bank, salary, or statutory warnings.
7. Open **Leave**, **Attendance**, and **Documents** and confirm no payroll-impacting backlog is silent.
8. Open **Notifications** and confirm invite, reset, workflow, and payroll-critical messages are delivered or explained.
9. Open **Ops Health** and confirm API, public app URL, notification delivery, provider queue, support access, and resilience signals are ready or assigned.
10. Open **Reports and Audit** and prepare the handoff evidence pack.
11. Return to **Launch Readiness** and close only the items whose source evidence is complete.
12. Record final handoff note with owner, date, remaining accepted risks, and next payroll period.

### Evidence to keep

| Evidence | Source |
| --- | --- |
| Open blockers are zero or accepted with reason | Launch Readiness |
| Active employee readiness snapshot | Employees or Reports |
| Organization readiness | Organization or Reports |
| Leave and attendance readiness | Leave, Attendance, Reports |
| Document verification status | Documents |
| Notification delivery health | Notifications or Ops Health |
| Payroll readiness summary | Payroll Control |
| Support access status | Ops Health or Tenant Admin Support Access |
| Final owner signoff | Launch Readiness note or audit evidence |

### Expected result

- No critical blocker is closed without fixing the source issue.
- Accepted risks have owner, reason, due date, and downstream impact.
- Tenant Admin, HR Admin, Payroll Admin, and Finance Manager know what is ready and what still needs follow-up.

## Negative Scenario: Source Issue Still Exists

Do not close a launch blocker only because someone has acknowledged it.

### Example

The blocker says **Manager role missing**. HR closes the remediation item, but the manager still has no MSS access. Employees now submit leave requests, but the manager cannot approve them.

### Correct action

Reopen the source page, fix the role or manager mapping, test the manager login, then close the blocker with evidence.

## Negative Scenario: Risk Is Ignored Without Evidence

Use **Ignore** only for a conscious business decision, not as a cleanup shortcut.

### Example

A warning says **Primary bank coverage 90%**. HR ignores the warning because payroll is not starting this week.

### Required note

Add a clear note such as:

`Payroll go-live postponed. Bank details for remaining employees will be collected before payroll input lock.`

Without that note, the next reviewer will not know whether the issue is accepted, postponed, or accidentally missed.

## Do not close a blocker if

- The source page still shows missing setup.
- No owner accepted the risk.
- The blocker affects payroll, employee access, notification delivery, or production safety.
- The item is ignored without a clear reason.

## FAQ

### Should every warning be fixed before payroll?

No. Warnings can move forward if the business accepts the risk and the warning does not affect payroll accuracy, access, compliance, or production safety. Add a note when accepting risk.

### Who owns launch readiness?

HR Admin owns HR data and operating readiness. Tenant Admin owns account access and roles. Platform Admin or support owns platform health, provider configuration, and tenant activation.

### Why does the blocker remain after I fixed the source page?

Refresh the page and check whether the source record is fully complete. Some blockers require both setup and access verification, such as employee profile plus user role.

### Can I use Launch Readiness as a daily task list?

Yes, but it is primarily a gate view. Use it to prioritize blockers, then fix the source issue in the owning module.

## Related guides

- [Go-Live Checklist](../launch/go-live-checklist.md)
- [Admin Handoff Guide](../launch/admin-handoff.md)
- [HR Dashboard](dashboard.md)
- [Ops Health](ops-health.md)
