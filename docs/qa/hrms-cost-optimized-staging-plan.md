# HRMS/Payroll Cost-Optimized Two-Tier Staging Plan

Date: 2026-10-18

Scope: architecture and cost planning only; no AWS resources were provisioned or changed

Data classification: synthetic HRMS/Payroll data only

Release position: production payroll remains **NO-GO**

## Executive recommendation

Use two deliberately different environments:

1. **Tier A - Shared Functional Staging:** one small, continuously available or scheduled host for Finacc, GST, HRMS/Payroll and Edutech. Each product gets isolated containers, databases/roles, Redis namespaces/queues, secrets, storage prefixes or buckets, logs and DNS names. Tier A proves HTTPS, browser/API behavior, migrations, email, protected object access and routine integrations. It is not capacity or failover evidence.
2. **Tier B - Ephemeral Capacity Certification:** a dedicated HRMS-only, two-AZ environment created from infrastructure as code for a 72-hour evidence window. It uses managed PostgreSQL and Valkey/Redis, two application nodes, separate workers and an independent load generator. It proves 25/50-VU behavior, payroll volume, rolling restart, backup restore and failover without contamination from the other products.

The preferred starting model is a shared **32 GB Lightsail Tier A** with a contingency-inclusive budget of about **INR 23,000-26,000/month total** (about **INR 5,700-6,500 per product** when allocated equally), plus **INR 18,000-32,000 per Tier B 72-hour certification cycle**. If Tier A is only needed for about 260 hours/month, replace Lightsail with a scheduled EC2 host and target **INR 10,000-16,000/month total**.

Tier B must not remain running between certification windows. Its database snapshots, evidence and immutable release manifest may remain; compute, load balancer, NAT and cache should be destroyed.

## Cost assumptions

These are planning estimates, not AWS quotations:

- Region: `ap-south-1` (Mumbai), subject to data-residency approval.
- Exchange rate: **INR 90 per USD** for budgeting.
- Month: **730 hours**.
- Tier A persistent option: 730 hours/month.
- Tier A scheduled option: 12 hours/day, 5 days/week, about **260 hours/month**.
- Tier B: **72 hours/cycle**, comprising 12 hours provision/warm-up, 48 hours execution and 12 hours contingency.
- Estimates exclude GST, material internet egress, premium support and unusually high log/scanner volume.
- Unit rates for EC2, RDS, Valkey/Redis and telemetry below are conservative planning rates. Reprice them in the AWS Pricing Calculator immediately before approval.

AWS currently lists Linux Lightsail public-IPv4 bundles at USD 44/month for 2 vCPU/8 GB, USD 84/month for 4 vCPU/16 GB and USD 164/month for 8 vCPU/32 GB. A Lightsail load balancer is USD 18/month; block storage and snapshots are separately billed. RDS and ElastiCache are billed by provisioned instance/node time, and a stopped RDS instance automatically restarts after seven days, so RDS stop/start is not a durable cost-control strategy.

## Shared isolation standard

Sharing Tier A reduces cost but does not permit sharing security or data boundaries:

- Four separate product Compose projects and Docker networks; only the reverse proxy is ingress-facing.
- Hard cgroup CPU/memory limits and health checks per product.
- Separate PostgreSQL databases and least-privilege roles; no shared application schema or migration identity.
- Separate Redis credentials, queue prefixes and Celery routing keys. Payroll/provider queues are not shared with imports or notifications.
- Separate secret paths, encryption context, object prefixes or preferably buckets, KMS grants and access logs.
- Separate DNS names, cookie names/domains, CSRF origins, audit streams and synthetic identities.
- No Northstar, staging customer, production or copied customer data.
- Tier A contention or another product's failure invalidates performance and recovery evidence. Such evidence belongs in Tier B.

## Tier A - Functional staging

### Recommended persistent topology

