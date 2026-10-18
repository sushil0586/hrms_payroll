# Restricted Pilot Scope Recommendation

Date: 2026-10-18  
Recommendation: **CONDITIONAL GO for synthetic/shadow pilot only; production payroll NO-GO**

## Eligible Pilot Scope

After staging entry controls are satisfied, a restricted pilot may exercise:

- New synthetic tenants only, using approved Enterprise fixtures and no legacy migration.
- Same-legal-entity employee hire, profile/access management, effective employee movements, and deactivation.
- Supported leave submission, sequential approval, cancellation before expiry, append-only corrections, and certified carry-forward paths.
- Supported attendance shifts, roster rollout, regularization, monthly close, and governed reopen.
- Payroll readiness, input locking, calculation, review, approval, outputs and finance artifacts in **shadow mode** with no real payment, statutory filing, email, or provider transaction.
- ESS/MSS supported workflows, including durable mutation idempotency and lost-response replay.
- Sequential maker/checker approvals without delegation, parallel quorum, escalation or transfer reassignment.
- Organization CRUD and atomic import for current-state masters.
- Only report/import/download families with explicit executed evidence and bounded certified volumes.

## Mandatory Feature Exclusions

The pilot must visibly disable or operationally prohibit:

- Cross-legal-entity transfer and rehire.
- FnF, leave encashment settlement, gratuity, automatic arrears and supplementary retro pay.
- Post-expiry leave cancellation.
- Overtime-to-payroll conversion.
- Real payroll payments, partial payment/reissue, provider settlement and statutory filing.
- Unsupported ESI/PT/LWF/gratuity/bonus calculations for any jurisdiction lacking approved effective-dated specifications.
- Parallel approval, delegation, automated escalation and pending-request reassignment after manager transfer.
- Future-dated organization-master reparenting and claims of historical as-of organization reporting.
- Biometric ingestion and crash-resumable background imports.
- Plan downgrade, support access, tenant offboarding and irreversible erasure.
- Generated-letter or sensitive artifact sharing without verified immediate revocation and protected object storage.

Fail-closed behavior must remain in place. Excluded features must not be enabled through hidden APIs, direct URLs, role assignment, or configuration flags.

## Gates That Cannot Be Waived

The following cannot be accepted merely as pilot exclusions when real personal or payroll data is introduced:

1. Complete applicable statutory formulas and effective dates.
2. Employee-level payment integrity and provider reconciliation before any real payment.
3. Tenant isolation, RBAC, support-access revocation and protected artifact authorization.
4. Legal hold, retention policy and backup disposition for personal, payroll and document records.
5. Deterministic legacy-data classification before importing historical customer data.
6. Managed database backup/restore, broker durability, monitoring, audit retention and deployment rollback.
7. TLS, secure cookies, CSRF, trusted-host and reverse-proxy verification on the deployed domain.

## Pilot Operating Controls

- Use named accountable operators and a fixed allowlist of tenants and users.
- Require maker/checker for payroll and financial state transitions.
- Keep payments, emails, filings and finance-provider transmission in sandbox or disabled mode.
- Record tenant, employee, period, job, artifact and audit IDs for every pilot workflow.
- Monitor failed/retried jobs, cross-tenant denials, duplicate keys, export/download events and payroll reconciliation daily.
- Retain rollback-ready backups and rehearse restore before pilot entry.
- Cap initial concurrency below the verified local 25-VU envelope until isolated staging measurements pass.
- Stop immediately on tenant leakage, authorization bypass, ledger imbalance, payroll mutation, duplicate posting/payment, or unexplained historical drift.

## Decision Matrix

| Decision | Outcome | Conditions |
|---|---|---|
| Core functional readiness | Conditional Pass | Supported local workflows only; exclusions enforced |
| Deep-domain integrity readiness | Conditional | 49 Verified, 18 Partial, 3 Missing, 11 Blocked |
| Synthetic staging entry | Conditional Go | Complete STG-001 through STG-008 as applicable |
| Restricted shadow pilot | Conditional Go | New synthetic tenants; no real payroll movement or sensitive external integrations |
| Restricted pilot with real employee/payroll data | No-Go | Legal/statutory/security/storage/backup/payment gates unresolved |
| Unrestricted production launch | No-Go | P0 policy, implementation and staging gates remain open |

## Minimal Remediation Order

1. Close `DD-TG-007` support-session revocation and deploy protected object storage/malware scanning.
2. Approve and implement jurisdiction-specific statutory oracles and employee payment ledger (`DD-PY-005`, `DD-PY-007`).
3. Approve the connected FnF/encashment/tax/payment model (`DD-EL-006`, `DD-LV-008`, `DD-PY-008`).
4. Approve retention, legal-hold, backup and irreversible-erasure governance (`DD-TG-008` / `DBR-010`).
5. Resolve legacy classification (`DD-TG-009`) before any historical migration.
6. Implement durable import checkpointing and download-revocation races for enabled modules.
7. Address transfer, rehire, overtime and approval-policy families only if they are in launch scope; otherwise keep them disabled and fail closed.
8. Execute staging security, recovery, provider, observability, deployment and capacity gates.

This recommendation does not authorize staging or production deployment and does not replace legal, statutory, security or business-owner approval.
