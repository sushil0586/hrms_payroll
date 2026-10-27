# HRMS STG-1G Security Remediation Release Candidate Review

Date: 2026-10-27\
Decision: **BLOCKED after STG-1G.1 remediation**\
Parent Git SHA: `7a55b33e20bfc5ba34f2c15017edd271c2092664`

## Candidate Classification

The STG-1G.1 candidate contains 36 files: the prior 32-file candidate, three dependency metadata files and the dependency remediation report. It has no migration. The separate `web/tests/e2e/db6-payroll-processing.spec.ts` payroll repair is excluded; its diff SHA-256 remained `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb` after validation.

Manifest: `docs/qa/hrms-stg1g-release-candidate-manifest.txt`\
Manifest SHA-256: `227f1218adfccbafa86e93dd45caec9234fa8095fa88fa96afed0c11a0f4f5bd`

| Class | Count | Scope |
|---|---:|---|
| Security/evidence application and deployment configuration | 11 | Evidence endpoint, staging email backend, environment/fingerprint controls, permission catalogue, proxy header/query handling, environment examples |
| QA harness and fixture corrections | 5 | PostgreSQL/security tests, isolated identities, exact-ID evidence assertions, durable ownership manifest |
| Dependency metadata | 3 | Root overrides, pnpm lockfile and web Next.js version |
| Documentation/dashboard | 17 | STG-1D through STG-1G.1 evidence and unchanged staging scenario accounting |
| Excluded unrelated repair | 1 | Payroll Playwright Actions-tab repair |

The proposed commit message remains `fix(security): harden HRMS staging evidence and notification controls`. No staging, commit, push, deployment, migration, email delivery, or shared-data mutation occurred.

## Security Review

The evidence API is disabled by default and requires all of: `HRMS_ENVIRONMENT=staging`, explicit enablement, token authentication, an active superuser whose normalized username is in an exact actor allowlist, a matching environment fingerprint, a valid ownership-manifest SHA-256, a frozen Batch-1 scenario ID, and exact run-owned sandbox tenant/resource identifiers. Responses contain bounded status/assertion data, not employee or payroll payloads. The database assertion block uses a PostgreSQL read-only transaction. The route accepts only GET/HEAD/OPTIONS and logs structured allow/deny outcomes.

The Next.js proxy forwards only the two evidence headers on the exact evidence route and preserves repeated exact-ID query parameters. The staging email backend fails closed unless every recipient exactly matches the configured allowlist; denied addresses are logged only as SHA-256 values. Production defaults remain unchanged unless the production settings module is explicitly started with `HRMS_ENVIRONMENT=staging`.

Cleanup remains feature-gated, fingerprint-bound, exact-ID/run-ownership checked, authorization/recovery referenced, and dry-run oriented. No browser receives database credentials.

### STG-1G.1 remediation and remaining blocker

STG-1G.1 upgraded Next.js from 15.5.24 to 15.5.28 and patched the exact vulnerable `brace-expansion`, `zod` and `undici` transitive paths. The audit improved from 1 critical/9 high/4 moderate to 0 critical/1 high/0 moderate.

The remaining `GHSA-86w9-cpqp-85rv` finding is `node-forge@1.4.0` under Expo CLI. The audit reports all published versions affected and no patched version. It remains a release blocker pending a patched upstream release, separately certified toolchain replacement, or formal security-owner disposition.

## Fresh Local Validation

| Gate | Result |
|---|---|
| Browser workflows against task-owned Django/Next.js services | **6 passed** in 20.9 seconds, one Playwright worker |
| Independent evidence API | **6/6 passed** with exact run/scenario/resource scope |
| PostgreSQL backend/security/email tests | **36 passed**, 3 dependency deprecation warnings, in 100.92 seconds |
| Initial combined backend invocation | Not counted: 4 failures caused by forcing one staging fingerprint across fixture-specific/non-staging tests; intended `config.settings.base` PostgreSQL rerun passed 36/36 |
| TypeScript | PASS |
| Focused ESLint | PASS |
| Django checks | PASS, zero issues |
| Migration drift | PASS, no changes detected |
| Frontend production build | PASS; existing CSS autoprefixer warning only |
| Python dependency consistency | PASS, no broken requirements |
| JavaScript dependency audit | **BLOCKED**, 0 critical and 1 high (`node-forge` Expo CLI path) remain |
| Targeted secret scan | PASS: only environment-variable reads and explicit synthetic test passwords matched; no key material or live credential pattern found |
| Git whitespace check | PASS |

The six local workflows used run `stg1-local-20261027g`, a separate Platform QA identity and tenant-admin identity, locmem email transport, disposable PostgreSQL 16 and Redis 7, and ownership manifest SHA-256 `59d39fa3f11a190e9af1543d657a9478fdb0df053e8dfd44b878fe6faf5528ce`. All task-owned services and data were removed. These are local results only; all 136 staging scenarios remain `Not Run`.

## Deployment Impact

- Migrations: none.
- Backend restart: required for settings, URL, authorization, and email-backend changes.
- Celery worker/beat restart: required so outbound notifications load the same allowlist backend and environment.
- Frontend restart: required for the proxy change.
- Configuration: new staging fingerprint, evidence actor/enablement, evidence DB role reference, cleanup switch, exact recipient allowlist, synthetic domain, and delegated email transport.
- Rollback risk: rolling back the application can remove evidence/email isolation. Disable and revoke the evidence identity first, retain fail-closed outbound email controls, then roll back immutable images as a coordinated backend/web/worker release.

## Decision

**STG-1G/STG-1G.1 BLOCKED.** The critical Next.js runtime finding is closed and local regressions are green, but one unresolved high-severity Expo CLI dependency has no patched release or approved risk disposition. The exact manifest is prepared but not approved, staged, committed, pushed, built into an immutable release image, or deployed.
