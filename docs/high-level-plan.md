# HRMS + Payroll SaaS High-Level Plan

## 1. Product Vision

Build a multi-tenant SaaS platform for HR, attendance, leave, payroll, compliance, employee self-service, and management reporting that can serve:

- Small businesses with simple HR and salary workflows
- Mid-sized companies with department, shift, and policy complexity
- Enterprises with multi-entity, multi-location, multi-grade, and approval-heavy processes
- Service businesses, retail, manufacturing, staffing, consulting, and hybrid workforce models

The product should be configuration-first, not hardcoded for one company type.

## 2. Core Product Principles

- Multi-tenant by design with strict tenant isolation
- Configuration over customization wherever possible
- Modular so clients can adopt HRMS only, payroll only, or full suite
- Audit-friendly for compliance and payroll traceability
- Workflow-driven approvals for HR and finance operations
- API-first to support integrations with accounting, ERP, biometrics, and banking
- Role-based and permission-driven for admin, HR, finance, manager, employee, auditor, and partner access

## 3. Target Customer Segments

### Phase 1 Focus

- SMBs with 20 to 500 employees
- India-first payroll and statutory compliance
- Companies moving from spreadsheets or fragmented tools

### Expansion Segments

- Multi-company groups
- Staffing and contractor-heavy organizations
- Organizations with multiple pay cycles or complex earning structures
- Global or multi-country employers through localization packs

## 4. Product Modules

### Foundation

- Tenant setup and onboarding
- Organization structure: company, branch, department, designation, cost center, grade, business unit
- User management and role-based access control
- Workflow engine and approval matrix
- Notification engine for email, SMS, and in-app alerts
- Document storage and audit logs

### Core HRMS

- Employee master and lifecycle management
- Offer, onboarding, confirmation, transfer, promotion, and exit workflows
- Employee documents and KYC records
- Asset assignment and return tracking
- Employee self-service portal
- Manager self-service portal

### Time, Attendance, and Leave

- Shift and roster management
- Attendance capture with biometric/import/API options
- Holiday calendars by entity/location
- Leave policies, balances, accruals, carry-forward, encashment
- Overtime, late marks, grace rules, and attendance regularization
- Field staff and geo-based attendance options

### Payroll

- Salary components, formulas/rule references, salary structures, versions, and employee salary assignments
- Payroll calendars, payroll periods, multiple pay groups, and effective-dated pay group assignments
- Payroll readiness review for source-data completeness before calculation
- Immutable payroll input snapshots and locked source context for calculation
- Versioned payroll rule definitions, safe formula previews, dependencies, and trace records
- Draft payroll calculation attempts with component lines, configurable rule ordering, totals, and source-hash traceability
- Configurable payroll calculation validation issues for source-data, salary setup, rule setup, statutory setup, adjustments, settlements, and output readiness
- Tenant-owned statutory packs, statutory components, statutory slabs, employer statutory registrations, filing calendars, statutory return/challan artifact generation, employee statutory profiles, employee statutory declaration/proof records, HR/ESS statutory declaration workspaces, and statutory-generated calculation lines for India-first PF, ESI, PT, LWF, TDS, gratuity, and future country-pack configuration
- Payroll review, exception decisions, approval trail, and final run locking before outputs
- Generated/published payroll output batches with payslip and register artifact snapshots, durable file metadata, checksums, configurable storage adapter metadata, governed HR admin downloads, employee self-service payslip downloads, payslip publish notifications, access events, employee read receipts, signed access grants, revocation history, and artifact access audit exports
- Finance handoff packages with bank advice, accounting export, statutory summary, statutory return, and statutory challan artifact snapshots, generated CSV payloads, durable file metadata, configurable storage adapter metadata, governed downloads, and provider delivery/reconciliation evidence
- One-time payroll adjustment register for arrears, bonuses, incentives, reimbursements, loans, advances, deductions, corrections, and settlement preparation
- Proration rules for joiners, exits, and unpaid leave
- Retro payroll adjustments and reprocessing
- Full and final settlement
- Payslips and payroll registers

### Compliance

- Statutory components and deductions
- TDS/tax computation
- PF, ESI, PT, LWF, gratuity, and bonus handling
- Compliance reports and filing support
- Audit trail for payroll changes and approvals

### Finance and Integrations

- Accounting/ERP export
- Bank transfer files and payment advice
- Integration framework for attendance devices, HR tools, and finance systems
- Webhooks and public APIs

### Reporting and Analytics

