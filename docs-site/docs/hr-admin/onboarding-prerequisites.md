# Employee Onboarding Prerequisites

Use this checklist before creating or importing employees. It prevents the common situation where employees are created successfully but later show missing structure, access, leave, attendance, payroll, or document blockers.

## Purpose

Before employee onboarding, HRMS should already know:

- Which company and branch employ the person.
- Which department, designation, grade, and manager apply.
- Whether the person needs ESS, MSS, HR Admin, Payroll, Finance, or Tenant Admin access.
- Which leave, attendance, document, salary, statutory, and payroll rules apply.
- Which notifications should be sent when access or workflow actions happen.

If these items are not configured first, onboarding becomes repetitive maintenance work.

## Recommended Sequence

| Order | Setup Area | Why It Comes First | Documentation Status |
| --- | --- | --- | --- |
| 1 | Organization masters | Employees need legal entity, branch, location, department, grade, designation, cost center, and employee type values. | Complete. |
| 2 | Tenant users and roles | HR, payroll, managers, and admins need correct access before operating setup. | Complete. |
| 3 | Manager structure | Leave, attendance, lifecycle, and MSS approvals depend on reporting manager. | Complete. |
| 4 | Leave setup | Employees need leave types, policies, assignments, and opening balances before applying leave. | Complete. |
| 5 | Attendance setup | Employees need shift, holiday, attendance policy, and regularization rules before attendance works correctly. | Complete. |
| 6 | Document requirements | Employees need to know which documents to upload and HR needs verification rules. | Complete. |
| 7 | Policies and workflows | Employees and managers need clear rules, approval routing, fallback owners, and escalation. | Complete. |
| 8 | Payroll setup | Payroll calendar, period, pay group, and assignment decide payroll scope. | Launch-grade guide complete. |
| 9 | Salary setup | Employees need salary structure, CTC, component split, and effective date before payroll readiness. | Launch-grade guide complete. |
| 10 | Statutory setup | India payroll needs PAN, PF, ESIC, PT, TDS, registration, state, and declaration readiness. | Launch-grade guide complete. |
| 11 | Notifications | Invite, password reset, approval, document rejection, payroll, and reminder messages must deliver. | Complete. |

## 1. Organization Masters

Open **HR Admin > Organization** before adding employees.

Confirm these masters exist:

| Master | Example | Why It Matters |
| --- | --- | --- |
| Legal entity | `Accerio India Pvt Ltd` | Payroll employer, statutory reporting, finance handoff. |
| Location | `Bengaluru` | Attendance, HRA/city rules, reports. |
| Branch | `Bengaluru HO` | Payroll readiness, state-specific rules, local policies. |
| Business unit | `Product` | Reporting and cost allocation. |
| Department | `People Operations` | Employee filtering, approvals, reports. |
| Cost center | `CC-HR-001` | Finance and payroll allocation. |
| Grade | `G5` | Salary bands, policy eligibility. |
| Designation | `Assistant Manager` | Employee profile and reporting. |
| Employee type | `Full Time` | Policy eligibility, payroll scope, benefits. |

Do not start bulk import if required organization codes are missing. Fix the master once instead of repairing many employee records later.

Related guide: [Organization](organization.md)

## 2. Users, Roles, and Workspace Access

Before employee onboarding, decide who operates setup and who can approve work.

| Role Need | Recommended Access |
| --- | --- |
| HR operations | HR Admin |
| Employee self-service | ESS |
| Manager approvals | MSS |
| Payroll setup and close | Payroll Admin or HR Admin Payroll permissions |
| Finance handoff | Finance Manager |
| Account administration | Tenant Admin |

Check:

- HR Admin user can sign in.
- Tenant Admin can manage users and roles.
- Managers who need approvals have MSS access.
- Employees who need self-service have ESS access.
- Invite and password setup emails are delivering.

Related guides:

- [Tenant Admin Users](../tenant-admin/users.md)
- [Tenant Roles](../tenant-admin/roles.md)
- [Workspaces and Roles](../getting-started/workspaces-and-roles.md)
- [Access Issues](../troubleshooting/access.md)

### Example: Create the HR Admin Operator

Use this before the first employee import.

1. Open **Tenant Admin > Users**.
2. Search the HR operator email to avoid duplicate users.
3. Create or invite the user.
4. Assign the HR Admin role or the tenant's approved HR operations role.
5. Confirm invite email is delivered in **HR Admin > Notifications**.
6. Ask the user to sign in.
7. Confirm the user lands on **HR Admin**, not Workspace Access.

Expected result:

- User can open Employees, Organization, Leave, Attendance, Documents, and Reports according to role.
- User cannot access Tenant Admin unless explicitly assigned.

