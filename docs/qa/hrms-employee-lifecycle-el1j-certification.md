# Employee Lifecycle EL-1J Certification

Date: 2026-11-06
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1J closes `ELC-065` governed movement backdating and `ELC-068` concurrent movement completion. It extends the effective-dated movement contract without changing the blocked cross-legal-entity or retroactive-correction policies. No shared staging or production system was used.

## ELC-065 Evidence

- Added tenant configuration `lifecycle.movement_backdating_window_days` with a non-negative integer contract.
- Applied only published, currently effective configuration; missing, archived, invalid, boolean, and negative values fail closed to zero days.
- Used a published 30-day policy in the browser fixture.
- Submitted a 31-day-old completed movement and received a deterministic rejection without navigation or persistence.
- Submitted a 10-day-old completed movement through the same browser form and verified the resulting effective assignment, prior-day scope, current employee projection, exactly two assignments, and one lifecycle audit event.
- Archived the policy in a PostgreSQL regression and verified a one-day-old movement was rejected with no resulting assignment, timeline change, projection change, or success audit.

## ELC-068 Evidence

- Started two completed movements concurrently for the same employee, effective date, and source assignment snapshot.
- Both writers used the production `save_hr_admin_movement` transaction path.
- Row locking and stale-snapshot validation allowed exactly one writer to complete and rejected the other.
- Verified one movement, one resulting assignment, one winning employee projection, and one lifecycle success audit.

## Verification

- Complete movement Playwright campaign: **39 passed, 0 failed** across Chromium, Firefox, and WebKit.
- Effective-employment PostgreSQL integrity suite: **10 passed, 0 failed**.
- TypeScript: PASS.
- ESLint: PASS.
- Django system checks: PASS.
- Migration drift: PASS, no changes detected.

## Scenario And Register Verdict

- `ELC-065`: **Passed**.
- `ELC-068`: **Passed**.
- `ELC-073` and `ELC-074`: Blocked pending policy approval.

Global lifecycle register after EL-1J: **50 Passed, 0 Failed, 3 Blocked, 47 Not Run**.

## Verdict

EL-1J is **PASS** for its bounded scope. Approved backdating is tenant-governed and fails closed, while conflicting movement completion is atomic and exactly one writer succeeds. Overall employee-lifecycle certification remains conditional because policy-dependent movement and rehire contracts remain blocked and later lifecycle phases remain unexecuted.

No commit, push, deployment, shared migration, email, payroll execution, or shared-environment mutation occurred.
