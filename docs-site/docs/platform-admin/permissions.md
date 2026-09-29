# Platform Permissions

Permissions shows the platform-owned RBAC permission catalog.

## Purpose

Use Permissions to inspect permission keys, tenant assignability, risk levels, default roles, and catalog sync health.

![Platform permission catalog](../assets/screenshots/platform-admin/permissions.png)

## Use this page when

- You need to understand what a permission allows.
- A role should or should not expose a permission.
- A high-risk permission needs review.
- You need to confirm whether a permission is tenant assignable or platform-only.

## Page sections

| Section | Meaning |
| --- | --- |
| Summary metrics | Total permissions, tenant-assignable count, platform-only count, critical-risk count, inactive count, and catalog source. |
| Filters | Search by permission key, label, module, role, assignability, and risk. |
| Catalog review | Grouped permission definitions by module. |
| Permission actions | Sync or manage catalog definitions when permitted. |

## Risk levels

| Risk | Meaning |
| --- | --- |
| Low | Low-impact visibility or basic read access. |
| Medium | Sensitive visibility or operational scope. |
| High | Can change important tenant, HR, payroll, or account data. |
| Critical | Can affect platform security, access control, or highly sensitive operations. |

## Review checklist

When reviewing a permission, confirm:

- Permission key name matches the action it controls.
- Module grouping is correct.
- Tenant-assignable permissions are safe for tenant roles.
- Platform-only permissions are not included in tenant role templates.
- High and critical permissions have a clear operational reason.
- Inactive permissions are not accidentally reintroduced.

## Good practice

- Keep platform-only permissions out of tenant roles.
- Review high and critical permissions before assigning them through role templates.
- Treat inactive permissions as historical/catalog evidence unless deliberately reactivated.

## FAQ

### Why do some permissions show high or critical risk?

They can change access, payroll, HR records, security controls, or sensitive account data. Assign them only when the role truly needs that authority.

### Should inactive permissions be deleted?

Usually no. Keep them as catalog history unless product/security owners decide the permission should be removed.
