# HRMS/Payroll Phase L5 Loading-State Gap Closure

Date: 2026-10-16  
Decision: **CONDITIONAL**

## Executive result

Phase L5 closed three shared root-cause families with executed browser evidence and reconciled all 46 tracker rows without treating source inspection as browser proof.

| Status | Families |
| --- | ---: |
| Verified | 9 |
| Covered | 1 |
| Partial | 19 |
| Open | 17 |
| Audited | 0 |
| Total | 46 |

Application-wide loading-state certification is not complete. The remaining P1 work is concentrated in imports, server-backed dialogs/detail panels, attendance/policy CRUD surfaces, Platform Admin tenant selection/onboarding stages, and broad timeout taxonomy.

## Implemented closure

### Employee lookup

- Added request cancellation on a new query and component unmount.
- Retained the last usable employee options after a recoverable error.
- Added `aria-busy`, polite updating status, an alert, and explicit Retry.
- Kept the existing request identity guard so late A/B responses cannot replace C.

Browser result: 2,000/750/300 ms A to B to C sequence passed. The visible pending state appeared in **366 ms**. A 750 ms failure retained the C result and Retry succeeded.

### Authentication feedback

- Sign-in now uses the shared stable-width pending action and distinguishes `Signing in` from `Opening workspace`.
- Sign-out now blocks duplicate requests, reports pending state, handles HTTP/network failure, and restores an actionable control without clearing the session.

Browser result: the 2,000 ms sign-out failure displayed pending feedback in **126 ms**, generated one request after a forced duplicate activation, exposed an alert, and restored the button. Login navigation-stall injection remains partial.

### Report and provider operations

- Migrated every direct report CSV, package, and manifest link under `web/src/app/hr-admin/reports` to `AsyncDownloadButton`.
- Preserved each original URL, query filter, anchor fallback, and download behavior.
- Added pending, duplicate guard, exception recovery, and accessible status/error semantics to mapping-pack clone, activate, archive, and export actions.

Browser result: a previously unmigrated leave-balance export showed pending feedback in **96 ms**, surfaced a 2,000 ms `503`, retried after 750 ms, and downloaded successfully. The neighboring L4 workforce case remained green at **130 ms**. Source inventory found zero remaining direct report API download links.

## Security and cleanup

Two disposable Enterprise workspaces were provisioned using `manage_playwright_workspace`.

- Tenant A job-status read: `200`, real durable status `queued`.
- Tenant B read of Tenant A job: `404`.
- Tenant B retry of Tenant A job: `404`.
- Both workspaces deleted with `verified_absent=true`.
- Direct database verification returned `remaining_tenants=[]`.

This verifies server-side tenant scoping for status and retry without relying on UI filtering.

## Verification

| Gate | Result |
| --- | --- |
| L5 focused Playwright | 3 passed |
| L4 neighboring Playwright | 2 passed |
| Legacy leave-balance neighboring run | 1 passed, 1 automation-auth failure |
| Backend payroll job/RBAC and report permission tests | 2 passed |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Production frontend build | Passed; existing Autoprefixer `end` warning only |
| Fixture cleanup | Passed |

The legacy leave-balance HR Admin test still receives `401` when it calls a Next API route through `page.request.get()` after browser login, including with a disposable authorized user. The real browser download flow against the same route passes, and the employee denial test passes. This is classified as a Playwright BFF-session-context mismatch, not a confirmed product export defect; logs `007` and `010` retain both reproductions.

## Remaining P1 gaps

- `LS-004`, `LS-006` to `LS-013`: query-backed employee actions, imports, attendance, policy, assignment, lifecycle, and organization surfaces.
- `LS-016`, `LS-022`, `LS-023`, `LS-026`: portal-specific attendance/dashboard/notification/support workflows.
- `LS-028`, `LS-029`, `LS-032`: Platform Admin selection/onboarding stages and remote dialog focus/loading contracts.
- `LS-035`, `LS-039` to `LS-041`, `LS-044` to `LS-046`: navigation-stall recovery, remaining payroll/provider/report refresh states, error taxonomy, accessibility reconciliation, and native-fetch timeout policy.

These are not all product defects. Several are unexecuted evidence matrices or route-local implementations that still need consolidation. They remain open or partial in the tracker.

## Commands and evidence

Primary commands:

```text
pnpm --dir web typecheck
pnpm --dir web exec eslint src/app/hr-admin/reports ... tests/e2e/loading-state-gap-closure.spec.ts
pnpm --dir web build

PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3161 \
HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 \
pnpm --dir web exec playwright test tests/e2e/loading-state-gap-closure.spec.ts \
--workers=1 --reporter=line --trace=retain-on-failure

./.venv/bin/pytest -q \
tests/test_phase0_api_smoke.py::test_hr_admin_payroll_async_calculation_is_durable_idempotent_and_permission_scoped \
tests/test_phase0_api_smoke.py::test_report_exports_require_category_export_permissions
```

Evidence directory: `docs/qa/evidence/loading-state-l5/`.

- `001` to `005`: preserved initial failures and corrected reruns.
- `006`: complete focused pass with measured acknowledgment latency.
- `007`: neighboring L4 pass and legacy report authentication mismatch.
- `008`: cross-tenant payroll job status/retry evidence.
- `009`: disposable fixture cleanup verification.
- `010`: authorized disposable reproduction of the legacy APIRequestContext mismatch.

## Decision

**CONDITIONAL.** L5 materially improves shared behavior and verifies the highest-leverage changes, but 36 families remain open or partial and therefore application-wide loader certification is not justified. No production-readiness claim is made.
