# HRMS/Payroll Staging Deployment Readiness and Infrastructure Handoff

Date: 2026-10-18  
Scope: preparation only; nothing was deployed or purchased  
Decision: **NO-GO for staging execution today; CONDITIONAL GO after the entry criteria below are approved and supplied**

## Reconciled external gates

The frozen 40-gate register remains **4 Verified, 15 Partial, 21 Blocked**. Fourteen gates are primarily external:

| Gate | Priority | Current | External closure evidence |
|---|---:|---|---|
| `DDG-F-004` | P1 | Partial | Private document storage, quarantine/scanner, retention and failure evidence |
| `DDG-F-009` | P1 | Partial | Approved biometric contract plus durable source identity and crash/replay |
| `DDG-F-012` | P0 | Partial | Payment sandbox contract, employee instructions, outstanding/reissue ledger |
| `DDG-F-024` | P1 | Partial | Approved signed lifetime and object-store revoke/access logs |
| `DDG-F-026` | P1 | Partial | External provisioning failure/resume reconciliation |
| `DDG-F-031` | P2 | Blocked | Multi-year query plans, locks and resource evidence |
| `STG-001` | P0 | Blocked | Deployed TLS, proxy, cookies, CSRF, HSTS, host checks and scan |
| `STG-002` | P0 | Blocked | Encrypted off-host backup/PITR and timed RPO/RTO restore |
| `STG-003` | P0 | Blocked | Private persistent broker interruption/recovery |
| `STG-004` | P0 | Blocked | Private encrypted object storage, scanner, signed access and restore |
| `STG-005` | P0 | Blocked | Email and finance/payment sandboxes with signed callbacks and reconciliation |
| `STG-006` | P1 | Blocked | Central logs/metrics/alerts, named responders and incident drill |
| `STG-007` | P0 | Blocked | Digest-pinned deployment and rollback rehearsal |
| `STG-008` | P1 | Blocked | Comparable 25/50-VU runs against the fixed 1,500 ms p95 target |

Additional frozen gates that depend on those external controls are `DDG-F-015`, `DDG-F-020`, `DDG-F-021`, `DDG-F-023`, `DDG-F-027`, `DDG-F-028`, `DDG-F-029`, and `DDG-F-032`. Their policy or implementation status does not change merely by creating staging.

## Repository readiness

The staging Compose is an application workload definition, not a complete infrastructure stack. It correctly:

- requires backend and web images by digest;
- keeps app ports private with `expose`;
- runs production settings with demo data disabled;
- uses the same backend digest for API, Celery worker and beat;
- provides an application health check and a private Docker network.

It intentionally does **not** provision PostgreSQL, Redis, TLS certificates, object storage, secrets, central telemetry or backups. The proxy template expects Docker DNS names and therefore needs either a proxy container attached to `hrms-staging-private`, or replacement by an approved managed load balancer/service-discovery design. The legacy EC2 HTTP/media nginx configuration must not be used.

The checked-in image references are syntactically digest-shaped placeholders, not built artifacts. LC handoff tightened `validate_staging_config.py` so `registry.invalid`, `replace-with-*`, `secret-ref`, and nested placeholder JSON now fail closed. The example environment produces **13 expected failures**. Configuration tests: **4 passed**.

## Target architecture

Recommended gate-closing staging architecture in one region and at least two availability zones:

1. Public DNS and managed certificate terminate TLS 1.2/1.3 at a managed load balancer/WAF, or at a dedicated proxy container if explicitly approved.
2. Two private application instances/tasks run the digest-pinned web and backend images. No backend, database, Redis or object-store administrative endpoint is public.
3. Two Celery workers use isolated `hrms-staging-*` queues; one beat scheduler runs with singleton ownership. Payroll/provider queues remain separate from notification and import queues.
4. Managed PostgreSQL 16 uses private subnets, TLS verification, encryption at rest, automated backups/PITR, `pg_stat_statements`, and an isolated restore target.
5. Managed Redis/Valkey uses private subnets, TLS/auth, persistence and Multi-AZ/failover where supported. Staging must not share production or another product's broker database/queues.
6. Separate private object prefixes or buckets hold employee documents, payroll artifacts, quarantine, and encrypted backups. Apply KMS encryption, block-public-access, versioning, access logs, lifecycle policy and scanner events.
7. Secret Manager/Parameter Store injects runtime secrets. Images, Git, Compose files and CI logs contain references only.
8. Central logs, metrics and traces ingest application, proxy, database, Redis, Celery, object access and audit signals. Alert routes have named owners.

Initial dedicated sizing:

- application: two instances/tasks, each **4 vCPU / 8 GB RAM**;
- Celery: two workers, each **2–4 vCPU / 4–8 GB RAM**, concurrency fixed before benchmarking;
- PostgreSQL: **4 vCPU / 16 GB RAM**, 100 GB encrypted SSD to begin, connection monitoring enabled;
- Redis/Valkey: primary plus replica, at least **2 GB usable memory**;
- object/backup storage: start with 100 GB logical budget and lifecycle to colder storage;
- load generator: separate **4 vCPU / 8 GB** temporary host so it does not contaminate application metrics.

