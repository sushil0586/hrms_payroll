# HRMS Module-Wise Vertical Coverage

## 1. Purpose

This document answers one question:

Is every HRMS module covered vertically from a SaaS product perspective?

Current answer:

- Core HRMS is covered to a web-first pilot candidate level.
- Not every SaaS-maturity capability is complete.
- Payroll calculation, billing, advanced integrations, enterprise security, mobile production parity, advanced analytics, and deeper workflow-control mutations remain future or release-risk work.

---

## 2. Coverage Legend

| Status | Meaning |
|---|---|
| Covered | Usable vertical exists with backend, web UI, validation, and tests. |
| Pilot-ready | Strong enough for web-first internal pilot, but still has known maturity gaps. |
| Partial | Core foundation exists, but important SaaS expectations remain open. |
| Deferred | Intentionally outside current HRMS pilot scope. |

Vertical coverage means the module has enough of these layers:

- tenant-aware data model
- backend APIs and validations
- web UI for admin, ESS, or MSS user
- workflow/action behavior where needed
- notifications, audit, trace, or report visibility where needed
- browser and/or backend regression coverage
- SaaS operations posture such as setup, security, observability, and supportability

---

## 3. Executive Coverage Summary

| Area | Current Status | SaaS Readiness |
|---|---|---|
| Tenant foundation | Pilot-ready | Good pilot foundation; needs production tenant lifecycle, plan/edition, and support tooling maturity. |
| IAM and workspace access | Pilot-ready | Role/workspace gates are tested; enterprise SSO/MFA/field-level security remain future. |
| Organization masters | Covered | Strong HRMS pilot vertical. |
| Employee master and access | Covered | Strong HRMS pilot vertical; bulk import/custom fields remain SaaS maturity. |
| ESS web | Pilot-ready | Core employee actions covered; mobile parity still limited. |
| MSS web | Pilot-ready | Approval inbox covered; richer team operations remain future. |
| Leave management | Pilot-ready | Strong policy/runtime coverage; advanced accrual/encashment/payroll effects need later hardening. |
| Attendance and shifts | Pilot-ready | Strong policy/runtime coverage; biometric, geo, and device integrations remain future. |
| Employee lifecycle | Covered | Onboarding, probation, movement, exit, rehire, checklist, clearance, and workflow seeding covered. |
| Documents and letters | Covered | Storage-backed document and generated-letter vertical exists; deeper e-sign/OCR/KYC automation future. |
| Workflow engine | Pilot-ready | Templates, assignment, runtime instances, manager decisions, and trace visibility exist; HR mutation console future. |
| Notifications | Pilot-ready | Event/template/channel/queue/inbox/diagnostics exist; real provider certification remains open. |
| Audit and traceability | Pilot-ready | Enough for pilot trust; deeper universal audit explorer remains future. |
| Reports and exports | Partial | Operational exports exist; custom analytics/report builder future. |
| Mobile | Partial | Typecheck passes; production release blocked or exception-based due dependency risk and limited parity tests. |
| Public APIs and integrations | Partial | Internal API surface exists; public API/webhooks/accounting/biometric integrations future. |
| SaaS commercial ops | Deferred | Billing, subscriptions, editions, entitlements, and usage limits are not implemented. |
| Payroll readiness and configuration | Partial | Source-data readiness, calendars, pay groups, salary setup, input snapshots, locking, one-time adjustments, full-and-final settlement packages, formula/rule previews, draft calculation with applied adjustment consumption, pre-calculation validation issues, configurable statutory/component validation catalogs, review, exception decisions, approvals, final locking, payslip/register output publishing, durable file metadata, checksums, retention refs, and governed HR admin downloads now have tenant-configurable APIs, HR admin UIs, and browser coverage; external delivery remains deferred. |
| Payroll and statutory compliance | Partial | Draft calculation attempts, rule-sourced formula traces, adjustment-sourced calculation lines, review controls, approval trail, final payroll locking, generated payslip files, payroll register files, finance handoff CSV files, and governed downloads exist; statutory filing submission and live bank/accounting integrations remain intentionally deferred. |

