# Employees

Employees is the master workspace for employee identity, organization placement, manager mapping, access readiness, and payroll source quality.

This guide explains what Employee Master must cover, how HR should use it, what each important field means, and how to fix common issues before they become payroll, ESS, MSS, leave, attendance, or document blockers.

## What Employee Master Covers

Employee Master owns the facts that identify a person and place that person inside the company structure.

| Area | What Employee Master controls | Why it matters |
| --- | --- | --- |
| Identity | Employee code, name, preferred name, email, phone | Used in search, payslips, reports, notifications, and audit trails. |
| Employment status | Active, on notice, inactive, exited, joining date, confirmation date | Controls payroll scope, access decisions, and lifecycle state. |
| Organization placement | Legal entity, branch, location, business unit, department, cost center, grade, designation | Drives payroll, statutory state, reports, approvals, and policy assignment. |
| Manager chain | Reporting manager and manager readiness | Drives MSS visibility, approvals, escalation, and org reporting. |
| Access readiness | Whether an employee has the right workspace login | Drives ESS, MSS, HR Admin, Finance Manager, or other workspace access. |
| Payroll source quality | Structure, bank, statutory, salary, and status readiness signals | Prevents incorrect payroll inclusion, payout failure, and compliance gaps. |
| Bulk correction | CSV import and preview flow | Allows HR to fix or onboard many employees with validation before commit. |

Employee Master does not replace every downstream module. It is the starting point and evidence source.

| Need | Primary page | Reason |
| --- | --- | --- |
| Create missing department, branch, legal entity, grade, designation, or location | [Organization](organization.md) | Employee can only use valid active masters. |
| Correct employee name, email, manager, branch, department, or status | Employees | Employee Master is the source of truth for profile data. |
| Transfer, promotion, manager change, exit, or probation action with owner and effective date | [Lifecycle](lifecycle.md) or movement workflow | Process changes need approval and audit evidence. |
| Assign salary structure, CTC, or revision | [Salary Setup](payroll/salary-setup.md) | Salary must be effective-dated and payroll-auditable. |
| Configure leave eligibility | [Leave](leave.md) | Leave type, policy, assignment, and balance are separate from employee identity. |
| Configure attendance eligibility | [Attendance](attendance.md) | Shift, holiday calendar, and attendance policy are setup decisions. |
| Verify documents | [Documents](documents.md) | Documents need employee upload, HR review, and evidence. |
| Create tenant-wide roles or account controls | Tenant Admin | Tenant Admin owns system roles and account-level permissions. |

## High-Level Implementation Plan

Use this checklist when implementing or auditing Employee Master. No item should be left undefined for launch-grade usage.

| Step | Coverage area | Expected result |
| --- | --- | --- |
| 1 | Employee identity | Unique employee code, correct display name, correct work and personal email. |
| 2 | Employment dates | Joining, probation, confirmation, notice, and exit dates are valid for status. |
| 3 | Organization structure | Employee has legal entity, branch, location, department, designation, grade, and cost center where required. |
| 4 | Manager chain | Employee has a valid reporting manager unless intentionally exempt. |
| 5 | Access | ESS/MSS/admin access exists only where needed and routes to the correct workspace. |
| 6 | Leave dependency | Employee resolves the correct leave policy and balance. |
| 7 | Attendance dependency | Employee resolves the correct shift, holiday calendar, and attendance policy. |
| 8 | Salary dependency | Employee has active salary assignment before payroll period calculation. |
| 9 | Bank dependency | One active primary bank account exists for payroll payout. |
| 10 | Statutory dependency | PAN, PF/UAN, ESIC, PT state, and tax declaration readiness are checked where applicable. |
| 11 | Documents | Required employee documents are uploaded, reviewed, and not expired. |
| 12 | Payroll readiness | Payroll Control shows no unexplained employee master blocker. |
| 13 | Audit and recovery | User can understand why a record is blocked and where to fix it. |

## Use This Page When

