# Document Management Phase 6 — joined family closure

Prepared: 23 October 2026. Status: complete within the Document Management UI/workflow scope and verification limits below. DOC-C03 remains a separate policy decision.

## Scope

Join the completed hub, queue/review, category/requirement setup, HR intake, ESS document center, generated letters and compliance report. The shared [UI/UX standard](hrms-ui-ux-standard.md) and [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md) remain the design baseline.

The initial run matched and reused the accepted Phase 5 immutable build, BUILD_ID `9TH9c8tI2bokO-WY7-Ych`. It exposed a review-save navigation race; final verification uses a new immutable production build after the focused fix. Test-only evidence routing allows earlier regression cases to write to this phase's directory without overwriting prior records.

A selected 42-check matrix runs across Chromium, Firefox and WebKit: four HR queue/review/role/keyboard regressions, two setup validation/create/edit regressions, three HR/ESS upload/replacement/receipt regressions, two letter/report regressions and three new joined scenarios per browser. New route coverage visits all 13 route patterns and seven additional detail/query-dialog states at 1440px and 320px. Five-width individual phase evidence remains historical evidence of its recorded source; it is not relabeled as a fresh Phase 6 run.

The joined write flow starts from the hub, uploads a real file for an employee, returns through the queue receipt, filters/inspects/reviews it, reads verified employee history, downloads the exact bytes, checks a second employee's denial and locates the same record in the compliance report after reload. Keyboard checks cover hub links/history and review Tab/Shift+Tab/Escape/focus return.

## Boundaries

DOC-C03 remains an explicit operation-specific letter authorization policy decision. Existing broad HR gating is preserved; UI makeover authorization does not imply permission to invent backend policy. No schema, storage migration, commit or deployment is included. Formal assistive technology, physical devices/native zoom, exhaustive template/domain/security lattices and transactional report snapshots remain outside acceptance.

Evidence: [Phase 6 directory](../qa/evidence/document-makeover-phase6-2026-10-23/), [final validation](../qa/evidence/document-makeover-phase6-2026-10-23/final-validation.json), [accepted cases](../qa/evidence/document-makeover-phase6-2026-10-23/accepted-cases.json), [visual manifest](../qa/evidence/document-makeover-phase6-2026-10-23/visual-manifest.json), [handoff proofs](../qa/evidence/document-makeover-phase6-2026-10-23/joined/handoff-proofs.jsonl) and [cleanup](../qa/evidence/document-makeover-phase6-2026-10-23/cleanup.json).

## Findings disposition

| Finding | Disposition and scope |
| --- | --- |
| DOC-V01 — heavy queue summary | Compact scoped summaries and operational queue hierarchy in Phase 2; current-page expiry counts retain their meaning. |
| DOC-V02 — repeated navigation | Phase 2 hub groups setup and letters/report entries around a daily review task. |
| DOC-V03 — compressed review decision | Shared page/dialog task, grouped metadata/history, bounded scroll and visible actions; keyboard and short-dialog checks recorded in phase evidence. |
| DOC-V04 — tall setup forms | Phase 3 category/requirement grouping, dependencies, compact switches and consistent page/dialog guards. |
| DOC-V05 — repeated intake introduction | Phase 4 single task header, ownership/file grouping, progress and confirmed storage receipt. |
| DOC-V06 — narrow letter draft/oversized preview | Phase 5 useful draft width, content-sized preview, exact draft binding, stacked mobile layout and stored artifact receipt. |
| DOC-V07 — report chrome before evidence | Phase 5 scoped summary and explicit filter/export population; Phase 6 includes fresh report entry rendering. |
| DOC-C01 — first-100 report/export truncation | Complete bounded collector and matching exports verified with 111 records, including the oldest stored artifact; 10,000-row bound and concurrency limits remain explicit. |
| DOC-C02 — permission/navigation loops | Stable denied destinations preserve existing API gates and read dependencies; custom permission-only regression coverage retained. |
| DOC-C03 — broad letters gate | Assessed, preserved and carried as a product/security policy decision. Operation-specific authorization is not certified or silently changed. |

