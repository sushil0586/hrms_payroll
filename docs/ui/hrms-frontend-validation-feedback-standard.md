# Accerio frontend validation and action feedback

21 October 2026. Apply this shared standard as each workspace is upgraded. This pass implements and tests it in the Leave family; it does not certify every unrelated HRMS form.

## Validation

- Show required fields, accepted formats and existing policy requirements before submission. Client checks improve correction speed; authorized backend validation remains authoritative.
- Use specific corrections: “Enter waiting hours as a positive whole number”, rather than “Invalid input”. Do not introduce policy limits which the backend does not authorize.
- Keep entered values, selected evidence and mutation idempotency keys after rejection or an unconfirmed write. Clear/reset only on a valid success response.
- Clear stale form summaries/toasts as the user corrects fields; retain still-applicable inline errors.
- Set `aria-invalid`, associate inline messages with `aria-describedby`, reveal collapsed sections and focus the first invalid enabled field. Editing a field must not move focus elsewhere.
- For a non-field rejection, explain the problem in a persistent `role="alert"` summary. After an asynchronous button loses focus, focus that summary inside the current dialog. Keep client field corrections in their inputs.
- Decode nested serializer errors centrally with readable field paths. Show multiple corrections without `[object Object]`, JSON blobs or bare field identifiers. A network/5xx failure must not expose internal server diagnostics.

## Outcomes

| Outcome | Required explanation |
| --- | --- |
| Client validation | Which fields need correction; no server mutation was attempted |
| Backend validation / policy rejection | The authorized reason, affected field or workflow, and an available correction |
| Expired session | Sign in again and check the current record before retrying |
| Permission denial | Preserve the backend reason; explain the required authorized access when no detail is available |
| Conflict / stale record | Refresh and review the latest state before retrying |
| Network loss / HTTP 5xx | Outcome is unconfirmed; check current records to avoid a duplicate submission |
| Incomplete create/edit/submission confirmation | Keep the form and explain that the latest list must be checked; do not clear data or show success |
| Confirmed save | Identify what was saved; persist a one-shot receipt through the required document navigation |
| Intermediate approval | The step was recorded and another approver remains; do not claim final approval |
| Cancellation awaiting approval | A cancellation request was submitted; do not claim that approved leave was already cancelled |
| Accepted year-close job | Submission was accepted; use durable queued/running/succeeded/failed status to determine completion |
| Partial import | Exact saved, failed/unconfirmed and blocked counts, plus row-level reasons; never imply an all-or-nothing success |
| Confirmed mutation but failed refresh | Distinguish the saved write from the failed read. Retry the read only; never resubmit automatically |

Use concise action-specific success titles and an explanation that answers what happened and what the user should do next. Generic “Action failed” is insufficient when the mutation outcome is unknown. Success receipts contain presentation text only and never grant access or replace authorized reads. Filtered-out saved records receive guidance about the current view. Receipts expire, are scoped to the destination path and are consumed once. Restricted browser storage must not block navigation.

## Shared implementation

- `web/src/lib/ui/api-error-message.ts`: nested errors, safe mutation status explanations and known-field mapping.
- `web/src/lib/ui/use-validation-focus.ts`: correction focus and collapsed-section disclosure; no focus jump while clearing errors.
- `web/src/lib/ui/use-feedback-focus.ts`: non-field error focus after asynchronous completion.
- `web/src/lib/ui/leave-decision-message.ts`: factual final versus intermediate Leave decision wording.
- `web/src/components/patterns/action-toast.tsx`: existing Accerio portal, success/error semantics and optional dismissal. Central CSS bounds long messages to the viewport and allows scrolling.
- `web/src/components/patterns/action-feedback-receipt.tsx`: hydration-safe, one-shot confirmed-save receipt across document navigation.
- Leave assignment workspace: canonical authorized GET using the same backend query as SSR, preserving import outcomes and committed filters, with aborted/stale read protection and GET-only retry. Supplementary import-audit confirmation is reported separately from saved business rows.

Leave error toasts are visible for eight seconds, with their persistent inline explanations retained. Success toasts use the existing short duration; destination receipts remain dismissible. Do not rely on a toast alone for a correction or a destructive/financial action. Do not add page-specific colors, another notification library, automatic write retries or arbitrary request sleeps.

## QA for each adoption

Verify missing/invalid inputs, nested backend errors, permission/session/conflict failures, unavailable services, incomplete confirmations, double submission, preserved values and a real successful retry. Check that only a confirmed backend result can trigger success. Inspect keyboard focus before and after failures, accessible names/descriptions, mobile scrolling and readable messages. Exercise joined workflows and authoritative ledger refresh. Retain failed attempts and distinguish deliberate fault injection from real successful backend execution. Screen-reader, native zoom and formal WCAG claims require their own executed evidence.
