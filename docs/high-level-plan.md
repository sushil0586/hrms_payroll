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
- Payroll foundation now includes source readiness, calendars/pay groups, salary setup, immutable input snapshots, configurable safe formula/rule preview traces, draft payroll calculation attempts, calculation validation issues, configurable statutory/component validation catalogs, tenant-owned statutory packs/components/slabs, employer statutory registrations, filing calendars, employee statutory profiles, employee statutory declaration/proof records with HR verification and lock states, employee statutory create/update/submit APIs, direct statutory proof upload through canonical employee documents, proof document/artifact reference linkage, HR-admin statutory review UI, ESS statutory declaration UI/actions, statutory-generated calculation lines, configurable TDS annualization with declaration cap consumption, tax regime comparison projections, selected-regime trace evidence, applied adjustment consumption in calculations, payroll review, exception decisions, approval trail, final run locking, generated/published payslip/register output artifacts with durable file metadata, storage adapter metadata, signed-download strategy metadata, sanitized object-storage profile snapshots, credential-reference-only storage contracts, runtime credential resolution, optional SDK-backed S3/GCS/Azure storage adapters, configurable storage policy enforcement, governed HR admin downloads, employee self-service payslip downloads, payslip publish notifications, access events, employee read receipts, signed access grants, grant revocation history, artifact access audit exports, finance handoff packages for bank advice/accounting/statutory summaries/statutory return/statutory challan files with generated CSV payloads, provider delivery records, provider submission adapter contracts, provider adapter request/result snapshots, provider adapter contract validation, provider credential-ref resolution, provider-specific bank/accounting/statutory sandbox adapter scaffolds, configurable HTTP JSON provider submissions, callback verification refs, signed provider callback ingestion, configurable callback security policy evidence, provider signature adapter framework, runtime provider signature key resolution, asymmetric RSA callback signature adapters, idempotent callback event records, configurable provider retry/dead-letter records, retry-worker runtime shell, provider job queue ledger, provider queue heartbeat and stale-lease recovery controls, provider schema mapping packs, provider mapping pack lifecycle workflows, visual mapping rule-builder UX, mapping simulation previews, persisted active-vs-draft mapping simulation comparison ledgers, configurable expanded-row and grouped-row provider mapping transforms, provider audit drilldown UX, locked provider audit pack artifacts, configurable production provider adapter packs, live adapter registry readiness, configurable bank live payout adapter contract, configurable accounting live journal adapter contract, configurable statutory live filing adapter contract, provider client registry readiness, built-in certification fixture clients, bank/accounting/statutory SDK HTTP package skeletons, named RazorpayX-compatible bank payout, TallyPrime-compatible accounting journal, and EPFO ECR-compatible statutory filing package modules, provider package storage-policy declarations, storage/IAM policy readiness registry, configurable storage control verifier hooks for KMS/encryption, lifecycle, malware scan, durability, and IAM controls, provider production readiness runbooks and sanitized environment templates, provider connection onboarding, certified route gating, automated sandbox certification runs, certification evidence refs, reconciliation evidence, a one-time adjustment register for arrears/bonus/reimbursement/loan/correction inputs, and full-and-final settlement packages that generate applied calculation inputs; production launch rehearsal and release hardening are the next major build steps.
- Phase 5Q now adds tenant-level payroll provider onboarding and certification through `PayrollProviderConnection`, readiness gates, credential-ref-only validation, HR-admin setup/list/update/certify APIs, and `/hr-admin/payroll-providers` browser/visual coverage. Remaining provider depth is certified-connection route gating, production SDK/portal adapters, production queue scheduling, production webhook hardening, and automated sandbox certification execution.
- Phase 5R now connects finance handoff routes to provider connection readiness with configurable `disabled`, `warn`, `certified`, and `active` enforcement; delivery snapshots carry provider connection gate evidence and `/hr-admin/payroll-handoff` exposes gate status/blockers. Remaining provider depth is production SDK/portal adapters, production queue scheduling, production webhook hardening, and automated sandbox certification execution.
- Phase 5S now adds automated provider sandbox certification execution through `PayrollProviderCertificationRun`, configurable scenario resolution, sandbox adapter execution, scenario evidence history, failed-scenario blocking, HR-admin run-certification API, and `/hr-admin/payroll-providers` certification ledger coverage. Remaining provider depth is production SDK/portal adapters, production queue scheduling for retries/certification, production webhook hardening, and execution against real external provider sandboxes.
- Phase 5T now hardens the production provider adapter contract with configurable request/result validation, strict enforcement mode, idempotency/schema/checksum gates, required response snapshot checks, preserved validation evidence on delivery failure, certification-run contract validation, and `/hr-admin/payroll-providers` adapter contract visibility. Remaining provider depth is production SDK/portal adapters, production queue scheduling, webhook hardening, and provider-specific schema mapping packs.
- Phase 5U now hardens provider webhook ingestion with configurable callback security policies, source/timestamp metadata, replay-window gates, source-policy/IP allowlist refs, rate-limit refs, secret-rotation refs, strict rejection behavior, callback security evidence snapshots, and `/hr-admin/payroll-handoff` callback gate visibility. Remaining provider depth is production SDK/portal adapters, production queue scheduling, provider-specific signature adapters, and provider-specific schema mapping packs.
- Phase 5V now adds portable provider queue orchestration through `PayrollProviderJob`, idempotent job enqueue helpers, DB-backed leasing, retry/certification/submission/callback-reconciliation worker dispatch, the `process_payroll_provider_jobs` management command, API queue summaries, and `/hr-admin/payroll-handoff` provider job visibility. Remaining provider depth is production SDK/portal adapters, provider-specific signature adapters, and provider-specific schema mapping packs.
- Phase 5W now adds tenant-owned provider schema mapping packs, default bank/accounting/statutory mapping seeds, safe path-based transform and validation gates, strict `provider_schema_mapping_failed` enforcement, mapped provider payload evidence in adapter submissions, provider setup mapping ledgers, and handoff-level schema mapping visibility. Remaining provider depth is mapping pack import/export/version approvals, production SDK/portal adapters, and provider-specific signature adapters.
- Phase 5X now adds tenant-scoped mapping pack lifecycle workflows for draft edits, clone-as-new-version, activation approval, active-version supersession, archive, export, import-as-draft, lifecycle audit evidence, HR-admin mapping action APIs, and `/hr-admin/payroll-providers` lifecycle controls. Remaining provider depth is visual mapping rule-builder UX, production SDK/portal adapters, and provider-specific signature adapters.
- Phase 5Y now adds a visual mapping rule builder drawer for draft provider mapping packs, including target schema/enforcement controls, transform and validation rule forms, add/remove rows, incomplete-rule blocking, locked active/archive states, a Next PATCH proxy, provider E2E drawer coverage, and refreshed provider visual baselines. Remaining provider depth is mapping simulation previews, production SDK/portal adapters, and provider-specific signature adapters.
- Phase 5Z now adds mapping simulation previews through the backend mapping engine and visual rule builder, including sample request JSON editing, temporary unsaved mapping overrides, mapped provider payload output, pass/block gate chips, blocker counts, raw-credential guarded simulation API, Next simulation proxy, demo fallback simulation, and Playwright preview coverage. Remaining provider depth is persisted simulation comparison, production SDK/portal adapters, and provider-specific signature adapters.
- Phase 6A now adds a provider callback signature adapter framework with configurable adapter refs, algorithm refs, material fields, delimiters, digest format, key refs, adapter-backed verification snapshots, HMAC-ref callback coverage, and `/hr-admin/payroll-handoff` signature adapter visibility. Remaining provider depth is secret-manager-backed production signature key resolution, persisted simulation comparison, and production SDK/portal adapters.
- Phase 6B now adds runtime signature key resolution for HMAC-SHA256-ref provider callbacks using the existing provider credential resolver, with configurable key resolution mode/material field, sanitized credential evidence, and tests proving raw signing secrets do not persist in callback or delivery snapshots. Remaining provider depth is asymmetric provider signature adapters, persisted simulation comparison, and production SDK/portal adapters.
- Phase 6C now adds RSA-SHA256 public-key callback verification with runtime public-key refs, base64 signature decoding, larger provider signature storage, sanitized public-key credential evidence, RSA regression coverage, and `/hr-admin/payroll-handoff` RSA adapter visibility. Remaining provider depth is persisted simulation comparison, production SDK/portal adapters, and deeper provider file mapping transforms.
- Phase 6D now adds a configurable HTTP JSON provider submission adapter with HTTPS endpoint gating, method/auth/header refs, runtime credential resolution for bearer/API-key dispatch, pluggable transport refs, response path extraction, sanitized request/response evidence, strict adapter-contract coverage, and `/hr-admin/payroll-handoff` HTTP route visibility. Remaining provider depth is provider-specific production SDK/portal adapters, persisted simulation comparison, and deeper provider file mapping transforms.
- Phase 6E now adds persisted provider mapping simulation comparison through `PayrollProviderSchemaMappingSimulation`, active-baseline payload diffing, added/removed/changed path counts, simulation source hashes, setup API ledgers, drawer comparison output, and `/hr-admin/payroll-providers` simulation evidence visibility. Remaining provider depth is provider-specific production SDK/portal adapters and deeper provider file mapping transforms.
- Phase 6F now adds deeper provider file mapping transforms with configurable `expand_rows` and `group_rows` modes, nested row mappings, grouped line arrays, sum/count aggregate rules, row-level gates, simulation comparison support for array paths, rule-builder mode visibility, and browser coverage for nested bank payout payloads. Remaining provider depth is provider-specific production SDK/portal adapters and broader locked audit trails.
- Phase 6G now adds production queue runtime controls with heartbeat timestamps/counts, lease heartbeat evidence, stale leased/running job recovery, recovery/dead-letter limits, recovered job summary counts, management-command recovered output, and `/hr-admin/payroll-handoff` runtime visibility. Remaining provider depth is provider-specific production SDK/portal adapters and broader locked audit trails.
- Phase 6H now adds auditor drilldown UX on `/hr-admin/payroll-handoff` with URL-addressable delivery, retry, queue-job, and callback evidence panels; selectable ledger cards; mapping, certification, retry, runtime, signature, security, and linked-record evidence; and browser/visual coverage. Remaining provider depth is provider-specific production SDK/portal adapters and broader locked audit trails.
- Phase 6I now adds locked provider audit pack packaging as a published JSON output artifact with deterministic evidence snapshots, recursive secret redaction, evidence checksums, 10-year retention metadata, HR-admin generation API, download/access-audit reuse, `/hr-admin/payroll-handoff` audit-pack cards/actions, and backend/browser/visual coverage. Remaining provider depth is provider-specific production SDK/portal adapters and provider-side storage/IAM policy verification.
- Phase 6J now adds configurable production provider adapter packs for bank, accounting, and statutory delivery with route-level `production_adapter` config, transport/domain/evidence controls, credential and certified-connection gates, strict adapter-contract coverage, handoff transmit hardening for immediate reconciliation, and `/hr-admin/payroll-handoff` production-pack visibility. Remaining provider depth is live SDK/portal implementations behind `PAYROLL_PROVIDER_ADAPTERS`, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6K now adds live adapter registry readiness through a derived `adapter_registry` setup payload, built-in/configured/missing adapter classification, failed-import blocking evidence, production-pack capability flags, provider setup metrics/table UI, and backend/browser/visual coverage. Remaining provider depth is implementing real live SDK/portal adapters behind the registered refs, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6L now adds a configurable bank live payout adapter contract with `bank_payout_adapter` route settings, injected `PAYROLL_BANK_PAYOUT_CLIENTS` runtime clients, payout request gates, UTR/transaction/evidence persistence, sanitized provider responses, nested response-field contract validation, handoff audit visibility, provider registry classification, and backend/browser/visual coverage. Remaining provider depth is provider-specific bank SDK packaging/certification fixtures, live accounting/statutory adapters, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6M now adds a configurable accounting live journal adapter contract with `accounting_journal_adapter` route settings, injected `PAYROLL_ACCOUNTING_JOURNAL_CLIENTS` runtime clients, journal request gates, voucher/document/evidence persistence, sanitized provider responses, handoff audit visibility, provider registry classification, and backend/browser/visual coverage. Remaining provider depth is live statutory adapter execution, provider-specific bank/accounting SDK packaging/certification fixtures, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6N now adds a configurable statutory live filing adapter contract with `statutory_filing_adapter` route settings, injected `PAYROLL_STATUTORY_FILING_CLIENTS` runtime clients, filing request gates, receipt/challan/acknowledgement/evidence persistence, certification evidence propagation, sanitized provider responses, handoff audit visibility, provider registry classification, and backend/browser/visual coverage. Remaining provider depth is provider-specific bank/accounting/statutory SDK or portal client packaging/certification fixtures, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6O now adds provider client registry readiness plus built-in bank/accounting/statutory certification fixture clients behind `payroll.provider_client.*.fixture.v1` refs. Live adapters can use fixture clients without settings, setup APIs expose configured/built-in/blocked client readiness, `/hr-admin/payroll-providers` shows provider client readiness, and backend/browser coverage proves fixture/configured/missing client classification without raw secrets. Remaining provider depth is real vendor SDK or portal client packages, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6P now adds provider package manifest readiness through `PAYROLL_PROVIDER_PACKAGES` and built-in `payroll.provider_package.*.fixture.v1` manifests. Package readiness declares adapter/client refs, fixture client refs, artifact/transport coverage, required route config refs, certification scenarios, evidence paths, secret-material policy, and setup UI/API blockers without vendor hardcoding. Remaining provider depth is real vendor SDK/portal package implementations, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6Q now adds a bank payout SDK HTTP package skeleton through `payroll.provider_client.bank.sdk_http.v1` and `payroll.provider_package.bank.sdk_http.v1`. The client uses route-configured endpoint, transport, timeout, auth scheme, and static headers, delegates network execution through injected provider transports, normalizes payout acknowledgements for the live bank adapter, records request/response checksums and header refs, and keeps runtime credential material out of evidence. Remaining provider depth is accounting/statutory SDK package skeletons, provider-side IAM/storage policy verification, and lifecycle/KMS/scanning service integration.
- Phase 6R now adds an accounting journal SDK HTTP package skeleton through `payroll.provider_client.accounting.sdk_http.v1` and `payroll.provider_package.accounting.sdk_http.v1`. The client uses route-configured endpoint, transport, timeout, auth scheme, company/books refs, posting profile/date, and static headers, delegates network execution through injected provider transports, normalizes voucher/document/evidence acknowledgements for the live accounting adapter, records request/response checksums and header refs, and keeps runtime credential material out of evidence.
- Phase 6S now adds a statutory filing SDK HTTP package skeleton through `payroll.provider_client.statutory.sdk_http.v1` and `payroll.provider_package.statutory.sdk_http.v1`. The client uses route-configured endpoint, transport, timeout, auth scheme, authority/registration/filing refs, filing calendar/due date, and static headers, delegates execution through injected provider transports, normalizes receipt/challan/acknowledgement/evidence for the live statutory adapter, records request/response checksums and header refs, and keeps runtime credential material out of evidence.
- Phase 6T now adds provider-side storage/IAM policy readiness through `payroll.storage_policy_registry.readiness.v1`. Provider package manifests declare `storage_policy_refs`, package readiness blocks missing or blocked policy refs, storage policy evidence is redacted for secret-shaped keys, and `/hr-admin/payroll-providers` shows artifact policy readiness with encryption, private endpoint, runtime credential, lifecycle, malware scan, and durability gates.
- Phase 6U now adds storage control verification hooks through `PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFIERS` and strict/declaration verification modes. Storage policies can verify KMS/encryption, lifecycle, malware scan, durability, and IAM control refs through deployment-provided callbacks; strict policies block launch readiness when verifiers are missing or fail, verifier evidence is redacted, and `/hr-admin/payroll-providers` shows verified/blocked control counts.
- Phase 6V now adds the first named bank payout package module through `payroll.provider_client.bank.razorpayx_http.v1` and `payroll.provider_package.bank.razorpayx_http.v1`. The module reuses the live bank payout adapter and configurable HTTP transport, contributes package/module/vendor/contract refs, defaults response-path mapping for RazorpayX-compatible payout responses, preserves route-configured auth/endpoint/header behavior, redacts runtime credentials, and exposes the package in provider client/package readiness and Playwright coverage. Remaining provider depth is accounting/statutory vendor package modules and production deployment runbooks.
- Phase 6W now adds the first named accounting journal package module through `payroll.provider_client.accounting.tallyprime_http.v1` and `payroll.provider_package.accounting.tallyprime_http.v1`. The module reuses the live accounting journal adapter and configurable HTTP transport, contributes package/module/vendor/contract refs, defaults response-path mapping for TallyPrime-compatible journal import responses, preserves route-configured company/books/posting/auth/header behavior, redacts runtime credentials, and exposes the package in provider client/package readiness and Playwright coverage. Remaining provider depth is statutory vendor package modules and production deployment runbooks.
- Phase 6X now adds the first named statutory filing package module through `payroll.provider_client.statutory.epfo_ecr_http.v1` and `payroll.provider_package.statutory.epfo_ecr_http.v1`. The module reuses the live statutory filing adapter and configurable HTTP transport, contributes package/module/vendor/contract refs, defaults response-path mapping for EPFO ECR-compatible filing responses, preserves route-configured authority/registration/filing/auth/header behavior, redacts runtime credentials, and exposes the package in provider client/package readiness and Playwright coverage. Remaining provider depth is production deployment runbooks and environment templates.
- Phase 6Y now adds production readiness runbooks and sanitized environment templates for SaaS payroll provider launch. Runtime settings for provider credentials, HTTP transports, custom package manifests, live client registries, storage credentials, storage policies, storage control verifiers, and strict/declaration verification modes are explicit; `backend/.env.example` points to the docs without committing secrets; and pilot notes link the payroll launch runbook. Remaining provider depth is production launch rehearsal, tenant-specific configuration dry-runs, and full release hardening.
- Phase 6Z now adds a provider launch rehearsal snapshot through `payroll.provider_launch_rehearsal.v1`. The setup API aggregates provider connection readiness, route presence, adapter/client/package/storage-policy registry status, storage verifier evidence, and certified/active finance handoff enforcement across bank, accounting, and statutory lanes; `/hr-admin/payroll-providers` shows the rehearsal result and lane blockers, with backend and Playwright coverage.
- Phase 7A now turns launch rehearsal into a tenant-specific command gate through `manage.py rehearse_payroll_provider_launch`. The command uses the same setup payload as the admin workspace, emits a sanitized `payroll.provider_launch_readiness.audit_pack.v1` with registry evidence, release gates, blockers, lane ledger, connection refs, and an evidence checksum, and exits nonzero when launch is blocked unless diagnostic export is explicitly allowed.
- Phase 7B now persists launch rehearsal history through `PayrollProviderLaunchRehearsal`, records command/API runs with searchable ready/blocked counts, blocker refs, checksums, and sanitized audit-pack snapshots, exposes a HR-admin run endpoint, and shows recorded rehearsal history in `/hr-admin/payroll-providers` with Playwright coverage. Remaining payroll launch depth is broader release hardening and non-provider module completion review.
- Phase 7C now adds a dashboard-level `hrms.saas_launch_audit.v1` readiness audit across tenant foundation, IAM, organization, employee master, ESS/MSS, leave, attendance, lifecycle, documents, notifications, payroll core, and provider launch history. `/hr-admin` now shows module gate status, blockers, warnings, and evidence refs with API, route smoke, and laptop/mobile visual coverage. Remaining launch depth is turning failed gates into owner/action workflows and exportable release packs.
- Phase 7D now makes launch audit gates actionable and exportable. Tenant configuration can override `hrms.saas_launch_audit_profile.v1` module owners, routes, labels, SLAs, and gate severity; failed gates produce release actions in `/hr-admin`; and `manage.py rehearse_hrms_saas_launch --tenant-code` emits `hrms.saas_launch_audit_pack.v1` with summary, modules, release actions, evidence refs, and a deterministic checksum.
- Phase 7E now persists HRMS launch remediation assignments through `HrmsLaunchRemediationAssignment`, syncs open/closed gate actions from dashboard and command runs, exposes remediation assignment summaries on `/api/v1/hr-admin/dashboard/`, adds an authorized `/api/v1/hr-admin/saas-launch-audit/download/` JSON audit-pack download, and surfaces open assignment count plus “Download audit” on `/hr-admin`.
- Phase 7F now adds the release-manager launch remediation workspace. `/api/v1/hr-admin/launch-remediations/` lists tenant-scoped assignments with status, severity, owner, module, search, and pagination filters; `/api/v1/hr-admin/launch-remediations/<id>/` supports acknowledge, assign, ignore, resolve, and reopen actions with actor attribution, notes, and action history; and `/hr-admin/launch-remediation` gives HR admins a modern browser-tested desk for launch-risk decisions.
- Phase 7G now adds SLA handling to launch remediation. Assignments carry due dates derived from configurable launch-audit SLA days, support manual due-date override, expose overdue/due-soon/escalated summary counts and due-state filters, can send reminder/escalation notifications through configurable notification events with fallback in-app records, and include a `process_hrms_launch_remediations` command for scheduled reminder/escalation processing.
- Phase 8A now adds the first SaaS commercial control-plane foundation. The configurable `saas.commercial_profile.v1` profile resolves tenant plan, subscription status, enabled modules, required launch entitlements, and usage limits without hardcoding commercial policy; `/api/v1/hr-admin/saas-control-plane/` and `/hr-admin/saas-control-plane` expose the tenant commercial state; and the launch audit now includes `saas_commercial_control` gates for subscription, plan configuration, required entitlements, and usage-limit readiness.
- Phase 8B now adds configurable commercial enforcement and provider-neutral subscription lifecycle control. `saas.commercial_profile.v1` defines enforcement scopes for API path prefixes, methods, entitlements, and blocking usage meters; HR admin payroll/provider APIs are denied when tenant plan, subscription, entitlement, or usage policy blocks access; and `/hr-admin/saas-control-plane` now exposes enforcement scopes plus plan/status/provider reference editing through a browser-tested lifecycle panel.
- Phase 8C now persists SaaS commercial evidence. `SaasUsageMeterSnapshot` records point-in-time usage-limit evidence, `SaasCommercialAuditEvent` records lifecycle and scheduled snapshot events with source hashes, `snapshot_saas_commercial_usage` supports command-driven metering snapshots, and `/hr-admin/saas-control-plane` shows recent usage and commercial audit history.
- Phase 8D now adds the tenant-admin self-service console. Sessions expose `tenant_admin` workspace access, `/api/v1/tenant-admin/console/` returns tenant account posture, commercial readiness, seat usage, role coverage, configuration health, governance checks, and recent commercial evidence, and `/tenant-admin` gives tenant owners a modern browser-tested account console without exposing HR-admin-only operations.
- Phase 8E now adds tenant-admin membership mutation workflows. `/api/v1/tenant-admin/memberships/` supports tenant-owner invites, `/api/v1/tenant-admin/memberships/<id>/` supports activate, suspend, revoke, and role update actions, active-seat limits are enforced from `saas.commercial_profile.v1`, last tenant-admin safety is guarded, each action records `SaasCommercialAuditEvent` evidence, and `/tenant-admin` exposes a browser-tested member mutation panel.
- Phase 8F now adds tenant-admin change requests. `SaasTenantChangeRequest` persists plan, billing contact, and configuration change requests with configurable request types from `saas.commercial_profile.v1`, requested/current snapshots, decision/application history, source hashes, commercial audit events, tenant-admin APIs, Next proxy routes, and a browser-tested billing/configuration request queue on `/tenant-admin`.
- Phase 8G now adds tenant-admin governed support access grants. `SaasSupportAccessGrant` persists requested, approved, active, ended, revoked, rejected, and expired support access states with configurable scope options and max duration from `saas.commercial_profile.v1`; tenant-admin APIs and `/tenant-admin` expose request, approve, start-session, end-session, reject, and revoke controls; and each lifecycle action records commercial audit evidence without hardcoding support policy.
- Phase 8H now adds runtime support-session enforcement. `/api/v1/support/tenant-console/` validates authenticated support users against active tenant-approved support grants, session refs, expiry windows, read-only methods, and requested scope refs before returning scoped account/configuration/commercial/payroll support payloads; allowed, denied, and expired checks record commercial audit evidence, and `/support` provides a browser-tested scoped support console.
- Phase 8I now adds tenant-admin commercial/support audit export. `describe_saas_commercial_support_audit_pack` builds `saas.commercial_support_audit_pack.v1` with tenant snapshot, commercial control evidence, recent commercial audit events, usage snapshots, support-access grants, status/type counts, source hashes, and a deterministic checksum; `/api/v1/tenant-admin/commercial-support-audit/download/` and `/tenant-admin` expose the authorized JSON download.
- Phase 8J now adds SaaS operational health. `get_hr_admin_saas_operational_health` builds `saas.operational_health.v1` across launch blockers, commercial control, notification delivery, provider queue jobs/retries, support sessions, tenant change requests, and remediation SLA; `/api/v1/hr-admin/saas-operational-health/` and `/hr-admin/saas-operations` expose the browser-tested operations cockpit.
- Phase 8K now adds SaaS resilience readiness. The configurable `saas.resilience_profile.v1` profile evaluates backup cadence/RPO, latest backup evidence, encrypted/offsite storage controls, restore-test recency, retention windows, deletion/legal-hold refs, and runbook/evidence refs into `saas.resilience_readiness.v1`; `/api/v1/hr-admin/saas-resilience/`, `/hr-admin/saas-resilience`, and the operations cockpit expose the browser-tested posture without cloud-provider hardcoding.
- Phase 8L now adds SaaS SLA and incident operations. `SaasIncidentRecord` persists tenant service-impact incidents with severity/status, impact refs, owner role, response/resolution targets, action history, snapshots, and source hashes; configurable `saas.sla_profile.v1` produces `saas.sla_operations.v1` for incident breach posture plus notification/provider/support/remediation threshold signals; `/api/v1/hr-admin/saas-sla-operations/`, `/hr-admin/saas-sla-operations`, and the operations cockpit expose browser-tested SLA posture.
- Phase 8M now adds support-session domain snapshots. Configurable `saas.commercial_profile.v1` support-access domain mappings bind each read-only diagnostic domain to a required scope; `/api/v1/support/domain-snapshot/` validates authenticated support users against active tenant-approved grants, session refs, expiry, read-only methods, and the domain scope before returning sanitized tenant/commercial/configuration/SLA/resilience/payroll/provider aggregate snapshots; `/support/domain-snapshot` exposes the browser-tested support diagnostics workspace.
- Phase 8N now adds tenant trust-audit review. Configurable `saas.commercial_profile.v1` trust-audit groups, source refs, and page-size caps drive `/api/v1/tenant-admin/trust-audit/`, giving tenant admins customer-visible commercial, tenant-admin, and support-access audit filtering by group, event type, actor, source ref, support session ref, and date window; `/tenant-admin/trust-audit` exposes the browser-tested evidence review workspace alongside audit-pack download.
- Phase 8O now adds enterprise security readiness. Configurable `saas.enterprise_security_profile.v1` tenant profiles evaluate MFA, SSO, SCIM, session timeout/device trust, audit retention/export, and data-protection posture into `/api/v1/tenant-admin/security-readiness/`; `/tenant-admin/security-readiness` exposes a browser-tested customer-visible launch readiness workspace without hardcoding identity providers or cloud security controls.
