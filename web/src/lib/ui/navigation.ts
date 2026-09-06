export type HrAdminNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  blurb: string;
};

export type HrAdminNavGroup = {
  title: string;
  items: HrAdminNavItem[];
};

export const hrAdminNavigation: HrAdminNavGroup[] = [
  {
    title: "Workspace",
    items: [
      { href: "/hr-admin", label: "Overview", shortLabel: "OV", blurb: "Executive snapshot" },
      { href: "/hr-admin/employees", label: "People", shortLabel: "PE", blurb: "Employee masters" },
      { href: "/hr-admin/lifecycle", label: "Lifecycle", shortLabel: "LC", blurb: "Join to exit queue" },
      { href: "/hr-admin/employee-documents", label: "Documents", shortLabel: "DO", blurb: "Verification backlog" },
      { href: "/hr-admin/reports", label: "Reports", shortLabel: "RP", blurb: "Operational insights" },
      { href: "/hr-admin/payroll-readiness", label: "Payroll", shortLabel: "PY", blurb: "Source readiness" },
      { href: "/hr-admin/payroll-statutory", label: "Statutory", shortLabel: "ST", blurb: "Tax proof review" },
      { href: "/hr-admin/payroll-providers", label: "Providers", shortLabel: "PV", blurb: "Payroll integrations" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/hr-admin/attendance-operations", label: "Attendance", shortLabel: "AT", blurb: "Shifts and review windows" },
      { href: "/hr-admin/notifications-admin", label: "Notifications", shortLabel: "NT", blurb: "Events and delivery" },
    ],
  },
  {
    title: "Governance",
    items: [
      { href: "/hr-admin/organization", label: "Organization", shortLabel: "OR", blurb: "Structures and masters" },
      { href: "/hr-admin/policies", label: "Policies", shortLabel: "PO", blurb: "Leave and attendance rules" },
      { href: "/hr-admin/workflows", label: "Workflows", shortLabel: "WF", blurb: "Approval templates" },
    ],
  },
];