## Environment and secrets checklist

- Image digests: backend, web and approved proxy/sidecars; registry immutable-tag and vulnerability-scan evidence.
- Django: unique 50+ character secret, exact host, HTTPS CSRF origin, secure cookies, SSL redirect, one-year HSTS, forwarded-host/proto trust limited to the proxy.
- Database: TLS `verify-full` URL, app and migration identities separated where possible, CA bundle, pool ceiling, backup role.
- Broker: `rediss://`, CA/auth, staging-only queues, durable declaration and failover endpoint.
- Storage: bucket/prefix names, region, KMS keys, least-privilege roles, scanner/quarantine references, signed-access lifetime, payroll policy map.
- Providers: SMTP sandbox credentials; finance sandbox endpoint, signing secrets, callback allow-list and replay window. No live payment credential.
- Observability: OpenTelemetry/log destination, redaction rules, Alertmanager route, incident owner, retention periods.
- Backup: age/KMS recipient, off-host destination, retention, RPO/RTO approvals and restore role.
- Safety: `HRMS_ENABLE_DEMO_DATA=false`, `HRMS_DATA_ERASURE_EXECUTION_ENABLED=false`, no Northstar/customer records.

## Build provenance

Build once in CI from an annotated commit, run checks, generate an SBOM, sign images, then deploy exact digests:

```bash
git fetch --tags origin
git verify-commit "$RELEASE_COMMIT"
docker buildx build --platform linux/amd64 -f backend/Dockerfile \
  -t "$REGISTRY/hrms-backend:$RELEASE_COMMIT" --push .
docker buildx build --platform linux/amd64 -f web/Dockerfile \
  -t "$REGISTRY/hrms-web:$RELEASE_COMMIT" --push .
docker buildx imagetools inspect "$REGISTRY/hrms-backend:$RELEASE_COMMIT"
docker buildx imagetools inspect "$REGISTRY/hrms-web:$RELEASE_COMMIT"
syft "$BACKEND_DIGEST" -o cyclonedx-json > backend-sbom.json
syft "$WEB_DIGEST" -o cyclonedx-json > web-sbom.json
cosign sign "$BACKEND_DIGEST"
cosign sign "$WEB_DIGEST"
```

Store commit, builder identity, digests, signatures, SBOM checksums, test report and migration plan as one release manifest. Availability of `syft`/`cosign` and the signing authority is an infrastructure prerequisite, not locally certified here.

## Deployment commands

These are handoff commands, not commands executed during this phase:

```bash
export HRMS_STAGING_ENV_FILE=/run/secrets/hrms-staging.env
python3 ops/staging/validate_staging_config.py \
  --env-file "$HRMS_STAGING_ENV_FILE" --json | tee preflight.json
docker compose --env-file "$HRMS_STAGING_ENV_FILE" \
  -f ops/staging/docker-compose.staging.yml config --quiet

# Pull and verify the exact release manifest before any migration.
docker pull "$HRMS_BACKEND_IMAGE"
docker pull "$HRMS_WEB_IMAGE"
docker image inspect "$HRMS_BACKEND_IMAGE" --format '{{json .RepoDigests}}'
docker image inspect "$HRMS_WEB_IMAGE" --format '{{json .RepoDigests}}'

# Backup/PITR checkpoint, migration compatibility, then one controlled migrator.
DATABASE_URL="$DATABASE_URL" bash ops/backup_postgres.sh
docker run --rm --env-file "$HRMS_STAGING_ENV_FILE" "$HRMS_BACKEND_IMAGE" \
  python manage.py production_preflight --json --strict
docker run --rm --env-file "$HRMS_STAGING_ENV_FILE" "$HRMS_BACKEND_IMAGE" \
  python manage.py migrate --plan
docker run --rm --env-file "$HRMS_STAGING_ENV_FILE" "$HRMS_BACKEND_IMAGE" \
  python manage.py migrate --noinput

docker compose --env-file "$HRMS_STAGING_ENV_FILE" \
  -f ops/staging/docker-compose.staging.yml up -d --no-build
curl --fail --show-error --location "https://$HRMS_STAGING_HOST/api/v1/health/"
bash scripts/hrms-post-deploy-smoke.sh
```

Do not put a plaintext dump in durable storage. The current `backup_postgres.sh` creates a checksum-protected custom dump; the infrastructure runbook must immediately encrypt it with approved age/KMS tooling before off-host upload, or use managed encrypted snapshots/PITR. A raw local dump is not `STG-002` evidence.

## Rollback and recovery

1. Stop promotion when preflight, migration, health, or smoke fails.
2. Keep the previous application digest running until the new tasks are healthy.
3. Roll application tasks back to the prior digest; do not automatically reverse a non-reversible schema migration.
4. Use expansion/contraction migrations so old and new code can coexist during a rolling deployment.
5. For a destructive migration failure, isolate writes and execute the separately approved database restore/PITR runbook into a new database, reconcile checksums, then switch endpoints.
6. Revoke the failed release's secrets and retain immutable logs, timings and digests.

