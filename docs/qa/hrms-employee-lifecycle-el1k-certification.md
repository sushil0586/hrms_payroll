# Employee Lifecycle EL-1K Certification

Date: 2026-11-06
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1K certifies the supported employee-exit lifecycle in `ELC-075` through `ELC-083`. It does not claim downstream dependency resolution that the product has not implemented, and it does not change the blocked rehire policy.

## Implemented Corrections

- Added an authoritative exit transition contract with terminal-state protection.
- Made exit save, workflow synchronization, employee projection changes, and lifecycle audit writes atomic.
- Closed the current employment assignment and spell when an exit completes.
- Restored `on_notice` employees to `active` when an eligible exit is cancelled.
- Blocked cancellation after completed clearance work requires governed correction.
- Excluded inactive and exited employees from current MSS reportee lists and summary counters while preserving historical manager attribution.
- Preserved hard-delete denial through API, ORM protection, and database foreign-key integrity.

## Scenario Evidence

- `ELC-075`: draft dates, reason, ownership, clearance metadata, and audit persisted.
- `ELC-076`: draft to pending approval to approved transitions recorded the authenticated actor.
- `ELC-077`: clearance item state/history persisted; employee-role access to HR exit records was denied.
- `ELC-078`: completion atomically closed assignment/spell, changed employee status, retained history, and rejected concurrent duplicate completion.
- `ELC-079`: eligible cancellation restored active state and became terminal; cancellation after completed clearance was rejected.
- `ELC-080`: invalid chronology and invalid/terminal transitions were rejected without partial mutation; uncertain browser outcomes retained entered values.
- `ELC-081`: **Not Run**. The product does not yet calculate and present authoritative open payroll, leave, and document dependency blockers with owner guidance.
- `ELC-082`: post-exit login was denied and the exited employee disappeared from the current manager scope in Chromium, Firefox, and WebKit.
- `ELC-083`: hard delete was denied at API, ORM, and database boundaries; retained exit, assignment, and spell records remained linked.
- `ELC-084`: **Blocked** pending approved rehire continuity policy.

## Verification

- Complete exit Playwright campaign: **36 passed, 0 failed** across Chromium, Firefox, and WebKit.
- Focused post-exit browser probe after the manager-scope repair: **3 passed, 0 failed**.
- PostgreSQL exit-integrity and lifecycle authorization suite: **6 passed, 0 failed**.
- Selector regression including active/on-notice versus inactive/exited scope: **2 passed, 0 failed**.
- TypeScript: PASS.
- Focused ESLint: PASS.
- Django system checks: PASS.
- Migration drift: PASS, no changes detected.
- Git whitespace check: PASS.

One intermediate test assertion expected an employee code where the audit contract intentionally records the authenticated username. The failed diagnostic run was retained, the expectation was aligned to the established actor-identity contract, and the complete focused suite then passed.

## Register Verdict

- Newly Passed: `ELC-075` through `ELC-080`, `ELC-082`, and `ELC-083`.
- Not Run: `ELC-081`.
- Blocked: `ELC-084`.

Global lifecycle register after EL-1K: **58 Passed, 0 Failed, 3 Blocked, 39 Not Run**.

## Verdict

EL-1K is **CONDITIONAL**. The supported exit lifecycle, atomic completion, cancellation, post-exit access, current manager scope, and retained-history protections pass. Full exit-phase certification is withheld until `ELC-081` has an approved dependency contract and implementation. Rehire remains blocked independently.

No commit, push, deployment, shared migration, email, payroll execution, or shared-environment mutation occurred.
