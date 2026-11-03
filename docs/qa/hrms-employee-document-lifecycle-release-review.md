# Employee Document Lifecycle Patch Release Review

## Freeze identity

- Branch: `main`
- Parent HEAD: `0a26fc8587884ebe8a4665ff052ef7cc59e2c260`
- Manifest: `docs/qa/hrms-employee-document-lifecycle-patch-manifest.txt`
- Manifest file count: 29 unique paths
- Manifest SHA-256: `1d254460d1f648c48c2a13383e2a6018294341222759931176fb68e3d20dbb3b`
- Commit state: not authorized and not created
- Deployment state: not authorized and not performed

## Patch scope

The candidate introduces governed employee-document replacement and withdrawal. An approved document remains authoritative while a candidate is pending. Approval promotes the candidate and supersedes the prior version atomically; rejection or employee withdrawal preserves the approved version. The patch also adds typed category upload controls, immutable lifecycle events, HR comparison UI, rejection-reason enforcement, malware scan/quarantine state, and cross-browser lifecycle tests.

The two release-control documents are included in the candidate. Generated Playwright traces, screenshots, JSON results, local media, databases, build output, and runtime logs are excluded.

## Migration review

Apply in dependency order:

1. `documents.0004_employee_document_replacement_statuses`
2. `documents.0005_document_category_upload_policy`
3. `documents.0006_document_lifecycle_audit_event`
4. `documents.0007_document_artifact_malware_scan`

Migration `0004` expands employee-document status choices without rewriting records. Migration `0005` adds nullable/defaulted category policy fields and safely backfills typed MIME values from legacy visibility rules. Migration `0006` creates the lifecycle audit table, its lookup index, and a conditional uniqueness constraint preventing more than one pending candidate per prior document.

Migration `0007` adds scan status, scanner reference, scan timestamp, quarantine reason, and a tenant/status lookup index. Existing artifacts are explicitly marked `not_required` with a `legacy-artifact` reference; newly stored artifacts are fail-closed according to runtime scanner mode.

No destructive data operation is present. Rollback of `0006` removes lifecycle events and the uniqueness constraint, so rollback loses newly collected audit evidence and must be approved as evidence-destructive. Rolling back `0005` removes typed category policy data. Rolling back `0007` discards scan/quarantine evidence. Rollback must therefore use the pre-deployment backup and application/image pair rather than treating reverse migrations as lossless.

`GeneratedLetter.status` previously reused employee-document choices. A dedicated behavior-equivalent `GeneratedLetterStatus` enum now preserves its original `active`, `archived`, and `replaced` contract and prevents the new employee states from producing unrelated migration drift.

## Verification evidence

- PostgreSQL employee-document workflow: 26 passed
- Malware controls: clean local-signature scan, detected-signature quarantine, scanner-unavailable fail-closed approval denial, and sensitive-content exclusion passed
- ESS document contract: 7 passed
- Fresh Phase 7 browser lifecycle: 9 passed across Chromium, Firefox, and WebKit on isolated PostgreSQL 16
- Independent ESS/document-integrity suites: 8 passed
- Broad Phase 2-6 browser regression: 45 passed across Chromium, Firefox, and WebKit
- Focused Phase 3 setup lifecycle: 6 passed across Chromium, Firefox, and WebKit
- Phase 3 root cause was inconsistent save lifecycle handling: standalone saves navigated with `setup_saved=1`, while modal saves removed the edit state without retaining a success marker or exposing an accessible confirmation. Modal category and requirement saves now preserve the selected side panel, write the same durable success query marker, refresh the register, and expose one `role=status` confirmation. Duplicate submission, dirty-close protection, create/edit persistence, and browser history behavior passed on all three engines.
- Phase 7 scenarios: governed withdrawal, idempotent replay, approved-version preservation, HR comparison, required rejection reason, rejected-candidate archival, duplicate pending-candidate denial, approval promotion, cross-employee denial, mobile containment, and keyboard dialog behavior
- TypeScript: passed
- ESLint: passed
- Django system check: passed
- Django migration drift: no changes detected
- Production Next.js build: passed with the existing Autoprefixer compatibility warning at `globals.css:4687`
- `git diff --check`: passed
- Candidate pattern scan: no AWS access key, private-key header, or AWS secret assignment detected

Reproducible browser evidence is retained under `docs/qa/evidence/document-lifecycle-phase7-2026-11-03/` and is excluded from Git by repository policy.

## Security and privacy review

- Employee withdrawal is tenant- and employee-scoped.
- Cross-employee access returns not found and does not disclose the record.
- Server-side MIME and size controls remain authoritative.
- Replacement policy is enforced by the backend; disabled UI controls are not the security boundary.
- Previous approved artifacts remain private and require document-export permission for HR download.
- Lifecycle transitions are independently audited without embedding document bytes or private payloads.
- Quarantined, pending, and scanner-error artifacts cannot be downloaded or approved.
- ESS receives a clear held/quarantined state without exposing scanner internals or file content.
- No credential, employee document, payroll evidence, runtime database, or private storage artifact is included in the candidate.

## Remaining operational boundaries

- Local scan/quarantine behavior is implemented. Staging must configure `HRMS_DOCUMENT_MALWARE_SCAN_MODE=required_external` with an approved scanner adapter; until that adapter reports clean, files remain held by design.
- Retention and legal-hold deletion remain governed by the platform retention service.
- Staging deployment requires an encrypted backup, immutable image identity, migration approval, and synthetic-document verification.
- No commit, push, deployment, migration, or staging mutation is part of this freeze.

## Release verdict

The local document replacement, withdrawal, scan/quarantine, access-control, setup lifecycle, and integrity scope passes PostgreSQL and cross-browser certification. Local verdict: PASS. Staging remains CONDITIONAL on approved external scanner configuration and fresh staging verification; production readiness remains a separate decision.
