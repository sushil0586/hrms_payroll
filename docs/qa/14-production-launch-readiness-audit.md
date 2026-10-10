# Phase 4A Production Launch Readiness Audit

Date: 2026-10-10  
Scope: complete HRMS/payroll SaaS production launch readiness.  
Mode: evidence-based audit and planning only. No production mutations, real email/SMS, payments, provider submissions, or configuration changes were executed.

## Baseline Preserved

Phase 3C final cross-module E2E baseline is preserved as the current local/sandbox certification baseline:

| Baseline | Result | Evidence |
| --- | ---: | --- |
| Original Phase 3C E2E scenarios | 32 | `docs/qa/13-e2e-execution-register.md` |
| Passed | 29 | `docs/qa/evidence/phase3c7/` |
| Conditional | 3 | `HRADM-E2E-012`, `HRADM-E2E-013`, `HRADM-E2E-016` |
| Failed | 0 | Phase 3C.7 final docs |
| Blocked | 0 | Phase 3C.7 final docs |
| Not Run | 0 | Phase 3C.7 final docs |

The Phase 3C baseline proves strong local/sandbox coverage for HR Admin workforce, documents, setup/workflows, time, leave, attendance, roster, payroll, notifications, reports, audit, imports, command center and cross-module journeys. It does not prove production deployment, real external integrations, real backup/restore, deployed RBAC, or live provider/email/payment behavior.

## Implementation Evidence Reviewed

| Area | Evidence reviewed | Audit conclusion |
| --- | --- | --- |
| QA baseline | `docs/qa/00` through `13`, Phase 3B/3C evidence, payroll manifest | Local/sandbox application behavior is broadly certified; three Phase 3C scenarios remain conditional. |
| Production Django settings | `backend/config/settings/production.py`, `base.py` | Production settings enforce `DEBUG=False`, secure cookies, SSL redirect, HSTS and strict payroll artifact storage verification. Runtime env still needs deployed proof. |
| Production deployment | `ops/ec2/deploy.sh`, `ops/ec2/README.md`, systemd units, nginx config, `docker-compose.production.yml` | EC2/systemd runbook exists, with preflight, migration, collectstatic, service restart, timers and rollback. Actual target deployment evidence is not present in repo. |
| Production preflight | `backend/apps/common/management/commands/production_preflight.py` | Strong fail-fast gates exist for settings, Postgres, Redis, email, workers, provider credentials and storage policy. Needs execution in target environment. |
| Final production audit runner | `scripts/run-final-production-audit.py` | Exists and intentionally fails unless real deployment credentials, email proof, provider/storage credentials and live personas are supplied. Not yet executed against target production. |
| Email proof | `verify_email_delivery` command | Production-safe proof exists; no current evidence of real SMTP/SES accepted delivery. |
| Notification workers | systemd timer and Docker/Celery options | Runtime paths exist. Live worker/timer status and external channel proof are unverified. |
| Payroll provider/storage | provider worker timers, production env template, preflight gates | Local/sandbox provider callback/retry passed. Real provider sandbox/live credentials, transports and audit-pack drilldowns remain unverified. |
| Backups/restore | `ops/backup_postgres.sh`, `ops/restore_postgres.sh`, `ops/backup_restore_rehearsal.sh` | Backup and restore scripts exist. No target-environment restore rehearsal evidence is present. |
| Monitoring/alerts | `ops/monitoring/prometheus-rules.yml` | Alert rules exist for backend/web, Redis, Postgres, notification failures, provider failures and stale restore evidence. Prometheus/Alertmanager wiring and alert delivery proof are unverified. |
| CI | `.github/workflows/phase0-ci.yml` | CI covers lint/typecheck/build, backend tests, production-like static preflight and critical Postgres/Redis tests. This is not a deployed production proof. |

## Readiness Verdict

| Verdict type | Current verdict | Rationale |
| --- | --- | --- |
| Pilot Launch Ready | Not Ready | The product is locally/sandbox certified, but deployed production preflight, real notification proof, backup/restore rehearsal and open payroll/provider gates are not verified. |
| General Availability Ready | Not Ready | GA requires all P0/P1 gates verified, including real external delivery, provider/storage credentials, production monitoring/alerts, backup restore, deployed RBAC and business sign-off. |
| Current best classification | Not Ready for paying-customer launch | Phase 4B-4F evidence is mandatory before launch. |

