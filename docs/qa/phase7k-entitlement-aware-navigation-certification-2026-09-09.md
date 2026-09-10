# Phase 7K Entitlement-Aware Navigation Certification

Date: 2026-09-09

Environment: local dev

## Scope

Phase 7K certifies that HR admin navigation reflects SaaS entitlement blocking before the user opens a gated payroll area.

## Browser Coverage

- HR admin opens `/hr-admin/saas-control-plane`.
- The tenant is reversibly downgraded to the `starter` plan through the browser/API route.
- Sidebar `Payroll` item renders as disabled with `aria-disabled="true"`.
- Sidebar `Providers` item renders as disabled with `aria-disabled="true"`.
- Disabled navigation shows a human-readable plan reason:
  - `Plan missing payroll`
  - `Plan missing payroll, payroll_provider_integrations`
- Disabled navigation items are not rendered as clickable links.
- SaaS Control Plane still shows missing entitlement and blocked enforcement scope evidence.
- Direct URL access to `/hr-admin/payroll-setup` still fails closed with no raw denial payload leakage.
- The original tenant subscription state is restored after the test.

## Suite

- `web/tests/e2e/phase7c-feature-entitlement-gating.spec.ts`

Result:

- `1 passed`

## Product Change

- `/hr-admin` layout now derives sidebar disabled states from live SaaS commercial control.
- Shared workspace chrome supports accessible disabled navigation items.

## Residual Risks

- Deterministic second-tenant payroll artifact fixture generation remains pending.
