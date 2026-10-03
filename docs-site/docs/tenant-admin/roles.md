# Tenant Roles

Tenant Roles defines what tenant users can do. Use this page to review system roles, create custom roles, inspect permission risk, and understand assigned seat ownership.

![Tenant roles](../assets/screenshots/tenant-admin/roles.png)

## On This Page

- [When to use this page](#when-to-use-this-page)
- [Page sections](#page-sections)
- [Screen labels to recognize](#screen-labels-to-recognize)
- [Controls and actions](#controls-and-actions)
- [Permission risk model](#permission-risk-model)
- [Example: review a role before assignment](#example-review-a-role-before-assignment)
- [Example: create a custom role](#example-create-a-custom-role)
- [Validation and negative cases](#validation-and-negative-cases)
- [Signoff checklist](#signoff-checklist)

## When To Use This Page

- You need to understand what a role can do.
- You need to create a custom role for a limited operating job.
- You need to check permission risk before assigning access.
- You need to understand why a role cannot be edited or deactivated.
- You need to review assigned seat count by role.

## Page Sections

| Section | Meaning | What to check |
| --- | --- | --- |
| Search roles | Finds roles by name, code, permission, or status. | Search before creating a duplicate custom role. |
| Role list | Shows role code, type, status, assigned users, and permission count. | System roles are protected; custom roles are tenant-owned. |
| Permission matrix | Groups permissions by module and risk level. | High and critical permissions need business justification. |
| Role actions | Add, edit, activate, or deactivate roles when allowed. | Actions are disabled for protected or assigned roles when state does not allow changes. |

## Screen Labels To Recognize

| Screen label | Meaning |
| --- | --- |
| Access model | The tenant's role and permission design area. |
| Search roles | Filter for system or custom roles by name, code, permission, or status. |
| Add role | Opens the create-role flow for custom tenant roles. |

## Controls And Actions

| Control | Meaning | Expected result |
| --- | --- | --- |
| Add role | Creates a custom tenant role. | New role appears in the role list after save. |
| Edit | Changes role description or permission set when allowed. | Permission count and risk badges update. |
| Activate | Makes an inactive custom role available for assignment. | Users can receive the role from Tenant Users. |
| Deactivate | Removes an unused custom role from assignment. | Role remains auditable but is not assignable. |
| Search | Filters by role, code, permission, or status. | Matching role cards remain visible. |

## Permission Risk Model

| Risk | Meaning | Example |
| --- | --- | --- |
| Low | View-only or low impact permission. | View tenant dashboard. |
| Medium | Can expose operational data or account state. | View tenant users or reports. |
| High | Can change important workflows, users, payroll, or employee data. | Manage users, import employees, edit payroll setup. |
| Critical | Can affect security, support access, payroll close, or audit posture. | Manage employee access, approve support access, export audit evidence. |

## Example: Review A Role Before Assignment

1. Open **Tenant Admin > Roles**.
2. Search for the role name, such as HR Admin.
3. Review assigned user count.
4. Review permission count and high-risk badges.
5. Confirm the role matches the user's actual job.
6. Open **Users** and assign the role to the person.

Expected result: role assignment is based on permission evidence, not only on the role name.

## Example: Create A Custom Role

Use this when the system role is too broad.

1. Confirm no standard role already fits.
2. Choose **Add role**.
3. Give the role a clear name, such as Payroll Reviewer.
4. Add a description that explains who owns it.
5. Select only the required permissions.
6. Review high-risk and critical permissions.
7. Save the role.
8. Assign it to one test user from **Users**.
9. Ask the user to sign in and verify the workspace route.

## Example: Deactivate An Unused Custom Role

1. Search the role.
2. Confirm assigned user count is zero.
3. Confirm the role is not referenced in a support, workflow, or policy process.
4. Use **Deactivate**.
5. Confirm Trust Audit contains the role change.

## Validation And Negative Cases

| Case | Expected behavior | What to do |
| --- | --- | --- |
| System role edit blocked | System roles are protected. | Create a custom role if needed. |
| Deactivate blocked | Role is system-protected or still assigned. | Remove user assignments first, or leave the system role active. |
| No permissions selected | Role should not be useful or save may be blocked. | Add the minimum permission set. |
| Critical permission added | Risk badge should make this visible. | Confirm business owner and audit reason. |
| User cannot access expected page after role change | Role may not include route permission or user needs employee profile mapping. | Review role permissions and Users page. |

## Signoff Checklist

- Standard roles are preferred before custom roles.
- Every custom role has a clear owner and description.
- High and critical permissions are justified.
- Deactivation is attempted only after assigned users are removed.
- Role changes are visible in Trust Audit.

## FAQ

### Where Do I Assign A Role After Creating It?

Assign roles from **Tenant Admin > Users**. The Roles page defines the access model; the Users page applies it to people.

### Can System Roles Be Edited?

System roles are product-owned and may be protected. Create a narrow custom role only when a standard role does not fit.

### Why Can I Not Deactivate A Role?

The role may be a protected system role, may still have active assigned users, or may be needed for launch-safe access recovery.

## Related Guides

- [Tenant Users](users.md)
- [Security Readiness](security.md)
- [Trust Audit](trust-audit.md)
