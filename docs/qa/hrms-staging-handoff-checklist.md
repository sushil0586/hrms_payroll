# HRMS/Payroll Staging Handoff Checklist

Date: 2026-10-18  
Purpose: execution checklist for a production-like synthetic staging environment  
Authorization: required before provisioning or deployment

## Entry Criteria

- [ ] Product and Release Lead sign the enabled-feature and explicit-exclusion manifest.
- [ ] Payroll/Tax identify pilot jurisdiction, legal entities, employee population and applicable statutory components.
- [ ] Legal/Privacy approve staging data classification, retention, legal hold and synthetic-data disposal.
- [ ] Infrastructure approves cost, region, resource sizing and network architecture.
- [ ] Security approves domain, certificate, secret manager, encryption keys, storage/scanner and log retention.
- [ ] Database Operations approve RPO/RTO and restore-drill window.
- [ ] Provider owners supply sandbox contracts and secret references; no production credentials are permitted.
- [ ] Candidate commit and backend/web image digests are frozen and traceable to CI results.
- [ ] Northstar, production, customer and copied production payroll data are excluded.

Failure of any entry criterion blocks deployment, not merely certification.

## Infrastructure And Security

| Gates | Required resources / secrets | Execution and evidence | PASS criteria | Owner / rollback |
|---|---|---|---|---|
| `STG-001`, `DDG-F-027` | Approved domain, TLS certificate/key reference, trusted hosts, CSRF origins, proxy CIDRs, session secrets | Run staging validator; capture HTTP redirect, TLS scan, HSTS/cookie/CSRF/invalid-host browser tests; repeat support-session revoke race and central audit lookup. | Valid TLS 1.2+ chain; HTTP redirects; HSTS and secure cookies; bad host/origin denied; revoked support scope immediately denied and logged. | Infrastructure + Security. Remove route/cert binding and restore previous proxy config. |
| `STG-002`, `DDG-F-029`, `DDG-F-032` | Managed PostgreSQL, encrypted snapshot/PITR, off-host copy, approved RPO/RTO | Restore into an isolated database; time backup/restore; migrate forward/rollback/reapply where supported; reconcile row counts and checksums; keep ambiguous history unchanged. | RPO/RTO met; exact reconciliation; no unclassified row changed; restore evidence retained. | Database Operations + Data Owners. Destroy rehearsal database only. |
| `STG-003` | Private TLS Redis/broker endpoint, auth secret, persistence/HA, isolated queue names | Interrupt broker and one worker during synthetic durable payroll jobs; verify outbox, stale recovery, bounded retries, queue drain and no duplicate effect. | No lost/duplicate financial effect; persistent truthful job state; workers restart; queue/connection metrics healthy. | Infrastructure + Payroll Engineering. Restore endpoint and drain only isolated queues. |
| `STG-004`, `DDG-F-004`, `DDG-F-024` | Private encrypted document/payroll buckets or prefixes, KMS refs, scanner/quarantine, signed-URL lifetime, access logs, backup | Upload clean/malicious fixtures; test direct-key, cross-tenant and unauthorized denial; signed expiry/revoke; scanner outage; object restore. | No public listing/read; malicious object never accessible; revocation blocks API and storage; logs prove actor/tenant/object; restore succeeds. | Security + Privacy + Infrastructure. Disable upload/sharing and delete synthetic objects only. |
| `STG-006` | Central log/metric destination, redaction rules, alert routes, retention, named responders | Trigger synthetic auth denial, payroll-job failure, stale worker, provider failure, storage denial and stale backup; execute incident drill. | Searchable actor/tenant/action/outcome; no secrets/PII leakage; alerts reach named owner within approved SLO. | SRE + Security. Remove synthetic events/rules only. |
| `STG-007` | Private registry digests, deployment strategy, health probes, migration and rollback runbooks | Deploy candidate with preflight; rehearse controlled/rolling deployment and prior-digest rollback; record health window and migration compatibility. | Exact digests deployed; no data loss; health gates pass; rollback restores service within approved window. | Platform Engineering. Execute rehearsed prior-digest rollback. |
| `STG-008`, `DDG-F-031` | Isolated CPU/RAM, production-like PostgreSQL/Redis, k6 runner, `pg_stat_statements` | Capture idle baseline; run 25 VUs then two 50-VU samples; collect endpoint p50/p95/p99, errors, query plans, locks, CPU/RAM, Redis/Celery and restarts. | 5xx below 0.1%, no integrity/security failure, and fixed p95 below 1,500 ms; otherwise enforce the measured lower cap. | Infrastructure + Performance + DB Operations. Stop escalation at threshold breach. |

## Provider And Integration

