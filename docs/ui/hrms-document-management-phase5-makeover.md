# Documents Phase 5 — generated letters and compliance

Prepared: 23 October 2026. Status: complete within the generated-letter/compliance scope and verification boundaries below. Phase 6 joined closure remains next.

## Scope and design

Apply the [shared standard](hrms-ui-ux-standard.md) and [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md) to `/hr-admin/generated-letters` and `/hr-admin/reports/document-compliance`, including preview, validation, generation receipt, stored-file download, filtered report pages, CSV and manifest. Historical design findings remain in the [baseline](hrms-document-management-phase1-design-baseline.md); this phase does not claim a new pre-change capture run.

Letters use one operational heading, a useful-width draft, adjacent preview that stacks on narrow screens, and a searchable/paged artifact register. The issue date starts blank and uses the server's default date rather than the old fixed date. Explicit labels, hydration readiness, focused errors/receipts, dirty navigation protection, disabled pending fields and synchronous request guards follow the earlier phases.

Preview is bound to the exact client draft. Editing any draft input marks it stale and requires preview again before generation. This frontend workflow does not change backend authorization or generation semantics. The server resolves employee context again during generation; a preview is not a transactional snapshot. The receipt retains the actual generated text/file and identifies a changed rendering rather than asserting equality. Missing variables remain server validation failures, not successful previews with blank substitutions. Network/5xx or malformed generation acknowledgements produce an unconfirmed-outcome message and retain the draft.

## Source ownership

| Surface | Implementation | Responsibility |
| --- | --- | --- |
| Letters entry | `web/src/app/hr-admin/generated-letters/page.tsx` | Access dependencies, complete bounded letter collection and shared header |
| Letters workspace | `web/src/app/hr-admin/generated-letters/generated-letter-workspace.tsx` | Draft/preview binding, write guards, validation, stored receipt and artifact register |
| Compliance entry | `web/src/app/hr-admin/reports/document-compliance/page.tsx` | Role/read gates, complete bounded document collection, URL seed and capabilities |
| Compliance workspace | `web/src/app/hr-admin/reports/document-compliance/document-compliance-report-workspace.tsx` | Immediate filters, scoped summary, local paging, copied URL and evidence actions |
| CSV and manifest | `web/src/app/api/hr-admin/reports/[reportKey]/route.ts` | Complete source traversal and aligned filter/sort for document compliance |
| Styling and hub | `web/src/app/globals.css`; `web/src/app/hr-admin/documents/page.tsx` | Scoped layout/spacing and corrected report-scope handoff |

Generated output remains a `text/plain` `.txt` artifact linked to a generated-letter record. It is not converted into an employee-upload record or attached to the employee document center by this phase. The existing server date and template-variable contract remain authoritative.

## Complete report and export contract — DOC-C01

The display and export now traverse bounded pages rather than requesting 500 and receiving only the first 100. Both use the existing complete-report collector: maximum 10,000 rows, unique IDs, consistent total count and source mode, nonempty continuation, and one restart for changed population counts. Persistent churn, overlap, missing pages and over-limit collections fail visibly instead of exporting partial data. This is completeness checking, not an accounting or transactional snapshot.

The report is a register of existing documents; it does not assess missing employee requirements. Filters apply immediately, update the URL and seed copied/refreshed views. Display pagination is local to the complete loaded register. CSV and manifest cover all matching rows across display pages, using aligned search fields and sort rules. Export re-reads the source and may reflect later changes. Existing report risk rules are retained; the UI labels filtered counts separately from the complete loaded count.

The report retains its HR Admin role gate and document read dependency. Export still requires `reports.hr.export`; review and stored-file actions follow existing `documents.verify` / `documents.export` permissions. No backend permission or schema change is included.

## Letter authorization assessment — DOC-C03

Source inspection confirms list, preview, generation, detail and download inherit `HrAdminContextMixin` and tenant-scoped lookups; they do not add operation-specific document permission checks. The new UI preserves this existing policy. It does not reinterpret `documents.manage` as a newly required letter permission, expand backend access, or claim operation-specific authorization is fixed. `documents.view` and `employees.view` remain dependencies of the page's existing options/employee reads; missing dependencies now receive an explicit access notice.

DOC-C03 is therefore assessed and carried forward as a product/security policy decision, not silently resolved by hiding controls. Phase 5 UI/workflow acceptance can be bounded to the preserved policy; joined closure must retain this finding and its limits. No new policy is inferred from the user authorizing a UI makeover.

## Reuse on other screens

Keep operational headers and actions consistent with the shared workspace patterns. Use explicit field labels and required markers, one primary action per stage, inline pending states, and compact summaries whose population is stated. Disable interactive forms until hydration so early input is not lost. Keep the real workflow visible: draft → preview → confirmed stored result → download. Bind derived previews to the exact draft, invalidate them after edits and explain any server-side re-resolution.

A successful HTTP response is not enough to announce storage: validate the acknowledgement, retain input on uncertain outcomes, focus the resulting error or receipt and synchronously guard writes. Use native navigation for explicit handoffs and the existing dirty-draft helper for link/unload warnings; this does not certify interception of browser-history navigation.

