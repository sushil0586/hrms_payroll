# End-to-End Workflows

Use this section when you want to complete a real business process across multiple workspaces.

Most users do not think in pages. They think in outcomes:

- A new employee should become payroll ready.
- Payroll should close cleanly and reach finance.
- Failed notifications should be retried with evidence.
- Employee documents should move from request to verified.
- Leave and attendance should be reflected correctly in payroll.

These guides connect the pages, buttons, checks, and handoffs needed to finish those outcomes.

## Workflow Map

| Workflow | Primary owner | Supporting roles | Final outcome |
| --- | --- | --- | --- |
| Employee to Payroll | HR Admin | Manager, ESS, Payroll Admin | Employee is structurally, access, salary, bank, statutory, and payroll ready. |
| Payroll Close to Finance Handoff | Payroll Admin | HR Admin, Finance Manager | Payroll is reviewed, outputs are generated, and finance evidence is ready. |
| Notification Failure to Recovery | HR Admin | Tenant Admin, Support Agent | Failed messages are triaged, retried, or recorded with audit notes. |
| Documents to Verification | HR Admin | Employee, Manager | Required documents are uploaded, reviewed, accepted, rejected, or escalated. |
| Leave and Attendance to Payroll | HR Admin | Manager, Employee | Leave and attendance exceptions are closed before payroll inputs lock. |

## How to Use These Guides

1. Start from the workflow that matches your current task.
2. Follow the steps in order.
3. Open the linked role guide when you need page-level detail.
4. Stop at any **Do not proceed if** condition.
5. Capture audit notes before moving to the next owner.

## Common Handoff Rules

| Handoff | Rule |
| --- | --- |
| Platform Admin to Tenant Admin | Tenant must be created, active, and have admin access before account setup starts. |
| Tenant Admin to HR Admin | HR roles and access must exist before HR setup can be completed. |
| HR Admin to Payroll Admin | Employee, organization, salary, bank, leave, and attendance source data must be ready. |
| Payroll Admin to Finance Manager | Payroll review must be approved, outputs generated, and exceptions explained. |
| Finance Manager to Audit | Bank, statutory, provider, and handoff evidence should be available for the run. |

## Evidence to Keep

Keep evidence when a workflow affects pay, access, compliance, or employee records.

| Evidence | Where it usually appears |
| --- | --- |
| Source record status | HR Admin pages such as Employees, Organization, Leave, Attendance, Documents |
| Payroll readiness decision | Payroll Control |
| Input snapshot and lock state | Payroll Inputs |
| Calculation totals and line trace | Payroll Calculations |
| Review exceptions | Payroll Review |
| Published output artifacts | Payroll Outputs |
| Finance handoff files | Payroll Handoff and Finance Manager |
| Notification delivery attempts | Notifications and Notification Delivery |
| Audit trail | Reports and Audit, Trust Audit, Finance Manager Audit |

## Related Guides

- [Glossary and Status Guide](../glossary.md)
- [Workspaces and Roles](../getting-started/workspaces-and-roles.md)
- [HR Admin Overview](../hr-admin/index.md)
- [Payroll Overview](../hr-admin/payroll/index.md)
- [Finance Manager Overview](../finance-manager/index.md)
- [Tenant Admin Overview](../tenant-admin/index.md)
