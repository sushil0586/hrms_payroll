# STG-0B Monitoring And Alerts

Date: 2026-10-26
Status: **CONFIGURATION PARTIAL; DELIVERY UNVERIFIED**

## Checked-In Coverage

`ops/monitoring/prometheus-rules.yml` declares alerts for:

- backend and web health
- Redis and PostgreSQL availability
- notification failures
- payroll provider failures
- stale backup/restore evidence

The staging configuration validator requires a central log destination, alert route and incident owner. The example environment intentionally fails those checks until deployment-owned values are supplied.

## Missing Or Unverified Coverage

| Area | Current status | Required evidence |
|---|---|---|
| Django request/error monitoring | No deployed sink verified | Generate synthetic handled/unhandled test event and prove receipt/redaction |
| PostgreSQL capacity | Availability only | Connections, CPU, disk, locks, replication/backup age thresholds |
| Redis | Availability only | Memory, latency, evictions and persistence alerts |
| Celery | Failure counters partial | Queue depth/age, worker heartbeat, retry/dead-letter and beat last-success alerts |
| Scheduled tasks | No per-task freshness proof | Last success and missed schedule alerts |
| Payroll jobs | Provider failure rule exists | Durable job age, failed/retryable counts and reconciliation alert |
| Storage | Not deployed | Access-denied, upload failure, lifecycle/scanner and public-access alerts |
| Backup | Stale evidence rule exists | Backup job failure, upload failure, retention and restore-rehearsal freshness |
| Host/container | Not represented in checked-in rules | CPU burst, RAM, swap, disk/inodes, restart/OOM and container health |

## Ownership And Escalation

Alert owner, delivery channel, acknowledgement SLA and escalation target are not verified. Proposed ownership is: platform/SRE for host, database, Redis, Celery and backup; application on-call for Django and job failures; payroll operations plus application on-call for payroll reconciliation; security for storage/access alerts. Approval is required before this becomes operational policy.

## Validation Rule

Configuration presence is not alert verification. PASS requires a controlled synthetic event, alert firing timestamp, delivered notification, acknowledgement, resolution, and retained evidence. No alert was deliberately fired in STG-0B, so monitoring-dependent gates remain blocked.
