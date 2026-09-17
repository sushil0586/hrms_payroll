"""Default workspace menu catalog for DB-backed navigation."""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class MenuDefinition:
    workspace: str
    group: str
    kind: str
    href: str
    label: str
    short_label: str
    blurb: str
    permission_keys: tuple[str, ...]
    sort_order: int


MENU_DEFINITIONS: tuple[MenuDefinition, ...] = (
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin", "Dashboard", "DB", "Action queue", tuple(), 10),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/leads", "Leads", "LD", "Signup requests", tuple(), 20),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/tenants", "Tenants", "TN", "Customer registry", tuple(), 30),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/onboarding", "Launch Checklist", "LC", "Readiness gates", tuple(), 40),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/admins", "Tenant Admin Users", "TA", "Login access", tuple(), 50),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/policy-packs", "Setup Templates", "ST", "Default setup", tuple(), 60),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/permissions", "Permissions", "PM", "RBAC catalog", ("platform.permission_catalog.manage",), 70),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/audit-logs", "Audit Logs", "AU", "Action evidence", tuple(), 80),
    MenuDefinition("platform-admin", "Quick Links", "quick_link", "/", "Home", "", "", tuple(), 10),
    MenuDefinition("platform-admin", "Quick Links", "quick_link", "/platform-admin", "Tenants", "", "", tuple(), 20),
    MenuDefinition("platform-admin", "Quick Links", "quick_link", "/platform-admin/policy-packs", "Templates", "", "", tuple(), 30),

    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin", "Dashboard", "DB", "Account posture", ("tenant.dashboard.view",), 10),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/users", "Users", "US", "Invites and roles", ("tenant.users.view", "tenant.users.manage"), 20),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/roles", "Roles", "RO", "Access design", ("tenant.roles.view", "tenant.roles.manage"), 30),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/plan", "Plan", "PL", "Subscription", ("tenant.plan.view",), 40),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/setup", "Setup Guide", "SG", "Launch steps", ("tenant.setup.view",), 50),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/support-access", "Support Access", "SA", "Assisted operations", ("tenant.support_access.request", "tenant.support_access.approve"), 60),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/trust-audit", "Trust Audit", "TA", "Evidence review", ("tenant.audit.view", "tenant.audit.export"), 70),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/settings", "Settings", "ST", "Account controls", ("tenant.settings.view",), 80),
    MenuDefinition("tenant-admin", "Workspace", "sidebar", "/tenant-admin/security-readiness", "Security", "SE", "Enterprise readiness", ("tenant.security.view",), 90),
    MenuDefinition("tenant-admin", "Quick Links", "quick_link", "/", "Home", "", "", tuple(), 10),
    MenuDefinition("tenant-admin", "Quick Links", "quick_link", "/tenant-admin", "Tenant", "", "", ("tenant.dashboard.view",), 20),
    MenuDefinition("tenant-admin", "Quick Links", "quick_link", "/tenant-admin/setup", "Setup guide", "", "", ("tenant.setup.view",), 30),
    MenuDefinition("tenant-admin", "Quick Links", "quick_link", "/tenant-admin/trust-audit", "Trust audit", "", "", ("tenant.audit.view", "tenant.audit.export"), 40),
    MenuDefinition("tenant-admin", "Quick Links", "quick_link", "/tenant-admin/security-readiness", "Security", "", "", ("tenant.security.view",), 50),

    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin", "Overview", "OV", "Executive snapshot", ("employees.view", "organization.view", "payroll.review", "reports.catalog.view"), 10),
    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin/employees", "People", "PE", "Employee masters", ("employees.view", "employees.create", "employees.edit", "employees.import", "employees.access.manage"), 20),
    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin/lifecycle", "Lifecycle", "LC", "Join to exit queue", ("lifecycle.view", "lifecycle.manage"), 30),
    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin/employee-documents", "Documents", "DO", "Verification backlog", ("documents.view", "documents.manage", "documents.verify"), 40),
    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin/reports", "Reports", "RP", "Operational insights", ("reports.catalog.view", "reports.hr.view", "reports.payroll.view", "reports.compliance.view"), 50),
    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin/payroll-readiness", "Payroll", "PY", "Source readiness", ("payroll.inputs.view", "payroll.review", "payroll.outputs.view"), 60),
    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin/payroll-statutory", "Statutory", "ST", "Tax proof review", ("statutory.setup.view", "statutory.filing.view"), 70),
    MenuDefinition("hr-admin", "Workspace", "sidebar", "/hr-admin/payroll-providers", "Providers", "PV", "Payroll integrations", ("payroll.setup.view", "payroll.setup.manage"), 80),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/attendance-operations", "Attendance", "AT", "Shifts and review windows", ("attendance.view", "attendance.records.manage", "attendance.regularization.review"), 110),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/notifications-admin", "Notifications", "NT", "Events and delivery", ("notifications.view", "notifications.manage"), 120),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/launch-remediation", "Launch", "LA", "Release gate actions", ("organization.view", "employees.view", "payroll.review"), 130),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/saas-control-plane", "SaaS", "SA", "Plan and usage gates", ("tenant.plan.view", "tenant.change_requests.manage"), 140),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/saas-operations", "Ops Health", "OH", "Tenant health signals", ("audit.hr.view", "reports.hr.view"), 150),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/saas-resilience", "Resilience", "RS", "Backup and retention", ("audit.hr.view",), 160),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/saas-sla-operations", "SLA Ops", "SL", "Incidents and breach posture", ("audit.hr.view",), 170),
    MenuDefinition("hr-admin", "Governance", "sidebar", "/hr-admin/organization", "Organization", "OR", "Structures and masters", ("organization.view", "organization.manage"), 210),
    MenuDefinition("hr-admin", "Governance", "sidebar", "/hr-admin/policies", "Policies", "PO", "Leave and attendance rules", ("leave.policies.manage", "attendance.policies.manage"), 220),
    MenuDefinition("hr-admin", "Governance", "sidebar", "/hr-admin/workflows", "Workflows", "WF", "Approval templates", ("lifecycle.manage",), 230),
    MenuDefinition("hr-admin", "Quick Links", "quick_link", "/ess", "ESS", "", "", tuple(), 10),
    MenuDefinition("hr-admin", "Quick Links", "quick_link", "/mss/approvals", "MSS", "", "", tuple(), 20),

    MenuDefinition("ess", "Workspace", "sidebar", "/ess", "Overview", "OV", "Self service", ("leave.view", "attendance.view", "documents.view", "notifications.view"), 10),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/payslips", "Payslips", "PS", "Payroll files", tuple(), 20),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/statutory-declarations", "Tax Declarations", "TD", "Proof status", ("statutory.declarations.view", "statutory.declarations.manage"), 30),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/notifications", "Notifications", "NT", "Alerts and updates", ("notifications.view",), 40),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/documents", "Documents", "DO", "Required uploads", ("documents.view",), 50),
    MenuDefinition("ess", "Quick Links", "quick_link", "/ess/payslips", "Payslips", "", "", tuple(), 10),
    MenuDefinition("ess", "Quick Links", "quick_link", "/ess/statutory-declarations", "Tax", "", "", ("statutory.declarations.view", "statutory.declarations.manage"), 20),
    MenuDefinition("ess", "Quick Links", "quick_link", "/ess/notifications", "Inbox", "", "", ("notifications.view",), 30),

    MenuDefinition("mss", "Workspace", "sidebar", "/mss", "Control Center", "CC", "Team action snapshot", ("leave.requests.approve", "attendance.regularization.review"), 10),
    MenuDefinition("mss", "Workspace", "sidebar", "/mss/approvals", "Approvals", "AP", "Pending decisions", ("leave.requests.approve", "attendance.regularization.review"), 20),
    MenuDefinition("mss", "Workspace", "sidebar", "/mss/notifications", "Notifications", "NT", "Manager alerts", ("notifications.view",), 30),
    MenuDefinition("mss", "Workspace", "sidebar", "/ess", "Self service", "SS", "Personal view", tuple(), 40),
    MenuDefinition("mss", "Quick Links", "quick_link", "/ess", "ESS", "", "", tuple(), 10),
    MenuDefinition("mss", "Quick Links", "quick_link", "/ess/notifications", "Inbox", "", "", ("notifications.view",), 20),

    MenuDefinition("finance-manager", "Finance Control", "sidebar", "/finance-manager", "Control Center", "CC", "Close, payout, and compliance", ("finance.handoff.view", "reports.payroll.view"), 10),
    MenuDefinition("finance-manager", "Finance Control", "sidebar", "/finance-manager#payments", "Payments", "PY", "Bank advice and delivery", ("finance.bank_advice.export", "finance.handoff.transmit"), 20),
    MenuDefinition("finance-manager", "Finance Control", "sidebar", "/finance-manager#compliance", "Compliance", "CO", "Statutory filing posture", ("statutory.filing.view", "statutory.filing.export"), 30),
    MenuDefinition("finance-manager", "Finance Control", "sidebar", "/finance-manager#audit", "Audit", "AU", "Evidence and exports", ("reports.payroll.export", "reports.compliance.export"), 40),
    MenuDefinition("finance-manager", "Quick Links", "quick_link", "/finance-manager", "Finance", "", "", ("finance.handoff.view", "reports.payroll.view"), 10),
    MenuDefinition("finance-manager", "Quick Links", "quick_link", "/login", "Switch user", "", "", tuple(), 20),
)


def get_menu_catalog() -> list[dict]:
    return [
        {
            **asdict(item),
            "permission_keys": list(item.permission_keys),
        }
        for item in MENU_DEFINITIONS
    ]