- A new employee joins.
- HR needs to create or correct an employee profile.
- An employee cannot open ESS.
- A manager cannot see direct reports in MSS.
- Payroll readiness shows employee master blockers.
- A salary, bank, statutory, leave, attendance, document, or access issue needs employee context.
- HR needs to bulk import or bulk correct employee records.
- A payroll close is coming and employee master quality must be checked.

## Page Sections

| Section | Meaning | Typical user action |
| --- | --- | --- |
| Workforce command | Page purpose, summary, and primary actions. | Start New employee or Import updates. |
| Operational readiness | Counts for employees, access, department spread, and manager reviews. | Judge whether the master is clean enough for payroll. |
| Employee directory | Searchable employee list with filters and status pills. | Find the employee and select the right record. |
| Employee master detail | Detailed selected employee profile. | Verify identity, status, structure, manager, and readiness. |
| Actions menu | Contextual actions for selected employee. | Edit, review access, start movement, or investigate warnings. |
| Bulk import | CSV-based employee creation or update workflow. | Preview, fix rejected rows, and commit ready rows. |

![Employees directory and selected employee detail](../assets/screenshots/hr-admin/employees-directory-detail.png)

## Safe Ownership Rules

Employees is a master-data page. Use it for factual corrections and daily lookup. Use process pages when the change needs approval, future effective dates, ownership, or audit evidence.

| Change needed | Recommended place | Reason |
| --- | --- | --- |
| Correct spelling, phone, email, branch, department, or missing manager | Employees | Simple master correction. |
| Create one new employee | Employees | The record must exist before access, salary, leave, attendance, and documents can work. |
| Create many employees | Employees import | Import preview catches missing mandatory fields before commit. |
| Promotion, transfer, manager change, grade change, or department movement | Lifecycle or Movements | These usually need effective dates and approvals. |
| Resignation, exit, or final settlement | Lifecycle or Exits | Exit affects access, payroll, documents, and F&F. |
| Salary or CTC change | Salary Setup | Compensation must be versioned and payroll-auditable. |
| Leave entitlement change | Leave | Leave policy and balance rules belong to leave setup. |
| Attendance setup issue | Attendance or Organization | Shift, weekly off, and holiday mapping are not employee identity fields. |

## Field-By-Field Guidance

### Identity Fields

| Field | Required? | Guidance | Common mistake |
| --- | --- | --- | --- |
| Employee code | Yes | Keep unique and stable, such as `EMP-1029`. Do not reuse after exit. | Changing employee code after payroll or documents already reference it. |
| First name, middle name, last name | Yes where applicable | Use legal HR record spelling. | Using nicknames in legal fields. |
| Preferred name | Optional | Use the name the employee should see in ESS. | Leaving confusing imported values. |
| Work email | Usually yes | Use company email when login and notifications should use work inbox. | Duplicate email across two employees. |
| Personal email | Recommended | Useful for invite, reset, exit, or non-work communication. | Missing personal email for pre-joining users. |
| Phone number | Recommended | Helps HR and payroll contact the employee. | Invalid or outdated number after migration. |

### Employment Status Fields

| Field | Guidance | Downstream impact |
| --- | --- | --- |
| Employment status | Use active for current employees, on notice during notice period, inactive only for non-working non-payroll records, exited after final exit. | Payroll scope, ESS access, documents, and reports. |
| Date of joining | Must be accurate. It controls payroll inclusion and partial month logic. | New joiner proration, leave eligibility, attendance start. |
| Probation end date | Enter when probation is tracked. | Lifecycle reminder and confirmation flow. |
| Confirmation date | Enter after employee is confirmed. | Reports and policy eligibility where confirmation matters. |
| Notice date | Use when resignation/notice is active. | Exit workflow and payroll close checks. |
| Exit date | Required for exited employee. | F&F, access removal, payroll inclusion cutoff. |

### Organization Fields

| Field | Guidance | Example |
| --- | --- | --- |
| Legal entity | Employing company. Mandatory for payroll and statutory reporting. | Accerio India Pvt Ltd |
| Branch | Physical or payroll branch used for local rules. | Bengaluru HO |
| Location | City/site context. | Bengaluru |
| Business unit | Broad business owner. | People Operations |
| Department | Operating team. | HR Operations |
| Cost center | Finance allocation. | CC-HR-001 |
| Grade / level | Seniority or compensation band. | L2 |
| Designation | Job title. | HR Executive |
| Employee type | Full-time, contractor, intern, consultant, etc. | Full-time |

