# DB-6.13 Connected Tenant-to-Payroll Lifecycle Certification

Date: 2026-10-17  
Environment: disposable PostgreSQL 16 and Redis 7; Django; production-built Next.js; Celery worker and beat  
Decision: **PASS**

## Frozen Scope Result

DB-6.13 contains six frozen scenarios: **6 passed, 0 failed, 0 blocked, 0 skipped, 0 not run**.

The full 92-scenario register is now **82 passed, 5 blocked, 0 failed, 0 skipped, 5 not run**. The five existing blockers remain DB6-04-006, DB6-06-004, DB6-06-005, DB6-12-004, and DB6-14-003. The five unexecuted scenarios are DB6-14-001, DB6-14-002, DB6-14-004, DB6-14-005, and DB6-14-006.

| Scenario | Result | Primary evidence |
| --- | --- | --- |
| DB6-13-001 connected first payroll | Passed | `026`, `031`-`034`, `039`, `046`-`048` |
| DB6-13-002 effective movement/history | Passed | `025`, `035` |
| DB6-13-003 concurrent lifecycle writes | Passed | `025`, `033`, `047` |
| DB6-13-004 cross-tenant substitution | Passed | `025` plus frozen P3-0612 browser/API evidence |
| DB6-13-005 worker/connection recovery | Passed | `025`, `047`, `048` |
| DB6-13-006 finance failure rollback | Passed | `025`, `048` |

Evidence root: `docs/qa/evidence/db6-2026-10-17/db6-13/`.

## Same-Record Lifecycle

Platform Admin created tenant `5fd06505-7319-4b29-ae9e-acbef02bc568` (`pw-qa-db613-browser`) in the browser, selected Enterprise, and subsequently activated it through the supported tenant setup UI. The ownership-checked fixture command hydrated that existing browser-created sandbox instead of creating a replacement tenant.

The connected employee was `fcab79b6-f7ee-4caf-b88c-0817656ef036` (`QA-EMP-001`). On this same tenant and employee:

- ESS submitted leave `36336f9a-c809-4afa-9c7f-f48515b142d2`; MSS approved it. Its append-only ledger contains reservation, reservation release, and consumption movements and ends at `22.00` from `23.00`.
- ESS submitted attendance regularization `b5523d3c-9b30-4653-ada2-3dc2043117fc`; MSS approved the intended record.
- HR Admin reconciled, submitted, approved, closed, and governed-reopened attendance close `89841501-23bb-48cf-ae6a-a82649b39e80`; one employee/row reconciled to `1.00` payable and `0.00` LOP.
- Tenant Admin created fiscal calendar `db613-apr-mar`, year `DB613-FY2026-27`, and open accounting period `DB613-2026-12` through the browser.
- HR Admin created and final-locked payroll run `1b2539fb-7ba4-4151-b9b6-14b6835011d2`. Snapshot `fcf3f126-eaac-47eb-ab67-6bb0f43f3ed2` is locked for the same employee.
- Celery completed calculate, generate outputs, publish outputs, and generate finance handoff jobs once each. Browser refresh restored truthful succeeded state.
- Payslip `9d891923-2e2e-4fb5-a40b-a7c4669785e4` was published and downloaded through ESS; checksum is retained in `048-financial-reconciliation.json`.
- Finance handoff `79281776-95c8-4f8f-9232-2eac991b228b` resolved posting date `2026-12-31` and accounting period `3a9784e5-d0bb-4fa2-ab9f-c515ff436b88`.

Calculation, locked review, output batch, payslip, bank advice, and finance handoff independently reconcile to one employee, `50000.00` gross, `0.00` employee deductions, and `50000.00` net/bank total.

## Defects And Remediation

