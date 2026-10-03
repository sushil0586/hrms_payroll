# Workflows

Use **Workflows** to define who reviews, approves, rejects, escalates, and owns HR processes.

Workflows answer this question:

> Once a request or operational item is created, who must act on it next?

Policies decide eligibility and business rules. Workflows decide routing and governance.

## What Workflows Owns

| Area | What it controls | Example |
| --- | --- | --- |
| Templates | Reusable approval designs. | `Leave approval - manager then HR`. |
| Steps | Approval stages inside the route. | Manager approval, HR review. |
| Owners | Who is responsible for a task. | Reporting manager, HR Admin, Payroll Admin. |
| Approvers | Who can approve or reject. | Manager first, HR fallback. |
| Escalation | What happens if action is overdue. | Escalate to HR after 2 days. |
| Versions | Which route is active from a date. | New payroll approval route from October. |
| Evidence | Decision notes, timestamp, actor, outcome. | Manager approved leave on 05 Oct 2026. |

![Workflow control overview](../assets/screenshots/hr-admin/workflows-overview.png)

## Use This Page When

- Leave approvals must route to manager first.
- Attendance regularization needs manager or HR review.
- Lifecycle movement, probation, transfer, promotion, or exit needs approval.
- Payroll review needs HR or finance approval.
- Document correction or review ownership is unclear.
- A process is stuck because an owner or approver is missing.
- A launch blocker says workflow templates are missing.
- An approver role changes and routing must be updated safely.

## Workflow Versus Policy

| User question | Policy responsibility | Workflow responsibility |
| --- | --- | --- |
| Can employee apply Earned Leave? | Yes | No |
| Is medical certificate required? | Yes | No |
| Who approves Sick Leave? | No | Yes |
| What happens if manager does not approve? | No | Yes |
| Can missed punch be regularized after 3 days? | Yes | No |
| Who approves missed punch? | No | Yes |
| Does payroll need final approval? | Maybe readiness rule | Yes |

Example:

- Leave policy says Earned Leave requires approval.
- Workflow says approval goes to reporting manager first, then HR Admin if manager is missing or overdue.

## Workflow Concepts

| Concept | Meaning | Example |
| --- | --- | --- |
| Template | Reusable approval design. | `Leave request approval`. |
| Step | One stage in approval. | `Manager approval`. |
| Actor | Person performing action. | Employee submits leave. |
| Owner | Person or role responsible for progress. | HR Admin. |
| Approver | Person or role allowed to approve/reject. | Reporting manager. |
| Fallback | Backup approver when main route fails. | HR Admin when manager missing. |
| Escalation | Overdue handling. | Escalate after 2 business days. |
| SLA | Expected action time. | Manager must act within 48 hours. |
| Active version | Route currently used for new requests. | `Leave approval v2`. |
| Evidence | Audit trail of workflow actions. | Comments, timestamp, decision. |

## Recommended Workflow Design

Keep workflows simple and predictable.

Recommended pattern:

1. Employee or HR creates request.
2. Reporting manager reviews.
3. HR Admin fallback handles missing or overdue manager.
4. Payroll Admin or Finance approves only when pay or finance handoff is affected.
5. Workflow records decision notes and timestamp.

Avoid creating too many approval levels unless the process truly needs them. Most employee-facing flows should be easy to understand.

## Core Workflow Templates

| Template | Trigger | First approver | Fallback / next owner |
| --- | --- | --- | --- |
| Leave approval | Employee submits leave request. | Reporting manager. | HR Admin. |
| Attendance regularization | Employee submits missed punch or correction. | Reporting manager. | HR Admin / Time Office. |
| Lifecycle movement | HR creates transfer, promotion, manager change. | Assigned HR/manager approver. | HR Admin. |
| Probation review | Probation due. | Reporting manager. | HR Admin. |
| Exit workflow | Resignation or termination starts. | HR Admin / manager. | Payroll Admin for F&F. |
| Document review | Employee uploads proof. | HR Admin reviewer. | HR Admin lead. |
| Payroll review | Payroll run enters review. | Payroll Admin / HR Admin. | Finance Manager. |
| Support access | Support access requested. | Tenant Admin. | Security owner. |

