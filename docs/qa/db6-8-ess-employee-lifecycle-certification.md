# DB-6.8 ESS Employee Lifecycle Certification

Date: 2026-10-17  
Environment: isolated PostgreSQL 16 (`hrms_db68`), Django `127.0.0.1:8018`, production-built Next.js `127.0.0.1:3118`  
Decision: **CONDITIONAL**

## Frozen Scope Result

| Status | Count |
|---|---:|
| Passed | 6 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| Not Run | 0 |

All six frozen DB-6.8 scenarios have executed evidence. The workflow remains conditional because the pre-existing DB-6.4 post-expiry cancellation policy decision is still unresolved and a neighboring notification Clear-filters browser transition was not stable enough to certify.

## Scenario Evidence

| ID | Result | Browser / API / PostgreSQL result |
|---|---|---|
| DB6-08-001 | Passed | ESS created request `b5bd41f7-a2c1-4248-a8be-27334cee6d0e`; MSS approved it; PostgreSQL recorded reservation, release, and consumption movements. Closing balance reconciled from 24.00 to 23.00. |
| DB6-08-002 | Passed | ESS regularization `f734c9e4-3818-433b-aef3-e509b87bd21f` was approved; only attendance row `59efd8ad-ccc2-4804-917c-a757b4ac767e` changed to `remote`. |
| DB6-08-003 | Passed | Employee-scoped document and payslip list/download tests passed. Another employee/manager received 404 for the protected attachment; unpublished payslips remained hidden. Browser manager APIs failed closed for the employee persona. |
| DB6-08-004 | Passed | A duplicate attendance request returned 400. Repeated exact and overlapping leave requests created one request only; service and API guards both passed. |
| DB6-08-005 | Passed | Fresh 2025 and 2026 payroll runs generated and published one immutable payslip each. `year=2025` and `year=2026` returned exactly one matching item. Executed DB-6.4 evidence supplies the leave-period side of the multi-year assertion. |
| DB6-08-006 | Passed | Fault-injected 503/409 responses preserved dialog input and restored controls. Retry succeeded; the successful manager decision stayed visible and its buttons locked against duplicate mutation. |

## Root Causes And Repairs

1. The reusable disposable workspace created a legacy leave balance with no policy period. DB-3 correctly refused governed ledger behavior for that row. The fixture now creates an open `LeavePolicyPeriod`, a governed balance, and an append-only opening movement.
2. The workspace created a document category without a requirement or document. It now creates a scoped requirement and one reviewable historical document.
3. The live workflow suite assumed Northstar employee codes and the exact label `Casual Leave`. It now accepts deterministic employee/manager codes and a configured leave label, with a unique enabled-option fallback.
4. The document dialog locator recognized only demo titles. Its accessible-name pattern now includes the deterministic QA title.
5. The manager Retry test expected the review dialog to close. Current UX intentionally retains confirmed success and locks actions; the test now verifies that state and duplicate-action prevention.
6. The payroll calculation fixture was parameterized by year and a two-year filter regression was added. Existing 2026 defaults remain unchanged.

No payroll, leave, attendance, authorization, or statutory business rule was changed.

## Regression Results

- Live ESS/MSS leave and attendance: 5 passed after governed fixture rebuild.
- ESS failure/Retry/navigation/RBAC: 3 passed.
- ESS documents: 3 passed.
- ESS neighboring navigation/statutory/payslip/security: 6 passed, 1 failed outside the frozen DB-6.8 IDs.
- Backend ESS integrity selection: 15 passed.
- Multi-year payslip isolation: 1 passed.
- Artifact ownership: 2 passed.
- Duplicate leave API selection: 2 passed.
- Leave overlap service guard: 1 passed after correcting the test class invocation.
- TypeScript: passed.
- Focused ESLint: passed.
- Django checks: passed.
- Migration drift: none.
- Production frontend build: passed with the existing `globals.css` autoprefixer `end` warning.
- Fixture cleanup: ordinary row deletion was rejected by protected leave-ledger foreign keys, as designed. The dedicated DB-6.8 PostgreSQL container and its volume were then removed; database, backend, and frontend ports all verified closed.

## Retained Findings

- **Existing policy blocker:** post-expiry cancellation remains governed by the unresolved DB-6.4 policy decision. No behavior was invented in DB-6.8.
- **Neighboring P1 UI reliability:** `ess-control-center-certification` notification filtering reached the correct filtered and unfiltered backend responses, but the Clear-filters client transition retained the prior query URL during the assertion window. Logs `025` and trace-bearing `026` are retained. This is not counted as a frozen DB-6.8 failure, but it must be resolved or independently dispositioned before final integrated certification.
- Employee deactivation/access-history behavior was supported by the existing backend access-state regression selected in log `012`; no destructive browser deactivation was performed in this disposable ESS batch.

## Evidence

Evidence root: `docs/qa/evidence/db6-2026-10-17/db6-8/`

Key files:

- `004` and `005`: original fixture failures retained.
- `019-browser-governed-fixture-rerun.log`
- `020-postgresql-governed-reconciliation.json`
- `012-backend-ess-integrity.log`
- `013-backend-multiyear-payslip.log`
- `014-backend-artifact-ownership.log`
- `021-backend-duplicate-leave.log`
- `023-service-overlap-guard-rerun.log`
- `024-browser-retry-navigation-rbac.log`
- `025-browser-ess-neighboring-regression.log`
- `026-browser-notification-rerun.log` and its Playwright trace
- `027` through `031`: static, Django, migration, and production-build checks
- `032` through `035`: protected-delete evidence and complete isolated-container teardown verification

## Commands

```bash
python manage.py manage_playwright_workspace --seed-ref db68 --password '***'
pnpm exec playwright test tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts --project=chromium --workers=1 --grep '<selected DB-6.8 workflows>'
pnpm exec playwright test tests/e2e/ess-documents-launch-certification.spec.ts tests/e2e/ess-mss-workflow-certification.spec.ts --project=chromium --workers=1
pnpm exec playwright test tests/e2e/ess-control-center-certification.spec.ts tests/e2e/ess-statutory-declarations-flows.spec.ts tests/e2e/ess-payslips-launch-certification.spec.ts --project=chromium --workers=1 --grep '<selected neighboring ESS cases>'
pytest -q tests/test_phase0_api_smoke.py -k '<ESS integrity selection>'
pytest -q tests/test_phase0_api_smoke.py -k 'employee_payroll_payslip_year_filters_do_not_mix_history'
python manage.py test apps.leave_management.tests.LeaveRequestWorkflowPolicyRuntimeTests.test_active_leave_request_blocks_exact_day_and_range_overlap
pnpm typecheck
pnpm exec eslint tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts tests/e2e/ess-documents-launch-certification.spec.ts tests/e2e/ess-mss-workflow-certification.spec.ts
python manage.py check
python manage.py makemigrations --check --dry-run
pnpm build
```

## Decision

DB-6.8 frozen scope: **PASS (6/6)**.  
DB-6.8 workflow certification: **CONDITIONAL**, due only to the inherited post-expiry cancellation policy gate and the separately retained notification navigation race. Production readiness is not claimed. Stop before DB-6.9.
