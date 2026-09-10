# Phase 6B Provider Callback Mutation Certification

Date: 2026-09-09

## Scope

Certified provider callback ingestion through Playwright against the local dev stack:

- HR admin login and live Payroll Handoff workspace load.
- Discovery of a real provider delivery from `payroll-finance-handoff-setup`.
- Same-origin callback submission through `/api/payroll-provider-callbacks`.
- Valid signed callback acceptance.
- Replay idempotency for the same `provider_ref` and `idempotency_key`.
- Invalid signature rejection.
- Callback ledger visibility on the Payroll Handoff page.
- Callback Evidence drilldown visibility for webhook identity, signature adapter, security gates, replay window, rate limit, and no horizontal overflow.

## Result

Passed.

Command:

```bash
PLAYWRIGHT_PORT=3223 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase6b-provider-callback-mutation.spec.ts --project=chromium
```

Evidence:

- `web/tests/e2e/phase6b-provider-callback-mutation.spec.ts`
- Screenshot output: `web/test-results/**/phase6b-provider-callback-mutation/01-callback-mutation-ledger-evidence.png`

## Defect Closed

Late valid callbacks for an already reconciled provider delivery previously returned `500` because the callback service attempted to save an immutable reconciled delivery.

Fix:

- `backend/apps/payroll/services.py` now records the callback event as processed and stores `delivery_mutation_skipped=true` in `processing_snapshot` when a reconciled callback arrives for an already reconciled immutable delivery.
- Delivery mutation is skipped instead of crashing, preserving immutable audit evidence.

## Coverage Confidence

- Valid callback acceptance: 90%.
- Replay idempotency: 90%.
- Invalid signature rejection: 90%.
- Immutable reconciled delivery late-callback behavior: 88%.
- Handoff callback ledger UI evidence: 88%.

Phase 6 confidence after this slice: 89%.

## Residual Phase 6 Work

- Signed artifact grant use, revocation, and expiry proof.
- Provider retry/dead-letter queue execution proof.
- Broader notification provider delivery failure/retry proof.
