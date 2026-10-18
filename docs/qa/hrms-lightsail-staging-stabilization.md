# HRMS Lightsail Staging Stabilization and Resource Certification

Date: 2026-10-18
Environment: synthetic-only staging at `https://hrms.accerio.in`
Decision: **CONDITIONAL for HRMS-only functional QA; NO-GO for adding Finacc or GST on the current host**

## Scope and safety boundary

This assessment used the existing authorized synthetic HRMS workspace. It did not restart shared services, mutate customer data, run payroll volume or concurrency load, deploy Finacc/GST, or change the deployed image after the stabilization hotfix. Production payroll remains disabled and production readiness is not claimed.

## Source and image reconciliation

- Base Git commit: `520202d84ac2e5b41359cd5485becba1176c4516`.
- Running staging tag: `hrms-web:520202d-stagefix1`.
- Running image ID and digest: `sha256:279457f8529b908b7f3231de4f65f1347be1a796cf73743768a8187f8c20aad3`.
- Build timestamp: `2026-10-18T09:24:29Z`.
- The deployed checkout remains based on `520202d` with the reviewed staging hotfix applied. The tag explicitly identifies this as a staging hotfix rather than pretending it is a clean immutable Git build.
- Local and deployed SHA-256 values matched for every source/configuration file that affected the hotfix image:

| File | SHA-256 |
| --- | --- |
| `web/Dockerfile` | `75eb62ede3e14e1a4ab2be90c000609b1a05296d929f3499e352bae29c635c4f` |
| `web/src/app/platform-admin/platform-admin-renderer.tsx` | `92056e14dfec9b9ddf44045b530f4b738356b4994618d03b5ac2d513b4a96b6b` |
| `infrastructure/lightsail/docker-compose.hrms.yml` | `4288ec847fda0e3fe5f9da3dc5d5303d63690d0325c0e360ddb3dde15b6afee5` |
| `infrastructure/lightsail/Caddyfile.hrms` | `55c2f44de904732ed8c72fa771956a881e300b12e788e597fbcb3c39fd5747c5` |

Server-only `.staging-secrets/`, `.env.hrms`, backups, and QA runtime output are excluded from Git. Secret scanning found only placeholders in `hrms.env.example`; `.env.hrms` is ignored and mode `0600`. No key, credential, environment file, or private key is part of the commit set.

## Stabilization changes

1. Passed build-time API/demo arguments into the Next.js builder so the production container can prerender under the intended staging contract.
2. Added canonical `HRMS_PUBLIC_APP_URL=https://hrms.accerio.in`; unauthenticated redirects no longer expose internal port `3000`.
3. Prevented Platform Admin production rendering from selecting `demo-platform-tenant` when the real stale-onboarding list is empty. Real `summary.first_tenant` now takes precedence and demo fallbacks require explicit demo mode.
4. Added an opt-in Playwright browser channel for installed Chrome without changing CI/default behavior.
5. Expanded deployed smoke coverage to all five portals, Platform APIs, four critical HR API families, and employee denial checks.

## Verification results

| Check | Result |
| --- | --- |
| Deployed Playwright smoke | 7 passed, 0 failed, 50.3 seconds |
| Portal routing | HR Admin, ESS, MSS, Tenant Admin, Platform Admin passed |
| Critical HR APIs | Employee, attendance, leave, payroll readiness returned success for HR Admin |
| RBAC negative checks | Employee received `403` for all four privileged HR endpoints |
| Platform APIs | Summary and tenant list returned success |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Production web build | Passed; existing CSS autoprefixer warning retained |
| Django check | Passed, 0 issues |
| Migration drift | None |
| Compose validation | Passed |
| Provisioning script syntax | Passed |

An attempted local Platform Admin suite was stopped after repeated redirects to login. The local `.env.local` enables a live API while that suite's helper assumes demo mode and installs a fake token. This environment mismatch is retained and is not counted as an application failure or pass.

## Instance and idle baseline

| Resource | Measured value |
| --- | --- |
| Lightsail plan | 2 vCPU, 4 GB RAM, 80 GB SSD, Mumbai |
| CPU | Intel Xeon Platinum 8259CL, 2 vCPU |
| RAM | 3.7 GiB visible; 1.5 GiB used; 2.2 GiB available including cache |
| Swap | 4.0 GiB configured; approximately 730 MiB occupied after image build |
| Disk | 77 GiB filesystem; 20 GiB used (27%); 57 GiB available |
| Docker images | 5.6 GB, of which 1.9 GB reclaimable |
| Docker build cache | 9.1 GB, of which 8.2 GB reclaimable |
| Persistent Docker volumes | 87.6 MB |
| PostgreSQL database | 25 MB |
| PostgreSQL connections | 8 of 100, 1 active |
| Redis | 2.20 MB used, 96 MB configured maximum, 15 clients |
| Celery worker | prefork concurrency 1, prefetch 4 |

### Idle container memory

| Container | Measured memory | Configured limit |
| --- | ---: | ---: |
| Next.js web | 381.6 MiB | 768 MiB |
| Django/Gunicorn backend | 204.0 MiB | 768 MiB |
| Celery worker | 56.6 MiB | 512 MiB |
| Celery beat | 23.1 MiB | 192 MiB |
| PostgreSQL | 33.7 MiB | 640 MiB |
| Redis | 4.5 MiB | 128 MiB |
| Caddy | 15.6 MiB | 128 MiB |