## Field Guidance

| Field | Meaning | Example | Common mistake |
| --- | --- | --- | --- |
| Template name | Business-friendly workflow name. | `Leave approval - manager first` | `Workflow 2` |
| Module | Process area using the workflow. | Leave, attendance, lifecycle. | Wrong module selected. |
| Trigger | Event that starts workflow. | Leave request submitted. | Trigger not tied to real event. |
| Step name | Stage name users can understand. | Manager approval. | Internal-only wording. |
| Approver type | How approver is resolved. | Reporting manager, role, named user. | Named user used where role is better. |
| Fallback owner | Backup when approver missing. | HR Admin. | No fallback. |
| SLA / due days | Time before escalation. | 2 business days. | No overdue handling. |
| Escalation | Who receives overdue action. | HR Admin lead. | Escalates to same missing user. |
| Active version | Version used for new requests. | v2 active from 01 Oct 2026. | Editing live route without version. |
| Notes required | Whether approver must enter reason. | Required on rejection. | Reject without clear reason. |

## Example: Leave Approval Manager First, HR Fallback

Business case: Employees apply leave from ESS. Reporting manager approves first. If manager is missing or overdue, HR Admin handles it.

1. Open **HR Admin > Workflows**.
2. Create template:

| Field | Value |
| --- | --- |
| Template name | `Leave approval - manager then HR` |
| Module | Leave |
| Trigger | Leave request submitted |
| Active | Yes after testing |

3. Add step 1:

| Field | Value |
| --- | --- |
| Step name | `Manager approval` |
| Approver type | Reporting manager |
| Decision options | Approve, reject |
| Rejection note | Required |
| SLA | 2 business days |

4. Add fallback/escalation:

| Field | Value |
| --- | --- |
| Fallback condition | Manager missing or inactive |
| Escalation condition | Manager overdue |
| Fallback owner | HR Admin |
| Escalation owner | HR Admin |

5. Activate the workflow.
6. Test with one employee who has a manager.
7. Test with one employee with missing manager only in a controlled test record.

Expected result:

- Normal leave request appears in manager MSS approvals.
- Missing manager case routes to HR fallback instead of getting stuck silently.
- Employee can see request status.

## Example: Attendance Regularization Approval

Business case: Employee forgets to punch out. Employee submits regularization. Manager reviews.

1. Create template `Attendance regularization - manager approval`.
2. Set module `Attendance`.
3. Set trigger `Regularization submitted`.
4. Set step `Manager review`.
5. Approver type: reporting manager.
6. Rejection note required.
7. Fallback owner: HR Admin or Time Office.
8. Test from ESS or attendance request flow.

Expected result:

- Employee correction enters pending approval.
- Manager can approve from MSS.
- HR can see stuck or overdue items.
- Payroll readiness clears after approval when attendance source is resolved.

## Example: Lifecycle Movement Approval

Business case: Employee transfers from Bengaluru HO to Mumbai Branch effective 01 Nov 2026.

1. Open **Workflows**.
2. Create or review template `Lifecycle movement approval`.
3. Module: Lifecycle.
4. Trigger: Movement submitted.
5. Step 1: HR owner review.
6. Step 2: Department head or assigned approver if tenant policy requires it.
7. Fallback owner: HR Admin.
8. Require decision notes on reject.
9. Test with a low-risk transfer.

Expected result:

- Transfer is not a silent Employee Master edit.
- Movement has owner, approver, effective date, and evidence.
- Employee Master updates only after approval and effective processing.

## Example: Payroll Review Approval

Business case: Payroll run must be reviewed before payslips and finance handoff.

1. Create template `Payroll review approval`.
2. Module: Payroll.
3. Trigger: Payroll run submitted for review.
4. Step 1: Payroll Admin review.
5. Step 2: Finance Manager approval if finance signoff is required.
6. Rejection note required.
7. Escalation owner: Payroll lead.

