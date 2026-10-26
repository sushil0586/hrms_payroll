# HRMS/Payroll STG-0 Infrastructure Checklist

Date: 2026-10-26
Legend: Verified, Partial, Blocked, Unexecuted

| Control | Status | Current evidence | STG-1 requirement |
|---|---|---|---|
| Dedicated staging URL | Verified | `https://hrms.accerio.in` responds | Retain synthetic-only banner/operating rule |
| HTTP redirect | Verified | HTTP 308 to HTTPS | Recheck per deployment |
| TLS certificate | Verified | Valid chain; expiry 2027-01-16 | Alert before renewal window |
| HSTS | Partial | One year + subdomains; preload disabled | Record accepted staging posture or enable after domain review |
| CSP/frame/referrer/nosniff | Partial | Referrer and nosniff observed; Django API emits frame deny; login CSP not observed | Define and test response-header baseline |
| Reverse proxy | Verified | Caddy routes web, `/api/v1/*`, `/health/` | Preserve trusted proxy/host checks |
| Source commit | Verified | Local and deployed `20d832996...` | Freeze QA-only test/document commit separately |
| Immutable registry digest | Partial | Runtime image IDs known; local tags used | Record exportable digest/provenance and rollback source |
| Docker isolation | Verified for functional staging | Private Compose network; only 80/443 published | Keep database/broker ports private |
| Container health | Verified | Seven running, zero restarts | Capture before/after each batch |
| Django debug/demo | Verified | Debug false; demo false | Recheck with strict preflight |
| Allowed hosts/CSRF | Verified | Explicit host and HTTPS origin | Negative host/origin browser test in STG-1 |
| Secure cookies/redirect | Verified | Secure cookies and SSL redirect configured | Verify cookie attributes from authenticated browser |
| Enterprise identity declaration | Blocked | Strict preflight failure | Set approved `verified` or `not_in_scope` value |
| PostgreSQL 16 connectivity | Verified | Healthy and accepting connections | Use for all constraint/concurrency checks |
| Migration compatibility | Verified | Runtime `migrate --check`; local drift none | No migration application during STG-0 |
| PostgreSQL HA/PITR | Blocked | Single local container | Required for production-like certification |
| Redis connectivity | Verified | `PONG`; AOF/noeviction | Capture latency and persistence/restart evidence later |
| Managed/durable broker | Blocked | Host-local Redis | Required for production-like recovery gate |
| Celery worker | Verified with limit | One worker, concurrency 1 | Single-worker E2E; no load escalation |
| Celery beat | Partial | Dispatch resumes after schedule corruption/rebuild | Move schedule file to managed volume or replace persistence; prove restart |
| SES SMTP | Verified with limitation | Synthetic delivery and operational alerts previously passed | Use allowlisted synthetic recipients only |
| Bounce/complaint reconciliation | Blocked | Operational email received; application row not updated | Implement/verify consumer if launch scope requires it |
| Document storage | Blocked | Local `media-data` volume | External private encrypted storage for production-like gate |
| Malware scanning | Blocked | No deployed scanner evidence | Keep unsupported claim blocked |
| Signed artifact access | Partial | Application contracts exist; storage-level evidence absent | Verify expiry/revoke against deployed private storage |
| Runtime secrets | Partial | Main env and QA password mode `0600` | Migrate all secrets to managed injection and rotation |
| Historical env copies | Risk | Three mode-`0600` full env copies under `backups/` | Remove through approved secret-safe process and rotate if policy requires |
| Local DB dumps | Partial | Four gzip files valid; bootstrap catalog readable | Do not treat local disk as disaster recovery |
| Encrypted off-host backup | Blocked | No fresh executed evidence | Configure and verify upload/checksum |
| Artifact backup | Blocked | No restore evidence | Include media/object checksum manifest |
| Restore rehearsal | Blocked | Not executed | Restore into isolated disposable environment and reconcile |
| RPO/RTO | Blocked | Proposed only | Obtain owner approval and timed evidence |
| Central logging | Blocked | No executed destination evidence | Redacted searchable logs and retention |
| CPU/availability alarms | Unexecuted current state | AWS CLI session unavailable; prior evidence reported none | Reauthenticate and inspect without provisioning |
| Memory/disk/swap alerts | Blocked | No custom monitor evidence | Add approved host/container monitoring |
| Rollback procedure | Partial | Prior backups/images exist | Rehearse prior-image rollback without data loss |
| Capacity | Partial | 4 GB host, 548 MiB swap, 60% disk | One worker; stop on memory/restart/error threshold |
| Real payment/provider | Blocked | Worker/credentials absent by design | Keep disabled; sandbox required for certification |
| Irreversible erasure | Verified disabled | `DATA_ERASURE_EXECUTION_ENABLED=false` | Retain until policy approval |

## Safe Runtime Commands Executed

```bash
curl -I http://hrms.accerio.in/
curl -I https://hrms.accerio.in/login
curl https://hrms.accerio.in/health/
docker compose ... config --quiet
docker compose ... ps
python manage.py migrate --check
python manage.py check
python manage.py production_preflight --strict --skip-network --json
redis-cli ping
pg_isready
celery -A config inspect ping --timeout 5
gzip -t backups/*.sql.gz
pg_restore --list < bootstrap.dump
```

No service was restarted, no migration was applied, and no infrastructure was changed.
