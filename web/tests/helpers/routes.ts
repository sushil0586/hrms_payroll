export type RouteExpectation = {
  path: string;
  heading: string | RegExp;
};

export const tierZeroRoutes: RouteExpectation[] = [
  { path: "/", heading: "Choose your workspace" },
  { path: "/login", heading: "Sign in" },
  { path: "/hr-admin", heading: "Control center" },
  { path: "/tenant-admin", heading: "Tenant Admin Console" },
  { path: "/ess", heading: /self service|overview/i },
  { path: "/mss/approvals", heading: "Manager inbox" },
];

export const tierOneRoutes: RouteExpectation[] = [
  { path: "/hr-admin/organization", heading: /organization setup/i },
  { path: "/hr-admin/policies", heading: "Policy control" },
  { path: "/hr-admin/attendance-operations", heading: "Attendance operations" },
  { path: "/hr-admin/lifecycle", heading: "Lifecycle" },
  { path: "/hr-admin/launch-remediation", heading: "Launch Remediation" },
  { path: "/hr-admin/saas-control-plane", heading: "SaaS Control Plane" },
  { path: "/hr-admin/saas-operations", heading: "SaaS Operations" },
  { path: "/hr-admin/saas-resilience", heading: "SaaS Resilience" },
  { path: "/hr-admin/saas-sla-operations", heading: "SaaS SLA Ops" },
  { path: "/tenant-admin", heading: "Tenant Admin Console" },
  { path: "/tenant-admin/trust-audit", heading: "Tenant Trust Audit" },
  { path: "/tenant-admin/security-readiness", heading: "Enterprise Security Readiness" },
  { path: "/support", heading: "Support Console" },
  { path: "/support/domain-snapshot", heading: "Support Domain Snapshot" },
  { path: "/hr-admin/documents", heading: "Documents control" },
  { path: "/hr-admin/notifications-admin", heading: "Notifications" },
  { path: "/hr-admin/audit", heading: "Audit center" },
  { path: "/hr-admin/reports", heading: "Reports" },
  { path: "/hr-admin/payroll-readiness", heading: "Payroll Readiness" },
  { path: "/hr-admin/payroll-setup", heading: "Payroll Setup" },
  { path: "/hr-admin/salary-setup", heading: "Salary Setup" },
  { path: "/hr-admin/payroll-inputs", heading: "Payroll Inputs" },
  { path: "/hr-admin/payroll-adjustments", heading: "Payroll Adjustments" },
  { path: "/hr-admin/payroll-settlements", heading: "Payroll Settlements" },
  { path: "/hr-admin/payroll-statutory", heading: "Payroll Statutory" },
  { path: "/hr-admin/payroll-rules", heading: "Payroll Rules" },
  { path: "/hr-admin/payroll-calculations", heading: "Payroll Calculations" },
  { path: "/hr-admin/payroll-review", heading: "Payroll Review" },
  { path: "/hr-admin/payroll-outputs", heading: "Payroll Outputs" },
  { path: "/hr-admin/payroll-handoff", heading: "Payroll Handoff" },
  { path: "/hr-admin/payroll-providers", heading: "Payroll Providers" },
  { path: "/ess/payslips", heading: "Payslips" },
  { path: "/ess/statutory-declarations", heading: "Statutory Declarations" },
  { path: "/ess/documents", heading: "Documents" },
  { path: "/ess/notifications", heading: "Notifications" },
  { path: "/mss/notifications", heading: "Notifications" },
];