- Headcount and attrition dashboards
- Attendance and leave analytics
- Payroll cost and variance reporting
- Compliance trackers
- Configurable report builder and exports

## 5. Configuration Strategy

To support almost every type of client, configuration must be a first-class capability:

- Custom fields for employee and organization data
- Configurable salary components and formulas
- Configurable payroll readiness profiles for tenant-specific source checks
- Configurable payroll calendars, pay groups, period rules, cutoffs, and assignment scopes
- Rule engine for attendance, leave, and payroll calculations
- Configurable approval workflows by module, amount, role, or entity
- Policy templates by company, location, grade, department, or employee group
- Multi-entity and multi-branch support
- Multi-calendar, multi-shift, and multi-pay-cycle support
- Localization packs for country-specific payroll and compliance
- Feature flags and edition-based module controls

## 6. SaaS Architecture Direction

### Tenant Model

- Shared application with logical tenant isolation for faster SaaS scale
- Option to support dedicated deployments later for large clients

### Suggested Platform Layers

- Frontend web app for admin, HR, finance, managers, and employees
- Backend API platform with modular domain services
- Rules/configuration service for formulas and policies
- Payroll calculation engine
- Workflow and notification service
- Reporting and export service
- Background job system for payroll runs, imports, notifications, and report generation

### Data and Security

- Strong audit logging on payroll and employee changes
- Encryption for sensitive data
- Role-based access plus field-level controls for salary/privacy data
- Backups, monitoring, and operational alerts
- Compliance-ready access history and approval history

## 7. Suggested Functional Phases

### Phase 0: Discovery and Foundation

- Finalize product requirements and operating assumptions
- Define tenant model, permission model, and configuration framework
- Design core employee, organization, attendance, leave, and payroll data models
- Identify India payroll/compliance MVP scope

### Phase 1: MVP

- Tenant onboarding and organization setup
- Employee master and document management
- Leave and attendance basics
- Salary structures and monthly payroll processing
- Immutable payroll input snapshots and lock controls before calculation
- Versioned payroll formula/rule definitions with safe preview and trace output
- Draft payroll calculation attempts with line-level explainability before approval and output publishing
- Configurable payroll validation issue register with warning and blocker gates before calculation
- Payslips, payroll registers, and standard reports
- Basic compliance outputs for India
- ESS/MSS basics

### Phase 2: Operational Maturity

- Approval workflows
- Full and final settlement
- Loans, reimbursements, incentives, arrears
- Accounting export and bank files
- Better reporting and dashboards
- Import/export tooling

### Phase 3: Advanced Configuration

- Rules engine enhancements
- Advanced attendance scenarios and roster planning
- Multi-entity payroll orchestration
- Localization framework for other countries/states
- Public APIs and partner integrations

### Phase 4: Scale and Enterprise

- Advanced analytics
- Budgeting and workforce planning
- Performance and appraisal add-ons
- Recruitment/onboarding extensions
- Dedicated enterprise controls and deployment options

## 8. Recommended Non-Functional Priorities

- Accuracy of payroll calculations
- Clear traceability of every computed value
- Reliability during payroll close periods
- Import performance for large employee data sets
- Permission safety for confidential salary data
- Easy supportability through logs, audit trails, and admin tooling

## 9. Delivery Workstreams

- Product and domain design
- UX for admin, employee, and manager journeys
- Platform and backend architecture
- Payroll engine and compliance rules
- Frontend application
- DevOps, observability, and security
- QA automation and scenario coverage
- Implementation/onboarding tooling

## 10. Immediate Next Documents To Create

- Product requirements document
- Module-wise feature breakdown
- Tenant and permission model
- Payroll engine rule design
- India compliance scope checklist
- MVP user stories
- Technical architecture draft
- Database/domain model draft

## 11. Suggested Initial Tech Thinking

This can be revisited after discovery, but a practical starting direction is:

- Frontend: React/Next.js admin and employee portal
- Backend: modular API platform such as Node.js/NestJS or Java/Spring Boot
- Database: PostgreSQL
- Cache/queue: Redis
- Background jobs: queue workers for payroll and imports
- File/document storage: object storage
- Reporting: async export/report pipeline

## 12. Success Metrics

- Payroll processed without manual overrides for most clients
- Time to onboard a new customer reduced through configuration
- Time to run monthly payroll reduced significantly versus spreadsheets
- High adoption of ESS and manager workflows
- Low support tickets caused by configuration gaps

## 13. Working Assumptions

