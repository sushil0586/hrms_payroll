# DD-8 Organization and Historical Reporting Certification

Date: 2026-10-18  
Environment: isolated PostgreSQL 16, disposable Enterprise tenant `pw-qa-dd8-org`, production-built Next.js frontend  
Decision: **CONDITIONAL**

## Frozen Scope

DD-8 is the frozen **Organization and history** business domain, not final reconciliation. Its IDs are `DD-OR-001` through `DD-OR-007`. `DD-OR-008` remains assigned to `DD-Policy` and is not counted as DD-8 execution.

| ID | Result | Evidence and disposition |
|---|---|---|
| DD-OR-001 | Verified | Preserved DB-6.2 browser CRUD evidence for legal entity, branch, location, BU, department, grade, designation and cost center. |
| DD-OR-002 | Verified | Preserved DB-4/DB-6.2 PostgreSQL tenant-reference and hierarchy-cycle guards. |
| DD-OR-003 | Verified | Preserved archive/protected-reference evidence; historical employee and payroll foreign keys remain protected. |
| DD-OR-004 | Partial | DB-5 effective-dated employee movements resolve current/future assignments. Organization master names and hierarchy nodes do not have versioned effective ranges, so a future-dated master restructure is unsupported. |
| DD-OR-005 | Partial | Current workforce export is verified, but it reads current employee organization fields and has no approved `as_of` reporting contract. Historical headcount/cost-center reproduction remains incomplete. |
| DD-OR-006 | Partial | Tenant/cycle constraints and deactivation conflict checks exist. Explicit concurrent rename/archive-versus-assignment certification remains incomplete. |
| DD-OR-007 | Verified | Implemented one transactional import request. Forced late-row browser failure rolled back the complete graph; Retry succeeded; PostgreSQL dependency, tenant and concurrency cases passed. |

Counts: **4 Verified, 3 Partial, 0 Missing, 0 Blocked, 0 Failed, 0 Not Run**.

## Confirmed Defects And Fixes

1. The organization CSV workbench posted ready rows individually. A later request failure could leave a partial hierarchy. The new tenant-scoped bulk endpoint validates and creates the ordered graph inside one PostgreSQL transaction and serializes concurrent tenant imports with `SELECT FOR UPDATE`.
2. Failed commits mutated the memoized preview rows. Clicking Preview again retained `failed` states and left Retry disabled. Preview now clones its parsed rows before commit-state mutation.

No organization, payroll, statutory or effective-date business rules were changed. No migration was required.

## Executed Evidence

- PostgreSQL DD-8 integrity: `4 passed` in 82.21 seconds.
- Focused organization and DB-5 history regression: `14 passed` in 116.25 seconds.
- Production-built Playwright DD-OR-007: final run `1 passed` in 9.9 seconds.
- Initial browser run: fixture server accidentally used SQLite-local settings; classified environment setup, not product behavior.
- First valid PostgreSQL browser run: rollback passed but Retry remained disabled; this reproduced and led to the memoized-state fix.
- Second valid run: database relationship was correct; the test was corrected to verify the branch detail API because the list snapshot intentionally omits relationship IDs.
- Production frontend build: passed, with the pre-existing CSS `end`/`flex-end` autoprefixer warning.
- TypeScript, focused ESLint, Django checks and migration drift: passed; no new migrations.

Important commands:

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55459 \
  POSTGRES_DB=hrms_dd8 POSTGRES_USER=hrms POSTGRES_PASSWORD=... \
  .venv/bin/python -m pytest backend/tests/test_dd8_organization_history_integrity.py -q

DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55459 \
  POSTGRES_DB=hrms_dd8 POSTGRES_USER=hrms POSTGRES_PASSWORD=... \
  .venv/bin/python -m pytest backend/tests/test_db6_organization_integrity.py \
  backend/tests/test_db5_effective_employment_integrity.py \
  backend/tests/test_dd8_organization_history_integrity.py -q

HRMS_API_BASE_URL=http://127.0.0.1:8020/api/v1 pnpm --dir web build

PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3120 \
PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8020/api/v1 \
PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME=pw_dd8_org_hr_admin \
pnpm --dir web exec playwright test \
  tests/e2e/dd8-organization-history-certification.spec.ts --workers=1 --reporter=line

pnpm --dir web typecheck
pnpm --dir web exec eslint tests/e2e/dd8-organization-history-certification.spec.ts \
  src/app/hr-admin/organization/organization-import-workbench.tsx \
  src/app/api/hr-admin/organization/import/route.ts
.venv/bin/python backend/manage.py check
.venv/bin/python backend/manage.py makemigrations --check --dry-run
```

## Security And Integrity

- Dependencies resolve only inside the authenticated actor's tenant.
- Cross-tenant organization codes cannot satisfy an import dependency.
- Concurrent batches with the same code yield one creation and one validation rejection.
- Existing direct-write tenant triggers, cycle guards, protected foreign keys, DB-1 through DB-6 controls and historical records remain unchanged.
- No Celery task participates in organization import or current workforce reporting; Celery evidence is not applicable to the executed DD-8 workflow.

## Modified Files

- `backend/apps/common/api_serializers.py`
- `backend/apps/common/api_views.py`
- `backend/apps/common/api_urls.py`
- `backend/tests/test_dd8_organization_history_integrity.py`
- `web/src/app/api/hr-admin/organization/import/route.ts`
- `web/src/app/hr-admin/organization/organization-import-workbench.tsx`
- `web/tests/e2e/dd8-organization-history-certification.spec.ts`
- `docs/qa/hrms-deep-domain-scenario-matrix.csv`
- `docs/qa/hrms-deep-domain-gap-register.csv`
- `docs/qa/hrms-dd8-domain-certification.md`

Evidence index: `docs/qa/evidence/dd8-2026-10-18/verification-summary.md`. The disposable fixture manifest is retained beside it; credentials and secrets are not recorded.

## Remaining Decisions

1. Approve a temporal organization-master design before adding future-dated node renames/reparenting (`DD-OR-004`).
2. Approve an `as_of` workforce reporting contract, including naming semantics after master renames (`DD-OR-005`).
3. Define the required outcome for concurrent archive-versus-assignment before closing `DD-OR-006` beyond existing safe deactivation restrictions.
4. Cross-entity restructure continuity remains the separate blocked `DD-OR-008` policy scenario.

DD-8 is **CONDITIONAL** because three frozen scenarios remain Partial. Production readiness remains **NO-GO**.