export const operationalVisualRoutes: RouteExpectation[] = [
  { path: "/hr-admin/organization", heading: /organization setup/i },
  { path: "/hr-admin/policies", heading: "Policy control" },
  { path: "/hr-admin/attendance-operations", heading: "Attendance operations" },
  { path: "/hr-admin/lifecycle", heading: "Lifecycle" },
  { path: "/hr-admin/launch-remediation", heading: "Launch Remediation" },
  { path: "/hr-admin/saas-control-plane", heading: "SaaS Control Plane" },
  { path: "/hr-admin/saas-operations", heading: "SaaS Operations" },
  { path: "/hr-admin/saas-resilience", heading: "SaaS Resilience" },
  { path: "/hr-admin/saas-sla-operations", heading: "SaaS SLA Ops" },
  { path: "/tenant-admin", heading: "Tenant Admin Console" },
  { path: "/tenant-admin/trust-audit", heading: "Tenant Trust Audit" },
  { path: "/tenant-admin/security-readiness", heading: "Enterprise Security Readiness" },
  { path: "/support", heading: "Support Console" },
  { path: "/support/domain-snapshot", heading: "Support Domain Snapshot" },
  { path: "/hr-admin/documents", heading: "Documents control" },
  { path: "/hr-admin/notifications-admin", heading: "Notifications" },
  { path: "/hr-admin/audit", heading: "Audit center" },
  { path: "/hr-admin/reports", heading: "Reports" },
  { path: "/hr-admin/payroll-readiness", heading: "Payroll Readiness" },
  { path: "/hr-admin/payroll-setup", heading: "Payroll Setup" },
  { path: "/hr-admin/salary-setup", heading: "Salary Setup" },
  { path: "/hr-admin/payroll-inputs", heading: "Payroll Inputs" },
  { path: "/hr-admin/payroll-adjustments", heading: "Payroll Adjustments" },
  { path: "/hr-admin/payroll-settlements", heading: "Payroll Settlements" },
  { path: "/hr-admin/payroll-statutory", heading: "Payroll Statutory" },
  { path: "/hr-admin/payroll-rules", heading: "Payroll Rules" },
  { path: "/hr-admin/payroll-calculations", heading: "Payroll Calculations" },
  { path: "/hr-admin/payroll-review", heading: "Payroll Review" },
  { path: "/hr-admin/payroll-outputs", heading: "Payroll Outputs" },
  { path: "/hr-admin/payroll-handoff", heading: "Payroll Handoff" },
  { path: "/hr-admin/payroll-providers", heading: "Payroll Providers" },
  { path: "/ess/payslips", heading: "Payslips" },
  { path: "/ess/statutory-declarations", heading: "Statutory Declarations" },
  { path: "/ess/documents", heading: "Documents" },
  { path: "/ess/notifications", heading: "Notifications" },
  { path: "/mss/notifications", heading: "Notifications" },
];

export const configurationFormVisualRoutes: RouteExpectation[] = [
  { path: "/hr-admin/employees/new", heading: "Create employee" },
  { path: "/hr-admin/organization/departments/new", heading: "Create department" },
  { path: "/hr-admin/leave-policies/new", heading: "Create leave policy" },
  { path: "/hr-admin/attendance-policies/new", heading: "Create attendance policy" },
  { path: "/hr-admin/workflow-templates/new", heading: "Create workflow template" },
  { path: "/hr-admin/notification-templates/new", heading: "Create notification template" },
];

export const governanceAssignmentVisualRoutes: RouteExpectation[] = [
  { path: "/hr-admin/leave-policies/lp-1/edit", heading: /Edit leave policy/ },
  { path: "/hr-admin/attendance-policies/ap-1/edit", heading: "Edit attendance policy" },
  { path: "/hr-admin/leave-policy-assignments/new", heading: /Create leave policy assignment/ },
  { path: "/hr-admin/attendance-policy-assignments/new", heading: /Create attendance policy assignment/ },
  { path: "/hr-admin/workflow-template-assignments/new", heading: "Create workflow assignment" },
  { path: "/hr-admin/document-requirements/new", heading: "Create document requirement" },
  { path: "/hr-admin/employee-shift-assignments/new", heading: /Create shift assignment/ },
];

export const generatedLetterVisualRoutes: RouteExpectation[] = [
  { path: "/hr-admin/generated-letters", heading: "Generated HR letters" },
];

export const workflowTraceVisualRoutes: RouteExpectation[] = [
  { path: "/hr-admin/workflows", heading: "Workflow control" },
];

export const firstVisualRoutes: RouteExpectation[] = [
  { path: "/login", heading: "Sign in" },
  { path: "/hr-admin", heading: "Control center" },
  { path: "/hr-admin/employees", heading: /employee/i },
  { path: "/ess", heading: /self service|overview/i },
  { path: "/mss/approvals", heading: "Manager inbox" },
];
