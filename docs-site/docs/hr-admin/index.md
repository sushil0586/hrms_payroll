# HR Admin

HR Admin is the main operating workspace for HR, payroll, compliance, documents, and workforce workflows.

## On This Page

- [Start by task](#start-by-task)
- [Start by HR Admin menu](#start-by-hr-admin-menu)
- [Common workflows](#common-workflows)
- [Daily HR admin routine](#daily-hr-admin-routine)
- [Expected operating workflow](#expected-operating-workflow)
- [Practical examples](#practical-examples)
- [Negative scenarios](#negative-scenarios)
- [Troubleshooting](#troubleshooting)
- [HR Admin signoff checklist](#hr-admin-signoff-checklist)

## Start By Task

Use this table when you know what you want to finish but do not know which guide to open.

| I need to... | Open this guide | Then check |
| --- | --- | --- |
| Clear today's HR work queue | [Dashboard](dashboard.md) | [Task Recipes](task-recipes.md) |
| Prepare tenant setup before onboarding employees | [Onboarding Prerequisites](onboarding-prerequisites.md) | [Organization](organization.md) |
| Create or correct employee records | [Employees](employees.md) | [Organization](organization.md), [Documents](documents.md) |
| Build legal entity, branch, department, grade, or designation masters | [Organization](organization.md) | [Employees](employees.md) |
| Manage joining, transfer, promotion, probation, or exit | [Lifecycle](lifecycle.md) | [Employees](employees.md), [Payroll Control](payroll/payroll-control.md) |
| Review missing documents or rejected files | [Documents](documents.md) | [Reports and Audit](reports-audit.md) |
| Fix attendance exceptions before payroll | [Attendance](attendance.md) | [Payroll Control](payroll/payroll-control.md) |
| Configure leave policy or correct balances | [Leave](leave.md) | [Policies](policies.md) |
| Configure leave/attendance rules and approvals | [Policies](policies.md) | [Workflows](workflows.md) |
| Run payroll setup, inputs, calculation, review, outputs, or handoff | [Payroll Overview](payroll/index.md) | [Payroll Control](payroll/payroll-control.md) |
| Troubleshoot failed emails, invites, password resets, or workflow alerts | [Notifications](notifications.md) | [Ops Health](ops-health.md) |
| Import employees, balances, or setup data | [Imports](imports.md) | [Employees](employees.md), [Organization](organization.md) |
| Review reports, evidence, exports, or audit trail | [Reports](reports-audit.md) | [Audit](audit.md) |
| Prepare go-live or resolve release blockers | [Launch Readiness](launch-readiness.md) | [Ops Health](ops-health.md) |

## Start By HR Admin Menu

This mirrors the application navigation and explains each menu in plain language.

| HR Admin area | Menu | What the page owns | Use when |
| --- | --- | --- | --- |
| Command | [Dashboard](dashboard.md) | Daily action queue, readiness signals, launch guardrails. | You need the fastest view of what needs attention. |
| Command | [Launch Readiness](launch-readiness.md) | Release blockers and go-live checks. | A tenant is being prepared for production use. |
| Workforce | [Employees](employees.md) | Employee master, profile detail, access readiness, payroll readiness. | Employee data is missing, wrong, or blocking payroll. |
| Workforce | [Workforce Overview](workforce.md) | Workforce-level operating summary. | You need a broader workforce status view. |
| Workforce | [Organization](organization.md) | Legal entities, locations, branches, departments, grades, designations. | Dropdown/master data is missing or incorrect. |
| Workforce | [Lifecycle](lifecycle.md) | Joiners, transfers, promotions, probation, exits. | Employee movement needs workflow and evidence. |
| Workforce | [Documents](documents.md) | Required uploads, verification, rejection, expiry, reminders. | Employee documents need HR review. |
| Time and Leave | [Time and Leave Overview](time-leave.md) | Area summary for leave, attendance, and policy operations. | You are not sure whether to open Leave, Attendance, or Policies. |
| Time and Leave | [Attendance](attendance.md) | Attendance exceptions, regularization, payroll readiness. | Missing punch, shift, or payable-day issue exists. |
| Time and Leave | [Leave](leave.md) | Leave balances, balance transactions, approvals, imports. | Employee leave balance or request needs HR action. |
| Time and Leave | [Policies](policies.md) | Leave/attendance rules, effective dates, assignments. | Rules need setup or correction. |
| Time and Leave | [Workflows](workflows.md) | Approval templates, routing, fallback, escalation. | Requests are not reaching the right approver. |
| Payroll | [Payroll Overview](payroll/index.md) | Payroll navigation hub. | You need to decide which payroll page to open. |
| Operations | [Notifications](notifications.md) | Templates, events, delivery queue, failed delivery, diagnostics. | A user did not receive a message or alert. |
| Operations | [Imports](imports.md) | CSV preview, validation, commit, import evidence. | Bulk data needs upload or correction. |
| Operations | [Ops Health](ops-health.md) | API, delivery, provider, support, and launch health. | Something operational is failing or needs escalation. |
| Reports and Audit | [Reports](reports-audit.md) | Operational reports, payroll evidence, exports. | You need evidence or totals. |
| Reports and Audit | [Audit](audit.md) | Action trail and sensitive change evidence. | You need who changed what and when. |

## Common Workflows

These workflow guides connect multiple HR Admin pages into one end-to-end outcome.

| Workflow | Start here | Use it when |
| --- | --- | --- |
| [Employee to Payroll](../workflows/employee-to-payroll.md) | Employees | A new employee must be payroll-ready. |
| [Leave and Attendance to Payroll](../workflows/leave-attendance-to-payroll.md) | Attendance or Leave | Leave/attendance must be clean before payroll inputs. |
| [Documents to Verification](../workflows/documents-to-verification.md) | Documents | Employee uploads need verification or rejection. |
| [Notification Failure to Recovery](../workflows/notification-failure-to-recovery.md) | Notifications | Email/in-app delivery failed. |
| [Payroll Close to Finance Handoff](../workflows/payroll-close-to-finance-handoff.md) | Payroll Control | Payroll must move from readiness to finance handoff. |

## Main Purpose

Use HR Admin to:

- Maintain employee and organization data.
- Manage joining, movement, probation, and exit workflows.
- Manage attendance and leave operations.
- Run payroll setup, inputs, calculation, review, output, and handoff.
- Verify documents and statutory declarations.
- Review reports, notifications, imports, audit, and launch readiness.

## Menu Guide

| Area | Menus | Purpose |
| --- | --- | --- |
| Command | Dashboard, Launch Readiness | Daily control center and release blockers. |
| Workforce | Employees, Lifecycle, Documents | Employee records, employee events, and document verification. |
| Time and Leave | Attendance, Leave, Policies | Attendance records, leave balances, leave rules, and assignments. |
| Payroll | Payroll Control, Payroll Setup, Salary Setup, Payroll Rules, Statutory, Providers, Adjustments & Settlements | Payroll configuration and payroll close. |
| Compliance | Audit | Action evidence and compliance trail. |
| Insights | Reports | Operational, payroll, statutory, and compliance reports. |
| Setup | Organization, Workflows | Organization masters and approval templates. |
| Operations | Notifications, Imports, Ops Health | Delivery queues, import history, and health signals. |

## Detailed Guides

| Guide | Use it for |
| --- | --- |
| Dashboard | Daily action queue, tenant readiness, and launch audit. |
| Employees | Employee directory, employee detail, imports, and readiness. |
| Lifecycle | Joiners, movements, probation, exits, owners, and status changes. |
| Organization | Legal entities, locations, branches, departments, grades, and designations. |
| Attendance | Attendance records, exceptions, regularization, and payroll readiness. |
| Leave | Leave balances, balance transactions, approvals, and imports. |
| Policies | Leave policies, attendance rules, assignments, and effective dates. |
| Payroll | Payroll control, setup, salary, rules, inputs, calculation, review, outputs, and handoff. |
| Documents | Document requirements, verification, rejection, reminders, and compliance. |
| Notifications | Templates, events, failed delivery queues, retries, and diagnostics. |
| Reports and Audit | Operational reports, evidence, exports, and audit trail. |
| Workflows | Approval templates, routing, owners, escalations, and activation. |

## Daily HR admin routine

1. Open **Dashboard**.
2. Review Action Queue.
3. Resolve payroll, lifecycle, document, attendance, notification, and launch blockers.
4. Open the relevant menu from the action button.
5. Complete the workflow.
6. Return to Dashboard and confirm the count reduced.

## Expected operating workflow

Use HR Admin as a control center, not as one large data-entry page.

1. Start with the signal: open **Dashboard** or the relevant menu badge.
2. Open the focused page that owns the issue.
3. Filter the list to the affected employee, workflow, period, or status.
4. Open the detail, modal, or drilldown before making a decision.
5. Save the change with notes or evidence when the decision affects payroll, access, compliance, or employee status.
6. Return to the source queue and confirm the count, status, or readiness signal changed.

Expected result:

- HR users know which screen owns the action.
- The same issue is not fixed from multiple places.
- Audit trail remains clear for payroll, compliance, and launch reviews.

## Practical examples

### Example 1: New employee is ready for payroll

1. Open **Organization** and confirm legal entity, branch, department, grade, and designation exist.
2. Open **Employees** and create or import the employee.
3. Confirm manager, work email, joining date, bank account, salary setup, and statutory identifiers.
4. Open **Leave** and confirm leave policy assignment and opening balance.
5. Open **Payroll Control** and confirm the employee no longer appears in blocker lists.

Expected result: the employee can appear in payroll without manual correction during payroll close.

### Example 2: Payroll is blocked before cutoff

1. Open **Dashboard**.
2. Select the payroll readiness action.
3. Open the blocker category, such as missing bank account or missing legal entity.
4. Correct the source record from Employees, Organization, Salary Setup, or Payroll Setup.
5. Return to **Payroll Control** and verify blocker count reduced.

Expected result: payroll proceeds only after source data is corrected.

### Example 3: Notification delivery failed

1. Open **Notifications** from Dashboard or Operations.
2. Filter by failed or retry-capped messages.
3. Open review detail and check channel, recipient, template, source workflow, attempts, and error.
4. Retry only when the recipient, template, and provider configuration are correct.
5. Escalate provider or SMTP issues to admin/technical owner.

Expected result: users do not blindly retry bad notifications.

## Negative scenarios

| Issue | Why it matters | Correct action |
| --- | --- | --- |
| Employee is created before organization masters exist. | Employee profile may miss branch, department, or reporting structure. | Configure organization masters first or correct them immediately after import. |
| Payroll setup is changed after inputs are locked. | Locked payroll may not reflect source changes. | Create a controlled rerun or adjustment with audit note. |
| Manager mapping is missing. | MSS approvals and reporting lines may not work. | Fix manager in Employee Master and retest approvals. |
| Document is accepted without checking file content. | Compliance evidence becomes unreliable. | Open preview/download and record rejection reason when unclear. |
| Notification failure is ignored. | Employees/managers may miss critical requests. | Review Notifications and source workflow before signoff. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Page shows load issue | Backend auth, tenant access, or API issue. | Retry workspace, then verify user role and backend health. |
| Action count does not reduce | Source workflow was not completed or cache/page is stale. | Refresh, reopen source page, and check audit trail. |
| Button is disabled | Required data, status, permission, or previous step is missing. | Read the surrounding status cards and fix the prerequisite. |
| Search does not find the record | Filter scope is limited to current page/module. | Clear filters, use exact employee code/email, or open the owning menu. |
| User lands on workspace access page | Role, employee profile, or workspace assignment is incomplete. | Tenant admin/HR admin must assign correct access and employee mapping. |

## Important checks

- Keep employee master data clean before payroll.
- Complete organization masters before adding many employees.
- Verify bank, statutory, attendance, and leave data before payroll close.
- Use reports before approving final payroll.
- Keep audit evidence for sensitive changes.

## HR Admin signoff checklist

Before considering HR Admin ready for a tenant:

| Check | Expected result |
| --- | --- |
| Dashboard opens with real data. | Action queue, readiness, and launch guardrails are visible. |
| Employee master is complete. | Active employees have department, manager, bank, statutory, and access readiness where applicable. |
| Organization masters are configured. | Legal entities, locations, branches, departments, grades, designations, and cost centers exist. |
| Policies and workflows are assigned. | Leave, attendance, approval, and document rules are effective-dated and active. |
| Payroll readiness is clean. | Blockers are resolved or deliberately documented before payroll inputs. |
| Notifications are healthy. | Failed, retry-capped, and undelivered messages are reviewed. |
| Audit trail is usable. | Sensitive actions show who changed what, when, and why. |
