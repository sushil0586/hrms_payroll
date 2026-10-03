# Practical Scenario Coverage

This page checks whether the documentation covers both successful workflows and the common failure paths a new user is likely to face.

Use this page as a release checklist whenever a new page, workflow, or module is added.

## How to read this matrix

| Column | Meaning |
| --- | --- |
| Scenario | Real-world user situation. |
| Positive path | Where the user learns the normal successful workflow. |
| Negative path | Where the user learns what to do when something goes wrong. |
| Owner | Person or workspace that usually resolves it. |

## Login, access, and roles

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| User logs in and lands in the right workspace | [Workspaces and Roles](getting-started/workspaces-and-roles.md) | [Access Issues](troubleshooting/access.md) | Tenant Admin / HR Admin |
| User lands on Workspace Access | [Tenant Users](tenant-admin/users.md) | [Access Issues](troubleshooting/access.md) | Tenant Admin |
| User cannot see a menu or button | [Roles](tenant-admin/roles.md) | [Troubleshooting](troubleshooting/index.md) | Tenant Admin |
| User needs ESS or MSS access | [Workspaces and Roles](getting-started/workspaces-and-roles.md) | [Access Issues](troubleshooting/access.md) | HR Admin / Tenant Admin |
| Admin role is too broad | [Roles](tenant-admin/roles.md) | [Tenant Admin Weekly Checklist](checklists/tenant-admin-weekly.md) | Tenant Admin |
| HR creates access before employee setup is complete | [Onboarding Prerequisites](hr-admin/onboarding-prerequisites.md#example-give-an-employee-ess-access) | [Onboarding Prerequisites](hr-admin/onboarding-prerequisites.md#negative-scenario-user-lands-on-workspace-access) | HR Admin / Tenant Admin |

## Tenant onboarding and launch

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| New signup lead becomes a tenant | [Platform Leads](platform-admin/leads.md) | [Platform Audit Logs](platform-admin/audit-logs.md) | Platform Admin |
| Tenant is created manually | [Platform Tenants](platform-admin/tenants.md) | [Platform Tenants FAQ](platform-admin/tenants.md#faq) | Platform Admin |
| Tenant admin access is provisioned | [Admin Access](platform-admin/admin-access.md) | [Access Issues](troubleshooting/access.md) | Platform Admin / Tenant Admin |
| Setup template is applied | [Setup Templates](platform-admin/setup-templates.md) | [Setup Templates FAQ](platform-admin/setup-templates.md#faq) | Platform Admin |
| Tenant is ready for activation | [Launch Readiness](platform-admin/launch-readiness.md) | [Go-Live Checklist](launch/go-live-checklist.md) | Platform Admin |
| Handoff from platform to customer is needed | [Admin Handoff Guide](launch/admin-handoff.md) | [Launch Readiness](platform-admin/launch-readiness.md) | Platform Admin / Tenant Admin |

## Tenant account administration

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Invite or create account users | [Tenant Users](tenant-admin/users.md) | [Access Issues](troubleshooting/access.md) | Tenant Admin |
| Create or review a role | [Tenant Roles](tenant-admin/roles.md) | [Tenant Roles FAQ](tenant-admin/roles.md#faq) | Tenant Admin |
| Plan or limit blocks usage | [Plan and Billing](tenant-admin/plan.md) | [Plan limit workflow](tenant-admin/plan.md#limit-review-workflow) | Tenant Admin / Commercial |
| Support needs temporary access | [Support Access](tenant-admin/support-access.md) | [Trust Audit](tenant-admin/trust-audit.md) | Tenant Admin |
| Security readiness has blockers | [Security Readiness](tenant-admin/security.md) | [Tenant Admin Weekly Checklist](checklists/tenant-admin-weekly.md) | Tenant Admin |
| Account setting changes are needed | [Tenant Settings](tenant-admin/settings.md) | [Trust Audit](tenant-admin/trust-audit.md) | Tenant Admin |

## HR setup and employee master

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Prepare setup before employee onboarding | [Onboarding Prerequisites](hr-admin/onboarding-prerequisites.md) | [Go-Live Checklist](launch/go-live-checklist.md) | HR Admin / Tenant Admin / Payroll Admin |
| Create organization masters | [Organization](hr-admin/organization.md) | [Employee to Payroll](workflows/employee-to-payroll.md) | HR Admin |
| Add a new branch or office | [Organization](hr-admin/organization.md#example-add-a-new-mumbai-branch) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin / Payroll Admin |
| Employee import fails because an organization code is missing | [Organization](hr-admin/organization.md#example-fix-employee-import-missing-department) | [Imports](hr-admin/imports.md) | HR Admin |
| Employee import should be reviewed before commit | [Imports](hr-admin/imports.md#example-review-an-employee-import-before-payroll-setup) | [Imports](hr-admin/imports.md#negative-scenario-import-creates-bad-data) | HR Admin |
| Employee import looks successful but records are missing | [Imports](hr-admin/imports.md#example-detect-duplicate-upload) | [Imports](hr-admin/imports.md#negative-scenario-import-says-completed-but-employee-is-missing) | HR Admin |
| Organization value exists but does not appear in employee dropdown | [Organization](hr-admin/organization.md#troubleshooting) | [Employee to Payroll](workflows/employee-to-payroll.md) | HR Admin |
| Add or correct an employee | [Employees](hr-admin/employees.md) | [Employee to Payroll](workflows/employee-to-payroll.md) | HR Admin |
| Employee has missing department, branch, legal entity, or manager | [Employees](hr-admin/employees.md) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin |
| Employee lands on Workspace Access after login | [Employees](hr-admin/employees.md#example-give-employee-ess-access) | [Access Issues](troubleshooting/access.md) | HR Admin / Tenant Admin |
| Manager cannot see direct report in MSS | [Employees](hr-admin/employees.md#example-make-a-manager-ready-for-mss) | [Access Issues](troubleshooting/access.md) | HR Admin / Manager |
| Manager chain is needed before approvals start | [Onboarding Prerequisites](hr-admin/onboarding-prerequisites.md#example-build-a-manager-chain-for-approval-testing) | [Onboarding Prerequisites](hr-admin/onboarding-prerequisites.md#negative-scenario-approval-stuck-because-manager-is-missing) | HR Admin / Manager |
| New employee is not payroll-ready | [Employees](hr-admin/employees.md#example-add-employee-payroll-readiness) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin / Payroll Admin |
| Employee import row is rejected | [Employees](hr-admin/employees.md#bulk-import-and-correction) | [Imports](hr-admin/imports.md) | HR Admin |
| Employee lifecycle event is needed | [Lifecycle](hr-admin/lifecycle.md) | [HR Admin Daily Checklist](checklists/hr-admin-daily.md) | HR Admin |
| Movement, exit, or probation item is pending | [Lifecycle](hr-admin/lifecycle.md) | [HR Admin Daily Checklist](checklists/hr-admin-daily.md) | HR Admin / Manager |
| Employee transfer must happen from a future date | [Lifecycle](hr-admin/lifecycle.md#example-transfer-from-bengaluru-to-mumbai) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin / Payroll Admin |
| Promotion changes designation and salary | [Lifecycle](hr-admin/lifecycle.md#example-promotion-with-salary-impact) | [Salary Setup](hr-admin/payroll/salary-setup.md) | HR Admin / Payroll Admin |
| Manager change affects approvals | [Lifecycle](hr-admin/lifecycle.md#example-manager-change) | [Access Issues](troubleshooting/access.md) | HR Admin / Manager |
| Probation decision is due or overdue | [Lifecycle](hr-admin/lifecycle.md#probation-workflow) | [HR Admin Daily Checklist](checklists/hr-admin-daily.md) | HR Admin / Manager |
| Employee resignation requires final settlement | [Lifecycle](hr-admin/lifecycle.md#example-resignation-and-final-settlement-readiness) | [Adjustments and Settlements](hr-admin/payroll/adjustments-settlements.md) | HR Admin / Payroll Admin |
| Bulk import is needed | [Imports](hr-admin/imports.md) | [Organization](hr-admin/organization.md) | HR Admin |

## Documents

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Configure required document before onboarding | [HR Documents](hr-admin/documents.md#example-configure-pan-requirement) | [Onboarding Prerequisites](hr-admin/onboarding-prerequisites.md#6-document-requirements) | HR Admin |
| Configure payroll-critical bank proof | [HR Documents](hr-admin/documents.md#example-configure-bank-proof-requirement) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin / Payroll Admin |
| Employee uploads required document | [ESS Documents](ess/documents.md) | [Document Issues](troubleshooting/documents.md) | Employee |
| HR reviews documents | [HR Documents](hr-admin/documents.md) | [Documents to Verification](workflows/documents-to-verification.md) | HR Admin |
| Document is rejected | [ESS Documents](ess/documents.md#common-rejection-reasons) | [Document Issues](troubleshooting/documents.md) | Employee / HR Admin |
| Employee cannot see a required upload request | [HR Documents](hr-admin/documents.md#negative-scenario-employee-cannot-see-document-request) | [Access Issues](troubleshooting/access.md) | HR Admin / Tenant Admin |
| Employee uploads wrong file or wrong category | [HR Documents](hr-admin/documents.md#negative-scenario-wrong-category-or-wrong-file) | [Document Issues](troubleshooting/documents.md) | Employee / HR Admin |
| Employee document has a name mismatch | [HR Documents](hr-admin/documents.md#negative-scenario-name-mismatch) | [Employees](hr-admin/employees.md) | HR Admin |
| Expiring document needs renewal | [HR Documents](hr-admin/documents.md) | [Document Issues](troubleshooting/documents.md) | HR Admin / Employee |
| Payroll blocker remains after document verification | [HR Documents](hr-admin/documents.md#negative-scenario-payroll-blocker-remains-after-verification) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin / Payroll Admin |
| Document evidence is needed | [Documents to Verification](workflows/documents-to-verification.md) | [Reports and Audit](hr-admin/reports-audit.md) | HR Admin |

## Attendance, leave, and policies

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Employee requests leave | [ESS Overview](ess/index.md) | [Leave and Attendance to Payroll](workflows/leave-attendance-to-payroll.md) | Employee / Manager |
| Manager approves leave | [MSS Approvals](mss/approvals.md) | [MSS Escalation Guidance](mss/task-recipes.md#escalation-guidance) | Manager |
| Attendance regularization is needed | [Attendance](hr-admin/attendance.md) | [Leave and Attendance to Payroll](workflows/leave-attendance-to-payroll.md) | Employee / Manager / HR Admin |
| Pending approvals affect payroll | [MSS Approvals](mss/approvals.md) | [Payroll Issues](troubleshooting/payroll.md) | Manager / HR Admin |
| Leave or attendance policy must change | [Policies](hr-admin/policies.md) | [Policies FAQ](hr-admin/policies.md#faq) | HR Admin |
| Employee has no active leave policy | [Policies](hr-admin/policies.md#negative-scenario-no-active-leave-policy-assigned) | [Leave Management](hr-admin/leave.md#troubleshooting) | HR Admin |
| Department-specific policy should override default policy | [Policies](hr-admin/policies.md#example-department-specific-leave-override) | [Policies](hr-admin/policies.md#conflict-handling) | HR Admin |
| Policy change should start next month | [Policies](hr-admin/policies.md#example-future-dated-policy-change) | [Policies](hr-admin/policies.md#negative-scenario-policy-change-breaks-payroll) | HR Admin / Payroll Admin |
| Approval route needs manager first and HR fallback | [Workflows](hr-admin/workflows.md#example-leave-approval-manager-first-hr-fallback) | [Workflows](hr-admin/workflows.md#negative-scenario-approval-stuck-with-manager) | HR Admin / Manager |
| Workflow template is missing | [Workflows](hr-admin/workflows.md#core-workflow-templates) | [Workflows](hr-admin/workflows.md#negative-scenario-workflow-template-missing) | HR Admin |
| Transfer routes approval to old manager | [Workflows](hr-admin/workflows.md#negative-scenario-wrong-approver-after-transfer) | [Lifecycle](hr-admin/lifecycle.md#troubleshooting) | HR Admin / Manager |
| Payroll close is near and time data is not ready | [Time and Leave](hr-admin/time-leave.md) | [HR Admin Daily Checklist](checklists/hr-admin-daily.md) | HR Admin |

## Launch readiness and operational health

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| HR needs to clear a launch blocker | [Launch Readiness](hr-admin/launch-readiness.md#workflow) | [Launch Readiness](hr-admin/launch-readiness.md#do-not-close-a-blocker-if) | HR Admin |
| User lands on Workspace Access during launch testing | [Launch Readiness](hr-admin/launch-readiness.md#example-clear-a-missing-employee-role-blocker) | [Onboarding Prerequisites](hr-admin/onboarding-prerequisites.md#negative-scenario-user-lands-on-workspace-access) | HR Admin / Tenant Admin |
| Organization readiness blocks launch | [Launch Readiness](hr-admin/launch-readiness.md#example-clear-an-organization-master-blocker) | [Organization](hr-admin/organization.md#troubleshooting) | HR Admin |
| Launch risk cannot be fixed immediately | [Launch Readiness](hr-admin/launch-readiness.md#example-assign-owner-and-due-date) | [Launch Readiness](hr-admin/launch-readiness.md#negative-scenario-risk-is-ignored-without-evidence) | HR Admin / Owner |
| Notification failures appear before go-live | [Ops Health](hr-admin/ops-health.md#example-notification-failures-before-go-live) | [Notification Issues](troubleshooting/notifications.md) | HR Admin / Support |
| Provider queue is stale | [Ops Health](hr-admin/ops-health.md#negative-scenario-provider-queue-is-stale) | [Ops Health](hr-admin/ops-health.md#escalate-if) | HR Admin / Support |
| Support access must be reviewed | [Ops Health](hr-admin/ops-health.md#example-support-access-review) | [Ops Health](hr-admin/ops-health.md#negative-scenario-active-support-access-without-a-ticket) | Tenant Admin / HR Admin |
| Public app opens but data does not load | [Ops Health](hr-admin/ops-health.md#example-api-and-public-app-url-health) | [Access Issues](troubleshooting/access.md) | Platform Support |

## Payroll setup

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Create payroll calendar, period, and pay group | [Payroll Setup](hr-admin/payroll/payroll-setup.md#recommended-setup-workflow) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |
| Create India monthly payroll calendar | [Payroll Setup](hr-admin/payroll/payroll-setup.md#example-create-india-monthly-payroll-calendar) | [Payroll Setup](hr-admin/payroll/payroll-setup.md#negative-scenario-duplicate-active-calendars) | Payroll Admin |
| Create monthly payroll period | [Payroll Setup](hr-admin/payroll/payroll-setup.md#example-create-september-2026-payroll-period) | [Payroll Setup](hr-admin/payroll/payroll-setup.md#negative-scenario-period-dates-overlap) | Payroll Admin |
| Create payroll pay groups | [Payroll Setup](hr-admin/payroll/payroll-setup.md#example-create-pay-groups-for-india-employees) | [Payroll Setup](hr-admin/payroll/payroll-setup.md#negative-scenario-employee-assigned-to-wrong-pay-group) | Payroll Admin / HR Admin |
| Assign employees to payroll | [Payroll Setup](hr-admin/payroll/payroll-setup.md#example-assign-employees-to-monthly-staff-pay-group) | [Payroll Setup](hr-admin/payroll/payroll-setup.md#negative-scenario-employee-missing-from-payroll-because-assignment-starts-late) | HR Admin / Payroll Admin |
| Setup list is too long to manage | [Payroll Setup](hr-admin/payroll/payroll-setup.md#pagination-and-search-standard) | [Payroll Setup](hr-admin/payroll/payroll-setup.md#long-list-handling) | Payroll Admin |
| Configure salary structure and components | [Salary Setup](hr-admin/payroll/salary-setup.md#salary-setup-workflow-for-a-new-tenant) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |
| Create Basic and HRA salary components | [Salary Setup](hr-admin/payroll/salary-setup.md#example-create-basic-and-hra-components) | [Salary Setup](hr-admin/payroll/salary-setup.md#component-design-standard) | Payroll Admin |
| Configure Indian HRA by city | [Salary Setup](hr-admin/payroll/salary-setup.md#example-hra-40-for-bengaluru-50-for-delhi) | [Salary Setup](hr-admin/payroll/salary-setup.md#hra-setup-for-indian-payroll) | Payroll Admin |
| Configure bonus frequency | [Salary Setup](hr-admin/payroll/salary-setup.md#bonus-frequency-setup) | [Salary Setup](hr-admin/payroll/salary-setup.md#negative-scenario-annual-bonus-added-as-monthly-component) | Payroll Admin / Finance |
| Create salary structure and version | [Salary Setup](hr-admin/payroll/salary-setup.md#example-create-staff-salary-structure) | [Salary Setup](hr-admin/payroll/salary-setup.md#negative-scenario-editing-historical-version) | Payroll Admin |
| Assign salary to employee | [Salary Setup](hr-admin/payroll/salary-setup.md#example-assign-salary-to-a-new-employee) | [Salary Setup](hr-admin/payroll/salary-setup.md#negative-scenario-salary-effective-date-is-after-payroll-period) | HR Admin / Payroll Admin |
| Salary revision after promotion | [Salary Setup](hr-admin/payroll/salary-setup.md#example-salary-revision-after-promotion) | [Lifecycle](hr-admin/lifecycle.md#example-promotion-with-salary-impact) | HR Admin / Payroll Admin |
| Create or review payroll rules | [Payroll Rules](hr-admin/payroll/payroll-rules.md#rule-design-standard) | [Payroll Rules trace guidance](hr-admin/payroll/payroll-rules.md#how-to-read-trace) | Payroll Admin |
| Create HRA rule by city | [Payroll Rules](hr-admin/payroll/payroll-rules.md#example-hra-rule-by-city) | [Payroll Rules](hr-admin/payroll/payroll-rules.md#negative-scenario-missing-dependency-produces-wrong-amount) | Payroll Admin |
| Prorate salary for mid-month joiner | [Payroll Rules](hr-admin/payroll/payroll-rules.md#example-prorate-salary-by-payable-days) | [Payroll Issues](troubleshooting/payroll.md#salary-is-not-calculating) | Payroll Admin / HR Admin |
| Configure quarterly bonus rule | [Payroll Rules](hr-admin/payroll/payroll-rules.md#example-quarterly-bonus-rule) | [Salary Setup](hr-admin/payroll/salary-setup.md#negative-scenario-annual-bonus-added-as-monthly-component) | Payroll Admin / Finance |
| Change formula from next month | [Payroll Rules](hr-admin/payroll/payroll-rules.md#example-change-hra-from-next-month) | [Payroll Rules](hr-admin/payroll/payroll-rules.md#negative-scenario-rule-edited-without-versioning) | Payroll Admin |
| Trace explains wrong component amount | [Payroll Rules](hr-admin/payroll/payroll-rules.md#how-to-read-trace) | [Payroll Rules](hr-admin/payroll/payroll-rules.md#negative-scenario-two-rules-affect-same-component) | Payroll Admin |
| Configure statutory payroll | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#example-configure-statutory-pack-for-accerio-india) | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#negative-scenario-outdated-statutory-slab) | Payroll Admin / Finance |
| Configure employer statutory registrations | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#example-configure-employer-registrations) | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#negative-scenario-pan-missing-before-tds-calculation) | Payroll Admin / Compliance |
| Configure PF and ESIC | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#example-pf-setup) | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#example-esic-setup) | Payroll Admin |
| Configure Professional Tax by state | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#example-professional-tax-by-state) | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#negative-scenario-wrong-state-drives-professional-tax) | Payroll Admin / HR Admin |
| TDS uses employee declaration and proof | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#example-tds-using-employee-tax-declaration) | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#negative-scenario-proof-accepted-after-payroll-lock) | Employee / Payroll Admin |
| Tax proof must be rejected and corrected | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md#example-reject-tax-proof-and-notify-employee) | [ESS Tax declaration FAQ](ess/statutory-declarations.md#faq) | Employee / Payroll Admin |
| Configure payroll provider | [Payroll Providers](hr-admin/payroll/payroll-providers.md) | [Provider failure guidance](hr-admin/payroll/payroll-providers.md) | Payroll Admin |
| Record adjustments or settlements | [Adjustments and Settlements](hr-admin/payroll/adjustments-settlements.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |

## Payroll run and finance handoff

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Payroll readiness is clear | [Payroll Control](hr-admin/payroll/payroll-control.md#pre-input-lock-checklist) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin / HR Admin |
| Payroll blockers exist | [Payroll Control](hr-admin/payroll/payroll-control.md#common-blockers) | [Payroll Control](hr-admin/payroll/payroll-control.md#negative-scenario-ready-percentage-looks-high-but-payroll-is-blocked) | Payroll Admin / HR Admin |
| September payroll readiness needs review | [Payroll Control](hr-admin/payroll/payroll-control.md#example-september-payroll-readiness-for-accerio-india) | [Payroll Control](hr-admin/payroll/payroll-control.md#decision-rules) | Payroll Admin / HR Admin |
| Employee has no primary bank account | [Payroll Control](hr-admin/payroll/payroll-control.md#example-fix-missing-primary-bank-account) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin / Payroll Admin |
| Pending leave approval blocks payroll | [Payroll Control](hr-admin/payroll/payroll-control.md#example-resolve-pending-leave-approval-before-payroll) | [Leave and Attendance to Payroll](workflows/leave-attendance-to-payroll.md) | HR Admin / Manager |
| Payroll warning must be accepted with evidence | [Payroll Control](hr-admin/payroll/payroll-control.md#example-accept-a-non-critical-warning) | [Payroll Control](hr-admin/payroll/payroll-control.md#when-can-warnings-be-accepted) | Payroll Admin / HR Admin |
| Source data changed after input lock | [Payroll Control](hr-admin/payroll/payroll-control.md#negative-scenario-source-data-changes-after-input-lock) | [Payroll Close to Finance Handoff](workflows/payroll-close-to-finance-handoff.md) | Payroll Admin |
| Employee missing from payroll scope | [Payroll Control](hr-admin/payroll/payroll-control.md#negative-scenario-employee-missing-from-payroll-scope) | [Employee to Payroll](workflows/employee-to-payroll.md) | HR Admin / Payroll Admin |
| Inputs must be locked | [Payroll Inputs](hr-admin/payroll/payroll-inputs.md#example-lock-september-payroll-inputs) | [Payroll Inputs](hr-admin/payroll/payroll-inputs.md#negative-scenario-lock-is-blocked) | Payroll Admin |
| Source snapshot needs review before lock | [Payroll Inputs](hr-admin/payroll/payroll-inputs.md#example-review-one-employee-before-lock) | [Payroll Inputs](hr-admin/payroll/payroll-inputs.md#negative-scenario-source-changed-after-inputs-were-locked) | Payroll Admin / HR Admin |
| Wrong payroll run selected | [Payroll Inputs](hr-admin/payroll/payroll-inputs.md#example-create-september-payroll-input-snapshot) | [Payroll Inputs](hr-admin/payroll/payroll-inputs.md#negative-scenario-wrong-payroll-run-selected) | Payroll Admin |
| Calculation produces issues | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md#example-calculate-september-2026-payroll) | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md#negative-scenario-calculation-blocked-because-inputs-are-not-locked) | Payroll Admin |
| HRA amount needs explanation | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md#example-investigate-hra-for-one-employee) | [Payroll Rules](hr-admin/payroll/payroll-rules.md#negative-scenario-missing-dependency-produces-wrong-amount) | Payroll Admin |
| Employee has zero net pay | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md#example-zero-net-pay-investigation) | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md#negative-scenario-employee-missing-from-calculation) | Payroll Admin / HR Admin |
| Calculation must be rerun | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md#rerun-rules) | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md#negative-scenario-latest-net-pay-is-from-the-wrong-run) | Payroll Admin / Finance |
| Exceptions need review | [Payroll Review](hr-admin/payroll/payroll-review.md#example-approve-september-payroll-review) | [Payroll Review](hr-admin/payroll/payroll-review.md#negative-scenario-payroll-approved-with-open-blockers) | Payroll Admin / Approver |
| Payroll warning must be accepted during review | [Payroll Review](hr-admin/payroll/payroll-review.md#example-accept-a-warning-with-evidence) | [Payroll Review](hr-admin/payroll/payroll-review.md#negative-scenario-final-lock-applied-too-early) | Payroll Admin / Finance |
| Payroll must be rejected for correction | [Payroll Review](hr-admin/payroll/payroll-review.md#example-reject-payroll-for-correction) | [Payroll Review](hr-admin/payroll/payroll-review.md#negative-scenario-approver-cannot-approve) | Payroll Admin / Approver |
| Payslips and registers are generated | [Payroll Outputs](hr-admin/payroll/payroll-outputs.md#example-generate-september-payroll-outputs) | [Payroll Outputs](hr-admin/payroll/payroll-outputs.md#negative-scenario-output-generated-from-wrong-run) | Payroll Admin |
| Payslips are published to employees | [Payroll Outputs](hr-admin/payroll/payroll-outputs.md#example-publish-payslips-to-ess) | [Payroll Outputs](hr-admin/payroll/payroll-outputs.md#negative-scenario-employee-cannot-see-payslip) | Payroll Admin / HR Admin |
| Payslip count does not match employee count | [Payroll Outputs](hr-admin/payroll/payroll-outputs.md#output-verification-checklist) | [Payroll Outputs](hr-admin/payroll/payroll-outputs.md#negative-scenario-payslip-count-does-not-match-employee-count) | Payroll Admin |
| Finance receives payroll handoff | [Payroll Handoff](hr-admin/payroll/payroll-handoff.md#example-complete-september-finance-handoff) | [Payroll Handoff](hr-admin/payroll/payroll-handoff.md#negative-scenario-no-acknowledgement-received) | Payroll Admin / Finance Manager |
| Provider delivery succeeds or fails | [Payroll Handoff](hr-admin/payroll/payroll-handoff.md#example-provider-delivery-succeeds) | [Payroll Handoff](hr-admin/payroll/payroll-handoff.md#negative-scenario-provider-retry-cap-reached) | Payroll Admin / Integration Owner |
| Finance rejects bank advice | [Payroll Handoff](hr-admin/payroll/payroll-handoff.md#example-manual-handoff-accepted) | [Payroll Handoff](hr-admin/payroll/payroll-handoff.md#negative-scenario-finance-rejects-bank-advice) | Finance Manager / Payroll Admin |
| Bank advice or statutory evidence does not reconcile | [Finance Manager](finance-manager/index.md) | [Payment Handoff](finance-manager/payment-handoff.md) | Finance Manager |

## ESS, MSS, and employee experience

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Employee downloads payslip | [ESS Payslips](ess/payslips.md) | [Payroll Issues](troubleshooting/payroll.md#payslip-not-visible-in-ess) | Employee / HR Admin |
| Employee submits tax declaration | [Tax Declarations](ess/statutory-declarations.md) | [Tax declaration FAQ](ess/statutory-declarations.md#faq) | Employee / HR Admin |
| Employee reviews notifications | [ESS Notifications](ess/notifications.md) | [Notification Issues](troubleshooting/notifications.md) | Employee / HR Admin |
| Manager reviews team approvals | [MSS Approvals](mss/approvals.md) | [MSS escalation guidance](mss/task-recipes.md#escalation-guidance) | Manager / HR Admin |
| Manager notification is old or failed | [MSS Notifications](mss/notifications.md) | [Notification Issues](troubleshooting/notifications.md) | Manager / HR Admin |

## Notifications and delivery

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Notification template/event is configured | [HR Notifications](hr-admin/notifications.md) | [Notification Issues](troubleshooting/notifications.md) | HR Admin |
| Invite email is sent to a new user | [HR Notifications](hr-admin/notifications.md#example-new-user-invite-email) | [HR Notifications](hr-admin/notifications.md#negative-scenario-user-did-not-receive-invite) | Tenant Admin / HR Admin |
| Password reset email is requested | [HR Notifications](hr-admin/notifications.md#example-password-reset-email) | [Notification Issues](troubleshooting/notifications.md#user-says-they-did-not-receive-a-message) | User / HR Admin / Tenant Admin |
| Direct mail-provider test works but app email does not | [HR Notifications](hr-admin/notifications.md#example-password-reset-email) | [HR Notifications](hr-admin/notifications.md#negative-scenario-direct-smtp-test-works-but-app-email-does-not) | HR Admin / Support |
| Leave or attendance notification is triggered | [HR Notifications](hr-admin/notifications.md#example-leave-request-notifications) | [Notification Failure to Recovery](workflows/notification-failure-to-recovery.md) | Employee / Manager / HR Admin |
| Document or tax proof rejection notification is sent | [HR Notifications](hr-admin/notifications.md#example-document-rejection-notification) | [Notification Issues](troubleshooting/notifications.md) | Employee / HR Admin |
| Payslip published notification is sent | [HR Notifications](hr-admin/notifications.md#example-payslip-published-notification) | [Payroll Issues](troubleshooting/payroll.md#payslip-not-visible-in-ess) | Employee / Payroll Admin |
| Payroll review or finance handoff notification is sent | [HR Notifications](hr-admin/notifications.md#example-payroll-review-and-finance-handoff) | [Payroll Close to Finance Handoff](workflows/payroll-close-to-finance-handoff.md) | Payroll Admin / Finance Manager |
| Email or in-app notification fails | [Notification Failure to Recovery](workflows/notification-failure-to-recovery.md) | [Notification Issues](troubleshooting/notifications.md) | HR Admin / Support |
| Retry is safe | [HR Notifications](hr-admin/notifications.md) | [Notification Failure to Recovery](workflows/notification-failure-to-recovery.md) | HR Admin |
| Retry cap is reached | [Glossary and Status Guide](glossary.md) | [Notification Issues](troubleshooting/notifications.md) | HR Admin / Support |
| Notification link opens wrong workspace | [HR Notifications](hr-admin/notifications.md#template-design-standard) | [HR Notifications](hr-admin/notifications.md#negative-scenario-template-link-opens-wrong-workspace) | HR Admin / Tenant Admin |
| Notification is sent to the wrong person | [HR Notifications](hr-admin/notifications.md#event-and-template-setup-checklist) | [HR Notifications](hr-admin/notifications.md#negative-scenario-notification-sent-to-wrong-person) | HR Admin / Tenant Admin |
| Delivery evidence is needed | [HR Notifications](hr-admin/notifications.md) | [Reports and Audit](hr-admin/reports-audit.md) | HR Admin |

## Reports, audit, and evidence

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| User needs operational report | [Reports](hr-admin/reports-audit.md) | [Reports evidence checklist](hr-admin/reports-audit.md) | HR Admin |
| User needs audit trail | [Audit](hr-admin/audit.md) | [Trust Audit](tenant-admin/trust-audit.md) | HR Admin / Tenant Admin |
| HR needs pre-payroll evidence before opening payroll | [Reports and Audit](hr-admin/reports-audit.md#pre-payroll-evidence-pack) | [Reports and Audit](hr-admin/reports-audit.md#negative-scenario-report-total-differs-from-source-page) | HR Admin |
| Leave and attendance evidence is needed before payroll | [Reports and Audit](hr-admin/reports-audit.md#example-leave-and-attendance-evidence-before-payroll) | [Leave and Attendance to Payroll](workflows/leave-attendance-to-payroll.md) | HR Admin |
| Someone changed an employee record before payroll | [Reports and Audit](hr-admin/reports-audit.md#example-investigate-who-changed-an-employee-record) | [Reports and Audit](hr-admin/reports-audit.md#negative-scenario-wrong-period-exported) | HR Admin |
| Finance needs close evidence | [Finance Audit Evidence](finance-manager/audit-evidence.md) | [Finance Payroll Day Checklist](checklists/finance-manager-payroll-day.md) | Finance Manager |
| Platform action needs evidence | [Platform Audit Logs](platform-admin/audit-logs.md) | [Launch Readiness](platform-admin/launch-readiness.md) | Platform Admin |

## Coverage decision

The current user guide covers the main practical paths a new user needs:

- Positive workflows: setup, action, approval, payroll close, handoff, download, export, publish, and review.
- Negative workflows: blocked, warning, rejected, failed, retry capped, missing access, missing evidence, mismatch, stale provider job, and locked state.
- Cross-workspace handoffs: Platform to Tenant, Tenant to HR, HR to Payroll, Payroll to Finance, and Finance to Audit.
- Self-service questions: ESS/MSS access, payslips, documents, tax declarations, approvals, and notifications.

If a new scenario is not in this matrix, add it before considering the documentation complete for that release.
