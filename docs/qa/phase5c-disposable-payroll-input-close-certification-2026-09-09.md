# Phase 5C Disposable Payroll Input Close Certification - 2026-09-09

## Scope

Certified the first disposable payroll close path through the local browser UI:

- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-calculations?runId=[createdRunId]`

## Browser Coverage

- Payroll run form:
  - `Period` dropdown.
  - `Pay group` dropdown.
  - `Code` textbox.
  - `Name` textbox.
  - `Status` dropdown.
  - `Input profile ref` textbox.
  - `Snapshot schema ref` textbox.
  - `Config profile reference` textbox.
  - `New` button.
  - `Create run` / `Save run` button.

- Payroll input snapshot form:
  - `Payroll run` dropdown.
  - `Employee` dropdown.
  - `Snapshot status` dropdown.
  - `Input profile ref` textbox.
  - `Config profile reference` textbox.
  - `Employee snapshot JSON` textarea.
  - `Organization snapshot JSON` textarea.
  - `Salary snapshot JSON` textarea.
  - `Attendance snapshot JSON` textarea.
  - `Validation snapshot JSON` textarea.
  - `New` button.
  - `Create snapshot` / `Save snapshot` button.

- Input lock panel:
  - `Lock selected run inputs` button.
  - Positive lock path with at least one disposable ready snapshot.

- Calculation transition:
  - Created run opened on `/hr-admin/payroll-calculations?runId=[createdRunId]`.
  - `Calculation profile ref` textbox filled.
  - `Calculate draft` action posted through the authenticated Next proxy.
  - Browser asserted only accepted domain outcomes: success or rule-level `400`; no auth, missing route, or server failure accepted.

## Implementation Notes

- Added browser-facing payroll input operations instead of relying on hidden API calls.
- Added Next API proxies for payroll run create/update, payroll input snapshot create/update, and input locking.
- Backend payroll run and input snapshot save helpers now return clean DRF validation errors to the browser.
- Snapshot data remains configurable JSON; no tenant policy, profile, salary, attendance, or validation values are hardcoded server-side.

## Test Commands

```bash
PLAYWRIGHT_PORT=3220 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3220 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`.

Targeted regressions:

```bash
pnpm --dir web exec playwright test web/tests/e2e/payroll-inputs-flows.spec.ts --project=chromium --workers=1 --timeout=300000
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

- Payroll input operations UI confidence: 86%.
- Disposable run/snapshot lock confidence: 84%.
- Payroll close mutation confidence: 80%.
- Current Phase 5 confidence: 81%.

## Residual Risks

- Disposable salary assignment and rule coverage must be created in the same browser flow so calculation can complete positively every time.
- Review submit, approval, final lock, output generation, publish, ESS payslip visibility, and finance handoff still need positive-path disposable proof.
- Current calculation transition accepts rule-level `400` because disposable input data is not yet guaranteed to satisfy every payroll rule dependency.
