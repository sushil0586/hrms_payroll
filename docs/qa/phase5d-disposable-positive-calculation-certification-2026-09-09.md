# Phase 5D Disposable Positive Calculation Certification - 2026-09-09

## Scope

Certified browser-created payroll rule prerequisites and positive disposable payroll calculation on local dev:

- `/hr-admin/payroll-rules`
- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-calculations?runId=[createdRunId]`

## Browser Coverage

- Payroll rule definition form:
  - `Code` textbox.
  - `Name` textbox.
  - `Rule type` dropdown.
  - `Description` textbox.
  - `Tags JSON` textarea.
  - `Config profile reference` textbox.
  - `New` button.
  - `Create rule` / `Save rule` button.

- Payroll rule version form:
  - `Rule` dropdown.
  - `Version` numeric input.
  - `Status` dropdown.
  - `Expression language` dropdown.
  - `Expression` textbox.
  - `Effective from` date input.
  - `Effective to` date input.
  - `Rounding rule reference` textbox.
  - `Input schema JSON` textarea.
  - `Output schema JSON` textarea.
  - `Config snapshot JSON` textarea.
  - `New` button.
  - `Create version` / `Save version` button.

- Disposable calculation path:
  - Created an active formula rule version through the browser.
  - Created a disposable payroll run through the browser.
  - Created and edited a disposable payroll input snapshot through the browser.
  - Included `salary.annual_ctc` in the snapshot, satisfying calculation validation.
  - Locked input snapshots through the browser.
  - Ran `Calculate draft` through the browser.
  - Confirmed positive calculation response and visible success status.

## Implementation Notes

- Added authenticated Next proxies for payroll rule definitions and versions.
- Added a payroll rule operations panel to expose rule CRUD in the HR admin browser workspace.
- The calculation rule is not backend-hardcoded; its expression, schemas, status, effective dates, rounding ref, component mapping, and config snapshot are all operator-configurable UI inputs.
- Normalized backend validation handling for rule definition/version save helpers.

## Test Commands

```bash
PLAYWRIGHT_PORT=3221 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3221 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`.

Targeted regressions:

```bash
pnpm --dir web exec playwright test web/tests/e2e/payroll-rules-flows.spec.ts --project=chromium --workers=1 --timeout=300000
pnpm --dir web exec playwright test web/tests/e2e/phase5b-payroll-close-action-controls.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`, `4 passed`.

Static checks:

```bash
pnpm --dir web lint
pnpm --dir web typecheck
source .venv/bin/activate && python backend/manage.py check
```

Result: all passed.

## Confidence

- Payroll rule CRUD/browser confidence: 84%.
- Disposable positive calculation confidence: 86%.
- Payroll mutation readiness confidence: 84%.
- Current Phase 5 confidence: 84%.

## Residual Risks

- Review submit, approval, final lock, output generation, publish, ESS payslip visibility, and finance handoff still need positive-path disposable proof.
- Input immutability after lock still needs explicit browser negative proof.
- Artifact access isolation still needs cross-persona browser proof.
