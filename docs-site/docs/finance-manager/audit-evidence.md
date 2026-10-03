# Audit Evidence

Use Audit Evidence to verify that finance exports, provider delivery, and payroll handoff activity can be explained later.

![Finance audit evidence](../assets/screenshots/finance-manager/control-center.png)

## On This Page

- [Audit Quick Navigation](#audit-quick-navigation)
- [Page Purpose](#page-purpose)
- [Main Sections](#main-sections)
- [Controls](#controls)
- [Review Checklist](#review-checklist)
- [Audit pack checklist](#audit-pack-checklist)
- [Provider event meanings](#provider-event-meanings)
- [Positive and negative scenarios](#positive-and-negative-scenarios)
- [FAQ](#faq)

## Audit Quick Navigation

| I need to | Start here | Verify before finishing |
| --- | --- | --- |
| Prove what was exported | **Open audit history** | Export type, timestamp, run, user/action, manifest, and artifact references. |
| Prove provider response | Provider callbacks | Callback count, receipt reference, matched delivery, and final state. |
| Explain retries | Retry events | Retry attempts, final success/failure, retry cap, and owner note. |
| Check delivery completion | Completed jobs | Expected jobs are complete and linked to the handoff. |
| Investigate stalled work | Stale jobs / **Inspect risk** | Job age, affected file/provider, whether payout/statutory close is blocked. |
| Prepare auditor pack | [Audit pack checklist](#audit-pack-checklist) | Register, bank advice, statutory files, provider receipts, manifests, and exception decisions. |

## Page Purpose

Audit Evidence keeps finance close decisions traceable. It is useful for internal review, statutory audit, and support investigation.

## Main Sections

| Section | What it shows | How to use it |
| --- | --- | --- |
| Audit history | Export manifests and provider audit packs. | Open when finance needs proof of what was generated and sent. |
| Provider callbacks | Callback records received from provider systems. | Confirm provider responses are captured. |
| Retry events | Retry attempts for failed provider delivery. | Check whether failed delivery was retried. |
| Completed jobs | Completed provider jobs. | Confirm delivery jobs finished successfully. |
| Stale jobs | Jobs that did not complete in expected time. | Investigate before finance close. |

## Controls

| Control | Purpose |
| --- | --- |
| Open audit history | Open export and audit records. |
| Open audit | Open audit manifest evidence. |
| Inspect risk | Review failed, rejected, or dead-lettered provider events. |

## Review Checklist

- Callback count is reasonable for the provider flow.
- Retry events have a final success or accepted explanation.
- Completed jobs cover expected exports.
- Stale jobs are zero or explicitly accepted.
- Audit pack references are stored with close notes.

## Audit pack checklist

A finance close pack should be able to answer:

- Which payroll run was paid?
- Which bank advice file was exported?
- Which payroll register was reviewed?
- Which statutory files were generated?
- Which provider jobs completed?
- Which exceptions were accepted and by whom?
- Where are receipts or manifests stored?

## Provider event meanings

| Event type | Meaning | Finance action |
| --- | --- | --- |
| Callback | Provider sent a response. | Confirm it matches expected delivery. |
| Retry | System tried delivery again. | Confirm final success or accepted failure. |
| Completed job | Provider/export job finished. | Keep evidence with close notes. |
| Stale job | Job did not finish in expected time. | Investigate before finance close. |
| Dead-lettered/rejected | Delivery failed beyond normal retry. | Escalate or record manual exception. |

## Positive and negative scenarios

| Scenario | Expected result |
| --- | --- |
| All provider jobs completed and manifests exist | Finance can attach audit references to close notes. |
| Retry happened but later succeeded | Keep retry and final success evidence; proceed if finance owner accepts. |
| Stale job remains open | Investigate before finance signoff unless clearly unrelated and documented. |
| Dead-lettered or rejected event remains | Escalate or record manual exception before close. |
| Auditor asks how the file was produced | Audit history should show export, manifest, file type, run, and timestamp. |
| Evidence is incomplete | Hold signoff or document formal exception with owner approval. |

## FAQ

### Is audit evidence needed if payout succeeded?

Yes. Successful payout proves payment happened; audit evidence explains how the file was produced, delivered, and approved.

### Can stale jobs be ignored?

Only if they are unrelated to the finance close or formally accepted. Otherwise investigate before signoff.
