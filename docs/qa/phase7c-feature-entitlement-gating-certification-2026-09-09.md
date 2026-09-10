# Phase 7C Feature Entitlement Gating Certification

Date: 2026-09-09

## Scope

Phase 7C proves that SaaS plan entitlements are enforced by the live backend and reflected safely in the browser when a tenant is downgraded to a plan without payroll entitlements.

## Browser Coverage

Suite:

- `web/tests/e2e/phase7c-feature-entitlement-gating.spec.ts`

Touched pages certified:

- `/hr-admin/saas-control-plane`
- `/hr-admin/payroll-setup`

Controls and elements certified:

- SaaS control plane heading and app shell.
- Plan selector through the commercial lifecycle API.
- Subscription status through the commercial lifecycle API.
- Billing provider, billing account, and period-end preservation during reversible plan mutation.
- Launch commercial gate blocked state.
- Required entitlement display.
- Enforcement scope display for payroll core and payroll provider integrations.
- Save state button enabled state.
- Payroll setup page fail-closed behavior when live API returns commercial access denial.

Backend/API gates certified through Playwright request context:

- `GET /api/v1/hr-admin/payroll-setup/` is denied under starter plan.
- `GET /api/v1/hr-admin/salary-components/` is denied under starter plan.
- `POST /api/v1/hr-admin/payroll-runs/` is denied under starter plan.
- `GET /api/v1/hr-admin/payroll-provider-connections/` is denied under starter plan.
- `POST /api/v1/hr-admin/payroll-provider-connections/<uuid>/run-certification/` is denied under starter plan.

Security assertions:

- Denial payloads include `saas_commercial_access_denied`.
- Denial payloads identify the blocked enforcement scope.
- Denial payloads include entitlement-missing context.
- Denial payloads do not leak provider credential refs or payroll debit account configuration.
- Browser fail-closed page does not silently switch to demo/placeholder data.

## Result

- Local Playwright Phase 7C run: passed.
- Tenant commercial state is restored to its original plan, subscription status, billing provider ref, billing account ref, and current period end in a `finally` block.

## Residuals

- Usage-limit exceeded gating still needs a dedicated browser scenario with controlled meter data.
- Feature navigation can still display payroll links for blocked plans; the protected pages fail closed and backend APIs deny access, but UX can be improved by adding entitlement-aware disabled navigation states.
- Support approved-session positive scope remains Phase 7D.
- Audit evidence for security-sensitive denials and mutations remains Phase 7E.
