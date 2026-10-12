# Phase 4B.1 Staging Authentication, Preflight Prerequisites and Security Revalidation

Date: 2026-10-10  
Target: `https://hrms.accerio.in`  
Mode: non-destructive staging prerequisite and security revalidation.

## Objective

Resolve staging prerequisites and complete as much deployed authentication/RBAC certification as possible without weakening authentication, bypassing login controls, exposing credentials or mutating real customer data.

## Evidence

| Evidence | Result |
| --- | --- |
| `docs/qa/evidence/phase4b1/01-stage-default-persona-login-probes.log` | Sanitized login probes for default staging persona usernames. Passwords were not logged. |
| `docs/qa/evidence/phase4b1/02-staging-signoff-preflight-only.log` | Launch signoff preflight-only runner completed and reported `STAGING PREFLIGHT BLOCKED`. |
| `docs/qa/evidence/phase4b1/signoff-preflight/launch-signoff-report.md` | Missing staging env prerequisites: `HRMS_API_BASE_URL`, `PLAYWRIGHT_LIVE_SEED_PASSWORD`, provider worker flag, notification worker flag, enterprise identity posture. |
| `docs/qa/evidence/phase4b1/03-stage-root-headers-hsts-check.log` | Deployed root headers captured; `Strict-Transport-Security` was not present. |
| `docs/qa/evidence/phase4b1/04-stage-deployed-rbac-isolation-rerun.log` | Original 10 Phase 4B deployed scenarios reexecuted. Result remained 4 passed, 3 failed due invalid tenant persona credentials, 3 not run after dependent credential failures. |

## Credential Findings

Sanitized stage login probes using the default seeded password show:

| Persona username | HTTP result | Finding |
| --- | ---: | --- |
| `platform.admin` | 200 | Platform admin account exists and authenticates. Returned platform workspace permissions only; no tenant membership. |
| `nisha.rao` | 400 | Invalid credentials. Tenant HR/Tenant Admin persona is missing, password differs, inactive, or not seeded in this deployment. |
| `riya.sharma` | 400 | Invalid credentials. ESS employee persona is missing, password differs, inactive, or not seeded. |
| `karan.mehta` | 400 | Invalid credentials. MSS manager persona is missing, password differs, inactive, or not seeded. |
| `payroll.finance` | 400 | Invalid credentials. Finance persona is missing or was not provisioned by `seed_pilot_named_users`. |
| `support.agent` | 400 | Invalid credentials. Support persona is missing or was not provisioned by `seed_pilot_named_users`. |

Root-cause classification: **staging persona prerequisite / seed mismatch**. The authentication system itself is reachable and can authenticate `platform.admin`; tenant-scoped seeded personas are not ready with the expected staging password.

This pass did not prove whether the missing tenant personas are absent, inactive, assigned to another tenant, or using a different password, because direct database/host access was not available and resetting real passwords is out of scope.

## Supported Provisioning Path

Repository-supported staging provisioning exists and should be executed only by an authorized administrator on the staging host or controlled deployment runner:

```bash
cd /var/www/hrms-payroll-saas/current/backend
source /var/www/hrms-payroll-saas/shared/backend.env

# Idempotently seed Northstar demo tenant, HR/ESS/MSS personas and core tenant data.
.venv/bin/python manage.py bootstrap_demo_workspace --password "$PLAYWRIGHT_LIVE_SEED_PASSWORD"

# Idempotently seed payroll.finance and support.agent personas for certification.
.venv/bin/python manage.py seed_pilot_named_users --tenant-code northstar-foods --password "$PLAYWRIGHT_LIVE_SEED_PASSWORD"

# Seed disposable staging launch handles and write manifest for browser tests.
.venv/bin/python manage.py seed_staging_launch_data \
  --tenant-code northstar-foods \
  --password "$PLAYWRIGHT_LIVE_SEED_PASSWORD" \
  --output-file ../web/qa-artifacts/staging-launch-seed/manifest.json
```

Required environment exports for the test runner, kept in shell/CI secrets and never committed:

