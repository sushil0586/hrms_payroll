# Phase 5A Payroll Control Room Certification

Date: 2026-09-09

Environment:

- Frontend: `http://127.0.0.1:3218`
- Backend: `http://127.0.0.1:8011/api/v1`
- HR admin persona: `nisha.rao`

## Scope

Phase 5A establishes a deep browser-certified baseline for the payroll close control-room pages before mutation-heavy payroll run closure testing.

Touched and certified pages:

- `/hr-admin/payroll-readiness`
- `/hr-admin/payroll-readiness?employeeId=[employeeId]`
- `/hr-admin/payroll-readiness?q=NO_SUCH_PAYROLL_EMPLOYEE`
- `/hr-admin/payroll-calculations`
- `/hr-admin/payroll-calculations?runId=[runId]&calculationId=[calculationId]&lineId=[lineId]`
- `/hr-admin/payroll-review`
- `/hr-admin/payroll-review?reviewId=[reviewId]&exceptionId=[exceptionId]`
- `/hr-admin/payroll-outputs`
- `/hr-admin/payroll-outputs?batchId=[batchId]&artifactId=[artifactId]`
- `/hr-admin/payroll-handoff`

## Browser Evidence

Suite:

- `web/tests/e2e/phase5a-payroll-control-room-certification.spec.ts`

Command:

```bash
PLAYWRIGHT_PORT=3218 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3218 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test web/tests/e2e/phase5a-payroll-control-room-certification.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result:

- `5 passed`

Validation:

- `pnpm --dir web lint` passed.
- `pnpm --dir web typecheck` passed.
- `python backend/manage.py check` passed.

## Certified Behaviors

Payroll readiness:

- Header actions link to setup, inputs, admin, and reports.
- Metrics render employees in scope, ready, warnings, blocked, and pending approvals.
- Search, period start, period end, and apply controls are visible and functional.
- Status tabs render all, ready, warning, and blocked counts.
- Readiness table renders employee, status, entity, cost center, attendance, pending, and bank columns.
- Employee row selection updates URL with `employeeId`.
- Empty search state shows `No rows found.`

Payroll calculations:

- Header actions link to inputs, rules, adjustments, settlements, review, payroll setup, and salary setup.
- Metrics render calculable runs, calculations, lines, validation, and latest net pay.
- Calculation queue, validation register, attempt table, and calculation line table render.
- Attempt table headers include attempt, status, profile, lines, net pay, and calculated.
- Line table headers include employee, component, type, amount, source, and hash.
- Line trace deep link updates URL with `lineId` and exposes trace/source information.

Payroll review:

- Header actions link to calculations, inputs, rules, payroll setup, and outputs.
- Metrics render reviews, open reviews, open blockers, and latest net pay.
- Review queue, final lock strip, open trace link, exception register, approval trail, and approved calculation lines render.
- Exception detail deep link updates URL with `exceptionId`.

Payroll outputs:

- Header actions link to review, handoff, calculations, rules, and payroll setup.
- Metrics render output batches, artifacts, payslips, and latest net pay.
- Publish state, generated, published, output profile, artifact register, and finance handoff readiness render.
- Artifact register headers include artifact, kind, employee, net pay, and status.
- Artifact detail deep link updates URL with `artifactId`.

Payroll handoff:

- Header actions link to outputs, review, calculations, and providers.
- Metrics render handoffs, finance artifacts, filing files, callbacks, retries, provider jobs, audit packs, reconciled, and latest net pay.
- Transmission state, bank advice, accounting net, statutory total, artifacts, filing files, generated, transmitted, accepted, reconciled, audit pack, and generate pack control render.
- Provider/finance/delivery evidence is visible.

## Residual Gaps

- Phase 5B must create or select a disposable payroll period/run and certify safe mutation controls.
- Draft calculation POST controls were intentionally not clicked in Phase 5A.
- Review approval and final lock POST controls were intentionally not clicked in Phase 5A.
- Output generation/publish and handoff generation/transmission controls were intentionally not clicked in Phase 5A.
- Phase 5 still needs negative-control proof for blocked calculation, immutable inputs after lock, and unauthorized artifact access.

## Confidence Update

- Payroll control-room UI confidence: `88%`
- Payroll trace/navigation confidence: `86%`
- Payroll mutation readiness confidence: `70%`
- Current Phase 5 confidence after Phase 5A: `74%`
