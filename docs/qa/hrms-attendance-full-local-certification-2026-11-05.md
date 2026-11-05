# HRMS Attendance Full Local Certification

Date: 2026-11-05

Environment: isolated PostgreSQL 16, Django, Redis-compatible application contracts where exercised, and production-built Next.js

Verdict: PASS for local Attendance module certification

## Certified Scope

- All 30 HR Admin Attendance routes at desktop, tablet, and mobile viewport widths.
- Attendance records, regularizations, policies, policy assignments, shifts, employee shift assignments, roster templates, holiday calendars, reports, operations, and period close.
- ESS attendance correction and submission lifecycle.
- MSS attendance review and decision lifecycle.
- Create, read, update, inspect, filter, reset, sort, paginate, export, retry, loading, empty, error, and refresh-persistence behavior where supported.
- Validation, duplicate suppression, idempotent replay, stale-write rejection, tenant isolation, role denial, audit attribution, and closed-period historical protection.
- Keyboard focus, responsive containment, and automated accessibility checks on the covered Attendance surfaces.

## Fresh Verification

| Gate | Result |
| --- | --- |
| PostgreSQL/Django integrity and contract tests | 43 passed, 0 failed |
| Attendance family browser matrix | 198 passed, 0 failed |
| Chromium matrix | 66 passed |
| Firefox matrix | 66 passed |
| WebKit matrix | 66 passed |
| HR, MSS, and ESS attendance actions | 3 passed |
| Shift and roster setup actions | 2 passed |
| Policy and assignment actions | 2 passed |
| Attendance close lifecycle | 1 passed |
| Total focused browser assertions | 206 passed, 0 failed |
| Production Next.js build | Passed |
| TypeScript | Passed |
| Django system check | Passed, zero issues |
| Migration drift | None |
| Git whitespace check | Passed |

The production build retained the existing Autoprefixer warning at `globals.css:4686` concerning mixed support for `end`. It did not fail the build and is not an Attendance behavior defect.

## Integrity Evidence

- Closed periods rejected historical employee shift assignment changes and retained the existing assignment.
- Duplicate and replayed operations produced one durable business effect.
- Stale writes were rejected without replacing newer state.
- Foreign-tenant and unauthorized operations were denied without mutation or successful mutation audit.
- Attendance close validation, submission, approval, close, lock, reopen, and audit transitions completed through real browser and API actions.
- Export and register checks included records beyond page 500 and reconciled the requested filtered result.
- Failed refreshes retained confirmed data and recovered through the supported Retry action.
- Browser history and committed filter state were preserved without stale navigation replacing newer state.

## Harness Corrections

- Replaced deleted evidence-artifact dependencies with the maintained Attendance fixture.
- Embedded the stable 30-route source inventory in the executable route matrix.
- Updated assertions for current button semantics, SPA navigation, default page size, inspector dialog behavior, and closed-period protection.
- Rebuilt the production frontend with a local HTTP cookie policy so browser API evidence used the isolated environment rather than a stale build configuration.

These changes affect test infrastructure only; no Attendance business rule was weakened.

## Cleanup

- Eight interruption-leftover Playwright workspaces were identified through exact sandbox, namespace, and owner-email markers.
- Each workspace passed guarded dry-run and ownership validation before cleanup.
- Final state: zero `pw-qa-` tenants and zero `pw_` users.
- All task frontend/backend ports were closed.
- The isolated PostgreSQL container was stopped.
- No shared staging or production resource was changed.

## Certification Boundary

Attendance is fully certified for the local application revision and the scope above. This is same-agent local certification, not independent review or fresh shared-staging certification. Shared staging must still verify the deployed SHA/image, migrations, configuration, and a bounded Attendance smoke before the module can be called fully certified in staging.

No commit, push, deployment, shared migration, real payroll operation, or email was performed.
