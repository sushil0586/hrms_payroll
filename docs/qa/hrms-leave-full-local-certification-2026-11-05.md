# HRMS Leave Full Local Certification

Date: 2026-11-05

Environment: isolated PostgreSQL 16, Django, and production-built Next.js

Verdict: PASS for local Leave module certification

## Certified Scope

- HR Admin leave types, policies, assignments, requests, balances, transactions, imports, reports, and leave-year operations.
- ESS entitlements, application, required evidence, request history, withdrawal, cancellation governance, and durable feedback.
- MSS review, approval, rejection, evidence visibility, focus restoration, and authorization boundaries.
- Filtering, Enter submission, reset, sorting, independent pagination, loading, empty, retry, refresh, and browser-history behavior.
- Validation, duplicate protection, idempotency, atomic import rollback, maker-checker review, tenant isolation, role denial, audit, ledger integrity, and closed-period protection.
- Desktop, tablet, mobile, keyboard, focus, reduced-motion, and scoped automated accessibility behavior.
- Policy-owned automatic approval, elapsed-time processing, idempotent replay, and exactly-once balance consumption.

## Fresh Verification

| Gate | Result |
| --- | --- |
| PostgreSQL/Django Leave domain suite | 107 passed, 0 failed |
| Connected HR/ESS/MSS action contracts | 19 passed, 0 failed |
| Leave setup across three engines | 51 passed, 0 failed |
| Balance and maker-checker across three engines | 24 passed, 0 failed |
| Year-end/report correctness across three engines | 33 passed, 0 failed |
| HR requests and mobile review across three engines | 27 passed, 0 failed |
| Policy auto-approval across three engines | 9 passed, 0 failed |
| Ledger refresh and stale-read protection across three engines | 12 passed, 0 failed |
| Total focused browser cases | 175 passed, 0 failed |
| TypeScript | Passed |
| Targeted ESLint | Passed |
| Django system check | Passed, zero issues |
| Migration drift | None |
| Git whitespace check | Passed |

The backend run emitted three upstream Python/Django `asyncio.iscoroutinefunction` deprecation warnings. They did not indicate Leave behavior failures.

## Integrity And Security Evidence

- Cross-tenant, employee, and read-only HR mutations were denied without a committed business mutation.
- Request approval, rejection, withdrawal, and cancellation rules preserved the balance ledger and recorded durable state.
- Invalid attachment content and disallowed file types were rejected without false success feedback.
- Balance credits, debits, rejection, approval, retries, and last-page canonicalization produced one authoritative ledger outcome.
- Atomic imports retained row diagnostics and created no partial success when any row failed.
- Leave-year close and report exports rejected incomplete, overlapping, foreign, and changing evidence.
- Superseded balance reads were aborted and could not replace newer committed state.
- Automatic approval remained policy-owned, required a valid elapsed deadline, recorded one system decision, consumed once, and was idempotent on replay.
- Responsive and accessibility checks passed in Chromium, Firefox, and WebKit for the selected administration, request, balance, and policy surfaces.

## Harness Repair

The policy auto-approval browser suite depended on a removed evidence-directory worker script. A maintained, fail-closed fixture now:

- accepts only a local `hrms_*` PostgreSQL database;
- validates the sandbox tenant, `pw-qa-` namespace, and Playwright ownership marker;
- operates only on the manifest-owned request, workflow step, and balance;
- invokes the production `process_due_leave_auto_approvals` service;
- exposes deterministic snapshot, process, and expiry actions for browser evidence.

The complete auto-approval browser package subsequently passed 9/9 across Chromium, Firefox, and WebKit.

## Cleanup

- Final `pw-qa-` tenant count: zero.
- Final Playwright-owned user count: zero through guarded workspace cleanup.
- Backend and all five frontend ports were closed.
- The isolated PostgreSQL container was stopped.
- No shared staging or production resource was changed.

## Certification Boundary

Leave is fully certified for the local application revision and the scope above, with confidence above 95 percent for the exercised module contracts. This is same-agent local certification, not independent review or fresh shared-staging certification. Staging still requires deployed-revision verification and a bounded HR Admin -> ESS -> MSS -> HR Admin smoke campaign before staging completion can be claimed.

No commit, push, deployment, shared migration, real payroll operation, or email was performed.
