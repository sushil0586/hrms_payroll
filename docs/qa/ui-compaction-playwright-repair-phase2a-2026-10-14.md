# UI Compaction Playwright Repair Phase 2A

Date: 2026-10-14

Scope: repair the six additional ESS workflow/control-center Playwright failures documented after Phase 2, then rerun the affected suites and neighboring ESS/MSS/frontend validation coverage. This is not a full production certification.

## Files Modified

- `web/tests/e2e/ess-control-center-certification.spec.ts`
- `web/tests/e2e/ess-frontend-validation.spec.ts`
- `web/tests/e2e/ess-mss-workflow-certification.spec.ts`
- `web/tests/e2e/mss-control-center-certification.spec.ts`
- `web/tests/e2e/mss-frontend-validation.spec.ts`
- `web/tests/e2e/platform-admin-frontend-validation.spec.ts`
- `web/tests/e2e/tenant-admin-frontend-validation.spec.ts`

## Root Causes Resolved

- ESS statutory declaration control-center coverage expected only the older `Start declaration` / `Update declaration` action heading. The compact UI can show `Review submitted declaration`, so the assertion now accepts the current workflow heading.
- ESS document and notification control-center checks still used obsolete `.metric-tile` selectors. They now use the shared compact metric helper scoped to the current accessible metric regions.
- ESS workflow submit tests expected mocked transport-error copy, but the current live-mode guard correctly reports that leave requests and attendance regularizations are only available in live mode. The tests now preserve the functional assertion while accepting the current guard.
- ESS workflow browser-history recovery could leave the test outside the ESS app shell after compact navigation. The test now verifies the route and returns to `/ess` with the authenticated helper when needed.
- MSS leave/attendance review dialog locators now reuse the shared accessible-name constants introduced in Phase 2.
- ESS, MSS, Tenant Admin, and Platform Admin frontend validation helpers now use authenticated staging navigation when `HRMS_API_BASE_URL` is present, while preserving the demo-cookie fallback for demo-only runs.
- MSS approval validation tests no longer mutate live fixture queues during the positive approval leg. They intercept approve calls and assert the API submission count, preserving the rejection-before-API assertion.
- Platform Admin admin-contact edit/provisioning validation now creates a legitimate authenticated setup contact only when the selected fixture tenant has none, then runs the existing validation checks.
- Compact modal close/submit accessible-name collisions were fixed by narrowing ESS statutory declaration/proof submit locators and explicitly dismissing the declaration modal before opening proof validation.

## Before / After

Phase 2 side-effect baseline:

- Before Phase 2A: affected ESS workflow/control-center sweep reported `5 passed`, `6 failed`.
- After Phase 2A: affected ESS workflow/control-center plus MSS frontend neighbor sweep reported `11 passed`.

Previously repaired frontend validation baseline:

- After Phase 2A: `24 passed`, `1 skipped`.

Previously repaired ESS/MSS modal and MSS control-center baseline:

- After Phase 2A: `9 passed`.

TypeScript:

- After Phase 2A: passed.

## Commands Executed

```bash
cd backend && ../.venv/bin/python manage.py bootstrap_demo_workspace
```

Result: demo workspace bootstrapped successfully before live Playwright reruns.

```bash
cd web && HRMS_ENABLE_DEMO_DATA=true HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 NEXT_DIST_DIR=.next/playwright pnpm exec next dev --hostname 127.0.0.1 --port 3100
```

Result: Next dev server served `http://127.0.0.1:3100` for the repair runs.

```bash
cd backend && ../.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Result: Django API served `http://127.0.0.1:8000` for live-auth validation.

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/ess-control-center-certification.spec.ts tests/e2e/ess-mss-workflow-certification.spec.ts tests/e2e/mss-frontend-validation.spec.ts --workers=1 --reporter=line
```

Result: `11 passed`.

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/ess-frontend-validation.spec.ts --workers=1 --reporter=line
```

Result: `3 passed`, `1 skipped`.

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/platform-admin-frontend-validation.spec.ts --workers=1 --reporter=line
```

Result: `11 passed`.

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-core-frontend-validation.spec.ts tests/e2e/ess-frontend-validation.spec.ts tests/e2e/mss-frontend-validation.spec.ts tests/e2e/tenant-admin-frontend-validation.spec.ts tests/e2e/platform-admin-frontend-validation.spec.ts --workers=1 --reporter=line
```

Result: `24 passed`, `1 skipped`.

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web exec playwright test tests/e2e/mss-control-center-certification.spec.ts tests/e2e/ess-mss-modal-certification.spec.ts --workers=1 --reporter=line
```

Result: `9 passed`.

```bash
pnpm --dir web exec tsc --noEmit
```

Result: passed.

## Remaining Blockers

No genuine application defect was proven in the Phase 2A repaired set. The single skip in the frontend validation group remains the existing tenant-data skip for an unavailable submittable leave type and was not introduced by this repair.

This Phase 2A result is limited to the suites listed above and does not constitute full production certification.
