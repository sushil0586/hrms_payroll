# Employee Lifecycle EL-1H Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1H covers effective-dated employee movements and the existing manager-history contracts in `ELC-059` through `ELC-074`. No shared staging or production system was used.

## Changes

- Preserved the active employee projection until a future movement becomes effective.
- Added idempotent due-assignment activation that promotes the planned assignment, supersedes prior history, and updates the employee projection atomically.
- Added guarded movement state transitions and immutable terminal records.
- Added current-assignment snapshots and stale-approval rejection.
- Enforced lifecycle view/manage permissions on movement endpoints.
- Added one redacted lifecycle audit event per movement write and atomic rollback when audit persistence fails.
- Repaired PostgreSQL and browser fixtures to reuse the canonical timeline created by workspace provisioning.
- Replaced API-request browser login with the cross-engine browser login contract and synchronized movement editors on their hydration marker.

No database migration is required for EL-1H.

## PostgreSQL And API Evidence

- Effective-employment integrity: **8 passed, 0 failed**.
- Focused movement API regression: **3 passed, 0 failed, 412 deselected**.
- Verified current and future projection behavior, due activation, replay idempotency, overlap rejection, cross-tenant relation rejection, cross-entity fail-closed behavior, historical policy resolution, stale snapshot rejection, ESS denial, terminal rewrite denial, and forced audit-failure rollback.

## Browser Evidence

The focused effective-history journey passed in Chromium, Firefox, and WebKit: **3 passed, 0 failed**. Each engine created a current completed movement and a future planned movement through the real UI, then independently verified assignment state, employee projection, and replay identity in PostgreSQL.

The complete movement screen campaign produced **30 passed and 0 failed** across Chromium, Firefox, and WebKit. It verified unavailable-record recovery, independent off-filter lookup, committed filter navigation, mobile trigger focus return, dirty-close protection, bulk-action refresh and failure retention, direct lifecycle-inbox editing, relationship preservation, create pending-state protection, uncertain-response recovery, effective history and idempotency, report return, validation, and responsive rendering.

The initial WebKit failures were test-environment issues: the server used a Secure cookie over loopback HTTP and the old login shortcut did not reliably bind its cookie to page navigation. The clean local configuration used `HRMS_COOKIE_SECURE=false`, browser-driven login, cookie confirmation, and route confirmation. Production cookie behavior was not changed.

## Quality Gates

- TypeScript: PASS
- ESLint: PASS
- Django system checks: PASS
- Migration drift: PASS, no changes detected
- `git diff --check`: PASS before report updates

## Scenario Verdicts

Newly promoted to Passed:

- `ELC-059`: same-tenant department transfer
- `ELC-060`: promotion/designation projection
- `ELC-064`: future-effective planned movement and due activation
- `ELC-066`: overlap/collision rejection
- `ELC-067`: completion replay idempotency and one audit event
- `ELC-069`: stale movement approval rejection
- `ELC-070`: tenant and permission boundary rejection

Preserved as Passed from earlier phases: `ELC-062`, `ELC-071`, and `ELC-072`.

Still Not Run: `ELC-061`, `ELC-063`, `ELC-065`, and `ELC-068`. The current evidence does not fully certify hierarchy movement, employment-type movement, approved backdating, or concurrent movement completion.

Still Blocked: `ELC-073` and `ELC-074` pending cross-legal-entity continuity and retroactive-correction policy approval.

Global lifecycle register after EL-1H: **46 Passed, 0 Failed, 3 Blocked, 51 Not Run**.

## Verdict

EL-1H is **CONDITIONAL**. The seven newly closed movement contracts pass at browser, API, audit, authorization, and PostgreSQL layers, and the complete 30-test movement browser campaign passes in all three engines. Four movement contracts remain unexecuted and two remain policy-blocked.

No commit, push, deployment, shared migration, email, payroll execution, or shared-environment mutation occurred.
