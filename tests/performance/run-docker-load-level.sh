#!/bin/sh
set -eu

level="$1"
vus="$2"
duration="$3"
evidence_dir="docs/qa/evidence/docker-performance-phase4"
compose="docker compose --project-name hrms-perf-p4 --env-file .env.production -f docker-compose.production.yml -f docker-compose.performance-phase4.yml"

sample_resources() {
  while :; do
    date -u +%Y-%m-%dT%H:%M:%SZ
    docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.NetIO}}' | grep 'hrms-perf-p4' | sort
    sleep 1
  done
}

sample_resources > "$evidence_dir/${level}-resources.csv" &
sampler_pid=$!
trap 'kill "$sampler_pid" 2>/dev/null || true' EXIT INT TERM

set +e
VUS="$vus" DURATION="$duration" QA_SEED=perf-p4 QA_PASSWORD=Password@123 \
  BASE_URL=http://127.0.0.1:8000/api/v1 \
  k6 run --quiet --summary-export "$evidence_dir/${level}-summary.json" \
  tests/performance/hrms-read-load.js > "$evidence_dir/${level}.log" 2>&1
k6_status=$?
cat "$evidence_dir/${level}.log"
set -e

kill "$sampler_pid" 2>/dev/null || true
wait "$sampler_pid" 2>/dev/null || true
trap - EXIT INT TERM

{
  echo "postgres:"
  $compose exec -T postgres psql -U hrms_phase4 -d hrms_performance_phase4 -Atc \
    "select 'connections='||count(*)||',active='||count(*) filter(where state='active')||',idle='||count(*) filter(where state='idle') from pg_stat_activity; select 'locks_waiting='||count(*) from pg_locks where not granted;"
  echo "redis:"
  $compose exec -T redis redis-cli INFO stats | grep -E 'instantaneous_ops_per_sec|rejected_connections|total_error_replies'
  $compose exec -T redis redis-cli LLEN celery
  echo "restarts:"
  for id in $($compose ps -q); do
    docker inspect "$id" --format '{{.Name}}={{.RestartCount}}'
  done
} > "$evidence_dir/${level}-post-state.txt"

exit "$k6_status"