| Component | Exact starting size | Requirement | Notes |
|---|---|---|---|
| Shared application host | Lightsail Linux, **8 vCPU / 32 GB / 640 GB**, USD 164/month | Mandatory | Four product stacks; reserve HRMS 2 vCPU and 6-8 GB. Do not overcommit memory. |
| TLS ingress | Lightsail load balancer, USD 18/month, managed certificate; or approved Nginx/ACME equivalent | Mandatory | One HTTPS hostname per product; HTTP redirects to HTTPS. |
| HRMS web/API | Digest-pinned web and backend containers; web 0.5 vCPU/1 GB, API 1 vCPU/2 GB | Mandatory | Use the existing staging Compose and validator contracts. |
| HRMS workers | Celery worker 0.5 vCPU/1.5 GB, concurrency 2; beat singleton 0.25 vCPU/256 MB | Mandatory | Separate queues and durable outbox state. |
| Functional database | PostgreSQL 16 container, HRMS allocation 1.5 vCPU/3 GB, encrypted attached disk | Mandatory for low-cost Tier A | Separate DB/role per product. Not HA and not valid for managed failover certification. |
| Functional broker | Redis/Valkey container, HRMS allocation 0.25 vCPU/512 MB, AOF persistence | Mandatory for low-cost Tier A | Separate credentials/queues. Not valid for managed-broker failover certification. |
| Protected artifacts | Private S3 bucket or product-isolated bucket/prefix, SSE-KMS, public access blocked, versioning and access logs | Mandatory | Documents, payslips, exports and quarantine remain private. Scanner integration is required before uploads are enabled. |
| Backups | Encrypted nightly `pg_dump` plus weekly disk snapshot copied off host | Mandatory | Restore into an isolated target monthly. This is functional recovery, not approved PITR/RPO evidence. |
| Email | Amazon SES sandbox or approved test mailbox | Mandatory for email checks | No customer recipients. |
| Monitoring | CloudWatch agent/logs, host/container metrics, health alarms and named notification route | Mandatory | Start with 14-day application log retention and retain certification evidence separately. |
| Secrets | SSM Parameter Store SecureString or Secrets Manager | Mandatory | Never store values in Compose, Git, shell history or CI logs. |
| WAF, managed RDS, managed Valkey, GuardDuty/Security Hub | Service dependent | Optional in Tier A | Useful, but Tier B supplies the managed-service evidence. |

### Tier A resource policy

- Cap each product at 2 vCPU and 6 GB initially; keep at least 6 GB host reserve for PostgreSQL, Redis, proxy and operating system.
- Run only synthetic fixtures. Large 2,500-employee payroll or 50-VU runs are prohibited on the shared host.
- Schedule expensive background suites so only one product performs a heavy job at a time.
- If sustained memory exceeds 80%, swap is used, or another product causes repeated latency contamination, move that product to a separate scheduled EC2 host. Do not hide contention by weakening thresholds.

### Tier A monthly estimate

Persistent shared Lightsail:

| Item | USD/month | INR/month |
|---|---:|---:|
| 32 GB Lightsail host | 164 | 14,760 |
| Lightsail load balancer | 18 | 1,620 |
| Host snapshots, estimated 320 GB retained | 16 | 1,440 |
| S3/KMS/backup storage, initial synthetic volumes | 10-20 | 900-1,800 |
| CloudWatch logs/metrics/alarms | 10-25 | 900-2,250 |
| SES, DNS and low data transfer | 3-8 | 270-720 |
| **Estimated total** | **221-251** | **19,890-22,590** |
| 15% operating contingency | 33-38 | 2,970-3,420 |
| **Budget envelope** | **254-289** | **22,860-26,010** |

At equal allocation, HRMS accounts for approximately **INR 5,715-6,503/month**. Allocate by measured CPU, memory, storage and log use after the first month rather than permanently assuming 25%.

Scheduled EC2 alternative for 260 hours/month:

| Item | Planning assumption | INR/month |
|---|---|---:|
| `m7g.xlarge`, 4 vCPU/16 GB | USD 0.22/hour x 260 | 5,148 |
| 150 GB gp3 EBS | USD 0.096/GB-month | 1,296 |
| ALB and LCU allowance | USD 25-35/month | 2,250-3,150 |
| IPv4, snapshots, S3, logs, DNS, SES | USD 20-45/month | 1,800-4,050 |
| **Budget envelope** |  | **10,494-13,644** |

The 16 GB scheduled host is suitable only when product activity is coordinated. For concurrent daily use by all four products, use `m7g.2xlarge`/equivalent 32 GB or the persistent 32 GB Lightsail plan.

### Tier A gate scope

Tier A can supply deployed evidence for:

- `STG-001`: domain TLS, redirects, HSTS, cookies, CSRF, host/proxy behavior.
- `DDG-F-027`: support-session revocation and deployed security audit.
- `DDG-F-004`, `DDG-F-024`, `STG-004`: only if private S3, scanner/quarantine, signed access, revoke logs and restore are actually configured.
- `STG-005`: SES behavior and functional provider-sandbox calls; no real payment.
- `STG-006`: baseline centralized logs, alerts and health checks.
- `STG-007`: digest deployment and simple rollback; rolling availability and database recovery remain Tier B.
- `DDG-F-021`: ordinary-volume browser report/export correctness.
- Routine migration, browser/API, RBAC, tenant-isolation and integration regression.

