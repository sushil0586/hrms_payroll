# Full RBAC Rollout Plan

Date: 2026-09-17  
Product: HRMS Payroll SaaS  
Scope: tenant-scoped full role-based access control across Platform Admin, Tenant Admin, HR Admin, Payroll/Finance, Manager, Employee, Support, reports, exports, and APIs.  
Owner model: Platform Admin owns the permission catalog; Tenant Admin owns tenant role composition and user assignment.

## Objective

Move the product from mostly fixed role-code access to full RBAC:

```text
User -> Tenant Membership -> Role(s) -> Permission(s) -> Allowed UI/API actions
```

The final design must support:

- Multiple roles per tenant user.
- Platform-defined permission catalog.
- Tenant-created custom roles.
- Plan/module-aware permission availability.
- Protected system roles.
- Tenant-managed custom role permissions.
- Backend API enforcement.
- Frontend menu/page/button enforcement.
- Audit evidence for every role or permission change.
- Last-admin and lockout prevention.
- Cross-tenant isolation.

## Current Baseline

Status as of 2026-09-17:

| Capability | Status | Notes |
| --- | --- | --- |
| Tenant-scoped role model | Implemented | `Role`, `RolePermission`, `TenantMembership`, and `MembershipRole` exist. |
| Multiple roles per user | Implemented | Memberships can have multiple `MembershipRole` rows. |
| Tenant Admin custom role CRUD | Implemented locally, staging pending | TA-8 added `/tenant-admin/roles`, role APIs, and browser spec. |
| Permission key storage on roles | Partially implemented | Permission keys are now catalog-backed for Tenant Admin role mutations, but not yet globally enforced. |
| Platform permission catalog | Implemented locally | Code-backed catalog exists in `apps.iam.permission_catalog`; Platform Admin catalog UI is still pending. |
| Permission matrix UI | Implemented locally | Tenant Admin role dialog uses grouped catalog permissions with plan-aware availability. |
| Backend permission enforcement | Partially implemented locally | Tenant Admin role and membership mutations now enforce `tenant.roles.manage` and `tenant.users.manage`. Wider APIs remain pending. |
| Frontend permission enforcement | Partially implemented locally | Tenant Admin nav and first role/user mutation controls now use effective permissions from session payload. |
| Audit for role mutations | Implemented locally | TA-8 records role create/update/activate/deactivate audit events. |
| Last-admin permission safety | Not implemented | Existing last tenant-admin membership guard exists; permission-level guard still needed. |

## RBAC Principles

- Platform Admin defines **what permissions exist**.
- Tenant Admin chooses **which allowed permissions belong to tenant roles**.
- Users do not receive permissions directly; they receive roles.
- APIs must enforce permissions even if the frontend hides controls.
- System roles remain protected.
- Custom roles are tenant-owned.
- Permission changes must be audit logged.
- Plan/module restrictions must be enforced at selection time and API time.
- Existing roles must keep working through default permission templates.

## Permission Key Standard

Format:

```text
module.resource.action
```

Examples:

| Area | Permission Examples |
| --- | --- |
| Tenant Admin | `tenant.users.view`, `tenant.users.manage`, `tenant.roles.view`, `tenant.roles.manage`, `tenant.audit.view`, `tenant.settings.request_change` |
| Employees | `employees.view`, `employees.create`, `employees.edit`, `employees.access.manage`, `employees.import` |
| Documents | `documents.view`, `documents.upload`, `documents.verify`, `documents.export` |
| Leave | `leave.requests.view`, `leave.requests.create`, `leave.requests.approve`, `leave.policies.manage` |
| Attendance | `attendance.view`, `attendance.regularization.review`, `attendance.policies.manage` |
| Payroll | `payroll.inputs.view`, `payroll.inputs.manage`, `payroll.calculate`, `payroll.review`, `payroll.approve`, `payroll.lock`, `payroll.publish` |
| Finance | `finance.handoff.view`, `finance.handoff.create`, `finance.handoff.acknowledge`, `finance.bank_advice.export` |
| Statutory | `statutory.setup.manage`, `statutory.filing.view`, `statutory.filing.export`, `statutory.efile.prepare` |
| Reports | `reports.view`, `reports.export`, `reports.payroll.view`, `reports.payroll.export`, `reports.compliance.export` |
| Support | `support.access.request`, `support.access.approve`, `support.audit.view` |

## Default System Role Permission Templates

These templates preserve current behavior while moving to permission checks.

| System Role | Initial Permission Template |
| --- | --- |
| `tenant-admin` | Tenant users/roles/settings/audit/support/plan permissions, plus account control-center visibility. |
| `hr-admin` | Employee, lifecycle, leave, attendance, documents, setup, selected payroll input permissions. |
| `payroll-finance-manager` | Payroll review/output/finance handoff/report export/statutory package permissions. |
| `manager` | Team view, leave/attendance approval, MSS dashboard permissions. |
| `employee` | ESS self-service profile, leave, attendance, payslip, documents, statutory declarations. |
| `support-agent` | Support console permissions only when support-session grants allow scoped access. |

## Phase Plan

### RBAC-0: Catalog Freeze And Mapping

Status: Complete locally on 2026-09-17  
Goal: freeze the permission catalog before wiring enforcement.

Tasks:

- Define first production permission catalog.
- Map every launch route/API/button/export to a required permission.
- Mark permissions as tenant-assignable or system-only.
- Mark permissions by module/plan.
- Define default templates for existing system roles.
- Identify any legacy role-code checks that must remain temporarily.

Exit criteria:

- Permission catalog document is approved.
- Every launch route/API has an owner permission.
- No enforcement code starts without a mapping.

RBAC-0 catalog decision:

- Keep permission keys product-owned and deterministic.
- Use `module.resource.action` naming.
- Keep high-risk mutations separate from read permissions.
- Keep export/download permissions separate from view permissions.
- Treat existing system roles as permission templates during migration.
- Continue existing workspace/role-code checks as a compatibility outer gate until backend permission enforcement is complete.

#### RBAC-0A Permission Catalog