---

## 4. Module Coverage Matrix

| Module | Backend/Data | Web/Admin | ESS/MSS | Trust Layer | Automated Coverage | Remaining SaaS Gaps |
|---|---|---|---|---|---|---|
| Tenant and platform foundation | Tenant, membership, onboarding, policy-pack, and platform delegation models exist. | Platform onboarding APIs exist; HR workspace tenant data is scoped. | User sessions resolve default tenant membership. | Tenant isolation is part of access and API tests. | Backend tenant onboarding tests and phase smoke tests. | Tenant self-service setup, tenant lifecycle operations, subscription state, plan limits, support impersonation controls, and production tenant operations. |
| IAM, roles, and permissions | User, tenant membership, roles, scopes, workspace access, and denial behavior exist. | HR admin routes are guarded; unauthorized access redirects. | ESS and MSS workspace access is role/scope aware. | Permission boundaries are documented. | Backend auth/denial tests plus live Playwright auth/role tests. | MFA, SSO/SAML/OIDC, password reset, fine-grained permission UI, field-level restrictions, auditor roles, and support-access workflows. |
| Organization structure | Legal entity, branch, location, department, business unit, cost center, designation, grade, and employment type structures exist. | Organization setup screen supports search, sections, filters, selected-record review, dependency counts, and edit impact. | Employee context uses organization mappings. | Dependency warnings protect risky inactivation. | Backend validation tests and Playwright org route/filter coverage. | Bulk import/export, custom attributes, org chart visualization, approval-based master changes, and deeper multi-country localization. |
| Employee master | Employee profile, manager mapping, status, access-state, structural validation, and direct-report signals exist. | Employee directory, detail, create/edit, access provisioning, warnings, and validation are covered. | ESS employee context is available. | Access-readiness and manager-risk signals exist. | Backend employee/access tests and Playwright employee flows. | Bulk import, configurable fields, duplicate detection workflows, data-quality dashboards, HRIS imports, and field-level privacy for sensitive data. |
| ESS | Employee dashboard, leave history, attendance regularization, documents, and notifications are supported. | Not applicable beyond shared shell. | ESS web surfaces are implemented. | Source-link navigation and request states are visible. | Playwright ESS route, document, notification, and live auth coverage. | Mobile parity, richer profile self-update workflows, employee help/support flows, and broader live mutation tests. |
| MSS | Manager approval data and team approval scope exist. | Not applicable beyond admin trace review. | MSS approval and notification surfaces exist. | Decisions feed workflow traces and notification/audit context. | Playwright MSS queue switching plus live manager rejection persistence test. | Broader team dashboard, delegated approvals, approval reassignment, send-back, escalation handling, and more live mutation paths. |
| Leave management | Leave types, policies, balances, assignments, denial rules, workflow outcomes, cancellation, withdrawal, and manager approvals exist. | Leave policy, leave type, balance, and assignment admin surfaces exist. | ESS leave request/history and MSS approvals exist. | Workflow and trace visibility exist for leave requests. | Backend policy/runtime tests, web form tests, live rejection test. | Advanced accrual jobs, carry-forward, encashment, complex leave calendars, payroll impact finalization, leave imports, and statutory/localized leave packs. |
| Attendance, shifts, and regularization | Attendance records, policies, shifts, holidays, rosters, policy assignment, shift assignment, preview derivation, and regularization approval exist. | Attendance operations, records, regularizations, shifts, holiday calendars, roster templates, and assignment screens exist. | ESS regularization and MSS approval views exist. | Review states and policy-derived outcomes are visible. | Backend runtime tests and Playwright attendance route/review coverage. | Biometric/device ingestion, import pipelines, geo attendance, field staff modes, offline capture, overtime payroll impact, and production scheduler maturity. |
| Lifecycle | Onboarding, probation, movements, exits, rehire readiness, checklist, clearance, due dates, escalations, and template seeding exist. | Lifecycle hub and create/edit flows exist for onboarding, probation, movements, and exits. | Lifecycle-related documents/notifications are visible where relevant. | Checklist/clearance history and workflow seeding exist. | Backend lifecycle tests and Playwright lifecycle coverage. | Offer-letter/recruitment preboarding, deeper HR task boards, SLA dashboards, bulk lifecycle operations, and customer-specific lifecycle templates. |
| Documents and generated letters | Employee document artifacts, categories, requirements, review states, expiry, reminders, and generated letter artifacts exist. | Document hub, employee documents, review, requirements, categories, and generated letters exist. | ESS document center supports required/rejected/verified/expiring states. | Document notifications, expiry reminders, generated artifacts, and audit context exist. | Backend document/letter tests plus Playwright document and generated-letter coverage. | E-signature, OCR/KYC verification, external storage provider hardening, document templates marketplace, retention policies, and advanced artifact governance. |
| Workflow engine | Workflow templates, assignments, runtime instances, steps, action logs, and trace APIs exist. | Workflow template/assignment screens and workflow trace control screen exist. | MSS can act on routed approvals. | HR admin trace shows steps, assignments, owners, overdue state, action logs, and timelines. | Backend workflow trace tests, Playwright workflow trace tests, live manager rejection trace verification. | HR admin mutation console for reassignment/delegation/send-back/escalation, richer SLA automation, cross-module workflow analytics, and more live mutation coverage. |
| Notifications | Event definitions, templates, channel configuration, notification queue, retries, diagnostics, and in-app inboxes exist. | Notification admin, queue, diagnostics, event, template, and channel surfaces exist. | ESS/MSS notification centers exist. | Delivery status, read state, source links, diagnostics, and retry actions exist. | Backend notification tests and Playwright queue/diagnostic/inbox coverage. | Real email/SMS/push/WhatsApp provider certification, provider-specific failure taxonomy, production secrets, delivery SLA monitoring, and customer provider onboarding. |
| Audit and traceability | Audit-relevant histories exist across lifecycle, documents, notifications, attendance approvals, and workflow actions. | HR admin audit center and workflow trace surfaces exist. | ESS/MSS see relevant notifications and source navigation. | Source, actor, status, timestamp, and timeline context are exposed. | Backend smoke tests and Playwright audit/workflow trace coverage. | Universal audit explorer, before/after diffs for all records, exportable audit packs, auditor role UX, and deeper leave-request audit drill-down. |
| Reports and exports | Operational export foundation exists for workforce, approvals, lifecycle, documents, and notifications. | Reports dashboard and export surfaces exist. | Not primary scope. | Reports support review and audit preparation. | Playwright report route coverage and visual snapshots. | Custom report builder, scheduled reports, advanced analytics, payroll-ready financial reports, dashboard drill-down depth, and BI/webhook exports. |
| Payroll readiness and setup | Reads tenant-scoped employee, organization, leave, attendance, lifecycle, documents, and bank-account source data for a selected period; payroll calendars, periods, pay groups, effective-dated pay group assignments, salary components, salary structures, structure versions, component lines, employee salary assignments, payroll runs, locked input snapshots, one-time payroll adjustments, full-and-final settlements, settlement lines, rule definitions, rule versions, rule preview evaluations, draft calculation attempts, rule-sourced and adjustment-sourced calculation lines, validation issues, review records, exceptions, approvals, final-lock metadata, output batches, output artifacts with durable file metadata/payloads, and finance handoff packages now exist. | Payroll readiness page supports search, status filters, compact metrics, table review, and right-side employee trace; payroll setup page exposes calendars, periods, group scopes, config snapshots, and assignments; salary setup page exposes component catalog, version matrix, structure composition, and employee salary coverage; payroll inputs page exposes run snapshots and source hashes; payroll adjustments page exposes one-time inputs, approval state, applied state, profile refs, and source hashes; payroll settlements page exposes exit-sourced full-and-final packages, final dues, recoveries, settlement lines, profile refs, dependencies, and source hashes; payroll rules page exposes rule catalog, safe expressions, locked snapshot preview options, dependencies, and stored traces; payroll calculations page exposes runs, attempts, validation issue register with category grouping, draft totals, rule-sourced formula lines, adjustment-sourced input lines, source detail, and source hashes; payroll review page exposes review queue, exception register, approval trail, final lock status, and approved calculation-line evidence; payroll outputs page exposes output batches, payslip/register artifacts, publish state, output profiles, source hashes, file readiness, storage governance, retention refs, and download state; payroll handoff page exposes finance packages, bank advice, accounting export, statutory summary artifacts, profile refs, transmission state, source evidence, CSV file readiness, storage governance, and download state. | Not primary scope for payroll foundation phases. | Row-level blockers/warnings, source counts, period overlap checks, pay group assignment overlap checks, active structure version overlap checks, active salary assignment overlap checks, locked snapshot immutability, calculation validation issue hashing, source-data/salary/rule/adjustment/settlement warning and blocker gates, configurable component/output-path/statutory/dependency validation catalogs, adjustment source hashes, adjustment approval/apply lifecycle, settlement source hashes, settlement approval/apply lifecycle, settlement-generated adjustment inputs, applied-adjustment calculation consumption, late-adjustment and late-settlement gating after review start, safe-expression whitelist evaluation, active rule-version overlap protection, persisted preview traces, calculation attempt supersession, source-hash lineage, line-level trace snapshots, blocker exception gating, approval history, final-lock immutability, generated artifact hashes, artifact file checksums, storage keys, retention refs, publish-state download gating, published-output immutability, finance-handoff publish gating, and transmission timestamps expose explainability through payroll close. | Backend API tests, Playwright e2e flows, route smoke, and laptop/mobile visual snapshots. | External object storage adapters, employee self-service payslip downloads, real bank/accounting/statutory integrations, acknowledgement callbacks, and broader locked output audit trails. |
| Mobile HRMS | Mobile project exists and typechecks. | Not applicable. | Mobile compatibility is intended but not fully release-proven. | Not equivalent to web trust layer yet. | `pnpm --dir mobile typecheck` passes. | Browser/visual/live parity, device testing, production distribution, mobile dependency risk, offline mode, push notification validation. |
| SaaS operations | Configuration-first patterns, tenant scoping, seeded setup, and release packet exist. | Admin product is web-first pilot candidate. | Role-specific workspaces exist. | Release-risk register, limitations, pilot setup, and release notes exist. | Full release-readiness gate has passed except remaining audit risk decision. | Billing, editions, entitlements, usage limits, tenant admin self-service, observability, backups, support tooling, SLAs, and production deployment runbooks. |

