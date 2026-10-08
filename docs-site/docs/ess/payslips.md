# Payslips

Use Payslips to view payslips published by payroll, inspect salary totals in a focused review dialog, acknowledge reading, and download the payslip file.

![ESS payslips](../assets/screenshots/ess/payslips.png)

## On This Page

- [Payslip Quick Navigation](#payslip-quick-navigation)
- [Page Purpose](#page-purpose)
- [Main Sections](#main-sections)
- [Screen Labels To Recognize](#screen-labels-to-recognize)
- [Controls](#controls)
- [Before downloading](#before-downloading)
- [What Payroll Controls Upstream](#what-payroll-controls-upstream)
- [Example: download the latest payslip](#example-download-the-latest-payslip)
- [Example: find an older payslip](#example-find-an-older-payslip)
- [If a payslip is missing](#if-a-payslip-is-missing)
- [Positive and negative scenarios](#positive-and-negative-scenarios)
- [Browser certification coverage](#browser-certification-coverage)
- [Good Practice](#good-practice)
- [FAQ](#faq)
- [Related Pages](#related-pages)

## Payslip Quick Navigation

| I need to | Start here | Verify before finishing |
| --- | --- | --- |
| Download current month payslip | Latest payslip band | Period, employee name/code, net pay, published status, and file availability. |
| Check salary detail | **Review payslip** dialog | Gross earnings, deductions, net pay, pay date, calculation lines, and source hash. |
| Find an older payslip | Published payslips list | Year filter, search value, period, and pagination. |
| Record that I reviewed it | **Mark as read** | Read receipt saved and list/detail refreshed. |
| Troubleshoot missing payslip | [If a payslip is missing](#if-a-payslip-is-missing) | Payroll publish status, filters, employee eligibility, and download governance. |
| Understand payroll dependency | [What Payroll Controls Upstream](#what-payroll-controls-upstream) | Payroll output, generated file, employee scope, storage policy, and access trail. |

## Page Purpose

The page keeps salary history in one place so employees do not need to ask HR for previously published payslips. The visible page is intentionally simple: first find the month, then open the review dialog only when you need salary detail, access history, or line-level calculation evidence.

## Main Sections

| Section | What it shows | How to use it |
| --- | --- | --- |
| Latest payslip band | Latest published period, net pay, pay date, review, and download action. | Start here when you need the newest payslip. |
| Published payslips | Searchable list of all visible payslips. | Filter by year or search value, then choose **Review payslip** or **Download**. |
| Payslip checklist | Employee reminders before downloading or sharing salary proof. | Use it to avoid checking the wrong month or sharing an unverified file. |
| Review dialog | Gross pay, deductions, net pay, payment summary, access trail, storage governance, calculation lines, and source hash. | Open only when you need detailed evidence. |
| Payslip PDF | Downloadable payroll document generated from the locked payroll output. | Use for employee records, bank requests, or salary proof after verifying the period and totals. |
| Tax sheet | Tax/TDS and statutory explanation attached to the payslip when configured. | Review tax regime, current-period tax, YTD tax, and proof/declaration status before raising payroll queries. |

## Screen Labels To Recognize

| Screen label | What it means |
| --- | --- |
| Published payslips | List of payslips visible to the signed-in employee. |
| Latest payslip | Current or latest published payroll file when one is available. |
| Payslip checklist | Employee reminders before download or sharing. |
| Review payslip | Focused detail dialog for salary totals and evidence. |
| Mark as read | Read receipt action for the selected payslip. |
| Download payslip | Authenticated download action for the published file. |

## Controls

| Control | Purpose |
| --- | --- |
| Search | Find payslips by period, run code, or status. |
| Year filter | Limit the list to one financial/calendar year. |
| Page size | Change how many records show in the list. |
| Apply | Refresh the list using current filters. |
| Review payslip | Opens salary detail, access history, and calculation evidence in a focused dialog. |
| Download latest / Download | Downloads the selected payslip file when payroll has published it. |
| Mark as read | Records that you reviewed the payslip. |

## Before downloading

Check:

- Period/month is correct.
- Payslip status is published or available.
- Gross earnings, deductions, and net pay look reasonable.
- Tax sheet values, such as tax regime and TDS, look reasonable where your tenant publishes them.
- Employee name and pay period match your record.
- Employee name and code are yours.
- You are comfortable sharing the file wherever you plan to use it.

## What Payroll Controls Upstream

| Setup item | Why it matters in ESS |
| --- | --- |
| Payroll run status | Payslips should appear only after payroll output is published. |
| Payslip file generation | Controls whether a downloadable file exists. |
| Payslip PDF template | Controls the layout, employer details, earning/deduction grouping, footer, and tax sheet sections. |
| Employee pay result | Drives gross earnings, deductions, net pay, and payment summary. |
| Tax/statutory setup | Drives tax regime, TDS, professional tax, PF/ESI/LWF, and tax sheet values where configured. |
| Access/read governance | Controls read receipts, download trail, and audit evidence. |
| Storage policy | Controls file availability and retention. |
| Employee scope | Ensures employees can see only their own payslips. |

## Example: download the latest payslip

1. Open **ESS > Payslips**.
2. Check the **Latest payslip** band for the period and net pay.
3. Select **Review payslip**.
4. Confirm gross earnings, deductions, net pay, pay date, and file name.
5. Review the tax sheet if it is available.
6. Select **Mark as read** if you have reviewed it.
7. Select **Download payslip**.

Expected result: the file downloads through the authenticated app route and the access trail can show read/download evidence.

## Example: find an older payslip

1. Open **ESS > Payslips**.
2. Use **Year** to choose the relevant year.
3. Use **Search** if you know the month, payroll run, or status.
4. Select **Apply**.
5. Use pagination when more records are available.
6. Select **Review payslip** for the matching row.

Expected result: only your own published payslips are visible. Draft payroll outputs and other employees' payslips remain hidden.

## If a payslip is missing

| Possible reason | What to do |
| --- | --- |
| Payroll is not published yet | Wait for HR/payroll announcement. |
| You are filtering the wrong year | Clear filters or choose the correct year. |
| You joined after the selected period | Check the first eligible payroll month. |
| Payroll output was held | Contact HR with the month and employee code. |
| Download is blocked | Payroll may not have a published file or file access may be restricted. Contact HR/payroll. |

## Positive and negative scenarios

| Scenario | What should happen |
| --- | --- |
| Latest payslip is published | The latest band shows the period, net pay, review, and download actions. |
| Employee opens review | A dialog shows totals, payment summary, access trail, storage governance, calculation lines, and source hash. |
| Tenant publishes PDF payslips | Download returns a PDF payslip generated from locked payroll output, with tax sheet content where configured. |
| Employee marks as read | The system records the read receipt and refreshes the page. |
| Employee filters by an empty year/search | The list shows a clear no-results message. |
| File is not downloadable | Download action is hidden or blocked; employee should contact HR/payroll. |
| Employee tries another employee's payslip URL | Access must be denied by the authenticated employee boundary. |

## Browser certification coverage

The ESS Payslips launch certification covers:

- Latest payslip band and published payslip list.
- Search, year filter, page size, and pagination.
- Review dialog with totals, payment summary, access trail, storage governance, calculation lines, and source hash.
- PDF/tax-sheet hardening tracks generated PDF content, tax sheet values, and output reconciliation as part of the payroll SaaS hardening plan.
- Read receipt action.
- Download action visibility and authenticated route behavior.
- Empty filtered state and no horizontal overflow.

## Good Practice

- Download payslips only from the app, not from forwarded messages.
- Check net pay, deduction summary, and month before sharing a payslip outside the company.
- If a payslip is missing, check whether payroll outputs are published before contacting HR.

## FAQ

### Can I download old payslips?

Yes, when they are published and available under your employee record. Use year or period filters to find them.

### What if net pay looks wrong?

Check the deduction summary and period first. If it still looks wrong, contact HR/payroll with the payslip month and the amount you are questioning.

### Why is there a read receipt?

Some organizations require evidence that employees opened important payroll documents. The read receipt records that you reviewed the payslip; it does not change payroll numbers.

## Related Pages

- [ESS Overview](index.md)
- [ESS Task Recipes](task-recipes.md)
- [Notifications](notifications.md)
- [HR Admin Payroll](../hr-admin/payroll/index.md)
