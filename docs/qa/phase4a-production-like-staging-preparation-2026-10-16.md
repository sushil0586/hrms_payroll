# Phase 4A Production-Like Staging Preparation

Date: 2026-10-16  
Decision: **CONDITIONAL**  
Production deployment: **not performed**

## Decision

The current source candidate builds and operates successfully in an isolated production-like Docker stack. Static security configuration, migrations, process health, backup/restore, persistent media, deterministic role fixtures, server-side access boundaries, focused backend tests, TypeScript, and the production frontend build passed.

Phase 4A is conditional because there is no verified dedicated staging deployment of the current candidate. Real TLS/secure-cookie browser behavior, live SMTP, protected external artifact storage, provider connectivity, monitoring, and externally retained backups remain unverified. The existing public domain runs an older build and is not used as candidate evidence.

## Architecture Inventory

| Layer | Candidate topology | Status |
| --- | --- | --- |
| Frontend | Next.js production build in Docker | Passed; runs as non-root `node` |
| API | Django/Gunicorn in Docker | Passed; runs as non-root `hrms` |
| Database | PostgreSQL 16 with named volume | Passed, including dump/restore rehearsal |
| Cache/queue | Redis 7 with AOF and named volume | Passed |
| Background work | Celery worker and beat | Passed; worker concurrency capped at 2 for constrained hosts |
| Payroll integrations | Dedicated job and retry processors | Running; external provider calls not certified |
| Uploaded documents | Django media filesystem with named shared volume | Container persistence passed; protected external storage remains open |
| Payroll artifacts | Policy-controlled storage adapters | Static strict policy passed; live object storage not certified |
| Edge/TLS | Not included in Compose | Required in staging |
| Email | SMTP configuration declared | Live delivery not certified |
| CI/CD | Existing EC2/systemd deployment assets and Docker Compose | Candidate image promotion/digest workflow still required |

## Remediation Completed

- Reduced Docker contexts by excluding development, QA evidence, generated output, and local dependency trees.
- Changed backend and web runtime containers to unprivileged users.
- Removed runtime Corepack/package-manager download from the web startup path.
- Capped Celery worker concurrency through `CELERY_WORKER_CONCURRENCY` with a default of 2.
- Added shared persistent `media-data` storage for the API and background processors.
- Extended the supported disposable workspace provisioner with distinct tenant-admin and platform-only identities.
- Added focused tests for the five-persona workspace and cleanup behavior.

## Configuration and Security

Strict static preflight passed with `DEBUG=False`, demo data disabled, Basic Authentication disabled, secure cookies, configured hosts, PostgreSQL, Redis, SMTP backend declaration, notification scheduling, payroll provider declarations, credential references, and strict payroll storage-control declarations.

These results do not substitute for live network verification. Compose exposes HTTP directly and does not include a reverse proxy, certificate automation, or HSTS termination. The current candidate therefore has no Docker-only proof for HTTPS redirects, secure-cookie browser persistence, CSRF origin behavior at the final hostname, or proxy header sanitation.

## Identities and Boundaries

The disposable fixture now provisions HR Admin, manager, employee, tenant admin, and platform-only admin identities. Session/API checks confirmed expected workspace boundaries, including denial of platform access to tenant users and denial of tenant workspaces to the platform-only administrator. The fixture was removed and absence verified.

This fixes the prior fixture-provisioning gap without changing application roles, RBAC checks, subscription rules, or tenant scoping.

## Storage Findings

Employee document artifacts use Django `FileField` under `MEDIA_ROOT`. The missing Compose persistence was fixed with `media-data`, and a file survived forced backend recreation. For staging and production, this volume must be encrypted, backed up, access-restricted, and restored during disaster-recovery rehearsal, or replaced with an approved private object-storage backend.

Payroll has explicit object-storage adapters and strict policy controls. Local static verification passed, but no real bucket, KMS key, signed URL, lifecycle policy, malware scanner, or credential-manager integration was contacted. Those controls remain deployment gates.

## Evidence

Detailed commands and outcomes: [Docker certification evidence](evidence/phase4a-production-like-staging/001-docker-certification-2026-10-16.md).

Phase 3 evidence remains frozen at 963 unique tests: 957 passed, 6 justified skips, 0 failed, blocked, or not run. Phase 4A did not rewrite those outcomes.

## Open Gates

### Phase 4B entry criteria

1. Deploy immutable images from the reviewed commit to a dedicated, non-production staging environment.
2. Put the candidate behind the production-equivalent reverse proxy and trusted TLS certificate.
3. Inject unique secrets from an approved secret manager; do not reuse the local synthetic environment file.
4. Configure and verify real staging SMTP, Redis, Celery scheduling, payroll provider sandbox credentials, and protected artifact storage.
5. Demonstrate encrypted document persistence, backup, restore, retention, signed download authorization, and malware scanning where required.
6. Provision the five deterministic personas plus fixtures needed to execute or formally disposition the six Phase 3 skips.
7. Enable centralized logs, metrics, queue-depth alarms, exception reporting, health monitoring, and audit-log retention.
8. Rehearse migration, rollback, database restore, and artifact restore against the exact candidate.
9. Run targeted P0 browser/API checks for payroll locks and handoff, attendance/leave, employee lifecycle, RBAC, subscription enforcement, tenant isolation, and document downloads.

### Production-only gates

- Formal change approval, immutable image digests, production secret verification, pre-deployment backup, rollback owner/window, and migration approval.
- Read-only post-deploy health and authorization smoke using approved synthetic identities.
- Business-owner sign-off for payroll, HR, finance, security/privacy, support, retention, and external integrations.
- Monitoring/alert routing and operational runbooks proven with the production topology.

## Recommendation

**GO to Phase 4B only after the staging environment satisfies the entry criteria. NO-GO for production release.** Local Docker results establish candidate deployment readiness, not production readiness.
