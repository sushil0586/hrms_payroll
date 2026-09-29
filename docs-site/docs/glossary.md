# Glossary and Status Guide

Use this page when a screen shows a term or status and you are not sure what it means.

## Common status words

| Status | Meaning | Typical next action |
| --- | --- | --- |
| Ready | The item passed the required check. | Continue to the next step. |
| Warning | The item can continue, but someone should review it. | Read the warning and decide whether to fix or accept it. |
| Blocked | The item cannot safely continue. | Open the linked source page and fix the blocker before proceeding. |
| Pending | Waiting for user action, approval, processing, or review. | Check who owns the next step. |
| Submitted | Sent for review or processing. | Wait unless the reviewer asks for changes. |
| Approved | Accepted by the reviewer or workflow owner. | Continue if all other checks are clear. |
| Rejected | Declined by the reviewer or validation rule. | Read the reason, correct the source, and resubmit if allowed. |
| Published | Output is visible to the intended audience. | Review/download only if the output is final. |
| Locked | The record or payroll input is frozen for control. | Do not edit directly; use a correction, adjustment, or new version. |
| Failed | Delivery, processing, or validation did not complete. | Open detail, check reason, and retry or escalate. |
| Retry capped | The system retried and stopped after the configured limit. | Review the failure and use manual follow-up or support escalation. |
| Active | User, tenant, role, or record is usable. | No action unless the access should be removed. |
| Inactive | User, role, or record is not available for normal use. | Reactivate only when business approval exists. |

## Workflow words

| Term | Meaning |
| --- | --- |
| Source data | The original record used by another workflow, such as employee, bank, salary, attendance, leave, document, or tax data. |
| Readiness | A check that confirms whether source data is complete enough for the next workflow. |
| Blocker | A missing or unsafe condition that must be fixed before proceeding. |
| Exception | A known issue that needs review, acceptance, correction, or escalation. |
| Handoff | A controlled transfer of responsibility from one owner to another, such as payroll to finance. |
| Evidence | Audit-friendly proof of what happened, who acted, when it happened, and what output was produced. |
| Manifest | A structured list of generated artifacts and evidence references. |
| Snapshot | A frozen copy of source data used for payroll or audit consistency. |
| Line trace | A drilldown showing how a calculated amount or record was produced. |
| Provider | An external or internal delivery system, such as email, payroll filing, payment, or integration provider. |
| Callback | A response received from a provider after a submitted job or delivery attempt. |
| Dead-lettered | A delivery or job failed beyond normal retry and needs manual review. |

## Workspace terms

| Term | Meaning |
| --- | --- |
| Platform Admin | Accerio operator workspace for tenants, leads, templates, platform permissions, and launch gates. |
| Tenant Admin | Customer account workspace for users, roles, plan, support access, trust audit, settings, and security. |
| HR Admin | HR operations workspace for employees, organization, lifecycle, documents, attendance, leave, payroll, reports, and audit. |
| ESS | Employee Self Service for payslips, documents, declarations, and personal notifications. |
| MSS | Manager Self Service for team approvals and manager notifications. |
| Finance Manager | Finance workspace for payout, bank advice, statutory evidence, provider status, and audit close. |
| Workspace Access | A fallback page shown when login works but no usable workspace role is assigned. |

## Payroll terms

| Term | Meaning |
| --- | --- |
| Payroll Control | Readiness command page for payroll blockers, warnings, employees, issues, and evidence. |
| Payroll Setup | Payroll calendars, periods, pay groups, and employee pay group assignments. |
| Salary Setup | Salary structures, components, CTC, and employee salary assignment setup. |
| Payroll Rules | Formula, version, and rule trace setup used by payroll calculation. |
| Payroll Inputs | Locked employee, organization, salary, attendance, leave, lifecycle, document, bank, and statutory snapshots. |
| Payroll Calculations | Draft payroll computation, issue register, line count, gross, deductions, and net pay. |
| Payroll Review | Exception review and approval step before outputs are generated. |
| Payroll Outputs | Payslips, payroll register, bank advice, statutory files, and audit artifacts. |
| Payroll Handoff | Final delivery and evidence stage before Finance Manager payout/compliance work. |

## Action words

| Action | Meaning |
| --- | --- |
| Apply | Refresh filters or apply selected setup/configuration. |
| Review | Open details before deciding. |
| Approve | Accept a request or workflow decision. |
| Reject | Decline a request with a reason. |
| Retry | Attempt a failed delivery or provider job again. |
| Export | Download data or evidence for review outside the page. |
| Publish | Make an output visible to employees, finance, or another intended audience. |
| Activate | Make a tenant, user, role, or workflow usable. |
| Suspend | Temporarily disable access. |
| Revoke | Stop previously granted access, usually support access. |

## If you are unsure what to do

1. Read the status message on the screen.
2. Open the linked source page if one is shown.
3. Search this guide for the status or term.
4. Check the matching workspace guide.
5. Stop if the page says blocked, locked, failed, or retry capped.
6. Escalate with the page name, record reference, status, and screenshot if needed.

