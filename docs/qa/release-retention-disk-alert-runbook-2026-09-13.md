# Release Retention And Disk Alert Runbook

Date: 2026-09-13  
Environment used for certification: staging, `https://hrms.accerio.in`  
Applies to: HRMS Payroll SaaS release directories under `/var/www/hrms-payroll-saas`

## Purpose

Keep staging and production hosts from filling disk due to accumulated release directories, while preserving a safe rollback path.

This runbook exists because the pilot staging server reached `98%` disk usage after repeated deployments. Disk was remediated by pruning old inactive releases and keeping the current release plus the latest rollback release.

## Retention Policy

Keep:

- The current release resolved by `/var/www/hrms-payroll-saas/current`.
- The latest known-good rollback release.
- Optionally one extra previous release if disk is below the warning threshold.

Remove:

- Older inactive `release-*` directories that are not the current symlink target and not the selected rollback release.
- Never remove `/var/www/hrms-payroll-saas/shared`.
- Never remove the release currently pointed to by `/var/www/hrms-payroll-saas/current`.

## Alert Thresholds

| Disk Used | Action |
|---:|---|
| `< 80%` | Healthy. No cleanup required. |
| `80% - 84%` | Warning. Review release count and package/build cache growth. |
| `85% - 89%` | Action required. Prune inactive releases during the next safe window. |
| `90%+` | Urgent. Prune inactive releases immediately after confirming current and rollback releases. |
| `95%+` | Emergency. Stop non-essential builds/deployments until free space is restored. |

## Pre-Cleanup Checks

Run this first:

```bash
APP=/var/www/hrms-payroll-saas
readlink -f "$APP/current"
cd "$APP/current" && git rev-parse HEAD
df -h / "$APP"
sudo du -h -d 0 "$APP"/release-* 2>/dev/null | sort -h
sudo journalctl --disk-usage
```

Record:

- Current release path.
- Current commit.
- Disk usage before cleanup.
- Release directories and sizes.

## Choose Rollback Release

Use the latest previous release that was already proven by rollback drill or release health checks.

Example from pilot certification:

```bash
APP=/var/www/hrms-payroll-saas
CURRENT=$(readlink -f "$APP/current")
ROLLBACK="$APP/release-20260913060836"

printf "current=%s\n" "$CURRENT"
printf "rollback=%s\n" "$ROLLBACK"
test -d "$CURRENT"
test -d "$ROLLBACK"
test "$CURRENT" != "$ROLLBACK"
```

If no rollback release exists, do not prune until a fresh deployment or backup strategy creates one.

## Dry Run Cleanup List

This prints what would be removed without deleting anything:

```bash
APP=/var/www/hrms-payroll-saas
CURRENT=$(readlink -f "$APP/current")
ROLLBACK="$APP/release-20260913060836"

for rel in "$APP"/release-*; do
  [ -d "$rel" ] || continue
  if [ "$rel" = "$CURRENT" ] || [ "$rel" = "$ROLLBACK" ]; then
    printf "keep   %s\n" "$rel"
  else
    printf "remove %s\n" "$rel"
  fi
done
```

Review the list before running deletion.

## Cleanup Command

Run only after the dry run is correct:

```bash
APP=/var/www/hrms-payroll-saas
CURRENT=$(readlink -f "$APP/current")
ROLLBACK="$APP/release-20260913060836"

for rel in "$APP"/release-*; do
  [ -d "$rel" ] || continue
  if [ "$rel" = "$CURRENT" ] || [ "$rel" = "$ROLLBACK" ]; then
    printf "keep   %s\n" "$rel"
  else
    printf "remove %s\n" "$rel"
    sudo rm -rf "$rel"
  fi
done
```

## Post-Cleanup Verification

```bash
APP=/var/www/hrms-payroll-saas

printf "current=" && readlink -f "$APP/current"
printf "head=" && cd "$APP/current" && git rev-parse HEAD
printf "backend=" && sudo systemctl is-active hrms-payroll-backend.service
printf "web=" && sudo systemctl is-active hrms-payroll-web.service
printf "login_http=" && curl -k -s -o /tmp/hrms_release_retention_login.html -w "%{http_code}" https://hrms.accerio.in/login && echo
printf "root_http=" && curl -k -s -o /tmp/hrms_release_retention_root.html -w "%{http_code}" https://hrms.accerio.in/ && echo
df -h / "$APP"
sudo du -h -d 0 "$APP"/release-* 2>/dev/null | sort -h
```

Required result:

- Current symlink still points to the intended release.
- Current commit is unchanged.
- Backend service is `active`.
- Web service is `active`.
- `/login` returns HTTP `200`.
- `/` returns HTTP `200`.
- Disk usage is below `85%`; below `80%` is preferred.

## Staging Certification Evidence

Pilot cleanup performed on 2026-09-13:

- Current release kept: `/var/www/hrms-payroll-saas/release-20260913062101`.
- Rollback release kept: `/var/www/hrms-payroll-saas/release-20260913060836`.
- Older inactive releases pruned.
- Disk before cleanup: root filesystem `98%` used, about `559M` free.
- Disk after cleanup: root filesystem `73%` used, about `5.1G` free.
- Final health: backend active, web active, `/api/v1/health/` HTTP `200`, `/login` HTTP `200`, `/` HTTP `200`.

## Cadence

- Run disk review after every staging deployment batch.
- Run disk review before and after rollback drills.
- Run disk review before any long Playwright certification pack.
- For production, add monitoring alert at `80%` warning and `85%` action required.

## Do Not Do

- Do not delete the current symlink target.
- Do not delete the selected rollback release.
- Do not delete shared env, media, backups, or tenant-upload directories.
- Do not run cleanup during an active `pnpm build` or migration.
- Do not treat temporary HTTP `502` during service restart as disk failure; use readiness retry for `/login`.
