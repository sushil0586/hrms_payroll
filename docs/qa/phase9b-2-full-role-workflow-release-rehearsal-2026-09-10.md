# Phase 9B-2 Full Role and Workflow Release Rehearsal

Date: 2026-09-10

Environment: `https://hrms.accerio.in`

Tenant: `northstar-foods`

Deployed commit: `44eefe293b4a99d9acd6e8a42ac14980156e3ff9`

## Scope

Phase 9B-2 ran the full staging launch sign-off runner against the deployed staging application.

The runner covered:

- Django health and migration drift.
- HRMS SaaS launch audit management command.
- Payroll provider launch rehearsal management command.
- SaaS commercial usage snapshot command.
- Backend launch rehearsal pytest subset.
- Web typecheck and lint.
- Production Playwright suites A-I against staging.

## Command

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm qa:launch-signoff:staging
```

## Result

Decision:

- `PILOT READY - STAGING CONTRACT PASS`

Evidence pack:

- `web/qa-artifacts/production-launch-signoff-20260910T030809Z/launch-signoff-report.md`
- `web/qa-artifacts/production-launch-signoff-20260910T030809Z/launch-signoff-report.json`
- `web/qa-artifacts/production-launch-signoff-20260910T030809Z/logs`
- `web/qa-artifacts/production-launch-signoff-20260910T030809Z/management-outputs`

## Command Results

| Step | Result |
|---|---|
| Django check | Passed |
| Django migrations dry run | Passed |
| HRMS launch audit command | Passed |
| Payroll provider launch rehearsal command | Passed |
| SaaS commercial usage snapshot command | Passed |
| Backend launch rehearsal tests | Passed: `12 passed`, `312 deselected` |
| Web typecheck | Passed |
| Web lint | Passed |
| Playwright production suites A-I | Passed: `32 passed`, `3 skipped` |

## Browser Coverage

Production Playwright suites covered:

- Launch release gate cockpit.
- Commercial release gates.
- Provider launch rehearsal surfaces.
- Support diagnostic release view.
- Release evidence unauthenticated fail-closed behavior.
- Live/disposable mutation readiness guards.
- Notification queue, diagnostics, delivery controls, and ESS payroll notification source links.
- Payroll close proof from source readiness to employee payslip evidence.
- Payroll negative controls.
- Storage governance and artifact download/audit controls.
- Tenant and role isolation boundaries.
- Responsive launch gate across `6` viewport sizes.

## Skipped Items

The following provider callback tests skipped because the current staging tenant does not yet have the required callback ledger/queue/audit-pack drilldown evidence:

- Callback ledger signed, idempotent, replay-safe webhook evidence.
- Retry and queue recovery transient-failure controls.
- Delivery drilldown and provider audit pack locked evidence chain.

These are not automation failures, but they remain Phase 9 residuals until callback seed/rehearsal data exists on staging.

## Launch Audit Result

The staging contract passed, but the tenant launch audit is still business-config blocked:

- Status: `blocked`
- Can launch: `false`
- Gates passed: `39/51`
- Blockers: `6`
- Warnings: `6`
- Release actions: `12`

Current blocker refs:

- `attendance.policies`
- `workflows.active_templates`
- `documents.categories`
- `documents.mandatory_rules`
- `payroll.salary_components`
- `payroll.structure_versions`

Current warning refs:

- `employees.manager_mapping`
- `employees.primary_bank`
- `leave.pending_requests`
- `attendance.pending_regularizations`
- `notifications.failed`
- `provider.rehearsal_ready`

## Certification

Phase 9B-2 full staging role and workflow release rehearsal passed at the automation contract level.

Residual before launch-ready sign-off:

- Resolve tenant launch audit blockers through browser-configured master data and policy setup.
- Seed or generate provider callback ledger/queue/audit-pack evidence, then rerun provider callback drilldown tests.
- Continue `/hr-admin` dashboard selector optimization if targeting sub-`10000ms` page-ready performance.
