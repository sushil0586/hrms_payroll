# Phase 4B Production Environment Hardening Report

Date: 2026-10-10  
Target: `https://hrms.accerio.in`  
Mode: non-destructive deployed stage verification plus repository/configuration inspection.

## Scope

Phase 4B verifies the production-target deployment posture, strict preflight readiness, authentication/RBAC, tenant isolation and security configuration.

The stage deployment was confirmed reachable. No production data mutation, real email/SMS, payment transaction, provider submission, secret rotation or infrastructure change was executed.

## Target Environment

| Item | Result |
| --- | --- |
| Target URL | `https://hrms.accerio.in` |
| Public frontend | Next.js app served by `nginx/1.28.3 (Ubuntu)` |
| Backend health | `/api/v1/health/` returns `{"status": "ok", "service": "hrms-backend"}` |
| Login page | `/login` returns HTTP 200 |
| TLS certificate | Let's Encrypt certificate for `hrms.accerio.in`, valid 2026-09-08 through 2026-12-07 |
| Deployment architecture in repo | EC2/systemd primary; Docker Compose reference exists |
| Production DB expectation | PostgreSQL |
| Runtime workers expected | Django backend, Next.js web, Celery/worker paths, notification processing, payroll provider jobs/retries |
| Local credential env | No `PLAYWRIGHT_*`, `HRMS_*`, `DJANGO_*`, `POSTGRES_*`, `REDIS_*`, or `DATABASE_URL` vars detected in shell |

## Evidence Captured

| Evidence | Result | Notes |
| --- | --- | --- |
| `docs/qa/evidence/phase4b/06-stage-public-health-headers.log` | Passed | Root, API health and login return HTTP 200. Security headers include `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. |
| `docs/qa/evidence/phase4b/07-stage-env-key-inventory-redacted.log` | Captured | Empty inventory: no safe persona or deployment secret env vars available in local shell. |
| `docs/qa/evidence/phase4b/08-stage-post-deploy-smoke.log` | Passed | `scripts/hrms-post-deploy-smoke.sh` passed against `https://hrms.accerio.in` with API/root/login all HTTP 200. Systemd checks were intentionally disabled because this was run remotely. |
| `docs/qa/evidence/phase4b/09-stage-tls-certificate.log` | Passed | Certificate subject/SAN match `hrms.accerio.in`; issuer Let's Encrypt; certificate currently valid. |
| `docs/qa/evidence/phase4b/10-stage-deployed-rbac-isolation-playwright.log` | Partial / blocked by credentials | 10 deployed browser scenarios attempted. 4 passed, 3 failed due invalid default stage credentials, 3 did not run because serial/dependent credentialed checks stopped. |

## Deployed Browser Security Results

| Area | Result | Evidence |
| --- | --- | --- |
| Unauthenticated privileged workspace routing | Passed | `/hr-admin` redirects to `/login`. |
| Stale invalid HR admin session | Passed | Invalid cookie redirects to login and does not crash workspace. |
| Public landing privileged boundary | Passed | Public page renders without privileged workspace exposure. |
| Unauthenticated privileged mutation/support APIs | Passed | Negative API checks fail closed without exposing sensitive payloads. |
| HR Admin credentialed workspace | Failed / blocked by credentials | Default `nisha.rao` returned HTTP 400 `Invalid credentials`. |
| ESS employee credentialed scope | Failed / blocked by credentials | Default `riya.sharma` returned HTTP 400 `Invalid credentials`. |
| Tenant admin/support scoped access | Failed / blocked by credentials | Default `nisha.rao` returned HTTP 400 `Invalid credentials`. |
| Manager, tenant-admin serial checks in auth suite | Not Run | Dependent checks were not executed after serial credential failure. |

Classification: this is a stage credential/prerequisite blocker, not evidence of an RBAC product defect. Deployed RBAC and tenant isolation cannot be certified until approved stage personas are available.

## Strict Preflight Status

`production_preflight --strict` was not executed on the deployed host in this pass because no host shell/SSH execution context or approved target env access was available.

Current proof:

- Public deployed smoke: verified.
- Target host strict preflight with DB/Redis/email/provider/storage network checks: not verified.
- Service/timer status from target host: not verified.
- Migration status from target host: not verified.

Required target-host command:

```bash
cd /var/www/hrms-payroll-saas/current/backend
source /var/www/hrms-payroll-saas/shared/backend.env
python manage.py production_preflight --strict --json
```

Acceptance:

