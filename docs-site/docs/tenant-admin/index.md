# Tenant Admin

Tenant Admin is the customer account control center. It is used to manage tenant users, roles, plan limits, setup readiness, governed settings, support access, security posture, and audit evidence.

![Tenant Admin dashboard](../assets/screenshots/tenant-admin/dashboard.png)

## On This Page

- [Who uses Tenant Admin](#who-uses-tenant-admin)
- [Menu structure](#menu-structure)
- [Single responsibility map](#single-responsibility-map)
- [Recommended operating order](#recommended-operating-order)
- [Common examples](#common-examples)
- [Launch signoff checklist](#launch-signoff-checklist)

## Who Uses Tenant Admin

| User type | Typical responsibility |
| --- | --- |
| Customer account owner | Owns account access, plan, support approval, and audit evidence. |
| Tenant admin | Maintains users, roles, settings, and security readiness. |
| Implementation lead | Uses setup guide and support access during rollout. |
| Security or compliance reviewer | Reviews support grants, trust audit, and security posture. |

Tenant Admin should not be treated as a daily employee operations workspace. Daily HR, payroll, ESS, and MSS work belongs in their own workspaces.

## Menu Structure

| Parent area | Page | Primary responsibility |
| --- | --- | --- |
| Start Here | Dashboard | Account posture, action queue, and route map. |
| Start Here | Setup Guide | Launch checklist and account setup readiness. |
| Start Here | Task Recipes | Step-by-step admin recipes for common jobs. |
| Access Management | Users | Invite, activate, suspend, and role-map users. |
| Access Management | Roles | Review role design, permissions, risk, and seat ownership. |
| Access Management | Support Access | Request, approve, start, end, revoke, and audit support access. |
| Account and Security | Plan and Billing | Review subscription, limits, usage, and commercial changes. |
| Account and Security | Settings | Review governed tenant settings and request profile changes. |
| Account and Security | Security Readiness | Review enterprise readiness across MFA, SSO, SCIM, sessions, audit, and data protection. |
| Account and Security | Trust Audit | Search, review, and export tenant evidence. |

## Single Responsibility Map

| Job | Use this page | Do not use |
| --- | --- | --- |
| Add a new admin user | Users | Roles, unless the role itself must be created first. |
| Change what a user can do | Users | Settings. |
| Change what a role contains | Roles | Users. |
| Request support help | Support Access | Trust Audit, which is evidence-only. |
| Prove what happened | Trust Audit | Support Access, which controls access. |
| Check tenant setup health | Setup Guide | Dashboard alone. |
| Change plan or limits | Plan and Billing | Settings. |
| Review account profile values | Settings | Plan and Billing. |
| Resolve SSO or security blocker | Security Readiness | Roles. |

## Recommended Operating Order

1. Open **Dashboard** and check account posture.
2. Open **Setup Guide** and confirm launch prerequisites.
3. Open **Roles** and understand available roles before inviting users.
4. Open **Users** and create or update user access.
5. Open **Security Readiness** and resolve blocked controls.
6. Open **Support Access** only when assisted operations are needed.
7. Open **Trust Audit** to confirm evidence after sensitive changes.
8. Open **Plan and Billing** when limits or commercial settings block work.

## Common Examples

### Example: A new HR admin needs access

1. Open **Roles** and confirm the HR admin role has the correct permissions.
2. Open **Users**.
3. Search the email to avoid duplicates.
4. Invite or update the user.
5. Assign the HR admin role.
6. Ask the user to sign in.
7. If they land on Workspace Access, verify active membership and role assignment.

### Example: Support needs to investigate a payroll setup issue

1. Open **Support Access**.
2. Create a scoped support grant for payroll setup only.
3. Add the business reason and time limit.
4. Approve and start the grant only after reviewing scope.
5. End or revoke access when the issue is complete.
6. Open **Trust Audit** and review support activity.

### Example: A launch review is blocked by security

1. Open **Security Readiness**.
2. Review the blocked domain, such as MFA, SSO, sessions, or audit.
3. Follow the linked action.
4. Record or verify evidence.
5. Return to Dashboard and confirm readiness has changed.

## Negative Cases To Know

| Issue | Likely reason | Fix |
| --- | --- | --- |
| Logged-in user sees Workspace Access | User is authenticated but has no active route. | Check Users, role assignment, and employee profile mapping. |
| Add user action is disabled | Plan, permission, or state restriction. | Check Plan limits and current user's tenant-admin permission. |
| System role cannot be edited | System roles are protected. | Create a custom role only if the standard role does not fit. |
| Support approval is unavailable | Grant is not in the right state or user lacks approval permission. | Review grant status and current role. |
| Audit export hidden | User lacks export permission. | Ask an authorized tenant admin to export evidence. |

## Launch Signoff Checklist

- At least two trusted tenant admins exist.
- No active support grant remains open without a reason.
- Users have only the roles they need.
- High-risk role permissions have a business owner.
- Plan limits do not block expected usage.
- Setup Guide does not show launch-critical blockers.
- Security Readiness blockers are resolved or formally accepted.
- Trust Audit shows evidence for recent user, role, support, and setting changes.

## Related Guides

- [Tenant Dashboard](dashboard.md)
- [Tenant Users](users.md)
- [Roles](roles.md)
- [Support Access](support-access.md)
- [Trust Audit](trust-audit.md)
