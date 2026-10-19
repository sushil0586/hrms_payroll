# HRMS Lightsail Staging Operational Protection

Date: 2026-10-18

Environment: synthetic-only HRMS staging at `https://hrms.accerio.in`

Decision: **CONDITIONAL preparation complete; protection activation and recovery certification pending authorization**

## Safety boundary

This phase performed read-only AWS and host inspection. It did not create alarms, notification contacts, snapshots, S3 buckets, KMS keys, or billable infrastructure. It did not restart containers, replace the running database, deploy another application, or modify release-gate statuses. The existing HRMS application image and digest were left unchanged.

## Infrastructure findings

| Item | Verified state |
| --- | --- |
| AWS identity | `arn:aws:iam::227022022984:user/lightsail-staging-operator` |
| Region/AZ | `ap-south-1` / `ap-south-1a` |
| Instance | `saas-staging-01`, running |
| Bundle | `medium_3_1`, Ubuntu 24.04 |
| Capacity | 2 vCPU, 4 GB RAM, 80 GB system disk, 3,000 IOPS |
| Static IP | `65.0.231.86`, attached |
| Public network | 80/443 public; SSH restricted to `49.43.106.137/32` |
| Application ports | PostgreSQL, Redis, Django, and Next.js are not host-public |
| Lightsail alarms | None |
| Notification contacts | None |
| Automatic snapshots | Disabled |
| Manual snapshots | None |
| S3 access | Current operator is denied `s3:ListAllMyBuckets` |

### Current host state

| Metric | Measurement |
| --- | ---: |
| RAM used / available | 1.6 GiB used / 2.1 GiB available including reclaimable cache |
| Immediately free RAM | 244 MiB |
| Swap | 4 GiB configured; 729 MiB occupied |
| Root disk | 20 GiB of 77 GiB used (27%) |
| Docker images | 5.60 GB; 1.89 GB reclaimable |
| Docker build cache | 9.09 GB; 8.24 GB reclaimable |
| Docker volumes | 88.6 MB |
| PostgreSQL | 25 MB database; 7 connections; 1 active |
| Redis | 2.35 MB used of 96 MB maximum |
| Celery | one worker process, concurrency 1 |

All seven HRMS containers were running; web, backend, PostgreSQL, and Redis health checks were healthy. The web container used approximately 389 MiB and backend approximately 276 MiB during inspection. No service was restarted.

The prior controlled certification remains relevant: authenticated browser activity reached 70-88% CPU, generated swap-in/I/O-wait bursts, and Lightsail burst capacity was near zero. This host must remain HRMS-only.

## Backup architecture

### Required layers

1. **Daily PostgreSQL logical backup** using PostgreSQL 16 `pg_dump --format=custom` from the healthy database container.
2. **Protected artifact backup** for the `media-data` volume, preserving relative paths, ownership metadata, and a per-object SHA-256 manifest.
3. **Configuration metadata backup** containing image digests, Compose/Caddy checksums, migration plan, database version, and volume inventory. Secret values and `.env.hrms` must never be included.
4. **Encrypted off-host storage** in a dedicated private S3 bucket in `ap-south-1`, with public access blocked, bucket versioning, TLS-only bucket policy, object ownership enforcement, access logging/audit, and SSE-KMS encryption.
5. **Lightsail automatic snapshots** as host recovery convenience, not as the sole database backup.

### Proposed schedule and retention

| Backup | Frequency | Retention | Purpose |
| --- | --- | --- | --- |
| PostgreSQL custom dump | Daily at 21:00 UTC | 14 daily, 8 weekly, 12 monthly | Data-level recovery and migration verification |
| Artifact archive | Daily after DB dump | Same lifecycle as database dump | Documents/generated artifacts |
| Configuration manifest | Every backup and deployment | Same lifecycle as associated backup | Reproducibility |
| Lightsail automatic snapshot | Daily after logical backup | Native latest seven | Fast host recovery |

Retention is a proposed synthetic-staging policy and requires owner/security approval before activation. It does not establish customer-data or statutory retention policy.

### Integrity contract

Each backup set must contain:

