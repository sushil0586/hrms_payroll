# Production Operations

This folder contains versioned production runbooks and helper scripts for the
HRMS/payroll SaaS.

## Release

EC2/systemd is the primary production deployment target for this project.
Docker Compose files are optional local/reference artifacts and are not required
for EC2.

### EC2

Use `ops/ec2/README.md` for the reproducible EC2 release, rollback, nginx, and
systemd runbook.

1. Populate `/var/www/hrms-payroll-saas/shared/backend.env` from
   `backend/.env.example` and `docs/payroll-production-env-template.md`.
2. Deploy a timestamped release:

   ```bash
   APP_ROOT=/var/www/hrms-payroll-saas \
   REPO_URL=https://github.com/<org>/<repo>.git \
   RELEASE_REF=main \
   bash ops/ec2/deploy.sh
   ```

3. Run final launch evidence:

   ```bash
   cd /var/www/hrms-payroll-saas/current
   pnpm qa:final-production-audit
   ```

### Docker Reference

Only use this path when the target host is intentionally Docker based.

1. Populate `.env.production` from `backend/.env.example` and
   `docs/payroll-production-env-template.md`.
2. Run migrations as a release step:

   ```bash
   docker compose -f docker-compose.production.yml --profile release run --rm migrate
   ```

3. Start or update runtime services:

   ```bash
   docker compose -f docker-compose.production.yml up -d --build \
     backend web celery-worker celery-beat payroll-provider-jobs payroll-provider-retries
   ```

4. Run the production preflight and launch gate:

   ```bash
   docker compose -f docker-compose.production.yml exec backend python manage.py production_preflight --strict
   pnpm qa:launch-signoff -- --mode production
   pnpm qa:final-production-audit
   ```

## Rollback

1. Stop web traffic at the load balancer.
2. Restore the previous image tag or commit checkout.
3. Restore database only if the release included irreversible data changes.
4. Run `python manage.py check --deploy` and `python manage.py production_preflight --strict`.
5. Re-enable traffic after `/api/v1/health/` and role-login smoke checks pass.

## Backups

Use `ops/backup_postgres.sh` for logical backups and `ops/restore_postgres.sh`
for restore rehearsals. A public launch requires a successful restore rehearsal
against an isolated database, not only a backup file.

For a combined backup and isolated restore proof:

```bash
SOURCE_DATABASE_URL=postgres://... \
RESTORE_DATABASE_URL=postgres://... \
ops/backup_restore_rehearsal.sh
```

Archive the generated JSON evidence beside the final production audit report.

## Monitoring

`ops/monitoring/prometheus-rules.yml` contains the minimum production alert
rules for backend/web health, Redis, Postgres, notification failures, payroll
provider failures, and stale backup-restore evidence. Wire these to the
production Prometheus/Alertmanager stack before public launch.
