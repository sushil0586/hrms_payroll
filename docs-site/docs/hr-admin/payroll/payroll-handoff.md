# Payroll Handoff

Payroll Handoff manages finance delivery, provider files, acknowledgements, retries, and evidence.

## Purpose

Use this page after payroll outputs are approved and finance/provider delivery is required.

## Handoff decision

Handoff is complete only when the recipient has the correct file or payload and the system has evidence of delivery, acknowledgement, or documented manual acceptance.

## Page sections

| Section | Meaning |
| --- | --- |
| Finance artifacts | Files prepared for finance. |
| Delivery acknowledgements | Confirmation from finance or provider. |
| Provider jobs | External provider delivery jobs. |
| Provider callbacks | Responses received from providers. |
| Retry queue | Deliveries that can be retried. |

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

## Workflow

1. Confirm payroll outputs exist.
2. Generate finance handoff.
3. Review files and totals.
4. Transmit to finance/provider.
5. Monitor acknowledgements.
6. Retry failed deliveries if allowed.
7. Generate audit pack.

## What finance should verify

| Item | Check |
| --- | --- |
| Payroll register | Totals match approved outputs. |
| Bank advice | Employee count and amount match payable population. |
| Provider delivery | Job status is delivered or acknowledged. |
| Rejections | Every rejection has owner and next action. |
| Statutory evidence | Required files or exception notes are present. |
| Audit pack | Includes output, handoff, acknowledgement, and retry evidence. |

## Common delivery problems

| Problem | What to check |
| --- | --- |
| Provider delivery failed | Provider credentials, endpoint, mapping pack, retry policy. |
| Finance file rejected | Format, bank details, totals, period, file naming. |
| No acknowledgement | Provider callback, finance manual confirmation, queue status. |
| Retry capped | Retry policy limit has been reached. |

## FAQ

### Should failed delivery block payroll close?

If finance or provider cannot confirm receipt of required payout/compliance files, keep the handoff open until delivery is fixed or a documented manual fallback is approved.