- PostgreSQL dump and `pg_restore --list` result.
- Artifact archive and file count.
- SHA-256 for every object plus a signed/immutable manifest where approved.
- Source commit, image digests, schema migration heads, PostgreSQL version, creation timestamps, tenant classification (`synthetic-only`), and backup job ID.
- Upload confirmation from S3 followed by metadata/head verification.
- A durable success/failure record and alert if no verified backup completes within 26 hours.

The existing local bootstrap dump is 1,303,256 bytes. Its recorded and actual SHA-256 both equal `7a9d3def19dc127e71ba9636e1e577cafb7ff84c024d9c5cfa883c9278eeb34c`, and `pg_restore --list` succeeds. It is local-only and is not recovery certification.

### Recovery objectives

- Proposed synthetic-staging RPO: **24 hours**.
- Proposed synthetic-staging RTO: **4 hours** after infrastructure is available.
- Real payroll/customer RPO and RTO remain unapproved and must not inherit these values.

## Isolated restore rehearsal

The rehearsal remains pending explicit authorization because it requires temporary resources or a controlled local disposable environment and access to the encrypted backup.

Required procedure:

1. Select a verified backup set by immutable object version and record its manifest hash.
2. Create an isolated private Docker network and new disposable PostgreSQL 16 volume; never connect it to the running staging application.
3. Restore the custom-format dump with `pg_restore --clean --if-exists --exit-on-error` into a newly created database.
4. Restore artifacts into a separate disposable volume and verify manifest hashes and file counts.
5. Start backend and web containers pinned to the recorded image digests with synthetic-only secrets and outbound provider operations disabled.
6. Run Django checks, migration-plan comparison, table/row reconciliation, tenant ownership checks, critical payroll/leave/attendance invariants, artifact access checks, and the read-only seven-case browser smoke.
7. Record elapsed restore time, data timestamp, exceptions, and achieved RPO/RTO.
8. Delete only the disposable containers, network, and volumes after evidence is retained. Never point the recovered application at the live database or live Redis.

Passing recovery requires zero restore errors, matching checksums/file counts, expected migration heads, reconciled critical tables, no cross-tenant exposure, healthy services, and 7/7 smoke tests.

## Monitoring design

### Lightsail native metrics

Create native alarms only after an email notification contact is supplied and verified in `ap-south-1`.

| Alarm | Condition | Evaluation | Missing data |
| --- | --- | --- | --- |
| CPU warning | `CPUUtilization >= 70%` | 3 of 3 five-minute points | not breaching |
| CPU critical | `CPUUtilization >= 85%` | 2 of 2 five-minute points | not breaching |
| Burst reserve | `BurstCapacityPercentage <= 20%` | 2 of 2 five-minute points | breaching |
| Instance status | `StatusCheckFailed >= 1` | 1 of 1 five-minute point | breaching |
| Metadata security | `MetadataNoToken >= 1` | 1 of 1 five-minute point | breaching |

Lightsail supports at most two alarms per metric and evaluates five-minute aggregated points. Console banners are available, while email/SMS requires a region-specific verified contact.

Example guarded alarm command after approval and contact verification:

```bash
AWS_PROFILE=lightsail-staging AWS_REGION=ap-south-1 \
aws lightsail put-alarm \
  --alarm-name saas-staging-01-cpu-critical \
  --metric-name CPUUtilization \
  --monitored-resource-name saas-staging-01 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --threshold 85 \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --treat-missing-data notBreaching \
  --contact-protocols Email \
  --notification-triggers ALARM OK \
  --notification-enabled
```

### Host and container custom monitoring

Lightsail does not natively expose host RAM, filesystem, swap, Docker health, PostgreSQL connections, Redis memory, Celery queue depth, or backup age. A least-privileged CloudWatch agent or approved equivalent should publish only these bounded custom metrics every five minutes:

- `MemoryUsedPercent`: warning 75%, critical 85%.
- `RootDiskUsedPercent`: warning 70%, critical 85%.
- `SwapUsedBytes`: warning 1 GiB; critical 2 GiB; also alert on sustained swap-in.
- `UnhealthyContainerCount`: critical at 1.
- `PostgresConnectionPercent`: warning 70%, critical 85%.
- `CeleryQueueDepth`: warning threshold based on measured normal queue; critical on sustained growth or oldest-job age.
- `VerifiedBackupAgeHours`: critical above 26 hours.
- `BackupFailureCount`: critical at 1.

