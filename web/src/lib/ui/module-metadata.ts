export type HrAdminModuleId =
  | "attendance"
  | "reports"
  | "employees"
  | "payroll"
  | "organization"
  | "policies"
  | "workflows"
  | "documents"
  | "lifecycle"
  | "notifications";

export type HrAdminModuleMeta = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
};

export const hrAdminModuleMetadata: Record<HrAdminModuleId, HrAdminModuleMeta> = {
  attendance: {
    title: "Attendance Operations",
    href: "/hr-admin/attendance-operations",
    eyebrow: "Daily ops",
    description: "Run shifts, calendars, attendance review windows, and regularization operations from one place.",
  },
  reports: {
    title: "Reports",
    href: "/hr-admin/reports",
    eyebrow: "Leadership view",
    description: "Watch workforce health, queue load, delivery risk, and governance coverage from one control layer.",
  },
  employees: {
    title: "Employee Masters",
    href: "/hr-admin/employees",
    eyebrow: "Core records",
    description: "Search profiles, reporting lines, and employment assignments without losing operational context.",
  },
  payroll: {
    title: "Payroll Readiness",
    href: "/hr-admin/payroll-readiness",
    eyebrow: "Phase 0",
    description: "Verify source-data completeness, pending approvals, and tenant readiness before payroll runs begin.",
  },
  organization: {
    title: "Organization Setup",
    href: "/hr-admin/organization",
    eyebrow: "Foundation",
    description: "Control the entity structure that policy, payroll, workflow, and attendance layers rely on.",
  },
  policies: {
    title: "Policies",
    href: "/hr-admin/policies",
    eyebrow: "Governance",
    description: "Shape leave and attendance rules with clearer ownership and future-ready policy controls.",
  },
  workflows: {
    title: "Workflows",
    href: "/hr-admin/workflows",
    eyebrow: "Automation",
    description: "Configure approval journeys that can flex by branch, department, grade, and module context.",
  },
  documents: {
    title: "Documents",
    href: "/hr-admin/documents",
    eyebrow: "Compliance",
    description: "Manage categories, requirements, and verification flows with better queue visibility.",
  },
  lifecycle: {
    title: "Lifecycle",
    href: "/hr-admin/lifecycle",
    eyebrow: "People movement",
    description: "Track onboarding, probation, movement, and exits in a single review-driven operating layer.",
  },
  notifications: {
    title: "Notifications",
    href: "/hr-admin/notifications-admin",
    eyebrow: "Delivery",
    description: "Coordinate templates, events, and generated notifications across the full HR operating system.",
  },
};
