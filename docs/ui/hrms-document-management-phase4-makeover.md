# Documents Phase 4 — HR intake and employee document center

Prepared: 22 October 2026. Status: complete within the intake/ESS scope and verification boundaries below. Letters, compliance and joined family closure remain separate phases.

## Design and scope

Apply the [shared standard](hrms-ui-ux-standard.md) and [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md) to `/hr-admin/employee-documents/new` and `/ess/documents`, including employee upload/replacement, requirement detail and document detail dialogs. The earlier [rendered baseline](hrms-document-management-phase1-design-baseline.md) and [follow-up](hrms-document-management-phase1-followup.md) supply historical design findings; this phase does not claim a new pre-change capture run.

HR intake uses one task heading, an ownership/evidence group, category-driven guidance, deliberate validation and a confirmed storage receipt. Employee requirements precede searchable history, supported by a compact account-wide summary. History filters and paging have an explicit committed scope. Employee controls remain disabled until hydration completes so server-rendered controls cannot accept drafts before React can retain them. Keep the same role shell, controls, status, focus and modal patterns used by the prior phases.

## Domain contracts to preserve

HR upload requires `documents.manage` and read dependencies `documents.view` and `employees.view`. Employee upload derives ownership from the authenticated employee context. No user-selectable employee ID belongs in the ESS payload. Backend category eligibility, tenant ownership, MIME validation, required expiry, single/multiple active files, replacement and verification policy remain authoritative.

HR reads category details through the existing authorized category endpoint. It displays configured MIME restrictions, expiry requirements and multiplicity guidance; unknown visibility-rule keys are not changed. ESS options expose eligible category IDs/names and requirement flags but no MIME allowlist. ESS therefore explains server-side category checks rather than inventing an exhaustive accepted-file promise. Both forms retain existing client validation for blocked file extensions and the API-provided size limit. Browser `accept` is a convenience, not an authorization or content-scanning guarantee.

HR and ESS retain their existing date semantics: issue dates cannot be future, expiry follows issue date, required-category expiry is enforced, and ESS fresh uploads additionally reject past expiry. No backend policy is changed to make those entry points identical.

A replacement creates a new record/version, retains the prior record and links `previous_document_id`; the server marks the previous active record replaced. The new version follows the category review policy. HR's existing automatic replacement for returned single-file evidence is preserved; this phase does not invent a general HR replacement selector.

## Common interaction contract

- Stable labels, field error associations, retained input/file selection and focused error feedback.
- Synchronous duplicate-submit prevention; fields and close/cancel actions lock during the write.
- Dialog Cancel, header close and Escape share the modal's controlled busy/dirty guard. Native unload and link navigation warn about drafts; browser-history interception remains outside this contract.
- Transferred bytes are distinct from storage confirmation. The optional shared progress state says the server confirmation is still pending after transfer reaches 100%; other consumers retain existing behavior by default.
- A validated stored-document acknowledgement produces a receipt using filename, version and verification status. HR shows that acknowledgement directly. ESS loads a fresh authorized page, retaining applied history filters; details come from the matching record when it is on that page, otherwise the receipt explains that history remains filtered. Automatically verified uploads are not described as pending HR review.
- Malformed 2xx acknowledgements, network failures and 5xx responses describe an unconfirmed outcome and advise checking history before retrying; a retained draft does not prove a write failed.

## Employee center details

The summary and assigned requirements are independent of history filters. Apply commits draft history filters; paging reuses the committed scope. No matches and genuine zero uploads receive different messages. Document detail distinguishes missing stored artifacts, existing review history and category file history. The backend history collection includes separate files of the same category as well as replacement versions, so it is not presented as one exclusive lineage. A requirement whose current record lies outside the loaded history page explains that limitation; it does not assert a stored file exists or silently fetch broader employee records.

The ESS receipt query marker is navigational feedback, can be copied/edited, and is not durable proof of a transaction or permission to read a record. A fresh read remains employee-scoped. Background mutation refresh is avoided because the rendered WebKit test reproduced interruption of the next navigation.

## Verification and closure

Accepted build: `web/.next/document-makeover-phase4-finalized`, BUILD_ID `s52_wua-pTcxThlZrx4jL`. Production build, type validation and focused runtime/test ESLint passed. The [evidence directory](../qa/evidence/document-makeover-phase4-2026-10-22/) contains the [21-check browser result](../qa/evidence/document-makeover-phase4-2026-10-22/results.json), [final validation](../qa/evidence/document-makeover-phase4-2026-10-22/final-validation.json), [visual manifest](../qa/evidence/document-makeover-phase4-2026-10-22/visual-manifest.json), [persisted proofs](../qa/evidence/document-makeover-phase4-2026-10-22/persisted-proofs.jsonl) and [cleanup](../qa/evidence/document-makeover-phase4-2026-10-22/cleanup.json).

