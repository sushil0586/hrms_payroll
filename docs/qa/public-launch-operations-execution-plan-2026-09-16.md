# Public Launch Operations Execution Plan

Date: 2026-09-16  
Product: HRMS Payroll SaaS  
Market scope: India-first launch, globally extensible architecture  
Current app-code posture: all role workspaces passed post-deployment certification gates on staging.

## Purpose

This document converts the remaining non-code public launch gates into an execution plan. The application itself is launch-strong from the certified app-code perspective; these gates make the hosted product production-safe, supportable, billable, and legally/commercially usable.

## Priority Order

| Priority | Gate | Launch Role | Current Status |
| ---: | --- | --- | --- |
| 1 | AWS production hardening | Hosting, security, rollback, backup, storage | Ready to execute |
| 2 | Email provider live setup | Invites, password reset, workflow notifications | Pending after AWS env |
| 3 | Monitoring, backup, alerting | Operability and recoverability | Pending after AWS baseline |
| 4 | Incident runbooks | Support and operational discipline | Drafting can start now |
| 5 | Billing/payment provider | Commercial readiness | Pending provider decision |
| 6 | Statutory/e-file provider | India compliance filing beyond evidence exports | Pending provider/legal decision |

## Gate 1: AWS Production Hardening

### Goal

Create a production AWS environment that is isolated from staging, secure by default, recoverable from backup, observable, and repeatably deployable.

### Recommended Minimum Architecture

| Layer | Minimum Production Choice | Launch Notes |
| --- | --- | --- |
| DNS | Route 53 hosted zone or existing DNS provider | Production domain must be separate from staging. |
| TLS | ACM with ALB/CloudFront, or Certbot on EC2 Nginx | ACM is preferred if using ALB/CloudFront. |
| Compute | EC2 Ubuntu LTS for first launch | Good enough if hardened; ECS/Fargate can come later. |
| Reverse proxy | Nginx | Routes frontend and `/api/v1` backend. |
| Backend | Django/Gunicorn via systemd | `DEBUG=false`; production settings only. |
| Frontend | Next.js production build via systemd | No demo fallback; production API base URL only. |
| Database | RDS PostgreSQL preferred | RDS is strongly preferred over EC2 Postgres for launch. |
| Object storage | Private S3 bucket | Payroll artifacts, payslips, exports, audit packs must never be public. |
| Secrets | AWS Secrets Manager or SSM Parameter Store | No production secrets in repo, shell history, or shared docs. |
| Logs/metrics | CloudWatch + Sentry or equivalent | Must alert before public launch. |
| Backups | RDS automated backup + restore drill | Backup without restore proof is not enough. |

### AWS Account And Access

Implementation checklist:

- Create or confirm a dedicated AWS account for production.
- Enable MFA for root and all admin users.
- Create least-privilege deployment IAM role/user.
- Create billing budget alerts.
- Restrict SSH to trusted IPs.
- Disable SSH password login.
- Record production owner, backup owner, deployment owner, and incident owner.

Acceptance criteria:

- No shared personal root/admin access is used for normal deployment.
- MFA is enabled.
- Billing alert reaches an owner.
- SSH exposure is documented and restricted.

Evidence to record:

```bash
aws sts get-caller-identity
aws budgets describe-budgets --account-id <account-id>
aws iam list-account-aliases
```

### Network And Host Baseline

Implementation checklist:

- Use a production VPC or clearly documented default VPC.
- Keep database private.
- Allow public inbound only for `80` and `443`.
- Restrict `22` to trusted IPs.
- Patch Ubuntu packages.
- Enable NTP/time sync.
- Configure firewall/security groups.
- Install only required runtime packages.

Acceptance criteria:

- DB is not public.
- Only expected ports are public.
- Host timezone/time sync is correct.

Evidence to record:

```bash
sudo ufw status verbose || true
sudo timedatectl
sudo ss -tulpn
```

### Domain, TLS, And Nginx

Implementation checklist:

