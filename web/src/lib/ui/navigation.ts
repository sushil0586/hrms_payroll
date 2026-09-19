export type HrAdminNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  blurb: string;
  permissions?: string[];
};

export type HrAdminNavGroup = {
  title: string;
  items: HrAdminNavItem[];
};

export const hrAdminNavigation: HrAdminNavGroup[] = [
  {
    title: "Command",
    items: [
      { href: "/hr-admin", label: "Dashboard", shortLabel: "DB", blurb: "People operations overview", permissions: ["employees.view", "organization.view", "payroll.review", "reports.catalog.view"] },
      { href: "/hr-admin/launch-remediation", label: "Launch Readiness", shortLabel: "LR", blurb: "Release blockers", permissions: ["organization.view", "employees.view", "payroll.review"] },
    ],
  },
  {
    title: "Workforce",
    items: [
      { href: "/hr-admin/employees", label: "Employees", shortLabel: "EM", blurb: "Directory and access", permissions: ["employees.view", "employees.create", "employees.edit", "employees.import", "employees.access.manage"] },
      { href: "/hr-admin/lifecycle", label: "Lifecycle", shortLabel: "LC", blurb: "Joiner to exit queue", permissions: ["lifecycle.view", "lifecycle.manage"] },
      { href: "/hr-admin/employee-documents", label: "Documents", shortLabel: "DO", blurb: "Verification backlog", permissions: ["documents.view", "documents.manage", "documents.verify"] },
    ],
  },
  {
    title: "Time & Leave",
    items: [
      { href: "/hr-admin/attendance-operations", label: "Attendance", shortLabel: "AT", blurb: "Records and review windows", permissions: ["attendance.view", "attendance.records.manage", "attendance.regularization.review"] },
      { href: "/hr-admin/leave-balances", label: "Leave", shortLabel: "LV", blurb: "Balances and operations", permissions: ["leave.view", "leave.policies.manage"] },
      { href: "/hr-admin/policies", label: "Policies", shortLabel: "PO", blurb: "Leave and attendance rules", permissions: ["leave.policies.manage", "attendance.policies.manage"] },
    ],
  },
  {
    title: "Payroll",
    items: [
      { href: "/hr-admin/payroll-readiness", label: "Payroll Control", shortLabel: "PC", blurb: "Readiness and blockers", permissions: ["payroll.inputs.view", "payroll.review", "payroll.outputs.view"] },
      { href: "/hr-admin/payroll-inputs", label: "Inputs", shortLabel: "IN", blurb: "Ingestion and validation", permissions: ["payroll.inputs.view"] },
      { href: "/hr-admin/payroll-calculations", label: "Calculation", shortLabel: "CA", blurb: "Run and close payroll", permissions: ["payroll.review"] },
      { href: "/hr-admin/payroll-review", label: "Review", shortLabel: "RV", blurb: "Exceptions and approvals", permissions: ["payroll.review"] },
      { href: "/hr-admin/payroll-outputs", label: "Outputs", shortLabel: "OU", blurb: "Payslips and registers", permissions: ["payroll.outputs.view"] },
      { href: "/hr-admin/payroll-handoff", label: "Handoff", shortLabel: "HF", blurb: "Finance package", permissions: ["finance.handoff.view", "finance.handoff.create"] },
    ],
  },
  {
    title: "Compliance",
    items: [
      { href: "/hr-admin/payroll-statutory", label: "Statutory", shortLabel: "ST", blurb: "Setup and filings", permissions: ["statutory.setup.view", "statutory.filing.view"] },
      { href: "/hr-admin/payroll-providers", label: "Providers", shortLabel: "PV", blurb: "Payroll integrations", permissions: ["payroll.setup.view", "payroll.setup.manage"] },
      { href: "/hr-admin/audit", label: "Audit", shortLabel: "AU", blurb: "Activity evidence", permissions: ["audit.hr.view"] },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/hr-admin/reports", label: "Reports", shortLabel: "RP", blurb: "Operational insights", permissions: ["reports.catalog.view", "reports.hr.view", "reports.payroll.view", "reports.compliance.view"] },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: "/hr-admin/organization", label: "Organization", shortLabel: "OR", blurb: "Structures and masters", permissions: ["organization.view", "organization.manage"] },
      { href: "/hr-admin/workflows", label: "Workflows", shortLabel: "WF", blurb: "Approval templates", permissions: ["lifecycle.manage"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/hr-admin/notifications-admin", label: "Notifications", shortLabel: "NT", blurb: "Events and delivery", permissions: ["notifications.view", "notifications.manage"] },
      { href: "/hr-admin/import-history", label: "Imports", shortLabel: "IM", blurb: "Batch history", permissions: ["employees.import", "organization.manage"] },
      { href: "/hr-admin/saas-operations", label: "Ops Health", shortLabel: "OH", blurb: "Health signals", permissions: ["audit.hr.view", "reports.hr.view"] },
    ],
  },
];
