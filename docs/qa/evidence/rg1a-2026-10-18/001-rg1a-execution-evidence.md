# RG-1A execution evidence

Date: 2026-10-18  
Environment: isolated local PostgreSQL 16 (`hrms_rg1a`), production-built Next.js, local Django API  
Data: synthetic demo workspace inside the disposable database; no staging, production, customer, or shared Northstar database was used.

## Gate batch

- `DDG-F-027`: privileged support access and immediate revocation.
- `DDG-F-024`: locally enforceable signed payroll-artifact grant revocation and expiry behavior.

## Commands and results

```text
docker run --name hrms-rg1a-postgres -e POSTGRES_DB=hrms_rg1a -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=hrms -p 55460:5432 -d postgres:16-alpine
DJANGO_SETTINGS_MODULE=config.settings.base ... python manage.py migrate --noinput
Result: all migrations applied.

DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q tests/test_phase0_api_smoke.py -k '<RG-1A focused expression>'
Initial result: 6 passed, 1 failed. The stronger transaction exposed expiry-state rollback; fixed at the transaction boundary.
Focused rerun: 2 passed, 365 deselected.
Expanded security/artifact rerun: 12 passed, 355 deselected.

DJANGO_SETTINGS_MODULE=config.settings.base ... python manage.py check
Result: no issues.
DJANGO_SETTINGS_MODULE=config.settings.base ... python manage.py makemigrations --check --dry-run
Result: no changes detected.

pnpm --dir web typecheck
Result: passed.
pnpm --dir web lint
Result: passed.
HRMS_API_BASE_URL=http://127.0.0.1:8021/api/v1 pnpm --dir web build
Result: passed; existing CSS autoprefixer warning at globals.css:4531 retained.

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3121 PLAYWRIGHT_SKIP_WEB_SERVER=1 pnpm exec playwright test tests/e2e/phase7f-support-session-lifecycle.spec.ts --workers=1
Result: 1 passed (8.5s).

HRMS_API_BASE_URL=http://127.0.0.1:8021/api/v1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3121 PLAYWRIGHT_SKIP_WEB_SERVER=1 pnpm exec playwright test tests/e2e/phase7a-role-access-boundaries.spec.ts --workers=1 -g 'protected workspaces|workspace chooser|role-scoped pages'
Result: 3 passed (8.0s).
```

The production server was run locally with `HRMS_COOKIE_SECURE=false` only because the isolated test origin used HTTP. A first diagnostic run with production-secure cookies correctly returned `401` from cookie-authenticated mutations; this is retained as proof that secure cookies are not sent over HTTP. No deployed cookie policy was changed.

## PostgreSQL and audit observations

- Concurrent support `start` versus `revoke` leaves the grant `revoked`; stale state cannot resurrect access.
- Runtime authorization and payload construction execute under the same locked grant transaction.
- Every browser access after end/revoke returned `403 support_session_not_active` and produced tenant-scoped audit evidence.
- Signed-artifact validation and access-count mutation are atomic under a row lock.
- An expired signed grant returns denial and durably records `expired`.
- Replaying revocation through a stale model instance returns the canonical revoked row without a duplicate revocation event.
- Existing recipient, tenant, permission, access-limit, and checksum controls remained green.

## Cleanup

The Django and Next.js processes were stopped, and the `hrms-rg1a-postgres` container and its anonymous storage were removed after evidence capture. No external artifact or customer record was created.
