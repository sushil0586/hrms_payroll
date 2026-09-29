# Tenant Roles

Tenant Roles defines the account access model for tenant-admin, HR, payroll, support, audit, and other account roles.

## Purpose

Use Roles to review system roles, create custom roles, inspect permissions, and understand permission risk.

![Tenant access model](../assets/screenshots/tenant-admin/roles.png)

## Use this page when

- A user needs a role that does not match the standard roles.
- You need to understand what a role can do.
- A role should be deactivated.
- You need to review high-risk or critical permissions.
- You want to confirm how many users hold each role.

## Page sections

| Section | Meaning |
| --- | --- |
| Role summary | Total roles, custom roles, assigned roles, inactive roles. |
| Access model | Role cards with assignment count and permission coverage. |
| Permission matrix | Permission groups and risk labels. |
| Role actions | Edit, activate, deactivate, or create roles when permitted. |

## Role types

| Type | Meaning |
| --- | --- |
| System role | Product-owned role. Usually protected from deletion or deactivation. |
| Custom role | Tenant-owned role created for a specific access need. |
| Active role | Can be assigned to users. |
| Inactive role | Hidden from new assignment but retained for history. |

## Risk labels

| Risk | Meaning |
| --- | --- |
| Low | Read-only or low-impact visibility. |
| Medium | Can view sensitive operational areas. |
| High | Can change important account, user, HR, or payroll data. |
| Critical | Can control access, support access, security, or highly sensitive data. |

## Workflow: create a custom role

1. Open **Roles**.
2. Review existing system roles first.
3. Click **Add role** when available.
4. Name the role clearly.
5. Select only required permissions.
6. Review risk badges.
7. Save the role.
8. Assign it from the **Users** page.

## When not to create a custom role

Do not create a custom role when:

- A system role already matches the responsibility.
- The access need is temporary and can be handled through support or a time-bound process.
- The role name would be vague, such as "Admin 2" or "Special Access".
- The role combines unrelated responsibilities, such as payroll close and security administration.

## Access review checklist

- Role name clearly describes the job responsibility.
- Description explains when the role should be used.
- High and critical permissions are necessary.
- Role has an owner who can approve future changes.
- Assignment count is expected.
- Inactive or unused custom roles are reviewed.

## Good practice

- Use system roles when possible.
- Keep custom roles narrow and easy to explain.
- Review high-risk and critical permissions before assigning the role.
- Deactivate unused custom roles instead of deleting evidence.

## FAQ

### Where do I assign a role after creating it?

Assign roles from **Tenant Admin > Users**. The Roles page defines the access model; the Users page applies it.

### Can system roles be edited?

System roles are product-owned and may be protected. Create a narrow custom role only when a standard role does not fit.
