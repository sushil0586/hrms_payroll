# Audit

Audit helps HR Admin users review evidence for sensitive actions, exports, approvals, and record changes.

## On This Page

- [Audit Quick Navigation](#audit-quick-navigation)
- [Purpose](#purpose)
- [Use this page when](#use-this-page-when)
- [Common audit questions](#common-audit-questions)
- [Filters](#filters)
- [Investigation workflow](#investigation-workflow)
- [Sensitive audit scenarios](#sensitive-audit-scenarios)
- [Practical examples](#practical-examples)
- [Negative scenarios](#negative-scenarios)
- [Troubleshooting](#troubleshooting)
- [Signoff checklist](#signoff-checklist)

## Audit Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Investigate who changed a record | [Investigation workflow](#investigation-workflow) | [Practical examples](#practical-examples) |
| Find export or sensitive activity | [Sensitive audit scenarios](#sensitive-audit-scenarios) | [Filters](#filters) |
| Prepare evidence for compliance or launch | [Common audit questions](#common-audit-questions) | [Signoff checklist](#signoff-checklist) |
| Fix missing or unclear evidence | [Negative scenarios](#negative-scenarios) | [Troubleshooting](#troubleshooting) |

## Purpose

Use Audit to answer who did what, when, from which module, and whether the change has supporting evidence.

![Audit log detail](../assets/screenshots/hr-admin/audit-log-detail.png)

## Use this page when

- A sensitive employee, payroll, document, access, or compliance record changed.
- A payroll or finance output was downloaded.
- A reviewer asks for proof of approval or rejection.
- A customer disputes a status change.
- Launch or payroll signoff requires evidence.

## Common audit questions

| Question | What to check |
| --- | --- |
| Who changed this record? | Actor, timestamp, module, and action. |
| What changed? | Old value and new value when available. |
| Was approval required? | Workflow or approval event linked to the action. |
| Was a file exported? | Export/download event, actor, and timestamp. |
| Was support access used? | Tenant Admin support access and trust audit evidence. |

## Filters

| Filter | Meaning |
| --- | --- |
| Actor | User who performed the action. |
| Module | Employee, payroll, document, leave, notification, or system area. |
| Action | Create, update, approve, reject, publish, export, retry, activate, or deactivate. |
| Date range | Time period to inspect. |
| Entity | Record affected by the action. |

## Investigation workflow

1. Identify the record or event being questioned.
2. Filter by module and date range.
3. Search for the employee, payroll run, notification, document, or export reference.
4. Open the relevant audit entry.
5. Compare actor, timestamp, action, and changed values.
6. Check linked workflow or approval evidence.
7. Export or record evidence only when policy allows.

## Sensitive audit scenarios

| Scenario | What to check |
| --- | --- |
| Employee master changed before payroll | Actor, changed fields, timestamp, payroll period. |
| Payroll output downloaded | Actor, file/output, timestamp, approved run. |
| Document rejected | Reviewer, rejection reason, employee/document reference. |
| Notification retried | Actor, retry time, status after retry. |
| Role or access changed | Actor, old role, new role, approval/support context. |
| Provider handoff failed or retried | Delivery job, actor/action, provider response. |

## Practical examples

### Employee bank details changed before payroll

1. Filter module to employee or payroll-related employee master activity.
2. Search by employee code or employee name.
3. Narrow the date range to the payroll input window.
4. Open the change event and compare old and new bank values.
5. Confirm the actor was authorized to make the change.
6. Record the audit reference in payroll review if the change affects net pay or bank advice.

Expected result: the change has a clear actor, timestamp, changed field, and employee reference.

### Payslip or payroll register downloaded

1. Filter by payroll module and export/download action.
2. Search by payroll run or period.
3. Confirm the download happened after approval or finalization.
4. Confirm the actor is allowed to access payroll output.
5. Use the audit entry as evidence for finance handoff.

Expected result: export evidence matches the approved payroll run and does not show unauthorized access.

### Document rejection dispute

1. Search by employee or document reference.
2. Open the rejection audit entry.
3. Confirm reviewer, reason, and timestamp.
4. Cross-check the document page for current status.
5. Use the rejection reason when responding to the employee.

Expected result: HR can explain why the document was rejected and what the employee must correct.

## Negative scenarios

| Issue | What it means | What to do |
| --- | --- | --- |
| No audit row exists | Wrong date/module filter, action did not happen, or action is not audited yet. | Widen filters, search by entity, then raise a product gap if still missing. |
| Actor is unexpected | Wrong user performed a sensitive action. | Review role/access and escalate to Tenant Admin if needed. |
| Timestamp is outside approval window | Change may have happened after cutoff. | Check payroll lock/approval timing before accepting output. |
| Audit row lacks reason | Decision evidence is incomplete. | Check workflow comments or source page, then update process training. |
| Export happened before approval | Payroll evidence may be unreliable. | Re-review payroll output and record remediation. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Search returns too many rows | Date range or module is too broad. | Filter by module, entity, and action. |
| Search returns no rows | Wrong entity reference or action happened in another workspace. | Search by employee code, payroll run, document ID, and user. |
| Evidence is hard to explain | Audit row proves action but not business reason. | Use workflow notes, rejection comments, or approval history with audit. |
| Export evidence is missing | Download happened outside tracked flow or did not complete. | Recreate export through approved flow and log evidence. |
| Support access is suspected | Activity may be under Tenant Admin trust audit. | Open Tenant Admin Trust Audit and compare timestamps. |

## Signoff checklist

| Check | Expected result |
| --- | --- |
| Sensitive changes have actor and timestamp. | Every reviewed event identifies who did it and when. |
| Payroll exports have approved run context. | Output evidence matches the payroll period and run. |
| Document decisions have reason. | Employee-facing correction can be explained. |
| Access changes have old/new role context. | Unauthorized access can be ruled out. |
| Audit exports are controlled. | Evidence is shared only with authorized users. |

## Good practice

- Use the narrowest date range possible.
- Search by employee, payroll run, notification, or document reference when available.
- Export audit evidence only when policy allows.
- Keep exported audit files in approved secure locations.
- Do not use audit logs as a replacement for correcting source data.

## FAQ

### Why can I not find an event?

Check the date range, module, entity reference, and whether the action happened in another workspace such as Tenant Admin or Finance Manager.

### Can audit prove why a user made a decision?

Audit proves the event. Decision notes or workflow comments explain the reason. Use both for approval disputes.

### Should audit evidence be shared with every HR user?

No. Audit evidence can include sensitive activity. Share only with authorized users and through approved channels.

## Related guides

- [Reports](reports-audit.md)
- [Tenant Admin Trust Audit](../tenant-admin/trust-audit.md)
- [Finance Manager Audit Evidence](../finance-manager/audit-evidence.md)
- [Admin Handoff Guide](../launch/admin-handoff.md)
