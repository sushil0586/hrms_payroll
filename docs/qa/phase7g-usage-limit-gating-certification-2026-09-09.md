# Phase 7G Usage-Limit Gating Certification

Date: 2026-09-09

Environment: local dev

## Scope

Phase 7G certifies that SaaS usage limits fail closed when a tenant exceeds a configured blocking meter, and that admins can see the reason in the control plane.

## Browser Coverage

- HR admin opens `/hr-admin/saas-control-plane`.
- A reversible tenant commercial profile fixture lowers the `active_memberships` limit below current usage.
- SaaS Control Plane shows launch gate `Blocked`.
- Usage limits panel shows `Limit exceeded`.
- `Active Memberships` meter shows `Exceeded`.
- Payroll enforcement scope shows `Blocked`.
- Enforcement row now shows the blocking reason `usage_limit_exceeded` and affected meter `active_memberships`.
- Payroll setup page fails closed with live API `403` instead of showing protected payroll setup data.
- Tenant Admin Console shows blocked seat posture.
- Active member invite attempts are rejected when projected active memberships exceed the configured limit.
- Touched pages pass horizontal overflow checks.

## API Evidence

- `/api/v1/hr-admin/saas-control-plane/` returns:
  - `summary.can_launch = false`
  - `exceeded_usage_limits` includes `active_memberships`
  - `payroll_core.allowed = false`
  - `payroll_core.blocking_reasons` includes `usage_limit_exceeded`
- Payroll setup and salary component APIs return `403` with `saas_commercial_access_denied`.
- Denial payload includes `usage_limit_exceeded` and `active_memberships`.
- Tenant admin active member invite returns `400` with active membership limit detail.
- The original commercial configuration is restored after the test.

## Product Improvement

- `/hr-admin/saas-control-plane` now displays enforcement blocking reasons and exceeded meter refs so admins can diagnose usage-limit blocks without inspecting API payloads.

## Suite

- `web/tests/e2e/phase7g-usage-limit-gating.spec.ts`

Result:

- `1 passed`

## Residual Risks

- Payroll run monthly limit and provider connection limit should get dedicated meter-specific slices.
- Audit CSV content parsing remains pending.
- Entitlement-aware disabled navigation states are still pending; current payroll setup behavior is fail-closed page load denial.
