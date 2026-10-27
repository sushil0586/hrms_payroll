# HRMS STG-1F Security Verification

Date: 2026-10-26\
Environment: disposable local PostgreSQL 16 and non-delivering mail transport\
Decision: **LOCAL PASS; DEPLOYED SECURITY NOT VERIFIED**

## Executed Results

| Check | Result |
|---|---|
| Evidence API plus prior onboarding/tooling/email PostgreSQL regression | **42 passed**, 3 dependency deprecation warnings |
| Evidence API focused PostgreSQL run | **15 passed** |
| TypeScript | **PASS** |
| Focused ESLint | **PASS** |
| Django system checks | **PASS**, zero issues |
| Migration drift | **PASS**, no changes detected |
| Python compilation | **PASS** |
| `git diff --check` | **PASS** |
| Production frontend build | **PASS**, existing CSS `flex-end` compatibility warning only |
| Fresh local Playwright attempt | **ENVIRONMENT BLOCKED** at login: local backend unavailable (`ECONNREFUSED`); 1 setup failure, 5 serial cases not run |

The first focused evidence invocation inherited the local SQLite settings and failed while applying PostgreSQL trigger SQL. It was an invalid environment, produced no passed assertions, and is retained as a setup failure. The suite was rerun with `config.settings.base` against disposable PostgreSQL 16 and all 15 tests passed. The combined PostgreSQL run then passed all 42 selected tests.

The fresh Playwright attempt started only the local web server and could not reach a backend. No tenant or onboarding mutation occurred. It is not counted as a failed business scenario and does not replace STG-1A's prior 6/6 isolated local browser result. Generated failure media was removed after diagnosis.

## Security Assertions

Executed PostgreSQL tests cover:

- missing authentication (401) and authenticated but unconfigured QA actor (403);
- API disabled and non-staging environment (404);
- missing or mismatched environment fingerprint;
- unsupported scenario, invalid run ownership and missing mandatory IDs;
- tenant UUID/code mismatch and cross-tenant membership IDs;
- GET-only contract and a read-only PostgreSQL transaction;
- bounded contact identifiers;
- redacted response schema and sensitive-data exclusion;
- allowed/denied structured audit events;
- persistent absence of the rejected tenant operation;
- all six frozen scenario schemas and prior exact-ID cleanup protections.

The existing staging mail boundary was also revalidated: exact normalized address allowlisting, fail-closed missing/wildcard configuration, mixed To/CC/BCC denial, hashed denial logging, silent denial and refusal outside staging. Direct and Celery notification delivery both resolve Django's configured backend, so the same pre-delivery control applies; no real mail or external SES call occurred.

Production behavior is unchanged unless `HRMS_ENVIRONMENT=staging` is explicitly supplied. The API remains disabled by default in every environment.

## Cleanup

The PostgreSQL 16 container was run locally with synthetic records only. It was removed after verification. No staging tenant, role, database, worker, AWS resource, email recipient or backup was accessed or changed.

## Residual Security Gates

- Deploy and verify the exact candidate before the endpoint exists on staging.
- Create/approve the dedicated QA service identity and narrowly time-bound actor allowlist.
- Configure the opaque fingerprint and exact synthetic recipient via the approved secret channel.
- Verify central security-log ingestion and alert delivery.
- Apply source-network/rate controls at the reverse proxy if required by the security owner.
- Revoke API enablement and the QA token after the execution window.