- exit code 0;
- `failed_blocker_count: 0`;
- Postgres and Redis network checks pass;
- live email backend/connectivity pass or approved launch exclusion is recorded where supported;
- notification processing/worker declared;
- payroll provider worker declared;
- provider credentials configured or formally excluded for stage scope;
- storage credentials/policies/strict controls pass;
- no secrets printed in evidence.

## Relevant Gate Mapping

| Gate | Phase 4B result | Status after Phase 4B |
| --- | --- | --- |
| `P4-GATE-003` deployment path | Stage URL is live; repo deployment path exists; host release/service evidence not captured | Partially Verified |
| `P4-GATE-004` strict target preflight | Not run on target host | Not Verified |
| `P4-GATE-005` target migrations | API health implies app can reach backend dependencies, but migration status was not inspected on host | Not Verified |
| `P4-GATE-006` rollback | Rollback script exists; no stage rehearsal evidence | Partially Verified |
| `P4-GATE-007` HTTPS/session | HTTPS/TLS certificate verified; secure cookies/session behavior partially checked through redirects; HSTS not observed in captured headers | Partially Verified |
| `P4-GATE-008` nginx/security headers | Deployed headers captured for public/login/API responses; `nginx -t` not captured from host | Partially Verified |
| `P4-GATE-009` secrets | No secrets exposed; protected target secret source not proven | Partially Verified |
| `P4-GATE-010` BasicAuth disabled | Production settings/preflight code confirm BasicAuthentication disabled | Verified |
| `P4-GATE-011` deployed role login/RBAC | Attempted, but credentialed checks blocked by invalid default stage personas | Not Verified |
| `P4-GATE-012` deployed tenant isolation | Unauthenticated negative checks passed; two-tenant credentialed proof not executed | Partially Verified |
| `P4-GATE-013` deployed session security | Stale invalid cookie and unauth redirect passed; logout/revocation with real personas not verified | Partially Verified |
| `P4-GATE-014` enterprise identity posture | Owner-approved stage identity posture not recorded | Partially Verified |

## P0/P1 Risks and Blockers

| Risk | Severity | Current evidence | Required remediation |
| --- | --- | --- | --- |
| Target strict preflight not executed on host | P0 | Public smoke passed only | Run `production_preflight --strict --json` on stage host and archive sanitized output. |
| Approved stage personas unavailable/invalid | P0 | Deployed Playwright login returned HTTP 400 invalid credentials | Provision or provide safe stage credentials for Platform Admin, Tenant Admin, HR Admin, ESS, MSS, Payroll, Finance and Restricted personas. |
| Deployed two-tenant isolation not proven | P0 | Only unauthenticated negative checks passed | Execute two-tenant browser/API negative proof with distinct stage tenants and users. |
| HSTS not observed in captured public headers | P0/P1 depending launch policy | TLS works, but captured headers do not include `Strict-Transport-Security` | Verify nginx/TLS termination config and add HSTS if production policy requires it. |
| Host service/timer/migration evidence absent | P0 | Smoke verifies externally reachable services only | Capture systemd/Docker service status, timer list, migration status and release commit from host. |
| Secret manager/protected env proof absent | P0 | Local shell contains no relevant secrets; no secrets exposed | Provide redacted proof of stage/prod secret source, owners and access controls. |

## Phase 4B Verdict

| Area | Verdict |
| --- | --- |
| Stage public availability | Verified |
| Stage post-deploy smoke | Verified |
| TLS certificate for stage domain | Verified |
| Deployed unauthenticated security boundaries | Partially Verified |
| Target strict preflight | Not Verified |
| Deployed credentialed authentication/RBAC | Not Verified |
| Deployed two-tenant isolation | Partially Verified only for unauthenticated negative checks |
| Deployed session security | Partially Verified |

Phase 4B is partially complete. Stage is live and basic security smoke passes, but production-environment certification is not complete because strict host preflight, approved stage personas, two-tenant proof and host operational evidence are still missing.

## Readiness for Phase 4C

Not ready for Phase 4C as a full evidence-producing RBAC/tenant-isolation certification until:

1. safe stage personas are provisioned and validated;
2. two distinct stage tenants and negative isolation fixtures are available;
3. target-host `production_preflight --strict` evidence is captured;
4. host service/timer/migration/release evidence is archived.

Phase 4C can begin as a limited preparation pass, but not as certification.

## Phase 4B.1 Focused Revalidation - 2026-10-10

Phase 4B.1 revalidated staging prerequisites and the original 10 deployed browser scenarios. Detailed report: `docs/qa/18-phase4b1-staging-auth-preflight-revalidation.md`.

