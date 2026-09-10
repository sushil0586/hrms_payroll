# Phase 5G Negative Lock and Immutability Certification - 2026-09-09

## Scope

Certified negative payroll controls through local browser UI and authenticated Next API routes:

- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-calculations?runId=[createdBlockedRunId]`

## Browser Path Certified

1. Created a disposable payroll run through the browser.
2. Created a disposable payroll input snapshot for employee `EMP-0042` with `blocked` status and validation blockers.
3. Attempted to lock the run inputs through the browser.
4. Confirmed the lock API returned `400` with blocked snapshot count and the UI displayed the blocking error.
5. Attempted draft calculation for the unready blocked run through the browser controls.
6. Confirmed calculation returned `400` and the UI displayed the validation failure.
7. Created a second disposable run and ready snapshot.
8. Locked the ready run inputs successfully.
9. Attempted to edit the locked input snapshot through the browser form.
10. Confirmed the patch API returned `400` and the UI displayed the immutability error.

## Product Fix

Locked payroll input snapshots are now immutable through the HR admin write path.

Changed:

- `backend/apps/common/api_views.py`

Guard:

- If an existing `PayrollInputSnapshot` has status `locked`, `save_hr_admin_payroll_input_snapshot` raises `Locked payroll input snapshots cannot be edited.`

## Element Coverage

- Payroll run form: new/create controls, period dropdown, status dropdown, code/name/profile fields.
- Input snapshot form: new/create/save controls, payroll run dropdown, employee dropdown, snapshot status dropdown, JSON textareas.
- Lock panel: lock button, failed lock alert, successful lock status.
- Calculation controls: calculation profile ref, calculate draft button, failed calculation alert.
- Page layout: horizontal overflow guard.

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
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5g-payroll-negative-controls.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`.

## Confidence

- Blocked snapshot lock-gate confidence: 92%.
- Blocked calculation gate confidence: 90%.
- Locked input immutability confidence: 92%.
- Current Phase 5 confidence: 94%.

## Residual Risks

- Payroll artifact access isolation still needs cross-persona browser proof.
- Payroll register export authorization still needs dedicated browser proof.
- Final locked payroll edit/reopen negative paths need a focused destructive-control browser test.