### Example: Give an Employee ESS Access

Use this after the employee master record exists.

1. Open **HR Admin > Employees**.
2. Select the employee.
3. Confirm work email is correct.
4. Open employee access or Tenant Admin user assignment.
5. Assign ESS/self-service access.
6. Send or resend invite if required.
7. Ask the employee to sign in.

Expected result:

- Employee lands on **ESS**.
- Employee sees only their own Leave, Payslips, Attendance, Tax Declarations, Notifications, and Documents.

### Example: Give a Manager MSS Access

Use this before testing leave or attendance approvals.

1. Confirm the manager has an active employee profile.
2. Confirm at least one direct report points to that manager.
3. Assign MSS access from employee access or Tenant Admin user roles.
4. Ask the manager to sign in.
5. Open **MSS > Approvals**.

Expected result:

- Manager can see team approvals and direct reports.
- Employee requests route to this manager.

### Negative Scenario: User Lands On Workspace Access

Cause:

- User authentication exists, but role, tenant membership, ESS/MSS profile, or employee link is missing.

Fix path:

1. Confirm the user is active in **Tenant Admin > Users**.
2. Confirm correct role is assigned.
3. For ESS/MSS, confirm an active employee profile is linked to the same email.
4. For MSS, confirm direct reports exist.
5. Ask the user to sign out and sign in again.

Do not create a duplicate user to fix this. Duplicate users create support and audit confusion.

## 3. Manager Structure

Manager structure must be ready before leave, attendance, lifecycle, and approvals are tested.

Minimum checks:

| Check | Expected Result |
| --- | --- |
| Employee has manager | Manager is active and correct. |
| Manager has MSS access | Manager can open MSS and approval queues. |
| Manager chain is valid | Employee does not show manager chain readiness warning. |
| Escalation owner exists | HR or fallback owner exists for missing manager cases. |

If manager mapping is missing, employee requests may be created but approvals will fail or stay pending.

Related guides:

- [Employees](employees.md)
- [MSS Approvals](../mss/approvals.md)

### Example: Build a Manager Chain For Approval Testing

Scenario: Riya Sharma reports to Karan Mehta. Karan should approve Riya's leave and attendance corrections.

1. Open **HR Admin > Employees**.
2. Confirm Karan Mehta exists as an active employee.
3. Confirm Karan has work email and MSS access.
4. Open Riya Sharma's employee profile.
5. Set reporting manager to Karan Mehta.
6. Save the employee record.
7. Open **Employees** filter or detail view and confirm direct report count.
8. Ask Karan to open **MSS > Approvals** after Riya submits a request.

Expected result:

- Riya's requests route to Karan.
- Karan sees Riya in MSS.
- HR Admin readiness does not show manager chain warnings.

### Negative Scenario: Approval Stuck Because Manager Is Missing

Symptoms:

- Employee can submit leave or attendance request, but no manager can approve.
- MSS queue is empty for the expected manager.
- Employee detail shows manager chain warning.

Fix path:

1. Open employee profile and assign reporting manager.
2. Confirm manager is active.
3. Confirm manager has MSS access.
4. Confirm workflow has HR fallback for manager-missing cases.
5. Retry or reassign the pending approval according to workflow rules.

## 4. Leave Setup

Before employees apply leave, configure:

| Setup | Example |
| --- | --- |
| Leave types | Earned Leave, Casual Leave, Sick Leave |
| Leave policies | 18 earned leaves/year, monthly accrual, manager approval |
| Policy assignments | Assign policy to legal entity, branch, department, or employee |
| Opening balances | Migrated leave balance for existing employees |
| Approval route | Manager first, HR fallback |

Pilot test:

1. Assign Earned Leave to one employee.
2. Add opening balance if needed.
3. Ask employee to apply from ESS.
4. Ask manager to approve from MSS.
5. Confirm Payroll Control has no leave blocker.

Related guide: [Leave Management](leave.md)

## 5. Attendance Setup

Before attendance is trusted, configure:

| Setup | Example |
| --- | --- |
| Shift | `09:30 - 18:30` general shift |
| Weekly off | Saturday/Sunday or tenant-specific weekly off |
| Holiday calendar | India office holidays by location |
| Attendance policy | Grace, late, early, regularization window |
| Assignment | Shift/calendar/policy assigned to employee group |
| Manager route | Manager can approve regularization |

Pilot test:

1. Assign shift and attendance policy to one employee.
2. Ask employee to submit a missed punch correction.
3. Ask manager to approve from MSS.
4. Confirm HR Admin Attendance and Payroll Control update.

