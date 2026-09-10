# Platform Admin Browser Onboarding Proof - 2026-09-08

## Scope

Validated the SaaS Platform Admin onboarding path through the browser against staging at `https://hrms.accerio.in`.

The proof used the `platform.admin` staging persona and exercised:

- Platform Admin login and `/platform-admin` access.
- Policy-pack creation.
- Policy-pack publication.
- Five tenant creations.
- Onboarding metadata update for each tenant.
- Primary admin contact creation for each tenant.
- First-admin user and tenant membership provisioning for each tenant.
- Policy-pack adoption for each tenant.
- Baseline gate marking.
- Handoff gate marking.
- Tenant activation.
- Login verification for each provisioned first admin.

## Command

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/production-platform-admin-onboarding-flows.spec.ts --workers=1
```

## Result

```text
1 passed (2.1m)
```

## Created Staging Batch

Policy pack:

- `qa-pack-20260908115257`

Tenants and first admins:

| Tenant code | Tenant status | Onboarding status | Admin username | Role | Policy adoption |
| --- | --- | --- | --- | --- | --- |
| `qa-pa-20260908115257-01` | `active` | `active` | `qa.pa.20260908115257.01` | `hr-admin` | `qa-pack-20260908115257` / `adopted` |
| `qa-pa-20260908115257-02` | `active` | `active` | `qa.pa.20260908115257.02` | `hr-admin` | `qa-pack-20260908115257` / `adopted` |
| `qa-pa-20260908115257-03` | `active` | `active` | `qa.pa.20260908115257.03` | `tenant-admin` | `qa-pack-20260908115257` / `adopted` |
| `qa-pa-20260908115257-04` | `active` | `active` | `qa.pa.20260908115257.04` | `hr-admin` | `qa-pack-20260908115257` / `adopted` |
| `qa-pa-20260908115257-05` | `active` | `active` | `qa.pa.20260908115257.05` | `hr-admin` | `qa-pack-20260908115257` / `adopted` |

All provisioned first admins use the staging seed password `Password@123`.

## Product Issue Found And Fixed

The first browser proof found that a provisioned HR admin could authenticate and route to `/hr-admin`, but the HR Admin workspace failed because the provisioning flow created a tenant membership without an employee context.

Fix:

- `provision_tenant_admin_contact` now creates an active employee record for the first admin.
- The created employee code is stored on the tenant membership.
- The onboarding event payload records the created `employee_id` and `employee_code`.
- Backend coverage now asserts that the provisioned HR admin can load `/api/v1/hr-admin/dashboard/`.

## Known Remaining Gap

Policy-pack header creation, publication, and tenant adoption are browser-operated.

Policy-pack item authoring is still not available in the browser, so this proof validates governance state and onboarding evidence, not full runtime policy materialization from pack items.