Do not send environment values, request payloads, employee data, document names, tokens, or payroll values as metric dimensions or log fields.

### Alert delivery verification

No notification contact exists, so delivery was not tested. After an owner supplies the approved operations email:

1. Create and verify the Lightsail email contact.
2. Create alarms with notifications enabled.
3. Use the supported Lightsail test-notification mechanism or a temporary threshold against an existing metric; do not create CPU load.
4. Confirm ALARM and OK delivery, timestamps, runbook link, and recipient ownership.
5. Remove any temporary test alarm and retain evidence.

## Estimated incremental monthly cost

Planning exchange rate: INR 90/USD, excluding taxes and AWS exchange-rate variation.

| Protection | Planning estimate |
| --- | ---: |
| Lightsail automatic snapshots | Initial 20 GiB used disk is about USD 1 / INR 90 per month; later snapshots charge changed blocks only |
| S3 backup storage | Current DB plus artifacts is well below 1 GiB; expected storage/request cost below USD 0.50 / INR 45 monthly initially |
| Customer-managed KMS key | USD 1 / INR 90 monthly plus requests; first 20,000 KMS requests/month are within the documented free tier |
| Lightsail native alarms | Included server monitoring; verify notification/SMS charges before activation |
| Eight CloudWatch custom metrics | Up to approximately USD 2.40 / INR 216 monthly at USD 0.30 per full-month metric, before free-tier effects |
| Logs | Usage-dependent; cap retention and ingestion before enabling centralized logs |

Expected initial protection increment is approximately **INR 200-450/month before tax**, depending on custom metrics, logs, changed snapshot blocks, and KMS choice. Use the AWS Pricing Calculator with the final retention and log-volume assumptions before approval. Lightsail snapshots are officially USD 0.05/GB-month; a customer-managed KMS key is USD 1/month.

## Executed versus pending evidence

### Executed

- AWS identity, region, instance, bundle, disk, IP, and network inventory.
- Read-only host memory, swap, disk, Docker, PostgreSQL, Redis, and container health inspection.
- Confirmation that no alarms, contacts, snapshots, or automatic snapshot add-on exist.
- Confirmation that the operator lacks S3 listing permission.
- Existing local dump checksum and archive catalog validation.
- Prior deployed 7/7 browser smoke and source/image reconciliation remain valid.

### Pending authorization or prerequisites

- Approved notification email and optional SMS owner.
- S3 bucket name, retention approval, bucket/KMS ownership, and least-privileged backup role.
- Creation of KMS key if customer-managed encryption is required.
- Enabling automatic Lightsail snapshots and approving their cost.
- Installation/configuration of custom host/container metrics.
- Alert delivery test.
- First encrypted off-host backup.
- Disposable restore rehearsal and measured RPO/RTO.
- Backup failure simulation and recovery evidence.

## Remaining risks

1. Current backups are on the same host and do not protect against instance loss.
2. No verified restore exists.
3. No alert reaches an operator today.
4. Burst capacity remains depleted and swap remains occupied.
5. Builds on the host compete with runtime services and should move to CI/image registry.
6. The checksum file's stored relative path requires the repository root; backup automation should use a basename or an explicit verification working directory.
7. No customer/statutory backup retention or deletion policy is approved; synthetic staging policy cannot substitute for it.

## Resizing decision

- Immediate resize: **NO-GO until one encrypted off-host backup, alert delivery, and an isolated restore rehearsal pass.** A resize without recovery evidence adds avoidable migration risk.
- After protection gates pass: **GO to resize HRMS staging to at least 8 GB** if another functional workload is planned.
- Adding Finacc or GST to the existing 4 GB instance: **NO-GO**.
- Shared HRMS + Finacc + GST target: **16 GB / 4 vCPU minimum**, followed by fresh combined-load certification.
- Production and real payroll: **NO-GO**.

## Approval sequence

1. Owner approves estimated protection spend and retention schedule.
2. Security owner approves S3/KMS policy and backup IAM role.
3. Operations owner supplies and verifies alert contact.
4. Create native alarms and custom monitoring; test delivery.
5. Enable snapshots and run first encrypted backup.
6. Authorize and execute isolated restore rehearsal.
7. Review evidence and only then authorize resize or additional products.