If a field is not available in the dropdown, do not type a workaround value. Create the master first in [Organization](organization.md), then return to Employees.

### Manager Fields

| Field | Guidance |
| --- | --- |
| Reporting manager | Select the actual manager who approves leave, attendance, and employee actions. |
| Manager access readiness | Manager should have MSS access if approvals or team visibility are expected. |
| Direct reports | Check this when a manager says their team is missing. |

Avoid manager loops. An employee should not report to themselves, and the reporting chain should not circle back to the same employee.

### Payroll Readiness Fields

Employee Master does not calculate salary, but it decides whether payroll can safely include the employee.

| Readiness item | Source | What to verify |
| --- | --- | --- |
| Structure readiness | Employees and Organization | Legal entity, branch, location, department, designation, and manager are valid. |
| Salary readiness | Salary Setup | Active salary assignment exists for the payroll period. |
| Bank readiness | Employee bank account workflow | One active primary bank account exists with correct IFSC/account details. |
| Statutory readiness | Statutory Payroll / employee statutory profile | PAN, PF/UAN, ESIC, PT state, and tax setup are complete where applicable. |
| Leave readiness | Leave | Correct leave policies and balances exist. |
| Attendance readiness | Attendance | Shift, holiday, and attendance policy resolve correctly. |
| Access readiness | Employees access or Tenant Users | Employee has correct workspace access where required. |

## Directory Filters

| Filter | Meaning | Good use |
| --- | --- | --- |
| Search | Find by employee name, code, email, or manager. | Search `EMP-1029`, `Riya`, or manager name. |
| Department | Show employees in one department. | Review department cleanup before payroll. |
| Manager review | Show employees needing reporting-line checks. | Fix MSS visibility and approval routing. |
| Readiness | Filter by structure, access, or manager readiness. | Focus on blocked employees first. |
| Page size | Controls how many employees appear in the list. | Use larger size for audit; smaller size for daily review. |
| Status pills | Shows all, active, on notice, inactive, or exited. | Confirm payroll scope before close. |

## Readiness Badges

| Badge | Meaning | What to do |
| --- | --- | --- |
| Structure Ready | Organization fields are valid. | No action unless business data is wrong. |
| Structure Review | A required structure field is missing or invalid. | Open employee details and correct legal entity, branch, location, department, or designation. |
| Access Ready | Login/workspace setup is valid for expected usage. | No action unless role scope is too broad. |
| Access Review | Active employee may need access or has incomplete login setup. | Open access action or Tenant Users. |
| Manager Chain Ready | Reporting line is valid. | No action. |
| Manager Review | Manager is missing, invalid, or not ready for MSS. | Assign manager or fix manager access. |

## Buttons and Actions

| Button or action | What it does | Expected result |
| --- | --- | --- |
| New employee | Opens employee creation flow. | New employee record can be created. |
| Import updates | Opens bulk import area. | CSV can be loaded, previewed, and committed. |
| Apply | Applies selected filters. | Directory count and rows update. |
| Reset | Clears filters. | Directory returns to default view. |
| Actions | Opens selected employee actions. | User can edit, review access, or start related actions. |
| Load sample template | Loads employee CSV sample. | User sees expected header and sample values. |
| Copy template | Copies CSV header/template. | User can paste into spreadsheet. |
| Download template | Downloads import template. | User receives file with required columns. |
| Upload CSV | Selects CSV file. | File is ready for preview. |
| Preview import | Validates rows without saving. | Ready and rejected rows are shown. |
| Commit ready rows | Saves only rows that passed validation. | Employee records are created or updated. |

## Example: Create A Bengaluru Employee

Use this example when training a new HR Admin.

### Business Case

Riya Sharma joins Accerio India Pvt Ltd as an HR Executive in Bengaluru on 01 Oct 2026. She needs ESS access, will report to Karan Mehta, and will be included in October payroll.

