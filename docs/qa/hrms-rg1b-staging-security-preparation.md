# HRMS/Payroll RG-1B Staging Security Preparation

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Production readiness: **NO-GO**

## Reconciliation

The 12 frozen RG-1 gates remain unchanged. The RG-1A phrase “one Not Started” refers to `DDG-F-004`; the master tracker already labelled its underlying product state `Partial`. RG-1B resolves that wording without promoting the gate: local file validation/versioning exists, but malware quarantine and protected external storage do not.

| Gate | RG-1B status | Dependency / result |
|---|---|---|
| `DDG-F-004` | Partial, prepared | Fail-closed staging contract rejects local document storage and missing scanner configuration. Actual scanning/quarantine is not implemented or deployed; uploads remain excluded. |
| `DDG-F-024` | Partial | RG-1A grant revocation remains verified locally. Direct object-store denial/log evidence and signed-access lifetime approval require `STG-004`. |
| `DDG-F-027` | Verified locally | RG-1A session revocation remains verified. Real TLS and centralized security logs remain staging evidence, not a reopened application defect. |
| `DDG-F-028` | Blocked | Irreversible erasure is required to remain disabled. Jurisdiction retention, legal-hold, backup-disposition, and erasure policy need Legal/Privacy approval. |
| `DDG-F-029` | Blocked | Data owners must approve deterministic legacy classification. No historical row was changed. |
| `DDG-F-032` | Blocked | Local checksum restore passed; encrypted off-host archive/restore plus hold enforcement require `STG-002`, `STG-004`, and policy approval. |
| `STG-001` | Prepared / externally blocked | HTTPS redirect/HSTS/private-media proxy template and secure setting checks exist. A real domain, certificate, proxy, browser capture, and scan are absent. |
| `STG-002` | Prepared / externally blocked | PostgreSQL 16 logical restore passed locally. Managed encrypted backups and approved RPO/RTO drill are absent. |
| `STG-003` | Prepared / externally blocked | Staging contract requires `rediss://` and managed-persistent broker declaration. Interruption/recovery evidence is absent. |
| `STG-004` | Prepared / externally blocked | Contract requires non-local document storage, scanner reference, strict payroll storage controls, and secret-backed policies. Provider evidence is absent. |
| `STG-006` | Prepared / externally blocked | Existing alert rules plus required central log destination, alert route, and named owner are defined. No deployed dashboard, alert routing, retention, or incident drill exists. |
| `STG-007` | Prepared / externally blocked | Digest-pinned, private-network staging Compose template exists. Rolling/blue-green deployment and rollback have not been rehearsed. |

Totals: **1 Verified locally, 2 Partial, 9 Blocked externally/policy**. “Prepared” is not a PASS status.

## Local changes

- `ops/staging/validate_staging_config.py`: machine-readable fail-closed contract for images, Django/TLS settings, database/broker transport, protected storage, backup, observability, and deployment strategy.
- `ops/staging/staging.env.example`: non-secret key inventory. Placeholder values intentionally fail validation.
- `ops/staging/docker-compose.staging.yml`: digest-pinned backend/web images, no host-published app/database/broker ports, production settings, worker and beat services.
- `ops/staging/nginx.conf.template`: HTTP-to-HTTPS redirect, TLS 1.2/1.3, one-year HSTS, proxy headers, and denial of direct `/media/` access.
- `backend/tests/test_staging_configuration.py`: complete-contract and unsafe-value fail-closed tests.

The existing development/production Compose and EC2 files were not silently converted into staging definitions. No secret, domain, infrastructure, or application business rule was invented.

## Staging architecture

Use registry-built images pinned by digest. Only the TLS reverse proxy/load balancer is public. Backend and Next.js stay on a private service network; PostgreSQL and Redis are managed/private and must not expose public endpoints. Celery worker and beat use the same backend image digest. Employee documents and payroll artifacts use separate private object prefixes/buckets, encryption keys, short-lived signed access, scanner quarantine, access logs, and versioning/retention controls. Secrets come from the platform secret manager and must never be baked into images or env files in source control.

The current EC2 nginx file is not staging-certifiable because it serves HTTP and `/media/` directly. Use the staging TLS template or an equivalent managed load-balancer configuration; do not install the legacy file unchanged.

## External execution plan

