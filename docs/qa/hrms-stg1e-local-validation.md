# HRMS STG-1E Local Validation

Date: 2026-10-26\
Environment: disposable local PostgreSQL 16 plus non-delivering Django mail backend

## Results

| Validation | Result |
|---|---|
| Staging email exact allowlist, fail-closed configuration, To/CC/BCC denial, hashed audit, silent denial, non-staging refusal | **7 passed** |
| STG-1A tooling plus STG-0D onboarding integrity on PostgreSQL | **20 passed**, 3 dependency deprecation warnings |
| Account invite/password-reset/notification regressions on PostgreSQL | **5 passed**, 3 dependency deprecation warnings |
| Django system check | **PASS**, zero issues |
| Migration drift | **PASS**, no changes detected |
| Python compile | **PASS** |
| Ruff | **NOT RUN**, executable not installed in the project virtual environment |
| Staging settings import probe | **PASS** |
| Production settings with `HRMS_ENVIRONMENT=staging` | **PASS**: protected backend wraps SMTP transport |
| Production settings with `HRMS_ENVIRONMENT=production` | **PASS**: configured SMTP remains unchanged |
| Targeted secret scan | **PASS**; only documented placeholder values were present |

The first combined pytest attempt used the default SQLite configuration. Nine non-database/email cases completed, while twelve PostgreSQL-only cases failed during migration setup on PostgreSQL trigger SQL. This was an environment mismatch, not a product assertion failure, and is not counted above. The tests were rerun on disposable PostgreSQL 16 and passed.

## PostgreSQL Security Assertions

Executed evidence includes:

- evidence transaction explicitly read-only;
- required database role identity check;
- exact tenant UUID/code/sandbox ownership;
- generated-admin same-tenant membership;
- cross-tenant membership rejection;
- rejected tenant operation left no persistent state;
- missing/mismatched deployment fingerprint rejection;
- cleanup dry-run default and protected-history refusal;
- concurrent cleanup lock, interruption rollback, and safe replay.

These tests prove application-layer tenant rejection on PostgreSQL. They do not make unrestricted base-table grants acceptable.

## Infrastructure Safety

- No staging database, role, IAM policy, key, container, worker, backup, or tenant was modified.
- No real email was sent; locmem was the transport for all allowlist tests.
- The disposable PostgreSQL container was stopped and automatically removed; no STG-1E container remains.
- The pre-existing payroll Playwright repair remains separate and untouched.
- All 136 staging scenarios remain `Not Run`.