| Key | Label | Module | Risk | Tenant Assignable | Plan/Module Dependency | Default System Grants |
| --- | --- | --- | --- | --- | --- | --- |
| `tenant.dashboard.view` | View tenant control center | Tenant Admin | Low | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.users.view` | View tenant users | Tenant Admin | Medium | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.users.manage` | Invite and manage tenant users | Tenant Admin | High | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.roles.view` | View tenant roles | Tenant Admin | Medium | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.roles.manage` | Create and manage tenant roles | Tenant Admin | Critical | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.plan.view` | View plan and subscription | Tenant Admin | Low | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.change_requests.manage` | Create and manage tenant change requests | Tenant Admin | Medium | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.setup.view` | View setup guide | Tenant Admin | Low | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.support_access.request` | Request support access | Tenant Admin | Medium | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.support_access.approve` | Approve support access | Tenant Admin | High | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.audit.view` | View trust audit | Tenant Admin | Medium | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.audit.export` | Download audit evidence | Tenant Admin | High | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.security.view` | View security readiness | Tenant Admin | Medium | Yes | Tenant Admin workspace | tenant-admin |
| `tenant.settings.view` | View tenant settings | Tenant Admin | Low | Yes | Tenant Admin workspace | tenant-admin |
| `employees.view` | View employees | HR | Medium | Yes | HR module | hr-admin |
| `employees.create` | Create employees | HR | High | Yes | HR module | hr-admin |
| `employees.edit` | Edit employees | HR | High | Yes | HR module | hr-admin |
| `employees.import` | Bulk import employees | HR | High | Yes | HR module | hr-admin |
| `employees.access.manage` | Manage employee workspace access | HR/IAM | Critical | Yes | HR module + IAM | hr-admin, tenant-admin |
| `organization.view` | View organization masters | HR Setup | Low | Yes | HR module | hr-admin |
| `organization.manage` | Manage organization masters | HR Setup | High | Yes | HR module | hr-admin |
| `documents.view` | View employee documents | Documents | Medium | Yes | Documents module | hr-admin, employee |
| `documents.manage` | Manage document categories/rules | Documents | High | Yes | Documents module | hr-admin |
| `documents.verify` | Verify employee documents | Documents | High | Yes | Documents module | hr-admin |
| `documents.export` | Export document compliance | Documents/Reports | High | Yes | Documents module | hr-admin |
| `leave.view` | View leave data | Leave | Low | Yes | Leave module | hr-admin, manager, employee |
| `leave.requests.create` | Create own leave request | Leave/ESS | Low | Yes | Leave module | employee |
| `leave.requests.approve` | Approve leave requests | Leave/MSS | High | Yes | Leave module | manager, hr-admin |
| `leave.policies.manage` | Manage leave policies | Leave Setup | High | Yes | Leave module | hr-admin |
| `leave.balances.manage` | Manage leave balances | Leave Operations | High | Yes | Leave module | hr-admin |
| `attendance.view` | View attendance | Attendance | Low | Yes | Attendance module | hr-admin, manager, employee |
| `attendance.records.manage` | Manage attendance records | Attendance | High | Yes | Attendance module | hr-admin |
| `attendance.regularization.request` | Request attendance regularization | Attendance/ESS | Low | Yes | Attendance module | employee |
| `attendance.regularization.review` | Review attendance regularization | Attendance/MSS | High | Yes | Attendance module | manager, hr-admin |
| `attendance.policies.manage` | Manage attendance policies/shifts | Attendance Setup | High | Yes | Attendance module | hr-admin |
| `lifecycle.view` | View onboarding/movement/exit lifecycle | Lifecycle | Medium | Yes | HR module | hr-admin |
| `lifecycle.manage` | Manage lifecycle events | Lifecycle | High | Yes | HR module | hr-admin |
| `letters.generate` | Generate HR letters | Documents/Lifecycle | Medium | Yes | Documents module | hr-admin |
| `notifications.view` | View notifications | Notifications | Low | Yes | Notifications module | hr-admin, manager, employee |
| `notifications.manage` | Manage notification templates/events | Notifications | High | Yes | Notifications module | hr-admin |
| `payroll.setup.view` | View payroll setup | Payroll | Medium | Yes | Payroll module | hr-admin, payroll-finance-manager |
| `payroll.setup.manage` | Manage payroll setup/rules | Payroll | Critical | Yes | Payroll module | hr-admin |
| `payroll.inputs.view` | View payroll inputs | Payroll | Medium | Yes | Payroll module | hr-admin, payroll-finance-manager |
| `payroll.inputs.manage` | Manage payroll inputs/snapshots | Payroll | High | Yes | Payroll module | hr-admin |
| `payroll.calculate` | Run payroll calculation | Payroll | Critical | Yes | Payroll module | hr-admin |
| `payroll.review` | Review payroll and exceptions | Payroll | High | Yes | Payroll module | hr-admin, payroll-finance-manager |
| `payroll.approve` | Approve payroll | Payroll | Critical | Yes | Payroll module | hr-admin, payroll-finance-manager |
| `payroll.lock` | Lock payroll inputs/reviews | Payroll | Critical | Yes | Payroll module | hr-admin |
| `payroll.publish` | Publish payroll outputs/payslips | Payroll | Critical | Yes | Payroll module | hr-admin |
| `payroll.outputs.view` | View payroll outputs | Payroll | High | Yes | Payroll module | hr-admin, payroll-finance-manager |
| `payroll.outputs.download` | Download payroll output artifacts | Payroll | Critical | Yes | Payroll module | hr-admin, payroll-finance-manager |
| `finance.handoff.view` | View finance handoff | Finance | Medium | Yes | Payroll/Finance module | payroll-finance-manager |
| `finance.handoff.create` | Generate finance handoff | Finance | Critical | Yes | Payroll/Finance module | hr-admin |
| `finance.handoff.transmit` | Transmit finance handoff | Finance | Critical | Yes | Payroll/Finance module | payroll-finance-manager |
| `finance.handoff.acknowledge` | Acknowledge finance handoff | Finance | High | Yes | Payroll/Finance module | payroll-finance-manager |
| `finance.bank_advice.export` | Export bank advice | Finance/Reports | Critical | Yes | Payroll/Finance module | payroll-finance-manager |
| `statutory.setup.view` | View statutory setup | Statutory | Medium | Yes | Payroll/Statutory module | hr-admin, payroll-finance-manager |
| `statutory.setup.manage` | Manage statutory setup | Statutory | High | Yes | Payroll/Statutory module | hr-admin |
| `statutory.declarations.view` | View statutory declarations | Statutory/ESS | Medium | Yes | Statutory module | hr-admin, employee |
| `statutory.declarations.manage` | Manage statutory declarations | Statutory | High | Yes | Statutory module | hr-admin |
| `statutory.filing.view` | View statutory filing readiness | Statutory/Reports | Medium | Yes | Statutory module | hr-admin, payroll-finance-manager |
| `statutory.filing.export` | Export statutory packages | Statutory/Reports | Critical | Yes | Statutory module | payroll-finance-manager |
| `statutory.efile.prepare` | Prepare e-file package | Statutory/e-file | Critical | Yes | Statutory/e-file module | payroll-finance-manager |
| `reports.catalog.view` | View report catalog | Reports | Low | Yes | Reports module | hr-admin, payroll-finance-manager |
| `reports.hr.view` | View HR reports | Reports | Medium | Yes | Reports module | hr-admin |
| `reports.hr.export` | Export HR reports | Reports | High | Yes | Reports module | hr-admin |
| `reports.payroll.view` | View payroll reports | Reports | High | Yes | Payroll/Reports module | hr-admin, payroll-finance-manager |
| `reports.payroll.export` | Export payroll reports | Reports | Critical | Yes | Payroll/Reports module | payroll-finance-manager |
| `reports.compliance.view` | View compliance reports | Reports | High | Yes | Compliance module | hr-admin, payroll-finance-manager |
| `reports.compliance.export` | Export compliance reports | Reports | Critical | Yes | Compliance module | payroll-finance-manager |
| `audit.hr.view` | View HR audit evidence | Audit | High | Yes | Audit module | hr-admin |
| `support.console.view` | View support console | Support | High | No | Support workspace | support-agent |
| `platform.tenants.manage` | Manage tenants | Platform Admin | Critical | No | Platform workspace | platform-admin |
| `platform.leads.manage` | Manage public leads | Platform Admin | High | No | Platform workspace | platform-admin |
| `platform.policy_packs.manage` | Manage platform policy packs | Platform Admin | Critical | No | Platform workspace | platform-admin |
| `platform.permission_catalog.manage` | Manage permission catalog | Platform Admin | Critical | No | Platform workspace | platform-admin |

#### RBAC-0B Route Mapping