Visual findings are implemented within the recorded routes and checks, not a claim of exhaustive aesthetic or accessibility acceptance. The initial run exposed a review-save navigation race and a test synchronization issue. Both corrections were verified against the final source, with the exact execution lineage below.

## Reusable family contract

| Area | Rule for subsequent screen makeovers |
| --- | --- |
| Page entry | Reuse the role shell and shared operational header; put the daily task before setup/navigation. State whether summaries cover the page, loaded population or an employee account. |
| Lists and reports | Keep applied filter scope through paging and review. Use explicit Apply where a draft filter exists; label immediate filtering where it is intentional. Copy/reload URLs must restore the stated scope. |
| Forms and dialogs | Keep page/dialog counterparts consistent, use stable labels and required/error associations, wait for hydration, group related fields and retain scrollable content with reachable actions. |
| Drafts and writes | Keep dirty input after declined discard; guard every supported close/cancel/navigation path. Synchronously block duplicate writes and disable inputs/close actions while pending. |
| Results | Distinguish transferred bytes from confirmed storage. Show the actual filename/status/version; retain uncertain drafts and ask users to check stored history before retrying. Return to a fresh authorized scope after confirmed mutations. |
| Evidence | Preserve review/version history and ownership. A missing artifact differs from a downloadable record; category history is not necessarily one replacement lineage. |
| Preview and export | Bind preview to the current draft and explain server re-resolution. Align report and export populations, filters, sort and dates; fail visibly rather than silently accepting an incomplete collection. |
| Verification | Record the exact source/build, actual browser cases, inspected image subset, limitations and owned cleanup. A shared component import or routed capture alone is insufficient. |

The shared modal and upload-progress helpers have consumers outside Documents. This phase exercises their Document review/setup/upload consumers; it does not rerun unrelated HRMS domain workflows or change their shared implementations. The final runtime delta is only the review form described below.

## Joined integration fix

After a successful review PATCH, the form previously issued `router.push(successHref)` and `router.refresh()` together. In the initial Chromium regression, the PATCH and destination read both returned 200 but the saved dialog remained open. `EmployeeDocumentReviewForm` now permits departure and performs one native document navigation to the same authorized success URL. This retains applied query/page scope and the existing queue receipt, using a fresh server read. Draft, pending, duplicate-submit and backend action policies remain intact. No shared modal implementation is changed.

The new handoff test also needed to wait for the applied query and single result row before Inspect. The initial three browser failures selected before filtering settled; the test now waits for committed scope and targets the titled row. This is recorded as test synchronization, not a separate application defect.

## Final verification and execution lineage

Accepted production build: `web/.next/document-makeover-phase6-delivery`, BUILD_ID `NQtPAMUxgTwiluORWKsPD`. Compilation, type validation and focused runtime/test/config ESLint passed. The 809-entry runtime manifest and final test manifest have zero post-run mismatches. Relative to Phase 5, only `web/src/app/hr-admin/employee-documents/employee-document-review-form.tsx` changed; no runtime files were added or removed. Six backend contract files, including `backend/apps/common/api_serializers.py`, match the Phase 1 follow-up hashes. The shared modal, upload progress, report collector, backend policies/schema and upload transport are unchanged. Generated TypeScript configuration files match HEAD exactly.

**All 42 selected browser/scenario combinations have passing evidence at the accepted runtime and current test hashes: 36 from the combined matrix plus six from the focused setup recheck.** This is not one all-green 42-case execution. The [accepted-case manifest](../qa/evidence/document-makeover-phase6-2026-10-23/accepted-cases.json) identifies each browser, test, source hash and originating run.

