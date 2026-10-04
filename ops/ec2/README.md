# EC2 Production Deployment

This is the EC2-only production path. Docker is not required for this target.

## Host Layout

- App root: `/var/www/hrms-payroll-saas`
- Active release: `/var/www/hrms-payroll-saas/current`
- Timestamped releases: `/var/www/hrms-payroll-saas/release-<release-id>`
- Shared config and data: `/var/www/hrms-payroll-saas/shared`
- Backend environment: `/var/www/hrms-payroll-saas/shared/backend.env`
- Web environment: `/var/www/hrms-payroll-saas/shared/web.env`

Use the existing host service identity:

```bash
sudo mkdir -p /var/www/hrms-payroll-saas/{shared/static,shared/media}
sudo chown -R ubuntu:www-data /var/www/hrms-payroll-saas
```

Install host dependencies with your AMI package manager:

```bash
sudo apt-get update
sudo apt-get install -y git nginx postgresql-client redis-tools python3 python3-venv nodejs npm
sudo npm install -g corepack
corepack enable
```

## Environment

Create `/var/www/hrms-payroll-saas/shared/backend.env` from
`backend/.env.example`, with production values:

```bash
DJANGO_SETTINGS_MODULE=config.settings.production
HRMS_ENVIRONMENT=production
HRMS_ENABLE_DEMO_DATA=false
DJANGO_ALLOWED_HOSTS=your-domain.example
DJANGO_CSRF_TRUSTED_ORIGINS=https://your-domain.example
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SECRET_KEY=<secret>
POSTGRES_DB=<db>
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>
POSTGRES_HOST=<rds-or-local-postgres-host>
POSTGRES_PORT=5432
REDIS_URL=redis://127.0.0.1:6379/0
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=<smtp-host>
DJANGO_EMAIL_HOST_USER=<smtp-user>
DJANGO_EMAIL_HOST_PASSWORD=<smtp-password>
DJANGO_DEFAULT_FROM_EMAIL=<verified-sender>
DJANGO_SERVER_EMAIL=<verified-sender>
HRMS_NOTIFICATION_WORKER_ENABLED=true
HRMS_PAYROLL_PROVIDER_WORKER_ENABLED=true
PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE=strict
HRMS_ENTERPRISE_IDENTITY_STATUS=not_in_scope
HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON='<json-object>'
HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON='<json-object>'
HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON='<json-object>'
```

Use single quotes around JSON values when the env file is sourced by shell
scripts. Put Next.js runtime variables in
`/var/www/hrms-payroll-saas/shared/web.env`.

For staging/QA only, while real provider and storage credentials are still in
backlog, apply non-secret contract gates:

```bash
bash /var/www/hrms-payroll-saas/current/ops/ec2/apply_stage_contract_env.sh
```

Do not use the contract gate helper for final production launch evidence.

## First Deploy

Run from the EC2 host:

```bash
sudo env APP_ROOT=/var/www/hrms-payroll-saas \
  REPO_URL=https://github.com/<org>/<repo>.git \
  RELEASE_REF=main \
  bash /path/to/repo/ops/ec2/deploy.sh
```

To deploy from a checked-out working tree instead of cloning:

```bash
sudo env APP_ROOT=/var/www/hrms-payroll-saas \
  SOURCE_DIR=/home/ubuntu/hrms-payroll-saas \
  bash /home/ubuntu/hrms-payroll-saas/ops/ec2/deploy.sh
```

Set `INSTALL_NGINX_CONFIG=true` on the first run if you want the script to
install `ops/ec2/nginx/hrms.conf`. Afterward, issue a TLS certificate with your
standard ACME/ALB process and reload nginx.

## Runtime Services

The deployment installs and restarts:

- `hrms-payroll-backend.service`: Django API via gunicorn on `127.0.0.1:8020`
- `hrms-payroll-web.service`: Next.js on `127.0.0.1:3020`
- `hrms-payroll-celery-worker.service`: Celery worker
- `hrms-payroll-notification-worker.timer`: pending notification delivery
- `hrms-payroll-provider-jobs.timer`: provider queue processing
- `hrms-payroll-provider-retries.timer`: provider retry processing

Check status:

```bash
sudo systemctl status hrms-payroll-backend hrms-payroll-web hrms-payroll-celery-worker
sudo systemctl list-timers 'hrms-payroll-*'
```

## Rollback

Rollback to the previous release:

```bash
APP_ROOT=/var/www/hrms-payroll-saas sudo bash /var/www/hrms-payroll-saas/current/ops/ec2/rollback.sh
```

Rollback to a specific release:

```bash
APP_ROOT=/var/www/hrms-payroll-saas TARGET_RELEASE=20261004120000 \
  sudo bash /var/www/hrms-payroll-saas/current/ops/ec2/rollback.sh
```

Rollback changes the `current` symlink, restarts runtime services, and reruns
`production_preflight --strict`. Restore the database only when a release made
irreversible data changes and the restore has been rehearsed.

## Required Evidence

Before public launch, archive:

- `python manage.py production_preflight --strict`
- `python manage.py verify_email_delivery --to <controlled-mailbox>`
- `pnpm qa:final-production-audit`
- `ops/backup_restore_rehearsal.sh` output
- systemd service status and timer list
- nginx config test output
