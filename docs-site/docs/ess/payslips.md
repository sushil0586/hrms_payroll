# Payslips

Use Payslips to view payslips published by payroll, inspect salary totals in a focused review dialog, acknowledge reading, and download the payslip file.

![ESS payslips](../assets/screenshots/ess/payslips.png)

## Page Purpose

The page keeps salary history in one place so employees do not need to ask HR for previously published payslips. The visible page is intentionally simple: first find the month, then open the review dialog only when you need salary detail, access history, or line-level calculation evidence.

## Main Sections

| Section | What it shows | How to use it |
| --- | --- | --- |
| Latest payslip band | Latest published period, net pay, pay date, review, and download action. | Start here when you need the newest payslip. |
| Published payslips | Searchable list of all visible payslips. | Filter by year or search value, then choose **Review payslip** or **Download**. |
| Payslip checklist | Employee reminders before downloading or sharing salary proof. | Use it to avoid checking the wrong month or sharing an unverified file. |
| Review dialog | Gross pay, deductions, net pay, payment summary, access trail, storage governance, calculation lines, and source hash. | Open only when you need detailed evidence. |

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
- Employee name and pay period match your record.
- Employee name and code are yours.
- You are comfortable sharing the file wherever you plan to use it.

## Example: download the latest payslip

1. Open **ESS > Payslips**.
2. Check the **Latest payslip** band for the period and net pay.
3. Select **Review payslip**.
4. Confirm gross earnings, deductions, net pay, pay date, and file name.
5. Select **Mark as read** if you have reviewed it.
6. Select **Download payslip**.

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
| Employee marks as read | The system records the read receipt and refreshes the page. |
| Employee filters by an empty year/search | The list shows a clear no-results message. |
| File is not downloadable | Download action is hidden or blocked; employee should contact HR/payroll. |
| Employee tries another employee's payslip URL | Access must be denied by the authenticated employee boundary. |

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