| Run | Build | Workers | Result and disposition |
| --- | --- | --- | --- |
| `initial-run/` | Phase 5 `9TH9c8tI2bokO-WY7-Ych` | 1 | 38 passed, four failed: Chromium review-save dialog persisted; all three new handoff tests inspected before filters settled. Application navigation and test synchronization were corrected. |
| Main matrix, `results.json` | Phase 6 `NQtPAMUxgTwiluORWKsPD` | 3, CLI override | 41 passed, one failed: Chromium setup asserted dialog disappearance while native navigation was still loading, exceeding the five-second assertion. All joined handoffs, review saves, keyboard/focus cases and other regressions passed. |
| `setup-recheck/` | Same Phase 6 build | 1 | Six passed, no failures/skips/flaky results. The requirement test now waits for the intended URL and `domcontentloaded` before asserting the dialog has gone; retained category and requirement persistence checks pass in all three browsers. |

Retries were disabled in every run. The test-only change between the main matrix and recheck is the Phase 3 navigation wait, plus its focused configuration. All six cases from that test file were rechecked at the current hash; the other 36 accepted cases retain matching test hashes from the main matrix. Raw failures and traces remain diagnostic evidence rather than being replaced or labeled passing.

Each browser's joined flow stored a real 25-byte HR upload, verified it through the queue, retained the applied search on return, found it in the employee's filtered history, downloaded exactly those bytes, received 404 for another employee, and found the verified record in the report after reload. The report regressions again included all 111 records and the oldest stored file beyond the first backend page; CSV/manifest checksum and 55-pending scope matched. Letter generation/download/readback, setup writes, HR upload, ESS replacement lineage and automatic acceptance were exercised through the selected prior-phase cases.

Current captures total **141 PNGs**: 120 route/state/browser/viewport visits, nine deliberate denial views and 12 populated letter preview/receipt full-page images. **Fourteen were directly inspected**, identified by path, dimensions and SHA-256 in the manifest. New joined entry captures use 1440×900 and 320×600 viewports; letter full-page captures use 1280/320 widths and 720px viewport height. They do not constitute a full-page review of every standalone editor. Longer forms require scrolling; dialog Cancel visibility and root overflow were asserted. Tables retain their own horizontal scroll. Native control appearance varies by engine; WebKit uses device-pixel ratio two. The earlier five-width phase evidence retains its original scope.

Source findings DOC-01/02 map to the hub/population/access work in Phase 2 and recorded discovery of unavailable reads; DOC-03/04 map to committed queue scope and guarded review, with the additional navigation fix here. DOC-05 maps to Phase 3 page/dialog setup; DOC-06 to Phase 4 ownership/file/progress/recovery; DOC-07/08 to Phase 5 draft-bound previews and complete bounded reports. Current live fixtures do not re-certify every outage, malformed acknowledgement, template or date edge case from the earlier phases.

## Cleanup and acceptance limits

Across the initial matrix, corrected matrix and setup recheck, 37 isolated fixture tenants were removed. Final counts were zero for Tenant, User, Employee, EmployeeDocument, DocumentArtifact and GeneratedLetter. Fifty-eight owned artifact paths were independently verified absent, and 62 empty owned storage directories were removed. Recorded fixture contexts were absent after helper teardown. Twenty-four export fallback-audit rows stayed in the private runtime directory and were removed with it; the repository's two preexisting audit files retained their baseline hashes. Exact backend/Next processes, owned Postgres container/volume and the private runner/runtime were removed. Ports 55472, 8073 and 3273 were free. The accepted Phase 6 build and earlier accepted phase builds remain.

Phases 1–6 are closed as the bounded Documents makeover. Existing phase records remain historical evidence rather than automatic certification of later artifacts. DOC-C03 stays open for product/security policy ownership; there is no new operation-specific letter authorization guarantee. Formal screen-reader/assistive technology, native zoom, physical devices, exhaustive domain/permission/tenant/template/error combinations, print output, external delivery, storage-provider guarantees and transactional/same-count concurrent report consistency remain separate assessments. No commit or deployment was performed. This closes the documented family scope, not every HRMS screen.