Related guide: [Attendance Management](attendance.md)

## 6. Document Requirements

Before employees log in, define what documents they must upload.

Common India onboarding documents:

| Document | Why It Matters |
| --- | --- |
| PAN | Payroll and TDS readiness. |
| Aadhaar | Identity verification where tenant policy requires it. |
| Bank proof | Payroll payout validation. |
| Address proof | Employee record and compliance. |
| Education proof | Role or company policy validation. |
| Previous employment proof | Experience and background verification. |
| Passport/visa | Only where applicable. |

Check:

- Required documents are clearly named.
- Scope is correct: all employees, legal entity, branch, employee type, or role.
- Rejection reasons are understandable.
- Expiry tracking exists where needed.
- A sample employee can see the right document request in **ESS > Documents**.
- HR can verify one uploaded proof and reject one invalid proof with a clear employee-facing reason.
- Payroll Control or Launch Readiness blocker counts change after a required proof is verified.

Related guides:

- [Documents](documents.md)
- [Documents to Verification](../workflows/documents-to-verification.md)
- [ESS Documents](../ess/documents.md)

## 7. Policies and Workflows

Before employees and managers start using ESS/MSS, configure both the rule and the approval route.

Minimum checks:

| Area | Expected setup |
| --- | --- |
| Leave policy | Employee can see eligible leave and balance. |
| Leave workflow | Reporting manager approves first, HR fallback exists. |
| Attendance policy | Employee can submit allowed regularization. |
| Attendance workflow | Manager/Time Office route exists. |
| Lifecycle workflow | Transfer, promotion, probation, and exit have owner, approver, due date, and effective-date handling. |
| Payroll review workflow | Payroll review and finance handoff approval route is clear. |
| Escalation | Missing manager or overdue approval routes to a useful owner. |

Pilot test:

1. Employee applies leave from ESS.
2. Manager approves from MSS.
3. Employee submits attendance correction.
4. Manager approves from MSS.
5. HR creates one lifecycle movement and confirms approver route.
6. HR checks Dashboard, Payroll Control, and Launch Readiness for workflow blockers.

Related guides:

- [Policies](policies.md)
- [Workflows](workflows.md)
- [Leave Management](leave.md)
- [Attendance Management](attendance.md)
- [Lifecycle](lifecycle.md)

## 8. Payroll Setup

Before payroll employees are onboarded, configure:

| Setup | Example |
| --- | --- |
| Payroll calendar | `India Monthly Payroll` |
| Payroll period | `01 Sep 2026 - 30 Sep 2026` |
| Pay group | `Monthly Staff` |
| Employee assignment | Employee belongs to the right pay group |

If pay group assignment is missing, the employee may not appear in payroll even when salary exists.

Related guide: [Payroll Setup](payroll/payroll-setup.md)

## 9. Salary Setup

Before payroll readiness can pass, configure:

| Setup | Example |
| --- | --- |
| Salary components | Basic, HRA, Special Allowance, PF, PT |
| Salary structure | India Staff CTC |
| Structure version | Effective from payroll period start |
| Employee salary assignment | CTC and structure assigned to employee |
| City or role condition | HRA 40%/50%, role allowance, shift allowance |

Check:

- Effective date is not after the payroll period.
- Component rules match employee city/role/type.
- Salary structure is active and assigned.

Related guide: [Salary Setup](payroll/salary-setup.md)

## 10. Statutory Setup

For India payroll, statutory setup should be ready before payroll employees are marked complete.

Minimum checks:

| Area | Required Setup |
| --- | --- |
| PAN | Employee PAN captured or declaration flow available. |
| PF | Employer registration, PF applicability, UAN where available. |
| ESIC | Applicability rules and registration details. |
| Professional Tax | State-specific rules and slabs. |
| TDS | Tax regime, declarations, proof status, and payroll consumption. |
| Employer registration | Legal entity statutory IDs and filing references. |

Documentation status: launch-grade statutory examples are available in the Payroll Statutory guide. Use that guide before onboarding payroll employees for India.

Related guides:

- [Statutory Payroll](payroll/statutory-payroll.md)
- [ESS Tax Declarations](../ess/statutory-declarations.md)

## 11. Notifications

Before onboarding real employees, verify operational emails and in-app notifications.

Must-test notification cases:

