#!/bin/sh
set -eu

configuration="$1"
vus="$2"
duration="$3"
evidence_dir="docs/qa/evidence/docker-performance-phase5a"
prefix="${configuration}-${vus}vu"
compose="docker compose --project-name hrms-perf-p5a --env-file .env.production -f docker-compose.production.yml -f docker-compose.performance-phase5a.yml"

mkdir -p "$evidence_dir"

{
  date -u +%Y-%m-%dT%H:%M:%SZ
  docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' | sort
} > "$evidence_dir/${prefix}-pre-state.txt"

sample_resources() {
  while :; do
    date -u +%Y-%m-%dT%H:%M:%SZ
    docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.NetIO}}' | grep 'hrms-perf-p5a' | sort
    sleep 1
  done
}

$compose exec -T postgres psql -U hrms_phase5a -d hrms_performance_phase5a \
  -c "select pg_stat_statements_reset();" >/dev/null

sample_resources > "$evidence_dir/${prefix}-resources.csv" &
sampler_pid=$!
trap 'kill "$sampler_pid" 2>/dev/null || true' EXIT INT TERM

set +e
VUS="$vus" DURATION="$duration" QA_SEED=perf-p5a QA_PASSWORD=Password@123 \
  BASE_URL=http://127.0.0.1:8000/api/v1 \
  k6 run --quiet --summary-export "$evidence_dir/${prefix}-summary.json" \
  tests/performance/hrms-read-load.js > "$evidence_dir/${prefix}.log" 2>&1
k6_status=$?
cat "$evidence_dir/${prefix}.log"
set -e

kill "$sampler_pid" 2>/dev/null || true
wait "$sampler_pid" 2>/dev/null || true
trap - EXIT INT TERM

{
  echo "configuration=$configuration vus=$vus duration=$duration k6_status=$k6_status"
  echo "postgres_activity:"
  $compose exec -T postgres psql -U hrms_phase5a -d hrms_performance_phase5a -Atc \
    "select 'connections='||count(*)||',active='||count(*) filter(where state='active')||',idle='||count(*) filter(where state='idle') from pg_stat_activity; select 'locks_waiting='||count(*) from pg_locks where not granted;"
  echo "database_stats:"
  $compose exec -T postgres psql -U hrms_phase5a -d hrms_performance_phase5a -Atc \
    "select 'deadlocks='||deadlocks||',temp_files='||temp_files||',temp_bytes='||temp_bytes from pg_stat_database where datname=current_database();"
  echo "redis:"
  $compose exec -T redis redis-cli INFO stats | grep -E 'instantaneous_ops_per_sec|rejected_connections|total_error_replies'
  $compose exec -T redis redis-cli LLEN celery
  echo "restarts_and_oom:"
  for id in $($compose ps -q); do
    docker inspect "$id" --format '{{.Name}} restart={{.RestartCount}} oom={{.State.OOMKilled}}'
  done
} > "$evidence_dir/${prefix}-post-state.txt"

$compose exec -T postgres psql -U hrms_phase5a -d hrms_performance_phase5a -P pager=off -F ',' -A -c \
  "select calls,round(total_exec_time::numeric,2) total_ms,round(mean_exec_time::numeric,2) mean_ms,round(max_exec_time::numeric,2) max_ms,rows,shared_blks_hit,shared_blks_read,temp_blks_written,left(regexp_replace(query,E'[\\n\\r]+',' ','g'),300) query from pg_stat_statements where dbid=(select oid from pg_database where datname=current_database()) order by total_exec_time desc limit 30;" \
  > "$evidence_dir/${prefix}-top-sql.csv"

exit "$k6_status"