---

## 5. Vertical Completeness By User Journey

| User Journey | Status | Notes |
|---|---|---|
| HR configures organization and employee masters | Covered | Strong model/API/UI/test vertical. |
| HR configures leave and attendance policies | Pilot-ready | Governance and assignment behavior exists; advanced accrual/device integration future. |
| Employee submits and tracks leave/attendance/document work | Pilot-ready | Web ESS is covered; mobile parity is not yet release-grade. |
| Manager reviews approvals and acts | Pilot-ready | MSS approval path exists; live rejection mutation is verified. More decision types need live mutation tests. |
| HR manages onboarding through exit | Covered | Lifecycle sync, checklist, clearance, rehire, and workflow seeding are covered. |
| HR manages employee documents and generated letters | Covered | Pilot-ready artifact vertical exists. Advanced governance/provider features future. |
| HR understands notifications and delivery | Pilot-ready | In-app and diagnostics are strong; real external provider readiness still open. |
| HR audits decisions and workflow history | Pilot-ready | Workflow trace and audit center exist; universal audit explorer future. |
| HR exports operational reports | Partial | Useful pilot exports exist; advanced SaaS analytics future. |
| SaaS owner provisions, bills, meters, and operates tenants | Partial/Deferred | Tenant foundation exists; commercial SaaS control plane is not complete. |
| Payroll consumes HRMS as source data | Partial | Readiness, setup, salary structures, input snapshots, one-time adjustment register, full-and-final settlement packages, locking, safe rule previews, draft calculation with applied adjustment consumption, calculation validation issues, configurable statutory/component validation catalogs, review, exceptions, approval, final lock, payslip/register output publishing, durable file metadata/downloads, and finance handoff artifacts for bank/accounting/statutory summaries now exist. External storage adapters, integrations, and acknowledgements remain open. |

