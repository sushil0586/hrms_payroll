# DD-8 Verification Evidence

- PostgreSQL image: `postgres:16-alpine`
- Isolated port/database: `55459` / `hrms_dd8`
- Disposable tenant: `pw-qa-dd8-org`
- DD-8 integrity tests: 4 passed, 1 warning, 82.21 seconds
- Organization/DB-5/DD-8 neighboring regression: 14 passed, 3 warnings, 116.25 seconds
- Production Playwright final: 1 passed, 9.9 seconds
- TypeScript: passed
- Focused ESLint: passed
- Django checks: no issues
- Migration drift: no changes detected
- Production Next.js build: passed; pre-existing CSS autoprefixer warning retained
- Cleanup command: deleted tenant and verified absent
- Backend/frontend listeners: stopped
- Isolated PostgreSQL container: removed

Historical browser outcomes retained in the certification report:

1. Environment mismatch: backend started with local SQLite settings; login failed and was not counted.
2. PostgreSQL reproduction: atomic rollback succeeded, but UI Retry remained disabled due to memoized row mutation.
3. After UI repair: persistence succeeded; list snapshot did not expose relationship IDs, so final verification was correctly scoped to the branch detail API.
4. Final rerun: passed.
