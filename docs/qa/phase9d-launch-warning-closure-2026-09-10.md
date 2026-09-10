# Phase 9D Launch Warning Closure

Date: 2026-09-10

Environment: `https://hrms.accerio.in`

Tenant: `northstar-foods`

## Objective

Reduce launch-audit warning actions through browser workflows after Phase 9C removed all blockers.

## Browser Evidence

Command:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/phase9d-launch-warning-closure.spec.ts --project=chromium --workers=1
```

Result:

```text
1 passed (1.9m)
```

The browser flow covered:

- HR admin employee manager assignment from the employee directory and edit form.
- MSS pending leave approval resolution.
- MSS pending attendance regularization approval resolution.
- HR admin payroll provider launch rehearsal action.

## Launch Audit Evidence

Command:

```bash
backend/.venv/bin/python backend/manage.py rehearse_hrms_saas_launch --tenant-code northstar-foods --output-file /tmp/hrms-phase9d-launch-audit.json --allow-blocked
```

Result:

```text
HRMS SaaS launch audit for northstar-foods: warning (49/51 gates passed, 0 blocker(s), 2 warning(s), 2 action(s)).
```

Audit fields:

- `can_launch`: `true`
- `status`: `warning`
- `gate_count`: `51`
- `passed_gate_count`: `49`
- `blocker_count`: `0`
- `warning_count`: `2`
- Evidence checksum: `3397fe710bc00b937d50133fd606af2836dd301e036930a8868d1a0dd32ded5b`

## Closed Warnings

- `employees.manager_mapping`
- `leave.pending_requests`
- `attendance.pending_regularizations`

## Remaining Warnings

- `employees.primary_bank`: `0/5`
- `provider.rehearsal_ready`: latest provider rehearsal is recorded but still not ready

## Product Notes

Primary bank coverage is not currently closable from the HRMS SaaS browser UI. The employee bank model exists on the backend and in Django admin, but the HR admin employee workspace does not expose a bank-account create/edit surface.

Provider rehearsal can be run from the browser and was recorded successfully, but the rehearsal remains in a blocked/not-ready lane. This needs provider configuration or backend rehearsal fixture work before the audit can reach `51/51`.

## Decision

Phase 9D is complete for browser-closable warnings. Launch audit confidence increased from `46/51` to `49/51`. The product remains pilot-launch capable because `can_launch` is `true` and there are no blockers, but final launch confidence requires Phase 9E to add/enable browser bank-account maintenance and make provider rehearsal reach a ready state.
