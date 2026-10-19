# ESS mixed ledger concurrency verification

Date: 2026-10-19. **Scoped local decision: PASS. Overall ESS: CONDITIONAL. Lightsail promotion: NO-GO.** This follow-up closes the tested mixed-operation lock-order gap from the [readiness assessment](hrms-ess-staging-promotion-readiness.md). It does not authorize deployment or certify every possible ledger interleaving.

## Root cause and minimal fix

Two genuine application deadlocks were reproduced on local PostgreSQL 16 with separate database connections and deterministic SQL/event barriers. Approval held a balance row while awaiting its entitlement lot; cancellation reversal or expiry held that lot while awaiting the same balance. PostgreSQL reported reciprocal transaction waits and `deadlock detected`. This is domain-service evidence, not a claim that an expiry endpoint or background provider exists.

`backend/apps/leave_management/year_end_services.py` now acquires balance locks before existing lot/allocation locks in consumption, cancellation reversal and expiry. Multi-balance reversal/expiry acquires balances in primary-key order. Expiry locks only balances with eligible expiring lots; the unrelated nonexpiring balance regression verifies that it can remain locked independently. Eligible balances added after the batch selection wait for a subsequent invocation. No global request lock, sleeps, constraint removal or retry-based masking was introduced. Existing amounts, expiry predicates, transaction boundaries, command identities, audit services and closed-period rejection remain intact.

The only application file changed in this follow-up is the above service. Added `backend/tests/test_ess_mixed_ledger_concurrency.py` contains five parametrized cases: approval versus cancellation, approval versus expiry, both mutations rejected with complete rollback in a locked period, and unrelated-balance independence. The rollback fixture completes a real close run and audited close/lock transitions. No migration, API, RBAC, frontend, attendance, statutory or payroll calculation changes were made. Previous source changes in the dirty checkout remain preserved.

Evidence root: [ess-ledger-mixed-concurrency](../qa/evidence/ess-ledger-mixed-concurrency/). The exact incremental patch is `application-change.patch`, compared with `year_end_services.before.py`; a diff against Git HEAD also includes the earlier idempotency fix and must not be attributed wholly to this follow-up.

## Fresh execution evidence

| Selection | Passed | Failed | Skipped / blocked / unexecuted |
|---|---:|---:|---|
| Final ledger integrity/concurrency selection | 21 | 0 | 0 / 0 / 0 |
| Employee contracts, ownership, tenant/RBAC | 43 | 0 | 0 / 0 / 0 |
| Statutory / attendance historical-close API selection | 10 | 0 | 0 / 0 / 0 |
| Additional forced mixed-operation repeats: five runs × two operations | 10 | 0 | 0 / 0 / 0 |
| Production-built Leave browser selection: Chromium / Firefox / WebKit | 27 (9 each) | 0 | 0 / 0 / 0 |

**Final backend/API/PostgreSQL: 74 unique tests plus 10 supplementary executions.** The API selection deselected 363 unrelated cases; they are not passes. `ledger-regressions-final.txt`, `contracts.txt`, `close-api-regressions.txt`, `focused-repeat-*.txt` and `leave-browser/run.txt` retain outputs and adjacent result files. The existing 204 frozen browser cases were not rerun in full and are historical, not fresh counts here.

Original failures remain: `baseline-reproduction.txt` has one deadlock failure; `baseline-two-operations.txt` has two deadlock failures. Two diagnostic ledger selections each had 19 passed / 2 failed because the new negative fixture first attempted a protected direct status write, then an invalid open-to-locked transition. Both were rejected correctly. The fixture now uses successful close-run → audited close → audited lock; no business guard was weakened. See `ledger-regressions.txt` and `ledger-audited-fixture-diagnostic.txt`. Across all backend test-runner attempts in this follow-up: **122 passed / 7 failed / 0 skipped / 0 blocked / 0 unexecuted**, including the preserved three pre-fix failures and four fixture failures. These are separate from the final successful selection and the 27 browser passes.

Django checks passed; `makemigrations --check --dry-run` reported no changes. The backend production Docker build passed, including a rebuild after the final test-fixture correction; final image identity is retained in `cleanup.json`. This is a local build, not an immutable published Linux/amd64 release pair. No frontend source changed: TypeScript, ESLint and a new frontend build were not rerun. Browser tests used the existing production artifact `.next/ess-blocker-certified`, build ID `E0Ia9xxLsPnlRn1Ozm4RE`, against the newly changed local backend. No inherited quality result is counted as newly executed.

## Browser, visual and accessibility scope

The unchanged Leave certification selection covers entitlements, filters/pagination, calendar/date boundaries, detail navigation, submission/duplicate protection, withdrawal, permitted and governed cancellation, unauthorized requests, loading/error/retry and responsive interactions. Fresh screenshots include desktop, tablet 768px and mobile 390/320px for each engine. [Desktop](../qa/evidence/ess-ledger-mixed-concurrency/leave-browser/chromium-leave-desktop.png) and [WebKit mobile](../qa/evidence/ess-ledger-mixed-concurrency/leave-browser/webkit-leave-390.png) renders were actually inspected; they retain the centralized shell, compact entitlement cards and responsive table/calendar presentation. The mobile table uses its existing horizontal viewport for additional columns. No visual redesign is claimed.

Screenshots/fixture cleanup: `leave-browser/`. Playwright results: `leave-browser/browser-results.json`; traces: `web/test-results/ess6-mixed-ledger-leave/`. Accessible-name, focus and reduced-motion assertions ran in the existing responsive scenario in all three engines. This task did not newly execute screen-reader speech review, native browser zoom, contrast audit, axe or formal WCAG assessment. Their existing open limitations remain; no full accessibility certification is claimed.

## Integrity, cleanup and remaining gates

Assertions prove exact final ledger/lot/allocation values for both mixed operations, a single cancellation reversal, reservation clearance, and unchanged ledger version/checksum, transactions and lots after rejected locked-period writes. This does not prove deadlock freedom across every cross-period/year-close or multi-account operation. No migration was required, so there is no migration forward/rollback operation to certify.

Both migrated synthetic QA databases were audited to zero business rows. All three browser cleanup files verify tenant/upload removal and finalized snapshot preservation. All 440 baseline media file hashes are unchanged with no extra files. Owned servers on 8048/3179 and proxy 8059 are absent; the owned PostgreSQL container, its anonymous volume, local image tag and temporary environment were removed. Listener 55441 is absent. See `cleanup.json`, `media-verification.json` and database cleanup logs. The browser-generated `next-env.d.ts` and `tsconfig.json` match their pre-run bytes. Frozen release-gate CSV hashes match the readiness baseline in `release-gates-verification.json`.

Lightsail/AWS were not accessed or modified in this follow-up. The historical readiness report remains preserved. Remaining staging prerequisites include reviewed clean source, a provenance-linked immutable image pair, verified encrypted off-host backup and isolated restore, operational capacity/alert evidence and candidate-image smoke tests. The original Firefox reset trigger remains unproven. Leave projection APIs, production/statutory/provider requirements and unverified assistive-technology coverage remain separate gates. **No deployment and no MSS work.**
