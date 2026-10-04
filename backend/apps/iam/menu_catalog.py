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
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin", "Dashboard", "DB", "Command center", tuple(), 10),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/leads", "Leads", "LD", "Signup queue", tuple(), 20),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/tenants", "Tenants", "TN", "Customer registry", tuple(), 30),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/launch", "Launch Blueprint", "LB", "Guided setup", tuple(), 40),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/onboarding", "Launch Readiness", "LR", "Go-live gates", tuple(), 50),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/admins", "Admin Access", "AA", "Customer logins", tuple(), 60),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/policy-packs", "Setup Templates", "ST", "Baseline setup", tuple(), 70),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/permissions", "Permissions", "PM", "RBAC catalog", ("platform.permission_catalog.manage",), 80),
    MenuDefinition("platform-admin", "Workspace", "sidebar", "/platform-admin/audit-logs", "Audit Logs", "AU", "Action evidence", tuple(), 90),
    MenuDefinition("platform-admin", "Quick Links", "quick_link", "/", "Home", "", "", tuple(), 10),
    MenuDefinition("platform-admin", "Quick Links", "quick_link", "/platform-admin", "Dashboard", "", "", tuple(), 20),
    MenuDefinition("platform-admin", "Quick Links", "quick_link", "/platform-admin/policy-packs", "Templates", "", "", tuple(), 30),
    MenuDefinition("platform-admin", "Quick Links", "quick_link", "/platform-admin/launch", "Launch blueprint", "", "", tuple(), 40),

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

    MenuDefinition("hr-admin", "Command", "sidebar", "/hr-admin", "Dashboard", "DB", "People operations overview", ("employees.view", "organization.view", "payroll.review", "reports.catalog.view"), 10),
    MenuDefinition("hr-admin", "Command", "sidebar", "/hr-admin/launch-remediation", "Launch Readiness", "LR", "Release blockers", ("organization.view", "employees.view", "payroll.review"), 20),
    MenuDefinition("hr-admin", "Workforce", "sidebar", "/hr-admin/employees", "Employees", "EM", "Directory and access", ("employees.view", "employees.create", "employees.edit", "employees.import", "employees.access.manage"), 110),
    MenuDefinition("hr-admin", "Workforce", "sidebar", "/hr-admin/lifecycle", "Lifecycle", "LC", "Joiner to exit queue", ("lifecycle.view", "lifecycle.manage"), 120),
    MenuDefinition("hr-admin", "Workforce", "sidebar", "/hr-admin/employee-documents", "Documents", "DO", "Verification backlog", ("documents.view", "documents.manage", "documents.verify"), 130),
    MenuDefinition("hr-admin", "Time & Leave", "sidebar", "/hr-admin/attendance-operations", "Attendance", "AT", "Records and review windows", ("attendance.view", "attendance.records.manage", "attendance.regularization.review"), 210),
    MenuDefinition("hr-admin", "Time & Leave", "sidebar", "/hr-admin/leave-balances", "Leave", "LV", "Balances and operations", ("leave.view", "leave.policies.manage"), 220),
    MenuDefinition("hr-admin", "Time & Leave", "sidebar", "/hr-admin/policies", "Policies", "PO", "Leave and attendance rules", ("leave.policies.manage", "attendance.policies.manage"), 230),
    MenuDefinition("hr-admin", "Payroll", "sidebar", "/hr-admin/payroll-readiness", "Payroll Control", "PC", "Readiness and close", ("payroll.inputs.view", "payroll.review", "payroll.outputs.view"), 310),
    MenuDefinition("hr-admin", "Payroll", "sidebar", "/hr-admin/payroll-setup", "Payroll Setup", "PS", "Periods and pay groups", ("payroll.setup.view", "payroll.setup.manage"), 320),
    MenuDefinition("hr-admin", "Payroll", "sidebar", "/hr-admin/salary-setup", "Salary Setup", "SS", "Structures and CTC", ("payroll.setup.view", "payroll.setup.manage"), 330),
    MenuDefinition("hr-admin", "Payroll", "sidebar", "/hr-admin/payroll-rules", "Payroll Rules", "PR", "Formulas and versions", ("payroll.setup.view", "payroll.setup.manage"), 340),
    MenuDefinition("hr-admin", "Payroll", "sidebar", "/hr-admin/payroll-statutory", "Statutory", "ST", "Compliance setup", ("statutory.setup.view", "statutory.filing.view"), 350),
    MenuDefinition("hr-admin", "Payroll", "sidebar", "/hr-admin/payroll-providers", "Providers", "PV", "Integrations and delivery", ("payroll.setup.view", "payroll.setup.manage"), 360),
    MenuDefinition("hr-admin", "Payroll", "sidebar", "/hr-admin/payroll-adjustments", "Adjustments & Settlements", "AS", "Exceptions and F&F", ("payroll.review",), 370),
    MenuDefinition("hr-admin", "Compliance", "sidebar", "/hr-admin/audit", "Audit", "AU", "Activity evidence", ("audit.hr.view",), 430),
    MenuDefinition("hr-admin", "Insights", "sidebar", "/hr-admin/reports", "Reports", "RP", "Operational insights", ("reports.catalog.view", "reports.hr.view", "reports.payroll.view", "reports.compliance.view"), 510),
    MenuDefinition("hr-admin", "Setup", "sidebar", "/hr-admin/organization", "Organization", "OR", "Structures and masters", ("organization.view", "organization.manage"), 610),
    MenuDefinition("hr-admin", "Setup", "sidebar", "/hr-admin/workflows", "Workflows", "WF", "Approval templates", ("lifecycle.manage",), 620),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/notifications-admin", "Notifications", "NT", "Events and delivery", ("notifications.view", "notifications.manage"), 710),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/import-history", "Imports", "IM", "Batch history", ("employees.import", "organization.manage"), 720),
    MenuDefinition("hr-admin", "Operations", "sidebar", "/hr-admin/saas-operations", "Ops Health", "OH", "Health signals", ("audit.hr.view", "reports.hr.view"), 730),
    MenuDefinition("hr-admin", "Quick Links", "quick_link", "/ess", "ESS", "", "", tuple(), 10),
    MenuDefinition("hr-admin", "Quick Links", "quick_link", "/mss/approvals", "MSS", "", "", tuple(), 20),

    MenuDefinition("ess", "Workspace", "sidebar", "/ess", "Overview", "OV", "Daily actions", ("leave.view", "attendance.view", "documents.view", "notifications.view"), 10),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/leave", "Leave", "LV", "Requests and balance", ("leave.view",), 20),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/attendance", "Attendance", "AT", "Daily and fixes", ("attendance.view",), 30),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/documents", "Documents", "DO", "Required uploads", ("documents.view",), 40),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/payslips", "Payslips", "PS", "Payroll files", tuple(), 50),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/statutory-declarations", "Statutory", "ST", "Tax declarations", ("statutory.declarations.view", "statutory.declarations.manage"), 60),
    MenuDefinition("ess", "Workspace", "sidebar", "/ess/notifications", "Inbox", "IN", "Alerts and updates", ("notifications.view",), 70),
    MenuDefinition("ess", "Quick Links", "quick_link", "/ess/leave", "Leave", "", "", ("leave.view",), 10),
    MenuDefinition("ess", "Quick Links", "quick_link", "/ess/attendance", "Attendance", "", "", ("attendance.view",), 20),
    MenuDefinition("ess", "Quick Links", "quick_link", "/ess/payslips", "Payslips", "", "", tuple(), 30),
    MenuDefinition("ess", "Quick Links", "quick_link", "/ess/notifications", "Inbox", "", "", ("notifications.view",), 40),

    MenuDefinition("mss", "Workspace", "sidebar", "/mss", "Dashboard", "DB", "Daily manager view", ("leave.requests.approve", "attendance.regularization.review"), 10),
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
