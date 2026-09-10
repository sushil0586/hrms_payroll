# Phase 7J Meter-Specific Usage Limits Certification

Date: 2026-09-09

Environment: local dev

## Scope

Phase 7J certifies SaaS usage-limit enforcement for meter-specific payroll controls:

- `payroll_runs_per_month`
- `provider_connections`

## Browser Coverage

- HR admin opens `/hr-admin/saas-control-plane`.
- The test reversibly lowers the current tenant's growth-plan meter limits below live usage.
- SaaS Control Plane shows blocked launch readiness.
- Usage exception tile shows exceeded meter count.
- Usage limit cards show:
  - `Payroll Runs Per Month`
  - `Provider Connections`
  - `payroll_runs_per_month`
  - `provider_connections`
  - `Exceeded`
- Enforcement scope panel shows:
  - `Payroll core`
  - `Payroll provider integrations`
  - `usage_limit_exceeded`
  - exceeded meter refs
- `/hr-admin/payroll-setup` fails closed through the browser when payroll-run usage is exceeded.
- `/hr-admin/payroll-providers` fails closed through the browser when provider-connection usage is exceeded.
- Touched browser pages pass horizontal overflow checks.

## API Evidence

- `GET /api/v1/hr-admin/saas-control-plane/` reports both meters as `exceeded`.
- `payroll_core` is blocked with:
  - `usage_limit_exceeded`
  - `payroll_runs_per_month`
- `payroll_provider_integrations` is blocked with:
  - `usage_limit_exceeded`
  - `provider_connections`
- `GET /api/v1/hr-admin/payroll-setup/` returns `403` with SaaS commercial denial evidence.
- `GET /api/v1/hr-admin/payroll-provider-connections/` returns `403` with SaaS commercial denial evidence.

## Data Safety

- The test backs up the tenant subscription plan and published commercial profile.
- If seed usage is absent, disposable payroll/provider fixture records are created only for this test.
- The original tenant plan/profile is restored in `finally`.
- Disposable fixture records are deleted during restore.

## Suite

- `web/tests/e2e/phase7j-meter-specific-usage-limits.spec.ts`

Result:

- `1 passed`

## Residual Risks

- Entitlement-aware disabled navigation states remain pending.
- Deterministic second-tenant payroll artifact fixture generation remains pending.
