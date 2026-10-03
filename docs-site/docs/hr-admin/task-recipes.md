# HR Admin Task Recipes

Task recipes are short, practical workflows for common HR Admin work. Use these when you know what you need to do but are not sure which page owns the action.

## Fix a payroll blocker

1. Open **Dashboard** or **Payroll Control**.
2. Read the blocker name and count.
3. Open the action button, such as **Fix blockers**, **Review employees**, or **Check setup health**.
4. Correct the source record on the opened page.
5. Save the change.
6. Return to **Payroll Control**.
7. Confirm the blocker count reduced.

| Blocker type | Likely page |
| --- | --- |
| Missing branch, location, department, manager | Employees or Organization |
| Missing bank account | Employee bank accounts |
| Missing salary assignment | Salary Setup |
| Attendance pending | Attendance |
| Leave pending | Leave |
| Notification failed | Notifications |

## Create an employee

1. Open **Employees**.
2. Click **New employee**.
3. Enter identity and contact details.
4. Enter legal entity, branch, location, department, designation, and manager.
5. Save the employee.
6. Reopen the employee detail.
7. Confirm structure and manager readiness badges.
8. Add salary, bank, statutory, and access details if the employee is payroll or ESS eligible.

Expected result:

- Employee appears in the directory.
- Structure and manager badges are ready or show clear next action.
- Employee can be used by downstream setup pages such as Salary Setup, Leave, Attendance, Documents, and Payroll Control.

Use the detailed [Employees](employees.md) guide when you need field-by-field guidance or a realistic Bengaluru employee example.

## Make a new employee payroll-ready

1. Open **Employees** and confirm employee identity, status, joining date, legal entity, branch, location, department, designation, and manager.
2. Confirm the employee needs payroll for the selected period.
3. Open **Salary Setup** and assign salary structure/CTC with an effective date on or before the payroll period start.
4. Add or verify one active primary bank account.
5. Confirm statutory profile: PAN, PF/UAN, ESIC, Professional Tax state, and tax regime where applicable.
6. Confirm leave policy assignment and opening balance if leave is tracked.
7. Confirm attendance shift and holiday calendar if attendance affects payroll.
8. Open **Payroll Control**.
9. Confirm the employee no longer appears in missing structure, missing salary, missing bank, statutory, leave, or attendance blockers.

Expected result:

- Payroll Control shows no critical employee setup blocker for that employee.
- The employee can move into payroll inputs when the period is opened.

## Fix employee access after Workspace Access screen

1. Open **Employees**.
2. Search by the user's email address.
3. Confirm the employee record exists and is active.
4. Confirm work email matches the login email.
5. Open the employee access action or Tenant Admin Users.
6. Assign the correct role, such as ESS or MSS.
7. Save and resend setup/reset email if required.
8. Ask the user to sign out and sign in again.

Expected result:

- Employee lands in ESS, MSS, or the correct workspace.
- User does not remain on the Workspace Access page.

If the user still cannot enter the workspace, check [Access Issues](../troubleshooting/access.md).

## Correct employee structure

1. Open **Employees**.
2. Search the employee.
3. Open the selected employee.
4. Use **Actions** or edit mode.
5. Correct legal entity, branch, location, department, designation, or manager.
6. Save.
7. Confirm **Structure Ready** and **Manager Chain Ready**.

Use **Lifecycle > Movements** instead of direct edit when the change needs approval, owner tracking, or an effective date.

## Set up organization masters for a new tenant

1. Open **Organization**.
2. Create the legal entity first, such as `LE-ACC-IN` / `Accerio India Pvt Ltd`.
3. Create locations, such as `LOC-BLR` / `Bengaluru`.
4. Create branches, such as `BR-BLR-HO` / `Bengaluru HO`, linked to the legal entity and location.
5. Create business units and departments.
6. Create cost centers aligned with finance.
7. Create grades, designations, and employee types.
8. Open the structure catalog and search each code.
9. Preview employee import with these codes before committing employees.

Expected result:

- Employee forms show the right dropdown values.
- Employee import does not fail for missing legal entity, branch, location, department, grade, designation, or employee type.
- Payroll Control has no organization master blocker for these structures.

Use [Organization](organization.md) for full field guidance and India examples.

## Add a new branch or office

1. Open **Organization**.
2. Create the location if the city or site is new.
3. Create the branch under the correct legal entity and location.
4. Confirm branch state/city context for statutory and attendance rules.
5. Confirm holiday calendar, attendance setup, Professional Tax state, and payroll eligibility.
6. Assign employees only after the branch is ready.
7. Review Payroll Control after moving or importing employees.

