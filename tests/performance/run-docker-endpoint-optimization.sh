#!/bin/sh
set -eu

label="$1"
vus="$2"
duration="$3"
evidence_dir="docs/qa/evidence/docker-performance-phase5b"
compose="docker compose --project-name hrms-perf-p5b --env-file .env.production -f docker-compose.production.yml -f docker-compose.performance-phase5b.yml"
mkdir -p "$evidence_dir"

{ date -u +%Y-%m-%dT%H:%M:%SZ; docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' | sort; } > "$evidence_dir/${label}-${vus}vu-pre-state.txt"
$compose exec -T postgres psql -U hrms_phase5b -d hrms_performance_phase5b -c "select pg_stat_statements_reset();" >/dev/null

sample() { while :; do date -u +%Y-%m-%dT%H:%M:%SZ; docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' | grep 'hrms-perf-p5b' | sort; sleep 1; done; }
sample > "$evidence_dir/${label}-${vus}vu-resources.csv" & sampler=$!
trap 'kill "$sampler" 2>/dev/null || true' EXIT INT TERM
set +e
VUS="$vus" DURATION="$duration" QA_SEED=perf-p5b QA_PASSWORD=Password@123 BASE_URL=http://127.0.0.1:8000/api/v1 \
  k6 run --quiet --summary-export "$evidence_dir/${label}-${vus}vu-summary.json" tests/performance/hrms-read-load.js > "$evidence_dir/${label}-${vus}vu.log" 2>&1
result=$?
set -e
kill "$sampler" 2>/dev/null || true; wait "$sampler" 2>/dev/null || true; trap - EXIT INT TERM
cat "$evidence_dir/${label}-${vus}vu.log"
$compose exec -T postgres psql -U hrms_phase5b -d hrms_performance_phase5b -P pager=off -F ',' -A -c \
  "select calls,round(total_exec_time::numeric,2) total_ms,round(mean_exec_time::numeric,2) mean_ms,round(max_exec_time::numeric,2) max_ms,rows,shared_blks_hit,shared_blks_read,left(regexp_replace(query,E'[\\n\\r]+',' ','g'),300) query from pg_stat_statements where dbid=(select oid from pg_database where datname=current_database()) order by total_exec_time desc limit 30;" > "$evidence_dir/${label}-${vus}vu-top-sql.csv"
{
  echo "k6_status=$result"
  $compose exec -T postgres psql -U hrms_phase5b -d hrms_performance_phase5b -Atc "select 'connections='||count(*)||',lock_waiters='||count(*) filter(where wait_event_type='Lock') from pg_stat_activity where datname=current_database(); select 'deadlocks='||deadlocks from pg_stat_database where datname=current_database();"
  for id in $($compose ps -q); do docker inspect "$id" --format '{{.Name}} restart={{.RestartCount}} oom={{.State.OOMKilled}}'; done
} > "$evidence_dir/${label}-${vus}vu-post-state.txt"
exit "$result"