The existing EC2 `rollback.sh` changes a source release symlink and restarts services. It does not prove digest rollback, database rollback, zero-downtime coexistence or managed-service recovery and therefore cannot alone close `STG-007`.

## Synthetic identities

Provision one disposable Enterprise tenant using the supported workspace lifecycle, with unique staging-only addresses and no deliverable email domain:

```bash
docker run --rm --env-file "$HRMS_STAGING_ENV_FILE" "$HRMS_BACKEND_IMAGE" \
  python manage.py manage_playwright_workspace --seed-ref staging-cert-YYYYMMDD \
  --output-file /evidence/staging-identities.json
```

Required personas: Platform Admin, Tenant Admin, HR Admin maker/checker, ESS employee, MSS Manager A/B and Finance Manager where enabled. Rotate generated passwords into the staging secret manager, enforce MFA where supported, record tenant/employee/membership IDs, and use `--cleanup` after certification. Platform-only and tenant identities must remain separate.

## Gate-to-test order

1. `STG-001`, `DDG-F-027`: TLS scan, redirect, cookies, bad host/origin, proxy spoofing and immediate support-session revocation with central audit.
2. `STG-002`, `DDG-F-029`, `DDG-F-032`: encrypted backup, timed isolated restore, forward/rollback/reapply rehearsal, counts/checksums and ambiguous-history non-mutation.
3. `STG-003`, `DDG-F-009`, `DDG-F-020`, `DDG-F-023`: broker/worker interruption, outbox recovery, bounded retry and no duplicate effects. Unsupported background imports remain disabled.
4. `STG-004`, `DDG-F-004`, `DDG-F-024`, `DDG-F-028`: clean/malicious upload, quarantine, direct-key/cross-tenant denial, signed expiry/revoke, legal hold and object restore. Erasure remains disabled.
5. `STG-006`: emit auth denial, payroll failure, stale worker, provider failure and stale-backup signals; verify routed alerts and run incident drill.
6. `STG-007`, `DDG-F-026`: deploy prior/candidate digests, restart one unit at a time, verify job recovery and rehearse rollback.
7. `STG-005`, `DDG-F-012`: SMTP sandbox and finance-provider sandbox success/failure, signature, duplicate/out-of-order callback, retry and exact PostgreSQL/finance reconciliation. Never send real payment.
8. `DDG-F-031`, `STG-008`, `DDG-F-021`: fixed data volume, `pg_stat_statements`/locks, report completeness, then 2/10/25 VUs and two isolated 50-VU runs. Fixed thresholds: 5xx below 0.1%, no integrity/security failure, and p95 below 1,500 ms. Stop escalation on breach.

## Cost estimate

Planning range in USD/month, on-demand, before tax and material data transfer. Recalculate in the selected region with the cloud provider's calculator before approval.

| Option | Monthly estimate | Certification use |
|---|---:|---|
| Lean synthetic single-host, managed backup/object storage | **$400–$800** | Functional smoke only; no HA, broker-failover, rolling-restart or uncontaminated 50-VU certification |
| Recommended dedicated staging with two app nodes/tasks, managed PostgreSQL, Redis primary/replica, load balancer, object storage and baseline monitoring | **$900–$1,800** | Suitable starting point for the external gate plan; scanner, log ingestion and NAT traffic may increase cost |
| Higher-isolation staging with Multi-AZ database, expanded telemetry retention and separate load generator | **$1,500–$3,000** | Preferred for real-payroll pilot rehearsal and recovery evidence |
| Shared host with Finacc, GST and Edutech | **$150–$500 incremental** | Not acceptable for `STG-008` or recovery certification unless hard resource isolation and separate managed data services are proven |

Cost controls: schedule synthetic staging off-hours after evidence windows, use short log retention initially, lifecycle old artifacts/backups, and use temporary load-generator capacity. Do not share PostgreSQL schemas, Redis queues, object prefixes, secrets or KMS keys across products. If application containers share a host, reserve CPU/memory with cgroups, isolate disks/IOPS and measure host contention; a contaminated run cannot close capacity gates.

Pricing basis: current on-demand service pricing remains region and usage dependent. Recalculate from the official AWS [EC2](https://aws.amazon.com/ec2/pricing/on-demand/), [RDS for PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/), [ElastiCache](https://aws.amazon.com/elasticache/pricing/), [S3](https://aws.amazon.com/s3/pricing/), and [Pricing Calculator](https://calculator.aws/) pages with the approved region, availability model, storage, log ingestion and egress assumptions. The ranges above are budgeting estimates, not quotes.

## Entry decision

**NO-GO for executing a staging deployment today** because no approved domain/certificate, real image digests, private database/broker, protected storage/scanner, secret bundle, backup destination, observability route, provider sandbox credentials, cost authorization or deployment target was supplied.

**CONDITIONAL GO to schedule synthetic staging** when Infrastructure and Security approve the architecture and budget, all 23 staging-contract checks pass with secret-manager values, images are signed and digest-pinned, backup/rollback owners accept the runbooks, and only synthetic data is authorized. Real-payroll staging and production remain **NO-GO** until their mandatory policy, statutory, provider, retention and external evidence gates close.