| Gates | Required staging action and validation | PASS criteria | Rollback / owner |
|---|---|---|---|
| `STG-001`, `DDG-F-027` | Security provisions domain/cert; Platform deploys proxy. Run `curl -I http://HOST`, `curl -I https://HOST`, browser cookie/CSRF/host tests, TLS scanner, and support-session revoke race. | HTTP redirects; valid chain/TLS 1.2+; HSTS and secure cookies; invalid host/origin denied; revoked scope immediately denied and centrally logged. | Remove route/cert binding and restore previous proxy config. Owners: Infrastructure + Security. |
| `STG-002`, `DDG-F-029`, `DDG-F-032` | Database Ops enables encrypted automated snapshots/PITR and off-host copy. Execute timed restore into isolated DB, migration forward/rollback/reapply, row-count/checksum reconciliation. | Approved RPO/RTO met with exact reconciliation; ambiguous legacy data remains untouched; evidence retained. | Destroy rehearsal DB only; retain evidence and original backups. Owners: Database Ops + data owners. |
| `STG-003` | Provision private TLS managed Redis/broker with persistence/HA. Interrupt broker and a worker during durable payroll jobs; observe outbox/stale recovery and duplicate prevention. | No lost/duplicate financial effects; bounded retry; queue drains; worker restart visible; auth/network boundaries enforced. | Restore previous broker endpoint and drain isolated queues. Owners: Infrastructure + Payroll Engineering. |
| `STG-004`, `DDG-F-004`, `DDG-F-024` | Security approves region/lifetime/scanner. Provision private encrypted object storage, quarantine and access logs. Test clean/malicious uploads, signed expiry/revoke, cross-tenant denial, direct-key denial, backup/restore. | Malicious objects never become accessible; no public listing/read; revocation blocks API and storage access; tenant/role checks and logs prove ownership; restore succeeds. | Disable uploads/sharing, revoke grants/keys, delete only synthetic objects. Owners: Security + Privacy + Infrastructure. |
| `STG-006` | Deploy central logs/metrics/traces and Alertmanager routing. Trigger synthetic auth denial, payroll-job failure, stale worker, provider failure, and stale backup evidence. | Named owner receives alerts within approved SLO; actor/tenant/action/outcome are searchable; retention and redaction approved; incident drill recorded. | Disable synthetic alert rules and remove synthetic events only. Owners: SRE + Security. |
| `STG-007` | Deploy one digest-pinned candidate with migration preflight, health gates and rolling/blue-green strategy; rehearse application rollback and compatible schema rollback. | No failed health window or data loss; old/new versions coexist where required; rollback restores service; exact digests and timings recorded. | Execute rehearsed prior-digest rollback; database restore only under approved runbook. Owner: Platform Engineering. |
| `DDG-F-028` | Legal/Privacy approve retention, legal-hold, backup disposition and erasure policy; then execute synthetic maker/checker preview and recovery tests. | Holds and in-window records cannot erase; preview equals execution; retries are idempotent; minimal audit retains no prohibited personal data. | Keep `HRMS_DATA_ERASURE_EXECUTION_ENABLED=false` until approval and sign-off. Owners: Legal + Privacy + Security. |

Before any staging deploy, run:

```bash
python3 ops/staging/validate_staging_config.py --env-file /run/secrets/hrms-staging.env
docker compose -f ops/staging/docker-compose.staging.yml config --quiet
python backend/manage.py check --deploy
python backend/manage.py production_preflight --strict
python backend/manage.py migrate --check
```

Do not use `ops/ec2/apply_stage_contract_env.sh` as external-provider proof: its values are explicitly contract-only.

## Resource recommendation

Based on Phase 5F, start staging with managed PostgreSQL at approximately **4 vCPU and 8–16 GB RAM**, private managed Redis with persistence/HA sized at **at least 2 GB**, separate web/API and Celery capacity, and **two worker instances** for recovery testing. Keep the verified local workload limit at **25 VUs**; 50 VUs did not consistently meet the 1,500 ms p95 target. Final sizing requires staging measurements and cost approval.

## Verification result

- Staging-contract tests: **3 passed**.
- Digest-pinned Compose render: **passed**.
- Unsafe Django production configuration: **rejected as expected**.
- Complete synthetic Django deploy check: **passed** with existing OpenAPI warnings.
- Strict static production preflight: **22/22 gates passed, 0 blockers** with network probes skipped and contract-only provider references; this is configuration validation, not provider certification.
- Migration drift: **none**.
- PostgreSQL backup/restore rehearsal: **passed**, exact probe value restored; temporary container removed.
- Production backend Docker build: **passed**; temporary image removed.
- TypeScript, ESLint, production frontend build: **passed**; one existing CSS autoprefixer warning.

Evidence: `docs/qa/evidence/rg1b-2026-10-18/001-rg1b-local-preparation-evidence.md`.

## Decision

RG-1B is **CONDITIONAL**. Local staging preparation is materially stronger and fail-closed, but no external gate has been promoted to PASS. Entry to a synthetic staging deployment is acceptable only after infrastructure/security approve the architecture, inject real secrets, and satisfy the pre-deploy validator. Real-payroll production readiness remains **NO-GO**.
