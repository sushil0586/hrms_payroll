# Tenant Setup Guide

The Tenant Setup Guide tracks whether the account has the minimum configuration needed before live HR, payroll, ESS, MSS, and governance workflows are used.

![Tenant setup guide](../assets/screenshots/tenant-admin/setup-guide.png)

## On This Page

- [When to use this page](#when-to-use-this-page)
- [Setup areas](#setup-areas)
- [Screen labels to recognize](#screen-labels-to-recognize)
- [Controls and actions](#controls-and-actions)
- [Recommended setup order](#recommended-setup-order)
- [Example: prepare a new tenant for launch](#example-prepare-a-new-tenant-for-launch)
- [Validation and negative cases](#validation-and-negative-cases)
- [Signoff checklist](#signoff-checklist)

## When To Use This Page

- A tenant is newly created and needs first-time setup.
- Launch readiness is blocked by incomplete account setup.
- A tenant owner wants to know which setup areas are still pending.
- Implementation needs a safe handoff checklist.

## Setup Areas

| Area | Purpose | Typical owner |
| --- | --- | --- |
| Account foundation | Tenant identity, domain, timezone, and baseline profile. | Tenant admin or implementation lead. |
| Users and roles | Admin users and access model. | Tenant admin. |
| HR setup | Organization, employees, documents, policies, and workflows. | HR admin. |
| Payroll setup | Payroll calendar, pay groups, salary, rules, and statutory setup. | Payroll admin. |
| Security setup | MFA, SSO, sessions, support access, and audit controls. | Tenant admin or security owner. |
| Evidence | Audit-ready records for setup completion. | Tenant admin and implementation lead. |

## Screen Labels To Recognize

| Screen label | Meaning |
| --- | --- |
| Setup areas | Setup domains that must be completed before launch. |
| Start master setup | Entry point for the first guided setup activity. |
| Dependency guardrails | Checks that explain which prerequisite blocks the next setup step. |

## Controls And Actions

| Control | Meaning | Expected result |
| --- | --- | --- |
| Start master setup | Opens the guided setup entry point. | Tenant admin can start or resume first-run setup. |
| Back to console | Returns to Tenant Dashboard. | Tenant admin can re-check account posture. |
| Review profile | Opens the company profile setup area. | Missing tenant profile data can be completed in the correct page. |
| Setup status | Shows complete, warning, or blocked state. | Status improves after the underlying setup is done. |

## Recommended Setup Order

1. Confirm account profile in **Settings**.
2. Confirm plan limits in **Plan and Billing**.
3. Review **Roles** before inviting users.
4. Add tenant admins and HR owners in **Users**.
5. Complete HR Admin organization and employee setup.
6. Complete payroll setup if payroll is in scope.
7. Review **Security Readiness**.
8. Confirm **Trust Audit** has setup evidence.

## Example: Prepare A New Tenant For Launch

1. Open **Tenant Admin > Setup Guide**.
2. Review all setup areas.
3. Open blocked areas first.
4. If account profile is incomplete, go to **Settings**.
5. If users or roles are incomplete, go to **Users** or **Roles**.
6. If HR or payroll setup is incomplete, open the HR Admin workspace.
7. Return to Setup Guide and confirm statuses improved.
8. Use **Security Readiness** before production handoff.

## Validation And Negative Cases

| Case | Expected behavior | What to do |
| --- | --- | --- |
| Setup item links to HR Admin but user cannot open it | User lacks HR Admin role. | Assign correct role from Users. |
| Setup item remains blocked after update | Evidence may not be generated yet or another dependency is missing. | Open the linked detail page and review the exact blocker. |
| Plan limit blocks setup | Setup cannot complete until commercial limit is changed. | Use Plan and Billing change request. |
| Security blocker remains | Setup and security are separate. | Resolve Security Readiness item. |

## Signoff Checklist

- Account profile is complete.
- At least two tenant admins are active.
- HR owner has HR Admin access.
- Payroll owner has payroll access if payroll is in scope.
- No launch-critical setup area is blocked.
- Security Readiness is reviewed.
- Trust Audit contains setup and access evidence.

## Related Guides

- [Tenant Dashboard](dashboard.md)
- [Settings](settings.md)
- [Security Readiness](security.md)
