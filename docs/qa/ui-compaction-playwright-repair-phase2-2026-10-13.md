# UI Compaction Playwright Repair Phase 2

Date: 2026-10-13

Scope: repair the Playwright failures identified in the UI compaction audit without changing application behavior or declaring production certification.

## Files Modified

- `web/tests/helpers/modal-stability.ts`
- `web/tests/helpers/assertions.ts`
- `web/tests/e2e/mss-frontend-validation.spec.ts`
- `web/tests/e2e/mss-control-center-certification.spec.ts`
- `web/tests/e2e/ess-mss-modal-certification.spec.ts`

## Root Causes Resolved

- MSS approval dialogs now use current accessible names: `Review leave approval` and `Review attendance approval`, with backward-compatible regex constants.
- ESS payslip and document modals now support content-scoped dialog lookup when the accessible name is dynamic.
- Obsolete `.metric-tile` assertions in repaired MSS coverage were replaced with accessible region/text-based compact metric checks.
- MSS dashboard assertions now allow the current permission-aware no-queue state instead of expecting unavailable approval links.
- Modal stability checks now ignore native file input internals and controls clipped inside scrollable modal bodies, avoiding false overlap reports while preserving visible overlap checks.

## Before / After

Primary frontend validation group:

- Before repair: `22 passed`, `1 skipped`, `2 failed`
- After repair: `24 passed`, `1 skipped`

ESS/MSS modal and MSS control-center group:

- Before repair: `1 passed`, `1 skipped`, `7 failed`
- After repair: `8 passed`, `1 skipped`

TypeScript:

- After repair: passed

## Commands Executed

```bash
pnpm --dir web exec playwright test tests/e2e/hr-admin-core-frontend-validation.spec.ts tests/e2e/ess-frontend-validation.spec.ts tests/e2e/mss-frontend-validation.spec.ts tests/e2e/tenant-admin-frontend-validation.spec.ts tests/e2e/platform-admin-frontend-validation.spec.ts --workers=1 --reporter=line
```

Result: `24 passed`, `1 skipped`.

```bash
pnpm --dir web exec playwright test tests/e2e/mss-control-center-certification.spec.ts tests/e2e/ess-mss-modal-certification.spec.ts --workers=1 --reporter=line
```

Result: `8 passed`, `1 skipped`.

```bash
pnpm --dir web exec playwright test tests/e2e/ess-mss-modal-certification.spec.ts -g "ESS modal" --workers=1 --reporter=line
```

Result: `1 passed`.

```bash
pnpm --dir web exec tsc --noEmit
```

Result: passed.

Neighboring side-effect sweep:

```bash
pnpm --dir web exec playwright test tests/e2e/ess-control-center-certification.spec.ts tests/e2e/ess-mss-workflow-certification.spec.ts tests/e2e/mss-frontend-validation.spec.ts --workers=1 --reporter=line
```

Result: `5 passed`, `6 failed`.

## Neighboring Failures Found

These were outside the nine audited failures and should be handled in a separate ESS workflow/control-center repair pass:

- `ess-control-center-certification.spec.ts`: statutory declaration page expects old action heading copy.
- `ess-control-center-certification.spec.ts`: document and notification checks still use obsolete `.metric-tile` selectors.
- `ess-mss-workflow-certification.spec.ts`: leave and attendance workflow tests expect old mocked service-error copy.
- `ess-mss-workflow-certification.spec.ts`: employee negative-control route did not reach the standard app shell in this side-effect run.

No genuine application defect was proven in the repaired failure set.
