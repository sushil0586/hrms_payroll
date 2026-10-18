# DD-3 execution summary

- Frozen IDs: DD-LV-001 through DD-LV-008.
- Final result: 5 Verified, 2 Partial, 0 Missing, 1 Blocked.
- PostgreSQL image: `postgres:16-alpine`; isolated database `hrms_dd3` on local port 55459.
- Browser: production Next.js build at `127.0.0.1:3116`; Django API at `127.0.0.1:8016`.
- `001-dd3-browser.log`: original HTTP 500 reproduction.
- `002-dd3-browser-rerun.log`: trigger transition defect reproduction (`pending` persisted).
- `003-dd3-browser-final.log`: business assertions passed; cleanup defect reproduced.
- `004-dd3-browser-cleanup-rerun.log`: complete browser flow and cleanup passed.
- `005-dd3-backend-regression.log`: original focused suite plus first new-test expectation mismatch retained.
- `006-dd3-governed-review-regression.log`: deterministic governed review regression passed.
- `008-dd3-backend-final.log`: final focused PostgreSQL suite, 17 passed.
- `009-dd3-migration-rollback.log`: additive migrations rolled back to `0010` successfully.
- `010-dd3-migration-reapply.log`: migrations reapplied through `0012` successfully.

Key commands:

```text
DJANGO_SETTINGS_MODULE=config.settings.base ... python backend/manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q backend/tests/test_db3_leave_year_integrity.py backend/tests/test_db3a_leave_year_operations.py backend/apps/leave_management/tests.py -k '<focused leave expression>'
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3116 ... playwright test tests/e2e/dd3-leave-correction-certification.spec.ts --project=chromium --workers=1 --trace=retain-on-failure
pnpm --dir web typecheck
pnpm --dir web exec eslint tests/e2e/dd3-leave-correction-certification.spec.ts
pnpm --dir web build
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
```
