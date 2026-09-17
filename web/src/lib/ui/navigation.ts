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
    title: "Workspace",
    items: [
      { href: "/hr-admin", label: "Overview", shortLabel: "OV", blurb: "Executive snapshot", permissions: ["employees.view", "organization.view", "payroll.review", "reports.catalog.view"] },
      { href: "/hr-admin/employees", label: "People", shortLabel: "PE", blurb: "Employee masters", permissions: ["employees.view", "employees.create", "employees.edit", "employees.import", "employees.access.manage"] },
      { href: "/hr-admin/lifecycle", label: "Lifecycle", shortLabel: "LC", blurb: "Join to exit queue", permissions: ["lifecycle.view", "lifecycle.manage"] },
      { href: "/hr-admin/employee-documents", label: "Documents", shortLabel: "DO", blurb: "Verification backlog", permissions: ["documents.view", "documents.manage", "documents.verify"] },
      { href: "/hr-admin/reports", label: "Reports", shortLabel: "RP", blurb: "Operational insights", permissions: ["reports.catalog.view", "reports.hr.view", "reports.payroll.view", "reports.compliance.view"] },
      { href: "/hr-admin/payroll-readiness", label: "Payroll", shortLabel: "PY", blurb: "Source readiness", permissions: ["payroll.inputs.view", "payroll.review", "payroll.outputs.view"] },
      { href: "/hr-admin/payroll-statutory", label: "Statutory", shortLabel: "ST", blurb: "Tax proof review", permissions: ["statutory.setup.view", "statutory.filing.view"] },
      { href: "/hr-admin/payroll-providers", label: "Providers", shortLabel: "PV", blurb: "Payroll integrations", permissions: ["payroll.setup.view", "payroll.setup.manage"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/hr-admin/attendance-operations", label: "Attendance", shortLabel: "AT", blurb: "Shifts and review windows", permissions: ["attendance.view", "attendance.records.manage", "attendance.regularization.review"] },
      { href: "/hr-admin/notifications-admin", label: "Notifications", shortLabel: "NT", blurb: "Events and delivery", permissions: ["notifications.view", "notifications.manage"] },
      { href: "/hr-admin/launch-remediation", label: "Launch", shortLabel: "LA", blurb: "Release gate actions", permissions: ["organization.view", "employees.view", "payroll.review"] },
      { href: "/hr-admin/saas-control-plane", label: "SaaS", shortLabel: "SA", blurb: "Plan and usage gates", permissions: ["tenant.plan.view", "tenant.change_requests.manage"] },
      { href: "/hr-admin/saas-operations", label: "Ops Health", shortLabel: "OH", blurb: "Tenant health signals", permissions: ["audit.hr.view", "reports.hr.view"] },
      { href: "/hr-admin/saas-resilience", label: "Resilience", shortLabel: "RS", blurb: "Backup and retention", permissions: ["audit.hr.view"] },
      { href: "/hr-admin/saas-sla-operations", label: "SLA Ops", shortLabel: "SL", blurb: "Incidents and breach posture", permissions: ["audit.hr.view"] },
    ],
  },
  {
    title: "Governance",
    items: [
      { href: "/hr-admin/organization", label: "Organization", shortLabel: "OR", blurb: "Structures and masters", permissions: ["organization.view", "organization.manage"] },
      { href: "/hr-admin/policies", label: "Policies", shortLabel: "PO", blurb: "Leave and attendance rules", permissions: ["leave.policies.manage", "attendance.policies.manage"] },
      { href: "/hr-admin/workflows", label: "Workflows", shortLabel: "WF", blurb: "Approval templates", permissions: ["lifecycle.manage"] },
    ],
  },
];