Expected result:

- Employees can be assigned to the new branch.
- Attendance, leave, statutory, and payroll checks can resolve correctly.

## Fix missing organization master during employee import

1. Open **Employees > Import updates**.
2. Read the rejected row message, such as missing department or branch.
3. Open **Organization**.
4. Search the missing code.
5. Create or reactivate the master if it should be valid.
6. Confirm parent masters are active.
7. Return to **Employees > Import updates**.
8. Upload and preview the employee file again.

Expected result:

- The row moves from rejected to ready if no other validation fails.
- HR fixes the missing master once instead of editing many employees later.

## Fix manager visibility for MSS

1. Open **Employees**.
2. Search the direct report.
3. Confirm the reporting manager is correct.
4. Search the manager record.
5. Confirm the manager is active and has MSS access.
6. Confirm the manager is not reporting to the same employee or creating a reporting loop.
7. Ask the manager to open MSS and review direct reports.

Expected result:

- The manager sees the employee in MSS.
- Leave, attendance, and workflow approvals route correctly.

## Resolve employee import rejection

1. Open **Employees**.
2. Open **Import updates**.
3. Upload the CSV and click **Preview import**.
4. Read rejected row messages before committing.
5. Fix duplicate employee code, duplicate email, missing legal entity, missing branch, invalid manager, invalid status, or invalid date format.
6. Preview again.
7. Commit only ready rows.
8. Spot-check a few imported employees in the directory.

Expected result:

- Ready rows are saved.
- Rejected rows are not partially created.
- Employee readiness badges are understandable after import.

## Transfer an employee to a new branch

1. Confirm the target branch and location exist in **Organization**.
2. Confirm attendance, holiday, statutory, and payroll context for the target branch.
3. Open **Lifecycle > Movements**.
4. Click **Create movement**.
5. Select the employee.
6. Choose movement type `Transfer`.
7. Enter effective date.
8. Select target branch, location, department, manager, or cost center as needed.
9. Assign owner and submit.
10. Approver reviews and approves.
11. After effective date, confirm Employee Master reflects the change.
12. Return to Payroll Control and confirm no branch/location blocker remains.

Expected result:

- Transfer has approval and audit trail.
- Payroll, attendance, and reporting use the new branch from the correct effective date.

## Promote an employee

1. Confirm target designation and grade exist in **Organization**.
2. Open **Lifecycle > Movements**.
3. Create movement type `Promotion`.
4. Enter effective date, target designation, and target grade.
5. Submit and approve according to policy.
6. If pay changes, open **Salary Setup**.
7. Add salary revision with the same effective date.
8. Confirm Payroll Control has no salary or effective-date blocker.

Expected result:

- Promotion is recorded with evidence.
- Compensation change is handled in Salary Setup, not hidden inside Employee Master.

## Process a resignation or exit

1. Open **Lifecycle > Exits**.
2. Create exit record for the employee.
3. Enter resignation date and last working day.
4. Assign owner and approver.
5. Track handover, assets, documents, access removal date, leave encashment, recovery, salary stop date, and F&F readiness.
6. Open Payroll Control before payroll close.
7. Add final settlement or adjustment where required.
8. Close exit only after evidence is complete.

Expected result:

- Employee access, payroll stop, payable days, and F&F are handled deliberately.
- Exit remains auditable.

## Confirm or extend probation

1. Open **Lifecycle > Probation**.
2. Filter employees due for review.
3. Open the probation item.
4. Review manager feedback.
5. Choose confirm, extend, or reject according to company policy.
6. If confirming, enter confirmation date.
7. If extending, enter new probation end date and owner.
8. If rejecting, start exit workflow.
9. Confirm Employee Master and downstream eligibility are updated.

Expected result:

- Probation status is visible.
- Benefits, leave, salary, and reporting eligibility can follow the decision.

## Verify an employee document

1. Open **Documents**.
2. Open the document backlog or employee document list.
3. Click **Review**.
4. Confirm the file belongs to the correct employee.
5. Check document type, readable details, and expiry date.
6. Click **Verify** if valid.
7. Click **Reject** with a clear reason if invalid.
8. Confirm dashboard count updates.

Expected result:

- The document status becomes verified or rejected.
- The evidence trail shows reviewer, timestamp, decision, and note.
- Any related employee, payroll, or launch blocker reduces after the source document is accepted.