Tier A cannot certify uncontaminated capacity, Multi-AZ recovery, managed broker failover, database PITR/RTO or rolling-node availability.

## Tier B - Ephemeral production-equivalent certification

### Dedicated topology

Tier B is HRMS-only and must be created in an isolated VPC from reviewed Terraform or CloudFormation. It must use the same image digests, production settings, worker model, migration sequence, feature flags and validator contract intended for release.

| Component | Exact starting size | Requirement | Notes |
|---|---|---|---|
| VPC | Two public and two private subnets across two AZs | Mandatory | Security groups allow least privilege only. |
| Application | **2 x `m7g.xlarge`**, 4 vCPU/16 GB each | Mandatory | One node per AZ; fixed cgroup limits; on-demand, not Spot. |
| Celery | **2 x `m7g.large`**, 2 vCPU/8 GB each | Mandatory | Separate queues; fixed concurrency recorded before tests. |
| Beat | One singleton task on an app/worker node with durable ownership | Mandatory | Duplicate scheduler protection must be verified. |
| Load generator | **1 x `c7g.xlarge`**, 4 vCPU/8 GB | Mandatory during load windows | Separate subnet/host; destroy after results upload. |
| Ingress | Application Load Balancer, ACM certificate and Route 53 record | Mandatory | TLS 1.2/1.3, health checks and controlled rolling drain. |
| Database | RDS PostgreSQL 16, **`db.m7g.xlarge` 4 vCPU/16 GB, Multi-AZ, 100 GB gp3**, encrypted | Mandatory | PITR, Performance Insights or equivalent, `pg_stat_statements`, private only. |
| Broker | ElastiCache Valkey/Redis, **2 x `cache.t4g.medium`**, primary/replica Multi-AZ, TLS/auth | Mandatory | At least 3 GB/node; persistence/failover configuration retained in evidence. |
| Storage | Dedicated private S3 buckets for artifacts, quarantine, access logs and encrypted backup exports | Mandatory | SSE-KMS, versioning, lifecycle, scanner, signed access and restore test. |
| Secrets | Secrets Manager/SSM with instance roles | Mandatory | Rotation/revocation drill for test credentials. |
| Observability | CloudWatch metrics/logs/alarms plus approved error monitoring | Mandatory | One-minute host/container/DB/cache metrics; Celery queue depth and retries. |
| NAT | One temporary NAT gateway or approved egress proxy plus VPC endpoints | Conditional | Prefer ECR, S3, CloudWatch and Secrets endpoints; record cross-AZ/egress cost. |
| WAF and distributed tracing | Managed WAF and OpenTelemetry/X-Ray | Recommended | Enable when their operational ownership and log retention are approved. |

### Tier B 72-hour cost estimate

| Item | Planning rate and runtime | USD/cycle | INR/cycle |
|---|---|---:|---:|
| Application EC2 | 2 x USD 0.22/hour x 72 | 31.68 | 2,851 |
| Celery EC2 | 2 x USD 0.11/hour x 72 | 15.84 | 1,426 |
| Load generator | USD 0.18/hour x 24 | 4.32 | 389 |
| RDS PostgreSQL Multi-AZ | USD 0.70/hour x 72 | 50.40 | 4,536 |
| RDS storage, backup/PITR and retained snapshot allowance | cycle allocation | 20-35 | 1,800-3,150 |
| Valkey/Redis primary and replica | 2 x USD 0.08/hour x 72 | 11.52 | 1,037 |
| ALB, temporary NAT and VPC endpoint allowance | 72-hour window | 20-40 | 1,800-3,600 |
| S3/KMS/scanner/logging/metrics/data transfer | evidence-dependent | 25-60 | 2,250-5,400 |
| DNS, IPv4 and miscellaneous | cycle allocation | 5-10 | 450-900 |
| **Estimated subtotal** |  | **184-259** | **16,559-23,289** |
| 25% contingency |  | **46-65** | **4,140-5,823** |
| **Budget envelope per cycle** |  | **230-324** | **20,699-29,112** |

Budget **INR 18,000-32,000 per 72-hour cycle** after calculator repricing. A second full cycle in one month approximately doubles the variable Tier B cost. Retained encrypted snapshots and evidence may add **INR 500-2,000/month** after teardown.

### Tier B evidence validity

Capacity results are valid for production planning only when all of these hold:

