# Public Launch AWS Production Hardening Checklist

Date: 2026-09-13  
Product: HRMS Payroll SaaS  
Parent plan: `docs/qa/public-launch-readiness-phase-plan-2026-09-13.md`  
Phase: PL-1 Production AWS Architecture And Environment Hardening  
Status: Draft for execution

## Purpose

This checklist turns PL-1 into an executable production-readiness path. It is designed for a minimum launch on AWS using EC2, Nginx, systemd, Postgres, object storage, backups, and monitoring.

The product can later move to ECS/Fargate or a managed deployment pipeline, but public launch does not need to wait for that if EC2 production is hardened properly.

## Recommended Minimum AWS Shape

| Layer | Minimum launch recommendation | Notes |
| --- | --- | --- |
| DNS | Route 53 hosted zone | Production domain should be separate from staging. |
| TLS | ACM if using ALB/CloudFront; Certbot if direct EC2 Nginx | Track expiry alert either way. |
| Compute | EC2 Ubuntu LTS | Start simple; use systemd for backend/web services. |
| Reverse proxy | Nginx | Terminate TLS or sit behind ALB. |
| Backend | Django/Gunicorn systemd service | Production settings only. |
| Frontend | Next.js standalone/node systemd service | Built artifact per release. |
| Database | RDS Postgres preferred; EC2 Postgres acceptable only for early controlled launch | RDS gives backup/restore and patching advantage. |
| Static/media/artifacts | S3 private bucket | Use signed access; never public payroll artifacts. |
| Secrets | AWS Secrets Manager or SSM Parameter Store | No production secrets in repo or shell history. |
| Monitoring | CloudWatch agent + alarms | Disk, CPU, memory, service health, HTTP health, SSL expiry. |
| Error tracking | Sentry or equivalent | Strongly recommended before public launch. |
| Backups | RDS automated + manual restore drill; or pg_dump with S3 retention | Restore proof is mandatory. |

## Environment Separation

Required:

- Production has its own database.
- Production has its own S3 bucket or storage prefix.
- Production has its own secret namespace.
- Production has its own domain.
- Production has its own Django settings module.
- Production cannot accidentally use staging API base URL.
- Staging cannot accidentally use production secrets.

Suggested naming:

| Item | Suggested value |
| --- | --- |
| Domain | `app.yourdomain.com` or `hrms.yourdomain.com` |
| Backend API | same domain under `/api/v1` behind Nginx |
| Secret prefix | `/hrms-payroll/prod/...` |
| S3 bucket | `hrms-payroll-prod-artifacts` |
| Database | `hrms_payroll_prod` |
| Services | `hrms-payroll-backend.service`, `hrms-payroll-web.service` |
| Release root | `/var/www/hrms-payroll-saas` |

## PL-1A: AWS Account, Network, And Host Baseline

Tasks:

- Confirm AWS account owner and billing alerts.
- Create production IAM admin path with MFA.
- Create least-privilege IAM user/role for deployment.
- Create VPC/subnet/security group or confirm default VPC is acceptable for first launch.
- Restrict SSH to trusted IPs where possible.
- Disable password SSH login.
- Confirm key rotation owner.
- Install OS security updates.
- Configure server timezone and NTP.
- Configure uncomplicated firewall or security group for:
  - `22` SSH restricted.
  - `80` HTTP for redirect/cert issuance.
  - `443` HTTPS public.
  - Database port private only.

Exit criteria:

- SSH is controlled.
- Public ports are limited.
- Billing alert exists.
- Server identity and owner are documented.

Evidence:

- Security group screenshot or command output.
- IAM/MFA confirmation.
- Host baseline notes.

## PL-1B: Domain, TLS, And Nginx

Tasks:

