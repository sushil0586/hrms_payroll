# DB-5 Execution Evidence

Date: 2026-10-17  
Database: disposable PostgreSQL 16 container `hrms-db5-postgres`, database `hrms_db5`, host port `55437`

## Executed results

| Check | Result |
|---|---|
| Fresh full migration chain | Passed after correcting psycopg percent escaping in DB-5 migration |
| DB-5 migration rollback/reapply | Passed: `0003 -> 0002 -> 0003` |
| Django system check | Passed, 0 issues |
| Migration drift | Passed, no changes detected |
| DB-1 through DB-5 PostgreSQL regression | 56 passed, 3 dependency deprecation warnings |
| Final DB-5 focused suite | 6 passed, 3 dependency deprecation warnings |
| Concurrent overlapping assignment test | 1 passed; one commit and one database rejection |
| Neighboring completed movement API | 1 passed after correcting impossible pre-joining fixture date |
| Production-built Playwright effective policy flow | 1 passed in 32.3 seconds; no HTTP 5xx before workflow completion |
| Leave-viewer API/RBAC neighbor | 1 passed; leave-type list HTTP 200 and mutations denied |
| TypeScript | Passed |
| Targeted ESLint | Passed |
| Next.js production build | Passed; pre-existing Autoprefixer `end` warning retained |
| Historical classification | 4 synthetic employees, 4 unclassified, 0 multiple-open, no writes |
| Fixture cleanup | `verified_absent=true`; follow-up tenant count 0 |

## Preserved failure history

1. The first migration attempt failed because psycopg 3 parsed PostgreSQL `%I`/`%` server formatting markers. The migration was corrected, then applied, reversed, and reapplied successfully.
2. The first historical policy test failed with `NameError: Q`; the missing leave-service import was fixed.
3. Its next run selected a valid pre-existing employee-specific fixture assignment. The scenario was isolated by clearing assignments only inside its disposable test transaction.
4. The first neighboring movement rerun failed because the fixed 2024 movement date preceded the dynamic joining date. The fixture now derives a date 30 days after joining.
5. The first browser run persisted the dates but returned null fields because the shared API response builder omitted them. The response contract was fixed; rerun passed.
6. Final diff review found assignment fields had also spilled into the leave-type payload and caused a prefetch HTTP 500. The fields were removed, the leave-viewer API test passed, and the final browser run observed no 5xx before completion.

## Exact commands

```bash
docker run --name hrms-db5-postgres --rm -d -e POSTGRES_DB=hrms_db5 -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=db5-test -p 55437:5432 --tmpfs /var/lib/postgresql/data:rw,size=2g postgres:16-alpine
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db5 POSTGRES_USER=hrms POSTGRES_PASSWORD=db5-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55437 backend/.venv/bin/python backend/manage.py migrate --noinput
backend/.venv/bin/python backend/manage.py migrate employee_lifecycle 0002 --noinput
backend/.venv/bin/python backend/manage.py migrate employee_lifecycle 0003 --noinput
backend/.venv/bin/python backend/manage.py check
backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run
backend/.venv/bin/pytest -c backend/pytest.ini backend/tests/test_db1_write_integrity.py backend/tests/test_db2_fiscal_integrity.py backend/tests/test_db3_leave_year_integrity.py backend/tests/test_db3a_leave_year_operations.py backend/tests/test_db4_tenant_integrity_retention.py backend/tests/test_db4b_retention_governance.py backend/tests/test_db5_effective_employment_integrity.py -q --reuse-db
backend/.venv/bin/pytest -c backend/pytest.ini backend/tests/test_phase0_api_smoke.py::test_hr_admin_completed_movement_updates_employee_structure -q --reuse-db
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3105 HRMS_API_BASE_URL=http://127.0.0.1:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/db5-effective-policy-transition.spec.ts --workers=1 --trace=retain-on-failure
pnpm --dir web typecheck
pnpm --dir web exec eslint <DB-5 files>
pnpm --dir web build
backend/.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref db5-classification --cleanup
```

All backend commands used the explicit PostgreSQL variables shown above. No production, staging, Northstar, customer, or shared certification database was used.
