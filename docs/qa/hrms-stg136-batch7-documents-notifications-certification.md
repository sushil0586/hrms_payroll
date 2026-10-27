# HRMS STG-136 Batch 7 Documents and Notifications Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, private local file storage, Django and production-built Next.js 15.5.28\
Decision: **CONDITIONAL locally because external-provider evidence remains blocked**

## Frozen Results

| ID | Local result | Evidence disposition |
|---|---|---|
| STG-E2E-0701 | Passed | HR Admin created the category and mandatory employee requirement through the production browser; canonical API state, PostgreSQL ownership and employee-role mutation denial passed. |
| STG-E2E-0702 | Passed | ESS uploaded a synthetic PDF through the production browser; API, database metadata, tenant ownership and private file existence reconciled. |
| STG-E2E-0703 | Passed | Script upload was rejected in-browser; MIME restrictions and size/contract validation passed in backend coverage. |
| STG-E2E-0704 | Passed | Double-click produced one POST and one active document; concurrent PostgreSQL uploads created one active version and one artifact. |
| STG-E2E-0705 | Passed | HR Admin reviewed two separately uploaded documents through the production browser: one verified and one rejected with a reason; canonical API and PostgreSQL states reconciled. |
| STG-E2E-0706 | Passed | ESS replacement created version 2, retained the returned version and preserved history. |
| STG-E2E-0707 | Passed | Expired history, upload visibility, protected employee download, checksum/file metadata and payroll artifact acknowledgement passed. |
| STG-E2E-0708 | Passed | Other-employee and anonymous artifact access returned scoped denial; revoked membership, HR-only visibility and direct access checks passed. |
| STG-E2E-0709 | Passed | Browser read/unread, deep-link/search, failure/Retry and PostgreSQL notification ownership/read races passed. |
| STG-E2E-0710 | Blocked | Local capture verified the application-to-transport contract and exact recipient allowlist, but live SES and external private-object storage were not authorized or executed. |

Totals: **9 Passed, 0 Failed, 1 Blocked, 0 incomplete**. Shared staging remains **0 Passed / 136 Not Run**.

## Executed Evidence

- Production-built Playwright document suite: 10/11 first run; the sole failure was retired error-copy drift. The focused upload rerun passed 1/1. All eleven workflows therefore have passing final executions.
- Production-built Playwright notification suite: 3/3 passed.
- PostgreSQL document, notification, email and account regressions: 27/27 passed.
- PostgreSQL notification processor, reminder and bounded-retry regressions: 8/8 passed.
- TypeScript, focused ESLint, Django checks, migration drift and production frontend build passed.
- Closure rerun: focused production-built Playwright passed 2/2 in 24.4 seconds. Historical harness failures (cookie context, retired response-body and redirect assumptions, and missing Inspect action) remain retained and uncounted.

## Security And Storage

- Synthetic files only; no identity, payroll or banking document was used.
- Files remained behind authenticated application downloads. Employee B, anonymous, revoked and cross-scope requests were rejected.
- Concurrent single-file upload yielded exactly one active document and one artifact.
- Replacement retained the previous version; rejected/archived records remained historically visible.
- Fixture teardown deleted physical stored files and verified their absence before deleting the exact owned tenant.
- External signed-object URL expiry, bucket policy, encryption, lifecycle and backup controls remain unverified locally and are part of `0710`.

## Email And Celery

- Exact case-insensitive address allowlisting passed.
- Empty allowlist, wildcard and domain-only entries failed closed.
- Any unapproved To, CC or BCC recipient blocked the complete message.
- Security logs contained recipient hashes and did not expose denied addresses.
- Fail-silent mode returned zero and delivered nothing.
- The staging backend refused production use.
- Notification processor task, bounded retries, capped retry, expiry reminders and upload review notifications passed using local capture. No live SES call was made.

## Defect Disposition

The upload test expected a raw synthetic 503 message. Current UI intentionally reports an indeterminate outcome and tells the user to check document history before retrying, reducing duplicate risk. The test assertion was updated; application code was unchanged.

## Cleanup

Exact-ID workspace cleanup passed. Uploaded objects were removed and verified absent. Task-owned Django/Next processes, PostgreSQL/Redis containers and ports were removed. No shared environment was accessed.

Batch 8 cannot be started as a complete certification until an approved independent salary/statutory oracle exists. No statutory defaults were invented.
