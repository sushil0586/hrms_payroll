# Document Management Phase 2 — HR hub, queue and review

Prepared: 22 October 2026. Status: complete within the recorded HR operations makeover scope. This is the bounded Phase 2 slice of the [makeover plan](hrms-document-management-makeover-plan.md), based on the [initial baseline](hrms-document-management-phase1-design-baseline.md) and [remaining checks](hrms-document-management-phase1-followup.md).

## Design and scope

The hub becomes a task entry point rather than a table of repeated navigation: review queue as primary action, authorized upload as secondary, and grouped setup/letter/report destinations. Remove the unnecessary generated-letter read and its loaded-versus-total downloadable count. Retain the known report scope warning until Phase 5 fixes completeness. Use a wrapping standard header so title width cannot collapse at tablet sizes.

The queue uses matching totals separately from current-page pending/follow-up/expiry counts. Start with the full table; inspection deliberately opens a detail panel and focuses its heading. Keep advanced filters inline and visibly mark applied advanced scope. Pagination and review links use committed filters, while Apply/Enter commits drafts. Applying a new scope remounts its queue state, clearing stale selection/detail/drafts. Preserve off-filter independent review selection and save receipts.

Use one decision workflow: inspect then open the guarded review task. Retire the separate inline quick-save form from this queue so it does not bypass the task's close/pending/error behavior. Backend review endpoints and verification meaning remain unchanged.

The review task starts with employee/category/file identity and available authorized evidence, then verification/re-upload/note. Metadata and history are secondary expandable sections. A sticky action footer keeps Cancel/save close to the task. Page and dialog share the same form. Retain all existing writable fields, server validation, version and review history; do not imply a verified document alone establishes payroll/compliance eligibility.

## Permission/navigation boundary

The HR layout's denied fallback goes to an authenticated standalone access-denied page instead of `/`, avoiding the home → HR → home loop for elevated-only document roles. This does not grant a read or action permission. Users who enter through another listed HR permission but lack document read dependencies receive a deliberate document-access notice before document reads. The upload route also checks its employee-list dependency. Authorized file links require documents.export.

No backend permission change is part of this slice. Manage/verify/export-only users without a listed layout entry permission intentionally receive a stable denied destination. View-only supported HR-prefixed roles retain read access and do not acquire review/upload actions. Letter policy and report/export completeness remain Phase 5 findings.

## Interaction requirements

- Keep dirty drafts on declined Cancel/Escape discard prompts; use the shared modal guard and the form's own Cancel path.
- Block submit synchronously while pending, disable editable fields and closing, and require a real response before the success receipt.
- After server validation, retain the draft, expose field errors and open metadata if its fields are invalid. Focus the error summary.
- On a lost response, explain that the outcome was not confirmed and advise checking the queue before retrying; do not claim the server definitely rejected the change.
- Keep refresh/out-of-range recovery, no-match reset, page-size scope, selected-row identity, reminders and off-filter deep links working.

## Delivered artifact and executed checks

Final build: `MDJeQkj4biAXs7b_A6u7J`, retained at `web/.next/document-makeover-phase2-delivery`. [Provenance](../qa/evidence/document-makeover-phase2-2026-10-22/provenance.json), [805 runtime hashes](../qa/evidence/document-makeover-phase2-2026-10-22/source-manifest.json), [runtime delta](../qa/evidence/document-makeover-phase2-2026-10-22/runtime-delta.json) and [test hashes](../qa/evidence/document-makeover-phase2-2026-10-22/test-manifest.json) identify the artifact and harness. Eight existing runtime files changed and three were added relative to the Phase 1 manifest. Backend source checks match the six recorded baseline files, including api_serializers.py. No schema or backend permission change was made.

Production build/type checking and scoped ESLint passed. The [final browser report](../qa/evidence/document-makeover-phase2-2026-10-22/results.json) records **30 passed, zero failed/skipped/flaky**: ten scenarios in Chromium, Firefox and WebKit, with one worker and no retries. Each engine used a fresh synthetic tenant, 29 documents and an owned text artifact. Background notification processing was disabled and email used the local-memory backend.

| Scenario | Actual executed boundary |
| --- | --- |
| Responsive composition | Hub and queue at 1440/1024/768/390/320 CSS px; visible heading width and no document-body horizontal overflow; review at 320×600 with initial focus and focused-control bottom above footer |
| Committed scope | Draft search does not affect Next/review; explicit Apply changes scope; Cancel returns to the applied page/query; clear resets results |
| Dirty review | Off-filter selected document; declined Cancel/Escape preserves draft; accepted Cancel discards and returns to committed query |
| Server validation | Empty title produces field feedback; invalid metadata opens; note remains; Cancel is guarded |
| Pending and persisted outcome | Fields/Cancel disabled, Escape does not close, duplicate submit produces one PATCH; success receipt; independent list GET verifies Verified, cleared current rejection/re-upload state and the note in review history |
| Unconfirmed outcomes and standalone | Mocked network abort and 503 retain draft and explain uncertainty; same form on standalone route; header Back exercised by keyboard with declined/accepted discard |
| Permissions | Four explicit single-permission roles, stable layout denial or authorized view fallback, list/review/create/download API status checks, and mixed HR-readable roles without documents.view receive a document dependency notice |
| Reminder | Eligible selected row, actual POST 200, receipt and cleared selection; delivery to an external recipient is not asserted |
| Keyboard and recovery | Tab/Enter into metadata and title; out-of-range page recovers to the final page. The history disclosure has a focusable summary in source; separate traversal assertions for every history/date control were not executed |
| Semantic scan | Six axe rules on the review dialog: label, aria-dialog-name, aria-valid-attr-value, aria-required-attr, button-name, select-name; zero violations in this narrow scan |

