# Public Launch Scope Freeze Matrix

Date: 2026-09-13  
Product: HRMS Payroll SaaS  
Parent plan: `docs/qa/public-launch-readiness-phase-plan-2026-09-13.md`  
Phase: PL-0 Public Launch Scope Freeze  
Status: Draft for stakeholder approval

## Purpose

This document freezes what is included in public launch, what remains controlled/beta, and what must stay disabled until external or operational certification is complete.

The intent is to avoid accidental over-launch. A public customer should see a coherent product, not every internal or partially certified surface.

## Scope Status Legend

| Status | Meaning |
| --- | --- |
| Launch | Available for public launch after PL-1 to PL-9 gates complete. |
| Beta | Visible only to selected tenants/users with explicit acceptance. |
| Pilot only | Available in controlled pilot/staging, not public default. |
| Disabled until certified | Must not be enabled publicly until certification evidence exists. |
| Internal only | For platform/support/ops users only, not tenant self-service. |

## Launch Assumptions

- Initial launch geography: India-focused payroll and HRMS flows.
- Initial payroll size: small to mid-sized tenants, validated up to at least 100 employees in controlled rehearsal.
- Initial browser support: desktop Chrome for HR/payroll operations; mobile is review/smoke only.
- Initial deployment: AWS-hosted production environment after PL-1 hardening.
- Initial data entry: browser UI for core workflows; bulk import only if explicitly certified before launch.
- Initial provider stance: no live provider submission/payment rail is enabled until sandbox/non-production credentials are certified and live enablement is separately approved.

## Role Scope

| Role | Public launch status | Notes |
| --- | --- | --- |
| Platform Admin | Internal only | Used by SaaS operator for tenant onboarding, activation, plan/usage gates, and platform governance. |
| Tenant Admin | Launch | Customer account governance, security readiness, trust/audit, scoped support access. |
| HR Admin | Launch | Main customer operator for HR, payroll preparation, payroll operations, reports, and employee data. |
| Payroll Finance Manager | Launch | Finance review, bank advice, handoff, reports, exceptions, and export audit. |
| Manager / MSS | Launch | Approvals and manager notifications. |
| Employee / ESS | Launch | Self-service, documents, declarations, notifications, and payslips. |
| Support Agent | Internal only | Scoped support only after tenant approval; not standing tenant access. |

## Workspace And Module Scope