---

## 6. What Is Not Fully Covered From A SaaS Perspective

These are the main gaps if the benchmark is a broad, production SaaS HRMS rather than a web-first pilot:

1. SaaS control plane
   - subscriptions, billing, editions, entitlements, usage limits, support impersonation, tenant lifecycle, and tenant admin self-service.

2. Enterprise security
   - MFA, SSO, SCIM, field-level restrictions, auditor personas, immutable audit export packs, and customer-managed security settings.

3. Data onboarding and interoperability
   - bulk import tooling, validation workbench, public APIs, webhooks, HRIS integrations, accounting exports, biometric integrations, and file-based connectors.

4. External providers
   - production email/SMS/push/WhatsApp provider onboarding, sandbox certification, credential rotation, provider failure taxonomy, and delivery SLAs.

5. Analytics and reporting
   - configurable report builder, scheduled reports, advanced dashboards, BI exports, payroll-ready financial reports, and cross-domain analytics.

6. Workflow operations
   - HR admin reassignment, delegation, send-back, escalation overrides, workflow SLA dashboards, and broader live mutation regression.

7. Mobile production parity
   - mobile browser/visual/live coverage equivalent to web, app distribution readiness, push notification validation, and the open Metro `image-size` dependency risk.

8. Payroll and statutory compliance
   - Phase 0 readiness, Phase 1A calendar/pay-group setup, Phase 1B salary component/structure setup, Phase 1C payroll input snapshots/locking, Phase 2A formula/rule preview foundations, Phase 2B draft calculation, Phase 3A review/approval/final lock, Phase 3B payslip/register output publishing, Phase 3C finance handoff artifacts, Phase 4A one-time adjustment controls, Phase 4B applied adjustment calculation consumption, Phase 4C full-and-final settlement orchestration, Phase 4D calculation validation hardening, Phase 4E statutory/component validation catalogs, and Phase 4F durable local files/download governance exist. External bank/accounting/statutory integrations, acknowledgement callbacks, employee payslip downloads, object-storage adapters, and broader locked output audit trails are deferred.

9. Production operations
   - staging runbook, deployment checklist, backups, monitoring, alerting, incident response, data retention, and support process.

---

## 7. Recommended Next Coverage Order

1. Record the release-owner decision for the mobile `image-size` risk.
2. Treat current web HRMS as pilot candidate and continue payroll depth work with external finance acknowledgements, object-storage adapterization, employee payslip downloads, and deeper locked audit trails.
3. Use `docs/payroll-saas-architecture-plan.md` as the configurable payroll architecture baseline.
4. Use `docs/payroll-source-data-contract.md` as the source-data contract for employee, organization, attendance, leave, lifecycle, documents, and workflow outputs.
5. Add live-backend mutation tests for manager approval, attendance regularization approval/rejection, document review, notification retry, and lifecycle status actions.
6. Build production SaaS readiness work as separate epics: control plane, security, integrations, reporting, mobile, and operations.