- Configure production domain, for example `hrms.<customer-domain>` or `app.<product-domain>`.
- Redirect HTTP to HTTPS.
- Proxy `/api/v1/` to backend service.
- Proxy app routes to Next.js service.
- Configure upload size for documents/import files.
- Configure timeouts for exports/reports.
- Add security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` unless embedding is explicitly required
  - `Referrer-Policy`
  - `Strict-Transport-Security` after HTTPS is stable

Acceptance criteria:

- Root, login, and API health return `200`.
- HTTP redirects to HTTPS.
- Certificate expiry is known.

Evidence commands:

```bash
curl -I https://<prod-domain>/
curl -I https://<prod-domain>/login
curl -sS https://<prod-domain>/api/v1/health/
openssl s_client -connect <prod-domain>:443 -servername <prod-domain> </dev/null 2>/dev/null | openssl x509 -noout -dates
```

### Production Secrets And Environment

Implementation checklist:

- Create production backend env using `backend/.env.example` as shape only.
- Create production web env using `web/.env.example` as shape only.
- Store actual secrets in Secrets Manager/SSM.
- Confirm:
  - `DEBUG=false`
  - `HRMS_ENABLE_DEMO_DATA=false`
  - production DB URL is production-only
  - `DJANGO_ALLOWED_HOSTS` includes production domain only
  - `DJANGO_CSRF_TRUSTED_ORIGINS` includes production HTTPS origin
  - `HRMS_API_BASE_URL=https://<prod-domain>/api/v1`
  - `HRMS_COOKIE_SECURE=true`
  - live provider rails remain disabled unless separately certified

Acceptance criteria:

- No production secret exists in committed files.
- No staging URL or staging secret is used in production env.
- Django deploy check passes without launch-blocking errors.

Evidence commands:

```bash
python backend/manage.py check --deploy --settings=config.settings.production
grep -R "hrms.accerio.in\\|Password@123\\|DEBUG=true" /var/www/hrms-payroll-saas/shared || true
```

### Database And Migration

Preferred implementation:

- RDS PostgreSQL with private access.
- Automated backups enabled.
- Deletion protection enabled.
- Encryption enabled.
- Maintenance window configured.

Implementation checklist:

- Create production DB.
- Run migrations once during controlled deployment.
- Create first Platform Admin through approved command/process.
- Verify tenant setup works from Platform Admin.
- Enable automated backups.
- Perform restore drill into scratch DB.

Acceptance criteria:

- App can connect to production DB.
- Migrations are applied.
- Restore drill is proven.

Evidence commands:

```bash
python backend/manage.py migrate --settings=config.settings.production
python backend/manage.py showmigrations --settings=config.settings.production
pg_dump --format=custom --file=/tmp/hrms_prod_$(date +%Y%m%dT%H%M%S).dump "$DATABASE_URL"
```

### Object Storage And Artifact Security

Implementation checklist:

- Create private S3 bucket for production artifacts.
- Block public access.
- Enable encryption.
- Enable versioning or defined retention policy.
- Configure lifecycle retention.
- Configure app storage credentials via secret manager.
- Verify payslip/export/audit artifact upload.
- Verify unauthorized direct access fails.
- Verify signed URL expiry behavior.

Acceptance criteria:

- Payroll artifacts are never public.
- Signed access expires.
- Export/audit access is traceable.

Evidence commands:

```bash
aws s3api get-public-access-block --bucket <bucket>
aws s3api get-bucket-encryption --bucket <bucket>
aws s3api get-bucket-versioning --bucket <bucket>
```

### Deployment And Rollback

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

Implementation checklist:

- Build backend and frontend per release.
- Run migrations in controlled step.
- Switch `current` symlink.
- Restart services.
- Run smoke test.
- Keep at least one known-good rollback release.
- Document exact rollback command.

Acceptance criteria:

- Deploy is repeatable.
- Rollback is proven once.
- Disk retention cannot fill server.

Existing smoke script:

```bash
HRMS_SMOKE_BASE_URL=https://<prod-domain> HRMS_SMOKE_APP_DIR=/var/www/hrms-payroll-saas ./scripts/hrms-post-deploy-smoke.sh
```

### Systemd Services

Required services:

- `hrms-payroll-backend.service`
- `hrms-payroll-web.service`
- Worker/scheduler services if background jobs are enabled

Implementation checklist:

- Services run as non-root user.
- Services use env files from `shared`.
- Restart policy is configured.
- Journald logs are available.
- Services restart after reboot.

Evidence commands:

```bash
systemctl is-active hrms-payroll-backend.service
systemctl is-active hrms-payroll-web.service
journalctl -u hrms-payroll-backend.service -n 100 --no-pager
journalctl -u hrms-payroll-web.service -n 100 --no-pager
```

### Production Smoke Gate

Minimum post-deploy smoke:

```bash
HRMS_SMOKE_BASE_URL=https://<prod-domain> ./scripts/hrms-post-deploy-smoke.sh
```

