# HR Admin Documents

Document pages manage employee document requirements, uploads, verification, and compliance readiness.

## Purpose

Use Documents to define what employees must upload, review submitted files, approve valid documents, reject incorrect documents, and track compliance readiness.

## Use this page when

- A new tenant needs document requirements.
- Employees have pending or rejected documents.
- HR needs to verify identity, address, education, employment, tax, bank, or statutory proof.
- Payroll readiness depends on a document.
- Documents are expiring or need renewal.

## Page sections

| Section | Meaning |
| --- | --- |
| Document dashboard | Summary of pending, rejected, expiring, and verified documents. |
| Backlog queue | Employee submissions waiting for review. |
| Categories | Document families such as identity, address, tax, bank, education. |
| Requirements | Rules that decide who must submit which document. |
| Employee review | Review page for one employee document item. |
| Evidence trail | Status, reviewer, timestamp, notes, and file evidence. |


![Documents control dashboard](../assets/screenshots/hr-admin/documents-dashboard.png)

## Document lifecycle

| Status | Meaning | User action |
| --- | --- | --- |
| Required | Employee needs to upload or HR needs to attach the file. | Send request or upload document. |
| Pending review | File is submitted and waiting for HR review. | Open and review. |
| Verified | HR accepted the document. | No action unless renewal is needed. |
| Rejected | HR rejected the file with a reason. | Employee or HR uploads corrected file. |
| Expiring | Verified document is close to expiry. | Request renewal. |
| Expired | Document is no longer valid. | Request valid document and review again. |

## Documents dashboard

Use the documents area to track pending, rejected, expiring, and verified employee documents.

### What you can do

- Review document backlog.
- Open employee document submissions.
- Verify or reject documents.
- Send reminders.
- Track document compliance.

## Document categories

Use categories to group documents such as identity, address, education, employment, tax, or bank documents.

| Category | Examples |
| --- | --- |
| Identity | PAN, Aadhaar, passport, voter ID. |
| Address | Utility bill, rental agreement, Aadhaar address proof. |
| Education | Degree certificate, mark sheet. |
| Employment | Offer letter, experience letter, relieving letter. |
| Tax | PAN, tax declaration evidence. |
| Bank | Cancelled cheque, passbook proof. |

## Requirement design guidance

Good requirements are specific enough to create clear employee requests but not so specific that HR must maintain many duplicate rules.

| Requirement decision | Guidance |
| --- | --- |
| Scope | Define whether the requirement applies to all employees or only by legal entity, location, employee type, role, or lifecycle event. |
| Mandatory flag | Mark mandatory only when the process truly cannot continue without it. |
| Expiry required | Use for documents such as visa, passport, certification, or contract proof where renewal matters. |
| Employee visibility | Make employee-facing names simple and recognizable. |
| Reviewer guidance | Include enough context so HR knows what to check. |
| Payroll impact | Mark or document requirements that affect payroll, statutory, bank, or launch readiness. |

## Document requirements

Use requirements to define which employees must submit which documents.

### Examples

- PAN card required for all employees.
- Address proof required for payroll onboarding.
- Experience letter required for lateral hires.
- Visa document required for specific work locations.

### Requirement fields

| Field | Meaning |
| --- | --- |
| Requirement name | User-facing name shown to HR and employees. |
| Category | Document family. |
| Applies to | Employee group, country, legal entity, employee type, or role. |
| Mandatory | Whether employee must submit it. |
| Expiry required | Whether expiry date must be captured. |
| Active | Whether the requirement is currently used. |

## Requirement examples by use case

| Use case | Typical requirement |
| --- | --- |
| Payroll onboarding | PAN, bank proof, address proof where needed. |
| Statutory readiness | PAN, tax declaration evidence, statutory forms. |
| Joiner onboarding | Identity, address, education, previous employment. |
| Contractor onboarding | Contract, identity, tax information. |
| Location-specific compliance | Visa/work permit or local registration proof. |

## Employee document review

### Review checklist

- The file belongs to the correct employee.
- Document type matches the requirement.
- Name and identifier are readable.
- Expiry date is captured if required.
- Reject reason is clear if the document is not accepted.

### Verification decision table

| Situation | Decision |
| --- | --- |
| File is clear, correct, belongs to employee, and all required details are present | Verify / Approve |
| File is unreadable, cropped, incomplete, or wrong type | Reject with exact correction |
| Name or identifier differs from employee profile | Pause and check whether employee profile or document is wrong |
| Document is expired and expiry matters | Reject or request renewal |
| Document is valid but has a minor exception allowed by policy | Verify with note, if policy permits |

## Buttons and actions

| Button | What it does |
| --- | --- |
| Review | Opens the selected document submission. |
| Verify / Approve | Marks document as accepted. |
| Reject | Rejects the document and records reason. |
| Send reminder | Sends reminder to employee. |
| Download | Downloads the submitted file when allowed. |
| Add requirement | Creates a new document requirement. |
| Save | Saves category or requirement changes. |

## Reviewer notes

Write notes as if the employee will read them without HR context.

Good:

- "Upload the back side also. Current file only includes the front side."
- "The file is blurred. Upload a clearer image or PDF."
- "This document expired on 31 Aug 2026. Upload a valid document."

Avoid:

- "Wrong."
- "Invalid."
- "Rejected."

## Recommended workflow

1. Define categories.
2. Create requirements.
3. Let employees upload documents through ESS.
4. Open document backlog.
5. Review each submission.
6. Approve valid documents.
7. Reject invalid documents with a clear reason.
8. Recheck dashboard counts and payroll readiness.

## Payroll and launch impact

Some documents can block readiness when policy requires verification before payroll or launch.

| Document area | Possible impact |
| --- | --- |
| Bank proof | Payroll payout readiness and bank account verification. |
| PAN / tax evidence | TDS and statutory reporting readiness. |
| Identity proof | Joiner onboarding and employee verification. |
| Address proof | Statutory, local compliance, and employee record quality. |
| Contract or employment proof | Employee type and lifecycle evidence. |
| Expiring documents | Compliance reminders and launch readiness warnings. |

If Payroll Control or Launch Readiness points to a document issue, fix the document source and return to the readiness page to confirm counts changed.

## Good practice

Keep rejection messages simple and actionable. Employees should know exactly what to upload next.

Do not download and share employee documents outside approved secure channels.

## Before marking document work complete

| Check | Expected result |
| --- | --- |
| Categories | Clear, non-duplicate document families. |
| Requirements | Active, scoped, and understandable. |
| Pending backlog | Reviewed or assigned. |
| Rejections | Clear employee-facing reasons. |
| Expiry dates | Captured where required. |
| Payroll/launch blockers | Cleared or intentionally documented. |
| Evidence trail | Reviewer, timestamp, decision, and notes are present. |

## FAQ

### Should HR verify every uploaded document?

Verify documents required by tenant policy, compliance, payroll, onboarding, or launch readiness. Optional documents may still be reviewed if the tenant process requires it.

### Can HR upload documents on behalf of an employee?

Yes, when allowed by policy. The evidence trail should still show who uploaded or reviewed the document.

### What if an employee uploaded the correct document under the wrong category?

Reject with a clear reason and ask for upload under the correct request, or reattach through an approved HR workflow if allowed.

### Why does a verified document still show a warning?

Check expiry date, requirement scope, duplicate requirement, payroll period, and whether the readiness page has refreshed after verification.
