# Employee Lifecycle EL-1A Certification

Date: 2026-11-05
Environment: isolated PostgreSQL 16, Django, and production-built Next.js
Scope: directory/read package supporting `ELC-001` through `ELC-013`

## Result

Verdict: **CONDITIONAL PASS**

The HR Admin directory package passed its browser, API-boundary, accessibility, responsive, build, and integrity checks. `ELC-011` has API/database proof but still needs an explicit ESS browser run. `ELC-012` needs current-candidate MSS browser and API evidence. The broader employee create/edit scope (`ELC-014` onward) was not executed in this package.

## Defect repaired

After an employee detail was opened, applying a filter removed `employeeId` from the URL but left the provider's local selection and drawer stale. The list could show one employee while the drawer showed another.

The repair makes filter application an explicit detail-selection reset. It aborts any in-flight detail request, clears local detail/error/loading state, and preserves explicit row selection for subsequent user actions. The regression verifies an interrupted detail request, successful retry, filter commit, URL cleanup, and drawer closure.

## Verification

| Gate | Result |
| --- | --- |
| Chromium development package | 9 passed |
| Production build | Passed; existing autoprefixer `end` compatibility warning only |
| Chromium production package | 9 passed |
| Firefox production package | 9 passed |
| WebKit production package | 9 passed |
| Cross-browser total | 27 passed, 0 failed |
| Axe checks | No WCAG 2 A/AA or 2.1 AA violations in selected directory patterns |
| Responsive checks | 1440, 768, 390, and 320 px passed in each engine |
| Focus/keyboard | Table region, modal close/cancel, and return behavior passed |
| API/RBAC | Authorized HR read, employee denial, and foreign-tenant 404 passed |
| Focused Django/PostgreSQL | 18 distinct tests passed after contract reconciliation |
| Django system check | No issues |
| Migration drift | No changes detected |
| Modified-file ESLint | Passed after redundant suppression removal |
| Git whitespace check | Passed |

## Contract reconciliation

The legacy ESS profile test incorrectly required `PATCH` to return 405. Current supported behavior permits audited updates to `preferred_name`, `personal_email`, and `phone_number`. The test now verifies that disallowed fields return 400 without changing employee or bank data, while POST, PUT, and DELETE remain 405. Dedicated audited-update tests also pass.

## Evidence

- `docs/qa/evidence/employee-lifecycle-el1a-2026-11-05/cross-browser-production.log`
- `docs/qa/evidence/employee-lifecycle-el1a-2026-11-05/build-final.log`
- Responsive screenshots under `docs/qa/evidence/employee-lifecycle-el1a-2026-11-05/screenshots/`
- Playwright traces under `docs/qa/evidence/hr-admin-employees/results/`

## Remaining work

1. Execute ESS own-profile browser coverage for `ELC-011`.
2. Execute current-reportee MSS browser/API/database coverage for `ELC-012`.
3. Add an explicit directory list failure/retry assertion for the full `ELC-010` contract; the current run covers detail failure/retry.
4. Begin EL-1B employee create/edit scenarios `ELC-014` through `ELC-032`.
5. Obtain EL-0 policy-owner decisions before affected later phases.

No commit, push, deployment, or shared-environment mutation occurred.
