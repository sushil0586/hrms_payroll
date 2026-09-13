# Pilot User Guide And API Procurement Plan

Date: 2026-09-13  
Product: HRMS Payroll SaaS  
Pilot environment: staging, `https://hrms.accerio.in`  
Primary sign-off: `docs/qa/pilot-100-final-signoff-2026-09-13.md`

## Purpose

This guide explains how each user type should use the product during pilot and which external APIs should be purchased or deferred.

The product is technically ready for a controlled pilot. External live provider rails are not assumed to be production-certified until non-production credentials are connected and separately tested.

## Separate Role-Specific User Guides

Use these self-contained guides when handing the product to pilot users:

- `docs/qa/user-guides/README.md`
- `docs/qa/user-guides/platform-admin-user-guide-2026-09-13.md`
- `docs/qa/user-guides/tenant-admin-user-guide-2026-09-13.md`
- `docs/qa/user-guides/hr-admin-user-guide-2026-09-13.md`
- `docs/qa/user-guides/payroll-finance-manager-user-guide-2026-09-13.md`
- `docs/qa/user-guides/manager-mss-user-guide-2026-09-13.md`
- `docs/qa/user-guides/employee-ess-user-guide-2026-09-13.md`
- `docs/qa/user-guides/support-agent-user-guide-2026-09-13.md`
- `docs/qa/user-guides/payroll-finance-and-hr-report-guide-2026-09-13.md`

## User Types

### Platform Admin

Best use:

- Create and activate tenants.
- Review tenant onboarding readiness.
- Configure first admin contact and provision the first tenant admin.
- Review policy pack adoption and activation gates.
- Monitor platform-level onboarding events.
- Validate cross-tenant access boundaries.

Primary workspace:

- `/platform-admin`

Recommended pilot actions:

1. Create or select pilot tenant.
2. Confirm tenant metadata, sandbox flag, and activation state.
3. Confirm first admin contact exists.
4. Confirm baseline policy pack adoption.
5. Confirm tenant admin can log in.
6. Do not operate tenant payroll as platform admin.

Avoid:

- Editing employee/payroll records inside a tenant as a substitute for HR admin.
- Running cleanup before stakeholder review.
- Treating platform admin access as permission to bypass tenant workflow.

### Tenant Admin / HR Admin

Best use:

- Operate the HR and payroll workspace for one tenant.
- Configure organization masters, departments, branches, cost centers, grades, designations, and employment types.
- Manage employee master data, access, bank accounts, salary setup, policies, attendance, leave, lifecycle, documents, payroll runs, outputs, reports, and finance handoff evidence.

Primary workspaces:

- `/hr-admin`
- `/tenant-admin`

Recommended pilot actions:

1. Confirm organization masters before onboarding employees.
2. Use employee create/edit pages for structural mapping.
3. Maintain primary bank account data before payroll output.
4. Lock payroll inputs only after review.
5. Review payroll calculation exceptions before generating outputs.
6. Publish payslips only after close-readiness review.
7. Export reports and manifests for evidence.
8. Use desktop for heavy payroll work.

Avoid:

- Using mobile for dense payroll setup or close operations.
- Finalizing production payroll based on staging evidence alone.
- Running real provider submission unless non-production credentials are configured and certified.

### Payroll Finance Manager

Best use:

- Review payroll handoff, bank advice, finance exports, provider delivery state, audit packs, and finance exception reports.
- Validate that output artifacts, reports, checksums, and source hashes are present before finance acceptance.

Primary workspaces:

- `/hr-admin/payroll-handoff`
- `/hr-admin/reports/bank-advice`
- `/hr-admin/reports/finance-handoff-exceptions`
- `/hr-admin/reports/payroll-register`
- `/hr-admin/reports/export-audits`

Recommended pilot actions:

1. Check bank advice totals against payroll register totals.
2. Review finance handoff status and audit-pack readiness.
3. Confirm provider audit pack has checksum/source-hash evidence.
4. Export CSV and manifest versions for finance records.
5. Acknowledge handoff only when evidence is complete.

Avoid:

- Treating sandbox provider rehearsal as live bank execution.
- Accepting a handoff when required bank or statutory artifacts are missing.

### Manager

Best use:

- Review direct-report requests and approvals.
- Use MSS for leave/attendance regularization decisions.
- Validate that only direct reports or assigned workflow items are visible.

Primary workspace:

- `/mss/approvals`

Recommended pilot actions:

1. Review pending approvals.
2. Approve/reject with reason where required.
3. Confirm non-direct employees are not visible.
4. Escalate missing direct reports to HR admin for manager mapping correction.

Avoid:

- Trying to perform HR admin setup or payroll operations.
- Sharing manager login with HR/payroll operators.

### Employee / ESS User

Best use:

- View personal workspace, documents, leave requests, attendance regularization, statutory declarations, notifications, and payslips.
- Download/read own payslips after publication.

Primary workspace:

- `/ess`

Recommended pilot actions:

1. Confirm personal profile and employment context.
2. Submit leave or regularization where applicable.
3. Submit statutory declaration proof where applicable.
4. Open payslip after publication.
5. Confirm read acknowledgement and download work.

Avoid:

- Expecting access to HR admin reports or other employees' records.
- Using HR admin artifact links for payslip downloads.

### Support Agent

Best use:

