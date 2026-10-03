# Payroll Handoff

Payroll Handoff manages finance delivery, provider files, acknowledgements, retries, and evidence.

## On This Page

- [Handoff Quick Navigation](#handoff-quick-navigation)
- [Purpose](#purpose)
- [Who uses this page](#who-uses-this-page)
- [Handoff decision](#handoff-decision)
- [Page sections](#page-sections)
- [Buttons and actions](#buttons-and-actions)
- [Handoff package contents](#handoff-package-contents)
- [Workflow](#workflow)
- [What finance should verify](#what-finance-should-verify)
- [Close checklist](#close-checklist)
- [Common delivery problems](#common-delivery-problems)
- [Evidence to keep](#evidence-to-keep)
- [Handoff signoff checklist](#handoff-signoff-checklist)

## Handoff Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Complete finance handoff | [Workflow](#workflow) | [Example: Complete September finance handoff](#example-complete-september-finance-handoff) |
| Know what to send finance | [Handoff package contents](#handoff-package-contents) | [What finance should verify](#what-finance-should-verify) |
| Handle provider delivery | [Example: Provider delivery succeeds](#example-provider-delivery-succeeds) | [Common delivery problems](#common-delivery-problems) |
| Handle manual finance acceptance | [Example: Manual handoff accepted](#example-manual-handoff-accepted) | [Evidence to keep](#evidence-to-keep) |
| Fix rejected bank advice or retry cap | [Common delivery problems](#common-delivery-problems) | [Handoff signoff checklist](#handoff-signoff-checklist) |

## Purpose

Use this page after payroll outputs are approved and finance/provider delivery is required.

This page answers: **has payroll been safely handed over to finance, bank, provider, or compliance owner with proof of receipt?**

Use it after [Payroll Outputs](payroll-outputs.md) are generated and verified.

## Who uses this page

| User | Responsibility |
| --- | --- |
| Payroll Admin | Creates handoff package and monitors delivery status. |
| Finance Manager | Confirms received files, payment totals, and finance acceptance. |
| Provider Admin / Integration Owner | Resolves provider delivery failures or mapping issues. |
| Compliance Owner | Confirms statutory or filing artifacts are included. |
| Auditor | Reviews delivery acknowledgement, retries, and manual fallback evidence. |

## Handoff decision

Handoff is complete only when the recipient has the correct file or payload and the system has evidence of delivery, acknowledgement, or documented manual acceptance.

Payroll close is not complete just because files were generated. Close requires delivery evidence.

## Page sections

| Section | Meaning |
| --- | --- |
| Finance artifacts | Files prepared for finance. |
| Delivery acknowledgements | Confirmation from finance or provider. |
| Provider jobs | External provider delivery jobs. |
| Provider callbacks | Responses received from providers. |
| Retry queue | Deliveries that can be retried. |
| Manual acceptance | Evidence when finance/provider accepts files outside automated delivery. |
| Audit pack | Final evidence bundle for payroll close. |

![Payroll Handoff provider jobs](../../assets/screenshots/payroll/payroll-handoff-provider-jobs.png)

## Buttons and actions

| Button | What it does |
| --- | --- |
| Generate finance handoff | Creates finance delivery package. |
| Transmit | Sends package to configured provider or finance channel. |
| Acknowledge | Marks handoff as received or accepted. |
| Schedule retry | Plans retry for failed delivery. |
| Requeue | Sends delivery back to queue. |
| Generate audit pack | Creates evidence package. |
| View callback | Opens provider response details. |
| Mark manual acceptance | Records approved manual receipt when automated delivery is unavailable. |

## Handoff package contents

| Artifact | Recipient | Purpose |
| --- | --- | --- |
| Payroll register | Finance | Total reconciliation and accounting entry. |
| Bank advice | Finance / Bank / Provider | Salary payment execution. |
| Payslip publication evidence | HR / Payroll | Employee communication evidence. |
| Statutory files | Compliance / Payroll | Filing preparation and monthly compliance. |
| Exception and approval report | Finance / Auditor | Shows accepted warnings and approval trail. |
| Audit pack | Auditor / Management | Final payroll close evidence. |

## Workflow

1. Confirm payroll outputs exist.
2. Generate finance handoff.
3. Review files and totals.
4. Transmit to finance/provider.
5. Monitor acknowledgements.
6. Retry failed deliveries if allowed.
7. Generate audit pack.

## Example: Complete September finance handoff

Scenario:

- Tenant: Accerio India
- Period: September 2026
- Outputs generated and verified
- Finance recipient: finance@company.example
- Bank advice total: matches approved net pay

Steps:

1. Open **HR Admin > Payroll > Payroll Handoff**.
2. Select the September 2026 payroll run.
3. Click **Generate finance handoff**.
4. Verify package contents.
5. Confirm payroll register and bank advice totals.
6. Click **Transmit** if provider/channel is configured.
7. Monitor delivery acknowledgement.
8. If finance confirms receipt outside the system, record manual acceptance with note.
9. Generate audit pack.

Expected result:

- Handoff status is delivered or manually accepted.
- Acknowledgement evidence is attached to the payroll run.
- Payroll close can be signed off.

## Example: Provider delivery succeeds

Check:

| Item | Expected value |
| --- | --- |
| Provider job | Delivered or acknowledged. |
| Callback | Success response received. |
| Amount | Matches bank advice total. |
| Employee count | Matches payable population. |
| Timestamp | After output generation and approval. |

After success:

1. Download or view acknowledgement.
2. Save it in audit pack.
3. Confirm finance owner is notified.

## Example: Manual handoff accepted

Use manual acceptance only when automated delivery is unavailable or not used by the tenant.

Required note:

- Recipient name.
- Recipient role.
- Delivery channel.
- File names or package ID.
- Acceptance timestamp.
- Reason automated delivery was not used.

Example note:

> Finance Manager Renu Bansal confirmed receipt of September 2026 payroll register and bank advice over approved secure channel at 30 Sep 2026, 6:20 PM. Provider delivery not configured for this tenant.

## Negative scenario: finance rejects bank advice

Common reasons:

- File format does not match bank/provider requirement.
- Employee bank account is missing or invalid.
- Net pay total differs from payroll register.
- Wrong period or legal entity selected.
- File naming convention is wrong.

Fix:

1. Do not mark handoff complete.
2. Record rejection reason.
3. Identify whether issue is output, source data, or provider mapping.
4. Correct upstream data if required.
5. Regenerate outputs only after reapproval when values changed.
6. Transmit again and keep old rejection evidence.

## Negative scenario: provider retry cap reached

What happens:

- Delivery remains failed.
- Retry queue cannot safely continue without intervention.
- Finance may not receive payroll files on time.

Fix:

1. Open provider job and callback details.
2. Check credentials, endpoint, mapping, and provider availability.
3. Escalate to integration/support owner.
4. Use manual fallback only if policy allows it.
5. Record owner, reason, and approval for manual fallback.

## Negative scenario: no acknowledgement received

This is not the same as success.

Check:

- Provider callback logs.
- Finance manual confirmation.
- Email or queue delivery status.
- Whether files were transmitted to the intended recipient.
- Whether the recipient has access to encrypted/signed files.

Do not close handoff until acknowledgement or approved manual acceptance exists.

## What finance should verify

| Item | Check |
| --- | --- |
| Payroll register | Totals match approved outputs. |
| Bank advice | Employee count and amount match payable population. |
| Provider delivery | Job status is delivered or acknowledged. |
| Rejections | Every rejection has owner and next action. |
| Statutory evidence | Required files or exception notes are present. |
| Audit pack | Includes output, handoff, acknowledgement, and retry evidence. |

## Close checklist

| Check | Required evidence |
| --- | --- |
| Outputs generated | Artifact register. |
| Outputs approved for sharing | Payroll Review approval and final lock. |
| Finance package generated | Handoff package ID or evidence. |
| Totals reconciled | Register and bank advice totals. |
| Delivery completed | Provider acknowledgement or manual acceptance. |
| Failed attempts handled | Retry/rejection notes. |
| Audit pack generated | Final evidence bundle. |

## Common delivery problems

| Problem | What to check |
| --- | --- |
| Provider delivery failed | Provider credentials, endpoint, mapping pack, retry policy. |
| Finance file rejected | Format, bank details, totals, period, file naming. |
| No acknowledgement | Provider callback, finance manual confirmation, queue status. |
| Retry capped | Retry policy limit has been reached. |
| Wrong recipient | Tenant configuration, role routing, notification template, provider mapping. |
| Duplicate transmission | Provider idempotency, previous job status, finance acknowledgement. |

## Evidence to keep

Keep:

- Finance handoff package ID.
- Payroll register and bank advice totals.
- Provider job ID.
- Callback or acknowledgement.
- Manual acceptance note, if used.
- Failed delivery details.
- Retry and requeue history.
- Final audit pack.

## Downstream impact

| Downstream area | Impact |
| --- | --- |
| Finance close | Finance can post payroll and execute payment. |
| Bank/provider processing | Provider receives official payment payload. |
| Statutory compliance | Compliance owner has required payroll evidence. |
| Audit | Handoff proves payroll was delivered and accepted. |
| Employee experience | Delayed handoff can delay salary payment even if payslips are published. |

## FAQ

### Should failed delivery block payroll close?

If finance or provider cannot confirm receipt of required payout/compliance files, keep the handoff open until delivery is fixed or a documented manual fallback is approved.

### Can I close handoff if payslips are already published?

Not automatically. Payslip publication confirms employee visibility, but finance/provider handoff still needs delivery evidence.

### What if the provider is down on payroll day?

Follow the tenant's fallback policy. Usually this means finance-approved manual handoff, clear owner, support escalation, and evidence of recipient acceptance.

### Can I retransmit the same bank advice?

Only if the previous transmission did not succeed or the provider supports idempotent retries. Confirm duplicate payment risk before retransmitting.

## Handoff signoff checklist

| Check | Expected result |
| --- | --- |
| Payroll review is approved. | Handoff uses final approved totals. |
| Required artifacts exist. | Bank advice, registers, statutory outputs, and provider files are available. |
| Delivery channel is confirmed. | Finance/provider knows where and how files were delivered. |
| Acknowledgement is recorded. | Receipt or acceptance evidence is attached or logged. |
| Duplicate payout risk is checked. | Retries or retransmissions cannot trigger duplicate payment. |

## Related guides

- [Payroll Outputs](payroll-outputs.md)
- [Payroll Review](payroll-review.md)
- [Finance Payroll Day Checklist](../../checklists/finance-manager-payroll-day.md)
- [Payment Handoff](../../finance-manager/payment-handoff.md)
- [Payroll Issues](../../troubleshooting/payroll.md)
