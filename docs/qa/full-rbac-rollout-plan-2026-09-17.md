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
- Added light inline permission notices so view-only users understand why actions are unavailable without causing layout shift.
- Extended Tenant Admin role browser certification to create a limited view-only tenant role, sign in as that user, verify permission-filtered menus, verify disabled role/user actions, and prove direct mutation APIs return `403`.

### RBAC-5: HR Admin Enforcement

Status: Not started  
Goal: move HR Admin employee/document/leave/attendance actions to permission checks.

Tasks:

- Enforce employee directory view/create/edit/import.
- Enforce employee access management.
- Enforce document category/rule/document review/export.
- Enforce leave and attendance policy management.
- Enforce approval actions.
- Update menus/buttons.

Exit criteria:

- HR Executive custom role works with limited employee access.
- Leave Approver custom role can approve leave but cannot edit payroll or employee salary.

### RBAC-6: Payroll, Finance, Statutory, And Reports Enforcement

Status: Not started  
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

Status: Not started  
Goal: prevent tenant lockout and produce compliance-grade evidence.

Tasks:

- Prevent removal of last effective `tenant.roles.manage` and `tenant.users.manage` holder.
- Prevent deactivation of the last active tenant-admin role/membership with admin permissions.
- Audit previous/new permissions.
- Audit affected assigned user count.
- Add trust-audit filters for role/permission changes.
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

## Current Known Gaps

| Gap | Risk | Target Phase |
| --- | --- | --- |
| Platform Admin permission catalog UI is not yet available | Platform team cannot browse/manage catalog from the console yet | RBAC-1B/RBAC-2 |
| Backend permission helper only covers first Tenant Admin mutation APIs | HR, payroll, reports, trust-audit download, support access, and settings still need permission enforcement | RBAC-3/RBAC-5/RBAC-6 |
| No frontend permission context | UI cannot yet hide/disable by granular permission | RBAC-4 |
| Payroll/report exports not permission-protected at action level | High-risk operations need explicit permission checks | RBAC-6 |
| Last-admin permission safety missing | Tenant could accidentally remove admin capability once permissions are enforced | RBAC-8 |

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