Fresh findings:

- `platform.admin` authenticates successfully on stage with the default seed password and has platform-only permissions.
- Tenant-scoped default personas `nisha.rao`, `riya.sharma`, `karan.mehta`, `payroll.finance` and `support.agent` still return HTTP 400 `Invalid credentials`.
- The original 10 deployed scenarios were reexecuted: 4 Passed, 3 Blocked by invalid tenant persona credentials, 3 Not Run after dependent serial credential failure.
- Staging launch signoff preflight-only reported `STAGING PREFLIGHT BLOCKED` due missing local staging env posture: `HRMS_API_BASE_URL`, `PLAYWRIGHT_LIVE_SEED_PASSWORD`, worker flags and enterprise identity posture.
- Deployed headers still do not include `Strict-Transport-Security`.

Updated classification: the credential issue is a staging provisioning/seed mismatch, not a confirmed authentication product defect. Full Phase 4B certification remains blocked until authorized tenant personas, two tenants and host preflight evidence are available.

Local rehearsal note: the supported provisioning path was executed successfully against `backend/db.phase4b1_local_rehearsal.sqlite3`, and the original 10 deployed-auth browser scenarios passed locally. Evidence is under `docs/qa/evidence/phase4b1-local/` and summarized in `docs/qa/18-phase4b1-staging-auth-preflight-revalidation.md`. This supports the seed-mismatch diagnosis but does not change deployed gate status.

## Phase 4B.2 Actual Staging Revalidation - 2026-10-10

Detailed report: `docs/qa/19-phase4b2-staging-auth-rbac-preflight-certification.md`.

Fresh deployed evidence:

- Host identity verified through SSH: EC2 target reachable, current release path is `/var/www/hrms-payroll-saas/release-20260914023312`, and protected backend env exists.
- Read-only tenant/account inventory confirmed supplied personas are scoped to sandbox tenant `accerio-india`. One active non-sandbox tenant also exists, so no blind seed/bootstrap/provisioning was run.
- Supplied staging personas: 5 of 6 authenticated; Platform Admin credential remained unavailable.
- Target-host `production_preflight --strict --json` executed and failed one P0 blocker: `auth.basic_disabled`.
- Follow-up auth-class proof confirmed the deployed app includes `rest_framework.authentication.BasicAuthentication`.
- Host services: backend and web active, Redis/Postgres active, notification worker timer active, nginx config test successful.
- Deployed headers still do not include `Strict-Transport-Security`.
- Original 10 deployed browser scenarios reran with valid supplied personas: 8 Passed, 2 Failed, 0 Blocked, 0 Not Run.

Updated classification: Phase 4B is now blocked by a real deployed security hardening issue, not only missing credentials. `P4-GATE-004` and `P4-GATE-010` cannot be certified until BasicAuthentication is removed from deployed REST auth classes and strict preflight passes. `P4-GATE-011` is partially verified only; full role matrix, Platform Admin proof, Payroll/Finance/Support proof and the two failed browser assertions remain open. `P4-GATE-012` remains partially verified because two-tenant proof is still blocked by missing authorized second-tenant staging personas.

## Phase 4B.3 Final Revalidation - 2026-10-10

Detailed report: `docs/qa/20-phase4b3-staging-security-final-revalidation.md`.

Final staging evidence:

- `production_preflight --strict --json` passed on the deployed staging host with `failed_blocker_count: 0`.
- Deployed DRF authentication classes are TokenAuthentication and SessionAuthentication only; BasicAuthentication is absent.
- Root, login and API-health HTTPS responses include `Strict-Transport-Security: max-age=300` plus the existing frame/content/referrer/permissions headers.
- Original 10 deployed browser auth/security scenarios passed.
- Platform Admin credential proof passed with a disposable staging-only superuser; the disposable privileged users were deactivated after evidence capture.
- Two-tenant browser isolation passed with disposable sandbox tenants.
- Focused Platform Admin API proof passed: Platform Admin could access platform APIs; HR/Tenant persona was denied platform APIs and mutations without sensitive leakage.

Phase 4B status after 4B.3: **Certified for deployed staging authentication, RBAC, strict preflight, HSTS pilot posture and tenant-isolation evidence**.

Remaining launch gates are outside this Phase 4B scope: payroll bank-account decision, provider conditionals, real external email/SMS proof or approved exclusion, backup/restore rehearsal, monitoring/alerting and final production HSTS policy hardening.
