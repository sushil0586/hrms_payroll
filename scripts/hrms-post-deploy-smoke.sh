#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${HRMS_SMOKE_BASE_URL:-https://hrms.accerio.in}"
APP_DIR="${HRMS_SMOKE_APP_DIR:-/var/www/hrms-payroll-saas}"
DISK_WARN_PERCENT="${HRMS_SMOKE_DISK_WARN_PERCENT:-85}"
ATTEMPTS="${HRMS_SMOKE_ATTEMPTS:-12}"
SLEEP_SECONDS="${HRMS_SMOKE_SLEEP_SECONDS:-5}"
CHECK_SYSTEMD="${HRMS_SMOKE_CHECK_SYSTEMD:-auto}"

API_HEALTH_URL="${BASE_URL%/}/api/v1/health/"
ROOT_URL="${BASE_URL%/}/"
LOGIN_URL="${BASE_URL%/}/login"

fail() {
  printf "FAIL: %s\n" "$1" >&2
  exit 1
}

http_code() {
  local url="$1"
  local output="$2"
  curl -k -sS -o "$output" -w "%{http_code}" "$url" || true
}

printf "HRMS post-deploy smoke\n"
printf "base_url=%s\n" "$BASE_URL"
printf "app_dir=%s\n" "$APP_DIR"

for i in $(seq 1 "$ATTEMPTS"); do
  API_HTTP="$(http_code "$API_HEALTH_URL" /tmp/hrms_post_deploy_api_health.json)"
  ROOT_HTTP="$(http_code "$ROOT_URL" /tmp/hrms_post_deploy_root.html)"
  LOGIN_HTTP="$(http_code "$LOGIN_URL" /tmp/hrms_post_deploy_login.html)"

  printf "attempt=%s api_health_http=%s root_http=%s login_http=%s\n" "$i" "$API_HTTP" "$ROOT_HTTP" "$LOGIN_HTTP"

  if [ "$API_HTTP" = "200" ] && [ "$ROOT_HTTP" = "200" ] && [ "$LOGIN_HTTP" = "200" ]; then
    break
  fi

  if [ "$i" = "$ATTEMPTS" ]; then
    fail "readiness failed after $((ATTEMPTS * SLEEP_SECONDS)) seconds"
  fi

  sleep "$SLEEP_SECONDS"
done

HEALTH_BODY="$(cat /tmp/hrms_post_deploy_api_health.json)"
printf "api_health_body=%s\n" "$HEALTH_BODY"

case "$HEALTH_BODY" in
  *'"status": "ok"'*|*'"status":"ok"'*) ;;
  *) fail "API health body does not report status ok" ;;
esac

case "$HEALTH_BODY" in
  *'"service": "hrms-backend"'*|*'"service":"hrms-backend"'*) ;;
  *) fail "API health body does not report service hrms-backend" ;;
esac

if [ "$CHECK_SYSTEMD" = "true" ] || { [ "$CHECK_SYSTEMD" = "auto" ] && [ -d "$APP_DIR" ] && command -v systemctl >/dev/null 2>&1; }; then
  BACKEND_STATUS="$(systemctl is-active hrms-payroll-backend.service || true)"
  WEB_STATUS="$(systemctl is-active hrms-payroll-web.service || true)"
  printf "backend_service=%s\n" "$BACKEND_STATUS"
  printf "web_service=%s\n" "$WEB_STATUS"
  [ "$BACKEND_STATUS" = "active" ] || fail "backend service is not active"
  [ "$WEB_STATUS" = "active" ] || fail "web service is not active"
fi

if [ -d "$APP_DIR" ]; then
  CURRENT_RELEASE="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"
  printf "current_release=%s\n" "$CURRENT_RELEASE"
  if [ -n "$CURRENT_RELEASE" ] && [ -d "$CURRENT_RELEASE/.git" ]; then
    printf "current_commit="
    git -C "$CURRENT_RELEASE" rev-parse --short HEAD
  fi

  DISK_USED="$(df -P "$APP_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
  printf "disk_used_percent=%s\n" "$DISK_USED"
  if [ -n "$DISK_USED" ] && [ "$DISK_USED" -ge "$DISK_WARN_PERCENT" ]; then
    fail "disk usage ${DISK_USED}% is at or above threshold ${DISK_WARN_PERCENT}%"
  fi
fi

printf "PASS: HRMS post-deploy smoke is healthy\n"