The permission scenario includes 60 browser route checks and 48 API status assertions across engines. These test the recorded pure/mixed fixtures, not the entire permission lattice. An authorized invalid create/review request returning 400 proves that validation was reached; it is not a successful write acceptance case.

The Verified outcome follows the existing backend contract: verification clears the current rejection reason and re-upload request; a supplied note is retained in review history when verification status changes. The decision text states this explicitly. No extra audit behavior or review policy was introduced.

## Rendered review and execution lineage

The final run produced **42 viewport PNGs**. Fourteen were actually inspected across all three engines, including tablet hub, desktop/narrow queue, short review and denied destination. The [visual manifest](../qa/evidence/document-makeover-phase2-2026-10-22/visual-manifest.json) records exact file hashes, pixel dimensions and inspected subset. WebKit uses DPR2, so PNG dimensions differ from CSS viewport dimensions. Captures do not certify every scrolled field, history entry or full page.

Rendered review drove two refinements: compact destination copy/spacing and focus scrolling when a sticky footer would overlap the active review control. Final short-screen checks verify the status control is fully above that footer. The table retains an internal scroll region on narrow screens; this is distinct from document-body overflow.

Historical diagnostic runs remain in the evidence folder and do not accept later builds:

| Artifact | Result and disposition |
| --- | --- |
| `VVncHliAjm57yZgNcsyZp`, initial-run | 12 passed / 12 failed; wrapping-label lookups failed for select/options and error text. Review fields now use explicit label associations; both disclosure summaries participate in the modal focus list |
| `gUm9Ei7PmyDCF9eISjvWi`, reviewed-run | 26 passed / 4 failed; three readback attempts incorrectly used a PATCH-only Next detail adapter; one WebKit header-link pointer action did not stabilize. Readback uses the supported list GET; final standalone Back coverage is keyboard, not a claim that the historical pointer observation was fixed |
| `onmIi78e3p-gAfBmCDiL9`, focus-run | 26 passed / 4 failed; three assertions wrongly expected Verified to retain the current rejection reason; one WebKit navigation was interrupted by the preceding Cancel route transition. Backend rule is now asserted through current state plus history; harness awaits Cancel completion before the next navigation |
| `MDJeQkj4biAXs7b_A6u7J`, final | 30 passed / 0 failed, with corrected contract/readback/navigation synchronization and final decision copy |

Unserved build iterations and their compiler/lint output are retained separately as logs. They include an initial JSX error and a browser-event reference shadowed by the document prop, both corrected before the delivered build. Intermediate build directories were removed only after final source/evidence verification; prior accepted family builds remain untouched.

## Remaining boundaries and next phase

- DOC-C01 report truncation and DOC-C03 letter authorization/employee-read dependency remain Phase 5 work. The hub warns about current report scope and hides a letter entry that lacks its employee-read dependency; direct letter workflow/policy is not redesigned here.
- Category/requirement form Cancel behavior remains Phase 3. HR/ESS upload and replacement interaction redesign remains Phase 4; only the HR upload page's access dependency was included here.
- Native browser history traversal, external navigation, physical devices, native zoom, screen readers, full contrast/WCAG assessment, very large histories/tenants, all verification transitions and post-commit response-loss recovery are not certified. No durable server idempotency was added. The historical WebKit pointer-stability observation is retained; final standalone Back assertions use keyboard navigation.
- The shared HR layout now has a deliberate denied destination. Non-document HR permission combinations were not exhaustively retested. The shared modal implementation and backend action gates are unchanged.

## Cleanup and closure

[Cleanup](../qa/evidence/document-makeover-phase2-2026-10-22/cleanup.json) records zero task-database Tenant/User/Employee/EmployeeDocument/DocumentArtifact rows, owned stored-file absence, exact service/container/volume removal and released ports. The private runner was removed. The final build remains available; owned intermediate builds were removed. Runtime/test hashes, documentation links and whitespace checks were verified after the final run. No commit or deployment was performed.

Phase 2 is complete within this scope. Next: Phase 3 category and requirement setup, including standalone/dialog consistency and each form's own dirty/pending Cancel/navigation paths.