| Area | Routes / Pages | Launch status | Launch condition |
| --- | --- | --- | --- |
| Login and workspace routing | `/`, `/login` | Launch | Auth, logout, role landing, and denied-page behavior pass on production. |
| Platform Admin Console | `/platform-admin` | Internal only | Operator-only, protected from tenant users. |
| Tenant Admin Console | `/tenant-admin` | Launch | Tenant admin guide approved; support grant and trust pages pass. |
| Tenant Trust Audit | `/tenant-admin/trust-audit` | Launch | Audit evidence visible and export/download rules approved. |
| Tenant Security Readiness | `/tenant-admin/security-readiness` | Launch | No customer-facing misleading claims; readiness copy approved. |
| HR Admin Control Center | `/hr-admin` | Launch | Live data load, no demo fallback, role menu certified. |
| Organization masters | `/hr-admin/organization` | Launch | CRUD/list/dropdowns certified; missing dependent mapping warning remains recommended improvement if not already present. |
| Employee directory | `/hr-admin/employees` | Launch | Create/list/search/detail access certified; cross-role denial remains enforced. |
| Employee onboarding/lifecycle | `/hr-admin/onboardings`, `/hr-admin/lifecycle`, `/hr-admin/movements`, `/hr-admin/exits`, `/hr-admin/probation-reviews` | Launch | Browser flows certified; bulk operations only when explicitly tested. |
| Policy governance | `/hr-admin/policies`, leave/attendance policies, assignments, workflows | Launch | Policy CRUD and assignment conflict checks certified. |
| Attendance operations | `/hr-admin/attendance-operations`, records, regularizations, shifts, rosters | Launch | HR and manager approval flows certified. |
| Documents and letters | `/hr-admin/documents`, document categories/requirements, employee documents, generated letters | Launch | File storage and access rules certified in production storage. |
| Notifications admin | notification templates/events/delivery/diagnostics | Beta | Launch for email-only if provider credentials are certified; SMS/WhatsApp remain disabled until provider certification. |
| Salary setup | `/hr-admin/salary-setup` | Launch | Salary components/structures/employee salary mapping certified. |
| Payroll readiness | `/hr-admin/payroll-readiness` | Launch | Bank/statutory/readiness gates certified. |
| Payroll setup | `/hr-admin/payroll-setup` | Launch | Calendars, pay groups, setup masters certified. |
| Payroll inputs | `/hr-admin/payroll-inputs` | Launch | Snapshot/lock/review flows certified. |
| Payroll calculations | `/hr-admin/payroll-calculations` | Launch | Calculation review, warnings, and trace evidence certified. |
| Payroll review | `/hr-admin/payroll-review` | Launch | Exception decisions and approval flow certified. |
| Payroll adjustments | `/hr-admin/payroll-adjustments` | Launch | Submit/approve/reject/apply controls certified. |
| Payroll settlements | `/hr-admin/payroll-settlements` | Launch | Settlement flows certified. |
| Payroll statutory setup | `/hr-admin/payroll-statutory` | Launch with India scope | Public claims limited to certified statutory components and reports. |
| Payroll rules | `/hr-admin/payroll-rules` | Launch | Rule versioning and definitions certified. |
| Payroll outputs | `/hr-admin/payroll-outputs` | Launch | Output artifacts, payslips, access isolation, publication certified. |
| Payroll handoff | `/hr-admin/payroll-handoff` | Launch | Finance handoff, evidence, and export audit certified. |
| Payroll providers | `/hr-admin/payroll-providers` | Beta | Provider workspace visible only where sandbox/non-prod credentials are configured; live submission disabled by default. |
| Reports catalog | `/hr-admin/reports` and report detail routes | Launch | Report/export/audit pack certified; provider filing receipts depend on provider certification. |
| Audit center | `/hr-admin/audit` | Launch | Export and access audit visible to permitted users. |
| SaaS control plane pages inside HR admin | `/hr-admin/saas-control-plane`, `/hr-admin/saas-operations`, `/hr-admin/saas-resilience`, `/hr-admin/saas-sla-operations` | Internal/Beta | Should not be generally exposed to customer HR users unless product decision approves tenant-facing SaaS health views. |
| Launch remediation | `/hr-admin/launch-remediation` | Internal/Beta | Operational readiness surface; avoid public default unless customer-facing copy is approved. |
| ESS overview | `/ess` | Launch | Employee sees only own data. |
| ESS payslips | `/ess/payslips` | Launch | Published payslip access, download, and acknowledgment certified. |
| ESS statutory declarations | `/ess/statutory-declarations` | Launch with India scope | Declaration workflow certified; filing responsibility copy must be clear. |
| ESS documents | `/ess/documents` | Launch | Upload/download permissions certified. |
| ESS notifications | `/ess/notifications` | Launch if email provider certified | In-app notification can launch; external notifications depend on provider. |
| MSS approvals | `/mss/approvals` | Launch | Direct-report approval scope certified. |
| MSS notifications | `/mss/notifications` | Launch | Manager notifications certified. |
| Support console | `/support` | Internal only | Support agent only; scoped tenant grants required. |
| Support domain snapshot | `/support/domain-snapshot` | Internal only | Approved support scope only. |

## Report Scope

