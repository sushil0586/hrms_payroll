# HRMS Documents Full Local Certification

Date: 2026-11-05

Environment: isolated PostgreSQL 16, private local test storage, Django, and production-built Next.js

Verdict: PASS for local Documents module certification

## Certified Scope

- ESS required-document workspace, upload, validation, list/history, detail, replacement, withdrawal, and download.
- HR Admin document queue, upload, inspection, comparison, review, rejection, approval, reminder, and report handoff.
- Category and requirement configuration, validation, dirty-form protection, and permission boundaries.
- Loading, committed filters, every supported sort direction, pagination, stale-page recovery, empty-state pagination hiding, and durable receipts.
- Replacement lineage, approved-version preservation, duplicate suppression, concurrent upload serialization, and review lockout.
- File type, MIME/signature, size, corruption, malware-clean, detected/quarantined, and provider-error handling.
- Tenant/employee ownership, authenticated download authorization, audit attribution, notification idempotency, and physical-file compensation.
- Desktop, tablet, mobile, keyboard, focus restoration, overflow containment, and disabled-action cursor behavior.

## Fresh Verification

| Gate | Result |
| --- | --- |
| PostgreSQL/Django document integrity suite | 34 passed, 0 failed |
| Lifecycle Phase 7 across three engines | 12 passed, 0 failed |
| ESS/HR surface contract across three engines | 15 passed, 0 failed |
| Joined Phase 2-6 regression across three engines | 45 passed, 0 failed |
| Total focused browser cases | 72 passed, 0 failed |
| TypeScript | Passed |
| Targeted ESLint | Passed |
| Django system check | Passed, zero issues |
| Migration drift | None |
| Git whitespace check | Passed |

The backend run emitted three upstream Python/Django `asyncio.iscoroutinefunction` deprecation warnings. They did not indicate Documents behavior failures.

## Functional Evidence

- An approved document remains authoritative while a replacement is pending, rejected, or withdrawn.
- A verified replacement promotes atomically and retains predecessor/version history.
- A second pending replacement is rejected without altering the approved document.
- Withdraw replay is idempotent; a different employee receives the approved non-disclosing denial.
- Review rejection requires a reason and does not mutate state when validation fails.
- Approved-version and current-file downloads complete without leaving the control in a loading state.
- Reminder replay sends once and reports the subsequent attempt as skipped.
- Every ESS and HR sorting option returned a successful scoped API response and committed its URL state.
- Sorting persisted across pages; empty filtered results hid pagination.
- Permission-only roles retained stable denied destinations and unchanged API gates.
- The 111-row compliance report preserved sorting and CSV/manifest parity.
- HR upload, review, ESS download, and report handoff completed as one joined browser flow.

## Storage And Security Evidence

- Executable extensions, executable signatures, corrupt known formats, unsupported MIME types, and configured/default size violations were rejected.
- Clean signatures became downloadable; detected artifacts were quarantined; required external-scanner failures remained fail-closed.
- Cross-employee and cross-tenant downloads were denied without a successful download audit.
- Failed database persistence removed the already-written storage object.
- Concurrent single-file uploads produced one active version.
- Lifecycle events and notifications retained tenant, employee, actor, and document attribution without exposing file contents.

The separately preserved bounded staging certificate records authenticated download auditing, KMS-encrypted off-host backup, immutable S3 retention, centralized object-access logging, and an isolated PostgreSQL/media restore. This fresh local run did not repeat or mutate those AWS controls.

## Harness Improvement

A maintained `playwright.document-certification.config.ts` now runs the ESS/HR surface contract consistently across Chromium, Firefox, and WebKit using an explicit task base URL, one worker, retained failure traces, and deterministic evidence output.

## Cleanup

- Final `pw-qa-` tenant count: zero.
- Final Playwright-owned user count: zero.
- Final private test-media file count: zero; the temporary media directory was removed by governed cleanup.
- Backend/frontend ports were closed.
- The isolated PostgreSQL container was stopped.
- No shared staging or production resource was changed.

## Certification Boundary

Documents is fully certified for the local application revision and the scope above, with confidence above 95 percent for the exercised module contracts. Existing bounded staging download/recovery evidence remains valid for its recorded deployed revision; it is not fresh provenance for the current local tree. A short deployed-revision staging smoke is still required after the next deployment.

No commit, push, deployment, shared migration, real employee document, email, or payroll operation was performed.