```bash
export PLAYWRIGHT_BASE_URL=https://hrms.accerio.in
export HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1
export PLAYWRIGHT_LIVE_SEED_PASSWORD='<secret from staging admin>'
export PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME=nisha.rao
export PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME=riya.sharma
export PLAYWRIGHT_LIVE_MANAGER_USERNAME=karan.mehta
export PLAYWRIGHT_LIVE_TENANT_ADMIN_USERNAME=nisha.rao
export PLAYWRIGHT_LIVE_PAYROLL_FINANCE_USERNAME=payroll.finance
export PLAYWRIGHT_LIVE_SUPPORT_AGENT_USERNAME=support.agent
```

Two-tenant isolation still needs a second authorized staging tenant with distinct users and records. No repository command was found that safely creates a second full tenant/persona set for deployed certification without admin/data-owner action. Use platform-admin onboarding or an approved staging-only runbook to create a second disposable tenant before marking two-tenant isolation verified.

## Strict Preflight Status

`production_preflight --strict` still was not executed on the deployed host. The repository-supported path is:

```bash
cd /var/www/hrms-payroll-saas/current/backend
source /var/www/hrms-payroll-saas/shared/backend.env
.venv/bin/python manage.py production_preflight --strict --json
```

Additional host evidence required:

```bash
cd /var/www/hrms-payroll-saas/current/backend
source /var/www/hrms-payroll-saas/shared/backend.env
.venv/bin/python manage.py check --deploy
.venv/bin/python manage.py showmigrations --plan
sudo systemctl is-active hrms-payroll-backend.service
sudo systemctl is-active hrms-payroll-web.service
sudo systemctl is-active hrms-payroll-celery-worker.service
sudo systemctl list-timers 'hrms-payroll-*' --no-pager
sudo nginx -t
```

The signoff preflight-only runner reported `STAGING PREFLIGHT BLOCKED` because required staging environment keys were missing from the local execution environment.

## HSTS Assessment

Current deployed root headers do not include `Strict-Transport-Security`. Django production settings define HSTS defaults, but the currently captured public frontend response is served through nginx/Next and does not expose HSTS.

Recommended safe policy:

1. Confirm all required `accerio.in` subdomains are HTTPS-capable before enabling `includeSubDomains`.
2. Start on staging with:

```nginx
add_header Strict-Transport-Security "max-age=300" always;
```

3. After validation and rollback confidence, increase to:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

4. Add `preload` only after business/security approval and confirmation that all subdomains meet preload requirements.

Do not enable long-lived `includeSubDomains` or preload until subdomain inventory and rollback implications are approved.

## Original 10 Scenario Revalidation

| Scenario group | Fresh Phase 4B.1 status |
| --- | --- |
| Unauthenticated privileged workspace redirects to login | Passed |
| HR admin opens HR workspace | Blocked by invalid `nisha.rao` credentials |
| Employee opens ESS and redirects away from HR Admin | Not Run after serial credential blocker |
| Manager opens MSS without HR escalation | Not Run after serial credential blocker |
| Tenant admin opens tenant control center | Not Run after serial credential blocker |
| Stale HR admin session redirects safely | Passed |
| Public landing keeps privileged workspaces behind sign-in | Passed |
| Employee payslip screen stays employee-scoped | Blocked by invalid `riya.sharma` credentials |
| Privileged mutation/support APIs fail closed without session | Passed |
| Tenant admin/support scoped access controls | Blocked by invalid `nisha.rao` credentials |

Totals: 4 Passed, 0 Failed product defects, 3 Blocked by credential prerequisite, 3 Not Run due dependent credential prerequisite.

## Gate Impact

| Gate | Phase 4B.1 status |
| --- | --- |
| `P4-GATE-003` deployment path | Still Partially Verified. Public stage smoke passes, but host release/service evidence missing. |
| `P4-GATE-004` strict preflight | Still Not Verified. Host preflight not executed. |
| `P4-GATE-005` migrations | Still Not Verified. Host migration proof missing. |
| `P4-GATE-007` HTTPS/session | Still Partially Verified. HTTPS works; HSTS missing; credentialed session/logout/revocation not verified. |
| `P4-GATE-008` nginx/security headers | Still Partially Verified. Security headers captured; `nginx -t` and HSTS update missing. |
| `P4-GATE-011` deployed role login/RBAC | Still Not Verified. Tenant personas blocked. Platform admin login works but does not satisfy role matrix. |
| `P4-GATE-012` tenant isolation | Still Partially Verified. Unauthenticated denials pass; two-tenant proof blocked. |
| `P4-GATE-013` session security | Still Partially Verified. Stale invalid session passes; logout/revocation with real personas blocked. |
| `P4-GATE-014` enterprise identity | Still Partially Verified. Required env posture missing in staging preflight. |

