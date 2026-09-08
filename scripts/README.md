# Scripts

Use this folder for local automation such as:

- environment bootstrap
- data seeding helpers
- workspace lint/typecheck orchestration
- deployment preparation scripts

## Launch Sign-Off

Seed disposable staging handles:

```bash
pnpm qa:staging-seed
```

In staging mode, the launch sign-off runner reads `web/qa-artifacts/staging-launch-seed/manifest.json` when it exists, exports the disposable live-mutation handles into the test process, and enables `PLAYWRIGHT_LIVE_MUTATIONS=true` for that run.

Clean only the disposable staging handles created by the seed command:

```bash
pnpm qa:staging-seed:cleanup
```

Run the local SaaS/payroll launch gate:

```bash
pnpm qa:launch-signoff
```

Check whether the staging environment has the minimum live handles before running the full gate:

```bash
pnpm qa:launch-signoff:staging-preflight
```

Run the full staging gate after the preflight is clean:

```bash
pnpm qa:launch-signoff:staging
```

The runner writes a timestamped evidence folder under `web/qa-artifacts/production-launch-signoff-*` with:

- command logs
- HRMS SaaS launch audit JSON
- payroll provider launch rehearsal JSON
- environment posture report
- final markdown and JSON launch decision reports

Useful options:

```bash
cd backend && ../.venv/bin/python manage.py seed_staging_launch_data --output-file ../web/qa-artifacts/staging-launch-seed/manifest.json
cd backend && ../.venv/bin/python manage.py seed_staging_launch_data --cleanup
python3 scripts/run-production-launch-signoff.py --skip-browser
python3 scripts/run-production-launch-signoff.py --mode staging --seed-manifest web/qa-artifacts/staging-launch-seed/manifest.json --preflight-only
python3 scripts/run-production-launch-signoff.py --mode staging --preflight-only --allow-command-failures
python3 scripts/run-production-launch-signoff.py --mode staging --tenant-code northstar-foods
python3 scripts/run-production-launch-signoff.py --mode production --allow-command-failures
```

Use `docs/qa/staging-launch-signoff.env.example` for the expected staging key names. Keep real values in your shell, CI secrets, or secret manager.