- Review support domain snapshots only when tenant has granted scoped support access.
- Validate configuration health and support session boundaries.

Primary workspaces:

- `/support`
- `/support/domain-snapshot`

Recommended pilot actions:

1. Confirm active support grant scope.
2. Review only approved support domains.
3. Document observations for tenant/admin review.
4. Verify ungranted support scopes are denied.

Avoid:

- Accessing tenant payroll or employee data without explicit scoped grant.
- Treating support access as permanent.

## Pilot Operating Rules

- Use desktop Chrome for HR/payroll operations.
- Keep `PILOT100_20260912` data until stakeholder review is complete.
- Do not run real bank/statutory provider rails without a separate non-production credential rehearsal.
- Use report CSV plus manifest export for audit evidence.
- Keep provider audit packs and source hashes with finance handoff evidence.
- Use release retention runbook if disk usage crosses alert thresholds.

## API Procurement Matrix

### Buy Before Live Production

| API Category | Why It Is Needed | Recommended Timing | Notes |
|---|---|---|---|
| PAN verification | Employee tax identity validation and TDS readiness. | Before real payroll onboarding. | Needed for PAN coverage, name matching, and TDS compliance quality. |
| Bank account verification / penny-drop | Verify salary payout account before payroll. | Before any real payout pilot. | Mandatory before live salary disbursement. |
| IFSC/bank branch lookup | Reduce bank-account entry errors. | Before payout pilot. | Often bundled with bank verification providers. |
| Business KYC / GSTIN / MCA verification | Tenant onboarding and legal entity validation. | Before external customer onboarding. | Useful for SaaS tenant risk and billing setup. |
| E-sign / document signing | Offer letters, policy acknowledgement, employment documents. | Before HR document-heavy pilot. | Can start with manual upload if budget is constrained. |
| Email delivery | Login, payslip, notification, workflow alerts. | Before pilot if real users are invited. | Use a transactional email provider with bounce/webhook support. |
| SMS / WhatsApp notifications | OTP, critical payroll reminders, payslip alerts. | Optional for first pilot, useful before broader rollout. | Start with email if keeping pilot simple. |
| Object storage | Secure payslip/report/artifact storage. | Before production. | S3-compatible storage is enough if governance controls are implemented. |
| Error monitoring/APM | Catch production issues quickly. | Before pilot. | Strongly recommended even for controlled pilot. |

### Buy Only When Provider Pilot Is Ready

| API Category | Why It Is Needed | Recommended Timing | Notes |
|---|---|---|---|
| Bank payout API | Real salary disbursement. | Only after finance approval and bank sandbox certification. | RazorpayX or bank-direct APIs are common options. |
| Accounting API | Push payroll journal to accounting system. | When finance selects accounting target. | Tally, Zoho Books, QuickBooks, or ERP-specific integration. |
| Statutory filing / TDS service | Form 24Q, challan reconciliation, return support. | After payroll reports are accepted by finance/compliance. | Often needs provider-assisted filing workflow, not only raw API. |
| PF/ESI/PT compliance provider | India statutory filings and challan generation. | Before production statutory automation. | Can stay manual for pilot if reports are enough. |
| DigiLocker / Aadhaar-based KYC | Employee document verification. | Later, unless onboarding requires it. | Use carefully due privacy/consent requirements. |

### Defer For Now

| API Category | Reason To Defer |
|---|---|
| Full background verification | Useful, but not required for payroll pilot. |
| Advanced fraud/AML monitoring | Useful for fintech-level flows, not core HR payroll pilot. |
| Account Aggregator / bank statement analysis | Not required unless lending/credit/salary underwriting is in scope. |
| Multi-country payroll providers | Defer until India pilot is accepted. |

## Suggested Provider Shortlist

| Need | Shortlist | Recommendation |
|---|---|---|
| KYC, PAN, GSTIN, bank verification, TDS-oriented APIs | Sandbox, Surepass, Signzy, Perfios | Start with Sandbox or Surepass for breadth; compare pricing and SLA. |
| Bank payouts | RazorpayX, bank-direct corporate API, Cashfree Payouts | Start with RazorpayX sandbox or your bank's corporate payout API. |
| Transactional email | Amazon SES, SendGrid, Postmark | Use SES for cost, Postmark for deliverability simplicity. |
| SMS/WhatsApp | Twilio, Gupshup, MSG91, Interakt | Defer unless pilot needs mobile alerts. |
| Object storage | AWS S3, Cloudflare R2, Azure Blob, GCS | Use whichever matches deployment/security preference; S3-compatible is easiest. |
| Error monitoring | Sentry | Buy before real pilot users. |
| Analytics/product monitoring | PostHog, Mixpanel | Optional for pilot; useful after user feedback starts. |

## Minimum Purchase Recommendation

For a controlled pilot with real users but no live payout:

1. Transactional email.
2. Error monitoring/APM.
3. Object storage.
4. PAN verification.
5. Bank account verification sandbox.

For a live salary payout pilot:

1. Everything above.
2. Bank payout sandbox and production account.
3. Provider callback/webhook verification.
4. Finance-approved payout approval workflow.
5. Bank reconciliation report acceptance.

For statutory filing automation:

1. TDS/Form 24Q provider or compliance service.
2. PF/ESI/PT filing support if these are in pilot scope.
3. Compliance owner sign-off on generated files and filing procedure.
