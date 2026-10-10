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

export type HrAdminSearchDestination = {
  href: string;
  label: string;
  description: string;
  section: string;
};

export const payrollCycleOperationalHrefs = [
  "/hr-admin/payroll-inputs",
  "/hr-admin/payroll-calculations",
  "/hr-admin/payroll-review",
  "/hr-admin/payroll-outputs",
  "/hr-admin/payroll-handoff",
] as const;

export const payrollAdminSidebarItems: HrAdminNavItem[] = [
  {
    href: "/hr-admin/payroll-readiness",
    label: "Payroll Control",
    shortLabel: "PC",
    blurb: "Readiness and close",
    permissions: ["payroll.inputs.view", "payroll.review", "payroll.outputs.view"],
  },
  {
    href: "/hr-admin/payroll-setup",
    label: "Payroll Setup",
    shortLabel: "PS",
    blurb: "Periods and pay groups",
    permissions: ["payroll.setup.view", "payroll.setup.manage"],
  },
  {
    href: "/hr-admin/salary-setup",
    label: "Salary Setup",
    shortLabel: "SS",
    blurb: "Structures and CTC",
    permissions: ["payroll.setup.view", "payroll.setup.manage"],
  },
  {
    href: "/hr-admin/payroll-rules",
    label: "Payroll Rules",
    shortLabel: "PR",
    blurb: "Formulas and versions",
    permissions: ["payroll.setup.view", "payroll.setup.manage"],
  },
  {
    href: "/hr-admin/payroll-statutory",
    label: "Statutory",
    shortLabel: "ST",
    blurb: "Compliance setup",
    permissions: ["statutory.setup.view", "statutory.filing.view"],
  },
  {
    href: "/hr-admin/payroll-providers",
    label: "Providers",
    shortLabel: "PV",
    blurb: "Integrations and delivery",
    permissions: ["payroll.setup.view", "payroll.setup.manage"],
  },
  {
    href: "/hr-admin/payroll-adjustments",
    label: "Adjustments & Settlements",
    shortLabel: "AS",
    blurb: "Exceptions and F&F",
    permissions: ["payroll.review"],
  },
];

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
      { href: "/hr-admin/time-to-payroll", label: "Time to Payroll", shortLabel: "TP", blurb: "Roster to payroll control", permissions: ["attendance.view", "payroll.inputs.view", "payroll.review"] },
      { href: "/hr-admin/attendance-operations", label: "Attendance", shortLabel: "AT", blurb: "Records and review windows", permissions: ["attendance.view", "attendance.records.manage", "attendance.regularization.review"] },
      { href: "/hr-admin/leave-requests", label: "Leave", shortLabel: "LV", blurb: "Requests and balances", permissions: ["leave.view", "leave.policies.manage"] },
      { href: "/hr-admin/policies", label: "Policies", shortLabel: "PO", blurb: "Leave and attendance rules", permissions: ["leave.policies.manage", "attendance.policies.manage"] },
    ],
  },
  {
    title: "Payroll",
    items: payrollAdminSidebarItems,
  },
  {
    title: "Compliance",
    items: [
      { href: "/hr-admin/audit", label: "Audit", shortLabel: "AU", blurb: "Activity evidence", permissions: ["audit.hr.view"] },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/hr-admin/reports", label: "Reports", shortLabel: "RC", blurb: "Catalog and search", permissions: ["reports.catalog.view", "reports.hr.view", "reports.payroll.view", "reports.compliance.view"] },
      { href: "/hr-admin/reports/hr-core", label: "HR Core Reports", shortLabel: "HR", blurb: "Workforce and lifecycle", permissions: ["reports.catalog.view", "reports.hr.view"] },
      { href: "/hr-admin/reports/attendance", label: "Attendance Reports", shortLabel: "AR", blurb: "Time, leave, exceptions", permissions: ["reports.catalog.view", "reports.hr.view"] },
      { href: "/hr-admin/reports/payroll", label: "Payroll Reports", shortLabel: "PY", blurb: "Finance and outputs", permissions: ["reports.catalog.view", "reports.payroll.view"] },
      { href: "/hr-admin/reports/compliance", label: "Compliance Reports", shortLabel: "CR", blurb: "Statutory evidence", permissions: ["reports.catalog.view", "reports.compliance.view"] },
      { href: "/hr-admin/reports/export-audits", label: "Export Audits", shortLabel: "EA", blurb: "Download evidence", permissions: ["reports.catalog.view", "reports.hr.view", "reports.payroll.view", "reports.compliance.view"] },
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

const payrollReadinessSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/payroll-readiness", label: "Payroll readiness summary", description: "Readiness decision, blockers, and next actions", section: "Payroll Control" },
  { href: "/hr-admin/payroll-readiness?tab=issues", label: "Payroll readiness issues", description: "Blocked and warning items before payroll input lock", section: "Payroll Control" },
  { href: "/hr-admin/payroll-readiness?tab=employees", label: "Payroll employee readiness", description: "Employee-level source data coverage", section: "Payroll Control" },
  { href: "/hr-admin/payroll-readiness?tab=setup", label: "Payroll setup health", description: "Configuration checks before payroll run", section: "Payroll Control" },
  { href: "/hr-admin/payroll-readiness?tab=evidence", label: "Payroll evidence", description: "Audit evidence for payroll readiness", section: "Payroll Control" },
  { href: "/hr-admin/payroll-inputs", label: "Payroll inputs", description: "Immutable snapshots for payroll cycle processing", section: "Payroll Control" },
  { href: "/hr-admin/payroll-calculations", label: "Payroll calculations", description: "Draft payroll results, validations, and line trace", section: "Payroll Control" },
  { href: "/hr-admin/payroll-review", label: "Payroll review", description: "Review exceptions, approvals, and final lock", section: "Payroll Control" },
  { href: "/hr-admin/payroll-outputs", label: "Payroll outputs", description: "Payslips, registers, and output artifacts", section: "Payroll Control" },
  { href: "/hr-admin/payroll-handoff", label: "Payroll handoff", description: "Finance handoff, delivery, and evidence", section: "Payroll Control" },
];

const payrollSetupSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/payroll-setup", label: "Payroll setup overview", description: "Readiness and setup coverage", section: "Payroll Setup" },
  { href: "/hr-admin/payroll-setup?tab=calendars", label: "Payroll calendars and periods", description: "Create payroll calendars and monthly windows", section: "Payroll Setup" },
  { href: "/hr-admin/payroll-setup?tab=pay-groups", label: "Pay groups", description: "Manage payroll cohorts and scope", section: "Payroll Setup" },
  { href: "/hr-admin/payroll-setup?tab=assignments", label: "Pay group assignments", description: "Assign employees to payroll groups", section: "Payroll Setup" },
  { href: "/hr-admin/payroll-setup?tab=actions", label: "Payroll setup actions", description: "Create, edit, and maintain payroll setup records", section: "Payroll Setup" },
];

const salarySetupSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/salary-setup", label: "Salary setup overview", description: "Salary structures and assignment coverage", section: "Salary Setup" },
  { href: "/hr-admin/salary-setup?tab=components", label: "Salary components", description: "Earnings, deductions, allowances, and rules", section: "Salary Setup" },
  { href: "/hr-admin/salary-setup?tab=structures", label: "Salary structures", description: "Structure versions and component lines", section: "Salary Setup" },
  { href: "/hr-admin/salary-setup?tab=assignments", label: "Salary assignments", description: "Employee CTC and structure coverage", section: "Salary Setup" },
  { href: "/hr-admin/salary-setup?tab=actions", label: "Salary setup actions", description: "Create, edit, and import salary setup data", section: "Salary Setup" },
];

const payrollRulesSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/payroll-rules", label: "Payroll rules overview", description: "Rule engine summary and readiness", section: "Payroll Rules" },
  { href: "/hr-admin/payroll-rules?tab=rules", label: "Payroll rule definitions", description: "Formula definitions and rule tags", section: "Payroll Rules" },
  { href: "/hr-admin/payroll-rules?tab=versions", label: "Payroll rule versions", description: "Expressions, effective dates, and version history", section: "Payroll Rules" },
  { href: "/hr-admin/payroll-rules?tab=trace", label: "Payroll rule trace", description: "Snapshot rule preview and calculation trace", section: "Payroll Rules" },
  { href: "/hr-admin/payroll-rules?tab=actions", label: "Payroll rule actions", description: "Create and edit rules and versions", section: "Payroll Rules" },
];

const statutorySearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/payroll-statutory", label: "Statutory payroll overview", description: "Tax and compliance readiness", section: "Statutory" },
  { href: "/hr-admin/payroll-statutory?tab=declarations", label: "Statutory declarations", description: "Employee proof review and verification", section: "Statutory" },
  { href: "/hr-admin/payroll-statutory?tab=compliance", label: "Statutory compliance", description: "Employer registrations and filing calendars", section: "Statutory" },
  { href: "/hr-admin/payroll-statutory?tab=catalog", label: "Statutory catalog", description: "Packs, slabs, and components", section: "Statutory" },
  { href: "/hr-admin/payroll-statutory?tab=actions", label: "Statutory setup actions", description: "Create, import, and edit compliance setup", section: "Statutory" },
];

const payrollOperationsSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/payroll-adjustments", label: "Payroll adjustments", description: "Variable pay, corrections, and approvals", section: "Payroll Operations" },
  { href: "/hr-admin/payroll-adjustments?tab=actions", label: "Adjustment actions", description: "Create and manage payroll adjustments", section: "Payroll Operations" },
  { href: "/hr-admin/payroll-adjustments?tab=register", label: "Adjustment register", description: "Audit payroll adjustment lines", section: "Payroll Operations" },
  { href: "/hr-admin/payroll-settlements", label: "Payroll settlements", description: "Full and final settlements and approvals", section: "Payroll Operations" },
  { href: "/hr-admin/payroll-settlements?tab=actions", label: "Settlement actions", description: "Create and manage settlement records", section: "Payroll Operations" },
  { href: "/hr-admin/payroll-settlements?tab=register", label: "Settlement register", description: "Review F&F settlement lines", section: "Payroll Operations" },
  { href: "/hr-admin/payroll-providers", label: "Payroll providers", description: "Provider integrations and delivery status", section: "Payroll Providers" },
  { href: "/hr-admin/payroll-providers?tab=delivery", label: "Provider delivery", description: "Transmission attempts and delivery failures", section: "Payroll Providers" },
  { href: "/hr-admin/payroll-providers?tab=registry", label: "Provider registry", description: "Provider capability catalog", section: "Payroll Providers" },
  { href: "/hr-admin/payroll-providers?tab=mapping", label: "Provider mappings", description: "Schema mapping packs and simulation", section: "Payroll Providers" },
  { href: "/hr-admin/payroll-providers?tab=connections", label: "Provider connections", description: "Connected payroll integrations", section: "Payroll Providers" },
];

const workforceSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/employees/new", label: "New employee", description: "Create an employee master record", section: "Employees" },
  { href: "/hr-admin/onboardings", label: "Onboarding queue", description: "Joiner setup and onboarding tasks", section: "Lifecycle" },
  { href: "/hr-admin/onboardings/new", label: "New onboarding", description: "Start a joiner onboarding workflow", section: "Lifecycle" },
  { href: "/hr-admin/movements", label: "Movement operations", description: "Transfers, promotions, and manager changes", section: "Lifecycle" },
  { href: "/hr-admin/movements/new", label: "New movement", description: "Create employee movement workflow", section: "Lifecycle" },
  { href: "/hr-admin/probation-reviews", label: "Probation reviews", description: "Track confirmation and probation decisions", section: "Lifecycle" },
  { href: "/hr-admin/probation-reviews/new", label: "New probation review", description: "Create probation review item", section: "Lifecycle" },
  { href: "/hr-admin/exits", label: "Exit queue", description: "Resignation, clearance, and exit workflow", section: "Lifecycle" },
  { href: "/hr-admin/exits/new", label: "New exit", description: "Create employee exit workflow", section: "Lifecycle" },
];

const timeLeaveSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/time-to-payroll", label: "Time to Payroll control", description: "Roster, leave, attendance, payroll input, and arrears journey", section: "Time & Leave" },
  { href: "/hr-admin/attendance-records", label: "Attendance records", description: "Daily attendance records and corrections", section: "Time & Leave" },
  { href: "/hr-admin/attendance-regularizations", label: "Attendance regularizations", description: "Review employee attendance correction requests", section: "Time & Leave" },
  { href: "/hr-admin/shifts", label: "Shifts", description: "Shift master setup", section: "Time & Leave" },
  { href: "/hr-admin/shifts/new", label: "New shift", description: "Create a shift master", section: "Time & Leave" },
  { href: "/hr-admin/shift-roster-templates", label: "Shift roster templates", description: "Roster pattern setup", section: "Time & Leave" },
  { href: "/hr-admin/shift-roster-templates/new", label: "New roster template", description: "Create shift roster template", section: "Time & Leave" },
  { href: "/hr-admin/employee-shift-assignments", label: "Employee shift assignments", description: "Assign employees to shifts", section: "Time & Leave" },
  { href: "/hr-admin/employee-shift-assignments/new", label: "New shift assignment", description: "Create employee shift assignment", section: "Time & Leave" },
  { href: "/hr-admin/leave-types", label: "Leave types", description: "Leave type catalog", section: "Time & Leave" },
  { href: "/hr-admin/leave-types/new", label: "New leave type", description: "Create leave type", section: "Time & Leave" },
  { href: "/hr-admin/leave-requests", label: "Leave requests", description: "Tenant-wide leave request queue and approval evidence", section: "Time & Leave" },
  { href: "/hr-admin/leave-policies", label: "Leave policies", description: "Leave accrual and approval policy setup", section: "Time & Leave" },
  { href: "/hr-admin/leave-policies/new", label: "New leave policy", description: "Create leave policy", section: "Time & Leave" },
  { href: "/hr-admin/leave-policy-assignments", label: "Leave policy assignments", description: "Assign leave policies to employees", section: "Time & Leave" },
  { href: "/hr-admin/leave-policy-assignments/new", label: "New leave policy assignment", description: "Create leave policy assignment", section: "Time & Leave" },
  { href: "/hr-admin/attendance-policies", label: "Attendance policies", description: "Attendance governance and regularization rules", section: "Time & Leave" },
  { href: "/hr-admin/attendance-policies/new", label: "New attendance policy", description: "Create attendance policy", section: "Time & Leave" },
  { href: "/hr-admin/attendance-policy-assignments", label: "Attendance policy assignments", description: "Assign attendance policies to employees", section: "Time & Leave" },
  { href: "/hr-admin/attendance-policy-assignments/new", label: "New attendance policy assignment", description: "Create attendance policy assignment", section: "Time & Leave" },
  { href: "/hr-admin/holiday-calendars", label: "Holiday calendars", description: "Holiday master calendars", section: "Time & Leave" },
  { href: "/hr-admin/holiday-calendars/new", label: "New holiday calendar", description: "Create holiday calendar", section: "Time & Leave" },
];

const documentsSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/documents", label: "Document command center", description: "Document setup and verification overview", section: "Documents" },
  { href: "/hr-admin/employee-documents/new", label: "New employee document", description: "Upload or create employee document request", section: "Documents" },
  { href: "/hr-admin/document-categories", label: "Document categories", description: "Document category master", section: "Documents" },
  { href: "/hr-admin/document-categories/new", label: "New document category", description: "Create document category", section: "Documents" },
  { href: "/hr-admin/document-requirements", label: "Document requirements", description: "Role and lifecycle document requirements", section: "Documents" },
  { href: "/hr-admin/document-requirements/new", label: "New document requirement", description: "Create document requirement", section: "Documents" },
  { href: "/hr-admin/generated-letters", label: "Generated letters", description: "Letter previews and generated artifacts", section: "Documents" },
];

const notificationSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/notifications-admin", label: "Notifications admin", description: "Notification events, templates, and delivery workspace", section: "Notifications" },
  { href: "/hr-admin/notification-delivery", label: "Notification delivery", description: "Channel health, provider status, and retries", section: "Notifications" },
  { href: "/hr-admin/notifications", label: "Notification queue", description: "Pending, sent, failed, and retry-ready notifications", section: "Notifications" },
  { href: "/hr-admin/notifications?status=failed", label: "Failed notifications", description: "Failed delivery items needing review", section: "Notifications" },
  { href: "/hr-admin/notification-templates", label: "Notification templates", description: "Reusable notification message content", section: "Notifications" },
  { href: "/hr-admin/notification-templates/new", label: "New notification template", description: "Create notification template", section: "Notifications" },
  { href: "/hr-admin/notification-events", label: "Notification events", description: "Trigger and routing definitions", section: "Notifications" },
  { href: "/hr-admin/notification-events/new", label: "New notification event", description: "Create notification event", section: "Notifications" },
  { href: "/hr-admin/notification-diagnostics", label: "Notification diagnostics", description: "Template, event, and test-send health", section: "Notifications" },
];

const setupSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/organization", label: "Organization setup", description: "Legal entities, locations, branches, departments, and cost centers", section: "Setup" },
  { href: "/hr-admin/workflows", label: "Workflow command center", description: "Approval workflows and template coverage", section: "Setup" },
  { href: "/hr-admin/workflow-templates", label: "Workflow templates", description: "Approval workflow templates", section: "Setup" },
  { href: "/hr-admin/workflow-templates/new", label: "New workflow template", description: "Create workflow template", section: "Setup" },
  { href: "/hr-admin/workflow-template-assignments", label: "Workflow template assignments", description: "Assign workflow templates", section: "Setup" },
  { href: "/hr-admin/workflow-template-assignments/new", label: "New workflow assignment", description: "Create workflow template assignment", section: "Setup" },
  { href: "/hr-admin/policy-assignments", label: "Policy assignments", description: "Assigned policy coverage", section: "Setup" },
];

const reportSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/reports/workforce", label: "Workforce report", description: "Employee and workforce reporting", section: "Reports" },
  { href: "/hr-admin/reports/attendance-register", label: "Attendance register", description: "Attendance register report", section: "Reports" },
  { href: "/hr-admin/reports/attendance-exceptions", label: "Attendance exceptions report", description: "Attendance issue reporting", section: "Reports" },
  { href: "/hr-admin/reports/leave-balance", label: "Leave balance report", description: "Leave balance and accrual report", section: "Reports" },
  { href: "/hr-admin/reports/lifecycle-queue", label: "Lifecycle queue report", description: "Joiner, movement, and exit queue report", section: "Reports" },
  { href: "/hr-admin/reports/lifecycle-aging", label: "Lifecycle aging report", description: "Aging lifecycle work items", section: "Reports" },
  { href: "/hr-admin/reports/document-compliance", label: "Document compliance report", description: "Employee document compliance", section: "Reports" },
  { href: "/hr-admin/reports/payroll-close-readiness", label: "Payroll close readiness report", description: "Payroll readiness report", section: "Reports" },
  { href: "/hr-admin/reports/payroll-input-exceptions", label: "Payroll input exceptions report", description: "Payroll input blockers and warnings", section: "Reports" },
  { href: "/hr-admin/reports/payroll-register", label: "Payroll register", description: "Payroll register report", section: "Reports" },
  { href: "/hr-admin/reports/payroll-review-exceptions", label: "Payroll review exceptions report", description: "Review exceptions and payroll approvals", section: "Reports" },
  { href: "/hr-admin/reports/payroll-adjustments", label: "Payroll adjustments report", description: "Payroll adjustment reporting", section: "Reports" },
  { href: "/hr-admin/reports/payroll-settlements", label: "Payroll settlements report", description: "Full and final settlement reporting", section: "Reports" },
  { href: "/hr-admin/reports/salary-variance", label: "Salary variance report", description: "Salary variance and CTC comparison", section: "Reports" },
  { href: "/hr-admin/reports/bank-advice", label: "Bank advice report", description: "Bank payout advice report", section: "Reports" },
  { href: "/hr-admin/reports/payslip-publication", label: "Payslip publication report", description: "Payslip publication and access status", section: "Reports" },
  { href: "/hr-admin/reports/statutory-deductions", label: "Statutory deductions report", description: "PF, ESI, PT, LWF, and TDS deductions", section: "Reports" },
  { href: "/hr-admin/reports/statutory-filing-status", label: "Statutory filing status report", description: "Filing status and compliance tracker", section: "Reports" },
  { href: "/hr-admin/reports/compliance-summary", label: "Compliance summary report", description: "Compliance summary across payroll and HR", section: "Reports" },
  { href: "/hr-admin/reports/pf-ecr-readiness", label: "PF ECR readiness report", description: "PF ECR file readiness", section: "Reports" },
  { href: "/hr-admin/reports/esic-contribution-readiness", label: "ESIC readiness report", description: "ESIC contribution readiness", section: "Reports" },
  { href: "/hr-admin/reports/professional-tax-readiness", label: "Professional tax readiness report", description: "PT readiness and filing checks", section: "Reports" },
  { href: "/hr-admin/reports/lwf-readiness", label: "LWF readiness report", description: "Labour welfare fund readiness", section: "Reports" },
  { href: "/hr-admin/reports/tds-efile-readiness", label: "TDS e-file readiness report", description: "TDS e-file readiness", section: "Reports" },
  { href: "/hr-admin/reports/challan-reconciliation", label: "Challan reconciliation report", description: "Challan reconciliation and statutory evidence", section: "Reports" },
  { href: "/hr-admin/reports/provider-filing-receipts", label: "Provider filing receipts report", description: "Payroll provider filing receipts", section: "Reports" },
  { href: "/hr-admin/reports/finance-handoff-exceptions", label: "Finance handoff exceptions report", description: "Finance handoff exception reporting", section: "Reports" },
  { href: "/hr-admin/reports/export-audits", label: "Export audit report", description: "Report export audit trail", section: "Reports" },
];

const operationsSearchDestinations: HrAdminSearchDestination[] = [
  { href: "/hr-admin/import-history", label: "Import history", description: "CSV import batches and row outcomes", section: "Operations" },
  { href: "/hr-admin/audit", label: "Audit timeline", description: "Recent approval, document, lifecycle, and delivery evidence", section: "Operations" },
  { href: "/hr-admin/saas-operations", label: "SaaS operations", description: "Operations command center", section: "Operations" },
  { href: "/hr-admin/saas-control-plane", label: "SaaS control plane", description: "Control plane health and checks", section: "Operations" },
  { href: "/hr-admin/saas-resilience", label: "SaaS resilience", description: "Reliability and recovery checks", section: "Operations" },
  { href: "/hr-admin/saas-sla-operations", label: "SLA operations", description: "SLA tracking and operations", section: "Operations" },
];

export const hrAdminSearchDestinations: HrAdminSearchDestination[] = [
  ...payrollReadinessSearchDestinations,
  ...payrollSetupSearchDestinations,
  ...salarySetupSearchDestinations,
  ...payrollRulesSearchDestinations,
  ...statutorySearchDestinations,
  ...payrollOperationsSearchDestinations,
  ...workforceSearchDestinations,
  ...timeLeaveSearchDestinations,
  ...documentsSearchDestinations,
  ...notificationSearchDestinations,
  ...setupSearchDestinations,
  ...reportSearchDestinations,
  ...operationsSearchDestinations,
];
