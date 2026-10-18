# HRMS/Payroll DD-2 Document Lifecycle Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**

## Scope and outcome

The frozen DD-2 scope is exactly `DD-DOC-001` through `DD-DOC-008` from the existing 81-scenario matrix.

| Scenario | Outcome | Evidence |
|---|---|---|
| DD-DOC-001 Upload, verification, rejection and resubmission | Verified | Fresh ESS failure/Retry and HR upload/review browser passes; document service regressions |
| DD-DOC-002 Object-level download authorization | Verified | P3-0612, DB6-08-004, DB4 tenant guards and scoped endpoint review |
| DD-DOC-003 Replacement and version history | Verified | Existing browser history plus checksum/predecessor tests and fresh concurrent replacement proof |
| DD-DOC-004 Expiry boundaries and reminders | Verified | PostgreSQL-backed `-1/0/30/31` boundary matrix and notification payload test |
| DD-DOC-005 Interrupted upload, retry and duplicate safety | Verified | Browser Retry pass, storage compensation test and concurrent one-active-document test |
| DD-DOC-006 Invalid type/size/malware/provider handling | Partial | Type, size and storage cleanup verified; scanner, signed URLs, encryption and deployed provider/backup controls are not certified |
| DD-DOC-007 Legal hold and retention protection | Verified | Disposable browser governance pass plus DB4B API/PostgreSQL hold and erasure guards |
| DD-DOC-008 Expiry reminder idempotency | Verified | Locked deterministic state/day key produced exactly one notification across retry |

Unique DD-2 status: **7 Verified, 0 Failed, 0 Blocked, 0 Skipped, 0 Not Run, 1 Partial**.

## Defects fixed

1. Expiry reminder retries could emit duplicate notifications. Reminder dispatch now locks the document and uses a deterministic document/state/local-date key.
2. Concurrent single-file uploads could race replacement selection. Creation is atomic and locks the category, serializing that category's active-document transition.
3. A storage object could survive when database persistence failed after the file write. Both artifact storage and document creation now compensate by deleting the written object.
4. The compact document queue requires Inspect before Review; the stale direct Review locator was updated while retaining exact source-record assertions.
5. Shared policy CRUD automation waited for an obsolete dedicated edit URL. It now accepts the compact query/dialog edit workflow and still verifies the persisted ID.
6. Governance browser setup depended on fixed shared identities. It now provisions and removes an authorized disposable workspace.

No document business rule, tenant scope, retention rule or API response contract was weakened.

## Integrity findings

- Replacement is non-destructive: predecessor, version number, verification history and artifact checksum remain available.
- Concurrent replacement permits one active document for a single-file category.
- Employee downloads filter by both tenant and employee. HR downloads filter by tenant and require HR context/permission.
- Deactivation removes active workspace access while retained document history remains protected.
- Legal holds and retention eligibility are enforced by the existing DB4B governance path; ordinary replacement does not purge artifacts.
- Reminder retries are idempotent for the same document, state and local day.
- Failed row persistence leaves neither `DocumentArtifact` nor a storage file.

## Remaining security and policy gates

1. Integrate an approved malware scanner with explicit quarantine/failure states and certify scanner outage/retry behavior.
2. Approve and deploy protected object storage with encryption-at-rest evidence, lifecycle retention and encrypted backup/restore validation.
3. Decide whether employee documents require short-lived cryptographic signed URLs; current downloads are protected authenticated proxy streams.
4. Define category-level confidential/HR-only visibility semantics separately from `allow_employee_upload`; employee ownership isolation exists, but an explicit document-visibility policy is not modeled.
5. Execute provider-failure, backup/restore and storage-retention tests in the production-like staging environment.

## Modified files

- `backend/apps/common/api_views.py`
- `backend/apps/documents/services.py`
- `backend/apps/documents/tests.py`
- `backend/tests/test_dd2_document_integrity.py`
- `web/tests/helpers/isolated-qa-workspace.ts`
- `web/tests/e2e/db4b-data-governance.spec.ts`
- `web/tests/e2e/policy-governance-master-crud-flows.spec.ts`
- `web/tests/e2e/employee-phase3f-closure-certification-flows.spec.ts`
- Deep-domain matrix, gap register, this report and DD-2 evidence.

## Verification summary

- Backend/PostgreSQL: **22 passed** broad focused set; **9 passed** final document/concurrency set.
- Browser: document upload/retry/review and governance/category/requirement flows passed. One neighboring phase-3F rerun was environment-interrupted during authentication and is retained as such, not counted as a pass.
- TypeScript: passed.
- Targeted ESLint: passed.
- Django checks and migration drift: passed.
- Production frontend build: passed.
- Disposable workspace cleanup: `verified_absent: true`.

Detailed commands and retained run history are in `docs/qa/evidence/dd2-2026-10-18/001-dd2-execution-evidence.md`.

DD-2 is conditionally complete. The document lifecycle and retention integrity behaviors are verified, while external security/storage capabilities remain open. DD-3 was not started. This local result does not establish production readiness.