| Gate | Prerequisites | Required evidence | PASS criteria |
|---|---|---|---|
| `STG-005`, `DDG-F-012` | Finance/payment sandbox URL, account, signing keys, callback allowlist and approved status mapping | Employee instruction IDs; signed normal, duplicate, out-of-order, rejected and retry callbacks; PostgreSQL payment/outstanding/reissue ledger; finance totals; Celery retry logs. | No premature Paid state; one effect per event; employee/run/batch/provider/finance identity reconciles exactly. |
| `DDG-F-026` | Approved external onboarding dependencies and sandbox credentials | Browser launch; injected external failure; refresh/resume; API and PostgreSQL tenant/role/seed counts; provider logs. | Exactly one tenant and seed graph; retry resumes without duplicate identity or entitlement. |
| Email notifications | SMTP sandbox, sender domain, secret refs and non-customer recipients | Delivery, bounce/failure, Retry, duplicate suppression and redacted logs. | Truthful state and no production/customer delivery. |

## Application Preflight

Run against the candidate configuration before exposing staging users:

```bash
python3 ops/staging/validate_staging_config.py --env-file /run/secrets/hrms-staging.env
docker compose -f ops/staging/docker-compose.staging.yml config --quiet
python backend/manage.py check --deploy
python backend/manage.py production_preflight --strict
python backend/manage.py showmigrations --plan
python backend/manage.py makemigrations --check --dry-run
curl -fsS https://STAGING_HOST/api/v1/health/
```

- [ ] `DEBUG=False`; no wildcard hosts/origins.
- [ ] Secrets are externally injected, unique and absent from logs/images/source.
- [ ] Database and broker use private encrypted connections.
- [ ] Backend, web, worker and beat use approved immutable digests.
- [ ] Health checks include application, database, broker and worker readiness.
- [ ] Irreversible erasure remains disabled until separately approved.
- [ ] Unsupported pilot features are absent from UI and rejected by direct API.

## Focused Functional Evidence

Do not rerun the complete 963 tests. Execute delta-focused browser/API/PostgreSQL/Celery coverage:

- [ ] Login/session expiry, tenant isolation, RBAC and support revocation.
- [ ] Employee lifecycle for the explicitly supported same-entity/no-rehire cohort.
- [ ] Leave ledger, attendance close and immutable payroll input snapshots.
- [ ] Payroll calculate, approve, publish and artifact access using approved synthetic statutory configuration.
- [ ] Report CSV/manifest/checksum/audit and stale-download cancellation.
- [ ] Enabled import fingerprints, duplicate behavior and documented atomic/partial outcome.
- [ ] Payroll job refresh/reconnect, stale-worker recovery and duplicate dispatch.
- [ ] Protected document/payroll artifact access and storage-level denial.
- [ ] Backup restore and deployment rollback reconciliation.

Every run must record candidate digest, tenant ID, persona, route/API, persisted IDs, timestamps, result, evidence path and cleanup result.

## Synthetic/Shadow Pilot Exit

Synthetic/shadow execution may begin only when:

- [ ] `STG-001`, `STG-002`, `STG-003`, `STG-006`, and `STG-007` pass.
- [ ] `STG-004` passes or every upload/artifact-sharing path is demonstrably disabled.
- [ ] `STG-005` is excluded and no real provider transaction is possible.
- [ ] Capacity is capped at the lower verified level until `STG-008` passes.
- [ ] All enabled imports/reports satisfy their restricted certified scope.
- [ ] Synthetic tenant, object, queue and database cleanup is independently verified.
- [ ] Security and Release Lead approve the retained exclusions and residual risk.

## Real-Payroll GO/NO-GO

All boxes below are mandatory for the selected real-data cohort:

- [ ] Applicable statutory components have approved effective-dated specifications and independent expected-value reconciliation (`DDG-F-010`).
- [ ] Joiner/leaver, retro, FnF, transfer, rehire and overtime are either approved/verified or technically excluded from the cohort.
- [ ] Employee-level payment instructions, outstanding balances, rejection/reissue and finance reconciliation pass (`DDG-F-012`, `STG-005`).
- [ ] Protected storage, signed access, retention/legal hold and backup disposition are approved and deployed (`DDG-F-004`, `024`, `028`, `032`, `STG-004`).
- [ ] Legacy records are deterministically classified, permanently excepted, or absent from the pilot (`DDG-F-029`).
- [ ] TLS, backup/restore, broker recovery, monitoring and deployment rollback pass (`STG-001`–`003`, `006`, `007`).
- [ ] Staging capacity passes or an enforced concurrency/volume cap is approved (`DDG-F-031`, `STG-008`).
- [ ] Security, Payroll, Finance, Tax/Legal, Privacy, Database Operations, SRE and Release Lead sign the exact gate register.

Any unchecked item is **NO-GO** for real payroll. This checklist authorizes neither staging deployment nor production release.