Expected result:

- Payroll cannot move to output/handoff without required approval.
- Exceptions are documented.
- Finance handoff has approval evidence.

## Example: Document Rejection Review

Business case: HR rejects employee proof. Employee must know exactly what to correct.

Workflow design:

| Step | Owner | Required behavior |
| --- | --- | --- |
| Review uploaded proof | HR Admin | Accept or reject. |
| Rejection note | HR Admin | Required and employee-facing. |
| Resubmission | Employee | Upload corrected proof. |
| Re-review | HR Admin | Verify replacement. |

Expected result:

- Rejected documents do not disappear.
- Employee sees correction reason.
- HR can verify the replacement.

## Approval Route Patterns

| Pattern | Use when | Example |
| --- | --- | --- |
| Manager only | Simple employee self-service approval. | Casual Leave. |
| Manager + HR fallback | Manager is primary but HR must prevent stuck requests. | Earned Leave. |
| HR owner only | HR validates evidence or setup. | Document verification. |
| HR + Payroll | Action affects salary or payroll close. | Exit with F&F. |
| Payroll + Finance | Financial output needs signoff. | Payroll final approval. |
| Tenant Admin | Access/security decision. | Support access. |

## Effective Dating Workflow Versions

Use workflow versions when approval route changes from a date.

Example: From 01 Nov 2026, leave approval needs manager plus HR for leave above 5 days.

Correct approach:

1. Keep current route active for existing requests.
2. Create new workflow version effective `01 Nov 2026`.
3. Add condition: requested leave units > 5.
4. Route large leave requests to HR after manager.
5. Test before activation.
6. Confirm old pending requests still follow old route unless tenant policy says otherwise.

Do not edit a live route if it will confuse in-progress requests.

## Escalation Rules

Escalation prevents quiet failures.

| Situation | Recommended escalation |
| --- | --- |
| Manager inactive | Route to HR Admin immediately. |
| Manager missing | Route to HR Admin immediately and flag Employee Master. |
| Manager overdue | Escalate to HR after configured SLA. |
| Payroll review overdue | Escalate to Payroll lead and Finance if close is at risk. |
| Document review overdue | Escalate to HR Admin lead. |
| Support access pending | Escalate to Tenant Admin/security owner. |

Escalation should not route to the same person who is missing or inactive.

## Negative Scenario: Approval Stuck With Manager

Symptoms:

- Employee sees request pending for too long.
- Manager does not see it in MSS.
- HR Dashboard shows pending approvals.

Fix:

1. Open employee profile.
2. Confirm reporting manager is active.
3. Confirm manager has MSS access.
4. Open workflow template.
5. Confirm route uses reporting manager.
6. Check escalation and fallback.
7. Reassign or escalate if policy allows.
8. Retest with a new request if configuration changed.

If manager mapping is wrong, fix Employee Master first. Do not bypass workflow by editing final status without evidence.

## Negative Scenario: Workflow Template Missing

Symptoms:

- Launch Readiness shows workflow template missing.
- Leave or attendance request cannot submit.
- Process opens but has no approver.

Fix:

1. Identify module: leave, attendance, lifecycle, documents, payroll, or support.
2. Open **Workflows**.
3. Create or activate required template.
4. Confirm trigger is correct.
5. Confirm fallback owner exists.
6. Test one request.
7. Return to Launch Readiness or Payroll Control and confirm blocker clears.

## Negative Scenario: Rejection Without Reason

Problem:

- Employee sees rejected status but does not know what to fix.
- HR gets repeated support questions.

Fix:

1. Require rejection notes on workflow step.
2. Use employee-facing note templates.
3. Train reviewers to write exact correction:

   `Upload bank proof showing account holder name, account number, and IFSC.`

4. Audit rejected items with empty or unclear notes.

## Negative Scenario: Wrong Approver After Transfer

Example: Employee transferred departments, but leave still routes to old manager.

