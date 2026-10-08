# HR Admin Documents

Use **Documents** to decide what employees must submit, review the files they upload, accept or reject evidence, track expiry, and clear document-related onboarding, payroll, statutory, and launch blockers.

This guide is written for HR Admin users who need a practical operating playbook, not only a page description.

## On This Page

- [Document Quick Navigation](#document-quick-navigation)
- [What Documents Owns](#what-documents-owns)
- [Use This Page When](#use-this-page-when)
- [Before Employee Onboarding](#before-employee-onboarding)
- [Page Sections](#page-sections)
- [Document Lifecycle](#document-lifecycle)
- [Recommended Operating Flow](#recommended-operating-flow)
- [Document Categories](#document-categories)
- [Requirement Design](#requirement-design)
- [Employee Upload From ESS](#employee-upload-from-ess)
- [HR Review Checklist](#hr-review-checklist)
- [Verification Decision Table](#verification-decision-table)
- [Payroll And Launch Impact](#payroll-and-launch-impact)
- [Daily Review Routine](#daily-review-routine)
- [Troubleshooting](#troubleshooting)
- [Document signoff checklist](#document-signoff-checklist)

## Document Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Configure documents before onboarding | [Before Employee Onboarding](#before-employee-onboarding) | [Requirement Design](#requirement-design) |
| Create PAN, bank, passport, or employment proof requirement | [Document Categories](#document-categories) | [Requirement Fields](#requirement-fields) |
| Test employee upload from ESS | [Employee Upload From ESS](#employee-upload-from-ess) | [Recommended Operating Flow](#recommended-operating-flow) |
| Review uploaded proof | [HR Review Checklist](#hr-review-checklist) | [Verification Decision Table](#verification-decision-table) |
| Write a clear rejection note | [Rejection Notes](#rejection-notes) | [Negative Scenario: Wrong Category Or Wrong File](#negative-scenario-wrong-category-or-wrong-file) |
| Fix employee cannot see document request | [Negative Scenario: Employee Cannot See Document Request](#negative-scenario-employee-cannot-see-document-request) | [Requirement Design](#requirement-design) |
| Clear document payroll or launch blockers | [Payroll And Launch Impact](#payroll-and-launch-impact) | [Document signoff checklist](#document-signoff-checklist) |
| Run daily HR document review | [Daily Review Routine](#daily-review-routine) | [Before Marking Document Work Complete](#before-marking-document-work-complete) |

## What Documents Owns

Documents owns the proof lifecycle:

| Area | What it controls | Example |
| --- | --- | --- |
| Categories | Broad document families. | Identity, address, bank, tax, education. |
| Requirements | Which employee group must submit which proof. | PAN required for all India payroll employees. |
| Employee upload | Employee-facing request in ESS. | Employee uploads PAN PDF from ESS. |
| HR review | HR verifies, rejects, or asks for correction. | HR rejects blurred cancelled cheque. |
| Expiry tracking | Renewal tracking for time-bound proof. | Passport expires on 31 Mar 2027. |
| Evidence trail | Who uploaded, reviewed, rejected, or accepted. | Reviewer, timestamp, notes, file reference. |

Documents does not replace Employee Master, Organization, Leave, Attendance, Salary Setup, or Statutory Payroll. It supplies evidence to those workflows.

![Documents control dashboard](../assets/screenshots/hr-admin/documents-dashboard.png)

## Use This Page When

- A new tenant needs document requirements before employee onboarding.
- Employees are seeing missing document requests in ESS.
- HR needs to verify identity, address, bank, education, employment, tax, or statutory proof.
- A document is rejected, expired, unreadable, or uploaded in the wrong category.
- Payroll readiness says a bank, PAN, statutory, or onboarding document is missing.
- Launch Readiness says document verification is incomplete.
- A compliance or audit reviewer asks for document evidence.

## Before Employee Onboarding

Configure document rules before inviting employees. Otherwise employees may log in, see no requests, and HR will later need manual follow-up.

Minimum India tenant setup:

| Requirement | Typical scope | Why it matters |
| --- | --- | --- |
| PAN card | All India payroll employees. | TDS, payroll, statutory identity. |
| Bank proof | Employees receiving salary through payroll. | Payout validation. |
| Address proof | Employees where tenant policy requires address verification. | Employee record quality and compliance. |
| Aadhaar or government ID | Where tenant policy requires identity verification. | Identity proof. |
| Education proof | Roles where qualification proof is required. | Hiring and audit evidence. |
| Previous employment proof | Lateral hires. | Experience verification. |
| Tax declaration proofs | Employees submitting old-regime deductions. | TDS proof verification. |
| Passport or visa | Employees where travel/work authorization matters. | Expiry and compliance tracking. |

Do not create every possible document as mandatory. Mandatory documents should be documents the process truly cannot continue without.

## Page Sections

| Section | Meaning | What HR should do |
| --- | --- | --- |
| Dashboard | Pending, rejected, expiring, and verified document counts. | Start here daily. |
| Backlog queue | Employee submissions waiting for review. | Review oldest and payroll-impacting items first. |
| Categories | Document families used by requirements. | Keep names simple and non-duplicate. |
| Requirements | Rules that decide who must upload which proof. | Configure before employees log in. |
| Employee review | One uploaded document and its verification decision. | Accept, reject, or request correction. |
| Evidence trail | File, status, reviewer, timestamp, notes. | Use for audit and launch evidence. |

## Document Lifecycle

| Status | Meaning | Who acts next |
| --- | --- | --- |
| Required | Employee must upload the document, or HR must attach it. | Employee / HR |
| Pending review | File is uploaded and waiting for HR review. | HR Admin |
| Verified | HR accepted the file. | No action unless renewal is needed. |
| Rejected | HR rejected the file and added a reason. | Employee uploads corrected file. |
| Expiring | Verified file is near expiry. | HR requests renewal. |
| Expired | File is no longer valid. | Employee uploads valid replacement. |
| Waived / exception | Requirement is intentionally not needed for this employee. | HR documents reason if policy allows. |

## Recommended Operating Flow

1. Create document categories.
2. Create document requirements with the right scope.
3. Test with one employee in ESS.
4. Confirm the request appears in **ESS > Documents**.
5. Ask the employee to upload a sample file.
6. Review the upload in **HR Admin > Documents**.
7. Verify valid proof or reject with a clear reason.
8. Recheck employee profile, Payroll Control, and Launch Readiness if the document was a blocker.

## Document Categories

Categories are reusable groups. Keep them stable because requirements, employee uploads, and audit evidence refer to them.

| Category | Use for | Good category name | Avoid |
| --- | --- | --- | --- |
| Identity | PAN, Aadhaar, passport, voter ID. | Identity Proof | PAN Documents 2026 |
| Address | Utility bill, Aadhaar address, rent agreement. | Address Proof | Misc Address |
| Bank | Cancelled cheque, passbook, bank statement. | Bank Proof | Salary File |
| Tax | Form 12BB proof, 80C, 80D, HRA rent receipts. | Tax Proof | Employee Tax Docs |
| Education | Degree, mark sheet, certification. | Education Proof | College Paper |
| Employment | Offer, relieving, experience, previous payslips. | Previous Employment | Old Company Files |
| Contract | Consultant contract, work order, fixed-term agreement. | Contract Proof | Vendor Stuff |
| Exit | Handover, asset return, resignation acceptance. | Exit Evidence | Leaving Docs |

Good category names are short, employee-friendly, and do not include year-specific or employee-specific text.

## Requirement Design

Requirements decide what appears to employees and what HR must verify.

| Design decision | Guidance | Example |
| --- | --- | --- |
| Scope | Use the narrowest rule that matches the real policy. | PAN for India payroll employees, not global employees. |
| Mandatory | Mark mandatory only if payroll, onboarding, statutory, or launch cannot proceed without it. | Bank proof mandatory for salaried employees. |
| Employee-facing name | Use plain language. | `PAN Card` instead of `Permanent Account Number Evidence`. |
| Expiry required | Use only when renewal matters. | Passport, visa, contract, certification. |
| Allowed formats | Prefer PDF/JPG/PNG unless policy says otherwise. | PAN PDF or image. |
| Reviewer guidance | Explain what HR should check. | Name, PAN number, readability. |
| Payroll impact | Use when missing or rejected proof must block payroll readiness. | Bank proof, PAN proof. |
| Active flag | Deactivate old requirements instead of deleting evidence history. | Old Covid declaration requirement inactive. |

## Requirement Fields

| Field | What to enter | Example |
| --- | --- | --- |
| Requirement name | Employee-friendly name. | `PAN Card` |
| Category | Document family. | `Identity Proof` |
| Applies to | Employee group or organization scope. | Legal entity `Accerio India Pvt Ltd` |
| Employee type | Optional filter. | Full-time employees only |
| Branch/location | Optional location scope. | Bengaluru HO |
| Mandatory | Whether process can proceed without it. | Yes |
| Expiry required | Whether expiry date must be captured. | No for PAN, yes for passport |
| Reviewer guidance | What HR must verify. | Match employee name and PAN number |
| Active | Whether the requirement is used. | Active |

## Example: Configure PAN Requirement

Use this for all India payroll employees.

1. Open **HR Admin > Documents**.
2. Open **Requirements**.
3. Click **Add requirement**.
4. Enter:

| Field | Value |
| --- | --- |
| Requirement name | `PAN Card` |
| Category | `Identity Proof` or `Tax Proof` depending on tenant catalog |
| Scope | `Accerio India Pvt Ltd` or India payroll employees |
| Mandatory | Yes |
| Expiry required | No |
| Reviewer guidance | `Verify employee name and PAN are readable. Use PAN for payroll and TDS readiness.` |
| Active | Yes |

5. Save.
6. Open one employee in ESS and confirm **PAN Card** appears in required uploads.

Expected result:

- Employee can upload PAN from ESS.
- HR sees upload in pending review.
- Verified PAN clears document readiness where configured.

## Example: Configure Bank Proof Requirement

Use this when payroll cannot pay employees without verified bank details.

1. Open **Documents > Requirements**.
2. Add requirement `Bank proof`.
3. Set category `Bank Proof`.
4. Scope to payroll employees or the relevant legal entity.
5. Mark mandatory.
6. Add reviewer guidance:

   `Accept cancelled cheque, passbook first page, or bank statement showing employee name, account number, and IFSC. Reject if unreadable or account holder does not match employee.`

7. Save.

Expected result:

- Employees know exactly what bank proof to upload.
- HR can reject incomplete bank proof with a clear reason.
- Payroll Control can use verification status for payout readiness.

## Example: Previous Employment Proof For Lateral Hires

Use this only when previous employment evidence is required.

| Field | Value |
| --- | --- |
| Requirement name | `Previous employment proof` |
| Category | `Previous Employment` |
| Scope | Lateral hires, experienced employee type, or onboarding workflow group |
| Mandatory | Tenant policy decision |
| Expiry required | No |
| Reviewer guidance | `Accept relieving letter, experience letter, or latest payslip according to hiring policy.` |

Do not apply this to interns or freshers unless the tenant policy explicitly requires it.

## Example: Passport Or Visa Expiry Tracking

Use this for employees where work authorization or travel documents matter.

1. Create category `Work Authorization`.
2. Create requirement `Passport / visa proof`.
3. Mark expiry required.
4. Scope it only to employees who need it.
5. Ask HR to verify both document identity and expiry date.

Expected result:

- Expiring documents appear before they become expired.
- HR can request renewal before payroll, travel, or compliance is affected.

## Employee Upload From ESS

Employee flow:

1. Employee opens **ESS > Documents**.
2. Employee reads required document request.
3. Employee selects the matching file.
4. Employee adds expiry date if the request requires it.
5. Employee submits.
6. Status becomes pending review.

Expected employee experience:

- The request name is understandable.
- Accepted file types and required details are clear.
- Rejection reason is visible if HR rejects it.

Related guide: [ESS Documents](../ess/documents.md)

## HR Review Checklist

Before clicking **Verify**, confirm:

| Check | What good looks like |
| --- | --- |
| Employee match | File belongs to the selected employee. |
| Document type | File matches the requested document. |
| Readability | Name, number, date, and key fields are readable. |
| Completeness | Front/back or all pages are included where needed. |
| Expiry | Expiry is captured if the document expires. |
| Name mismatch | Any mismatch is resolved or documented. |
| Payroll impact | Payroll-critical documents are not accepted casually. |
| Notes | Any exception is recorded. |

## Verification Decision Table

| Situation | Decision |
| --- | --- |
| Clear PAN showing correct employee name and number | Verify |
| Cancelled cheque shows employee name, account number, and IFSC | Verify |
| File is blurred or cropped | Reject with correction reason |
| Aadhaar uploaded for PAN requirement | Reject or move only if approved workflow supports recategorization |
| Name does not match employee record | Pause and decide whether employee profile or document needs correction |
| Document expired and expiry matters | Reject or request renewal |
| Employee uploaded old address proof but current address changed | Reject or ask for current address proof |
| Minor spelling variation is acceptable by tenant policy | Verify with reviewer note |

## Rejection Notes

Write rejection notes as if the employee reads them without HR context.

Good notes:

- `Upload a clearer image. The PAN number is not readable.`
- `Upload both sides. Current file includes only the front side.`
- `Upload bank proof that shows account holder name, account number, and IFSC.`
- `This passport expired on 31 Aug 2026. Upload a valid document.`
- `This file is Aadhaar, but the request is for PAN Card. Upload PAN under this request.`

Avoid:

- `Wrong.`
- `Invalid.`
- `Bad file.`
- `Rejected.`

## Buttons And Actions

| Action | What it does | Use carefully when |
| --- | --- | --- |
| Review | Opens the uploaded document item. | You need to inspect proof before deciding. |
| Verify / Approve | Marks proof accepted. | Document is correct, readable, and belongs to the employee. |
| Reject | Rejects proof and records correction reason. | Employee must upload a better or different file. |
| Send reminder | Reminds employee to upload or correct proof. | Employee has not acted or proof is pending too long. |
| Download | Opens or downloads submitted file when permission allows. | Use only for approved business purpose. |
| Add requirement | Creates a required document rule. | Requirement scope must be understood first. |
| Save | Saves category, requirement, or review changes and returns to the queue with a confirmation where applicable. | Confirm active/scope before saving. |

Do not download and share employee documents outside approved secure channels.

## Positive End-To-End Scenario

Scenario: HR configures PAN and bank proof for Accerio India, employee uploads both, HR verifies them, and payroll readiness clears.

1. HR opens **Documents > Requirements**.
2. HR creates `PAN Card` requirement for India payroll employees.
3. HR creates `Bank proof` requirement for payroll employees.
4. Employee opens **ESS > Documents**.
5. Employee uploads PAN and cancelled cheque.
6. HR opens **Documents > Backlog**.
7. HR verifies PAN after checking name and PAN number.
8. HR verifies bank proof after checking account holder name, account number, and IFSC.
9. HR opens **Payroll Control**.
10. HR confirms missing PAN or bank proof blocker is gone.

Expected result:

- Employee document statuses are verified.
- Evidence trail shows upload, reviewer, timestamp, and decision.
- Payroll readiness no longer blocks for those proofs.

## Negative Scenario: Employee Cannot See Document Request

Likely causes:

| Cause | Fix |
| --- | --- |
| Requirement is inactive | Activate requirement. |
| Requirement scope excludes employee | Correct legal entity, branch, employee type, or policy group scope. |
| Employee profile missing organization values | Fix Employee Master structure. |
| Employee has no ESS access | Assign ESS access in employee access or Tenant Admin users. |
| Requirement was created after employee page loaded | Ask employee to refresh or sign in again. |

Do not ask the employee to upload manually until requirement scope is verified. If the request is scoped incorrectly, many employees may be affected.

## Negative Scenario: Wrong Category Or Wrong File

Example: Employee uploads Aadhaar under PAN request.

1. Open the document review.
2. Reject with clear reason:

   `This request is for PAN Card. Upload PAN under this request. Aadhaar should be uploaded only under identity proof if requested.`

3. Ask employee to resubmit from ESS.
4. Recheck pending review queue.

If your workflow supports HR recategorization, use it only when audit policy allows and the file is truly valid for another requirement.

## Negative Scenario: Name Mismatch

Example: Bank proof shows `A Gupta`, while Employee Master shows `Aditi Gupta`.

Recommended handling:

1. Do not immediately reject if the mismatch is minor.
2. Check tenant policy for accepted name variation.
3. If acceptable, verify with note:

   `Accepted. Bank proof initials match employee record per policy.`

4. If not acceptable, reject:

   `Account holder name does not clearly match employee profile. Upload proof with full account holder name or contact HR to correct profile.`

If Employee Master is wrong, correct Employee Master first and then review the document again.

## Negative Scenario: Expired Document

Example: Passport uploaded with expiry date before today.

1. Reject the document if expiry matters.
2. Use rejection reason:

   `This passport has expired. Upload a valid passport or renewed document.`

3. Confirm the item appears as rejected or renewal required.
4. If the employee cannot renew immediately, record exception only if tenant policy allows.

Do not mark expired compliance proof as verified unless an authorized exception exists.

## Negative Scenario: Payroll Blocker Remains After Verification

If Payroll Control still shows a document blocker after verification:

1. Confirm the verified document is under the correct requirement.
2. Confirm the requirement scope matches the employee and payroll period.
3. Confirm Employee Master has correct legal entity, branch, and employee type.
4. Check whether Payroll Control needs refresh or the payroll run is using locked old inputs.
5. If inputs are already locked, follow payroll correction process instead of editing documents silently.

## Negative Scenario: Duplicate Requirements

Example: Employee sees both `PAN`, `PAN Card`, and `Tax PAN Proof`.

Fix:

1. Decide the one canonical requirement.
2. Deactivate duplicate requirements.
3. Keep existing verified evidence visible for audit.
4. Communicate to employees which request should be used going forward.

Avoid deleting requirements if historical proof records reference them.

## Document Impact By Module

| Module | Impact |
| --- | --- |
| Employee Master | Confirms employee identity, bank, address, employment, and onboarding proof. |
| ESS | Shows required uploads, rejected proof, and correction requests. |
| MSS | Managers may see document-related onboarding or lifecycle blockers if exposed in workflows. |
| Payroll Control | Missing PAN, bank proof, statutory evidence, or required document can block readiness. |
| Statutory Payroll | PAN and tax proof support TDS and declaration verification. |
| Lifecycle | Joiner and exit workflows may require documents or handover evidence. |
| Launch Readiness | Missing required document setup or verification can block go-live. |
| Reports and Audit | Document decisions become evidence for compliance and customer review. |

## Payroll And Launch Impact

Some documents should block readiness when the tenant requires verification before payroll or launch.

| Document area | Possible impact |
| --- | --- |
| Bank proof | Salary payout readiness and bank account verification. |
| PAN | TDS and statutory reporting readiness. |
| Tax proof | Old-regime declaration verification and TDS calculation. |
| Identity proof | Joiner onboarding and employee verification. |
| Address proof | Employee record quality and location compliance. |
| Contract proof | Contractor or fixed-term employee evidence. |
| Expiring proof | Compliance warning or launch readiness blocker. |

If Payroll Control or Launch Readiness points to document issues, fix the document source first, then return to the readiness page and confirm the count changed.

## Daily Review Routine

Use this routine during onboarding or payroll close week:

1. Open **Documents**.
2. Check pending review count.
3. Filter payroll-impacting documents first.
4. Verify valid files.
5. Reject invalid files with exact reason.
6. Send reminders for overdue requests.
7. Check expiring documents.
8. Return to **Dashboard** or **Payroll Control** and verify blocker counts.

## Before Marking Document Work Complete

| Check | Expected result |
| --- | --- |
| Categories | Clear, non-duplicate document families. |
| Requirements | Active, scoped, and understandable. |
| Employee visibility | Sample employee can see the correct request in ESS. |
| Upload flow | Employee can upload supported file. |
| Dialog behavior | Upload/detail dialogs close with **Esc**, success actions return to the expected page, and failure messages remain visible for retry. |
| Pending backlog | Reviewed or assigned. |
| Verified decisions | Correct proof accepted with reviewer trail. |
| Rejections | Clear employee-facing reasons. |
| Expiry dates | Captured where required. |
| Payroll blockers | Cleared or intentionally documented. |
| Launch blockers | Cleared or intentionally documented. |
| Evidence trail | Reviewer, timestamp, decision, and notes are present. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Employee cannot see request | Requirement inactive, wrong scope, missing ESS access, or missing employee structure. | Fix requirement scope and employee access. |
| Upload is pending too long | HR backlog not reviewed or owner unclear. | Open backlog, assign reviewer, review proof. |
| Employee uploaded wrong file | Request name or guidance unclear. | Reject with clear reason and improve requirement guidance. |
| Verified proof still blocks payroll | Wrong requirement, locked payroll inputs, or readiness not refreshed. | Confirm requirement mapping and payroll run state. |
| Expiry warning stays after renewal | Old proof still selected, expiry not updated, or renewal not verified. | Verify renewed proof and confirm active record. |
| Duplicate upload requests | Multiple active requirements with overlapping scope. | Keep one canonical requirement, deactivate duplicates. |
| Download not available | User lacks permission or file storage access failed. | Check role, file availability, and audit policy. |

More detail: [Document Issues](../troubleshooting/documents.md)

## FAQ

### Should HR verify every uploaded document?

Verify documents required by tenant policy, payroll, statutory, onboarding, launch readiness, or audit. Optional documents may still be reviewed if the tenant process requires it.

### Can HR upload documents on behalf of an employee?

Yes, if policy allows. The evidence trail should still show who uploaded or reviewed the document.

### Should PAN be identity proof or tax proof?

Choose one tenant convention and stay consistent. Many India payroll teams treat PAN as tax/statutory proof; others group it under identity. The important part is that payroll and statutory checks know which requirement is canonical.

### What if the employee uploaded the correct document under the wrong request?

Reject with a clear reason and ask the employee to upload under the correct request, unless the product workflow supports secure recategorization with audit evidence.

### Why does a verified document still show a warning?

Check expiry date, requirement scope, duplicate requirements, payroll period, locked payroll inputs, and whether the readiness page has refreshed after verification.

### Can HR accept a document with a small mismatch?

Only if tenant policy allows it. Add a reviewer note explaining the decision.

## Document signoff checklist

| Check | Expected result |
| --- | --- |
| Required document categories exist. | Employee uploads route to the correct category. |
| Pending documents are reviewed. | Accept/reject decisions include reviewer and reason. |
| Rejections are actionable. | Employee can understand what to upload next. |
| Expiry-sensitive documents are tracked. | Expiring or expired documents show in HR queues. |
| Payroll-critical documents are clear. | PAN, bank, identity, and statutory proof blockers are resolved before payroll. |

## Related Guides

- [ESS Documents](../ess/documents.md)
- [Documents to Verification](../workflows/documents-to-verification.md)
- [Document Issues](../troubleshooting/documents.md)
- [Employees](employees.md)
- [Payroll Control](payroll/payroll-control.md)
- [Reports and Audit](reports-audit.md)