Use the detailed [Documents](documents.md) guide for category setup, requirement design, rejection notes, and India-specific PAN/bank examples.

## Configure PAN and bank proof for payroll employees

1. Open **Documents**.
2. Open **Requirements**.
3. Create `PAN Card` under identity or tax proof according to tenant convention.
4. Scope it to India payroll employees or the correct legal entity.
5. Mark it mandatory.
6. Add reviewer guidance: verify employee name and readable PAN number.
7. Create `Bank proof` under bank proof.
8. Scope it to payroll employees.
9. Mark it mandatory.
10. Add reviewer guidance: accept cancelled cheque, passbook first page, or bank statement showing name, account number, and IFSC.
11. Save both requirements.
12. Sign in as one employee and confirm both requests appear in **ESS > Documents**.

Expected result:

- Employees know which files to upload.
- HR can verify uploaded proof.
- Payroll Control can clear PAN or bank proof blockers after verification.

## Reject a document and request resubmission

1. Open **Documents**.
2. Filter to pending review or rejected documents.
3. Open the employee document.
4. Check whether the file is wrong, unreadable, expired, incomplete, or mismatched.
5. Click **Reject**.
6. Enter a clear reason, such as `Upload bank proof that shows account holder name, account number, and IFSC.`
7. Save the rejection.
8. Confirm the employee sees the correction reason in ESS.
9. Review the replacement upload when submitted.

Expected result:

- Employee knows exactly what to correct.
- The rejected document remains auditable.
- The replacement can be verified without support follow-up.

## Fix employee cannot see a document request in ESS

1. Open **Documents > Requirements**.
2. Confirm the requirement is active.
3. Check the requirement scope: legal entity, branch, employee type, role, or lifecycle event.
4. Open **Employees**.
5. Confirm the employee has matching structure values.
6. Confirm the employee has ESS access and active status.
7. Ask the employee to refresh or sign in again.
8. If many employees are affected, correct the requirement scope before sending reminders.

Expected result:

- The correct request appears in **ESS > Documents**.
- HR does not need to manually chase employees one by one.

## Review an expiring document

1. Open **Documents**.
2. Filter to expiring or expired documents.
3. Open the document item.
4. Confirm expiry date and whether the document matters for compliance, travel, payroll, or employment status.
5. Send a renewal reminder or reject the expired proof if a valid replacement is required.
6. Verify the renewed upload.
7. Confirm expiry warning clears.

Expected result:

- HR catches passport, visa, contract, or certification renewals before they become compliance blockers.

## Create a manager-first leave approval workflow

1. Open **Workflows**.
2. Create template `Leave approval - manager then HR`.
3. Set module to **Leave**.
4. Set trigger to leave request submitted.
5. Add step `Manager approval`.
6. Set approver type to reporting manager.
7. Require rejection note.
8. Add HR Admin fallback for missing or inactive manager.
9. Add escalation to HR Admin after the configured SLA.
10. Activate only after testing one employee request.

Expected result:

- Employee leave request appears in manager MSS approvals.
- Missing manager does not leave the request permanently stuck.
- Rejection gives employee a clear reason.

Use [Workflows](workflows.md) for deeper routing, escalation, and versioning guidance.

## Future-date a policy change safely

1. Open **Policies**.
2. Identify the current policy and employee scope.
3. Do not edit historical rules if payroll already used them.
4. Create a new policy version or assignment.
5. Set effective date to the future date, such as `01 Jan 2027`.
6. End-date the old version if supported.
7. Test one employee before and after the effective date.
8. Check ESS, MSS, HR Admin, and Payroll Control.

Expected result:

- Current period behavior does not change unexpectedly.
- New requests from the effective date use the new rule.
- Payroll remains explainable.

## Resolve overlapping policy assignment

1. Pick one affected employee.
2. Open employee profile and note legal entity, branch, location, department, grade, employee type, and status.
3. Open **Policies**.
4. List every active assignment that could match the employee.
5. Check effective dates.
6. Check priority.
7. Keep the intended policy.
8. End-date, deactivate, or lower priority for the wrong policy.
9. Retest the same employee in ESS.

Expected result:

- Employee receives one clear policy outcome.
- Duplicate leave balance or wrong attendance behavior stops.

## Fix approval stuck with manager

