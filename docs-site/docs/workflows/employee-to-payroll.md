# Employee to Payroll

Use this workflow when a new employee or corrected employee must become payroll ready.

## Outcome

The employee is ready for payroll because identity, organization structure, manager, access, salary, bank, statutory, leave, and attendance prerequisites are complete.

![Employee directory and detail](../assets/screenshots/hr-admin/employees-directory-detail.png)

## Owners

| Step | Primary owner | Supporting owner |
| --- | --- | --- |
| Create or correct employee profile | HR Admin | Tenant Admin for access roles |
| Confirm manager chain | HR Admin | Manager |
| Add salary and payroll mapping | Payroll Admin | HR Admin |
| Add bank and statutory data | HR Admin or Payroll Admin | Employee if self-service upload is enabled |
| Resolve readiness blockers | HR Admin | Payroll Admin |

## Before You Start

Confirm these are available:

- Legal entity, branch, location, business unit, department, designation, grade, and manager choices.
- Employee code or employee number policy.
- Work email or invite email.
- Salary structure or CTC details.
- Bank account details if payroll is expected.
- Statutory identifiers or declaration requirements used by the organization.

If any organization choice is missing, open **Organization** before creating or importing the employee. It is faster to fix the master once than to repair many failed employee rows later.

## Step 1: Create or Find the Employee

1. Open **HR Admin > People > Employees**.
2. Search by name, employee code, email, or manager.
3. If the employee exists, open the employee detail panel.
4. If the employee does not exist, select **New employee**.
5. Enter identity details and save.

Check before moving ahead:

- Employee name is spelled correctly.
- Work email and personal email are not swapped.
- Employee status is correct, such as active, on notice, inactive, or exited.
- Date of joining is correct because payroll period eligibility can depend on it.

## Step 2: Complete Organization Structure

Open the employee detail and confirm:

| Field | Why it matters |
| --- | --- |
| Legal entity | Required for payroll, statutory reporting, and finance posting. |
| Branch | Used for location-specific statutory, reporting, and attendance rules. |
| Location | Used for attendance, HRA/location logic, and workplace reporting. |
| Business unit | Helps payroll grouping, reports, and cost allocation. |
| Department | Used for manager review, reports, and approval routing. |
| Designation and grade | Used for policy eligibility and salary bands. |
| Manager | Required for approvals and manager chain readiness. |

Do not proceed if:

- The employee shows **Structure Review**.
- Manager chain is missing or points to the wrong person.
- Legal entity or branch is blank.

If the correct department, branch, location, designation, or employee type is not available, create it in **Organization** and then return to the employee record.

## Step 3: Confirm Access Readiness

1. Check the employee readiness badges.
2. If access is missing, open the employee actions or Tenant Admin user access flow.
3. Assign the correct workspace access only if the employee needs to log in.
4. Confirm the assigned role matches the person’s responsibility.
5. Confirm the setup email is queued or delivered in **Notifications**.
6. Ask the user to complete the password setup link and sign in once.

Typical access choices:

| User need | Access to assign |
| --- | --- |
| Employee self-service only | ESS access |
| Manager approvals | MSS access |
| HR operations | HR Admin access |
| Payroll finance review | Finance Manager access |
| Account administration | Tenant Admin access |

Do not proceed if:

- Active employee requires ESS but shows no access.
- A manager has direct reports but no manager access.
- Admin access is assigned without approval.
- The invite/setup email is failed, retry capped, or missing for a newly created access user.

Access email behavior:

| Situation | Expected behavior |
| --- | --- |
| HR Admin creates employee access | A secure setup email is queued for the employee email address. |
| Tenant Admin invites a user | A secure setup email is queued for the invited user. |
| User forgets password | Password reset creates a secure setup/reset email. |
| Email does not arrive | Check Notifications by recipient email, then follow access troubleshooting. |
| Old access existed before invite automation | Resend setup/reset email rather than recreating the employee. |

## Step 4: Complete Salary and Payroll Setup

1. Open **Payroll > Salary Setup**.
2. Search the employee or use the assignment tab.
3. Assign the salary structure, CTC, effective date, and pay group.
4. Save and return to the employee or Payroll Control readiness page.

Check:

- Effective date is on or before the payroll period start if the employee should be paid this period.
- Salary component structure is correct.
- Pay group matches the payroll calendar and period.
- One-time or recurring adjustments are handled separately through payroll adjustments.

Do not proceed if:

- Salary assignment is missing.
- Employee appears in the wrong pay group.
- Salary effective date is after the payroll period but the employee is expected in the current payroll.

## Step 5: Add Bank and Statutory Details

1. Open the employee payroll or bank detail area.
2. Add the primary bank account.
3. Mark one account as primary if multiple accounts exist.
4. Add statutory details required by the tenant.
5. Save and recheck payroll readiness.

Check:

- Bank account number and IFSC are correct.
- Primary bank account is active.
- Statutory details match legal entity requirements.
- Any missing declarations are visible to the employee in ESS if self-service is expected.

## Step 6: Check Leave and Attendance Impact

1. Open **Leave** and search the employee.
2. Confirm leave balances and pending leave records.
3. Open **Attendance** and check the payroll period.
4. Close pending regularizations before payroll inputs are locked.

Payroll impact:

- Unapproved leave can change payable days.
- Attendance exceptions can block payroll.
- Missing shifts or absent records can create warnings or blockers.

## Step 7: Confirm Payroll Readiness

1. Open **Payroll > Payroll Control**.
2. Search or filter for the employee under readiness details.
3. Confirm the employee is not blocked.
4. If blocked, open the issue and fix the source page.
5. Refresh Payroll Control and confirm the blocker count reduced.

![Payroll Control summary](../assets/screenshots/payroll/payroll-control-summary.png)

## Completion Checklist

| Check | Expected result |
| --- | --- |
| Employee profile | Active and correct identity details |
| Organization structure | Legal entity, branch, location, department, designation, grade complete |
| Manager chain | Ready or intentionally not applicable |
| Access | ESS/MSS/Admin access provisioned only where needed |
| Salary | Salary structure and CTC assigned |
| Bank | Primary bank account active |
| Statutory | Required details or declarations complete |
| Leave and attendance | No payroll-blocking exceptions |
| Payroll Control | Employee no longer appears as blocked |

## Related Pages

- [Employees](../hr-admin/employees.md)
- [Organization](../hr-admin/organization.md)
- [Salary Setup](../hr-admin/payroll/salary-setup.md)
- [Payroll Control](../hr-admin/payroll/payroll-control.md)
- [Leave](../hr-admin/leave.md)
- [Attendance](../hr-admin/attendance.md)