## Mandatory P0/P1 Launch Blockers

| Blocker | Severity | Status | Why it blocks launch |
| --- | --- | --- | --- |
| `HRADM-DEF-20261009-013` missing primary bank-account readiness decision | P0 | Blocked | Payment readiness cannot be certified until product/finance approve stage-specific behavior for calculation, review, output, bank advice and payment submission. |
| `3C-GATE-PROV-001` provider incomplete-lane proof | P0 | Blocked | Unsafe provider lane activation/submission must be proven blocked in real sandbox/provider configuration or formally excluded. |
| `3C-GATE-PROV-002` provider audit-pack drilldown | P0 | Blocked | Provider audit evidence must be traceable in a real sandbox or approved production-like provider path. |
| Final production audit not executed | P0 | Not Verified | `pnpm qa:final-production-audit` is the executable P0/P1 launch gate and has not been run against the target deployment. |
| Real email/SMS delivery proof absent | P0 | Not Verified | Notification workflows passed locally/in-app only; real provider accepted delivery, bounce/failure handling and alerting are unverified. |
| Backup/restore rehearsal absent | P0 | Not Verified | Paying-customer launch requires restore proof against isolated target DB, not just a backup script. |
| Target production preflight absent | P0 | Not Verified | Production settings and env must pass `production_preflight --strict` without `--skip-network` in the target environment. |
| Deployed RBAC/tenant isolation proof absent | P0 | Partially Verified | Local two-tenant proof passed; deployed host/session/role proof with live personas is not present. |
| Monitoring and alert delivery proof absent | P1 | Not Verified | Rules exist, but production Prometheus/Alertmanager wiring and alert delivery are unverified. |

## Key Observations

1. The application is much closer to pilot readiness than GA readiness: the product workflows are heavily exercised locally, but the remaining risks are production-environment and external-integration risks.
2. Production settings are intentionally strict, which is good. The risk is not missing code hooks; it is missing target-environment evidence.
3. The final production audit runner already encodes many Phase 4 gates. It should become the authoritative launch evidence bundle after credentials and personas are configured.
4. The EC2 runbook is usable but needs a real deployed run with archived artifacts: preflight, service/timer status, nginx test, smoke, audit bundle, backup restore and alert proof.
5. Payroll launch cannot be called fully certified while `HRADM-DEF-20261009-013` and provider gates remain unresolved.
6. Local Phase 3C financial evidence is strong: the final DB reconciliation proves 100 PH3C employees, 500 payroll snapshots, a completed 100-employee payroll calculation, published payslips and report/audit/source-hash evidence. This must be repeated or sampled in a realistic deployed tenant before paid launch.

## Missing External Evidence

| Evidence | Required for Pilot | Required for GA |
| --- | --- | --- |
| Target deployment `production_preflight --strict` | Yes | Yes |
| Target deployment `pnpm qa:final-production-audit` | Yes | Yes |
| Real email delivery accepted by provider | Yes | Yes |
| SMS provider proof or approved SMS exclusion | If SMS in pilot scope | Yes if SMS offered |
| Provider sandbox callback/retry/audit-pack proof | Yes for payroll pilot | Yes |
| Real payroll payment submission proof | No, unless pilot pays via platform | Yes or formally excluded |
| Backup and isolated restore rehearsal | Yes | Yes |
| Monitoring/alert delivery proof | Yes | Yes |
| Incident response drill | Recommended | Yes |
| Legal/compliance/payroll owner sign-off | Yes | Yes |

## Recommended Phase 4 Sequence

1. Phase 4B: production/staging environment hardening and strict preflight evidence.
2. Phase 4C: deployed RBAC, tenant isolation, session security and read-only/mutation-safe browser audit.
3. Phase 4D: external notification delivery, workers, retries, bounce/failure handling and monitoring proof.
4. Phase 4E: payroll provider/storage/finance handoff/bank readiness decision and sandbox provider proof.
5. Phase 4F: backup/restore, observability, incident response, performance/concurrency and final launch sign-off.

Stop condition for Phase 4A: this audit creates the gate register and plan only. No Phase 4B execution has begun.