1. Open the employee profile.
2. Confirm the employee has an active reporting manager.
3. Confirm the manager has MSS access.
4. Open **Workflows**.
5. Confirm the workflow route uses reporting manager or the intended approver role.
6. Confirm fallback owner exists.
7. Confirm escalation is not routed to the same missing user.
8. Reassign or escalate the pending item if policy allows.
9. Test with a new request after configuration is fixed.

Expected result:

- Manager receives approval in MSS or HR fallback can act.
- Employee request does not remain in a silent pending state.

## Resolve a failed notification

1. Open **Notifications**.
2. Filter by **Failed**.
3. Expand **Details and quick review** or open **Review**.
4. Read the failure message.
5. Confirm channel, provider, recipient, and template.
6. Retry only if the failure is temporary.
7. Save review notes if triage is needed.
8. Use **Notification Delivery** if many failures share the same channel.

Expected result:

- Temporary failures are retried only after root cause is fixed.
- Wrong recipient, missing user, provider setup, or outdated message cases are not retried blindly.
- Review notes explain manual follow-up or escalation.

Use [Notifications](notifications.md) for the full trigger matrix and [Notification Failure to Recovery](../workflows/notification-failure-to-recovery.md) for deeper recovery steps.

## Verify invite email delivery

1. Create or invite a user from Tenant Admin or HR Admin, depending on the user type.
2. Use a real test inbox.
3. Open **Notifications**.
4. Search by recipient email.
5. Confirm an invite notification exists.
6. Confirm status is delivered.
7. Open the email link.
8. Set password and sign in.
9. Confirm the user lands in ESS, MSS, HR Admin, Tenant Admin, or Platform Admin as intended.

Expected result:

- User receives setup email.
- User can complete password setup.
- User does not land on Workspace Access unless role/profile is intentionally missing.

## Verify password reset email delivery

1. Open the login page.
2. Click forgot password.
3. Enter the user email.
4. Submit.
5. Search **Notifications** by the email address.
6. Confirm reset notification exists and is delivered.
7. Open email link.
8. Set new password.
9. Sign in successfully.

Expected result:

- Reset email arrives.
- Reset link works.
- User can sign in with the new password.

## Investigate direct SMTP works but app email does not

1. Confirm direct SMTP test has passed.
2. Trigger the real app event, such as invite or forgot password.
3. Open **Notifications**.
4. Search by recipient email.
5. If no notification exists, investigate event creation or user/account state.
6. If notification exists but is pending, check queue worker/channel health.
7. If failed, open full review and read provider error.
8. Fix event/template/recipient/worker/channel root cause before retrying.

Expected result:

- The investigation separates SMTP credential health from app-triggered notification flow.
- HR can tell whether the issue is event creation, template, recipient resolution, queue processing, or provider delivery.

## Confirm document rejection notification

1. Open **Documents**.
2. Reject one test employee proof with a clear reason.
3. Open **Notifications**.
4. Search by employee email.
5. Confirm document rejection notification exists.
6. Confirm employee-facing reason is included.
7. Confirm the link opens ESS Documents or the correct document item.

Expected result:

- Employee receives a useful correction message.
- HR can prove rejection communication was sent.

## Confirm payslip published notification

1. Publish payslip only after payroll outputs are final.
2. Open **Notifications**.
3. Search by employee email or payslip notification subject.
4. Confirm notification is delivered if tenant uses payslip alerts.
5. Sign in as employee.
6. Open **ESS > Payslips**.
7. Confirm the payslip is visible.

Expected result:

- Employee is notified only after payslip is ready.
- Notification link and ESS payslip visibility agree.

## Apply a leave balance correction

1. Open **Leave**.
2. Search employee and policy.
3. Review current balance and transaction history.
4. Select action: credit, debit, correction, carry forward, or expiry.
5. Enter amount and reason.
6. Apply the action.
7. Approve or reject if the action enters an approval state.
8. Recheck balance and payroll readiness if payroll is open.

## Set Up Earned Leave End To End

Use this recipe when a new tenant or legal entity needs Earned Leave working for employees.

1. Open **Leave Types**.
2. Create `Earned Leave` with code `EL`, unit `Days`, active status, approval required, no negative balance, and no default attachment requirement.
3. Open **Leave Policies**.
4. Create `Earned Leave Standard` with annual entitlement `18`, monthly accrual, half-day allowed, manager approval, and carry-forward cap such as `45`.
5. Use **Preview route** with a real employee and `1` requested unit.
6. Open **Leave Policy Assignments**.
7. Assign the policy to the right legal entity, branch, department, employment type, or one test employee.
8. Open **Leave**.
9. Add or import opening balance if employees are migrated from an older system.
10. Ask one employee to apply leave from **ESS > Leave**.
11. Ask the manager to approve from **MSS > Approvals**.
12. Return to **Payroll Control** and confirm no leave blocker remains.