| Route / Area | Required Permission | Compatibility Gate During Migration |
| --- | --- | --- |
| `/tenant-admin` | `tenant.dashboard.view` | tenant_admin workspace |
| `/tenant-admin/users` | `tenant.users.view` | tenant_admin workspace |
| `/tenant-admin/users` invite/update/status actions | `tenant.users.manage` | tenant_admin workspace |
| `/tenant-admin/roles` | `tenant.roles.view` | tenant_admin workspace |
| `/tenant-admin/roles` create/update/status actions | `tenant.roles.manage` | tenant_admin workspace |
| `/tenant-admin/plan` | `tenant.plan.view` | tenant_admin workspace |
| `/tenant-admin/plan` change-request actions | `tenant.change_requests.manage` | tenant_admin workspace |
| `/tenant-admin/setup` | `tenant.setup.view` | tenant_admin workspace |
| `/tenant-admin/support-access` | `tenant.support_access.request` | tenant_admin workspace |
| `/tenant-admin/support-access` approve/start/end/revoke | `tenant.support_access.approve` | tenant_admin workspace |
| `/tenant-admin/trust-audit` | `tenant.audit.view` | tenant_admin workspace |
| `/tenant-admin/trust-audit` download | `tenant.audit.export` | tenant_admin workspace |
| `/tenant-admin/security-readiness` | `tenant.security.view` | tenant_admin workspace |
| `/tenant-admin/settings` | `tenant.settings.view` | tenant_admin workspace |
| `/hr-admin` | `employees.view` | `hr-admin` role |
| `/hr-admin/employees` | `employees.view` | `hr-admin` role |
| Employee create/edit/import | `employees.create`, `employees.edit`, `employees.import` | `hr-admin` role |
| Employee access page/actions | `employees.access.manage` | `hr-admin` role |
| `/hr-admin/organization` | `organization.view` / `organization.manage` for mutations | `hr-admin` role |
| Document center/admin pages | `documents.view`, `documents.manage`, `documents.verify` | `hr-admin` role |
| Leave pages | `leave.view`, `leave.policies.manage`, `leave.requests.approve` | `hr-admin` role |
| Attendance pages | `attendance.view`, `attendance.records.manage`, `attendance.regularization.review`, `attendance.policies.manage` | `hr-admin` role |
| Lifecycle pages | `lifecycle.view`, `lifecycle.manage` | `hr-admin` role |
| Payroll setup/rules/statutory/provider pages | `payroll.setup.view`, `payroll.setup.manage`, `statutory.setup.manage` | `hr-admin` role |
| Payroll inputs/calculation/review/output pages | `payroll.inputs.view`, `payroll.inputs.manage`, `payroll.calculate`, `payroll.review`, `payroll.outputs.view` | `hr-admin` role |
| Payroll publish/download actions | `payroll.publish`, `payroll.outputs.download` | `hr-admin` role |
| HR report pages | `reports.hr.view`, `reports.hr.export` | `hr-admin` role |
| Payroll/compliance report pages | `reports.payroll.view`, `reports.payroll.export`, `reports.compliance.view`, `reports.compliance.export` | `hr-admin` role initially; later finance split |
| `/finance-manager` | `finance.handoff.view`, `reports.payroll.view` | `payroll-finance-manager` role |
| Finance handoff actions | `finance.handoff.transmit`, `finance.handoff.acknowledge` | `payroll-finance-manager` role |
| `/mss` | manager-scoped `leave.requests.approve` / `attendance.regularization.review` | mss workspace |
| `/ess` | employee-scoped ESS permissions | ess workspace |
| `/support` | `support.console.view` plus grant scopes | support workspace |
| `/platform-admin` and child routes | platform permissions | platform-admin role/staff |

#### RBAC-0C API Mapping

| API Family | Read Permission | Mutation Permission |
| --- | --- | --- |
| `/api/v1/tenant-admin/console/` | `tenant.dashboard.view` | N/A |
| `/api/v1/tenant-admin/memberships/` | `tenant.users.view` | `tenant.users.manage` |
| `/api/v1/tenant-admin/roles/` | `tenant.roles.view` | `tenant.roles.manage` |
| `/api/v1/tenant-admin/change-requests/` | `tenant.plan.view` | `tenant.change_requests.manage` |
| `/api/v1/tenant-admin/support-access-grants/` | `tenant.support_access.request` | `tenant.support_access.approve` for decisions |
| `/api/v1/tenant-admin/trust-audit/` | `tenant.audit.view` | N/A |
| `/api/v1/tenant-admin/commercial-support-audit/download/` | `tenant.audit.export` | N/A |
| `/api/v1/tenant-admin/security-readiness/` | `tenant.security.view` | N/A |
| `/api/v1/hr-admin/employees/` | `employees.view` | `employees.create` / `employees.edit` |
| `/api/v1/hr-admin/employees/<id>/access/` | `employees.access.manage` | `employees.access.manage` |
| `/api/v1/hr-admin/organization/*` | `organization.view` | `organization.manage` |
| `/api/v1/hr-admin/document-*` | `documents.view` | `documents.manage` / `documents.verify` |
| `/api/v1/hr-admin/leave-*` | `leave.view` | `leave.policies.manage` / `leave.requests.approve` |
| `/api/v1/hr-admin/attendance-*` | `attendance.view` | `attendance.records.manage` / `attendance.regularization.review` |
| `/api/v1/hr-admin/payroll-*` | payroll-specific view permissions | payroll-specific manage/approve/export permissions |
| `/api/v1/hr-admin/reports/*` | report-specific view permissions | report-specific export permissions |
| `/api/v1/me/*` | ESS self permissions | ESS self permissions |
| `/api/v1/manager/*` | MSS scoped permissions | MSS scoped approval permissions |
| `/api/v1/support/*` | `support.console.view` plus grant scopes | support grant scope dependent |
| `/api/v1/platform-*` and onboarding APIs | platform permissions | platform permissions |

#### RBAC-0D Default System Role Grants

| Role | Default Grants |
| --- | --- |
| `tenant-admin` | `tenant.dashboard.view`, `tenant.users.view`, `tenant.users.manage`, `tenant.roles.view`, `tenant.roles.manage`, `tenant.plan.view`, `tenant.change_requests.manage`, `tenant.setup.view`, `tenant.support_access.request`, `tenant.support_access.approve`, `tenant.audit.view`, `tenant.audit.export`, `tenant.security.view`, `tenant.settings.view` |
| `hr-admin` | `tenant.dashboard.view`, `tenant.users.view`, `tenant.users.manage`, `tenant.roles.view`, `tenant.roles.manage`, `employees.view`, `employees.create`, `employees.edit`, `employees.import`, `employees.access.manage`, `organization.view`, `organization.manage`, `documents.view`, `documents.manage`, `documents.verify`, `documents.export`, `leave.view`, `leave.requests.approve`, `leave.policies.manage`, `attendance.view`, `attendance.records.manage`, `attendance.regularization.review`, `attendance.policies.manage`, `lifecycle.view`, `lifecycle.manage`, `letters.generate`, `notifications.view`, `notifications.manage`, `payroll.setup.view`, `payroll.setup.manage`, `payroll.inputs.view`, `payroll.inputs.manage`, `payroll.calculate`, `payroll.review`, `payroll.approve`, `payroll.lock`, `payroll.publish`, `payroll.outputs.view`, `payroll.outputs.download`, `finance.handoff.create`, `statutory.setup.view`, `statutory.setup.manage`, `statutory.declarations.view`, `statutory.declarations.manage`, `statutory.filing.view`, `reports.catalog.view`, `reports.hr.view`, `reports.hr.export`, `reports.payroll.view`, `reports.compliance.view`, `audit.hr.view` |
| `payroll-finance-manager` | `payroll.setup.view`, `payroll.inputs.view`, `payroll.review`, `payroll.approve`, `payroll.outputs.view`, `payroll.outputs.download`, `finance.handoff.view`, `finance.handoff.transmit`, `finance.handoff.acknowledge`, `finance.bank_advice.export`, `statutory.setup.view`, `statutory.filing.view`, `statutory.filing.export`, `statutory.efile.prepare`, `reports.catalog.view`, `reports.payroll.view`, `reports.payroll.export`, `reports.compliance.view`, `reports.compliance.export` |
| `manager` | `leave.view`, `leave.requests.approve`, `attendance.view`, `attendance.regularization.review`, `notifications.view` |
| `employee` | `leave.view`, `leave.requests.create`, `attendance.view`, `attendance.regularization.request`, `documents.view`, `statutory.declarations.view`, `notifications.view` |
| `support-agent` | `support.console.view` plus scoped support grant permissions |

RBAC-0 evidence:

- Catalog, route mapping, API mapping, and default role grants are documented in this plan.
- No application enforcement code changed in RBAC-0.
- Next phase is RBAC-1 Platform Permission Catalog.

### RBAC-1: Platform Permission Catalog

Status: Complete locally on 2026-09-17  
Goal: make permission definitions platform-owned and structured.

Tasks:

- Add permission definition model or configuration source.
- Fields:
  - key
  - label
  - module
  - description
  - risk level
  - active flag
  - tenant-assignable flag
  - required plan/module
  - default system-role grants
- Add selector/API payload for permission catalog.
- Add Platform Admin read/manage page or initial read-only catalog page.
- Seed catalog via migration/management command/config.

Exit criteria:

- Platform Admin can view active permissions. *(Deferred to RBAC-1B/Platform Admin UI; catalog is code-backed in RBAC-1A.)*
- Catalog can be used by Tenant Admin role builder. *(Complete locally: catalog is included in Tenant Admin console payload.)*
- Unknown permission keys are rejected. *(Complete locally: create/update validates against tenant-assignable catalog keys.)*