### Before Starting

Confirm these masters exist:

- Legal entity: `Accerio India Pvt Ltd`
- Location: `Bengaluru`
- Branch: `Bengaluru HO`
- Business unit: `People Operations`
- Department: `HR Operations`
- Designation: `HR Executive`
- Grade: `L2`
- Employee type: `Full-time`
- Manager employee record: `Karan Mehta`

If any value is missing, create or fix it in [Organization](organization.md) first.

### Steps

1. Open **HR Admin > Employees**.
2. Click **New employee**.
3. Enter identity:
   - Employee code: `EMP-1029`
   - Name: `Riya Sharma`
   - Preferred name: `Riya`
4. Enter contact:
   - Work email: `riya.sharma@accerio.in`
   - Personal email: `riya.personal@example.com`
   - Phone: valid mobile number.
5. Enter employment:
   - Status: `Active`
   - Date of joining: `01 Oct 2026`
   - Probation end date: `31 Mar 2027`
6. Enter structure:
   - Legal entity: `Accerio India Pvt Ltd`
   - Branch: `Bengaluru HO`
   - Location: `Bengaluru`
   - Department: `HR Operations`
   - Designation: `HR Executive`
   - Grade: `L2`
   - Employee type: `Full-time`
7. Enter manager:
   - Manager: `Karan Mehta`
8. Save the employee.
9. Reopen the employee from the directory.
10. Confirm badges:
   - Structure Ready
   - Manager Chain Ready
   - Access Review or Access Ready, depending on whether access has been created.

### Expected Result

- Employee appears in directory.
- Employee details show the right organization and manager.
- Employee can be used in salary, leave, attendance, documents, and access setup.
- Payroll Control should not show structure blockers for this employee.

## Example: Give Employee ESS Access

Use this when the employee must login for payslips, leave, attendance, documents, tax declarations, or notifications.

1. Open **Employees**.
2. Search the employee.
3. Open the selected employee.
4. Open **Actions > Access** or the employee access action.
5. Confirm the login email.
6. Assign ESS or the intended workspace role.
7. Save or send invite.
8. Open **Notifications** and search the email address.
9. Confirm the setup/reset email is queued or delivered.
10. Ask the employee to open the email link, set password, and login.

Expected result:

- Employee lands in the correct workspace, normally ESS.
- Employee does not land on **Workspace Access**.
- Access badge becomes ready or the access issue is clearly visible.

If the employee lands on Workspace Access, check [Access Issues](../troubleshooting/access.md).

## Example: Make A Manager Ready For MSS

Use this when a manager cannot see team approvals or direct reports.

1. Open **Employees**.
2. Search the manager.
3. Confirm manager has an active employee record.
4. Confirm manager has correct work email.
5. Confirm manager has MSS access.
6. Search one direct report.
7. Confirm that direct report has the manager assigned.
8. Ask the manager to open MSS and check team visibility.

Expected result:

- Manager can open MSS.
- Direct reports appear.
- Leave and attendance approvals route to the manager.

If direct reports still do not appear:

- Check whether reporting manager is assigned to the correct employee.
- Check whether manager role is active.
- Check whether the employee and manager are in the same tenant.
- Check for manager chain loops.

## Example: Add Employee Payroll Readiness

Employee Master is only the first step. Use this sequence for a payroll-ready new joiner.

1. Create or correct employee in **Employees**.
2. Confirm organization structure is ready.
3. Confirm manager chain is ready.
4. Add ESS access if the employee needs self-service.
5. Add required documents or ask employee to upload them in ESS.
6. Open **Salary Setup** and assign salary structure/CTC with an effective date on or before the payroll period start.
7. Add primary bank account and confirm it is active.
8. Confirm statutory profile:
   - PAN
   - PF/UAN where applicable
   - ESIC where applicable
   - Professional Tax state where applicable
   - Tax regime/declaration readiness where applicable
9. Confirm leave policy assignment and opening balance.
10. Confirm attendance shift and holiday calendar.
11. Open **Payroll Control** and confirm the employee has no critical blocker.

