# Audit

Audit helps HR Admin users review evidence for sensitive actions, exports, approvals, and record changes.

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