1. No Finacc, GST, Edutech or unrelated workload shares compute, database, cache or load-generator resources.
2. Target production has equal or greater per-node CPU/RAM, equivalent PostgreSQL/Valkey class and no lower worker count or storage throughput.
3. The exact release digests, environment contract, Gunicorn/Celery settings, dataset, persona mix, think time and k6 scripts are retained.
4. Clock synchronization, one-minute telemetry and database/cache statistics are enabled before warm-up.
5. Run 2 and 10 VU health checks, one 25-VU test, then **two uncontaminated 50-VU tests**. Do not tune resources or thresholds between comparable runs.
6. Fixed acceptance remains p95 below 1,500 ms, 5xx below 0.1%, no authorization/data-integrity failure, no restart/OOM/connection exhaustion and truthful job recovery.
7. Load generation is external to application nodes. Warm-up samples and contaminated runs remain separately labeled.
8. Perform rolling application restart, Redis failover and database restore/recovery exercises outside the timed capacity sample, then rerun integrity checks.

If Tier B fails, report the saturation point and retain the 25-VU limit. Do not resize mid-run or relabel the result.

### Tier B gate scope

Tier B is required for:

- `STG-002`: encrypted off-host backup/PITR and timed restore against approved RPO/RTO.
- `STG-003`: managed broker interruption, failover and Celery recovery.
- `STG-007`: rolling deployment, digest rollback and migration compatibility under redundancy.
- `STG-008`: isolated 25/50-VU measurements and enforced capacity decision.
- `DDG-F-031`: multi-year `EXPLAIN ANALYZE`, `pg_stat_statements`, CPU/memory/lock evidence.
- `DDG-F-009`, `DDG-F-020`, `DDG-F-023`: only after the relevant ingestion/import architecture and policy are approved and implemented.
- `DDG-F-026`: real external provisioning failure/resume when a provider sandbox is available.
- `STG-005`, `DDG-F-012`: finance sandbox callbacks and recovery when an approved provider contract and credentials exist.
- `DDG-F-028`, `DDG-F-029`, `DDG-F-032`: only after legal/data-owner policy approval; infrastructure alone cannot close them.

No status in the frozen gate register changes merely because this architecture exists.

## Hosting-option comparison

| Option | Best use | Cost behavior | Advantages | Limitations / decision |
|---|---|---|---|---|
| Lightsail Docker | Persistent Tier A shared functional environment | Predictable monthly bundle; stopping does not materially reduce the bundle charge | Lowest operational and budgeting overhead; adequate synthetic browser/API use | Single-host failure domain, limited private/managed integration, not valid for capacity/failover certification. **Recommended for persistent Tier A.** |
| EC2 Docker | Scheduled Tier A or app/worker layer in Tier B | Per-second/hour compute; stopped compute is not charged, but EBS/IP/storage remain | Flexible sizing, IAM/VPC integration, cgroups and immutable image reuse | More operations, patching and backup ownership. Self-hosted DB/cache cannot close managed failover gates. **Recommended when Tier A runs <=260 hours/month.** |
| Managed ECS/RDS/ElastiCache/ALB | Tier B and eventual production rehearsal | Higher hourly and telemetry/NAT costs; excellent when ephemeral | Strongest recovery, isolation, observability and production comparability | Excessive as an always-on synthetic environment; RDS stop is limited to seven days. **Recommended only for temporary Tier B or approved real-payroll staging.** |

ECS on EC2 may replace Compose orchestration without changing the image contract. Fargate is operationally convenient but can cost more for stable multi-container workloads and complicate direct comparison with the current fixed-worker Docker baseline. Select it only after calculator comparison and worker/connection equivalence are documented.

## Lifecycle procedures

### Common preflight

1. Build once in CI from a verified commit; sign backend/web images and record SBOMs and digests.
2. Create a release manifest containing commit, digests, migration plan, settings checksum and test/evidence references.
3. Inject environment values from approved secret paths.
4. Run the existing contract before deployment:

```bash
python3 ops/staging/validate_staging_config.py \
  --env-file /run/secrets/hrms-staging.env --json | tee preflight.json
docker compose --env-file /run/secrets/hrms-staging.env \
  -f ops/staging/docker-compose.staging.yml config --quiet
```

The infrastructure wrapper may render endpoints and secret references, but it must not relax `validate_staging_config.py` or replace digest references with mutable tags.

### Deploy

1. Create or reconcile infrastructure through reviewed IaC; record plan and resource IDs.
2. Verify private networking, KMS, bucket policy, log destinations, health checks and backup state.
3. Restore or provision only deterministic synthetic fixtures.
4. Take a pre-migration snapshot/checkpoint.
5. Run strict production preflight and `migrate --plan`; execute one controlled migrator.
6. Deploy exact image digests, wait for health, then run browser/API/RBAC/tenant-isolation smoke tests.
7. Retain configuration hashes and evidence; never retain plaintext secrets.