Expected result:

- Employee can use ESS.
- Manager can review employee requests.
- Payroll Control does not show missing employee setup blockers.
- Payroll Inputs can include the employee safely.

## Bulk Import And Correction

Use import when many employees are created or corrected at once.

### Recommended CSV Checks Before Upload

| Check | Example |
| --- | --- |
| Employee code is unique | `EMP-1029` appears once. |
| Email is unique | `riya.sharma@accerio.in` belongs to only one employee. |
| Dates use expected format | `01 Oct 2026` or the format required by the template. |
| Organization values already exist | `Bengaluru HO` exists as a branch. |
| Manager code exists | Manager employee record is active. |
| Required columns are present | Do not delete mandatory template columns. |

### Import Flow

1. Open **Employees**.
2. Click **Import updates**.
3. Download or copy the template.
4. Fill records from a trusted source.
5. Upload CSV.
6. Click **Preview import**.
7. Review ready and rejected rows.
8. Fix rejected rows in the file.
9. Re-upload and preview again.
10. Click **Commit ready rows** only when the preview is clean enough.
11. Search a few imported employees manually and verify details.

### Common Import Rejections

| Error | Likely reason | Fix |
| --- | --- | --- |
| Duplicate employee code | Code already exists or appears twice in CSV. | Keep one employee per code. |
| Duplicate email | Email is already assigned to another employee or user. | Correct email before import. |
| Missing legal entity | Legal entity column is blank or value does not exist. | Create master or correct spelling. |
| Missing branch/location | Branch or location is blank or inactive. | Correct Organization masters. |
| Invalid manager | Manager employee code does not exist or is inactive. | Create/activate manager first. |
| Invalid status | Status value does not match allowed values. | Use active, on notice, inactive, or exited as supported. |
| Invalid date | Date format is not accepted. | Use the template format consistently. |

## Payroll Close Review

Before payroll inputs are locked, HR should review Employee Master blockers.

| Check | Expected result |
| --- | --- |
| Active employees | No required structure fields are missing. |
| New joiners | Joining date, legal entity, branch, manager, salary, bank, and statutory setup are ready. |
| On notice employees | Notice date and payroll handling are clear. |
| Exited employees | Exit date and F&F process are clear. |
| Managers | Direct-report managers have MSS access where approvals are needed. |
| Work emails | Login and notification addresses are correct. |
| Readiness badges | No unexplained Structure Review, Access Review, or Manager Review for payroll employees. |

Do not rely only on employee count. A payroll can include the correct number of employees and still be wrong if bank, salary, statutory, or structure data is incomplete.

## Positive End-To-End Scenario

### Scenario

HR creates a new Bengaluru employee and makes the employee ready for ESS, leave, attendance, documents, and payroll.

### Steps

1. Organization masters exist for legal entity, location, branch, department, grade, designation, and employee type.
2. HR creates employee in **Employees**.
3. HR assigns manager.
4. HR provisions ESS access.
5. Employee receives setup email and logs in.
6. Employee uploads required documents.
7. HR verifies documents.
8. HR confirms leave policy assignment and opening balance.
9. HR confirms attendance shift and holiday calendar.
10. Payroll Admin assigns salary and bank details.
11. Payroll Admin confirms statutory profile.
12. HR opens Payroll Control and confirms no employee master blockers remain.

### Result

Employee is operationally ready:

- ESS access works.
- Manager approval path works.
- Leave and attendance can be used.
- Required documents are tracked.
- Payroll can include the employee.

## Negative Scenarios And Fixes