All seven containers were healthy with zero restart counts.

## Activity measurements

### Normal API and browser traffic

Twenty sequential requests per endpoint produced:

| Endpoint | Result | Mean total | Maximum total |
| --- | --- | ---: | ---: |
| `/api/v1/health/` | 20/20 HTTP 200 | 140 ms | 177 ms |
| `/login` | 20/20 HTTP 200 | 180 ms | 196 ms |
| `/hr-admin` unauthenticated | 20/20 HTTP 307 | 139 ms | 209 ms |

A second 60-request sequence peaked near 12% host CPU, did not swap out, and retained more than 270 MiB immediately free memory.

### Authorized synthetic browser smoke

The seven serial Playwright cases completed in 50.3 seconds. During authenticated server-rendered navigation:

- CPU repeatedly reached 70-88% and runnable processes peaked at 10.
- Immediately free memory fell to approximately 192 MiB; cache remained reclaimable.
- Existing swap occupancy remained approximately 730 MiB.
- Swap-in bursts reached approximately 12 MB/s and I/O wait briefly reached 47%.
- No HTTP 5xx, authorization anomalies, container restarts, OOM events, deadlocks, or persistent log errors occurred.

The public response path remained usable, but the SSR workflow showed material CPU and memory-pressure sensitivity.

### Lightsail burst capacity

AWS Lightsail metrics collected over the preceding three hours showed CPU averages from idle single digits through 59-70% during builds, with maxima near 100%. `BurstCapacityPercentage` was generally near zero and never exceeded approximately 1.3% in the sampled points. The current host therefore has no credible burst reserve for another build or application stack.

## Operational reliability

| Control | Finding |
| --- | --- |
| HTTPS/TLS | Valid Let's Encrypt certificate; expires 2027-01-16 |
| Security headers | HSTS, `nosniff`, and strict referrer policy present |
| Public listeners | Only 80/443; SSH 22 restricted to operator CIDR |
| PostgreSQL/Redis exposure | Internal Docker network only; no host listener |
| Secrets | Server environment file mode `0600`; no repository secrets found |
| Health checks | Web, backend, PostgreSQL, and Redis healthy |
| Logs | No fresh web/backend severe errors after hotfix |
| Local backup | One 1.30 MB bootstrap custom-format dump; digest matches and `pg_restore --list` succeeds |
| Restore certification | Not complete; no disposable full restore/reconciliation evidence |
| Off-host backup | Not configured/evidenced |
| Lightsail snapshots | None |
| Monitoring/alerts | No Lightsail alarms configured; centralized alerting remains absent |
| Email/object storage/providers | External staging certification remains outstanding |

The checksum file records a repository-relative `backups/...` path, so `sha256sum -c` fails when executed from the backup directory even though the recorded and actual hashes match. The backup script should emit a basename or document the required working directory.

## Capacity assessment

The projections below are conservative service budgets, not certified capacities for unobserved products:

| Deployment | Minimum planning budget | Current 4 GB host |
| --- | --- | --- |
| HRMS only | 2 vCPU, 4 GB RAM; builds should run elsewhere | **Conditional GO** for low-traffic functional QA only |
| HRMS + Finacc | At least 2-4 vCPU, 8 GB RAM, isolated service limits | **NO-GO** on 4 GB; 8 GB is minimum for a controlled trial |
| HRMS + Finacc + GST | At least 4 vCPU, 16 GB RAM, preferably separate databases/brokers and external builds | **NO-GO** on 4 GB or 8 GB; use 16 GB minimum |

The primary current constraints are depleted Lightsail CPU burst capacity, authenticated SSR CPU peaks, active swap, only one Celery worker slot, and image/build-cache disk growth. Memory alone understates the risk: adding services would compete for the same two burstable vCPUs and storage I/O.

## Recommendation

1. **Keep the current 4 GB instance for HRMS-only synthetic functional QA temporarily.** Do not build multiple products concurrently and do not run capacity tests here.
2. **Do not install Finacc or GST on the current host.** The measured browser workload and exhausted burst reserve leave insufficient fault and deployment headroom.
3. If HRMS and one additional low-use functional stack must share a host, upgrade to **8 GB** and remeasure both products together before acceptance.
4. For HRMS + Finacc + GST, upgrade to **16 GB / 4 vCPU minimum** or use separate Tier-A hosts. Keep Tier-B load and payroll-volume testing temporary and isolated.
5. Build immutable images off-host, deploy by digest, reclaim unused build cache only under an approved maintenance procedure, add CPU/memory/disk/health alarms, and complete encrypted off-host backup plus disposable restore testing.

## Decision

- HRMS functional staging on current 4 GB Lightsail: **CONDITIONAL GO**.
- Add Finacc alone to current host: **NO-GO**.
- Add GST alone or with Finacc to current host: **NO-GO**.
- Recommended shared three-product staging size: **16 GB / 4 vCPU minimum**, followed by fresh measured certification.
- Real-payroll staging/production: **NO-GO** pending the existing external, policy, backup, provider, and capacity gates.