- Start India-first, but keep architecture localization-ready
- Design for SaaS scale from the beginning
- Avoid hardcoding client-specific rules into the core product
- Build a generic rules/configuration backbone early
- Keep payroll engine explainable for support and audits

## 14. Current HRMS Execution Snapshot

- HRMS is being completed before payroll engine development.
- Core HR admin, ESS, MSS, leave, attendance, lifecycle, document, notification, report, and workflow surfaces are at web-first pilot candidate state.
- Browser-based Playwright testing is the standard safety layer for route smoke, workflow behavior, responsive layout, and visual regression checks.
- The current trust-layer focus is workflow traceability, audit visibility, generated HR letter artifacts, notification diagnostics, and report/export readiness.
- Resettable live-backend browser coverage now verifies seeded auth, role routing, manager approval mutation, pending queue persistence, and HR admin workflow trace visibility.
- The first HRMS release-readiness pass is green across backend, web, mobile typecheck, browser behavior, visual regression, and live-backend workflow checks.
- The remaining release-risk decision is the mobile Metro `image-size` audit advisory, which currently has no patched version reported by the package audit feed.
- Pilot setup notes, release notes, known limitations, and the release-risk register now live in `docs/hrms-pilot-setup-notes.md`, `docs/hrms-release-notes.md`, `docs/hrms-known-limitations.md`, and `docs/hrms-release-risk-register.md`.
- Module-wise vertical coverage from a SaaS perspective is tracked in `docs/hrms-module-wise-vertical-coverage.md`.
- Payroll planning now starts with the configurable SaaS architecture and HRMS source-data contract in `docs/payroll-saas-architecture-plan.md` and `docs/payroll-source-data-contract.md`.
- Payroll foundation now includes source readiness, calendars/pay groups, salary setup, immutable input snapshots, configurable safe formula/rule preview traces, draft payroll calculation attempts, calculation validation issues, configurable statutory/component validation catalogs, tenant-owned statutory packs/components/slabs, employer statutory registrations, filing calendars, employee statutory profiles, employee statutory declaration/proof records with HR verification and lock states, employee statutory create/update/submit APIs, direct statutory proof upload through canonical employee documents, proof document/artifact reference linkage, HR-admin statutory review UI, ESS statutory declaration UI/actions, statutory-generated calculation lines, configurable TDS annualization with declaration cap consumption, tax regime comparison projections, selected-regime trace evidence, applied adjustment consumption in calculations, payroll review, exception decisions, approval trail, final run locking, generated/published payslip/register output artifacts with durable file metadata, storage adapter metadata, signed-download strategy metadata, sanitized object-storage profile snapshots, credential-reference-only storage contracts, runtime credential resolution, optional SDK-backed S3/GCS/Azure storage adapters, configurable storage policy enforcement, governed HR admin downloads, employee self-service payslip downloads, payslip publish notifications, access events, employee read receipts, signed access grants, grant revocation history, artifact access audit exports, finance handoff packages for bank advice/accounting/statutory summaries/statutory return/statutory challan files with generated CSV payloads, provider delivery records, provider submission adapter contracts, provider adapter request/result snapshots, provider credential-ref resolution, provider-specific bank/accounting/statutory sandbox adapter scaffolds, callback verification refs, signed provider callback ingestion, idempotent callback event records, configurable provider retry/dead-letter records, retry-worker runtime shell, certification evidence refs, reconciliation evidence, a one-time adjustment register for arrears/bonus/reimbursement/loan/correction inputs, and full-and-final settlement packages that generate applied calculation inputs; provider-side IAM/storage policy verification, lifecycle/KMS/scanning service integration, production provider SDK/portal adapters, production retry queue scheduling, auditor drilldown UX, and broader locked output audit trails are the next major build steps.
- Phase 5Q now adds tenant-level payroll provider onboarding and certification through `PayrollProviderConnection`, readiness gates, credential-ref-only validation, HR-admin setup/list/update/certify APIs, and `/hr-admin/payroll-providers` browser/visual coverage. Remaining provider depth is certified-connection route gating, production SDK/portal adapters, production queue scheduling, production webhook hardening, and automated sandbox certification execution.
- Phase 5R now connects finance handoff routes to provider connection readiness with configurable `disabled`, `warn`, `certified`, and `active` enforcement; delivery snapshots carry provider connection gate evidence and `/hr-admin/payroll-handoff` exposes gate status/blockers. Remaining provider depth is production SDK/portal adapters, production queue scheduling, production webhook hardening, and automated sandbox certification execution.
