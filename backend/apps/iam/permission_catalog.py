"""Product-owned permission catalog for tenant-scoped RBAC.

The catalog is intentionally code-backed for the first RBAC phase so permission
keys are deterministic, reviewable, and deployable with application code. A
future phase can move these rows to database-backed Platform Admin management
without changing the public payload shape.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PermissionDefinition:
    key: str
    label: str
    module: str
    description: str
    risk_level: str = "medium"
    tenant_assignable: bool = True
    required_module: str = ""
    required_plan: str = ""
    default_role_codes: tuple[str, ...] = ()

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "module": self.module,
            "description": self.description,
            "risk_level": self.risk_level,
            "tenant_assignable": self.tenant_assignable,
            "required_module": self.required_module,
            "required_plan": self.required_plan,
            "default_role_codes": list(self.default_role_codes),
        }


PERMISSION_CATALOG: tuple[PermissionDefinition, ...] = (
    PermissionDefinition("tenant.dashboard.view", "View tenant control center", "Tenant Admin", "Open the tenant account dashboard.", "low", True, "tenant-admin", "", ("tenant-admin", "hr-admin")),
    PermissionDefinition("tenant.users.view", "View tenant users", "Tenant Admin", "View tenant memberships and role assignments.", "medium", True, "tenant-admin", "", ("tenant-admin", "hr-admin")),
    PermissionDefinition("tenant.users.manage", "Manage tenant users", "Tenant Admin", "Invite, activate, suspend, revoke, and update tenant users.", "high", True, "tenant-admin", "", ("tenant-admin", "hr-admin")),
    PermissionDefinition("tenant.roles.view", "View tenant roles", "Tenant Admin", "View tenant role definitions and coverage.", "medium", True, "tenant-admin", "", ("tenant-admin", "hr-admin")),
    PermissionDefinition("tenant.roles.manage", "Manage tenant roles", "Tenant Admin", "Create and update tenant custom roles.", "critical", True, "tenant-admin", "", ("tenant-admin", "hr-admin")),
    PermissionDefinition("tenant.plan.view", "View plan and subscription", "Tenant Admin", "View plan, subscription, usage, and limits.", "low", True, "tenant-admin", "", ("tenant-admin",)),
    PermissionDefinition("tenant.change_requests.manage", "Manage tenant change requests", "Tenant Admin", "Create and manage governed account change requests.", "medium", True, "tenant-admin", "", ("tenant-admin",)),
    PermissionDefinition("tenant.setup.view", "View setup guide", "Tenant Admin", "View launch setup guidance and readiness.", "low", True, "tenant-admin", "", ("tenant-admin",)),
    PermissionDefinition("tenant.support_access.request", "Request support access", "Tenant Admin", "Request scoped support access grants.", "medium", True, "tenant-admin", "", ("tenant-admin",)),
    PermissionDefinition("tenant.support_access.approve", "Approve support access", "Tenant Admin", "Approve, start, end, or revoke support access grants.", "high", True, "tenant-admin", "", ("tenant-admin",)),
    PermissionDefinition("tenant.audit.view", "View trust audit", "Tenant Admin", "View tenant audit evidence.", "medium", True, "audit", "", ("tenant-admin",)),
    PermissionDefinition("tenant.audit.export", "Export trust audit", "Tenant Admin", "Download tenant audit evidence packs.", "high", True, "audit", "", ("tenant-admin",)),
    PermissionDefinition("tenant.security.view", "View security readiness", "Tenant Admin", "View enterprise security readiness.", "medium", True, "security", "", ("tenant-admin",)),
    PermissionDefinition("tenant.settings.view", "View tenant settings", "Tenant Admin", "View tenant settings and governed account controls.", "low", True, "tenant-admin", "", ("tenant-admin",)),
    PermissionDefinition("employees.view", "View employees", "HR", "View employee records.", "medium", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("employees.create", "Create employees", "HR", "Create employee records.", "high", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("employees.edit", "Edit employees", "HR", "Edit employee records.", "high", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("employees.import", "Import employees", "HR", "Bulk import employee records.", "high", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("employees.access.manage", "Manage employee access", "HR/IAM", "Manage employee workspace access and role assignments.", "critical", True, "iam", "", ("hr-admin", "tenant-admin")),
    PermissionDefinition("organization.view", "View organization setup", "HR Setup", "View legal entities, branches, departments, and other masters.", "low", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("organization.manage", "Manage organization setup", "HR Setup", "Create and update organization masters.", "high", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("documents.view", "View documents", "Documents", "View employee documents.", "medium", True, "documents", "", ("hr-admin", "employee")),
    PermissionDefinition("documents.manage", "Manage document setup", "Documents", "Manage document categories and requirements.", "high", True, "documents", "", ("hr-admin",)),
    PermissionDefinition("documents.verify", "Verify documents", "Documents", "Verify employee document submissions.", "high", True, "documents", "", ("hr-admin",)),
    PermissionDefinition("documents.export", "Export document compliance", "Documents", "Export document compliance evidence.", "high", True, "documents", "", ("hr-admin",)),
    PermissionDefinition("leave.view", "View leave", "Leave", "View leave balances, requests, and policies.", "low", True, "leave", "", ("hr-admin", "manager", "employee")),
    PermissionDefinition("leave.requests.create", "Create leave requests", "Leave", "Create self-service leave requests.", "low", True, "leave", "", ("employee",)),
    PermissionDefinition("leave.requests.approve", "Approve leave requests", "Leave", "Approve or reject leave requests.", "high", True, "leave", "", ("manager", "hr-admin")),
    PermissionDefinition("leave.policies.manage", "Manage leave policies", "Leave", "Create and update leave policies and assignments.", "high", True, "leave", "", ("hr-admin",)),
    PermissionDefinition("attendance.view", "View attendance", "Attendance", "View attendance records and summaries.", "low", True, "attendance", "", ("hr-admin", "manager", "employee")),
    PermissionDefinition("attendance.records.manage", "Manage attendance records", "Attendance", "Create and update attendance records.", "high", True, "attendance", "", ("hr-admin",)),
    PermissionDefinition("attendance.regularization.request", "Request attendance regularization", "Attendance", "Create self-service attendance regularization requests.", "low", True, "attendance", "", ("employee",)),
    PermissionDefinition("attendance.regularization.review", "Review attendance regularization", "Attendance", "Approve or reject attendance regularization requests.", "high", True, "attendance", "", ("manager", "hr-admin")),
    PermissionDefinition("attendance.policies.manage", "Manage attendance policies", "Attendance", "Manage attendance policies, shifts, and rosters.", "high", True, "attendance", "", ("hr-admin",)),
    PermissionDefinition("lifecycle.view", "View lifecycle", "Lifecycle", "View onboarding, movement, probation, and exit queues.", "medium", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("lifecycle.manage", "Manage lifecycle", "Lifecycle", "Manage onboarding, movement, probation, and exit actions.", "high", True, "hr", "", ("hr-admin",)),
    PermissionDefinition("letters.generate", "Generate letters", "Documents", "Generate HR letters.", "medium", True, "documents", "", ("hr-admin",)),
    PermissionDefinition("notifications.view", "View notifications", "Notifications", "View notifications.", "low", True, "notifications", "", ("hr-admin", "manager", "employee")),
    PermissionDefinition("notifications.manage", "Manage notifications", "Notifications", "Manage notification templates and events.", "high", True, "notifications", "", ("hr-admin",)),
    PermissionDefinition("payroll.setup.view", "View payroll setup", "Payroll", "View payroll setup, rules, and provider readiness.", "medium", True, "payroll", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("payroll.setup.manage", "Manage payroll setup", "Payroll", "Manage payroll setup and rules.", "critical", True, "payroll", "", ("hr-admin",)),
    PermissionDefinition("payroll.inputs.view", "View payroll inputs", "Payroll", "View payroll inputs and snapshots.", "medium", True, "payroll", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("payroll.inputs.manage", "Manage payroll inputs", "Payroll", "Manage payroll inputs and snapshots.", "high", True, "payroll", "", ("hr-admin",)),
    PermissionDefinition("payroll.calculate", "Run payroll calculation", "Payroll", "Run payroll draft calculations.", "critical", True, "payroll", "", ("hr-admin",)),
    PermissionDefinition("payroll.review", "Review payroll", "Payroll", "Review payroll runs and exceptions.", "high", True, "payroll", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("payroll.approve", "Approve payroll", "Payroll", "Approve payroll reviews.", "critical", True, "payroll", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("payroll.lock", "Lock payroll", "Payroll", "Lock payroll inputs or reviews.", "critical", True, "payroll", "", ("hr-admin",)),
    PermissionDefinition("payroll.publish", "Publish payroll", "Payroll", "Publish payroll outputs and payslips.", "critical", True, "payroll", "", ("hr-admin",)),
    PermissionDefinition("payroll.outputs.view", "View payroll outputs", "Payroll", "View payroll output batches and artifacts.", "high", True, "payroll", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("payroll.outputs.download", "Download payroll outputs", "Payroll", "Download payroll output artifacts.", "critical", True, "payroll", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("finance.handoff.view", "View finance handoff", "Finance", "View finance handoff status and exceptions.", "medium", True, "finance", "", ("payroll-finance-manager",)),
    PermissionDefinition("finance.handoff.create", "Create finance handoff", "Finance", "Generate finance handoff from payroll outputs.", "critical", True, "finance", "", ("hr-admin",)),
    PermissionDefinition("finance.handoff.transmit", "Transmit finance handoff", "Finance", "Transmit finance handoff.", "critical", True, "finance", "", ("payroll-finance-manager",)),
    PermissionDefinition("finance.handoff.acknowledge", "Acknowledge finance handoff", "Finance", "Acknowledge finance handoff receipt.", "high", True, "finance", "", ("payroll-finance-manager",)),
    PermissionDefinition("finance.bank_advice.export", "Export bank advice", "Finance", "Export bank advice files.", "critical", True, "finance", "", ("payroll-finance-manager",)),
    PermissionDefinition("statutory.setup.view", "View statutory setup", "Statutory", "View statutory setup and readiness.", "medium", True, "statutory", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("statutory.setup.manage", "Manage statutory setup", "Statutory", "Manage statutory packs, components, registrations, slabs, and calendars.", "high", True, "statutory", "", ("hr-admin",)),
    PermissionDefinition("statutory.declarations.view", "View statutory declarations", "Statutory", "View statutory declarations.", "medium", True, "statutory", "", ("hr-admin", "employee")),
    PermissionDefinition("statutory.declarations.manage", "Manage statutory declarations", "Statutory", "Manage and verify statutory declarations.", "high", True, "statutory", "", ("hr-admin",)),
    PermissionDefinition("statutory.filing.view", "View statutory filing", "Statutory", "View statutory filing readiness.", "medium", True, "statutory", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("statutory.filing.export", "Export statutory filing", "Statutory", "Export statutory filing packages.", "critical", True, "statutory", "", ("payroll-finance-manager",)),
    PermissionDefinition("statutory.efile.prepare", "Prepare statutory e-file", "Statutory", "Prepare e-file packages.", "critical", True, "statutory", "", ("payroll-finance-manager",)),
    PermissionDefinition("reports.catalog.view", "View report catalog", "Reports", "View report catalog.", "low", True, "reports", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("reports.hr.view", "View HR reports", "Reports", "View HR reports.", "medium", True, "reports", "", ("hr-admin",)),
    PermissionDefinition("reports.hr.export", "Export HR reports", "Reports", "Export HR reports.", "high", True, "reports", "", ("hr-admin",)),
    PermissionDefinition("reports.payroll.view", "View payroll reports", "Reports", "View payroll reports.", "high", True, "reports", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("reports.payroll.export", "Export payroll reports", "Reports", "Export payroll reports.", "critical", True, "reports", "", ("payroll-finance-manager",)),
    PermissionDefinition("reports.compliance.view", "View compliance reports", "Reports", "View compliance reports.", "high", True, "reports", "", ("hr-admin", "payroll-finance-manager")),
    PermissionDefinition("reports.compliance.export", "Export compliance reports", "Reports", "Export compliance reports.", "critical", True, "reports", "", ("payroll-finance-manager",)),
    PermissionDefinition("audit.hr.view", "View HR audit", "Audit", "View HR audit evidence.", "high", True, "audit", "", ("hr-admin",)),
    PermissionDefinition("support.console.view", "View support console", "Support", "View support console under approved support grants.", "high", False, "support", "", ("support-agent",)),
    PermissionDefinition("platform.tenants.manage", "Manage tenants", "Platform Admin", "Create, update, and activate tenants.", "critical", False, "platform", "", ("platform-admin",)),
    PermissionDefinition("platform.leads.manage", "Manage public leads", "Platform Admin", "Review and convert public signup leads.", "high", False, "platform", "", ("platform-admin",)),
    PermissionDefinition("platform.policy_packs.manage", "Manage policy packs", "Platform Admin", "Manage platform baseline policy packs.", "critical", False, "platform", "", ("platform-admin",)),
    PermissionDefinition("platform.permission_catalog.manage", "Manage permission catalog", "Platform Admin", "Manage platform permission definitions.", "critical", False, "platform", "", ("platform-admin",)),
)

PERMISSION_CATALOG_BY_KEY = {item.key: item for item in PERMISSION_CATALOG}


def get_permission_catalog() -> list[dict]:
    return [item.as_dict() for item in PERMISSION_CATALOG]


def get_tenant_assignable_permission_keys() -> set[str]:
    return {item.key for item in PERMISSION_CATALOG if item.tenant_assignable}


def get_permission_definition(key: str) -> PermissionDefinition | None:
    return PERMISSION_CATALOG_BY_KEY.get(key)
