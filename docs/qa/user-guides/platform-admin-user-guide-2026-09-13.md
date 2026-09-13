# Platform Admin User Guide

Date: 2026-09-13

## Purpose

The Platform Admin manages the SaaS layer of the HRMS Payroll product. This role is responsible for tenant onboarding, tenant health, plan and usage readiness, platform-level guardrails, support access governance, and launch readiness across customers.

The Platform Admin should not perform normal HR or payroll work for a tenant unless explicitly acting under an approved support session.

## Main Workspace

- Primary route: `/platform-admin`
- Related support view: `/support` when operating under an approved support process
- Main outcome: a tenant is correctly onboarded, configured, activated, monitored, and supportable

## What The Platform Admin Can Do

- Create or review tenant onboarding records.
- Confirm tenant identity, tenant slug, domain, status, region, and subscription readiness.
- Register the first tenant admin or verify that a tenant admin has been provisioned.
- Review tenant activation gates before pilot or production use.
- Inspect platform-level tenant health and readiness signals.
- Review support access posture and tenant-level trust controls.
- Check SaaS usage and plan gate status.
- Coordinate release readiness and pilot acceptance evidence.

## What The Platform Admin Should Not Do

- Do not create employee records for a tenant as a normal operating step.
- Do not edit salary, attendance, declarations, payroll inputs, or statutory data unless there is an approved support process.
- Do not bypass tenant admin ownership by directly changing tenant business configuration.
- Do not download payroll exports unless it is required for a documented support incident.

## First Login Checklist

1. Open the platform admin workspace.
2. Confirm the page loads without fallback or demo-data warning.
3. Confirm the active role shown in the UI is Platform Admin.
4. Confirm the tenant list or tenant summary cards are visible.
5. Confirm no unexpected console-level application error appears.
6. Confirm navigation items are grouped and usable without excessive scrolling.

## Tenant Onboarding Workflow

1. Open the tenant onboarding area.
2. Start a new tenant record.
3. Enter tenant name, slug, primary domain, region, billing/plan tier, and contact details.
4. Add the first tenant admin user or confirm the invitation path.
5. Select the activation status appropriate for the tenant:
   - Draft: tenant details are still incomplete.
   - Provisioning: tenant is being configured.
   - Pilot: tenant is ready for controlled testing.
   - Active: tenant is allowed for live business use.
6. Save the tenant.
7. Reopen the saved tenant and verify all fields persisted correctly.
8. Confirm the tenant appears in list/search/filter views.

## Five-Tenant Pilot Pattern

For onboarding multiple pilot tenants, repeat the same controlled pattern:

1. Create tenant.
2. Assign admin contact.
3. Confirm plan and usage limits.
4. Confirm domain/subdomain readiness.
5. Activate only after HR Admin and Tenant Admin paths are ready.
6. Record the result in the pilot tracker.

## Tenant Health Review

For each tenant, verify:

- Tenant status is correct.
- Admin user exists and can log in.
- Workspace data loads from live APIs.
- Demo data is not accidentally enabled.
- Tenant-level security readiness is visible.
- Support access is disabled by default or time-bound if enabled.
- Payroll readiness gates are clear.

## Support Access Governance

Use support access only when:

- A tenant admin has approved the support session.
- The scope is limited to the issue being investigated.
- The access window has a clear start and expiry.
- The support action is auditable.

Before support access is granted, confirm:

- Tenant name.
- Support reason.
- Data scope.
- Duration.
- Approving user.

After support access is used, confirm:

- The session is closed or expires automatically.
- Notes are recorded.
- Any product defect is logged separately.

## SaaS Readiness Checklist

Before a tenant is marked pilot-ready:

- Tenant profile is complete.
- Tenant admin can log in.
- HR Admin can access HR workspace.
- Organization masters can be maintained.
- Employee creation works through browser UI.
- Payroll setup and input snapshots are available.
- Reports and audit exports load.
- Support and trust controls are visible.
- No role can see another tenant's data.

## Common Issues

| Issue | What to check |
| --- | --- |
| Tenant workspace fails to load | API base URL, tenant status, authentication, backend availability |
| Tenant admin cannot log in | User invitation, role assignment, active tenant mapping |
| Tenant appears twice | Slug uniqueness and duplicate onboarding attempt |
| Support access unclear | Support grant status, expiry, scope, approver |
| Long platform page is hard to use | Use tabbed or categorized sections; record as UX observation |

## Completion Criteria

A Platform Admin task is complete only when:

- The tenant record is saved and visible.
- The assigned admin can access the correct workspace.
- Activation state matches the actual readiness.
- Support and trust posture is documented.
- Any issue is recorded in the pilot tracker.

