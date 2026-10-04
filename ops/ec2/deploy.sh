#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/var/www/hrms-payroll-saas}"
RELEASE_REF="${RELEASE_REF:-main}"
RELEASE_ID="${RELEASE_ID:-$(date -u +%Y%m%d%H%M%S)}"
RELEASES_DIR="${RELEASES_DIR:-$APP_ROOT}"
SHARED_DIR="$APP_ROOT/shared"
RELEASE_DIR="${RELEASE_DIR:-$RELEASES_DIR/release-$RELEASE_ID}"
BACKEND_ENV="$SHARED_DIR/backend.env"
WEB_ENV="$SHARED_DIR/web.env"
PYTHON_BIN="${PYTHON_BIN:-python3}"
BACKEND_REQUIREMENTS_FILE="${BACKEND_REQUIREMENTS_FILE:-backend/requirements/production.txt}"
INSTALL_SYSTEMD_UNITS="${INSTALL_SYSTEMD_UNITS:-true}"
INSTALL_NGINX_CONFIG="${INSTALL_NGINX_CONFIG:-false}"
RUN_POST_DEPLOY_SMOKE="${RUN_POST_DEPLOY_SMOKE:-true}"
RUN_PRE_ACTIVATION_PREFLIGHT="${RUN_PRE_ACTIVATION_PREFLIGHT:-true}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
SERVICE_USER="${SERVICE_USER:-ubuntu}"
SERVICE_GROUP="${SERVICE_GROUP:-www-data}"

SERVICES=(
  hrms-payroll-backend.service
  hrms-payroll-web.service
  hrms-payroll-celery-worker.service
)
TIMERS=(
  hrms-payroll-notification-worker.timer
  hrms-payroll-provider-jobs.timer
  hrms-payroll-provider-retries.timer
)

log() {
  printf '[ec2-deploy] %s\n' "$*"
}

fail() {
  printf '[ec2-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required on this EC2 host."
}

as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

clone_or_copy_release() {
  if [[ -n "${SOURCE_DIR:-}" ]]; then
    require_command rsync
    log "Copying SOURCE_DIR=$SOURCE_DIR into $RELEASE_DIR"
    mkdir -p "$RELEASE_DIR"
    rsync -a --delete \
      --exclude '.git' \
      --exclude '.venv' \
      --exclude 'node_modules' \
      --exclude 'web/.next' \
      "$SOURCE_DIR"/ "$RELEASE_DIR"/
    return
  fi

  [[ -n "${REPO_URL:-}" ]] || fail "Set REPO_URL or SOURCE_DIR."
  require_command git
  log "Cloning $REPO_URL ref $RELEASE_REF into $RELEASE_DIR"
  git clone --depth 1 --branch "$RELEASE_REF" "$REPO_URL" "$RELEASE_DIR"
}

install_backend_dependencies() {
  cd "$RELEASE_DIR/backend"
  "$PYTHON_BIN" -m venv .venv
  .venv/bin/python -m pip install --upgrade pip wheel

  if [[ -n "${PYTHON_INSTALL_COMMAND:-}" ]]; then
    log "Installing backend dependencies with PYTHON_INSTALL_COMMAND"
    bash -lc "$PYTHON_INSTALL_COMMAND"
    return
  fi

  local requirements_path="$RELEASE_DIR/$BACKEND_REQUIREMENTS_FILE"
  [[ -f "$requirements_path" ]] || fail "Missing $BACKEND_REQUIREMENTS_FILE. Set BACKEND_REQUIREMENTS_FILE or PYTHON_INSTALL_COMMAND."
  .venv/bin/python -m pip install -r "$requirements_path"
}

build_web() {
  cd "$RELEASE_DIR"
  require_command corepack
  corepack enable
  if [[ -f "$WEB_ENV" ]]; then
    load_env_file "$WEB_ENV"
  fi
  export NODE_ENV=production
  export HRMS_ENABLE_DEMO_DATA="${HRMS_ENABLE_DEMO_DATA:-false}"
  pnpm install --frozen-lockfile
  pnpm --dir web build
}

