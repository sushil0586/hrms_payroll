# HR Admin Workforce

Workforce pages manage employee records and employee lifecycle operations.

## On This Page

- [Workforce Quick Navigation](#workforce-quick-navigation)
- [Employees](#employees)
- [Lifecycle](#lifecycle)
- [Organization](#organization)
- [Workforce operating sequence](#workforce-operating-sequence)
- [Practical examples](#practical-examples)
- [Negative scenarios](#negative-scenarios)
- [Troubleshooting](#troubleshooting)
- [Signoff checklist](#signoff-checklist)

## Workforce Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Create or fix an employee profile | [Employees](#employees) | [Workforce operating sequence](#workforce-operating-sequence) |
| Run transfer, promotion, probation, or exit | [Lifecycle](#lifecycle) | [Practical examples](#practical-examples) |
| Add or fix structure masters | [Organization](#organization) | [Negative scenarios](#negative-scenarios) |
| Prepare workforce for payroll | [Workforce operating sequence](#workforce-operating-sequence) | [Signoff checklist](#signoff-checklist) |

## Employees

### Purpose

Use **Employees** to create, search, review, and maintain employee master records.

### Use this page when

- A new employee joins.
- Employee personal, work, manager, bank, or access information changes.
- Payroll readiness shows employee master warnings.
- You need to check whether an employee has login access.

### What you can do

- Search employee records.
- Filter by department, manager review, readiness, and page size.
- Open employee details.
- Create a new employee.
- Import employee data in bulk.
- Review access readiness and manager chain readiness.

### Important fields

| Field | Meaning |
| --- | --- |
| Employee code | Unique employee identifier. |
| Department | Employee's department for reporting and payroll grouping. |
| Designation | Employee's role title. |
| Manager | Reporting manager used for MSS and approvals. |
| Employment status | Active, inactive, notice, or exited. |
| Access status | Whether the employee has login access. |

### Checks before saving

- Employee code is unique.
- Work email is correct.
- Department, branch, location, and manager are mapped.
- Bank and statutory details are available if payroll is required.

## Lifecycle

### Purpose

Use **Lifecycle** to manage onboarding, movement, probation, and exit queues.

### What you can do

- Review joiner tasks.
- Track employee movements.
- Manage probation reviews.
- Process exits.
- Review owners and due dates.

### Good practice

Use lifecycle queues instead of editing employee data directly when the change requires approval or evidence.

## Organization

### Purpose

Use **Organization** to maintain the structural masters used by employees and payroll.

### Common masters

- Legal entities
- Locations
- Branches
- Business units
- Departments
- Cost centers
- Grades
- Designations
- Employee types

### Good practice

Create organization masters before bulk employee import. This prevents missing department, branch, location, and payroll grouping errors.

## Workforce operating sequence

For a new tenant or a large employee update, use this order:

1. Create or validate Organization masters.
2. Create or import Employees.
3. Review structure, access, and manager readiness.
4. Complete salary, bank, and statutory setup for payroll employees.
5. Use Lifecycle workflows for joiners, movements, exits, and probation.
6. Return to Payroll Control to confirm blockers reduced.

This sequence avoids repeated maintenance because employee records depend on organization masters, and payroll readiness depends on both.

## Practical examples

### Onboard a new employee

1. Confirm legal entity, branch, location, department, grade, designation, and employee type already exist.
2. Create the employee record with unique employee code and correct joining date.
3. Add work email, manager, department, designation, and employment status.
4. Add bank and statutory details if payroll is required.
5. Create or assign workspace access when the employee should use ESS.
6. Confirm Employee Master readiness badges are green or explained.
7. Send invite only after the employee has a valid route into ESS.

Expected result: the employee can login to ESS and appears correctly in payroll readiness.

### Transfer an employee

1. Use Lifecycle or Movement when approval/evidence is required.
2. Set effective date.
3. Change department, manager, location, branch, or designation as needed.
4. Confirm manager chain readiness.
5. Verify payroll grouping after the movement.

Expected result: reporting, approvals, and payroll grouping use the new structure from the effective date.

### Prepare employee master before payroll

1. Filter employees by readiness warnings.
2. Fix missing legal entity, branch, department, designation, manager, bank, and statutory fields.
3. Confirm active employees have access only when required.
4. Return to Payroll Control and verify blocker reduction.

Expected result: payroll source data is complete before inputs are locked.

## Negative scenarios

| Issue | Impact | Fix |
| --- | --- | --- |
| Employee code duplicated. | Imports and payroll mapping fail. | Use unique employee code. |
| Work email wrong. | Invite/reset/payslip notifications go to wrong inbox. | Correct email before sending invite. |
| Manager missing. | Leave and attendance approvals do not route. | Assign manager before ESS/MSS testing. |
| Department/branch missing. | Payroll readiness and reporting are blocked. | Create master and update employee. |
| Employee has login but no profile route. | User lands on Workspace Access. | Link user to role/profile and workspace. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Employee cannot login to ESS | No user access, inactive user, or no employee profile route. | Check Tenant Admin user, employee profile, and access status. |
| Manager cannot see employee | Manager mapping or MSS access is missing. | Fix reporting manager and manager workspace access. |
| Payroll says bank missing | Employee bank details incomplete or not primary. | Update bank record and recheck payroll readiness. |
| Employee not in payroll scope | Employment status, joining date, pay group, or legal entity is wrong. | Correct source fields and regenerate/check payroll readiness. |
| Bulk import fails | Organization master code mismatch. | Create/update masters before import. |

## Signoff checklist

| Check | Expected result |
| --- | --- |
| Organization masters exist. | No missing department, branch, location, or legal entity. |
| Employee identity is complete. | Code, name, email, status, and dates are correct. |
| Manager chain is valid. | MSS approvals can route. |
| Payroll fields are complete. | Bank, statutory, legal entity, and pay grouping are ready. |
| Access is intentional. | Users land in the correct workspace after login. |
