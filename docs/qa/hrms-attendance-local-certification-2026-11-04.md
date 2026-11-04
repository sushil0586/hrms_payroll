# HRMS Attendance Local Certification

Date: 2026-11-04

Environment: isolated local PostgreSQL 16, Django, and production-built Next.js

Verdict: PASS for the bounded Attendance module scope described below

## Scope

- HR attendance records: filtering, reset, pagination, bulk actions, edit, inspection, retry, loading, and empty states.
- Attendance policy and assignment create/edit lifecycle.
- Shift and roster template create/edit/inspect lifecycle.
- Attendance period close, lock, reopen, and historical protection.
- ESS correction validation, submission, persistence, refresh, and feedback.
- MSS attendance review validation and decision lifecycle.
- Role and tenant boundaries, including a real second synthetic tenant.
- Responsive layouts at 1440, 768, 390, and 320 CSS pixels.
- Keyboard interaction and automated WCAG 2 A/AA/2.1 AA checks for the records workspace.

## Corrections

- Added an ESS Attendance route loading state.
- Removed duplicate ESS validation notifications while preserving field errors and a single summary.
- Kept successful ESS correction feedback visible for five seconds after modal closure.
- Added scoped loading feedback for attendance-period and regularization-history refreshes.
- Hid empty Attendance and regularization pagination controls.
- Hid empty roster-template pagination controls.
- Corrected selected-row secondary-text contrast in the Attendance records table.
- Updated the deterministic Attendance fixture and records evidence suite to use maintained, run-owned infrastructure.

## Verification

| Gate | Result |
| --- | --- |
| PostgreSQL/Django Attendance regressions | 43 passed |
| Playwright Attendance records certification | 14 passed |
| Playwright HR/MSS/ESS lifecycle | 3 passed |
| Playwright close/policy/assignment/shift/roster lifecycle | 5 passed |
| Total distinct focused browser cases | 22 passed, 0 failed |
| TypeScript | Passed |
| ESLint | Passed |
| Django system check | Passed, zero issues |
| Migration drift | None |
| Production Next.js build | Passed |
| Git whitespace check | Passed |
| Automated accessibility | Zero violations in the scoped Attendance records surfaces |

The production build retains the pre-existing Autoprefixer warning at `globals.css:4686` about mixed support for `end`; it did not fail the build and is outside this Attendance change.

## Integrity And Security Evidence

- Closed attendance periods rejected mutation and retained the historical status and lock.
- Duplicate bulk activation produced one request and one durable effect.
- Duplicate ESS submission produced one successful write.
- A foreign-tenant Attendance record returned the approved non-disclosing denial and produced no mutation.
- A view-only Attendance role could read the queue but could not select or mutate records.
- Interrupted older navigation could not replace the newer committed query.
- Failed workspace refresh retained the last confirmed data and recovered through Retry.
- Record edits preserved check-in, check-out, and work-duration values while persisting the intended notes update.

## Boundaries

This is local certification, not independent certification or staging evidence. No shared staging or production data was changed, no payroll was executed, and no email was sent. No Git commit, push, deployment, or migration was performed.