Gate counts remain unchanged.

## Administrator Actions Required

1. Confirm authorized staging owner and host execution path.
2. Set staging-only `PLAYWRIGHT_LIVE_SEED_PASSWORD` in a secure shell/CI secret.
3. Run the supported seed/provisioning commands on the staging host.
4. Create or approve a second disposable staging tenant with distinct users/records.
5. Export safe persona env vars for browser certification.
6. Run target-host `production_preflight --strict --json` and archive sanitized output.
7. Capture `check --deploy`, migration plan/status, service status, timer list and `nginx -t`.
8. Add/verify safe HSTS policy after subdomain and rollback review.
9. Reexecute the original 10 deployed scenarios and the two-tenant isolation suite.

## Verdict

Phase 4B.1 is **Blocked for full certification** by staging prerequisites, not by a confirmed RBAC/authentication product defect.

Verified in this focused pass:

- platform admin authentication works;
- unauthenticated privileged routing and mutation denial still pass;
- staging launch signoff preflight correctly blocks when required env posture is absent.

Pending:

- tenant persona provisioning;
- two-tenant isolation fixtures;
- target-host strict preflight;
- HSTS configuration proof;
- host service/timer/migration evidence.

## Local Dev Rehearsal - 2026-10-10

At the user's request, the same provisioning path was rehearsed locally against a clean dedicated SQLite database:

`backend/db.phase4b1_local_rehearsal.sqlite3`

Commands executed locally:

```bash
DJANGO_SETTINGS_MODULE=config.settings.local \
DJANGO_DB_ENGINE=django.db.backends.sqlite3 \
POSTGRES_DB=/Users/ansh/Documents/hrms-payroll-saas/backend/db.phase4b1_local_rehearsal.sqlite3 \
../.venv/bin/python manage.py migrate --noinput

../.venv/bin/python manage.py bootstrap_demo_workspace --password Password@123
../.venv/bin/python manage.py seed_pilot_named_users --tenant-code northstar-foods --password Password@123
../.venv/bin/python manage.py seed_staging_launch_data --tenant-code northstar-foods --password Password@123 --output-file ../web/qa-artifacts/staging-launch-seed/manifest.json
```

Local evidence:

| Evidence | Result |
| --- | --- |
| `docs/qa/evidence/phase4b1-local/01-migrate.log` | Clean local rehearsal DB migrated successfully. |
| `docs/qa/evidence/phase4b1-local/02-bootstrap-demo-workspace.log` | Seeded demo tenant and HR/ESS/MSS/platform personas. |
| `docs/qa/evidence/phase4b1-local/03-seed-pilot-named-users.log` | Seeded `payroll.finance` and `support.agent`. |
| `docs/qa/evidence/phase4b1-local/04-seed-staging-launch-data.log` | Seeded disposable notification/payslip handles and manifest. |
| `docs/qa/evidence/phase4b1-local/05-persona-db-verification.log` | All six local users exist, are active, accept `Password@123`, and have expected tenant roles where applicable. |
| `docs/qa/evidence/phase4b1-local/07-local-rbac-isolation-playwright.log` | Original 10 Phase 4B browser scenarios passed locally. |

Local rehearsal result: **10 Passed, 0 Failed, 0 Blocked, 0 Not Run**.

Interpretation: the supported provisioning commands work in a clean local database and the original browser scenarios pass when the personas are correctly seeded. This supports the staging root-cause classification as a staging seed/provisioning mismatch. It does **not** replace deployed staging certification; `P4-GATE-011`, `P4-GATE-012`, `P4-GATE-013` and `P4-GATE-004` remain unchanged until rerun on `https://hrms.accerio.in` with valid stage personas and host preflight evidence.
