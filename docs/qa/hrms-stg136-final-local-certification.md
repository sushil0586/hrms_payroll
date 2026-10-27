# HRMS Final Local Certification Closure

Date: 2026-10-27\
Source parent: `7a55b33e20bfc5ba34f2c15017edd271c2092664`\
Decision: **CONDITIONAL**\
Production payroll: **NO-GO**

## Scope reconciliation

The frozen register contains 136 unique scenario IDs. Batch 0 (`0001`-`0006`) is a preflight group; Batches 1-14 are the **14 execution batches**. Earlier references to 15 batches counted Batch 0 as an execution batch and have been corrected without changing any ID, scenario, or result.

| Result plane | Passed | Failed | Blocked | Not Run/incomplete |
|---|---:|---:|---:|---:|
| Local certification | 131 | 0 | 5 | 0 |
| Shared staging | 0 | 0 | 0 | 136 |

The five local blockers are `STG-E2E-0710`, `0804`, `1010`, `1110`, and `1208`. Local evidence does not convert any scenario into a staging pass.

## Domain scorecard

| Batch | Scope | Local outcome |
|---:|---|---|
| 0 | Preflight | 6 Passed locally |
| 1 | Tenant onboarding | 6 Passed |
| 2 | Organization/legal entity | 8 Passed |
| 3 | Fiscal, leave-year and payroll calendars | 8 Passed |
| 4 | Employee onboarding/access/history | 10 Passed |
| 5 | Leave lifecycle | 12 Passed |
| 6 | Attendance/rosters/monthly close | 12 Passed |
| 7 | Documents/notifications | 9 Passed, 1 Blocked (`0710`) |
| 8 | Salary/statutory/readiness | 9 Passed, 1 Blocked (`0804`) |
| 9 | Payroll calculation/approval/lock | 10 Passed |
| 10 | Outputs/payments/finance | 9 Passed, 1 Blocked (`1010`) |
| 11 | Reports/imports/exports | 9 Passed, 1 Blocked (`1110`) |
| 12 | Lifecycle/history | 7 Passed, 1 Blocked (`1208`) |
| 13 | Recovery/idempotency/security | 10 Passed |
| 14 | Governed cleanup | 6 Passed locally |

Per-ID evidence remains in the frozen mapping, dashboard, batch reports and retained evidence directories. Historical failed runs remain visible and are not counted as passes.

## Representative release validation

- PostgreSQL 16 representative regression: initial `101 passed / 1 failed / 74 deselected`; the failure exposed a stale test attempting to mutate an immutable payroll snapshot. The fixture was corrected to establish warnings before locking, and its focused rerun passed.
- Expanded candidate regression: `76 passed / 1 failed / 326 deselected`; the failure exposed legacy seed cleanup deleting protected notification delivery history. Cleanup now preserves retained history and reports it; focused PostgreSQL reruns passed (`2/2` across the corrected payroll fixture and cleanup path).
- TypeScript: passed.
- Focused ESLint: passed.
- Django checks: passed, zero issues.
- Migration drift: none.
- Next.js 15.5.28 production build: passed with the existing CSS `flex-end` compatibility warning.
- Dependency audit: 0 critical, 1 high, 0 moderate. `GHSA-86w9-cpqp-85rv` remains visible through Expo CLI/node-forge and is not treated as resolved.
- Final exact-candidate representative PostgreSQL 16 regression: **288 passed, 142 deselected** in 722.33 seconds after correcting a multi-year test-fixture checker identity collision. This fresh run covers onboarding, organization/calendar, ESS profile, leave, attendance, salary/payroll, finance, imports, tenant isolation, evidence security and cleanup paths.

## Integrity review

Financial immutability, payroll maker/checker separation, tenant ownership, durable idempotency, exact-ID cleanup, historical leave/attendance/payroll protections and cross-tenant denial remain enforced. Two additive migrations are present: a tenant/import/source uniqueness constraint and the organization mutation audit table/index. Rolling back either removes its new protection and must not be used as a routine rollback after dependent writes.

The protected payroll Playwright repair remains outside the candidate and unchanged as a four-line diff. Its diff SHA-256 is `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.

The exact candidate contains **106 files**. Its sorted-path SHA-256 is `782c34ea88aad4105f5c3c18426aff94d7d7ac4962570e9c5adfc26d32dff160`; the manifest-file SHA-256 is `14588ec9c84a0399faf75b180f11e3ae5331fe68730793d3a80f77364d2ab6b5`.

## Decision

Local eligible-scope functional certification is complete, but the campaign is **CONDITIONAL** because five frozen scenarios require approved policy or real external infrastructure. Staging release is **BLOCKED** pending candidate approval, immutable build provenance, the node-forge disposition, staging-only evidence configuration, SES/storage isolation, backup/restore evidence, monitoring, and an authorized execution window. No commit, push, deployment, migration, staging mutation, payroll execution, or live communication occurred.