### Stop

- **Tier A Lightsail:** stopping does not save the bundle charge. Stop application containers only for maintenance; continue backup/monitoring or delete the instance after creating an approved encrypted snapshot.
- **Tier A EC2:** stop the instance on schedule after worker drain, job-state verification and encrypted backup. EBS, snapshots, IPv4, S3 and logs continue to accrue charges.
- **Tier B:** drain load and workers, reconcile jobs/artifacts, take final database/object checksums, export evidence, then proceed directly to teardown. Do not leave RDS merely stopped; AWS restarts it after seven days.

### Recreate

1. Apply the pinned IaC revision in a clean account/VPC or clean product namespace.
2. Pull and verify the recorded digests/signatures.
3. Restore the approved encrypted snapshot/dump into a new database endpoint.
4. Run migrations, count/hash reconciliation and integrity checks before enabling traffic.
5. Recreate synthetic identities, never customer identities, and record newly generated IDs.

### Rollback

1. Keep prior digests available until candidate health and smoke tests pass.
2. Roll app/worker tasks back to prior digests; do not automatically reverse non-reversible schema migrations.
3. Use expansion/contraction migrations so old and new application versions can coexist during rolling deployment.
4. If data restoration is required, isolate writes, restore to a new database, reconcile counts/checksums and switch only after approval.
5. Revoke failed-release secrets and retain immutable logs, alerts, timings and image identities.

### Teardown

1. Disable ingress and provider callbacks; drain workers and verify no queued/running jobs.
2. Delete disposable tenants through supported cleanup, then independently verify zero owned fixture records and artifacts.
3. Export sanitized evidence and checksums to the approved evidence bucket.
4. Retain only policy-approved encrypted snapshots, logs and release manifests.
5. Destroy load generator, app/worker instances, ALB, NAT/endpoints, cache and RDS in dependency order.
6. Delete temporary secrets, IAM grants, DNS records and security-group rules; verify the AWS cost/resource inventory is empty except declared retained evidence.

## Mandatory approvals and unresolved prerequisites

Before Tier A deployment:

- AWS account/region, budget owner and four-product chargeback model.
- Approved staging domains, DNS control and certificate ownership.
- Real signed image digests, registry access, signing identity and vulnerability policy.
- Secret owner/rotation process and named incident recipients.
- Object-storage region, scanner/quarantine product, signed-access lifetime and retention policy.
- Synthetic email recipients and SES sandbox approval.
- Backup retention plus functional restore owner.

Before Tier B execution:

- Approved Tier B IaC, 72-hour change window and **INR 32,000 maximum cycle budget**.
- Target production topology to make capacity comparison meaningful.
- Approved RPO/RTO and failover objectives.
- Fixed 25/50-VU scripts, data volume, thresholds and contamination rules.
- Finance/provider sandbox credentials and callback contract if `STG-005`/`DDG-F-012` are in scope.
- Legal/data-owner approvals for retention, erasure, legacy classification and archive gates. Irreversible erasure remains disabled.

## Decision

**Architecture decision: PASS for planning.** The two-tier model materially reduces idle infrastructure cost while retaining a dedicated environment for evidence that cannot be trusted on a shared host.

**Tier A execution: CONDITIONAL GO** after account, budget, domain, image digests, secrets, protected storage/scanner, backup and incident ownership are approved. It remains synthetic-only.

**Tier B execution: CONDITIONAL GO** for a scheduled 72-hour certification window after its IaC, cost ceiling, production comparison target, provider scope and RPO/RTO are approved.

**Real-payroll pilot: NO-GO. Unrestricted production: NO-GO.** This plan does not approve statutory/payment policies, legal retention decisions, customer data, real payments or production deployment.

## Pricing references

- AWS Lightsail bundles: <https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html>
- AWS Lightsail pricing: <https://aws.amazon.com/lightsail/pricing/>
- Amazon EC2 on-demand pricing: <https://aws.amazon.com/ec2/pricing/on-demand/>
- Amazon RDS for PostgreSQL pricing: <https://aws.amazon.com/rds/postgresql/pricing/>
- RDS stop/start behavior: <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html>
- Amazon ElastiCache pricing: <https://aws.amazon.com/elasticache/pricing/>
- Amazon S3 pricing: <https://aws.amazon.com/s3/pricing/>
- Amazon SES pricing: <https://aws.amazon.com/ses/pricing/>
- AWS Pricing Calculator: <https://calculator.aws/>