RBAC-1A implementation evidence:

- Added code-backed platform permission catalog in `backend/apps/iam/permission_catalog.py`.
- Exposed catalog through the Tenant Admin role-management payload.
- Rejected unknown or system-only permission keys during custom role create/update.
- Updated Tenant Admin role dialog from raw free-text entry to selectable catalog permissions.
- Added negative backend test proving invalid permission keys are blocked without creating the role.

### RBAC-2: Tenant Role Permission Matrix

Status: Complete locally on 2026-09-17  
Goal: replace free-text permission keys with grouped checkboxes.

Tasks:

- Update `/tenant-admin/roles` to show grouped permission checkboxes.
- Filter permissions by tenant plan/module.
- Protect system role code/activation.
- Allow Tenant Admin to update assignable permissions for allowed roles.
- Show unavailable permissions with explanation where useful.
- Preserve existing stored permission keys during transition.

Exit criteria:

- Tenant Admin can create a custom role using permission checkboxes.
- Tenant Admin cannot assign unknown, inactive, system-only, or unavailable-plan permissions. *(Complete locally for unknown/system-only/unavailable-plan keys.)*
- Role changes produce audit events with previous and new permission sets.

RBAC-2A implementation evidence:

- Replaced the flat permission selector with a grouped permission matrix.
- Added module tabs, selected-permission summary, per-module selected counts, risk labels, and permission descriptions.
- Kept the UI compact inside the existing role modal so add/update remains a single focused workflow.
- Backend catalog validation remains the final guardrail for unknown and system-only keys.

Remaining RBAC-2 work:

- Enforce tenant plan/module availability when choosing permissions. *(Complete locally using SaaS commercial entitlements.)*
- Show unavailable permissions with clear explanations after plan/module data is wired into the catalog payload. *(Complete locally.)*
- Add browser coverage for module switching and grouped permission selection. *(Complete locally.)*

RBAC-2B implementation evidence:

- Catalog payload now includes `required_entitlement`, `is_available`, and `unavailable_reason`.
- Tenant role mutations reject permissions unavailable for the tenant subscription plan.
- Permission matrix displays unavailable permissions in a muted disabled state with a plan explanation.
- Backend test proves starter-plan tenants cannot assign `payroll.review`.

RBAC-2C certification evidence:

- Browser spec verifies module-tab switching from All to Payroll.
- Browser spec verifies grouped permission selection updates the selected-permission summary.
- Browser spec verifies starter-plan payroll permission is disabled with the unavailable-plan reason.
- The plan-switch test restores the original commercial control state in a `finally` block.

### RBAC-3: Backend Permission Enforcement Foundation

Status: Partially complete locally on 2026-09-17  
Goal: create one reusable backend permission check and enforce the first critical tenant-admin APIs.

Tasks:

- Add helper: *(Complete locally in `apps.iam.permission_checks`.)*

```text
user_has_tenant_permission(user, tenant, permission_key)
```

- Add DRF permission/mixin helpers for APIViews. *(Complete locally for Tenant Admin mutation APIs.)*
- Add audit/debug metadata for denied permission.
- Enforce:
  - tenant user view/manage *(manage complete locally for invite/update mutations)*
  - tenant role view/manage *(manage complete locally for create/update/status mutations)*
  - tenant trust audit view/download
  - tenant support access request/approve
  - tenant settings change request
- Keep existing workspace role checks as outer boundary. *(Complete locally.)*

Exit criteria:

- Users without `tenant.roles.manage` cannot create/update roles.
- Users without `tenant.users.manage` cannot invite/update users.
- API denial is `403` and does not leak sensitive data.

RBAC-3A implementation evidence:

- Added reusable effective-permission resolver in `backend/apps/iam/permission_checks.py`.
- Permission resolution uses explicit `RolePermission` rows when present.
- Roles without explicit permission rows fall back to catalog default grants, preserving current system-role behavior during rollout.
- Added `TenantAdminContextMixin.require_tenant_permission(...)`.
- Enforced `tenant.roles.manage` on Tenant Admin role create/update/status APIs.
- Enforced `tenant.users.manage` on Tenant Admin membership invite/update/status APIs.
- Preserved the existing workspace role-code boundary as the first access gate.
- Added backend negative tests proving view-only tenant user/role permissions cannot mutate users or roles.

### RBAC-4: Frontend Permission Context

Status: Partially complete locally on 2026-09-17  
Goal: make menus, pages, and buttons respond to current user permissions.

Tasks:

- Add effective permission list to session/workspace payload. *(Complete locally for default tenant membership.)*
- Add frontend helpers: *(Complete locally in `workspace-access.ts`.)*

```text
hasPermission("tenant.roles.manage")
hasAnyPermission([...])
```

- Hide/disable Tenant Admin role/user actions based on permissions. *(Complete locally for Tenant Admin nav, quick links, user mutations, and role mutations.)*
- Show clear “missing permission” messages for direct route access.
- Update nav/menu visibility for Tenant Admin first.

Exit criteria:

- User with view-only role can see allowed pages but cannot mutate.
- Hidden/disabled actions are consistent with backend denial.

RBAC-4A implementation evidence:

- Added `effective_permissions` to auth session/login payload.
- Added `sessionHasPermission(...)` and `sessionHasAnyPermission(...)` frontend helpers.
- Tenant Admin sidebar and quick links now filter by permissions instead of only workspace persona.
- Tenant Admin Users page disables invite/update/status controls without `tenant.users.manage`.
- Tenant Admin Roles page disables add/edit/activate/deactivate controls without `tenant.roles.manage`.
- Tenant Admin pages now enforce page-level permissions before loading page data, so direct deep links align with permission-filtered menus.
- Added light inline permission notices so view-only users understand why actions are unavailable without causing layout shift.
- Extended Tenant Admin role browser certification to create a limited view-only tenant role, sign in as that user, verify permission-filtered menus, verify protected deep links redirect to the Tenant Admin dashboard, verify disabled role/user actions, and prove direct mutation APIs return `403`.

### RBAC-5: HR Admin Enforcement

Status: In progress; employee directory, organization master, document viewer, and leave/attendance viewer slices complete locally on 2026-09-17  
Goal: move HR Admin employee/document/leave/attendance actions to permission checks.

Tasks:

- Enforce employee directory view/create/edit/import. *(Employee API/view/create/edit complete locally; import UI visibility complete locally.)*
- Enforce employee access management. *(Employee access API/page/action visibility complete locally.)*
- Enforce organization master view/manage/import. *(Organization APIs and page controls complete locally.)*
- Enforce document category/rule/document review/export. *(Core document APIs and read-only UI controls complete locally.)*
- Enforce leave and attendance policy management. *(Core backend gates and read-only UI behavior complete locally.)*
- Enforce approval actions. *(Attendance regularization and leave balance review gates complete locally; manager leave approval surfaces pending.)*
- Update menus/buttons. *(HR Admin sidebar and employee page actions now filter from effective permissions.)*

Exit criteria:

- HR Executive custom role works with limited employee access.
- Leave Approver custom role can approve leave but cannot edit payroll or employee salary.

RBAC-5A implementation evidence:

- HR Admin backend workspace access now accepts custom roles with effective HR-domain permissions, not only the legacy `hr-admin` role code.
- Auth session `workspace_access.hr_admin` now becomes true when the default membership has HR-domain permissions such as `employees.view`.
- HR Admin layout now uses permission-based page access and filters sidebar links from item-level permission metadata.
- Employee directory page now hides create/import/edit/access/bank-account actions when the user lacks the corresponding permission.
- Employee create, edit, access, and bank account deep links now have page-level permission guards.
- Employee APIs now enforce `employees.view`, `employees.create`, `employees.edit`, and `employees.access.manage` before returning or mutating data.
- Backend proof: `test_custom_hr_employee_viewer_role_gates_employee_mutations` verifies a custom `hr-employee-viewer` role can read employees, receives HR Admin workspace access from `employees.view`, and receives `403` for create/edit/access-management calls.
- Browser proof added: `employee-directory-certification.spec.ts` creates a temporary `employees.view` role, logs in as that custom HR viewer, verifies read-only HR Admin menu/actions, and verifies backend mutation denials. Local standard run skipped without `HRMS_API_BASE_URL`; run against live/staging with:

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 npm --prefix web run test:e2e -- tests/e2e/employee-directory-certification.spec.ts -g "limited employee viewer role" --project=chromium
```

RBAC-5B remaining work:

- Apply it to Documents and document verification/export.
- Apply it to Leave and Attendance policy/approval surfaces.
- Apply it to Payroll setup, payroll inputs, statutory setup, and report export surfaces.
- Add one browser proof per major HR vertical for allowed read-only role, allowed manager/processor role, and denied mutation.

RBAC-5B implementation evidence:

- Organization snapshot, detail, and form-options APIs now require `organization.view`.
- Organization master create/update APIs now require `organization.manage`.
- Organization catalog page now opens for either `organization.view` or `organization.manage`, but hides create/edit/import controls unless `organization.manage` is present.
- Organization create/edit deep links now redirect back to the catalog when `organization.manage` is missing.
- Backend proof: `test_custom_hr_organization_viewer_role_gates_master_mutations` verifies a custom `hr-organization-viewer` role can read organization masters and receives `403` for create/update calls.
- Browser proof added: `organization-master-crud-flows.spec.ts` creates a temporary `organization.view` role, logs in as that custom organization viewer, verifies read-only Organization menu/actions, verifies create deep-link redirect, and verifies backend mutation denials. Local standard run skipped without `HRMS_API_BASE_URL`; run against live/staging with:

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 npm --prefix web run test:e2e -- tests/e2e/organization-master-crud-flows.spec.ts -g "limited organization viewer" --project=chromium
```

RBAC-5C next target:

RBAC-5C implementation evidence:

- Document options, categories, requirements, employee document list, and employee document detail now require `documents.view`.
- Document category/requirement create-update, employee document upload, and reminder actions now require `documents.manage`.
- Employee document review/update now requires `documents.verify`.
- Employee document download now requires `documents.export`.
- Document control center, category list, requirement list, employee document queue, and deep links now hide or redirect unavailable actions for read-only users.
- Backend proof: `test_custom_hr_document_viewer_role_gates_document_mutations` verifies a custom `hr-document-viewer` role can read document setup/queue data and receives `403` for category create, document verify, and reminder actions.
- Browser proof added: `employee-documents-onboarding-certification-flows.spec.ts` creates a temporary `documents.view` role, logs in as that custom document viewer, verifies read-only document queue/actions, verifies upload deep-link redirect, and verifies backend mutation denials. Local standard run skipped without `HRMS_API_BASE_URL`; run against live/staging with:

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 npm --prefix web run test:e2e -- tests/e2e/employee-documents-onboarding-certification-flows.spec.ts -g "limited document viewer" --project=chromium
```

RBAC-5D implementation evidence:

- Leave and Attendance:
  - `leave.view` now gates leave type, leave policy, leave assignment, leave balance, and leave balance transaction read endpoints.
  - `leave.policies.manage` now gates leave type/policy/assignment create, edit, detach, conflict preview, and policy preview endpoints.
  - `leave.balances.manage` now gates leave balance action and balance transaction review endpoints.
  - `attendance.view` now gates attendance operation options, shifts, holiday calendars, attendance policies, records, regularizations, assignments, roster templates, and rollout history reads.
  - `attendance.records.manage` now gates attendance record edit and bulk action endpoints.
  - `attendance.regularization.review` now gates HR regularization approve/reject endpoints.
  - `attendance.policies.manage` now gates shift, holiday calendar, attendance policy, policy assignment, shift assignment, roster template, conflict preview, policy preview, and rollout mutations.
  - Attendance records UI now keeps filters/pagination visible for read-only roles while hiding selection, edit, and bulk action controls unless `attendance.records.manage` is present.
  - Attendance regularization UI now keeps queue visibility for read-only roles while hiding review deep links and inline decisions unless `attendance.regularization.review` is present.
  - Leave balance UI now allows preview/read-only inspection while disabling commit/action/review controls unless `leave.balances.manage` is present.
  - Leave/attendance policy list pages hide create/edit controls unless the relevant `*.policies.manage` permission is present.
  - High-risk form deep links now require the matching manage/review permission before rendering.
  - Backend proof: `test_custom_hr_leave_viewer_role_gates_leave_mutations` verifies a custom `hr-leave-viewer` role can read leave setup/balances and receives `403` for leave type creation and leave balance mutation.
  - Backend proof: `test_custom_hr_attendance_viewer_role_gates_attendance_mutations` verifies a custom `hr-attendance-viewer` role can read attendance operations/records/regularizations and receives `403` for shift creation, attendance record edit, and regularization approval.

RBAC-5E implementation evidence:

- Remaining leave/attendance setup list pages now hide create/edit/governance controls for users without policy-management permission:
  - Leave policy assignments require `leave.policies.manage` for create/edit/governance previews.
  - Attendance policy assignments require `attendance.policies.manage` for create/edit/governance previews.
  - Shifts, holiday calendars, employee shift assignments, and shift roster templates require `attendance.policies.manage` for create/edit/rollout controls.
- Added `web/tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts`.
  - Browser proof creates custom `leave.view` and `attendance.view` roles dynamically through Tenant Admin role APIs.
  - Browser proof signs in as each limited HR user and verifies read-only UI on leave policies, leave assignments, leave balances, attendance records, attendance regularizations, shifts, and attendance assignments.
  - Browser proof validates backend denials for leave type creation, leave balance actions, shift creation, and attendance record bulk actions.
- Verification:
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.
  - `cd web && npx playwright test tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts --project=chromium` found both tests and skipped locally because `HRMS_API_BASE_URL` was not set. Run this command on staging with the live API env to certify browser behavior end to end.

RBAC-5F implementation evidence:

- Manager leave approval APIs now enforce explicit RBAC:
  - Manager pending leave queue and leave detail require `leave.view`.
  - Manager leave approve/reject mutations require `leave.requests.approve`.
- MSS workspace access now opens for custom roles with `leave.requests.approve` or `attendance.regularization.review`, not only the legacy `manager` role code.
- MSS approval page now reads effective permissions and keeps decision controls read-only when the user lacks the matching decision permission.
- MSS decision panel now disables decision notes/buttons and shows a light inline notice when approval/review permission is missing.
- Backend proof: `test_custom_leave_approver_role_gates_manager_leave_decisions` creates a custom leave queue viewer, proves the user can inspect manager-scoped leave requests with only `leave.view`, receives `403` for approval without `leave.requests.approve`, then receives MSS workspace access and can approve after the permission is granted.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_custom_hr_leave_viewer_role_gates_leave_mutations backend/tests/test_phase0_api_smoke.py::test_custom_leave_approver_role_gates_manager_leave_decisions backend/tests/test_phase0_api_smoke.py::test_custom_hr_attendance_viewer_role_gates_attendance_mutations -q` passed locally on 2026-09-17.
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.

RBAC-5G implementation evidence:

- Manager attendance approval APIs now mirror the same explicit RBAC posture as leave:
  - Manager pending attendance regularization queue and detail require `attendance.view`.
  - Manager attendance regularization approve/reject mutations require `attendance.regularization.review`.