- Create Route 53 `A`/`CNAME` record.
- Configure Nginx server block for production domain.
- Configure HTTPS.
- Redirect HTTP to HTTPS.
- Configure max body size for document uploads.
- Configure proxy timeouts for report exports.
- Configure `/api/` to backend service.
- Configure frontend routes to web service.
- Configure `/health` or equivalent health endpoint.
- Add basic security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` or application-approved value.
  - `Referrer-Policy`
  - `Strict-Transport-Security` after HTTPS is stable.

Exit criteria:

- `https://<prod-domain>/login` returns HTTP `200`.
- `https://<prod-domain>/` returns HTTP `200` or expected workspace chooser.
- HTTP redirects to HTTPS.
- SSL certificate expiry date is recorded.

Evidence commands:

```bash
curl -I https://<prod-domain>/login
curl -I https://<prod-domain>/
openssl s_client -connect <prod-domain>:443 -servername <prod-domain> </dev/null 2>/dev/null | openssl x509 -noout -dates
```

## PL-1C: Production Secrets And Environment

Tasks:

- Create production backend env from `backend/.env.example`.
- Create production web env from `web/.env.example`.
- Store secrets in AWS Secrets Manager or SSM Parameter Store.
- Configure:
  - Django secret key.
  - Production database URL.
  - Allowed hosts.
  - CSRF trusted origins.
  - CORS policy if required.
  - API base URL.
  - Storage provider settings.
  - Email provider settings.
  - Error monitoring DSN.
  - Payroll provider credentials as disabled/sandbox unless certified.
- Confirm `DEBUG=false`.
- Confirm demo data is disabled.
- Confirm production does not log secrets.
- Run HRMS deploy checks with `manage.py check --deploy`.
- Review the HR Admin `Production-safe settings` guardrail before go-live.

Exit criteria:

- Production starts without secrets in repo.
- Production environment has no staging URL/secret by mistake.
- Secret rotation owner is documented.

Evidence:

- Redacted env inventory.
- Secret manager path list without secret values.
- Production boot logs showing successful settings load.
- `manage.py check --deploy` output with no `hrms.E*` errors.
- HR Admin launch guard screenshot or Playwright result.

## PL-1D: Database And Backup

Preferred path:

- Use RDS Postgres.
- Enable automated backups.
- Enable deletion protection.
- Restrict DB access to application security group.
- Configure maintenance window.
- Configure backup retention.

Acceptable early path:

- EC2-hosted Postgres only for controlled first launch.
- Must have automated `pg_dump` to S3.
- Must have restore drill before public use.

Tasks:

- Run migrations.
- Create production superuser/platform admin through approved command.
- Verify database encoding/timezone.
- Configure backup schedule.
- Run first backup.
- Restore backup into scratch DB.
- Run verification query.
- Drop scratch DB after proof.

Exit criteria:

- Backup exists.
- Restore has been proven.
- Recovery owner and process are documented.

Evidence commands:

```bash
python backend/manage.py migrate --settings=config.settings.production
python backend/manage.py check --deploy --settings=config.settings.production
pg_dump --format=custom --file=/tmp/hrms_prod_$(date +%Y%m%dT%H%M%S).dump "$DATABASE_URL"
```

## PL-1E: Object Storage And Payroll Artifact Security

Tasks:

- Create private S3 bucket.
- Block public access.
- Enable server-side encryption.
- Enable bucket versioning if acceptable.
- Configure lifecycle retention.
- Configure application storage credentials.
- Run upload/download smoke.
- Run signed artifact access test.
- Verify unauthorized artifact access fails.
- Verify export audit records artifact access where required.

Exit criteria:

- Payroll artifacts are never public.
- Signed URLs expire.
- Revoked/unauthorized access fails.
- Storage access is audited.

Evidence:

- Bucket public access block screenshot or CLI output.
- Signed artifact Playwright result.
- Export audit sample.

## PL-1F: Deployment And Rollback

Recommended release layout:

```text
/var/www/hrms-payroll-saas/
  current -> release-YYYYMMDDHHMMSS
  release-YYYYMMDDHHMMSS/
  shared/
    backend.env
    web.env
    media/
```

Tasks:

- Build backend dependencies in virtualenv.
- Build frontend with production env.
- Collect static files if applicable.
- Run migrations before switching release or in controlled deployment step.
- Update `current` symlink.
- Restart backend and web services.
- Run health checks.
- Keep current plus known-good rollback release.
- Document rollback command.

Exit criteria:

- Deployment is repeatable.
- Rollback path is known.
- Release retention does not fill disk.

Evidence:

- Deployment command log.
- Current release commit SHA.
- Rollback release commit SHA.
- Post-deploy health result.

## PL-1G: Systemd Services

Services to confirm:

- `hrms-payroll-backend.service`
- `hrms-payroll-web.service`
- optional worker service if background jobs are used
- optional scheduler service if periodic jobs are used

Tasks:

- Configure restart policy.
- Configure working directory under `current`.
- Configure env file from `shared`.
- Configure logs to journald.
- Confirm services restart after reboot.
- Confirm services fail visibly if env is missing.

Evidence commands:

```bash
systemctl status hrms-payroll-backend.service --no-pager
systemctl status hrms-payroll-web.service --no-pager
journalctl -u hrms-payroll-backend.service -n 100 --no-pager
journalctl -u hrms-payroll-web.service -n 100 --no-pager
```

## PL-1H: Monitoring And Alerts

Required alerts:

- HTTP health failure.
- Backend service down.
- Web service down.
- Disk usage above `80%`, `85%`, `90%`.
- CPU sustained high usage.
- Memory sustained high usage.
- Database backup failure.
- SSL expiry within 14 days.
- Error rate spike.
- Provider failure spike once providers are enabled.

Minimum tooling:

- CloudWatch agent for CPU/memory/disk.
- CloudWatch alarms to email/SNS.
- Uptime check from outside the host.
- Error tracking such as Sentry.

Exit criteria:

- At least one test alert reaches the responsible owner.
- Disk alert is tested or simulated.
- Uptime monitor is active.

Evidence:

- Alert screenshot/email.
- CloudWatch alarm list.
- Error tracking project link/name.

## PL-1I: Production Smoke Tests

Run after deployment:

```bash
PLAYWRIGHT_BASE_URL=https://<prod-domain> HRMS_API_BASE_URL=https://<prod-domain>/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=<secure-prod-test-password> pnpm --dir web exec playwright test tests/e2e/route-smoke.spec.ts tests/e2e/pilot-credential-matrix-certification.spec.ts tests/e2e/sidebar-tabs-list-certification.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000
```

Public launch requires production-safe test accounts. Do not use shared staging credentials in production.

Exit criteria:

- Route smoke passes.
- Role/menu certification passes.
- Unsafe cross-role denial passes.
- No demo-data fallback appears.

## PL-1J: Production Hardening Sign-Off

| Gate | Status | Evidence |
| --- | --- | --- |
| AWS account/IAM/MFA ready | Pending | TBD |
| DNS/TLS/Nginx ready | Pending | TBD |
| Secrets stored outside repo | Pending | TBD |
| Production DB ready | Pending | TBD |
| Backup and restore proven | Pending | TBD |
| S3 artifact security proven | Pending | TBD |
| Deployment repeatable | Pending | TBD |
| Rollback proven | Pending | TBD |
| Monitoring alerts delivered | Pending | TBD |
| Production smoke passed | Pending | TBD |

## Launch Blocking Items

Do not proceed to public launch if:

- Production uses staging database or secrets.
- `DEBUG=true`.
- Demo data fallback is enabled.
- Payroll artifacts are public.
- Backup restore is not proven.
- No alert reaches an owner.
- SSH is broadly open without owner approval.
- Rollback release is missing.
- Live provider rails are enabled before PL-3 certification.

## Recommended Execution Order

1. AWS account/IAM/network baseline.
2. Domain/TLS/Nginx.
3. Secrets/env separation.
4. Database and migrations.
5. Object storage.
6. Deployment/systemd.
7. Backup restore drill.
8. Monitoring alerts.
9. Production smoke.
10. Sign-off table update.
