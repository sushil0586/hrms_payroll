# ESS Task Recipes

Use these recipes when you know the task but not the exact screen. Each recipe follows the latest ESS pattern: open the page, review the summary, use a focused modal for the action, then verify the result.

## Recipe Index

| Need | Start here |
| --- | --- |
| Apply leave or check balance | [Apply Leave](#apply-leave) |
| Correct attendance | [Regularize Attendance](#regularize-attendance) |
| Download salary proof | [Download A Payslip](#download-a-payslip) |
| Upload joining or identity proof | [Upload A Required Document](#upload-a-required-document) |
| Correct a rejected document | [Re-Upload A Rejected Document](#re-upload-a-rejected-document) |
| Start tax declaration | [Start Or Update A Tax Declaration](#start-or-update-a-tax-declaration) |
| Add tax proof | [Add Tax Proof](#add-tax-proof) |
| Submit tax declaration | [Submit A Tax Declaration](#submit-a-tax-declaration) |
| Understand an alert | [Review A Notification](#review-a-notification) |
| Prepare for payroll cutoff | [Prepare Before Payroll Cutoff](#prepare-before-payroll-cutoff) |

## Apply Leave

Use this when you want time off and the leave type is already assigned by HR.

1. Open **ESS > Leave**.
2. Review **Balance summary** for the leave type.
3. Select **Apply leave**.
4. Choose leave type, start date, end date, and day portions.
5. Add a clear reason.
6. Attach evidence only when the modal says it is required or useful.
7. Review **Request summary** and **Policy guidance**.
8. Select **Submit leave**.

Expected result:

- Request appears in leave history.
- Status becomes pending, approved, or submitted based on workflow.
- Manager review opens automatically when approval is required.

If the page says no active policy is assigned, HR must assign the employee to a leave policy before the employee can submit.

## Regularize Attendance

Use this when attendance is missing or incorrect.

1. Open **ESS > Attendance**.
2. Review **Today**, **Monthly summary**, and open exceptions.
3. Select **Regularize attendance**.
4. Choose the affected attendance date.
5. Enter corrected check-in or check-out time when required.
6. Add a reason, such as `Forgot to punch out after client meeting`.
7. Review the request summary.
8. Select **Submit regularization**.

Expected result:

- Regularization appears in request history.
- Manager can approve or reject it from MSS.
- Approved corrections can clear attendance blockers before payroll.

Do not submit a correction when the record is already accurate. Leave it untouched.

## Download A Payslip

Use this after payroll publishes payslips.

1. Open **ESS > Payslips**.
2. Check the **Latest payslip** band.
3. If needed, filter by year or search for the period.
4. Select **Review payslip**.
5. Confirm employee name, period, gross earnings, deductions, and net pay.
6. Select **Mark as read** if required.
7. Select **Download payslip**.

Expected result:

- The file downloads through the authenticated app route.
- Read/download access can be recorded as evidence.

If the month is missing, confirm payroll was published before contacting HR.

## Upload A Required Document

Use this when HR asks for PAN, address, bank, identity, education, employment, or other proof.

1. Open **ESS > Documents**.
2. Review the top readiness band.
3. Open the required document card.
4. Select **Upload** or **Upload document**.
5. Confirm the upload category.
6. Enter a clear title and document number if applicable.
7. Add expiry date if the document expires.
8. Attach the file.
9. Select **Submit for review**.

Expected result:

- The document appears in history.
- Status becomes pending review until HR accepts or rejects it.

Use a clear file. Blurry, cropped, expired, or wrong-category uploads are common rejection reasons.

## Re-Upload A Rejected Document

Use this when HR returned a file.

1. Open **ESS > Documents**.
2. Find the returned requirement or rejected history row.
3. Open **Review** and read the rejection note.
4. Select **Replace** or **Upload**.
5. Upload the corrected file under the same correct category.
6. Confirm the new version appears in history.

Expected result:

- The old rejected file remains in audit history.
- The corrected file becomes the latest item for HR review.

## Start Or Update A Tax Declaration

Use this when the active financial year is open.

1. Open **ESS > Tax Declarations**.
2. Select the correct tax year from the full-width tax year group.
3. Review the top **Tax declaration checklist**.
4. Select **Update declaration**.
5. Confirm tax regime, declaration profile, and proof window if shown.
6. Enter declaration values such as 80C, 80D, HRA, or previous employment where applicable.
7. Save the declaration.

Expected result:

- The selected tax year shows the updated declaration.
- The declaration remains draft until submitted or accepted as per tenant policy.

## Add Tax Proof

Use this after starting a declaration.

1. Open **ESS > Tax Declarations**.
2. Select the correct tax year.
3. Select **Add proof**.
4. Choose section and component.
5. Enter amount and proof reference.
6. Select the configured upload category.
7. Attach the proof file.
8. Submit proof.

Expected result:

- Proof appears in the proof register.
- HR/payroll can accept, partially accept, or reject it.

If **Add proof** is disabled, create/select a draft declaration or ask HR whether the proof window is closed.

## Submit A Tax Declaration

Use this when values and proof are ready.

1. Open **ESS > Tax Declarations**.
2. Select the active tax year.
3. Confirm PAN and tax profile look correct.
4. Confirm rejected proof count is zero or intentionally unresolved.
5. Select **Submit declaration**.
6. Read the final confirmation.
7. Confirm submission.

Expected result:

- Declaration moves from draft to submitted or review state.
- Payroll can use accepted values based on tenant rules.

Do not submit if you know a proof is wrong. Correct it first.

## Correct A Tax Declaration

Use this when values or proof changed.

1. Open **ESS > Tax Declarations**.
2. Select the active year.
3. Check whether the year is locked or consumed by payroll.
4. If editable, select **Update declaration** or **Add proof**.
5. If locked or consumed, contact HR/payroll with the correction required.

Expected result:

- Editable declarations can be corrected in ESS.
- Locked/consumed declarations remain controlled by HR/payroll.

## Review A Notification

Use this when an email, in-app alert, or workflow message needs attention.

1. Open **ESS > Notifications**.
2. Filter by unread, failed, high-priority, or source type.
3. Select **Review notification**.
4. Read the message, delivery state, and source context.
5. Use **Open source** if the notification points to leave, attendance, documents, payroll, or tax.
6. Mark it read after review.

Expected result:

- You understand the source workflow.
- The notification read state updates.
- Failed email delivery does not hide the in-app message.

## Prepare Before Payroll Cutoff

Use this checklist before salary processing.

1. Open **ESS > Overview**.
2. Confirm no priority card shows unresolved action.
3. Open **Leave** and check pending leave.
4. Open **Attendance** and check exceptions or pending regularizations.
5. Open **Documents** and ensure required documents are accepted or under review.
6. Open **Tax Declarations** and confirm declaration/proof status for the active year.
7. Open **Payslips** only after payroll is published.
8. Open **Notifications** and review unread or failed messages.

Expected result:

- Employee-side blockers are visible before payroll cutoff.
- HR is contacted only for setup or review actions that employees cannot resolve themselves.

## Negative Scenarios To Recognize

| Message or issue | Meaning | Employee action |
| --- | --- | --- |
| No active leave policy is assigned | HR has not assigned a policy effective for the selected leave type/date. | Ask HR to assign or correct policy setup. |
| Attendance is locked | Payroll or attendance cutoff has locked the date. | Ask HR/payroll before submitting correction. |
| Payslip missing | Payroll may not be published or filters may be wrong. | Clear filters, then contact HR if still missing. |
| Document rejected | HR found proof issue. | Read the note and re-upload corrected proof. |
| Add proof disabled | No editable tax declaration or proof window closed. | Start declaration or contact HR. |
| Notification failed | External delivery failed. | Read the in-app message; contact HR only if external delivery is required. |

## When To Contact HR

Contact HR with the page name, period/date/year, status text, and screenshot when:

- A required setup is missing.
- A manager cannot see an approval.
- A locked item requires correction.
- A rejection reason is unclear.
- A payroll, document, tax, leave, or attendance result still looks wrong after you followed the page flow.
