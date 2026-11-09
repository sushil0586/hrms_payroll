# Employee Lifecycle EL-1I Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1I closes `ELC-061` branch/location/business-unit movement and `ELC-063` employment-type movement. It preserves the EL-1H movement implementation and adds deterministic browser and PostgreSQL evidence. No shared staging or production system was used.

## ELC-061 Evidence

- Submitted an inconsistent branch/location combination through the browser and received a field-specific rejection.
- Submitted an inconsistent department/business-unit combination and received a field-specific rejection.
- Confirmed both rejected attempts remained on the draft route and created no completed movement.
- Completed a valid branch, location, department, and business-unit movement through the browser.
- Verified the prior assignment was superseded, the new assignment retained the employment spell, and the employee projection matched the new hierarchy.
- Verified one lifecycle audit event for the completed movement.

## ELC-063 Evidence

- Completed an employment-type movement through the browser using a tenant-owned employment type.
- Verified the prior assignment was superseded and the new assignment and employee projection used the selected employment type.
- Verified the original employment spell remained unchanged and the employee still had exactly one spell.
- Verified one `employment_type_change` lifecycle audit event.

## Verification

- Complete movement Playwright campaign: **36 passed, 0 failed** across Chromium, Firefox, and WebKit.
- Effective-employment PostgreSQL integrity suite: **8 passed, 0 failed**.
- TypeScript: PASS.
- ESLint: PASS.
- Django system checks: PASS.
- Migration drift: PASS, no changes detected.

The first WebKit attempt received HTTP 200 from login but did not retain the cookie because the local production-mode Next.js process had been started without `HRMS_COOKIE_SECURE=false`. Restarting the task-owned server with the documented loopback-only cookie setting resolved the environment issue; both WebKit journeys then passed. Production cookie behavior was not changed.

## Scenario And Register Verdict

- `ELC-061`: **Passed**.
- `ELC-063`: **Passed**.
- `ELC-065` and `ELC-068`: Not Run.
- `ELC-073` and `ELC-074`: Blocked pending policy approval.

Global lifecycle register after EL-1I: **48 Passed, 0 Failed, 3 Blocked, 49 Not Run**.

## Verdict

EL-1I is **PASS** for its bounded scope. Hierarchy and employment-type movements are certified at browser, API, PostgreSQL, audit, history, and projection layers. Overall employee-lifecycle certification remains conditional because backdating and concurrent completion are not yet executed and policy-dependent contracts remain blocked.

No commit, push, deployment, shared migration, email, payroll execution, or shared-environment mutation occurred.
