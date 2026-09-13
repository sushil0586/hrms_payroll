# Public Launch Readiness Phase Plan

Date: 2026-09-13  
Product: HRMS Payroll SaaS  
Current app-code confidence: 92-95%  
Current controlled-pilot confidence: 98%  
Current public-launch confidence: 82-85%  
Target public-launch confidence: 92-95% before open customer launch

## Purpose

This is the granular phase-wise plan to move the product from controlled pilot-ready to public launch-ready.

The application code and browser flows are strong. The remaining work is mostly production operations, external provider certification, commercial/legal readiness, support readiness, and final go-live rehearsals.

## Launch Readiness Definitions

| Readiness level | Meaning |
| --- | --- |
| Controlled pilot-ready | One or more known tenants can use the system with agreed limitations and close monitoring. |
| Public launch-ready | New customer tenants can be onboarded safely, supportably, and repeatably without engineering hand-holding. |
| Production payroll-ready | Real payroll, statutory, payment, document, and provider flows are certified with production-grade operational controls. |

## Current Baseline

Already certified:

- 1 organization / 100 employee realistic payroll rehearsal.
- Platform Admin, Tenant Admin, HR Admin, Payroll Finance Manager, Manager, Employee, and Support Agent role access.
- Sidebar/menu/tab navigation across major workspaces.
- Payroll setup, inputs, calculation, review, outputs, payslips, finance handoff, reports, export audit, backup/restore, rollback, and staging operations.
- Release retention and disk cleanup runbook.
- Role-wise user guides.

Still needed before public launch:

- Production AWS hardening.
- Real provider sandbox/non-production credential certification.
- Monitoring and alerting that notifies someone, not only documents a command.
- Security/legal/commercial readiness.
- Customer onboarding and support process.
- Final production-like dry run.

## Phase PL-0: Public Launch Scope Freeze

Goal: define exactly what is included in public launch and what is intentionally excluded.

Tasks:

- Freeze launch scope by module.
- Mark each module as `Launch`, `Pilot only`, `Beta`, or `Disabled`.
- Freeze supported countries, currencies, statutory regimes, and payroll frequencies.
- Freeze supported user roles.
- Freeze supported report/export formats.
- Freeze support hours and escalation path.
- Freeze real provider integrations that will be available at launch.

Exit criteria:

- Launch scope matrix is approved.
- No ambiguous "maybe launch" modules remain.
- Product, engineering, QA, support, and business agree on what is publicly offered.

Evidence:

- Signed launch scope matrix.
- Updated user guides if any feature is excluded.
- Draft scope-freeze matrix: `docs/qa/public-launch-scope-freeze-matrix-2026-09-13.md`.

Confidence impact:

- Public-launch confidence +2% when complete.

## Phase PL-1: Production AWS Architecture And Environment Hardening

Goal: production environment is separated, stable, secure, observable, and recoverable.

Tasks:

- Create/confirm production AWS account or isolated production VPC.
- Decide production compute pattern:
  - Minimum launch: EC2 with systemd, Nginx, Postgres, backups, CloudWatch.
  - Better launch: ECS/Fargate or managed deployment pipeline.
- Configure production domain and SSL.
- Configure production environment variables.
- Store secrets in AWS Secrets Manager or SSM Parameter Store.
- Configure database backup and retention.
- Configure media/artifact storage.
- Configure log retention.
- Configure deployment rollback path.
- Configure release retention policy.
- Configure disk, CPU, memory, process, HTTP, and SSL expiry alerts.
- Confirm staging and production cannot share secrets accidentally.

Exit criteria:

- Production environment can deploy current commit.
- `/login` and `/` return healthy responses.
- Backend and frontend services survive restart.
- Backup is created and restorable.
- Alerts reach the responsible owner.

Evidence:

- Production environment checklist.
- Screenshot or log of successful health checks.
- Backup restore evidence.
- Alert delivery proof.
- Draft AWS production hardening checklist: `docs/qa/public-launch-aws-production-hardening-checklist-2026-09-13.md`.

Confidence impact:

- Public-launch confidence +4% to +6% when complete.

## Phase PL-2: Security, Privacy, And Tenant Isolation Final Gate

Goal: launch customers are protected from cross-tenant leaks, unsafe support access, and obvious security misconfiguration.

Tasks:

- Rerun role/access boundary tests on production-like environment.
- Rerun cross-tenant isolation tests with deterministic test tenants.
- Verify support access is scoped, approved, time-bound, and auditable.
- Verify employee cannot access HR/payroll admin APIs.
- Verify finance manager cannot access platform APIs.
- Verify platform admin cannot silently operate tenant payroll without intended workflow.
- Review cookies, session expiry, auth token handling, and logout.
- Review CORS, allowed hosts, secure headers, and HTTPS-only behavior.
- Confirm production debug mode is off.
- Confirm no `.env`, secrets, test credentials, or source maps expose sensitive data.
- Confirm report exports include audit trail and source evidence where required.

Exit criteria:

- Security role/access Playwright pack passes.
- Manual security checklist has no P0/P1 issue.
- Any accepted limitation is explicitly signed off.

Evidence:

- Playwright result.
- Security checklist.
- Accepted limitation register.

Confidence impact:

- Public-launch confidence +3% to +5% when complete.

## Phase PL-3: External Provider Integration Certification

Goal: real external rails are tested safely before any live submission/payment.

Provider categories:

- Email/SMS/WhatsApp notification provider.
- Storage/signing provider for secure artifacts.
- Payroll/statutory filing provider, if used.
- Payment/bank file provider, if used.
- PAN/GSTIN/KYC validation provider, if used.
- Error tracking and monitoring provider.

Tasks:

- Buy or activate non-production/sandbox credentials first.
- Configure provider credentials through production-grade secret storage.
- Run provider connection test.
- Run callback test.
- Run retry/failure test.
- Run revoked/expired artifact access test.
- Run export audit and source-hash proof.
- Confirm provider rate limits and costs.
- Confirm provider outage fallback.
- Document live submission disable/enable switch.

Exit criteria:

- Every launch provider has sandbox certification.
- Live submission is disabled until final business approval.
- Failed provider calls are visible and retryable.
- Provider logs are traceable to tenant and payroll period.

Evidence:

- Provider certification report.
- Callback/retry Playwright result.
- Cost/rate-limit note.
- Provider credentials register without exposing secrets.

Confidence impact:

- Public-launch confidence +4% to +7% when complete.

## Phase PL-4: Payroll Production-Grade Dry Run

Goal: prove the system can handle a production-like payroll cycle end to end with realistic customer behavior.

Scenario:

- 1 tenant.
- 100 employees minimum.
- Multiple departments, branches, grades, cost centers, and managers.
- Positive and negative cases.
- Payroll finance review.
- ESS/MSS user access.
- Reports and audit pack.

Tasks:

- Create tenant through Platform Admin browser UI.
- Create/verify tenant admin.
- Configure organization masters through browser UI.
- Create employees through browser UI or approved bulk-import UI when available.
- Configure salary, bank, statutory, attendance, leave, and declarations.
- Submit manager/employee workflows.
- Prepare payroll input snapshot.
- Run calculation.
- Review exceptions.
- Apply adjustments/settlements.
- Review close readiness.
- Generate outputs.
- Publish payslips.
- Verify ESS payslip access.
- Generate finance handoff.
- Generate reports.
- Verify export audit.
- Verify support agent can diagnose only with approved scope.

Exit criteria:

- Production-like dry run passes without seed-script dependence for user actions.
- Any seed/script use is limited to environment setup or test-data generation and clearly documented.
- No P0/P1 defect remains.

Evidence:

- Playwright certification result.
- Manual observation log.
- Screenshots/videos where useful.
- Final dry-run signoff.

Confidence impact:

- Public-launch confidence +4% to +6% when complete.

## Phase PL-5: Customer Onboarding And Admin Experience

Goal: new customers can be onboarded repeatably without engineering intervention.

Tasks:

- Verify Platform Admin tenant creation.
- Verify first tenant admin provisioning.
- Verify tenant admin user/role governance.
- Verify tenant domain/subdomain setup.
- Verify default policy pack setup.
- Verify launch checklist visibility.
- Verify empty-state guidance for missing masters.
- Verify dropdown dependency warnings.
- Verify user guide handoff.
- Verify onboarding email/manual instructions.

Exit criteria:

- A new tenant can be created, activated, and handed to HR Admin through documented steps.
- Tenant Admin and HR Admin can operate without direct engineering support.

Evidence:

- Five-tenant onboarding test result or updated targeted run.
- User guide acceptance by one non-engineering reviewer.

Confidence impact:

- Public-launch confidence +2% to +4% when complete.

## Phase PL-6: Legal, Compliance, And Commercial Readiness

Goal: the public product has the required customer-facing business documents and policies.

Tasks:

- Terms of service.
- Privacy policy.
- Data processing agreement template.
- Support policy.
- SLA statement.
- Refund/cancellation policy if billing is enabled.
- Security posture summary.
- Backup/retention statement.
- Payroll disclaimer and customer responsibility statement.
- Provider dependency disclosure.
- Data deletion/export process.

Exit criteria:

- Customer-facing documents are approved.
- Links are available in app or onboarding pack.
- Sales/support team knows what can and cannot be promised.

Evidence:

- Approved documents.
- Public/legal page links.
- Commercial launch checklist.

Confidence impact:

- Public-launch confidence +3% to +5% when complete.

## Phase PL-7: Support, Incident, And Operations Runbooks

Goal: launch issues can be handled without panic or ad hoc engineering work.

Tasks:

- Create support triage runbook.
- Create payroll-blocker escalation runbook.
- Create provider-outage runbook.
- Create backup/restore runbook.
- Create rollback/roll-forward runbook.
- Create disk cleanup and alert runbook.
- Create account lockout/password reset runbook.
- Create customer data correction runbook.
- Define severity levels and response targets.
- Define owner rotation.
- Define evidence collection rules.

Exit criteria:

- Support can classify and escalate issues.
- Engineering can restore/rollback under documented steps.
- Customer-facing communications are prepared.

Evidence:

- Runbook pack.
- Support rehearsal result.
- Incident contact matrix.

Confidence impact:

- Public-launch confidence +3% to +5% when complete.

## Phase PL-8: Performance, Load, And Reliability Gate

Goal: public users can use the app during normal launch load without unacceptable slowness.

Tasks:

- Run browser performance pack on production-like environment.
- Run API smoke under realistic concurrency.
- Test login, dashboard, HR Admin, reports, payroll run, export, ESS payslip access.
- Test large table pagination.
- Test report exports with 100+ employees.
- Review slow API logs.
- Review database indexes for hot paths.
- Confirm background jobs do not block UI.
- Confirm deployment/restart does not corrupt active sessions unexpectedly.

Exit criteria:

- Core pages meet agreed performance budget.
- No repeated timeout in launch-critical flows.
- CPU/memory/disk metrics remain acceptable.

Evidence:

- Playwright performance result.
- API/load result.
- Monitoring snapshot.

Confidence impact:

- Public-launch confidence +2% to +4% when complete.

## Phase PL-9: Final Go/No-Go And Launch Execution

Goal: launch decision is explicit, reversible, and supported.

Tasks:

- Freeze release commit.
- Deploy to production.
- Run final production smoke.
- Run role/menu certification.
- Run security role/access pack.
- Run payroll dry-run smoke.
- Run provider sandbox smoke.
- Confirm monitoring alerts.
- Confirm backup was created.
- Confirm rollback target.
- Confirm support coverage.
- Confirm stakeholder go/no-go.
- Announce launch window.

Exit criteria:

- All launch-critical checks pass.
- Stakeholders approve launch.
- Rollback path is ready.
- Support team is staffed.

Evidence:

- Final launch signoff.
- Production smoke result.
- Deployment record.
- Rollback target record.

Confidence impact:

- Public-launch confidence reaches 92-95% when complete.

## Public Launch Critical Path

Do these first:

1. PL-0 scope freeze.
2. PL-1 production AWS hardening.
3. PL-3 provider sandbox certification.
4. PL-4 production-grade dry run.
5. PL-6 legal/commercial readiness.
6. PL-9 go/no-go launch execution.

## Launch Blocking Criteria

Do not publicly launch if any of these are true:

- Cross-tenant data exposure exists.
- Payroll totals cannot be reconciled.
- Finance handoff exports cannot be audited.
- Backup restore has not been proven.
- Rollback is unknown or untested.
- Production secrets are stored insecurely.
- Provider live rails are enabled without sandbox certification.
- Support has no incident path.
- Legal/privacy terms are missing.
- Stakeholders have not accepted launch limitations.

## Recommended Next Action

Start with PL-0 and PL-1:

1. Approve launch scope.
2. Create production AWS hardening checklist.
3. Decide provider list and buy only sandbox/non-production credentials first.
4. Schedule one final production-like dry run after production environment is ready.
