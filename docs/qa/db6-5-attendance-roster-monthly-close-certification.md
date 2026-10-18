# DB-6.5 Attendance, Roster, Regularization, and Monthly Close Certification

Date: 2026-10-17  
Decision: **CONDITIONAL**  
Production readiness: **NO-GO**

## Frozen scope

DB-6.5 contains six unique scenarios.

| Status | Count |
|---|---:|
| Passed | 4 |
| Failed | 0 |
| Blocked | 2 |
| Skipped | 0 |
| Not Run | 0 |

The 92-scenario register now contains 35 `Passed`, 7 `Blocked`, and 50 `Not Run` outcomes. Historical failed and interrupted browser logs remain preserved and are not counted as passes.

## Scenario results

| ID | Result | Executed evidence |
|---|---|---|
| DB6-05-001 | Passed | Browser import/edit persistence and shift/roster create/edit/conflict/preview; PostgreSQL derivation tests |
| DB6-05-002 | Passed | PostgreSQL night-shift contract and holiday, weekly-off, approved-leave precedence regressions |
| DB6-05-003 | Passed | ESS submit, MSS approve/reject, duplicate guard, terminal workflow race and audit persistence |
| DB6-05-004 | Blocked | `DBR-015`: no persisted attendance monthly-close scope or late-write guard exists |
| DB6-05-005 | Blocked | `DBR-015`: no authorized close/reopen transition or immutable close event ledger exists |
| DB6-05-006 | Passed | Browser same-tenant import plus API, ORM, and raw-SQL cross-tenant rejection |

## Browser, API, and persistence evidence

The production Next.js build ran against PostgreSQL 16 and a disposable Enterprise workspace.

- HR Admin imported an attendance row, edited the exact persisted record, and retained its employee/date identity.
- HR Admin created and edited an effective-dated shift assignment, observed overlap rejection, created a published roster template, and received a non-mutating rollout preview.
- ESS submitted real regularization requests. MSS approved one and rejected another through the review dialog. Duplicate pending submission was rejected.
- PostgreSQL retained one approved and one rejected terminal regularization, manager comments, workflow references, and matching immutable audit snapshots.
- Same-tenant attendance creation returned HTTP 201. A foreign-tenant employee ID returned HTTP 400 with `Invalid employee selection.` No unauthorized row was written in either tenant.
- A locked payroll input snapshot remained unchanged after later attendance activity. Payroll calculation and financial immutability regressions passed, but the absence of an attendance close prevents certification of a governed attendance-to-payroll cutoff.

Key persistence evidence is in `019-postgresql-persistence.json` and `027-api-tenant-isolation.log`.

## Derivation and concurrency

The focused PostgreSQL run covered regular and temporary override resolution, weekly rotation, holiday-before-weekly-off precedence, missing-punch absence, late/overtime/half-day derivation, locked-record rejection, duplicate pending regularization, approve-versus-reject serialization, and direct cross-tenant write guards. Result: **32 passed**.

Payroll integration and immutable-snapshot regression result: **22 passed**. No attendance/payroll formulas were changed.

## Confirmed defect and remediation

### Shift assignment save remained indefinitely pending

The edit PATCH returned HTTP 200 and persisted `temporary_override`, but the compact edit screen remained on a disabled `Saving shift assignment` state because its soft navigation did not complete. The form now performs a same-origin full navigation only after backend confirmation. Cancel remains client-side navigation. The complete browser scenario passed after rebuilding production assets.

### Automation drift and fixture assumptions

- Employee option lookup now uses the existing authenticated backend helper.
- ESS/MSS fixtures accept deterministic employee and manager codes through environment variables while retaining Northstar defaults.
- The roster code assertion is scoped to the exact compact-list text.
- The disposable seed's open-ended assignment was explicitly bounded for this isolated scenario; no shared data was touched.

## Monthly-close blocker

`DBR-015` is confirmed, not an automation failure. The managed schema has per-row `AttendanceRecord.is_locked`, but no `AttendancePeriodClose`, entity/pay-group close scope, close/reopen API, permissioned UI, immutable close event ledger, or concurrent close-versus-posting guard. Therefore:

1. DB6-05-004 cannot prove that late attendance mutation is rejected after monthly close.
2. DB6-05-005 cannot prove authorized reopen, attributed correction, or explicit payroll impact.
3. Existing payroll input snapshots protect locked payroll history, but they are not a substitute for attendance monthly-close governance.

No default close/reopen policy was invented. DB-6.5 cannot receive a full PASS until DBR-015 is implemented and browser/PostgreSQL certified.

## Verification summary

| Check | Result | Evidence |
|---|---:|---|
| Attendance/regularization/DB guards | 32 passed | `006-postgresql-attendance-regression.log` |
| Browser first attempt | 4 environment failures | `008-browser-first.log` |
| Browser fixture/selector rerun | 3 passed, 1 skipped fixture prerequisite | `010-browser-after-fixture-fix.log` |
| Roster defect reproduction | 1 failed after persisted PATCH | `015-browser-roster-green.log` |
| Roster final production rerun | 1 passed | `018-browser-roster-after-ui-fix.log` |
| Payroll integration/immutability | 22 passed | `020-payroll-integration-regression.log` |
| Cross-tenant API | 201 same tenant; 400 foreign tenant | `027-api-tenant-isolation.log` |
| Django and PostgreSQL migrations | clean; no drift or pending operations | `022-django-postgresql-checks.log` |
| TypeScript / targeted ESLint | passed | `023-typescript.log`, `024-eslint.log` |
| Production build | passed; existing Autoprefixer warning only | `017-production-build-final.log` |

## Modified files

- `web/src/app/hr-admin/employee-shift-assignments/employee-shift-assignment-form.tsx`
- `web/tests/e2e/hr-admin-time-leave-attendance-roster-p0-gap-certification.spec.ts`
- `web/tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts`
- DB-6 master matrix, execution register, and this report

## Principal commands

```bash
docker run --name hrms-db6-attendance-postgres ... postgres:16-alpine
docker run --name hrms-db6-attendance-redis ... redis:7-alpine
python manage.py migrate --noinput
python manage.py manage_playwright_workspace --seed-ref db6-attendance ...
pytest -q apps/attendance/tests.py [focused DB-1/DB-4/API nodes]
pnpm --dir web build
pnpm --dir web exec playwright test [attendance/roster and ESS/MSS nodes] --project=chromium --workers=1
pytest -q apps/payroll/tests.py tests/test_db1_write_integrity.py::test_approved_payroll_run_rejects_business_edits_but_allows_final_lock_transition
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
pnpm --dir web typecheck
pnpm --dir web exec eslint [modified source and tests]
```

## Decision

DB-6.5 is **CONDITIONAL**. Four supported frozen scenarios passed with real browser, API, PostgreSQL, concurrency, and audit evidence. Two scenarios are blocked by the confirmed `DBR-015` product capability gap. No failed or skipped DB-6.5 outcomes remain, but monthly attendance close/reopen governance is a release gate. DB-6.6 has not started.