| Scenario | What user sees | Root cause | Fix |
| --- | --- | --- | --- |
| Employee lands on Workspace Access | Login succeeds but no workspace opens. | User exists but role, membership, or employee link is missing. | Fix employee access or Tenant Admin user role. |
| Manager cannot see employee | MSS team is empty or missing one employee. | Reporting manager missing, wrong, inactive, or lacks MSS access. | Correct manager field and manager access. |
| Payroll shows missing legal entity | Payroll Control blocker remains. | Employee structure incomplete. | Edit employee and select valid legal entity. |
| Payroll shows missing branch | Employee has location but no payroll branch. | Branch not set or inactive. | Select active branch. |
| Leave request fails | ESS says no active leave policy is assigned. | Employee is outside policy assignment scope. | Fix leave policy assignment or employee structure. |
| Attendance is wrong | Employee shows absent, missing shift, or wrong holiday. | Shift or holiday calendar does not resolve. | Fix attendance setup for branch/location/employee. |
| Invite email not received | Employee cannot set password. | Email failed, email wrong, or invite not queued. | Check Notifications and resend setup/reset email. |
| Duplicate employee after import | Same person appears twice. | Imported with new code instead of updating existing code. | Merge/correct according to data policy; avoid reusing codes. |
| Salary blocker remains | Employee has no salary for period. | Salary assignment missing or effective date is after period. | Add salary assignment in Salary Setup with correct effective date. |
| Bank blocker remains | Payroll cannot pay employee. | No active primary bank account. | Add or activate primary bank account. |
| Statutory blocker remains | Compliance checks are incomplete. | PAN/PF/ESIC/PT/TDS profile missing. | Complete statutory profile and declarations. |

## Troubleshooting

| Problem | First check | Then check |
| --- | --- | --- |
| Employee does not appear in search | Status filter and search spelling | Employee code, import status, tenant context |
| Employee count looks wrong | Active/on notice/exited status | Joining and exit dates |
| Badges do not update | Save succeeded and page refreshed | Source module still has blocker |
| User cannot login | Work email, role, membership | Notification delivery and password reset |
| Manager approval missing | Employee manager field | Manager has MSS access |
| Payroll readiness still blocked | Payroll Control selected period | Salary, bank, statutory, leave, attendance |
| Import row rejected | Preview message | Organization master and duplicate values |

## Quality Checklist

Use this checklist for every launch tenant and before every payroll cycle.

- Employee code is unique.
- Work email is correct and not shared.
- Personal email is captured where useful.
- Legal entity, branch, location, department, designation, and employee type are valid.
- Manager is assigned where approvals are required.
- Manager has MSS access where team approvals are expected.
- ESS access exists for employees who use self-service.
- Salary assignment is active for the payroll period.
- One active primary bank account exists for payable employees.
- Statutory profile is complete for applicable employees.
- Leave policy and balance resolve correctly.
- Attendance shift and holiday calendar resolve correctly.
- Required documents are uploaded and reviewed.
- Payroll Control has no unexplained employee master blockers.

## FAQ

### Should every employee have login access?

No. Provision access only when the employee needs ESS, MSS, HR Admin, Finance Manager, Tenant Admin, or another workspace.

### Can HR directly edit a manager or department change?

Use direct edit for simple correction. Use Lifecycle or Movements when the change is business-effective, future-dated, approval-driven, or audit-sensitive.

### Why does Payroll Control still show a blocker after I fixed the employee?

Refresh Payroll Control and confirm the payroll period. Some blockers depend on Salary Setup, bank, statutory, leave, attendance, documents, or Organization masters rather than only the employee profile.

### What should HR do if a dropdown value is missing?

Do not type a workaround. Create or activate the master in [Organization](organization.md), then return to Employees.

### Can an employee be active without payroll?

Yes, but only if the business intentionally excludes that employee from payroll. For payable employees, salary, bank, statutory, and payroll group readiness must be complete.

### Why is manager chain readiness important?

Manager chain readiness controls approvals, MSS visibility, escalation, organization reporting, and workflow routing. A missing or incorrect manager can block processes even when the employee profile looks complete.

## Related Guides

- [Onboarding Prerequisites](onboarding-prerequisites.md)
- [Organization](organization.md)
- [Lifecycle](lifecycle.md)
- [Leave](leave.md)
- [Attendance](attendance.md)
- [Documents](documents.md)
- [Employee to Payroll Workflow](../workflows/employee-to-payroll.md)
- [Access Issues](../troubleshooting/access.md)
- [Payroll Issues](../troubleshooting/payroll.md)