1. Browser-created disposable tenants could not be reused by the deterministic workspace helper. `manage_playwright_workspace --hydrate-existing` now accepts only an exact `pw-qa-<seed>` sandbox with matching Playwright owner email, rejects populated organization/employee graphs, and hydrates prerequisites atomically.
2. Pre-created seed-pack roles did not receive deterministic default permissions because the helper populated permissions only for newly created roles. It now uses idempotent `get_or_create` synchronization.
3. The fiscal API required `tenant.settings.manage`, but that permission did not exist in the catalog, making fiscal mutation unreachable for a standard Tenant Admin. The permission is now explicitly defined for Tenant Admin; API enforcement remains unchanged and employee denial remains intact.
4. Connected payroll dates were hardcoded to November 2026. The browser test now accepts period start/end/pay-date inputs while preserving its default contract, enabling an accounting-period-mapped December run.
5. Fiscal browser setup exposed pre-hydration controlled-input resets and ambiguous status locators. The DB-6.13 test waits for the React handler before filling and scopes success feedback without weakening persistence checks.

Historical failed attempts are retained in logs `010`, `012`-`015`, `028`, `038`, `040`, `043`-`045`, `049`, and `050`. None is counted as a pass.

## Integrity And Recovery

Fresh PostgreSQL transaction tests passed for approve/reject idempotency, concurrent leave reservations, close-versus-posting serialization, effective-dated movement/history, historical leave/attendance scope resolution, ORM/raw-SQL tenant guards, nested workflow/background-job scope, and concurrent payroll deletion/job creation. Worker failure tests proved partial payroll mutation rollback and controlled retry. Finance reconciliation failure was rejected before a handoff mutation.

The legacy P3-0612 browser test was rerun twice but its fixture setup used the known incompatible `page.request` authentication context and returned `401`; those runs were not counted. DB6-13-004 uses the frozen successful P3-0612 browser/API evidence plus fresh DB-4 PostgreSQL bypass tests. No security denial was inferred from the failed setup.

## Verification

- Connected production-built Playwright: platform provision/activation, fiscal configuration, ESS leave, MSS approval, ESS regularization, MSS approval, attendance close, employee movement/history, payroll calculation/approval/publication/finance, and ESS payslip all passed.
- Focused concurrency/security/recovery: **12 passed** (`025`).
- Fiscal/payroll backend regression: **35 passed** (`051`).
- TypeScript and focused ESLint: passed (`052`, `053`).
- Django system check and migration drift: passed/no changes (`054`).
- Production frontend build: passed with the pre-existing CSS `end` compatibility warning (`055`).
- Isolated PostgreSQL and Redis containers removed; remaining DB-6.13 containers: zero (`056`, `057`). Northstar, staging, production, and customer data were not accessed.

## Principal Commands

```bash
python backend/manage.py migrate --noinput
python backend/manage.py manage_playwright_workspace --seed-ref db613-browser --hydrate-existing --output-file .../027-browser-lifecycle-manifest.json
pnpm --dir web exec playwright test tests/e2e/db6-connected-tenant-onboarding.spec.ts --workers=1
pnpm --dir web exec playwright test tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts --workers=1
pnpm --dir web exec playwright test tests/e2e/db6-attendance-close.spec.ts --workers=1
pnpm --dir web exec playwright test tests/e2e/db6-payroll-processing.spec.ts --workers=1
pnpm --dir web exec playwright test tests/e2e/db6-employee-lifecycle.spec.ts --workers=1
pytest -q <12 focused integrity/concurrency/recovery tests>
pytest -q tests/test_db6_fiscal_calendar_api.py tests/test_db2_fiscal_integrity.py apps/payroll/tests.py
pnpm --dir web exec tsc --noEmit
pnpm --dir web exec eslint tests/e2e/db6-connected-tenant-onboarding.spec.ts tests/e2e/db6-payroll-processing.spec.ts tests/helpers/isolated-qa-workspace.ts
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
pnpm --dir web build
docker rm -f hrms-db613-postgres hrms-db613-redis
```

Exact environment variables, commands, failures, and reruns are retained in the numbered evidence logs.

## Policy Boundaries And Decision

DB-6.13 does not invent cross-entity transfer, rehire, post-expiry cancellation, protected-export, or irreversible-erasure policy. Existing safe blockers remain unchanged. The connected lifecycle is a **PASS** for all six frozen DB-6.13 scenarios. Stop before DB-6.14. Local evidence does not establish production readiness.
