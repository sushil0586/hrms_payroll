# Tenant Users

Tenant Users is the access management page for people who can enter the tenant account. Use it to invite users, update roles, suspend access, reactivate access, and review role coverage.

![Tenant user management](../assets/screenshots/tenant-admin/users.png)

## On This Page

- [When to use this page](#when-to-use-this-page)
- [Page sections](#page-sections)
- [Screen labels to recognize](#screen-labels-to-recognize)
- [Controls and actions](#controls-and-actions)
- [Example: invite an HR admin](#example-invite-an-hr-admin)
- [Example: fix Workspace Access landing](#example-fix-workspace-access-landing)
- [Example: suspend a user safely](#example-suspend-a-user-safely)
- [Validation and negative cases](#validation-and-negative-cases)
- [Signoff checklist](#signoff-checklist)

## When To Use This Page

- A new account admin, HR admin, payroll user, finance user, or reviewer needs access.
- A user has the wrong role.
- A user should be suspended or reactivated.
- A user can log in but cannot reach the expected workspace.
- You need to check how many seats each role is using.

## Page Sections

| Section | Meaning | What to check |
| --- | --- | --- |
| Summary cards | Active members, available roles, and access status. | Counts should match the user list after filters are cleared. |
| User search and pagination | Finds users by name, email, username, status, or role. | Use search before creating a user to avoid duplicates. |
| User list | Email, roles, status, security state, last update, and actions. | Confirm the correct user row before changing roles. |
| Row actions | Update roles, suspend, reactivate, or review user state. | Only enabled when the current user has permission. |
| Role coverage | Seat ownership by role. | Verify no critical role has zero responsible users. |

## Screen Labels To Recognize

| Screen label | Meaning |
| --- | --- |
| User Directory | Main member list for tenant-admin access management. |
| Invite member | Opens the safe invite flow for a new tenant user. |
| Role coverage | Shows how many users currently hold each tenant role. |

## Controls And Actions

| Control | Meaning | Expected result |
| --- | --- | --- |
| Search | Filters user list by name, email, username, status, or role. | Matching users remain visible. |
| Add user or Invite user | Creates an account invite and role assignment. | User receives invite or becomes visible in the list. |
| Update roles | Opens role assignment controls for the selected user. | Role changes are saved and reflected in role coverage. |
| Suspend | Temporarily disables access. | User cannot access tenant routes. |
| Reactivate | Restores a suspended membership. | User can sign in if they also have a valid role. |
| Previous / Next | Moves through user pages. | Pagination changes without losing filter context. |

## Example: Invite An HR Admin

1. Open **Tenant Admin > Users**.
2. Search the email address first.
3. If the user does not exist, choose **Add user** or **Invite user**.
4. Enter the name and email.
5. Assign the HR admin role.
6. Save the user.
7. Ask the user to open the invitation email or reset password flow.
8. Confirm they land in HR Admin, not Workspace Access.

Expected result: the user appears as active or invited with the correct role and can reach the intended workspace after login.

## Example: Fix Workspace Access Landing

Workspace Access means the person is authenticated but has no usable workspace route.

1. Search for the email on **Users**.
2. Confirm the user exists and is active.
3. Confirm a tenant role is assigned.
4. If the user needs HR Admin, add the HR Admin role.
5. If the user needs ESS or MSS, confirm the employee profile and manager mapping exist in HR Admin.
6. Ask the user to sign out and sign in again.

If the user still lands on Workspace Access, check whether the account was created only as an identity account without tenant membership.

## Example: Suspend A User Safely

1. Search for the user.
2. Check their current roles.
3. Confirm another user owns any critical role before suspending.
4. Reassign pending payroll, HR, or approval ownership if needed.
5. Use **Suspend**.
6. Open **Trust Audit** and confirm the suspension event exists.

Do not suspend the only active tenant admin unless another trusted admin can recover the account.

## Role Assignment Guide

| User need | Typical role direction |
| --- | --- |
| Manage account users, settings, and support access | Tenant Admin. Assign only to trusted account owners. |
| Maintain employees and HR operations | HR Admin or HR operations role. |
| Prepare and close payroll | Payroll Admin or payroll operations role. |
| Review payroll handoff and payments | Finance Manager or finance role. |
| View personal employee actions | ESS through employee profile mapping. |
| Approve team requests | MSS through manager mapping. |

## Validation And Negative Cases

| Case | Expected behavior | What to do |
| --- | --- | --- |
| Duplicate email | System should prevent duplicate user creation. | Search and update the existing user. |
| No role selected | Save should be blocked or user will not get a route. | Assign at least one valid role. |
| Plan limit exceeded | Add or activate action may be blocked. | Open Plan and Billing and request a limit increase. |
| Last tenant admin suspension | Should be blocked or treated as high risk. | Create another tenant admin first. |
| User has HR role but no employee profile | HR Admin may load but ESS/MSS may not route correctly. | Create or map the employee profile in HR Admin. |
| Action button hidden | Current user lacks permission. | Ask a tenant admin with user-management rights. |

## Signoff Checklist

- Search finds users by email and role.
- Invite or add user flow creates an auditable entry.
- Role update changes the user and role coverage count.
- Suspend and reactivate work as separate actions.
- Workspace Access issues can be diagnosed from status, membership, and role.
- Trust Audit captures user access changes.

## Related Guides

- [Roles](roles.md)
- [Plan and Billing](plan.md)
- [Trust Audit](trust-audit.md)
