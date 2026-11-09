# Employee Lifecycle EL-1E Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1E closes the five executable lifecycle gaps retained after EL-1D:

- `ELC-015`: create an employee with every supported optional contact, milestone, organization, employment, and reporting-manager value; refresh and reconcile the persisted record.
- `ELC-031`: reject inactivation while access is live, suspend the user and membership, deactivate the employee, and prove login denial.
- `ELC-062`: complete an effective reporting-manager movement through the HR Admin browser workflow.
- `ELC-071`: remove the employee from the former manager's current reportee scope while retaining that manager's recorded decision history.
- `ELC-072`: add the employee to the new manager's current scope without exposing the former manager's decision history.

The Playwright workspace now initializes an authoritative employment-assignment baseline for every synthetic fixture employee. This is fixture integrity required by completed effective-dated movement tests; it does not alter production behavior.

## Browser Evidence

New suite: `web/tests/employee-makeover/el1e.spec.ts`
Configuration: `web/playwright.employee-el1e.config.ts`

- Chromium: 3/3 passed.
- Firefox: 3/3 passed.
- WebKit: 3/3 passed.
- Aggregate: **9 passed, 0 failed** with one worker.
- Evidence: `docs/qa/evidence/employee-el1e-2026-11-05/results.json` and per-test traces.

The suite performs real browser creation, movement, access suspension, and deactivation. It independently checks authenticated API state, manager inbox/history projections, refresh persistence, and denied login.

## PostgreSQL Evidence

Focused Django/PostgreSQL qualification: **4 passed, 0 failed**.

- Completed movement updates the authoritative employee projection.
- Effective manager history remains attributed to the decision actor after reassignment.
- A completed exit is rejected while employee access remains live.
- A completed exit updates employee status only after the access prerequisite is satisfied.

The initial qualification run also exposed and corrected two test-harness issues without weakening assertions: PostgreSQL environment propagation for workspace provisioning and response-body capture after immediate client navigation.

## Quality Gates

- TypeScript: PASS
- ESLint: PASS
- Django system check: PASS
- Migration drift: PASS, no changes detected
- Production build: PASS
- Existing Autoprefixer warning at `globals.css:4686`: unchanged
- Diff whitespace check: PASS

## Cleanup and Integrity

- No task-owned `pw-qa-*` tenant remains.
- The task-owned PostgreSQL container and local Django/Next.js processes were stopped and removed.
- The protected payroll Playwright repair has no working-tree diff.
- Existing unrelated working-tree changes were preserved.

## Scenario Verdicts

Promoted to Passed: `ELC-015`, `ELC-031`, `ELC-062`, `ELC-071`, and `ELC-072`.

No other scenario was promoted. Cross-legal-entity transfer and retroactive correction remain Blocked under `ELC-073` and `ELC-074`; all other unexecuted lifecycle contracts retain their prior status.

## Verdict

EL-1E executed scope: **PASS**. The employee create/edit range `ELC-014` through `ELC-032` is closed in the current local candidate, and the effective manager reassignment/history package is certified across all three browser engines plus PostgreSQL service tests.

No commit, push, deployment, shared staging mutation, email, or payroll execution occurred.