If the employee sees "No active leave policy is assigned to this employee", fix the policy assignment scope before changing balances.

## Review attendance before payroll

1. Open **Attendance**.
2. Filter the exact payroll period, for example `01 Sep 2026 - 30 Sep 2026`.
3. Filter first for **Pending regularization**, **Missing punch**, **Absent**, **Shift missing**, and **Late/Early**.
4. Open each payroll-impacting exception.
5. Check employee status, shift, holiday calendar, leave conflict, manager, reason, and evidence.
6. Approve valid regularizations.
7. Reject invalid or duplicate requests with a clear reason.
8. Fix setup issues, such as missing shift or holiday calendar, before approving individual corrections.
9. Confirm no critical attendance blockers remain.
10. Return to **Payroll Control** before locking inputs.

Expected result:

- Pending attendance items inside the payroll period are closed or explicitly accepted.
- Payroll Control no longer shows unresolved attendance blockers.

Do not lock payroll inputs while manager approvals or attendance corrections are still in progress.

## Prepare payroll for calculation

1. Open **Payroll Control**.
2. Resolve blocked items first.
3. Review warnings.
4. Open **Payroll Inputs**.
5. Select the payroll run.
6. Review snapshot readiness.
7. Lock inputs when source data is correct.
8. Open **Payroll Calculations**.

## Review and approve payroll

1. Open **Payroll Calculations**.
2. Confirm gross, deductions, net pay, line count, and issue register.
3. Resolve calculation blockers.
4. Open **Payroll Review**.
5. Review all exceptions.
6. Add notes for accepted exceptions.
7. Submit or approve according to role.
8. Final lock only after approval is complete.

## Publish payroll outputs

1. Confirm payroll review is approved and locked.
2. Open **Payroll Outputs**.
3. Generate outputs.
4. Review artifact register.
5. Publish payslips only when final.
6. Confirm ESS payslip visibility.
7. Open **Payroll Handoff** for finance or provider delivery.

## Investigate an audit question

1. Open **Reports and Audit** or **Audit**.
2. Filter by actor, module, action, date range, or record.
3. Open the relevant event.
4. Confirm what changed and when.
5. Check whether approval or workflow evidence exists.
6. Export evidence only if policy allows.

## End-to-End Recipe: New Employee To First Payroll

Use this when one new employee must move from HR onboarding to payroll inclusion.

1. Open **Organization** and confirm legal entity, branch, location, department, designation, grade, employee type, and cost center exist.
2. Open **Employees** and create the employee with joining date, work email, manager, and organization structure.
3. Assign ESS access and send the invite.
4. Confirm invite notification is delivered.
5. Open **Documents** and confirm required PAN, bank proof, identity, and onboarding document requests are visible to the employee.
6. Add or verify primary bank account.
7. Add statutory profile: PAN, PF/UAN, ESIC/PT applicability, tax regime, and state context.
8. Open **Leave Policy Assignments** and assign applicable leave policies.
9. Open **Attendance** setup and confirm shift, holiday calendar, and attendance policy apply.
10. Open **Salary Setup** and assign salary structure/CTC effective on or before joining/payroll period start.
11. Open **Payroll Setup** and assign the employee to the correct pay group.
12. Open **Payroll Control** and confirm the employee is not listed under missing structure, missing bank, missing salary, missing statutory, leave, attendance, or pay group blockers.
13. Open **Payroll Inputs** only after readiness is clean and confirm the employee appears in the snapshot.

Expected result:

- Employee can sign in to ESS.
- Employee is in the correct payroll scope.
- Payroll can explain all source data before calculation.

## End-to-End Recipe: Earned Leave Setup To Approval

Use this when HR wants Earned Leave to work for employees from policy setup through payroll readiness.

1. Open **Leave Types** and create `Earned Leave` with code `EL`.
2. Open **Leave Policies** and create `Earned Leave Standard`, for example 18 days/year, monthly accrual, manager approval, carry-forward cap, and no negative balance.
3. Open **Leave Policy Assignments** and scope the policy to the legal entity, branch, employee type, department, or pilot employee.
4. Add opening balance for migrated employees if required.
5. Confirm employee has an active manager and the manager has MSS access.
6. Ask the employee to open **ESS > Leave** and apply one day Earned Leave.
7. Ask the manager to open **MSS > Approvals** and approve or reject.
8. Open **Leave** in HR Admin and confirm the request and balance transaction are visible.
9. Open **Payroll Control** and confirm there is no unresolved leave blocker for the payroll period.

