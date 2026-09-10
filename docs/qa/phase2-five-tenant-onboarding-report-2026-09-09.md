# Phase 2 Five-Tenant Onboarding Report

Date: 2026-09-09

Environment:

- Frontend: `http://localhost:3211`
- Backend: `http://127.0.0.1:8011/api/v1`
- Browser: Playwright Chromium
- Platform admin: `platform.admin`

## Scope

This phase proves the SaaS control-plane onboarding path through the browser. The platform admin creates a reusable policy baseline, onboards five disposable tenants, provisions the first tenant admin for each tenant, applies the baseline pack, advances activation gates, and proves tenant-admin login handoff.

Additional checks cover tenant admin commercial controls, trust audit visibility, stale-session behavior, workspace role boundaries, employee payslip scoping, unauthenticated privileged route denial, and support session controls.

## Browser Evidence

Command:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/production-platform-admin-onboarding-flows.spec.ts tests/e2e/tenant-admin-console-flows.spec.ts tests/e2e/tenant-trust-audit-flows.spec.ts tests/e2e/production-tenant-role-isolation.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `8 passed`.

Covered suites:

- `web/tests/e2e/production-platform-admin-onboarding-flows.spec.ts`
- `web/tests/e2e/tenant-admin-console-flows.spec.ts`
- `web/tests/e2e/tenant-trust-audit-flows.spec.ts`
- `web/tests/e2e/production-tenant-role-isolation.spec.ts`

## Granular Coverage

- Platform admin console loads without app errors or horizontal overflow.
- Policy pack is created from the browser.
- Policy pack is published from the browser.
- Five tenants are created with unique tenant code, legal name, domain, email, phone, plan, seed pack, timezone, country, and sandbox state.
- Onboarding metadata is saved for every tenant, including owner mode, setup style, data setup style, policy control style, country, industry, internal notes, and customer notes.
- Admin contact is added for every tenant.
- First admin is provisioned as `tenant-admin` for every tenant.
- Every provisioned tenant admin logs in through the browser.
- Every provisioned tenant admin lands on `Tenant Admin Console`.
- Every provisioned tenant admin sees the matching tenant name, proving handoff context.
- Published baseline pack is adopted for every tenant.
- Baseline, handoff, and activation gates are advanced through platform admin actions.
- Tenant admin console exposes account posture, seats, member mutation controls, change request controls, support access, usage evidence, and commercial audit.
- Tenant trust audit exposes customer-visible audit filters and evidence ledger.
- Stale HR admin session redirects to login without crashing the workspace.
- Public workspace chooser exposes role-scoped entry points.
- Employee payslip screen remains employee-scoped and does not expose HR/provider artifacts.
- Privileged mutation and support proxy routes fail closed without a session.
- Tenant admin and support workspaces expose scoped support controls.

## Fix Applied

The platform-admin onboarding test now provisions all five first admins as `tenant-admin` and verifies each admin reaches Tenant Admin Console with the matching tenant name. Previously the proof mixed `hr-admin` and `tenant-admin` handoff, which was weaker than the Phase 2 SaaS gate.

Changed file:

- `web/tests/e2e/production-platform-admin-onboarding-flows.spec.ts`

## Quality Checks

```bash
pnpm --dir web lint
pnpm --dir web typecheck
```

Results:

- Web lint: passed.
- Web typecheck: passed.

## Confidence Update

| Area | Confidence | Notes |
|---|---:|---|
| Platform admin onboarding | 88% | Five tenants, contacts, tenant admins, baseline adoption, and activation gates pass through browser. |
| Tenant admin handoff | 86% | Every new tenant admin logs in and sees its tenant context. |
| Tenant isolation and fail-closed behavior | 82% | Role boundaries, stale sessions, unauthenticated privileged routes, and employee payslip scoping pass. |
| SaaS readiness after Phase 2 | 85% | Control-plane onboarding is browser-proven locally; deeper cross-tenant data-pair attacks remain for Phase 7. |
| Overall product confidence | 85% | Phase 1 and Phase 2 are locally browser-proven. |

## Residual Gaps

- The current Phase 2 proof validates each tenant admin sees its own tenant context, but it does not yet attempt pairwise access to all other newly created tenant IDs through every tenant-admin API.
- High-parallel mutation sweeps should remain serial until per-test tenant factories or isolated database snapshots are available.
- Staging should receive the same Phase 2 run after deployment sync.

## Next Gate

Move to Phase 3: employee lifecycle depth-first testing using real configured masters, including employee creation, profile edit, role access, documents, onboarding, movement, exit, audit, ESS login, and manager visibility.
