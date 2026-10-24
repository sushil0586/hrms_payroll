# Payroll Phase 4 — review, adjustments and settlements

Prepared: 24 October 2026. Status: complete on production build `LWrD60xgJT0BX5W88c-zd`.

## Scope

Phase 4 covers `/hr-admin/payroll-review`, `/hr-admin/payroll-adjustments` and `/hr-admin/payroll-settlements`. It preserves the existing payroll calculation, exception, maker-checker, adjustment, settlement and final-lock contracts while applying the shared Leave/Attendance task hierarchy.

## Implemented UI/UX contract

- Payroll Review now uses URL-backed Overview, Exceptions, Actions and Lines tasks.
- The review queue remains visible as scope; exception detail appears only in the Exceptions task.
- Review controls and approval history appear together in Actions.
- Calculation lines have a dedicated evidence task instead of extending every review state.
- Adjustments and Settlements retain their URL-backed Overview, Register, Detail and Actions tasks.
- Lifecycle controls enable only the next valid state transition: draft to submit, submitted to approve or reject, and approved to apply.
- Rejection requires an explicit reason before the control becomes available.
- Network failure retains entered values and reports an unconfirmed outcome.
- A successful HTTP response without an authoritative record identifier or state is treated as unconfirmed and never announced as completed.
- Product wording now describes operational actions rather than internal certification fixtures.

## Exit gate

The phase closes only after three-engine 320px parity, owned create/submit/approve/reject/apply workflows, review exception decisions, final-lock ordering, maker-checker denial, foreign-tenant denial, duplicate/concurrent transition handling, abort/5xx/malformed recovery, persisted reload state, backend integrity checks and exact disposable-data cleanup all pass on one source-matched production build.

## Certification result

- Responsive parity: 36 of 36 checks passed across Chromium, Firefox and WebKit. The matrix covers all 12 URL-backed tasks at 320 × 640, one page heading, active-tab semantics and document-width containment.
- Browser lifecycle: 2 of 2 established disposable workflows passed. Adjustment and settlement records progressed through maker submission, checker approval, application and persisted setup reload. The settlement path also proved exit linkage, two generated lines, same-maker approval denial and authoritative net totals.
- Rejection and recovery: 2 of 2 owned checks passed. Both domains require a nonblank rejection reason and persist `rejected`; adjustment values survived abort, HTTP 503 and malformed HTTP 200 outcomes, while settlement values survived abort without false success.
- Backend integrity: 9 of 9 focused checks passed. Coverage includes adjustment create/approve/apply, permission denial, settlement calculation integration, review approval/final lock, restricted reviewer denial, blocker exception decisions, review register output and concurrent approve/reject serialization.
- Static and build gates: focused ESLint, TypeScript, whitespace validation and the production build passed. The build retains the pre-existing `flex-end` Autoprefixer advisory and payroll-readiness navigation lint warning.
- Cleanup: each owned browser workspace executed verified cleanup; no Phase 4 disposable tenant remains.

Evidence is stored in [`docs/qa/evidence/payroll-makeover-phase4-2026-10-24`](../qa/evidence/payroll-makeover-phase4-2026-10-24/README.md).
