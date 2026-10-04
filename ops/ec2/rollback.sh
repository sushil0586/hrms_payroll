#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/var/www/hrms-payroll-saas}"
RELEASES_DIR="${RELEASES_DIR:-$APP_ROOT}"
TARGET_RELEASE="${TARGET_RELEASE:-}"
SERVICES=(
  hrms-payroll-backend.service
  hrms-payroll-web.service
  hrms-payroll-celery-worker.service
)

log() {
  printf '[ec2-rollback] %s\n' "$*"
}

fail() {
  printf '[ec2-rollback] ERROR: %s\n' "$*" >&2
  exit 1
}

as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

resolve_target_release() {
  if [[ -n "$TARGET_RELEASE" ]]; then
    if [[ "$TARGET_RELEASE" = /* ]]; then
      printf '%s\n' "$TARGET_RELEASE"
    else
      if [[ "$TARGET_RELEASE" == release-* ]]; then
        printf '%s\n' "$RELEASES_DIR/$TARGET_RELEASE"
      else
        printf '%s\n' "$RELEASES_DIR/release-$TARGET_RELEASE"
      fi
    fi
    return
  fi

  local current
  current="$(readlink -f "$APP_ROOT/current" 2>/dev/null || true)"
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name 'release-*' -print \
    | sort -r \
    | grep -v -F "$current" \
    | head -1
}

main() {
  local target
  target="$(resolve_target_release)"
  [[ -n "$target" ]] || fail "No rollback target found. Set TARGET_RELEASE to a release id or path."
  [[ -d "$target" ]] || fail "Rollback target does not exist: $target"

  local next_link="$APP_ROOT/current.next"
  ln -sfn "$target" "$next_link"
  mv -Tf "$next_link" "$APP_ROOT/current"

  for service in "${SERVICES[@]}"; do
    as_root systemctl restart "$service"
  done

  cd "$APP_ROOT/current/backend"
  if [[ -f "$APP_ROOT/shared/backend.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$APP_ROOT/shared/backend.env"
    set +a
  fi
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
  .venv/bin/python manage.py production_preflight --strict
  log "Rolled back to $target"
}

main "$@"