- Custom attendance reviewer roles can inspect their manager-scoped pending regularizations with only `attendance.view`, but cannot approve/reject until `attendance.regularization.review` is granted.
- Backend proof: `test_custom_attendance_reviewer_role_gates_manager_regularization_decisions` creates a custom attendance queue viewer, proves queue visibility with read permission, proves direct approve API denial without review permission, then grants review permission and proves the regularization can be approved and the attendance record is marked regularized.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_custom_leave_approver_role_gates_manager_leave_decisions backend/tests/test_phase0_api_smoke.py::test_custom_attendance_reviewer_role_gates_manager_regularization_decisions backend/tests/test_phase0_api_smoke.py::test_custom_hr_attendance_viewer_role_gates_attendance_mutations -q` passed locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.

RBAC-5H implementation evidence:

- Leave and attendance approval decisions now write tenant audit-ledger evidence:
  - Leave approvals/rejections emit `leave_request_approved` / `leave_request_rejected`.
  - Attendance regularization approvals/rejections emit `attendance_regularization_approved` / `attendance_regularization_rejected`.
  - Audit events include actor identifier, previous/new status, subject ids, decision, workflow reference, source ref, and source hash.
- Backend proof now asserts audit events for custom leave and attendance approver decisions, including status transition and source hash evidence.
- Added staging-gated browser proof `mss-rbac-approver-certification.spec.ts`:
  - Creates a custom `leave.view` + `leave.requests.approve` role through Tenant Admin APIs.
  - Creates a real employee login with that custom role through HR Admin access APIs.
  - Makes that employee the reporting manager for a seeded employee.
  - Submits leave through ESS as the seeded employee.
  - Logs in as the custom approver, approves through MSS, and confirms unrelated HR employee API access remains blocked by `employees.view`.
  - Restores the seeded reporting manager mapping in cleanup.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_custom_leave_approver_role_gates_manager_leave_decisions backend/tests/test_phase0_api_smoke.py::test_custom_attendance_reviewer_role_gates_manager_regularization_decisions -q` passed locally on 2026-09-17.
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.
  - `cd web && npx playwright test tests/e2e/mss-rbac-approver-certification.spec.ts --project=chromium --list` found the staging-gated browser proof locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.

RBAC-5I implementation evidence:

- Extended staging-gated browser proof `mss-rbac-approver-certification.spec.ts`:
  - Creates a custom `attendance.view` + `attendance.regularization.review` role through Tenant Admin APIs.
  - Creates a real employee login with that custom role through HR Admin access APIs.
  - Makes that employee the reporting manager for a seeded employee.
  - Submits attendance regularization through ESS as the seeded employee.
  - Logs in as the custom attendance reviewer, verifies the MSS control center shows attendance queue and hides leave queue, approves through MSS, and confirms direct leave queue API access is blocked by `leave.view`.
  - Restores the seeded reporting manager mapping in cleanup.
- MSS control center is now domain-aware:
  - Leave cards, leave shortcuts, and leave queue counts appear only when the session has `leave.requests.approve`.
  - Attendance cards, attendance shortcuts, and attendance queue counts appear only when the session has `attendance.regularization.review`.
  - Hidden queue counts render as `Hidden` instead of exposing unrelated queue volume.
- Verification:
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.
  - `cd web && npx playwright test tests/e2e/mss-rbac-approver-certification.spec.ts --project=chromium --list` found both staging-gated browser proofs locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.

RBAC-5J implementation evidence:

- HR Admin setup mutations now write tenant audit evidence with source hashes:
  - Leave policy create/update writes `leave_policy_created` and `leave_policy_updated`.
  - Leave balance action/review writes `leave_balance_action_recorded` and `leave_balance_transaction_reviewed`.
  - Attendance policy create/update writes `attendance_policy_created` and `attendance_policy_updated`.
  - Shift create/update writes `attendance_shift_created` and `attendance_shift_updated`.
  - Attendance record edit writes `attendance_record_updated`.
- Audit snapshots include actor identifier, permission used, target object ids, action, changed fields where applicable, and previous/new status where meaningful.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_hr_admin_leave_setup_mutations_write_audit_evidence backend/tests/test_phase0_api_smoke.py::test_hr_admin_attendance_setup_mutations_write_audit_evidence -q` passed locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.

RBAC-6 next target:

- Enforce payroll, finance, statutory, and report operations with action-level permissions.
- Start with report/export APIs because they have high data sensitivity and already have export audit surfaces.
- Run the MSS RBAC approver Playwright proof on staging with `HRMS_API_BASE_URL` when staging credentials/data are ready.

### RBAC-6: Payroll, Finance, Statutory, And Reports Enforcement

Status: In progress; report export and payroll artifact download gates complete locally  
Goal: enforce high-risk payroll and finance operations.

Tasks:

- Enforce payroll input snapshot, calculation, review, lock, publish.
- Enforce payroll output download and signed access.
- Enforce finance handoff generation/transmission/acknowledgement.
- Enforce bank advice/export.
- Enforce statutory package/export/e-file readiness.
- Enforce reports view/export by category.

Exit criteria:

- Payroll Reviewer can review but not approve/lock.
- Payroll Approver can approve/lock.
- Finance Viewer can view reports but not transmit handoff.
- Report export is blocked without export permission.

RBAC-6A implementation evidence:

- Backend report export CSV endpoint now requires category export permission:
  - HR/core report exports require `reports.hr.export`.
  - Payroll, bank advice, and finance handoff reports require `reports.payroll.export`.
  - Compliance/statutory reports require `reports.compliance.export`.
- Report export audit history now requires `reports.compliance.view`.
- Report export audit writes now require the matching category export permission for the submitted `report_key`.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_hr_admin_can_persist_and_filter_report_export_audits backend/tests/test_phase0_api_smoke.py::test_report_exports_require_category_export_permissions backend/tests/test_phase0_api_smoke.py::test_report_export_audit_writes_require_report_category_export_permission -q` passed locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.

RBAC-6B implementation evidence:

- Next.js report/export proxy routes now pre-check effective permissions through `/auth/session/` before serving sensitive files:
  - `/api/hr-admin/reports/[reportKey]` requires the same category export permission as the backend.
  - Compliance summary and statutory package routes require `reports.compliance.export`.
  - Report export audit history requires `reports.compliance.view`.
- Payroll output artifact proxy routes now require `payroll.outputs.download` before forwarding download, signed-access, or access-audit export requests.
- Backend payroll artifact endpoints now enforce `payroll.outputs.download` for:
  - Artifact download.
  - Signed access issue.
  - Signed access revoke.
  - Access audit export.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_payroll_output_artifact_downloads_require_download_permission backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_outputs_generate_and_publish_locked_review backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_outputs_support_configured_signed_url_storage_strategy -q` passed locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.

RBAC-6C implementation evidence:

- Payroll input/run read APIs now require `payroll.inputs.view`.
- Payroll input/run create/edit APIs now require `payroll.inputs.manage`.
- Payroll input lock and final review lock now require `payroll.lock`.
- Draft payroll calculation now requires `payroll.calculate`.
- Payroll review setup/open/submit/exception-create/exception-decision now require `payroll.review`.
- Payroll approve/reject now requires `payroll.approve`.
- Payroll output setup requires `payroll.outputs.view`.
- Payroll output generation and publish now require `payroll.publish`.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_payroll_reviewer_role_cannot_perform_high_risk_lifecycle_actions backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_review_approves_and_final_locks_run backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_outputs_generate_and_publish_locked_review -q` passed locally on 2026-09-17.
  - `.venv/bin/python backend/manage.py check` passed locally on 2026-09-17.
  - `npm --prefix web run typecheck` passed locally on 2026-09-17.

RBAC-6D finance handoff/provider gates:

- Status: Complete locally on 2026-09-17.
- Enforced finance handoff setup/view with `finance.handoff.view` or handoff operator compatibility through `finance.handoff.create`.
- Enforced generate handoff from payroll outputs with `finance.handoff.create`.
- Enforced transmit, retry schedule, and requeue actions with `finance.handoff.transmit` or handoff operator compatibility through `finance.handoff.create`.
- Enforced acknowledgement/reconciliation with `finance.handoff.acknowledge` or handoff operator compatibility through `finance.handoff.create`.
- Enforced provider audit-pack generation with `finance.bank_advice.export` or handoff operator compatibility through `finance.handoff.create`.
- Added focused backend proof for a finance handoff viewer that can view setup data but cannot generate, transmit, retry, export audit pack, or acknowledge.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py::test_finance_handoff_viewer_role_cannot_perform_provider_actions backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_finance_handoff_generate_and_transmit -q`
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py -k "finance_handoff or payroll_provider_callback or provider_delivery_retry or provider_delivery_requeue" -q`
  - `.venv/bin/python backend/manage.py check`
  - `npm --prefix web run typecheck`

RBAC-6E statutory setup and declaration gates:

- Status: Complete locally on 2026-09-17.
- Enforced statutory setup dashboard/read APIs with `statutory.setup.view`, `statutory.setup.manage`, `statutory.declarations.view`, or `statutory.declarations.manage` depending on workspace need.
- Enforced statutory pack, component, slab, employer registration, and filing calendar mutations with `statutory.setup.manage`.
- Enforced employee statutory profile/declaration/item reads with `statutory.declarations.view` or `statutory.declarations.manage`.
- Enforced employee statutory profile/declaration/item create/edit/submit/verify/reject/lock actions with `statutory.declarations.manage`.
- Tightened HR Admin workspace access so built-in employee self-service statutory permissions do not open HR Admin statutory screens.
- Added focused backend proof for a custom statutory viewer that can inspect setup/declaration lists but cannot create statutory masters or employee statutory profiles.
- Verification:
  - `.venv/bin/pytest backend/tests/test_phase0_api_smoke.py -k "payroll_statutory or statutory_declaration" -q`
  - `.venv/bin/python backend/manage.py check`
  - `npm --prefix web run typecheck`

RBAC-6F current status:

- First frontend alignment slice is complete locally:
  - Payroll output publish and finance handoff generation controls now require their matching permissions before enabling.
  - Finance handoff transmit, acknowledge, and audit-pack controls now require their matching finance permissions before enabling.
  - Statutory setup/declaration CRUD console now collapses to read-only guidance for statutory viewer roles and only shows setup/declaration mutation forms to users with matching manage permissions.
  - Shared payroll action panel now blocks disabled/empty actions before network calls and disables action inputs when the action is unavailable.
  - HR Admin layout access gate now admits custom payroll/statutory/finance viewer roles instead of redirecting them to the public home page.
- Browser certification hook is added:
  - `web/tests/e2e/payroll-statutory-rbac-certification.spec.ts` creates temporary statutory viewer, payroll output viewer, and finance handoff viewer roles/users on a live API run.
  - The spec verifies read-only UI states and direct mutation denials for statutory setup/declarations, output publish/handoff generation, and handoff transmit/acknowledge/audit-pack actions.
- Remaining RBAC-6F target:
  - Run the new browser proof against staging after deployment.
  - Sweep remaining payroll workspaces for lifecycle buttons that still rely only on backend denial.

### RBAC-7: Manager And Employee Scope Enforcement

Status: Not started  
Goal: ensure RBAC works with ESS/MSS scope rules.

Tasks:

- Keep employee self-only access for ESS.
- Keep manager direct-report constraints for MSS.
- Add permission checks for manager approvals.
- Ensure RBAC does not override tenant/employee scope constraints.

Exit criteria:

- Manager with approval permission can approve only scoped team items.
- Employee cannot access another employee’s data even with malformed URL/API calls.

### RBAC-8: Safety, Audit, And Lockout Prevention

Status: In progress; last-admin critical permission guard and audit-diff evidence complete locally  
Goal: prevent tenant lockout and produce compliance-grade evidence.

Tasks:

- Prevent removal of last effective `tenant.roles.manage` and `tenant.users.manage` holder. Complete locally.
- Prevent deactivation of the last active tenant-admin role/membership with admin permissions. Complete locally for membership status and role reassignment flows.
- Audit previous/new permissions. Complete locally with role change summaries.
- Audit affected assigned user count.
- Add trust-audit filters for role/permission changes. Complete locally for tenant-admin role events.
- Add rollback guidance.

Exit criteria:

- Last-admin permission removal is blocked.
- Audit evidence clearly shows who changed what and when.

### RBAC-9: Full Certification

Status: Not started  
Goal: prove full RBAC works through browser and API tests.

Browser certification:

- Create custom role with selected permissions.
- Assign role to user.
- Login as limited user.
- Confirm allowed menus/actions appear.
- Confirm denied menus/actions are hidden or blocked.
- Confirm direct API calls fail.
- Confirm permission changes take effect after refresh/new login.
- Confirm plan-restricted permission cannot be assigned.
- Confirm last-admin guard.
- Confirm audit evidence.

Exit criteria:

- Zero critical/high RBAC bypasses.
- All launch-critical routes have backend permission checks.
- All launch-critical UI actions match backend permission behavior.

## Progress Log