| Report | Launch status | Notes |
| --- | --- | --- |
| Payroll Register | Launch | Core finance/HR evidence. |
| Bank Advice | Launch | Export permitted after finance review; real bank submission not implied. |
| Payslip Publication | Launch | Publication and acknowledgement evidence. |
| Export Audit History | Launch | Required for evidence governance. |
| Finance Handoff Exceptions | Launch | Required before payment release. |
| Payroll Adjustments | Launch | Certified. |
| Payroll Settlements | Launch | Certified. |
| Payroll Close Readiness | Launch | Certified. |
| Statutory Deductions | Launch with India scope | Must not imply direct filing unless provider is certified. |
| TDS e-file package | Beta | Needs provider/legal/compliance review before public commitment. |
| Provider Filing Receipts | Beta | Requires provider sandbox/live certification. |
| Compliance export manifests | Launch | Evidence-only; filing remains customer/provider workflow unless certified. |

## External Provider Scope

| Provider category | Launch status | Public launch rule |
| --- | --- | --- |
| Object storage / signed artifact access | Launch | Must be production configured and access-isolation certified. |
| Transactional email | Launch target | Required for real users; provider bounce/webhook path should be tested. |
| SMS / WhatsApp | Disabled until certified | Optional later; do not promise at launch. |
| Error monitoring/APM | Launch target | Required for supportable public launch. |
| PAN/GSTIN/KYC validation | Beta | Useful before broad launch; manual fallback acceptable if disclosed. |
| Bank account verification / penny-drop | Strong launch target before real payouts | Do not run real payout pilot without bank validation path. |
| Bank payout API | Disabled until certified | Live disbursement disabled until bank/provider sandbox and finance signoff. |
| Statutory filing provider | Disabled until certified | Generate evidence/export first; live filing only after provider certification. |
| Accounting API | Beta/Deferred | Enable when finance target system is selected and certified. |

Implementation guardrail:

- `HRMS_PAYROLL_LIVE_RAILS_ENABLED=false` is the default.
- Payroll provider UI shows `Live rails off` while still allowing certification and launch rehearsal actions.
- Real payout, statutory filing, and live journal submission must remain unavailable until PL-3 certification and business approval are complete.
- HR Admin control center now includes a compact `Production-safe settings` guard for API base URL, demo data, public app URL, and payroll live rails.
- Backend `manage.py check --deploy` now includes HRMS-specific production safety checks for debug, secret key, allowed hosts, CSRF origins, secure cookies, SSL redirect, and placeholder DB password.

## Supported Public Launch Operating Model

Launch-supported:

- Tenant onboarding by Platform Admin.
- Tenant Admin governance and support access approval.
- HR Admin master data and payroll operations.
- Payroll Finance review and handoff.
- Employee self-service payslip/document/declaration access.
- Manager approval workflow.
- Report export with audit evidence.
- Scoped support diagnostics.

Not publicly supported until separately certified:

- Fully self-serve tenant signup without platform review.
- Live salary disbursement through bank payout API.
- Live statutory filing submission.
- SMS/WhatsApp notification commitments.
- Multi-country statutory payroll.
- Mobile-first payroll close operations.
- Unattended bulk onboarding unless import UI is certified.
- Customer-facing SaaS ops pages unless UX/copy is approved.

## Public Launch Gate Checklist

Before public launch:

- PL-0 scope matrix approved.
- PL-1 production AWS hardening complete.
- PL-2 security and tenant isolation gate passed.
- PL-3 launch providers certified in sandbox/non-production mode.
- PL-4 production-grade dry run passed.
- PL-5 customer onboarding flow accepted by non-engineering user.
- PL-6 legal/commercial documents approved.
- PL-7 support runbooks accepted.
- PL-8 performance/reliability gate passed.
- PL-9 final go/no-go signed.

## Stakeholder Sign-Off

| Owner | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Product | TBD | Pending | TBD | Approves launch scope and exclusions. |
| Engineering | TBD | Pending | TBD | Approves code/ops feasibility. |
| QA | TBD | Pending | TBD | Approves certification evidence. |
| HR/Payroll SME | TBD | Pending | TBD | Approves payroll operating scope. |
| Finance SME | TBD | Pending | TBD | Approves handoff/payment scope. |
| Security/Compliance | TBD | Pending | TBD | Approves privacy/security posture. |
| Support/Ops | TBD | Pending | TBD | Approves runbooks and support model. |
