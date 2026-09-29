# HR Admin Reports and Audit

Reports and audit pages help HR, payroll, and compliance teams prove what happened and export operational evidence.

## Purpose

Use Reports and Audit to inspect operational information, export evidence, and answer who changed what, when, and why.

## Use these pages when

- HR or finance needs payroll, employee, attendance, leave, or statutory reports.
- A compliance reviewer asks for evidence.
- A sensitive record changed and must be investigated.
- Payroll approval needs supporting reports.
- Launch readiness requires evidence.

## Reports

Use Reports to inspect workforce, payroll, attendance, leave, statutory, and compliance information.

### Common report groups

| Group | Examples |
| --- | --- |
| Workforce | Employee master, lifecycle aging, manager mapping. |
| Time and leave | Attendance register, attendance exceptions, leave balance. |
| Payroll | Payroll register, salary variance, bank advice, payslip publication. |
| Compliance | PF, ESIC, professional tax, LWF, TDS, statutory deductions. |
| Operations | Export audit, provider receipts, finance handoff exceptions. |

![Reports catalog](../assets/screenshots/hr-admin/reports-catalog.png)

## Which report should I use?

| Question | Start with |
| --- | --- |
| Who is active, inactive, on notice, or missing structure? | Workforce reports. |
| Which attendance records or exceptions affect payroll? | Attendance register or attendance exceptions. |
| What are current leave balances? | Leave balance report. |
| What changed in payroll totals? | Payroll register, salary variance, payroll review exceptions. |
| Which employees are missing bank/statutory readiness? | Payroll close readiness or payroll input exceptions. |
| What can finance pay? | Bank advice and finance handoff reports. |
| Are statutory filings ready? | PF, ESIC, PT, LWF, TDS, statutory filing reports. |
| Who downloaded or exported evidence? | Export audits and Audit page. |

### Report controls

| Control | Meaning |
| --- | --- |
| Report group | Workforce, payroll, attendance, leave, compliance, or operations. |
| Period | Date range or payroll period. |
| Filters | Employee, department, legal entity, branch, status, or report-specific filters. |
| Run report | Generates report preview. |
| Export | Downloads the report when allowed. |
| Download audit | Downloads evidence or export trail. |

## Report drilldown pattern

Most report pages follow the same pattern:

1. Select the report or open the report route from the catalog.
2. Choose period, legal entity, branch, department, or payroll run.
3. Apply filters.
4. Review the preview counts.
5. Open row details if a value looks wrong.
6. Export only when the report is final or evidence is required.
7. Store exported files in approved secure locations.

Do not use old exports as current evidence. Re-run the report for the correct period before approval, payroll close, or audit submission.

## Evidence quality checklist

| Check | Expected result |
| --- | --- |
| Period | Matches the payroll, compliance, or review period. |
| Scope | Legal entity, branch, department, and employee filters are correct. |
| Totals | Match the approved payroll or source page. |
| Export owner | Exported by an authorized user. |
| Timestamp | Evidence is recent enough for the decision. |
| Sensitive data | Stored only in approved locations. |
| Exception notes | Any unresolved issue has owner and explanation. |

### Good practice

Run reports before payroll approval and after payroll publication. Keep exported reports only in approved secure locations.

## Audit

Use Audit to review system evidence for sensitive actions.

### What audit helps answer

- Who changed a record?
- What changed?
- When did it change?
- Was approval required?
- Which workflow generated the event?

![Audit log detail](../assets/screenshots/hr-admin/audit-log-detail.png)

### Audit filters

| Filter | Meaning |
| --- | --- |
| Actor | User who performed the action. |
| Module | Employee, payroll, document, leave, notification, or other area. |
| Action | Create, update, delete, approve, reject, publish, export. |
| Date range | Time window to inspect. |
| Entity | Record affected by the action. |

### Audit review checklist

- Confirm actor identity.
- Confirm action timestamp.
- Confirm old and new values where available.
- Confirm approval workflow if required.
- Confirm export/download events for sensitive files.

## Audit investigation pattern

1. Start with the user question: actor, record, period, or module.
2. Use the narrowest date range possible.
3. Search by entity reference when available.
4. Compare old and new values.
5. Check whether workflow approval was required.
6. If a file was exported, confirm actor and timestamp.
7. Record the evidence location or export only if policy allows.

Audit logs explain what happened. They do not fix source data. Correct the owning record after the investigation if the data is wrong.

## Reports vs Audit

| Need | Use |
| --- | --- |
| Current operational totals | Reports |
| Employee/payroll/compliance list | Reports |
| Exportable business evidence | Reports |
| Who changed something | Audit |
| Who approved or rejected something | Audit |
| Who downloaded sensitive output | Audit |
| Launch/payroll signoff packet | Reports plus Audit |

## Launch readiness

Use Launch Readiness to resolve blockers before production use.

![Launch remediation](../assets/screenshots/hr-admin/launch-remediation.png)

### Common blockers

- Missing HR roles.
- Missing manager role.
- Incomplete organization masters.
- Employee master warnings.
- Notification delivery failures.
- Payroll live rails not ready.

### Launch workflow

1. Open Launch Readiness or Launch Remediation.
2. Review blockers before warnings.
3. Open the action button for the blocker.
4. Fix the source issue.
5. Return to Launch Readiness.
6. Confirm gate count improved.
7. Download or keep evidence when signoff is required.

## FAQ

### Should I export every report?

No. Export only when evidence is needed for approval, finance, compliance, or audit. Use on-screen review for routine checks.

### Why do report totals differ from payroll outputs?

Check period, payroll run, filters, locked input status, and whether the report is using source data or approved payroll output.

### Can audit logs replace approval notes?

No. Audit logs show events. Approval notes explain business rationale. Use both when a reviewer asks why something was accepted.

### What should I send to finance?

Use approved payroll outputs, bank advice, finance handoff evidence, and only the reports finance requested for the final run.