| Date | Phase | Status | Evidence |
| --- | --- | --- | --- |
| 2026-09-17 | Baseline | Complete | TA-8 implemented custom role CRUD locally; permission storage exists but enforcement/catalog/matrix are still pending. |
| 2026-09-17 | RBAC-0 Catalog Freeze And Mapping | Complete | First production permission catalog, route mapping, API mapping, and default system role grants are documented in this plan. No enforcement code changed in this phase. |
| 2026-09-17 | RBAC-1A Code-Backed Permission Catalog | Complete locally | Added `apps.iam.permission_catalog`, exposed catalog in Tenant Admin payload, switched role dialog to catalog selections, and blocked unknown permission keys in backend role mutations. |
| 2026-09-17 | RBAC-2A Tenant Role Permission Matrix UX | Complete locally | Role dialog now groups permissions by module, shows selected counts, risk labels, and descriptions while keeping backend catalog validation active. |
| 2026-09-17 | RBAC-2B Plan-Aware Permission Availability | Complete locally | Catalog payload marks unavailable permissions by tenant entitlement; backend rejects unavailable-plan permission assignment; starter-plan payroll denial is covered by tests. |
| 2026-09-17 | RBAC-2C Browser Matrix Certification | Complete locally | Tenant Admin role spec now covers module switching, selected summary, and disabled unavailable-plan payroll permission with restore-safe plan switching. |
| 2026-09-17 | RBAC-3A Tenant Admin Mutation Enforcement | Complete locally | Added reusable permission resolver and enforced `tenant.roles.manage` / `tenant.users.manage` on role and membership mutation APIs; focused backend smoke is green. |
| 2026-09-17 | RBAC-4A Tenant Admin Permission-Aware UI | Complete locally | Session payload now carries effective permissions; Tenant Admin nav, quick links, role actions, and user actions respond to permission grants. Browser spec now covers limited role menu/action/API denial and skips locally without live API env. |
| 2026-09-17 | RBAC-5A Tenant Admin Remaining Gates | Complete locally | Enforced `tenant.change_requests.manage`, `tenant.support_access.request`, `tenant.support_access.approve`, `tenant.audit.view`, `tenant.audit.export`, and `tenant.security.view`; plan/settings/support/trust-audit UI now hides or disables sensitive actions by permission. |
| 2026-09-17 | RBAC-5A HR Employee Directory Gates | Complete locally | Employee APIs and pages enforce/view-hide `employees.view`, `employees.create`, `employees.edit`, `employees.import`, and `employees.access.manage`; focused backend smoke is green. |
| 2026-09-17 | RBAC-5B HR Organization Gates | Complete locally | Organization snapshot/detail/options/list pages enforce `organization.view`; create/edit/import controls and APIs require `organization.manage`; focused backend smoke is green. |
| 2026-09-17 | RBAC-5C HR Document Gates | Complete locally | Document setup, queue, verification, reminder, and download APIs/pages enforce `documents.view`, `documents.manage`, `documents.verify`, and `documents.export`; focused backend smoke is green. |
| 2026-09-17 | RBAC-5D HR Leave And Attendance Gates | Complete locally | Leave/attendance setup/read endpoints and high-risk mutations now enforce `leave.view`, `leave.policies.manage`, `leave.balances.manage`, `attendance.view`, `attendance.records.manage`, `attendance.regularization.review`, and `attendance.policies.manage`; focused backend smoke and web typecheck are green. |
| 2026-09-17 | RBAC-5E HR Leave And Attendance Browser Proof | Complete locally | Remaining leave/attendance setup list pages now hide privileged controls for read-only roles; added a focused Playwright spec that dynamically creates leave/attendance viewer roles, signs in as limited HR users, checks read-only UI, and proves backend mutation denials. |
| 2026-09-17 | RBAC-5F Manager Leave Approval Gates | Complete locally | MSS leave queue/detail now require `leave.view`; approve/reject requires `leave.requests.approve`; custom approver roles can receive MSS workspace access without fixed `manager` role code; focused backend smoke, web typecheck, and Django check are green. |
| 2026-09-17 | RBAC-5G Manager Attendance Approval Gates | Complete locally | MSS attendance regularization queue/detail now require `attendance.view`; approve/reject requires `attendance.regularization.review`; custom attendance reviewer roles are proven with focused backend smoke and Django check. |
| 2026-09-17 | RBAC-5H MSS Approval Audit And Leave Browser Proof | Complete locally | Leave and attendance decision services now write tenant audit events with source hashes; backend smoke asserts audit evidence; staging-gated browser proof creates a custom leave approver and approves through MSS while unrelated HR access remains denied. |
| 2026-09-17 | RBAC-5I MSS Attendance Browser Proof And Domain-Aware Control Center | Complete locally | Staging-gated browser proof now covers custom attendance reviewer approval through MSS; MSS control center hides leave or attendance queues when the custom role lacks that approval domain. |
| 2026-09-17 | RBAC-5J HR Setup Audit Evidence | Complete locally | Leave policy, leave balance, attendance policy, shift, and attendance record setup mutations now write tenant audit events with source hashes; focused backend smoke, Django check, and web typecheck are green. |
| 2026-09-17 | RBAC-6A Report Export Backend Gates | Complete locally | Backend report export CSV and export-audit evidence APIs now enforce HR/payroll/compliance category export/view permissions; focused backend smoke, Django check, and web typecheck are green. |
| 2026-09-17 | RBAC-6B Report Proxy And Payroll Artifact Download Gates | Complete locally | Next.js report/package/export-audit proxy routes now pre-check effective permissions, and backend payroll artifact download/signed-access/access-audit endpoints require `payroll.outputs.download`; focused backend smoke, Django check, and web typecheck are green. |
| 2026-09-17 | RBAC-6C Payroll Lifecycle Gates | Complete locally | Payroll input, calculation, review, approval, lock, output setup, generate, and publish APIs now enforce granular payroll permissions; custom payroll reviewer proof plus admin happy paths are green. |
| 2026-09-17 | RBAC-6D Finance Handoff And Provider Action Gates | Complete locally | Finance handoff setup, generate, transmit, acknowledge, provider retry/requeue, and provider audit-pack generation now enforce granular finance permissions; finance viewer denial proof plus provider callback/retry regression slice are green. |
| 2026-09-17 | RBAC-6E Statutory Setup And Declaration Gates | Complete locally | Statutory setup/read APIs, setup master mutations, and employee statutory profile/declaration actions now enforce statutory permissions; statutory viewer denial proof and statutory workflow slice are green. |
| 2026-09-17 | RBAC-6F Payroll/Statutory Frontend Action Alignment Slice 1 | Complete locally | Payroll output publish/handoff controls, finance handoff transmit/ack/audit-pack controls, statutory CRUD console visibility, and HR Admin layout access now reflect effective permissions; web typecheck is green. |
| 2026-09-17 | RBAC-6F Payroll/Statutory Browser Proof Hook | Complete locally | Added staging-gated Playwright proof for statutory viewer, payroll output viewer, and finance handoff viewer read-only behavior plus backend denial checks; local run skips cleanly without `HRMS_API_BASE_URL`. |
| 2026-09-17 | RBAC-6F Employee-backed Payroll/Statutory Personas | Complete locally | Staging failure showed HR Admin payroll/statutory setup endpoints require an active employee context, and the seeded admin lacked `employees.create`. Updated the browser proof to create/reuse temporary setup roles with `employees.create` and `employees.access.manage`, attach setup access to the seed admin membership, create a real employee, and provision access before logging in as each limited RBAC persona. The proof is idempotent across staging retries and has a longer timeout for live navigation. Local web typecheck passed and local no-env Playwright skip remains clean. |
| 2026-09-17 | RBAC-6F Payroll/Statutory Staging Proof | Complete on patched local UI against staging API | `HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_PORT=3117 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 npx playwright test tests/e2e/payroll-statutory-rbac-certification.spec.ts --project=chromium --workers=1` passed `3/3`. The spec now temporarily switches the tenant to `enterprise` during each case, restores the original commercial state afterward, and verifies statutory read-only, payroll output publish/handoff denials, and finance handoff transmit/ack/audit-pack denials. Product fix: Payroll Outputs now displays/checks `payroll.publish`, matching backend enforcement. |
| 2026-09-17 | RBAC-7A Payroll Lifecycle Permission-Aware UI And Browser Proof | Complete on patched local UI against staging API | Payroll Inputs, Payroll Calculations, and Payroll Review now disable high-risk lifecycle controls by effective permissions. New staging-gated browser proof passed `3/3` against staging API on patched local UI: input viewer cannot manage runs/snapshots/locks, payroll reviewer cannot calculate draft payroll, and review-only user cannot approve, final-lock, or generate outputs. Direct API denial checks verify `payroll.inputs.manage`, `payroll.lock`, `payroll.calculate`, `payroll.approve`, and `payroll.publish`. |
| 2026-09-17 | RBAC-7A Payroll Lifecycle Direct Staging Proof | Complete on deployed staging | Post-deployment Playwright proof passed `3/3` on staging for payroll input viewer, payroll calculation reviewer, and payroll review-only personas. This closes the deployment verification gap for payroll lifecycle permission-aware UI and backend denials. |
| 2026-09-17 | RBAC-8A Last Admin Critical Permission Guard | Complete locally | Role edits and membership role/status changes now block changes that would leave zero active holders of `tenant.users.manage` or `tenant.roles.manage`; focused backend smoke is green and guarded browser proof is added behind `HRMS_ENABLE_RBAC_LOCKOUT_BROWSER_PROOF=1`. |
| 2026-09-17 | RBAC-8B Tenant Admin Audit Diff Evidence | Complete locally | Role and membership mutations now write explicit `change_summary` audit evidence for previous/new permissions, added/removed permissions, critical permission changes, previous/new roles, and added/removed role assignments. Tenant trust-audit `tenant_admin` group now includes role create/update/activate/deactivate events. Focused backend smoke, Django check, and web typecheck are green. |
| 2026-09-17 | RBAC-8B Deployed Tenant Admin Audit Evidence Proof | Complete on deployed staging | Deployed API proof created a tenant role and confirmed the event appears in `/api/v1/tenant-admin/trust-audit/?event_group=tenant_admin` with `change_summary` including previous/new permission keys and added permissions. Non-destructive Tenant Admin browser certification passed `3/3` on staging; guarded last-admin destructive proof remains deferred for a disposable tenant because the shared staging tenant has multiple active admin holders and setup/cleanup mutations time out under live load. |

## Current Known Gaps

| Gap | Risk | Target Phase |
| --- | --- | --- |
| Platform Admin permission catalog UI is not yet available | Platform team cannot browse/manage catalog from the console yet | RBAC-1B/RBAC-2 |
| Backend permission helper now covers Tenant Admin, core HR employee/org/document/leave/attendance APIs, report export evidence, payroll lifecycle, payroll output artifact downloads, finance handoff/provider actions, and statutory setup/declaration APIs | Remaining risk is certification breadth, not a known launch-critical backend gap in these slices | RBAC-9 |
| Frontend permission context is implemented for Tenant Admin, MSS approvals/control center, core HR employee/org/document/leave/attendance pages, payroll/statutory output/handoff/statutory setup action slices, and payroll lifecycle workspaces | Remaining risk is broader regression breadth and Platform Admin catalog ergonomics; payroll/statutory and payroll lifecycle viewer proofs are green on staging | RBAC-8/RBAC-9 |
| Last-admin guard and audit-diff evidence exist for Tenant Admin role/member mutations; destructive browser proof should run on a disposable tenant | Tenant lockout is blocked locally and audit evidence is readable on staging; shared staging is not ideal for the destructive last-admin mutation proof | RBAC-8/RBAC-9 |

## Working Definition Of Done

A permission-controlled feature is complete only when:

- Required permission is documented.
- Backend API checks that permission.
- Frontend UI reflects that permission.
- Wrong-role and missing-permission tests exist.
- Audit evidence exists for mutations.
- Direct API bypass attempts are denied.
- Mobile/desktop UI remains aligned.
- Existing system-role users continue to work through default templates.