run_pre_activation_preflight() {
  if [[ "$RUN_PRE_ACTIVATION_PREFLIGHT" != "true" ]]; then
    return
  fi
  cd "$RELEASE_DIR/backend"
  load_env_file "$BACKEND_ENV"
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
  export HRMS_ENVIRONMENT="${HRMS_ENVIRONMENT:-production}"
  export HRMS_ENABLE_DEMO_DATA="${HRMS_ENABLE_DEMO_DATA:-false}"
  .venv/bin/python manage.py production_preflight --strict --skip-network
}

prepare_shared_paths() {
  mkdir -p "$RELEASES_DIR" "$SHARED_DIR/static" "$SHARED_DIR/media"
  [[ -f "$BACKEND_ENV" ]] || fail "Missing $BACKEND_ENV. Create it from backend/.env.example with production values."
  touch "$WEB_ENV"
}

run_django_release_steps() {
  cd "$RELEASE_DIR/backend"
  load_env_file "$BACKEND_ENV"
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
  export HRMS_ENVIRONMENT="${HRMS_ENVIRONMENT:-production}"
  export HRMS_ENABLE_DEMO_DATA="${HRMS_ENABLE_DEMO_DATA:-false}"

  rm -rf staticfiles media
  ln -sfn "$SHARED_DIR/static" staticfiles
  ln -sfn "$SHARED_DIR/media" media

  .venv/bin/python manage.py check --deploy
  .venv/bin/python manage.py migrate --noinput
  .venv/bin/python manage.py collectstatic --noinput
}

install_units() {
  if [[ "$INSTALL_SYSTEMD_UNITS" != "true" ]]; then
    return
  fi
  log "Installing systemd units"
  as_root install -m 0644 "$RELEASE_DIR"/ops/ec2/systemd/*.service /etc/systemd/system/
  as_root install -m 0644 "$RELEASE_DIR"/ops/ec2/systemd/*.timer /etc/systemd/system/
  as_root systemctl daemon-reload
}

install_nginx() {
  if [[ "$INSTALL_NGINX_CONFIG" != "true" ]]; then
    return
  fi
  log "Installing nginx config"
  as_root install -m 0644 "$RELEASE_DIR/ops/ec2/nginx/hrms.conf" /etc/nginx/sites-available/hrms.conf
  as_root ln -sfn /etc/nginx/sites-available/hrms.conf /etc/nginx/sites-enabled/hrms.conf
  as_root nginx -t
  as_root systemctl reload nginx
}

activate_release() {
  local next_link="$APP_ROOT/current.next"
  ln -sfn "$RELEASE_DIR" "$next_link"
  mv -Tf "$next_link" "$APP_ROOT/current"
  if id "$SERVICE_USER" >/dev/null 2>&1; then
    as_root chown -R "$SERVICE_USER:$SERVICE_GROUP" "$APP_ROOT"
  fi
}

restart_runtime() {
  log "Restarting runtime services and enabling timers"
  for service in "${SERVICES[@]}"; do
    as_root systemctl enable "$service"
    as_root systemctl restart "$service"
  done
  for timer in "${TIMERS[@]}"; do
    as_root systemctl enable --now "$timer"
  done
}

run_post_deploy_checks() {
  cd "$APP_ROOT/current/backend"
  load_env_file "$BACKEND_ENV"
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
  .venv/bin/python manage.py production_preflight --strict

  if [[ "$RUN_POST_DEPLOY_SMOKE" == "true" ]]; then
    cd "$APP_ROOT/current"
    BASE_URL="${BASE_URL:-${HRMS_PUBLIC_APP_URL:-http://127.0.0.1}}" bash scripts/hrms-post-deploy-smoke.sh
  fi
}

prune_old_releases() {
  [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] || return
  (( KEEP_RELEASES > 0 )) || return
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name 'release-*' -print | sort -r | tail -n +"$((KEEP_RELEASES + 1))" | xargs -r rm -rf
}

main() {
  require_command "$PYTHON_BIN"
  require_command systemctl
  prepare_shared_paths
  clone_or_copy_release
  install_backend_dependencies
  run_pre_activation_preflight
  build_web
  run_django_release_steps
  install_units
  install_nginx
  activate_release
  restart_runtime
  run_post_deploy_checks
  prune_old_releases
  log "Release $RELEASE_ID is active."
}

main "$@"