Seven scenarios passed in each browser: **21 passed, zero failures, skips or flaky results**, retries disabled and one worker. Chromium, Firefox and WebKit each rendered HR intake, employee center, upload, replacement, requirement detail and document detail at five widths: **90 surface/viewport/browser visits and 90 PNG captures**. HR/center root overflow and upload/replacement dialog Cancel visibility were asserted. Fourteen representative images were reviewed: ten directly from this run and four whose hashes exactly matched directly inspected `hydration-run/` captures. The manifest identifies paths, dimensions, hashes and reuse; this does not claim manual inspection of every capture. WebKit images use a device-pixel ratio of two. Initial standalone captures require scrolling for lower fields; the 320px center does not promise every requirement above the first viewport.

The other scenarios checked HR ownership selection before file input, required-field and configured-MIME validation, focused errors, dirty Cancel/Back keep, pending disabled fields/Cancel and duplicate-submit protection, a real 201 and storage receipt followed by a fresh queue read. Employee checks covered dirty Cancel/header close/Escape keep, expiry validation, real MIME/empty-file server rejection, retained filename and input after simulated 503, pending disabled close actions/ignored Escape, a real replacement and independent readback, correct automatic-acceptance wording, restricted-category action visibility, committed paging and applied/cleared filters, malformed 200 and aborted-connection recovery, and genuine empty history.

In all three browsers the replacement produced version 2 with the original ID as `previous_document_id`; an authorized HR collection read found the original record marked `replaced` and the new record `pending`. The employee downloaded exactly the uploaded 22-byte content; another employee received 404 for that same stored file. This is a positive-artifact ownership check, not an exhaustive tenant/role authorization lattice. Multipart interception preserves the original browser request; the test does not forward WebKit file bodies through `route.fetch()`.

The source manifest records 809 runtime entries and the test manifest records the exact suite/config/fixture hashes. Post-run verification found zero runtime/test mismatches. Relative to Phase 3, six existing runtime files changed and two upload helpers were added; no files were removed. Six backend contract files, including `backend/apps/common/api_serializers.py`, matched the Phase 1 follow-up hashes. The shared modal, backend serializers, schema, permissions and upload transport are unchanged.

Fixture teardown left zero Tenant, User, Employee, EmployeeDocument and DocumentArtifact rows in the isolated database. Across all recorded runs, 51 owned artifact paths were verified absent and 46 empty owned storage directories were removed. The exact backend/Next processes, PostgreSQL container/volume, fixture contexts, three private editing/runner scripts and three intermediate build directories were removed. Ports 55472, 8073 and 3273 were free. The accepted Phase 4 build and prior accepted phase builds remain; generated `web/tsconfig.json` and `web/next-env.d.ts` changes were restored exactly to HEAD. No commit or deployment was performed. Notification processing was disabled and mail stayed local; no external delivery is certified.

Earlier runs are retained as diagnostics: `initial-run/` records 11 passes and four failures (three premature 100%-transfer expectations plus a WebKit refresh/navigation race); `reviewed-run/` records 20 passes and a Chromium response-body lifetime failure; `hydration-run/` records 19 passes and two WebKit failures involving forwarded multipart data and rapid filter interaction. It also retains the fourteen directly inspected predecessor captures. The final run uses native multipart submission, authorized persisted readback and readiness-aware navigation. Only the accepted build/result above closes this phase.


## Ownership and verification boundaries

The two intake components own their original payloads and form state. `use-document-upload-draft.ts` supplies shared native/link protection, and `document-upload-result.ts` validates stored-document acknowledgement fields before a receipt. The existing upload transport is unchanged. The optional `awaitingConfirmation` progress property defaults off for unrelated consumers. Scoped CSS supplies the form rhythm and employee dialog grid; no new role shell or palette is introduced.

The browser suite uses isolated synthetic tenants and local storage/mail. It renders six surfaces at 1440, 1024, 768, 390 and 320px; 320px uses 600px height. Real writes, stored downloads and cross-employee rejection supplement client validation. The held-request test verifies pending feedback before storage acknowledgement; holding a browser route before transfer does not exercise a real 100% transfer event. Network aborts, 503 responses and malformed 200 bodies are simulations, not claims about a real lost acknowledgement after a committed transaction.

Formal screen-reader/native-zoom/physical-device testing, full Tab/date-segment traversal, exhaustive authorization combinations, large-file throughput, storage-provider failover and all possible category-rule combinations are outside this phase's acceptance. Source-level permission dependencies retain earlier discovery evidence; no backend policy/schema change is included.


## Next phase

Phase 5 covers generated letters and document compliance. Resolve complete report/export scope (DOC-C01) and explicitly assess existing letter-operation authorization (DOC-C03) before changing those contracts. Phase 6 joins completed phases for bounded family closure; this Phase 4 result does not certify unfinished pages.
