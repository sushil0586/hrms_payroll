# Payroll Phase 3 — readiness, inputs and calculation makeover

Prepared: 24 October 2026. Status: complete. Core UI, owned lifecycle transitions, fault recovery, authorization boundaries and source-matched browser verification passed the Phase 3 exit gate.

## Implemented behavior

The Phase 3 control path now uses one consistent sequence across Time to Payroll, Payroll Readiness, Payroll Inputs and Payroll Calculations.

- readiness keeps URL-backed employee, status, period and page-size scope;
- Apply commits the filter URL through an explicit browser navigation and no longer remains in a permanent loading state;
- employee blockers retain the existing source-specific destinations instead of inventing repair actions;
- Payroll Inputs shows one operational family at a time: Run, Input snapshot with bulk import, or Lock gate;
- the active input operation is stored in the URL hash and restored after reload;
- inactive editors are removed from layout and accessibility flow;
- the Lock gate keeps snapshot, ready, warning, blocked, reconciliation and locked counts together;
- the operation strip becomes horizontally scrollable at narrow widths;
- calculations retain selected run, validation, attempt and line-trace URL state without starting work during navigation.

## Responsive result

The Phase 1 mobile baseline rendered all input editors simultaneously and produced an approximately 13,000px page. The action area now renders only the chosen family. Read-only source evidence remains available above it because it explains the selected run and lock consequence.

All four Phase 3 routes retain one visible H1 and no document-level horizontal overflow at 320px. The operation controls use the same compact task-strip behavior as Phase 2 configuration.

## Verification

Accepted build: `FOIH5wLjJByqRfBa0TOL_`.

- 12/12 responsive executions passed across Chromium, Firefox and WebKit.
- Four routes were rendered at 320px in every engine, producing 12 final screenshots.
- 6/6 Chromium workflow checks passed for readiness URL filters, source/snapshot review, period-to-pay-group dependency filtering, calculation summaries, trace retention and mobile calculation layout.
- 4/4 owned Chromium transition checks passed for blocker rejection, successful persistent lock, locked-snapshot immutability, queued-to-succeeded calculation, reload restoration, duplicate-job identity, employee denial, foreign-tenant denial, abort, 503 and malformed-response recovery.
- 4/4 backend recovery checks passed for retryable terminal failure, controlled retry, stale-worker recovery and rollback of partial payroll mutation.
- Production build with TypeScript validation, focused ESLint and Django system check passed.
- The final browser total is 22/22 accepted executions: 12 responsive, 6 established workflows and 4 owned transitions. Diagnostic failures are excluded; they exposed cache refresh, browser-session host/cookie configuration and missing local job dispatch before the clean runs.

Evidence is indexed in [Payroll Phase 3 evidence](../qa/evidence/payroll-makeover-phase3-2026-10-24/README.md).

## Phase 3 exit result

The owned flow creates its own periods, runs and snapshots through the browser, rejects a blocked lock, locks a ready snapshot, proves post-lock mutation rejection, queues a durable calculation and restores its authoritative job after reload. Repeating the same calculation request returns the same job identity. Employee and foreign-tenant mutations are rejected. Abort, 503 and malformed accepted responses retain the entered profile and never announce unconfirmed completion. Retry, failed-job and stale-worker semantics are additionally certified at the backend service boundary. Both synthetic tenants and the isolated PostgreSQL/Redis services are removed after verification.
