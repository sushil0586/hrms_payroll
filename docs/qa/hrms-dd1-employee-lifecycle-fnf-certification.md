# HRMS/Payroll DD-1 Employee Lifecycle and FnF Certification

Date: 2026-10-17  
Decision: **CONDITIONAL**

## Scope and outcome

| Scenario | Outcome | Evidence |
|---|---|---|
| DD-EL-001 Hire and connected assignments | Passed | Reused DB-6.6/6.13 and frozen P0 evidence |
| DD-EL-002 Effective-dated movement and salary history | Passed | Reused DB-5, DB-6.6/6.7/6.13 evidence |
| DD-EL-003 Deactivation and historical preservation | Passed | Reused DB-6.6/6.8/6.14 evidence |
| DD-EL-004 Probation lifecycle | Passed | Fresh browser flow plus PostgreSQL confirmation-date regression |
| DD-EL-005 Exit lifecycle | Passed | Fresh browser create/edit/clearance/completion guard, backend access/status tests, linked exit ID in FnF |
| DD-EL-006 Full and final settlement | Partial | Linked maker/checker settlement and exact net reconciliation passed; automatic policy-derived lines and payment/finance continuity remain open |
| DD-EL-007 Cross-entity transfer | Blocked | Approved service/leave/tax/payroll continuity policy remains unresolved |
| DD-EL-008 Rehire | Blocked | Approved prior-service and benefit-continuity policy remains unresolved |

Unique DD-1 status: **5 Passed, 0 Failed, 2 Blocked, 0 Skipped, 0 Not Run, 1 Partial**.

## Confirmed defects fixed

1. Payroll settlement endpoints did not explicitly enforce review/approval permissions. They now require `payroll.review` for setup/create/line/submit/apply and `payroll.approve` for approve/reject.
2. A submitter could approve the same settlement. Service validation and PostgreSQL constraint now enforce maker/checker separation.
3. Settlement submit/approve/reject/apply transitions did not consistently lock the settlement row. All transitions now use atomic transactions and `SELECT FOR UPDATE` on the settlement row.
4. The browser settlement form ignored approved exit records already supplied by the setup API. It now scopes and persists the selected employee's exit record and last-working date.
5. Settlement creation refreshed navigation before line creation completed. Child lines now finish before the final refresh, preventing partial browser-created packages.
6. Disposable cleanup attempted to remove payroll snapshots before settlement children. Teardown now deletes settlement lines, settlements, and adjustments first.
7. The neighboring exit fixture used a separate Playwright request context and omitted a deterministic joining date. It now uses the authenticated browser session and an explicit joining date.

## Integrity behavior

- Duplicate settlement identity is rejected.
- Approval by the submitter is rejected with an actionable API response.
- A distinct authorized checker can approve.
- Terminal/applied settlement mutation is rejected by PostgreSQL, including queryset-update bypass.
- Existing ambiguous same-maker historical rows are never rewritten: migration `0041` stops and requires classification if any exist.
- Exit, employee, tenant, payroll run, and input snapshot relationships remain tenant scoped.
- Applied settlement lines reconcile into payroll without changing payroll formulas.

## Verification commands

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm --dir web exec playwright test \
  tests/e2e/dd1-employee-lifecycle-fnf.spec.ts --workers=1 --trace=retain-on-failure

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm --dir web exec playwright test \
  tests/e2e/employee-probation-audit-role-certification-flows.spec.ts \
  tests/e2e/employee-review-movement-exit-certification-flows.spec.ts \
  --workers=1 --trace=retain-on-failure \
  --grep 'probation review create|exit create'

DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=55455 POSTGRES_DB=hrms_dd1 POSTGRES_USER=hrms \
POSTGRES_PASSWORD=dd1-test ../.venv/bin/pytest -q --ds=config.settings.base \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_settlement_lifecycle_applies_to_calculation \
  tests/test_phase0_api_smoke.py::test_hr_admin_confirmed_probation_updates_employee_confirmation_dates \
  tests/test_phase0_api_smoke.py::test_hr_admin_cannot_complete_exit_while_employee_access_is_live \
  tests/test_phase0_api_smoke.py::test_hr_admin_completed_exit_updates_employee_status

pnpm --dir web typecheck
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
```

Detailed execution and rerun history: `docs/qa/evidence/dd1-2026-10-17/001-dd1-execution-evidence.md`.

## Modified DD-1 files

- `backend/apps/common/api_views.py`
- `backend/apps/common/management/commands/manage_playwright_workspace.py`
- `backend/apps/payroll/models.py`
- `backend/apps/payroll/services.py`
- `backend/apps/payroll/migrations/0041_payrollsettlement_maker_checker_distinct.py`
- `backend/tests/test_phase0_api_smoke.py`
- `web/src/app/hr-admin/payroll-settlements/payroll-settlement-actions-panel.tsx`
- `web/tests/helpers/isolated-qa-workspace.ts`
- `web/tests/e2e/dd1-employee-lifecycle-fnf.spec.ts`
- `web/tests/e2e/employee-review-movement-exit-certification-flows.spec.ts`
- `web/tests/e2e/pilot-100-adjustments-settlements-close-certification.spec.ts`
- DD matrix, gap register, report, and evidence files.

## Remaining decisions and gates

- Approve cross-legal-entity transfer continuity rules (`DD-EL-007`).
- Approve rehire prior-service and benefit-continuity rules (`DD-EL-008`).
- Define approved policy inputs for automatic FnF leave encashment, statutory deductions, gratuity, recoveries, and corrections.
- Implement and certify same-record FnF payment, final payslip, bank advice, and finance handoff before closing `DD-EL-006` and `DD-PY-008`.

DD-1 is conditionally complete. DD-2 was not started. This local certification does not establish production readiness.
