# Tenant Admin User Guide

Date: 2026-09-13

## Purpose

The Tenant Admin owns administration for one customer organization. This role manages tenant-level access, trust settings, security readiness, and support coordination. Tenant Admin is different from HR Admin: the Tenant Admin manages the customer account and governance layer, while HR Admin manages HR and payroll operations.

## Main Workspace

- Primary route: `/tenant-admin`
- Security readiness route: `/tenant-admin/security-readiness`
- Trust and audit route: `/tenant-admin/trust-audit`

## What The Tenant Admin Can Do

- Review tenant profile and account readiness.
- Manage or verify role access for tenant users.
- Confirm HR Admin, Payroll Finance, Manager, and Employee access posture.
- Review security readiness items.
- Review trust and audit evidence.
- Approve or revoke support access.
- Confirm tenant launch readiness before pilot or production use.

## What The Tenant Admin Should Not Do

- Do not process payroll unless also assigned Payroll Finance or HR Admin permissions.
- Do not edit employee salary or statutory declarations as a tenant governance action.
- Do not approve support access without a clear reason and time limit.
- Do not share exported audit evidence outside approved channels.

## First Login Checklist

1. Open the tenant admin workspace.
2. Confirm tenant name and environment.
3. Confirm your role is Tenant Admin.
4. Review visible readiness cards and alerts.
5. Open Security Readiness.
6. Open Trust Audit.
7. Confirm both pages load live data.

## User And Role Governance

When reviewing users:

1. Confirm every active user belongs to the correct tenant.
2. Confirm each user has only the roles they need.
3. Confirm payroll finance users are separate from general employee users.
4. Confirm support users do not have standing broad access.
5. Disable or escalate any unknown account.

## Support Access Approval Workflow

1. Receive a support request.
2. Confirm issue, tenant, affected page, and expected support action.
3. Open the support/trust area.
4. Grant access only for the minimum necessary duration.
5. Confirm the scope is limited.
6. Ask the support agent to record notes.
7. Revoke access after the incident or verify expiry.

## Security Readiness Review

Check these items before pilot:

- Tenant admins are known and active.
- HR and payroll roles are assigned correctly.
- Support access is controlled.
- Audit pages load.
- Sensitive exports have traceability.
- No cross-tenant data is visible.
- Login sessions behave as expected.

## Trust Audit Review

Use the trust audit area to answer:

- Who accessed the tenant?
- What role was used?
- What sensitive action was performed?
- Was support access approved?
- Are export and report actions traceable?

## Common Issues

| Issue | What to check |
| --- | --- |
| A user sees the wrong workspace | Role mapping and tenant membership |
| Support cannot investigate | Support access grant scope or expiry |
| Audit page looks empty | Confirm tenant has recent activity and live API data |
| A user can see too much | Role assignment and tenant boundary |

## Completion Criteria

A Tenant Admin review is complete when:

- Users and roles are verified.
- Support access policy is clear.
- Security readiness has no blocking item.
- Trust audit page loads.
- Pilot signoff notes are updated.

