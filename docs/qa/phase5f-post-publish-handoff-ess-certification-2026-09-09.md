# Phase 5F Post-Publish Handoff and ESS Certification - 2026-09-09

## Scope

Certified the disposable payroll close path after publish through local browser UI:

- `/hr-admin/payroll-rules`
- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-calculations?runId=[createdRunId]`
- `/hr-admin/payroll-review?reviewId=[createdReviewId]`
- `/hr-admin/payroll-outputs?batchId=[createdBatchId]`
- `/hr-admin/payroll-handoff?handoffId=[createdHandoffId]`
- `/ess/payslips?q=[createdRunCode]`

## Browser Path Certified

1. Created a configurable payroll rule definition and active rule version.
2. Created a disposable payroll run with configurable input, snapshot, and run profile references.
3. Created and edited a disposable input snapshot for employee `EMP-0042`.
4. Locked input snapshots for calculation.
5. Calculated draft payroll.
6. Opened, submitted, approved, and final-locked payroll review.
7. Generated and published payroll outputs.
8. Generated finance handoff from the published output batch.
9. Transmitted the finance handoff.
10. Recorded handoff acknowledgement with a configurable acknowledgement profile reference.
11. Generated provider audit-pack evidence with a configurable audit-pack profile reference.
12. Logged in as the employee persona and proved the published disposable payslip is visible in ESS with a download link and source hash evidence.

## Element Coverage

- Rule definition form: code, name, rule type, description, tags JSON, config profile reference, new/create controls.
- Rule version form: rule dropdown, version, status dropdown, expression language, expression, effective dates, rounding profile, input/output schemas, config snapshot, new/create controls.
- Payroll run form: period dropdown, pay group field, code, name, status dropdown, input profile, snapshot schema, config profile, new/create controls.
- Input snapshot form: payroll run dropdown, employee dropdown, snapshot status dropdown, profile refs, employee/org/salary/attendance/validation JSON textareas, create/save controls.
- Input lock panel: selected-run lock action and success feedback.
- Calculation controls: calculation profile ref, calculate draft, review profile ref, open review.
- Review controls: submit, approval profile ref, approve, final lock, output profile ref, generate outputs.
- Output controls: publish outputs, handoff profile ref, generate handoff.
- Handoff controls: transmit, acknowledgement profile ref, acknowledge, audit-pack profile ref, generate audit pack.
- ESS payslip workspace: register heading, search-filtered disposable run, download link, storage/source hash evidence, horizontal overflow guard.

## Test Commands

```bash
PLAYWRIGHT_PORT=3223 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`.

Targeted regressions:

```bash
PLAYWRIGHT_PORT=3223 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  web/tests/e2e/payroll-handoff-flows.spec.ts \
  web/tests/e2e/ess-payslip-flows.spec.ts \
  web/tests/e2e/phase5b-payroll-close-action-controls.spec.ts \
  --project=chromium --workers=1 --timeout=300000
```

Result: `6 passed`.

## Confidence

- Payroll post-publish confidence: 90%.
- Finance handoff browser confidence: 88%.
- ESS payslip employee visibility confidence: 90%.
- Provider audit-pack evidence confidence: 88%.
- Current Phase 5 confidence: 92%.

## Residual Risks

- Input immutability after lock still needs negative browser proof.
- Blocked calculation negative path still needs disposable proof.
- Artifact access isolation still needs cross-persona browser proof.
- Payroll register export authorization still needs a dedicated browser test.
