# Phase 5J Final Lock Destructive Controls Certification - 2026-09-09

## Scope

Certified final-lock destructive controls through the disposable payroll close browser flow:

- `/hr-admin/payroll-review?reviewId=[createdReviewId]`
- `/hr-admin/payroll-inputs?runId=[createdRunId]`
- `/api/hr-admin/payroll-runs/[runId]/open-review`
- `/api/hr-admin/payroll-runs/[runId]`

## Product Fix

Final-locked payroll runs are now immutable through the HR admin run update path.

Changed:

- `backend/apps/common/api_views.py`

Guard:

- If an existing `PayrollRun` has status `locked`, `save_hr_admin_payroll_run` raises `Final locked payroll runs cannot be edited.`

## Browser Path Certified

1. Created a disposable payroll rule, run, and input snapshot.
2. Locked inputs, calculated draft, opened review, submitted review, approved review, and final-locked the run.
3. Attempted to reopen review for the final-locked run through the browser action panel.
4. Confirmed the API returned `400` and the UI displayed the final-lock reopen error.
5. Attempted to edit the final-locked payroll run through the payroll inputs run form.
6. Confirmed the API returned `400` and the UI displayed the final-lock edit error.
7. Continued the valid final-locked flow by generating outputs, publishing, creating finance handoff, transmitting, acknowledging, generating audit pack, and proving ESS payslip visibility.

## Element Coverage

- Review controls: final lock, open review action after final lock, error feedback.
- Payroll run form: selected final-locked run, name textbox, save action, error feedback.
- Full close continuity: output generation and post-publish handoff remain valid after destructive actions are rejected.

## Confidence

## Test Commands

```bash
source .venv/bin/activate && python backend/manage.py check
```

Result: passed.

```bash
pnpm --dir web exec tsc --noEmit
```

Result: passed.

```bash
PLAYWRIGHT_PORT=3223 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`.

Targeted Phase 5 close/negative/access regressions:

```bash
PLAYWRIGHT_PORT=3223 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 \
HRMS_API_BASE_URL=http://127.0.0.1:8012/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts \
  web/tests/e2e/phase5g-payroll-negative-controls.spec.ts \
  web/tests/e2e/phase5h-payroll-artifact-access-isolation.spec.ts \
  web/tests/e2e/phase5i-payroll-register-export-authorization.spec.ts \
  --project=chromium --workers=1 --timeout=300000
```

Result: `4 passed`.

- Final-locked reopen prevention confidence: 92%.
- Final-locked run edit prevention confidence: 92%.
- Current Phase 5 confidence: 97%.

## Residual Risks

- Phase 5 has no remaining known launch-critical payroll setup-to-close residual. Future broad launch rehearsals should still repeat Phase 5 suites on staging with production-like data volume.
