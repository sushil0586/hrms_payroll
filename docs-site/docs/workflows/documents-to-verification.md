# Documents to Verification

Use this workflow when employee documents must be requested, uploaded, reviewed, accepted, or rejected.

## Outcome

Required employee documents are complete, verified, and visible in the employee and audit records.

![Documents dashboard](../assets/screenshots/hr-admin/documents-dashboard.png)

## Owners

| Step | Owner |
| --- | --- |
| Configure requirement | HR Admin |
| Upload document | Employee or HR Admin |
| Review document | HR Admin |
| Resolve rejection | Employee or HR Admin |
| Audit verification | HR Admin or auditor |

## Step 1: Confirm Document Requirement

1. Open **HR Admin > Documents**.
2. Review required document categories and backlog.
3. Confirm whether the requirement applies to the employee, role, location, legal entity, or lifecycle event.

Check:

- Document type is correct.
- Requirement is active.
- Expiry rule is correct if the document expires.
- The employee is in scope for the requirement.

If the requirement is too broad, employees may see unnecessary upload requests. If it is too narrow, required documents may never be requested. Fix requirement scope before chasing individual employees.

## Step 2: Request or Upload the Document

If employee self-service is used:

1. Employee opens **ESS > Documents**.
2. Employee uploads the requested file.
3. Employee confirms file type and submits.

If HR uploads on behalf of the employee:

1. HR Admin opens employee document area.
2. Selects upload or attach action.
3. Uploads file and saves with document type.

Employee view:

![ESS documents](../assets/screenshots/ess/documents.png)

## Step 3: Review the Document

1. Open **HR Admin > Documents**.
2. Filter to pending or rejected documents.
3. Open the document review action.
4. Confirm the document belongs to the employee.
5. Check readability, document type, dates, identity details, and expiry.
6. Accept or reject.

Before deciding, confirm whether the document blocks payroll, onboarding, statutory compliance, or launch readiness. Critical documents should not be accepted with vague exceptions.

Accept when:

- File is readable.
- Document type matches requirement.
- Employee identity matches.
- Expiry is valid.
- Required fields are present.

Reject when:

- Wrong document was uploaded.
- File is blurred, cropped, or unreadable.
- Identity details do not match.
- Document is expired.
- Required page or side is missing.

## Step 4: Add Clear Rejection Notes

A useful rejection note tells the employee exactly what to fix.

Good examples:

- Upload a clear image of the front and back side.
- The file is unreadable. Upload a higher-resolution image.
- The document is expired. Upload a valid document.
- The name does not match the employee profile. Contact HR if the profile is wrong.

Avoid vague notes such as:

- Invalid.
- Wrong.
- Reupload.

## Step 5: Confirm Completion

1. Refresh **Documents**.
2. Confirm pending count reduced.
3. Open the employee profile if needed.
4. Confirm document status appears as verified.
5. Check dashboard readiness if document verification affects launch or payroll.

If the document was connected to a payroll or launch blocker, return to **Payroll Control** or **Launch Readiness** and confirm the blocker count changed.

## Do Not Proceed If

- The uploaded file cannot be read.
- The employee is mismatched.
- Expiry date is missing for expiring documents.
- Document is required for payroll or statutory compliance and remains pending.
- Rejection note does not explain the correction.

## Audit Evidence

Keep or review:

- Who uploaded the document.
- Who verified or rejected it.
- Verification date and time.
- Rejection reason.
- Expiry date.
- Linked employee record.

## Related Pages

- [HR Admin Documents](../hr-admin/documents.md)
- [Employees](../hr-admin/employees.md)
- [ESS Documents](../ess/documents.md)
- [Reports and Audit](../hr-admin/reports-audit.md)
