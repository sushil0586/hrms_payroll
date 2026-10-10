# Phase 4B Production Environment Hardening Report

Date: 2026-10-10  
Mode: repository/configuration inspection plus non-destructive static preflight only.

## Scope

Phase 4B was requested to certify the production-target environment, strict preflight, authentication, RBAC, tenant isolation and deployed security posture.

No confirmed deployed target authorization, live credentials or approved disposable production/pilot tenant credentials were available in this session. Because of that, no deployed browser login, production mutation, real email/SMS, real payment, provider submission, secret rotation or infrastructure change was executed.

## Target Environment

| Item | Result |
| --- | --- |
| Candidate public URL references | Historical docs/scripts reference `https://hrms.accerio.in` |
| Confirmed authorized target for Phase 4B | Not confirmed |
| Live credentials in shell | None detected for `PLAYWRIGHT_*`, `HRMS_*`, `DJANGO_*`, `POSTGRES_*`, `REDIS_*`, `DATABASE_URL` |
| Local env files | Present, keys inventoried with values redacted |
| Deployment architecture in repo | EC2/systemd primary, Docker Compose reference |
| Production DB expectation | PostgreSQL |
| Runtime workers | Django backend, Next.js web, Celery worker, notification timer, payroll provider jobs/retries timers |
| HTTPS/TLS | Production Django settings require secure cookies/SSL redirect/HSTS; nginx sample listens on port 80 and expects external ACME/ALB/TLS process |

## Evidence Captured

| Evidence | Result | Notes |
| --- | --- | --- |
| `docs/qa/evidence/phase4b/01-local-env-key-inventory-redacted.log` | Captured | Lists local env keys only; values redacted. Local env lacks production notification/email/provider/storage launch variables. |
| `02-static-production-preflight-skip-network.json` | Passed | `production_preflight --strict --skip-network --json` passed using sanitized production-shaped variables. This proves the preflight gate is executable, not that production is verified. |
| `03-deployment-surface-inventory.json` | Captured | Confirms deployment, smoke, final audit, Playwright RBAC and tenant-isolation files exist. |
| `04-django-check-deploy-static.log` | Failed as expected under incomplete local env | Demonstrates local env is not production-ready: live email backend and notification processor were missing. |
| `05-django-check-deploy-static-production-shaped.log` | Passed with warnings | `check --deploy` returned exit code 0 using sanitized production-shaped env. Warnings are mostly DRF schema serializer/operationId warnings; no system-check error remained. |

## Relevant Gate Mapping

| Gate | Phase 4B result | Status after Phase 4B |
| --- | --- | --- |
| `P4-GATE-003` deployment path | EC2/Docker manifests and runbooks inspected; no target deploy executed | Partially Verified |
| `P4-GATE-004` strict target preflight | Static skip-network preflight passed; target/network preflight not executed | Not Verified |
| `P4-GATE-005` target migrations | CI/repo path exists; target migration status not verified | Not Verified |
| `P4-GATE-006` rollback | Rollback script exists; no staging/target rehearsal | Partially Verified |
| `P4-GATE-007` HTTPS/session | Secure Django defaults exist; deployed headers/cookies not verified | Partially Verified |
| `P4-GATE-008` nginx/security headers | nginx sample has security headers; TLS install not verified | Partially Verified |
| `P4-GATE-009` secrets | Env templates and redacted local key inventory reviewed; secret manager/production env proof absent | Partially Verified |
| `P4-GATE-010` BasicAuth disabled | Production settings/preflight confirm BasicAuthentication disabled | Verified |
| `P4-GATE-011` deployed role login/RBAC | Not executed; no approved live personas | Not Verified |
| `P4-GATE-012` deployed tenant isolation | Not executed; local Phase 3C two-tenant evidence only | Partially Verified |
| `P4-GATE-013` deployed session security | Not executed; local stale-session evidence only | Partially Verified |
| `P4-GATE-014` enterprise identity posture | Preflight supports `verified` / `not_in_scope`; owner decision not recorded for target | Partially Verified |

## Configuration and Infrastructure Risks

| Risk | Severity | Evidence | Required remediation |
| --- | --- | --- | --- |
| No confirmed target/authorization for deployed checks | P0 | No live env vars or credentials available | Identify target, owner approval, evidence directory and safe test personas before Phase 4B deployed certification. |
| Target strict preflight not executed | P0 | Only static `--skip-network` preflight passed | Run `production_preflight --strict --json` on target with real Postgres, Redis, email, worker, provider and storage configuration. |
| Deployed RBAC and tenant isolation not verified | P0 | Local Phase 3C evidence only | Run deployed Playwright RBAC and two-tenant isolation suites with approved disposable accounts. |
| Local env is not production-ready | P0 if accidentally used for launch | `04-django-check-deploy-static.log` failed on email/notification gates | Do not use local `.env` for production; create protected target env from production templates. |
| TLS termination proof absent | P0 | nginx sample listens on 80; EC2 README delegates cert to ACME/ALB | Capture deployed HTTPS headers, secure cookies and HSTS evidence. |
| Secret manager / protected env proof absent | P0 | templates exist only | Provide redacted proof of production secret source, access controls and rotation owner. |
| Target worker/timer status absent | P0 | systemd/Docker definitions exist only | Capture `systemctl status` / timer list or Docker service health from target. |

## Authentication, RBAC and Tenant Isolation

No deployed browser or API authentication was executed because target identity and credentials were not confirmed.

Prepared executable procedures:

1. Set `PLAYWRIGHT_BASE_URL` and `HRMS_API_BASE_URL` to the approved target.
2. Provide approved disposable credentials for Platform Admin, Tenant Admin, HR Admin, ESS, MSS, Payroll, Finance, Support and Restricted personas through environment variables, never committed files.
3. Run:

```bash
pnpm --dir web exec playwright test \
  tests/e2e/deployed-readonly-auth-routing.spec.ts \
  tests/e2e/production-tenant-role-isolation.spec.ts \
  --project=chromium --workers=1
```

4. Archive screenshots, traces and sanitized API denial payloads.
5. Update `P4-GATE-011`, `P4-GATE-012` and `P4-GATE-013` only after successful deployed evidence.

## Strict Preflight Procedure

Target command, to be run only on the authorized deployment:

```bash
cd /var/www/hrms-payroll-saas/current/backend
source /var/www/hrms-payroll-saas/shared/backend.env
python manage.py production_preflight --strict --json
```

Acceptance:

- exit code 0;
- `failed_blocker_count: 0`;
- database and Redis network checks pass;
- email backend/connectivity pass;
- notification worker or processor declared;
- payroll provider worker declared;
- provider credentials configured;
- artifact storage credentials and strict controls pass;
- no secrets printed in evidence.

## Phase 4B Verdict

| Area | Verdict |
| --- | --- |
| Repository deployment readiness | Partially Verified |
| Static production-shaped preflight executability | Verified |
| Target strict preflight | Not Verified |
| Deployed authentication/RBAC | Not Verified |
| Deployed two-tenant isolation | Not Verified |
| Deployed session security | Not Verified |

Phase 4B is not fully certified. The project is ready to execute Phase 4B deployed verification once an authorized target, safe credentials and evidence location are supplied.

## Readiness for Phase 4C

Not ready to proceed to Phase 4C deployed RBAC certification as an evidence-producing phase. Required first:

1. confirm target environment and owner approval;
2. provide safe disposable personas and two test tenants;
3. run target `production_preflight --strict`;
4. capture deployment/service/TLS/security evidence.