| Event | Expected Result |
| --- | --- |
| New tenant admin invite | Tenant admin receives setup email and lands in Tenant Admin after password setup. |
| New HR admin invite | HR admin receives setup email and lands in HR Admin after password setup. |
| New employee invite | Employee receives setup email and lands in ESS after password setup. |
| Password reset | User receives reset email and can set a new password. |
| Leave request submitted | Manager receives approval alert if configured. |
| Leave approved/rejected | Employee receives status update if configured. |
| Attendance regularization submitted | Manager receives approval alert if configured. |
| Attendance approved/rejected | Employee receives status update if configured. |
| Document rejected | Employee receives correction notice with a clear rejection reason if configured. |
| Tax declaration/proof rejected | Employee receives correction notice before payroll cutoff if configured. |
| Payslip published | Employee receives payslip notice if configured. |
| Payroll review requested | Payroll/HR approver receives review request if configured. |
| Payroll handoff completed | Finance manager receives handoff alert if configured. |

If an email does not arrive:

1. Open **HR Admin > Notifications**.
2. Search by recipient email.
3. Check status, channel, template, and provider error.
4. Confirm the notification event exists. If direct SMTP works but no notification record exists, investigate the application trigger, template activation, recipient mapping, or workspace access.
5. Retry only when failure is temporary and the root cause is fixed.
6. If retry cap is reached, manually notify the user and create support evidence.

Related guides:

- [Notifications](notifications.md)
- [Notification Failure to Recovery](../workflows/notification-failure-to-recovery.md)
- [Notification Issues](../troubleshooting/notifications.md)

## Pilot Employee Test

Before bulk onboarding, create a small pilot:

| Pilot User | Purpose |
| --- | --- |
| One employee | ESS login, leave, attendance, documents, payslip/tax visibility. |
| One manager | MSS approvals and team notifications. |
| One HR admin | Employee correction and readiness review. |
| One payroll admin or HR payroll user | Payroll setup/readiness review. |

Minimum pilot workflow:

1. Create organization masters.
2. Create employee and manager.
3. Assign ESS and MSS access.
4. Verify invite email delivery.
5. Assign leave and attendance policies.
6. Add document requirements.
7. Assign salary and pay group.
8. Add bank/statutory details.
9. Employee applies leave.
10. Manager approves leave.
11. Employee submits attendance correction.
12. Manager approves attendance correction.
13. Employee uploads document.
14. HR verifies or rejects document.
15. Payroll Control shows no unexpected blocker for the pilot employee.

## Do Not Start Bulk Onboarding If

- Organization masters are incomplete.
- HR Admin or Tenant Admin cannot sign in.
- Invite/password reset email is failing.
- Managers do not have MSS access.
- Leave policy assignment is missing.
- Attendance shift or policy is missing.
- Required document setup is unclear.
- Payroll calendar, pay group, or salary structure is missing.
- Statutory setup is unknown for payroll employees.
- Payroll Control shows unexplained blockers for pilot employees.

## Documentation Audit Result

| Area | Current Documentation Quality | Action |
| --- | --- | --- |
| Leave | Launch-grade detailed guide complete. | Keep updated after UI changes. |
| Attendance | Launch-grade detailed guide complete. | Keep updated after UI changes. |
| Employee onboarding prerequisites | This page provides the connected checklist. | Use before bulk onboarding. |
| Organization | Launch-grade detailed guide complete. | Keep updated after structure UI changes. |
| Employee Master | Launch-grade detailed guide complete. | Keep updated after employee UI changes. |
| Lifecycle | Launch-grade detailed guide complete. | Keep updated after lifecycle UI changes. |
| Documents | Launch-grade guide with onboarding, verification, rejection, expiry, and payroll blocker examples. | Complete. |
| Tenant Users/Roles | Covered through Tenant Admin user, role, access, and troubleshooting guides. | Keep updated after role model changes. |
| Payroll Setup | Launch-grade setup guide with calendar, period, pay group, assignment, audit, and negative scenarios. | Complete. |
| Salary Setup | Launch-grade India CTC guide with components, structures, assignments, effective dates, and negative scenarios. | Complete. |
| Statutory Payroll | Launch-grade India statutory guide with PF, ESIC, PT, LWF, TDS, declarations, proof, and negative scenarios. | Complete. |
| Notifications | Launch-grade trigger matrix, recovery flow, email examples, and negative scenarios complete. | Keep updated after adding new workflow events. |

## Related Pages

- [Employee to Payroll](../workflows/employee-to-payroll.md)
- [Go-Live Checklist](../launch/go-live-checklist.md)
- [HR Admin Daily Checklist](../checklists/hr-admin-daily.md)
- [Employees](employees.md)
- [Organization](organization.md)
- [Leave Management](leave.md)
- [Attendance Management](attendance.md)
- [Payroll Setup](payroll/payroll-setup.md)
- [Salary Setup](payroll/salary-setup.md)
- [Statutory Payroll](payroll/statutory-payroll.md)