For reports, align the population, search fields, sort, filters and date formatting across the screen and exports. State whether filters apply immediately or on Apply, preserve that scope in copied URLs, clamp invalid page numbers and move relative to the displayed page. Distinguish the local page from the full filtered export. Reuse the bounded collector instead of relying on a requested page size larger than the backend permits.

## Verification boundaries

Accepted build: `web/.next/document-makeover-phase5-complete`, BUILD_ID `9TH9c8tI2bokO-WY7-Ych`. Production compilation, type validation and focused runtime/test ESLint passed. The [evidence directory](../qa/evidence/document-makeover-phase5-2026-10-23/) contains [final validation](../qa/evidence/document-makeover-phase5-2026-10-23/final-validation.json), [browser results](../qa/evidence/document-makeover-phase5-2026-10-23/results.json), [visual manifest](../qa/evidence/document-makeover-phase5-2026-10-23/visual-manifest.json), [letter readback proofs](../qa/evidence/document-makeover-phase5-2026-10-23/accepted-letter-proofs.json), per-browser export proofs, source/test hashes and [cleanup](../qa/evidence/document-makeover-phase5-2026-10-23/cleanup.json).

Four scenarios passed in Chromium, Firefox and WebKit: **12 passed, zero failures, skips or flaky results**, retries disabled and one worker. Both initial surfaces were captured at 1440/1024/768/390/320px: 30 responsive visits. Populated preview and receipt states added 12 full-page captures at 1280/320px; filter-panel crops added six desktop/mobile captures. Total: **48 PNGs, ten directly inspected**. The manifest identifies exact paths, pixel dimensions and hashes; this does not claim inspection of every capture. WebKit uses device-pixel ratio two and retains native select/date appearance differences. Initial 320px viewport captures use 600px height; other initial captures use 900px. Populated full-page captures use a 720px viewport height.

Browser checks cover root overflow, report search preceding/aligned with verification, client JSON and real missing-variable validation, focused errors, current versus stale preview, dirty Back keep, pending disabled fields, duplicate-submit protection, a real 201 generation and focused receipt, exact generated-file content through an authorized download, fresh letter-register readback and simulated 503 recovery with retained draft/preview. They do not certify every error response, template or employee context.

Each browser's isolated report contained 111 documents. The oldest stored record lies beyond the first backend page and was found by screen search and filtered CSV. CSV and manifest each included all 111 records, with matching SHA-256 checksums; pending filtering produced 55. Sorting survived reload. A copied URL with `page=999` clamped to page 12; Previous moved to 11 and reload retained 11. This fixes paging relative to the raw out-of-range seed. Four collector checks separately rejected missing continuation, overlapping IDs, over-limit populations and persistent count churn after one restart.

Full-page review corrected missing register padding and the inherited report search row span. Final rendered pages retain the shared auto-fit desktop filter grid and single-column mobile layout. Mobile artifact tables keep their own horizontal scroll; root overflow was checked without promising every table column fits onscreen.

The source manifest records 809 entries and the test manifest records the final suite, fixtures, collector checks, configuration and fixture helper. Post-run verification found zero mismatches. Seven existing runtime files changed relative to Phase 4; none were added or removed. Six backend contract files matched the Phase 1 follow-up hashes, including `backend/apps/common/api_serializers.py`. Shared report collection, backend schemas, authorization policy and upload transport were not modified.

Across four browser runs, all twelve fixture tenants were removed. The isolated database had zero Tenant, User, Employee, EmployeeDocument, DocumentArtifact and GeneratedLetter rows after teardown. Twenty-four owned stored-file paths were verified absent and 24 empty owned storage directories removed. Forty-eight fallback export-audit rows stayed inside the private runtime directory; both repository audit files retained their baseline hashes. Exact backend/Next processes, PostgreSQL container/volume, fixture contexts, private scripts/runtime and three intermediate builds were removed. Ports 55472/8073/3273 were free. The accepted build and earlier phases' accepted builds remain. Generated TypeScript configuration files match HEAD exactly. Notification processing was disabled and mail stayed local; no external delivery is certified.

`run1/`, `run2/` and `run3/` retain earlier 12-pass results and exact provenance before successive pagination and visual refinements. The root-working-directory build diagnostic is retained separately; the final build ran from `web` and focused ESLint passed. These predecessors do not substitute for the final source-matched run.

Formal assistive technology, native zoom/device testing, exhaustive permission/tenant lattices, all letter templates/employee contexts, print output, very large collections and concurrent same-count mutations are not certified. No new backend policy or storage provider guarantee is implied. No commit or deployment is part of this phase.

## Next phase

Phase 6 joins the hub, setup, intake, review, employee center, generated letters and report handoffs against the combined source. Carry DOC-C03 as an explicit policy decision, verify shared consumers and cross-screen scope/focus, and publish a bounded family closure. This phase does not certify all HRMS screens.

Later implementation: [Phase 6 family closure](hrms-document-management-phase6-closure.md) completes joined verification and records a review-save return fix, exact accepted-case lineage and remaining policy/assessment limits.