Minimum Playwright smoke:

```bash
PLAYWRIGHT_BASE_URL=https://<prod-domain> \
HRMS_API_BASE_URL=https://<prod-domain>/api/v1 \
HRMS_ENABLE_DEMO_DATA=false \
PLAYWRIGHT_LIVE_SEED_PASSWORD=<prod-test-password> \
pnpm --dir web exec playwright test \
  web/tests/e2e/pilot-credential-matrix-certification.spec.ts \
  web/tests/e2e/public-launch-role-menu-certification.spec.ts \
  --project=chromium --workers=1 --reporter=line --timeout=1200000
```

Acceptance criteria:

- Health/root/login pass.
- Role menu gate passes.
- Credential matrix denial passes.
- No demo fallback appears.

### AWS Gate 1 Sign-Off Table

| Gate | Status | Evidence |
| --- | --- | --- |
| AWS account/IAM/MFA | Pending | TBD |
| Network/security groups | Pending | TBD |
| DNS/TLS/Nginx | Pending | TBD |
| Production secrets/env | Pending | TBD |
| RDS/database/migrations | Pending | TBD |
| Backup restore drill | Pending | TBD |
| S3 artifact security | Pending | TBD |
| Deployment/rollback | Pending | TBD |
| Systemd services | Pending | TBD |
| Production smoke | Pending | TBD |

### AWS Launch Blockers

Do not open production to customers if any of these are true:

- `DEBUG=true`.
- Production points to staging DB/API/secrets.
- Demo data fallback is enabled.
- Payroll artifacts are public.
- Backup restore has not been proven.
- No alert reaches an owner.
- SSH is broadly open without approval.
- Rollback release is missing.
- Live payroll/statutory/payment rails are enabled before provider certification.

## Gate 2: Email Provider Live Setup

Recommended first provider: Amazon SES for lowest AWS-native cost, or Postmark/SendGrid if faster setup and better templates are preferred.

Required launch flows:

- Tenant admin invite.
- User invite.
- Employee welcome/password setup.
- Password reset.
- Payroll/payslip publication notice.
- Approval/reminder notifications.
- Support access grant notification.

Minimum acceptance:

- Domain verified.
- SPF/DKIM/DMARC configured.
- Password reset email received in real mailbox.
- Invite email received in real mailbox.
- Bounce/failure path visible.
- No secrets in UI or logs.

### Amazon SES Sandbox Development Slice

Use this first because it is low-cost, AWS-native, and safe while the account is still in sandbox.

Implementation checklist:

- Select the first AWS region for email, preferably the same region as production hosting, for example `ap-south-1`.
- Verify the sending identity in SES:
  - Best: verify the product domain, for example `hrms.accerio.in`.
  - Acceptable for first smoke: verify one sender email, for example `notifications@hrms.accerio.in`.
- Add SES DNS records for DKIM.
- Add or confirm SPF and DMARC records for the sending domain.
- Keep the account in SES sandbox until the smoke flow is proven.
- Verify every test recipient email while still in sandbox.
- Create SES SMTP credentials from the SES console. Do not use AWS access keys directly as SMTP credentials.
- Store SMTP username/password in AWS Secrets Manager, SSM Parameter Store, or the deployment secret mechanism.
- Configure backend environment:

```bash
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=email-smtp.ap-south-1.amazonaws.com
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_USE_TLS=true
DJANGO_EMAIL_USE_SSL=false
DJANGO_EMAIL_HOST_USER=<ses-smtp-username-secret>
DJANGO_EMAIL_HOST_PASSWORD=<ses-smtp-password-secret>
DJANGO_DEFAULT_FROM_EMAIL="Nexora HRMS <notifications@verified-domain.example>"
DJANGO_SERVER_EMAIL="Nexora HRMS <notifications@verified-domain.example>"
```

Application configuration checklist:

- Go to HR Admin > Notification Delivery.
- Open the Email channel.
- Set backend to `Email SMTP`.
- Set sender address to the verified SES sender.
- Set provider config with non-secret routing metadata only:

```json
{
  "reply_to": "support@verified-domain.example",
  "ses_region": "ap-south-1"
}
```

- Do not paste SMTP username/password into the app UI.

Sandbox smoke sequence:

- Create or select a test user whose email address is verified in SES sandbox.
- Trigger a test notification from Notification Events or run a queued email notification.
- Process the queue:

```bash
cd /var/www/hrms-payroll-saas/current/backend
set -a
. /var/www/hrms-payroll-saas/shared/backend.env
set +a
./.venv/bin/python3 manage.py process_notifications --tenant-code <tenant-code> --channel email --limit 10
```

For the EC2 systemd deployment, the same command should normally run through `hrms-payroll-notification-worker.timer`, which points at `/var/www/hrms-payroll-saas/shared/backend.env`.

- Confirm:
  - Email arrives in the verified recipient inbox.
  - From address is the verified sender.
  - Reply-to is correct.
  - HR Admin notification delivery logs show delivered status.
  - Delivery logs do not contain SMTP credentials.
  - SES sending metrics show the send.

Exit criteria to request SES production access:

- At least one invite/welcome email is delivered.
- At least one password reset email is delivered if the reset flow is enabled.
- At least one workflow notification is delivered.
- Bounce/failure behavior is visible in logs or SES metrics.
- Domain authentication is complete.
- Support mailbox owner is assigned.
- Unsubscribe handling is defined for non-transactional email, if marketing email is ever added.

Production access request notes:

- Use case: transactional HRMS SaaS emails such as tenant admin invites, employee password setup, workflow reminders, payslip notices, and support notifications.
- Expected volume at launch: low, tenant-count based, with controlled onboarding.
- Explain bounce/complaint monitoring plan.
- Explain that marketing/bulk campaigns are not part of this channel.

Current development status:

- Backend supports environment-driven Django email configuration.
- Notification delivery uses the configured Django mail backend, so SES SMTP can be enabled without code changes after secrets are available.
- Channel provider config supports non-secret `reply_to` and `ses_region` metadata.
- Automated test coverage proves the SES-sandbox-style SMTP path sends through the notification queue and does not write SMTP secrets into delivery logs.

## Gate 3: Monitoring, Backup, Alerting

Required monitors:

- API health.
- Frontend root/login.
- Backend service.
- Web service.
- Disk usage.
- CPU/memory.
- DB storage/connections.
- Backup success/failure.
- SSL expiry.
- 5xx spike.
- Provider failure spike once providers are enabled.

Minimum acceptance:

- At least one alert is tested end-to-end.
- Backup restore drill is recorded.
- Sentry or equivalent captures a test exception.
- Owner escalation is documented.

Detailed execution will be expanded after AWS Gate 1 baseline monitoring is selected.

## Gate 4: Incident Runbooks

Minimum runbooks:

- App down.
- Database down/slow.
- Failed deployment rollback.
- Payroll calculation mismatch.
- Payslip published incorrectly.
- Wrong user access/security incident.
- Email provider failure.
- Billing/payment failure.
- Statutory/e-file provider failure.
- Backup restore request.
- Support access emergency.

Minimum acceptance:

- P0/P1 runbooks exist.
- Owner and escalation path are named.
- Customer communication templates exist.
- Rollback/restore steps are executable.

## Gate 5: Billing/Payment Provider

India-first recommendation:

- Start with Razorpay for payment links/subscriptions/invoices, or Zoho Books + Razorpay if accounting/GST invoice workflow is more important.
- Keep manual enterprise override in Platform Admin.

Minimum acceptance:

- Tenant plan is linked to billing status.
- Payment status can be updated/synced.
- Failed payment policy is documented.
- Platform Admin can suspend/reactivate with audit evidence.
- GST invoice process is defined.

## Gate 6: Statutory/E-file Provider

India-first recommendation:

- Launch with certified reports/export/audit evidence and manual portal/provider upload first.
- Treat direct e-filing API as Phase 2 unless a provider contract and sandbox certification are available.

Minimum acceptance for first public launch:

- TDS/PF/ESIC/PT/LWF readiness reports are available.
- Export/source hash/audit manifest exists.
- Filing receipt can be uploaded or recorded.
- Filing status tracks pending/submitted/accepted/rejected.
- UI clearly says live filing is disabled unless provider is certified.

## Execution Log

| Date | Gate | Environment | Evidence | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 | Operations plan created | Documentation | Created public launch operations execution plan covering AWS, email, monitoring, runbooks, billing, and statutory/e-file provider gates. | In progress | Next action: execute Gate 1 AWS production hardening. |
| 2026-09-16 | SES sandbox development slice | Backend/docs/test | Added environment-driven Django email settings, SES-safe channel metadata, sandbox execution checklist, and SMTP notification proof test. | In progress | Next action: configure SES sandbox identities and run one real sandbox send on staging. |
