# STG-1A Local Verification

Date: 2026-10-26
Environment: isolated PostgreSQL container and local browser/backend processes
Staging contacted: no

## Results

| Check | Result |
|---|---|
| Frozen Playwright onboarding, one worker | 6 passed in 17.1s |
| STG-0D backend/API plus STG-1A tooling | 19 passed in 139.33s on a fresh PostgreSQL container |
| TypeScript | passed |
| Focused ESLint | passed |
| Django system check | passed, zero issues |
| Migration drift | none |
| Production frontend build | passed; pre-existing CSS `flex-end` warning only |
| Exact-ID evidence command | passed; six assertions true |
| Cleanup dry-run | passed; exact three-resource plan, zero protected dependencies |

The browser journal contained 19 append-safe events, one run ID, all six frozen IDs, six passed terminal results, one tenant, two contacts, one user, one membership, and one observed denied-tenant operation. No credential was present.

## Negative And Recovery Coverage

Verified: incomplete journal, missing UUID, wrong run, wrong fingerprint, conflicting registration, missing tenant, tenant marker mismatch, unowned user, cross-tenant membership, protected dependent data, disabled cleanup, unauthorized cleanup, missing authorization/recovery references, dry-run replay, successful replay, concurrent lock rejection, injected interruption rollback, and successful retry.

The local browser database and processes were disposable. No historical local result was copied into the staging register; all 136 scenarios remain Not Run.
