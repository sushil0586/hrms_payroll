# RG-1B Local Preparation Evidence

Date: 2026-10-18

## Commands and results

- `backend/.venv/bin/python -m pytest backend/tests/test_staging_configuration.py -q`: **3 passed**.
- `python3 ops/staging/validate_staging_config.py --env-file ops/staging/staging.env.example --json`: **exit 1 as designed** because checked-in examples contain placeholders.
- `docker compose -f ops/staging/docker-compose.staging.yml config --quiet` with synthetic digest references: **passed**.
- Django `check --deploy` with an intentionally incomplete production-like environment: **failed closed** on live email and notification-worker requirements.
- Django `check --deploy` with complete synthetic secure settings: **passed**, retaining pre-existing OpenAPI warnings.
- Django `production_preflight --strict --skip-network --json` with synthetic contract references: **passed, 22/22 gates, 0 blockers**. Network/provider behavior was intentionally not claimed.
- `backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run`: **passed; no migration drift**.
- Disposable PostgreSQL 16 backup/restore rehearsal using `ops/backup_restore_rehearsal.sh`: **passed**; SHA-256 recorded, one public table restored, probe value `preserved` matched.
- `pnpm --dir web typecheck`: **passed**.
- `pnpm --dir web lint`: **passed**.
- `pnpm --dir web build`: **passed**; existing `globals.css` autoprefixer warning retained.
- `docker build -f backend/Dockerfile -t hrms-rg1b-backend:local .`: **passed**; temporary image tag removed.
- Cleanup: **0** `rg1b-*` containers remained.

No staging endpoint, certificate, managed database, broker, object store, scanner, SMTP provider, monitoring service, or customer data was contacted.

## Limits

The restore rehearsal was local, unencrypted, and not off-host. The proxy and Compose files were rendered/static-validated only. These results prepare but do not pass any externally dependent staging gate.
