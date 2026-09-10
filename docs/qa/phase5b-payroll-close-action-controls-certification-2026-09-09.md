# Phase 5B Payroll Close Action Controls Certification - 2026-09-09

## Scope

Certified browser-facing payroll close controls on local dev:

- `/hr-admin/payroll-calculations`
- `/hr-admin/payroll-review`
- `/hr-admin/payroll-outputs`
- `/hr-admin/payroll-handoff`

## Browser Coverage

- Calculation controls:
  - `Calculation profile ref` textbox is editable.
  - `Review profile ref` textbox is editable.
  - `Calculate draft` posts through `/api/hr-admin/payroll-runs/[itemId]/calculate-draft`.
  - Domain responses are accepted only as `200`, `201`, or rule-level `400`.

- Review controls:
  - `Submit review` button is visible and enabled when a review is selected.
  - `Approval profile ref` textbox is editable.
  - `Approve review` posts through `/api/hr-admin/payroll-reviews/[itemId]/approve`.
  - `Final lock` button is visible and enabled when a review is selected.
  - `Output profile ref` textbox is editable.
  - `Generate outputs` button is visible and enabled when a review is selected.

- Output controls:
  - `Publish outputs` button is visible and enabled when an output batch is selected.
  - `Handoff profile ref` textbox is editable.
  - `Generate handoff` button is visible and enabled when an output batch is selected.
  - `Publish outputs` posts through `/api/hr-admin/payroll-output-batches/[itemId]/publish`.

- Handoff controls:
  - `Transmit handoff` button is visible.
  - `Acknowledgement profile ref` textbox is editable.
  - `Acknowledge handoff` button is visible.
  - `Audit pack profile ref` textbox is editable.
  - `Generate audit pack` button is visible.
  - When no finance handoff is selected, all action controls show disabled guidance instead of failing silently.
  - When a handoff is selected, audit-pack generation posts through `/api/hr-admin/payroll-finance-handoffs/[itemId]/generate-audit-pack`.

## Implementation Notes

- Added an authenticated reusable browser action panel so payroll transition controls live inside the HR admin workspace.
- Added Next API proxies for close-flow backend endpoints. These proxies reuse the existing token cookie boundary and avoid direct unauthenticated `/api/v1` form posts.
- Profile references remain operator-configurable text inputs; no provider/profile refs are hardcoded into backend calls.

## Test Commands

```bash
PLAYWRIGHT_PORT=3219 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3219 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5b-payroll-close-action-controls.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `4 passed`.

Regression suite rerun:

```bash
PLAYWRIGHT_PORT=3219 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3219 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5a-payroll-control-room-certification.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `5 passed`.

Static checks:

```bash
pnpm --dir web lint
pnpm --dir web typecheck
source .venv/bin/activate && python backend/manage.py check
```

Result: all passed.

## Confidence

- Payroll close action UI confidence: 84%.
- Payroll close proxy/auth confidence: 82%.
- Payroll mutation readiness confidence: 78%.
- Current Phase 5 confidence: 78%.

## Residual Risks

- A disposable payroll period/run must still be created and closed from start to finish through the browser.
- The seeded local state can legitimately return domain-level `400` responses for already-advanced payroll records.
- Full positive-path proof is still pending for submit, final lock, output generation, finance handoff generation, transmit, and acknowledgement on disposable data.
- Artifact access isolation and ESS payslip post-publish visibility remain pending.