Fix:

1. Check Lifecycle movement effective date.
2. Confirm Employee Master manager changed after effective date.
3. Confirm new manager has MSS access.
4. Check whether request was created before or after manager change.
5. For new requests, retest routing.
6. For already pending requests, reassign or escalate according to policy.

## Negative Scenario: Too Many Approval Levels

Symptoms:

- Employees do not understand where request is stuck.
- Managers ignore low-risk approvals.
- Payroll close waits on approvals that add no real control.

Fix:

1. Map the business risk.
2. Remove unnecessary steps.
3. Use escalation instead of extra approvals where possible.
4. Keep employee-facing status simple.
5. Require higher approval only for exceptions, high-value changes, or payroll-impacting actions.

## Buttons And Actions

| Action | What it does | Use carefully when |
| --- | --- | --- |
| Create template | Starts a new workflow design. | Trigger and module must be clear. |
| Add step | Adds approval/review stage. | Extra steps add friction. |
| Activate | Makes workflow usable for new requests. | Test first. |
| Deactivate / retire | Stops new usage. | Do not break pending requests. |
| New version | Creates changed route from a date. | Preferred for route changes. |
| Preview / test route | Checks approver resolution. | Use before rollout. |
| Reassign | Moves pending action to another owner if allowed. | Keep reason and evidence. |
| Escalate | Sends overdue item to fallback. | Ensure fallback can act. |

## Before Marking Workflow Work Complete

| Check | Expected result |
| --- | --- |
| Template names | Short and business-friendly. |
| Triggers | Correct event starts correct workflow. |
| Approvers | Reporting manager, role, or named owner resolves correctly. |
| Fallback | Missing owner does not cause silent stuck item. |
| Escalation | Overdue tasks move to useful owner. |
| Rejection notes | Required where employee correction is needed. |
| Versioning | Future changes do not confuse old requests. |
| ESS test | Employee can submit and track status. |
| MSS test | Manager sees approval. |
| HR Admin test | HR can view, reassign, or resolve stuck items. |
| Payroll impact | Payroll-impacting approvals are clear before input lock. |
| Audit | Decision actor, timestamp, note, and status are visible. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Manager cannot see approval | Manager missing, inactive, or lacks MSS access. | Fix Employee Master and access. |
| Request has no approver | Template trigger or approver resolution missing. | Fix workflow route. |
| Approval stuck overdue | Escalation missing or wrong. | Add escalation owner and reassign if allowed. |
| Employee sees rejected without reason | Rejection note not required. | Require rejection comments. |
| Old manager receives request | Manager change not effective or request created before change. | Check lifecycle effective date and request creation date. |
| Launch blocker says workflow missing | Required template inactive or absent. | Create/activate template and test. |
| Payroll cannot close because approvals pending | Leave/attendance/payroll review pending. | Resolve approvals before lock or document approved exception. |

## FAQ

### Should workflows use roles or named users?

Use roles or dynamic relationships wherever possible: reporting manager, HR Admin, Payroll Admin, Finance Manager. Use named users only for small tenants or temporary controlled exceptions.

### What is the most important fallback?

HR Admin fallback for employee self-service flows. Missing manager should not permanently block leave, attendance, documents, or lifecycle work.

### Should every process need approval?

No. Approval should match business risk. Low-risk informational updates should not create unnecessary approval queues.

### What should happen when a manager is on leave?

Use delegation, alternate approver, or HR fallback depending on tenant policy. The workflow should not depend on one unavailable person.

### Can workflow changes affect existing requests?

They can, depending on implementation. Safer practice is to version the workflow and apply new route to new requests from a chosen date.

## Related Guides

- [Policies](policies.md)
- [Employees](employees.md)
- [Lifecycle](lifecycle.md)
- [Leave Management](leave.md)
- [Attendance](attendance.md)
- [Documents](documents.md)
- [Payroll Control](payroll/payroll-control.md)
- [Leave and Attendance to Payroll](../workflows/leave-attendance-to-payroll.md)
