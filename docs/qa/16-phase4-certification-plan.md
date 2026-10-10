# Phase 4 Certification Plan

Date: 2026-10-10  
Starting baseline: Phase 3C.7 is Conditionally Certified locally with 29 Passed, 3 Conditional, 0 Failed, 0 Blocked.

## Phase 4 Objective

Move from local/sandbox certification to production launch readiness for paying customers without overstating evidence. Phase 4 must prove deployment, secrets, external integrations, real provider/storage paths, monitoring, backup/restore and operational response.

## Entry Criteria

1. Phase 3C.7 baseline preserved in `docs/qa/13-e2e-execution-register.md`.
2. No production data mutation without an approved runbook and rollback.
3. Target environment identified: staging, pilot production or production.
4. Dedicated launch tenant and personas prepared.
5. External integrations configured in sandbox or formally excluded.
6. Evidence directory agreed for production artifacts.

## Phase 4B - Deployment, Security and Preflight

Goal: prove the target deployment is configured safely and passes strict runtime preflight.

Actions:

1. Deploy using `ops/ec2/deploy.sh` or the approved Docker path.
2. Archive commit/release id, `nginx -t`, systemd status and timer list.
3. Run `python manage.py check --deploy`.
4. Run `python manage.py production_preflight --strict` without `--skip-network`.
5. Run `scripts/hrms-post-deploy-smoke.sh`.
6. Run deployed auth routing smoke with all required personas.

Exit criteria:

| Gate | Required status |
| --- | --- |
| `P4-GATE-003..014` | Verified or formally Not Applicable |
| Any P0 deployment/security gate | 0 open blockers |

## Phase 4C - Deployed RBAC, Tenant Isolation and Safe Journey Proof

Goal: prove deployed role and tenant boundaries on the actual target stack.

Actions:

1. Run deployed readonly auth routing and role menu suites.
2. Run deployed tenant isolation suite with two real target tenants.
3. Verify stale session/logout/back-forward behavior.
4. Run mutation-safe employee/document/ESS/MSS proof on disposable tenant records.
5. Archive screenshots, traces, API denial evidence and sanitized tenant IDs.

Exit criteria:

| Gate | Required status |
| --- | --- |
| `P4-GATE-011`, `012`, `013` | Verified |
| No unresolved authorization, tenant isolation or session security P0/P1 | Required |

## Phase 4D - Notifications, Workers, Monitoring and External Delivery

Goal: prove real notification delivery and operational visibility.

Actions:

1. Configure SMTP/SES or approved email provider with verified sender.
2. Run `verify_email_delivery` to a controlled mailbox.
3. Verify notification worker/timer status and processing behavior.
4. Execute notification retry/failure/bounce diagnostics in sandbox-safe mode.
5. Decide SMS scope; either execute SMS proof or formally exclude SMS from launch.
6. Load monitoring rules and prove alert delivery.

Exit criteria:

| Gate | Required status |
| --- | --- |
| `P4-GATE-015..019`, `034`, `035` | Verified, except SMS may be Not Applicable only with product sign-off |
| Real external email delivery | Verified |

## Phase 4E - Payroll Provider, Storage, Finance Handoff and Bank Readiness

Goal: close payroll launch blockers and prove external payroll integration boundaries.

Actions:

1. Resolve `HRADM-DEF-20261009-013` with payroll product and finance sign-off.
2. Configure payroll provider credential refs and storage policy refs without exposing secrets.
3. Run provider incomplete-lane negative proof for `3C-GATE-PROV-001`.
4. Run provider audit-pack drilldown proof for `3C-GATE-PROV-002`.
5. Run provider callback/replay/retry/idempotency on deployed sandbox provider path.
6. Run production storage governance suite.
7. Run realistic payroll close/output/finance handoff with no real bank transfer unless approved.
8. Reconcile gross, deductions, net, payslips, register, statutory evidence and handoff artifacts.

Exit criteria:

| Gate | Required status |
| --- | --- |
| `P4-GATE-020..029` | Verified or approved excluded scope |
| `HRADM-DEF-20261009-013` | Resolved or formally excluded with accepted release risk |
| `3C-GATE-PROV-001/002` | Resolved or formally excluded with accepted release risk |

## Phase 4F - Backup/Restore, Performance, Concurrency and Final Sign-Off

Goal: prove operational resilience and produce final launch decision.

Actions:

1. Run `ops/backup_restore_rehearsal.sh` against isolated restore DB.
2. Archive backup checksum and restore JSON.
3. Run deployed performance suite on large tenant data.
4. Run concurrency/idempotency probes for approvals, imports, payroll locks and provider retries.
5. Run incident response tabletop or drill.
6. Run `pnpm qa:final-production-audit`.
7. Produce final launch decision: Pilot Launch Ready, GA Ready or Not Ready.

Exit criteria:

| Gate | Required status |
| --- | --- |
| `P4-GATE-030..038` | Verified or formally accepted exception |
| `pnpm qa:final-production-audit` | PASS |
| P0 launch blockers | 0 |
| P1 launch blockers | 0 for GA; accepted exceptions only for pilot |

## Recommended Execution Order

1. Phase 4B first because most later checks depend on deployed config and personas.
2. Phase 4C next to ensure no production-like tenant/role leakage before external integrations.
3. Phase 4D next because notification proof and alerting affect incident response and workflow communications.
4. Phase 4E after provider/storage secrets are ready and bank-readiness decision is made.
5. Phase 4F last as the final resilience and sign-off pass.

## Provisional Readiness

| Readiness level | Verdict | Reason |
| --- | --- | --- |
| Pilot Launch Ready | Not Ready | P0 production preflight, deployed RBAC, external notification proof, backup restore and payroll/provider gates remain unresolved. |
| General Availability Ready | Not Ready | P0/P1 environment, observability, provider/storage, incident response and operational gates remain unverified. |

## Non-Negotiable Rules

1. Do not mark local/sandbox evidence as production-proven.
2. Do not run payment, banking, external provider submission, SMS or email outside approved sandbox/proof procedures.
3. Do not weaken payroll, RBAC, tenant isolation or audit rules to obtain a pass.
4. Do not close `HRADM-DEF-20261009-013` or provider gates without owner-approved evidence.
5. Do not begin Phase 4B automatically from this plan.