Expected result:

- Employee can apply leave without policy assignment errors.
- Manager can approve from MSS.
- Payroll readiness reflects the approved leave state.

## End-to-End Recipe: Attendance Correction To Payroll

Use this when a missed punch or attendance exception must be corrected before payroll inputs are locked.

1. Confirm the employee has a shift, holiday calendar, attendance policy, and manager.
2. Ask employee to open **ESS > Attendance** and submit a missed punch or regularization request with reason.
3. Ask manager to open **MSS > Approvals** and approve or reject.
4. Open **Attendance** in HR Admin and filter the payroll period.
5. Confirm the correction status, approved hours/day, and source note.
6. Open **Reports** and run attendance exception or register evidence for the period.
7. Open **Payroll Control** and confirm attendance blocker or pending approval count reduces.
8. Lock payroll inputs only after corrections are approved or consciously accepted.

Expected result:

- Attendance correction is approved with evidence.
- Payroll inputs consume the corrected attendance state.
- Pending attendance does not silently affect payable days.

## End-to-End Recipe: Document Rejection To Resubmission

Use this when an employee uploads an invalid document and HR needs a clean correction cycle.

1. Open **Documents** and select the uploaded proof.
2. Review file readability, employee name, document number, expiry, and document type.
3. Reject invalid proof with a specific reason, such as `Bank proof must show account holder name, account number, and IFSC.`
4. Open **Notifications** and confirm correction notification is created or delivered if configured.
5. Ask employee to open **ESS > Documents** and upload corrected proof.
6. Reopen the replacement upload in HR Admin.
7. Verify if the proof is valid.
8. Open **Payroll Control** if the document is payroll-critical, such as PAN or bank proof.
9. Confirm related blocker or warning clears.

Expected result:

- Employee knows exactly what to fix.
- HR has rejection and verification audit evidence.
- Payroll-critical document blockers are resolved only after valid proof is accepted.

## End-to-End Recipe: Salary Revision To Payroll

Use this when an employee salary changes because of promotion, correction, annual increment, or market adjustment.

1. Confirm whether the change is purely salary-related or linked to a lifecycle event such as promotion or transfer.
2. If linked to lifecycle, create and approve the movement first.
3. Open **Salary Setup**.
4. Select the employee and current salary assignment.
5. Add a new salary revision instead of overwriting historical salary.
6. Set effective date to the intended payroll date, for example `01 Oct 2026`.
7. Confirm salary structure, CTC, fixed components, variable components, and statutory impact.
8. Open **Payroll Rules** only if formula behavior needs review.
9. Open **Payroll Control** and confirm salary blocker or warning clears for the target payroll period.
10. Open **Payroll Calculations** after inputs are locked and inspect line trace for revised Basic, HRA, allowance, deductions, and net pay.

Expected result:

- Old payroll remains explainable.
- New payroll uses the revision from the correct effective date.
- Audit and calculation trace explain why pay changed.

## End-to-End Recipe: Employee Exit To Final Settlement

Use this when an employee resigns or exits and payroll must stop regular salary or process final settlement.

1. Open **Lifecycle > Exits** and create the exit record.
2. Enter resignation date, last working day, exit reason, owner, and approver.
3. Track handover, asset return, document status, access removal, leave encashment, recoveries, and F&F readiness.
4. Confirm employee manager and HR owner can act on pending workflow items.
5. Open **Leave** and confirm encashment or expiry treatment for remaining balance.
6. Open **Attendance** and confirm payable days through last working day.
7. Open **Payroll Adjustments & Settlements** and add F&F earnings, deductions, recoveries, bonus, notice pay, or hold items as applicable.
8. Open **Salary Setup** if salary stop or final salary effective dating is required.
9. Open **Payroll Control** and confirm the employee is correctly included or excluded for the target payroll period.
10. During review, confirm final settlement exceptions are noted before payroll output or finance handoff.

Expected result:

- Employee exit is controlled by lifecycle evidence.
- Payroll knows whether to pay regular salary, final settlement, hold payment, or exclude the employee.
- Finance receives final settlement evidence with clear approval trail.

## Rule of thumb

If the issue affects payroll, fix the source record first, then return to Payroll Control. Do not patch final payroll numbers without understanding the source issue.
