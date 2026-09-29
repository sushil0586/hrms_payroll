# Workspaces and Roles

Accerio HRMS opens different workspaces based on the role assigned to your user account.

## Login behavior

After login, HRMS checks your active role and opens the best available workspace.

| Situation | What happens |
| --- | --- |
| You have HR admin access | HRMS opens the HR Admin workspace. |
| You have tenant admin access | HRMS opens the Tenant Admin workspace. |
| You are an employee | HRMS opens ESS. |
| You are a manager | HRMS opens MSS or manager approvals. |
| You have no assigned workspace role | HRMS opens Workspace Access and asks an admin to finish setup. |

## Workspace switch buttons

Some users see quick buttons such as **ESS**, **MSS**, or workspace links in the header.

- **ESS** opens your employee self-service view.
- **MSS** opens your manager self-service view.
- **Sign out** ends the current session.

## If you cannot open a workspace

Ask your tenant admin or HR admin to check:

- Your user is active.
- Your tenant membership is active.
- At least one role is assigned.
- The role has the permission required for the page.
- Your employee profile is linked if you need ESS or MSS access.

## Good practice

Use one browser profile for one user while testing. If you switch users often, sign out first to avoid session confusion.

## Related guides

- [Glossary and Status Guide](../glossary.md)
- [Access Issues](../troubleshooting/access.md)
- [Tenant Admin Users](../tenant-admin/users.md)
