# DD-5 statutory, arrears and payment execution evidence

Date: 2026-10-18  
Environment: isolated PostgreSQL 16 database `hrms_dd5`, production-built Next.js application, local Django API, synthetic data only.

## Frozen scope

The existing matrix contains eight payroll IDs, `DD-PY-001` through `DD-PY-008`, assigned to DD-5. DD-3 remains the frozen leave suite and was not modified.

## Defect reproduction

Before remediation, two PostgreSQL threads loaded one submitted adjustment and simultaneously called approve and reject. Both returned success:

```text
results=['approve:succeeded', 'reject:succeeded']
final_status='approved'
```

The last writer silently won. Adjustment endpoints also lacked explicit `payroll.review`/`payroll.approve` checks.

## Backend and PostgreSQL

The focused statutory, adjustment, settlement, provider and finance command executed 13 tests:

```bash
pytest -q --reuse-db --ds=config.settings.base \
  tests/test_dd5_payroll_adjustment_integrity.py \
  tests/test_db6_payroll_configuration_integrity.py::test_statutory_pack_selection_respects_march_april_earning_boundary \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_draft_calculation_consumes_configured_statutory_components \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_draft_calculation_annualizes_tds_with_verified_declaration_caps \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_adjustment_create_approve_and_apply \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_draft_calculation_consumes_applied_adjustments \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_adjustment_blocks_after_review_starts \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_settlement_lifecycle_applies_to_calculation \
  tests/test_phase0_api_smoke.py::test_payroll_provider_callback_endpoint_verifies_idempotent_delivery_updates \
  tests/test_phase0_api_smoke.py::test_payroll_provider_callback_endpoint_enforces_strict_security_policy \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_provider_delivery_retry_and_dead_letter_contract \
  tests/test_phase0_api_smoke.py::test_payroll_provider_retry_worker_processes_due_events \
  tests/test_phase0_api_smoke.py::test_hr_admin_payroll_finance_handoff_generate_and_transmit
```

Result: **13 passed**. A final race/RBAC/regression rerun produced **3 passed**.

Independent expected values proven from explicit synthetic configuration:

- PF: basic wage INR 30,000, INR 15,000 ceiling, 12% employee and employer = INR 1,800 each; net INR 28,200.
- TDS: annualized base INR 240,000, verified declaration INR 75,000 capped at INR 50,000, taxable INR 190,000, configured annual tax INR 4,000 over eight remaining periods = INR 500 per period.
- March earnings use the statutory pack effective through 31 March even when paid in April; April earnings select the new pack.

These are repository-configured synthetic oracles, not a claim that rates represent current law.

## Browser

- New disposable DD-PY-006 journey: create, submit, checker approve, apply, API persistence and source hash: **1 passed in 24.6 seconds**.
- Statutory setup browser CRUD: **passed**.
- Provider callback browser case: fixture-limited before mutation because the isolated demo had no finance handoff. It is not counted as passed. Trace retained under `web/test-results/e2e-phase6b-provider-callb-04cfd-and-exposes-ledger-evidence-chromium/`. Existing DB6-11 browser evidence and fresh callback API/PostgreSQL tests remain valid.
- Two earlier browser attempts failed before application workflow because Next was started without `HRMS_API_BASE_URL`. Both disposable tenants were removed and their traces retained.

## Checks

- TypeScript: passed.
- Targeted ESLint: passed.
- Django check: passed.
- Migration drift: no changes detected.
- Production Next.js build: passed; existing `globals.css` `end` compatibility warning remains unrelated.

## Capability limits

- PF and TDS have executable configured calculation paths. ESI, PT and LWF use the same generic component/slab mechanism, but no approved effective-dated statutory oracle set exists in the repository for certification.
- Adjustments are explicit authorized inputs; there is no automatic historical delta/reversal engine connecting a closed attendance/leave/salary period to a supplementary payroll and finance reversal.
- Provider callbacks reconcile output-artifact deliveries. There is no employee-level payment-attempt ledger for partial bank acceptance/rejection and reissue.
- FnF accepts configured settlement lines, but automatic gratuity, leave encashment, tax and recovery policies remain unapproved.
