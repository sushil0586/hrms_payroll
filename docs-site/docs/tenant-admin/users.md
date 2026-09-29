# Tenant Users

Tenant Users controls who can access the customer account and which tenant roles they hold.

## Purpose

Use Users to invite users, update role assignments, suspend or reactivate access, and check seat ownership.

![Tenant user management](../assets/screenshots/tenant-admin/users.png)

## Use this page when

- A new account admin, HR admin, payroll user, or support reviewer needs access.
- A user has the wrong role.
- A user should be suspended or reactivated.
- A login succeeds but the user lands on Workspace Access.
- You need to review role coverage and active seats.

## Page sections

| Section | Meaning |
| --- | --- |
| Summary cards | Active members, role count, seat usage, available roles. |
| User actions | Invite or update tenant users when permitted. |
| User list | Current tenant users with email, roles, status, security state, and last update. |
| Role coverage | Seat count by role. |

## Important controls

| Control | Meaning |
| --- | --- |
| Search | Find by name, email, username, status, or role. |
| Update roles | Change the roles assigned to a user. |
| Suspend | Temporarily disables tenant access. |
| Reactivate | Restores access when the user should return. |
| Invite / Add user | Creates or invites a new tenant user when enabled. |
| Previous / Next | Moves through user pages. |

## Workflow: add or invite a user

1. Open **Tenant Admin > Users**.
2. Check whether the person already exists.
3. Create or invite the user.
4. Assign the minimum role needed.
5. Confirm status is active.
6. Ask the user to sign in.
7. Confirm they land in the expected workspace.

## Workflow: fix wrong workspace access

1. Search for the user.
2. Confirm the user is active.
3. Confirm the tenant membership is active.
4. Check assigned roles.
5. Add the correct role or remove the wrong role.
6. Ask the user to sign out and sign back in.

## Role assignment guide

| User need | Typical role direction |
| --- | --- |
| Manage account users and settings | Tenant Admin. Assign only to trusted account owners. |
| Maintain employees and HR operations | HR Admin or HR operations role. |
| Prepare and close payroll | Payroll Admin or payroll operations role. |
| Review payroll handoff and approvals | Finance Manager or finance role. |
| View personal employee tasks | ESS access through the employee workspace. |
| Approve team requests | MSS access through manager workspace. |

## Before suspending a user

- Confirm another active user owns any critical admin responsibility.
- Reassign pending approvals, payroll work, or support ownership when needed.
- Check whether the user is part of an active support or audit workflow.
- Keep the status change visible in Trust Audit.

## Good practice

- Keep tenant-admin access limited to trusted account owners.
- Remove access immediately when a person leaves the customer admin group.
- Prefer role updates over creating duplicate users.

## FAQ

### Why does a user land on Workspace Access after login?

Usually the user has authentication but no active tenant role or workspace membership. Check user status, tenant membership, and assigned roles.

### Should I create a duplicate user if the email already exists?

No. Update the existing user or membership wherever possible so audit history stays clean.
