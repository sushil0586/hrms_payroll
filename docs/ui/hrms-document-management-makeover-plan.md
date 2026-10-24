# Document Management UI/UX makeover plan

Prepared: 22 October 2026. Status: source discovery, [rendered baseline and design findings](hrms-document-management-phase1-design-baseline.md) documented; [follow-up checks](hrms-document-management-phase1-followup.md) complete Phase 1 discovery; [Phase 2](hrms-document-management-phase2-makeover.md) is complete within its HR operations scope. Acceptance is limited to the linked phase closure; [Phase 3 setup](hrms-document-management-phase3-makeover.md) is complete within its recorded scope; [Phase 4 intake and ESS](hrms-document-management-phase4-makeover.md) is complete within recorded scope; [Phase 5](hrms-document-management-phase5-makeover.md) is complete within its recorded letter/compliance scope; [Phase 6](hrms-document-management-phase6-closure.md) joined family closure is complete within its recorded UI/workflow scope; DOC-C03 remains an explicit policy decision.

## Purpose and references

Apply the task-focused Leave/Attendance makeover to HR Admin and ESS Documents: compact headers, meaningful summaries, committed filters, readable evidence, consistent forms, deliberate dialogs and reliable outcomes. Preserve document ownership, category rules, verification history and stored artifacts. This is a workflow and visual redesign, not a CSS-only adoption.

Read the [shared standard](hrms-ui-ux-standard.md), [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md), [Employee family closure](hrms-employee-management-phase6-closure.md), [adoption checklist](hrms-ui-ux-screen-adoption-checklist.md) and [13-route inventory](hrms-document-management-makeover-inventory.md). Earlier certificates retain their original scope; they do not accept this future implementation.

## Delivery phases and completion gates

| Phase | Scope | Completion gate | Status |
| --- | --- | --- | --- |
| 1 — Baseline and design | All 13 route patterns, query dialogs, API/permission/state map | Current captures, inspected-image findings, concrete composition decisions and traceable contracts | Complete within recorded discovery scope: initial 67 captures/14 inspected; follow-up 22 captures/22 inspected, 29 backend probes and four final capture/observation tests. Known defects carried forward |
| 2 — HR operations | Hub, employee queue, dialog and standalone review | Clear hierarchy, honest counts, preserved queue scope, usable evidence/decision layout, guarded draft/pending paths and deliberate custom-role access/denial navigation (DOC-C02) | Complete within [recorded scope](hrms-document-management-phase2-makeover.md); 30 final browser/scenario checks passed |
| 3 — Setup | Category/requirement lists, standalone create/edit and query dialogs | Consistent grouping, clear dependencies, every close/cancel path, validation and receipts | Complete within [recorded scope](hrms-document-management-phase3-makeover.md); 15 final checks passed across three browsers |
| 4 — Upload and ESS | HR upload and employee document center | File restrictions, progress, recovery, replacement/version behavior and employee-only scope | Complete within [recorded scope](hrms-document-management-phase4-makeover.md); 21 final checks passed across three browsers |
| 5 — Letters and compliance | Generation workspace and compliance report | Accurate preview/generation relationship, artifact receipt, complete report/export scope (DOC-C01), handoffs and explicit letter-policy assessment (DOC-C03) | Complete within [recorded scope](hrms-document-management-phase5-makeover.md); 12 final checks passed across three browsers; DOC-C03 policy decision retained |
| 6 — Joined closure | Completed phases and shared consumers | Cross-browser workflows, inspected renders, findings disposition, cleanup and bounded family closure | Complete within [joined closure](hrms-document-management-phase6-closure.md); 42 current-source cases covered by 36 matrix passes and six setup recheck passes; raw execution lineage retained |

Complete Phase 1 before implementing Phase 2. Each implementation phase includes design refinement, implementation, rendered review, interaction checks and closure. Do not defer all visual review to Phase 6 or count a shared component import as acceptance.

## Source findings and design direction

These are initial source observations retained for traceability. Current implementation and verification dispositions are in the [family closure](hrms-document-management-phase6-closure.md); the table is not a list of present defects.

| ID | Observation and source | Proposed response and verification |
| --- | --- | --- |
| DOC-01 | The [hub](../../web/src/app/hr-admin/documents/page.tsx) repeats workspace entry links. Downloadable letters count uses loaded items while generated count uses total_count | Establish one main operational entry and grouped setup/letters/report navigation. Label loaded versus total scope; do not infer a global downloadable count |
| DOC-02 | The hub reduces any non-live combination to a demo label | Inspect fallback contracts. Distinguish unavailable, partial and genuinely empty reads without presenting fallback numbers as live facts |
| DOC-03 | The [queue page](../../web/src/app/hr-admin/employee-documents/page.tsx) retains server filter/page state and fetches selected review independently | Preserve authorized off-page review, applied filters, review_saved receipt and return URL. Label current-page expiry counts explicitly |
| DOC-04 | The [review form](../../web/src/app/hr-admin/employee-documents/employee-document-review-form.tsx) mixes context, metadata, decision, version and review history; its Cancel navigates directly | Prioritize evidence and decision controls; place long audit detail below. Exercise child Cancel, shared close, Escape and Back separately with dirty and pending drafts |
| DOC-05 | [Category](../../web/src/app/hr-admin/document-categories/page.tsx) and [requirement](../../web/src/app/hr-admin/document-requirements/page.tsx) dialogs wrap forms that also have standalone routes | Retain standalone routes. Align grouping, labels, focus, saving and receipts. Do not assume modal guards cover child navigation |
| DOC-06 | [HR upload](../../web/src/app/hr-admin/employee-documents/employee-document-upload-form.tsx) and [ESS center](../../web/src/app/ess/documents/employee-document-center.tsx) already use progress and options-driven limits | Preserve those improvements. Compare expiry/date rules with backend contracts before unifying presentation; retain recoverable drafts |
| DOC-07 | The [letter workspace](../../web/src/app/hr-admin/generated-letters/generated-letter-workspace.tsx) has separate preview and generation requests | Explain which draft was previewed. Check changed-draft behavior so stale preview does not appear to certify new content. Do not invent mandatory preview or approval policy |
| DOC-08 | The [compliance page](../../web/src/app/hr-admin/reports/document-compliance/page.tsx) requests page 1 / size 500; its [workspace](../../web/src/app/hr-admin/reports/document-compliance/document-compliance-report-workspace.tsx) filters loaded data while exports use separate URLs | Verify effective backend cap and export matching with multi-page data. Do not claim tenant-wide coverage from this request alone |

## Screen composition contract

### Hub and queue

The hub should explain where attention is needed and provide distinct daily review, setup, letters and reporting entries. Verify actual permission combinations before changing visibility; hidden links are not access enforcement.

The queue should read as heading/actions → scoped summary → filters → results/pager → explicit inspect/review. Preserve search, verification status, record status, category and expiry filters. Distinguish draft filters from applied scope. Reset page and selection deliberately on scope changes. Identify employee, category/document, verification and expiry without relying on color. Reminder selection must state its actual eligible scope and show sent/skipped results.

### Review and setup

Show employee/category/file identity, available download, employee-facing outcome, editable decision and decision effect before extensive history. Keep record status, verification status and re-upload intent distinct. Missing artifact, no expiry and no review history are different states. Page and dialog variants perform the same domain task with explicit return destinations.

Group setup into identity, upload/verification behavior and applicability. Explain mandatory, expiry, employee upload and multiplicity without changing meaning. Preserve visibility-rules JSON semantics; a friendlier editor requires assessment of unsupported keys. Verify standalone and modal create/edit together.

### Upload and employee center

HR upload must establish employee/category ownership before file selection. ESS should lead with assigned requirements, missing/returned evidence and permitted next actions, followed by searchable history. Offer upload only from actual employee/category eligibility. Preserve artifact ownership, review notes and version lineage on replacement. Display actual file restrictions before selection, progress during transfer, and completion only after the server confirms the stored record.

### Letters and compliance

Group letters into employee/type, draft variables, preview and generation receipt. Keep missing variables readable and stored artifacts actionable. Explain whether a displayed preview matches the current draft. Preserve existing generation semantics.

Compliance must distinguish filter scope, risk interpretation, loaded versus total records and export scope. Retain filtered CSV and manifest actions that already exist. Keep report-to-review navigation explicit; do not imply context preservation until implemented and verified.

## Contract anchors to preserve and verify

- HR pages use documents.view/manage/verify/export combinations. Upload and category/requirement write pages require documents.manage; standalone review requires documents.verify. Compliance uses HR-role access. Backend mixed-permission and tenant checks remain a Phase 1 verification requirement; these page gates are not a complete security matrix.
- The [backend route registry](../../backend/apps/common/api_urls.py) includes HR options, categories, requirements, documents/list/detail/download/reminders, letter preview/generation/download, and employee document-center/list/upload/download. Inspect Next adapters and session forwarding before changing requests.
- HR upload posts multipart data to /api/hr-admin/employee-documents. Review patches /api/hr-admin/employee-documents/[id]. ESS uploads to /api/me/employee-documents. Letters use separate POST preview and generation endpoints.
- The [artifact service](../../backend/apps/documents/services.py) rejects empty files, enforces a configurable maximum and checks supplied MIME type against a provided category allowlist. Default maximum is 10 MiB, overridden by HRMS_DOCUMENT_UPLOAD_MAX_BYTES. Display returned options rather than hard-code a promise. MIME checks are not evidence of content scanning.
- Storage records tenant/employee, source, filename, size, MIME type, checksum and creator. Preserve download authorization and history; internal artifact IDs should not become the primary user explanation.
- HR upload checks future issue dates and date order. ESS additionally checks required expiry and past expiry for fresh uploads. Reconcile category/backend rules before changing validation. Keep calendar dates separate from audit timestamps and verify timezone rendering.
- No dedicated MSS document route was found in the inventory. Record genuine manager handoffs if discovered; do not introduce a manager workflow by assumption.

## Baseline and acceptance checklist

Capture all listed routes and query create/edit/review states using fresh isolated synthetic fixtures. Record source hashes, build ID, fixture provenance, exact URLs, browser, viewport and action outcomes. Keep genuine empty data, no matches, unavailable reads and permission denial distinct.

Review 1440, 1024, 768, 390 and 320px layouts and short-height dialogs. Inspect representative captures and record paths, dimensions, hashes and actual review scope. Check readable rows, table scrolling, form order, action visibility and long filenames/labels. Capturing an image is not visual acceptance.

Include pending, verified, rejected, expired, expiring, missing expiry, re-upload requested, absent artifact and downloadable artifact. Check version/review history, forbidden/uploadable categories, missing requirements, invalid/oversize files, backend validation, lost connections and recovery. Transferred bytes alone do not prove completed storage.

Exercise keyboard entry, initial focus after hydration, Tab/Shift+Tab, Escape and focus return. Check dirty Cancel, header close, backdrop where supported, navigation and duplicate submission while pending. Errors retain input and provide useful correction. Distinguish known failures from uncertain writes before encouraging retries.

Check refresh, copied links, Back/Forward, stale selected IDs, off-page review, filter/page preservation, standalone return and receipts. Test reminders, downloads, CSV/manifest matching and preview→changed draft→generation with real responses. Include existing domain tests and focused role/tenant/employee boundary cases.

Use Chromium, Firefox and WebKit for implemented workflows and record exact executed scope. Automated accessibility scans supplement keyboard and visual checks; formal screen-reader, native zoom, physical-device and exhaustive security acceptance remain separate assessments.

## Current evidence and next work

The [Phase 1 record](hrms-document-management-phase1-design-baseline.md) adds current renders, findings, source permission mapping and bounded API probes. Application changes are recorded in the Phase 2 closure. The [follow-up](hrms-document-management-phase1-followup.md) completes bounded discovery of those cases. Phase 2 implements the HR hub/queue/review and resolves the observed access redirect loops with deliberate denial rather than added permissions. [Phase 3](hrms-document-management-phase3-makeover.md) completes category/requirement setup across all page/dialog counterparts. [Phase 4](hrms-document-management-phase4-makeover.md) completes HR upload and the ESS document center within its recorded scope. [Phase 5](hrms-document-management-phase5-makeover.md) completes generated letters and compliance within recorded scope, resolving DOC-C01 report completeness while preserving the existing letter access policy. [Phase 6](hrms-document-management-phase6-closure.md) closes joined UI/workflow verification, including the review-save return fix. Carry DOC-C03 as a policy decision; resolve intent before any letter authorization change. This plan introduces no permission/policy/schema/storage changes, deployment or scheduled work.
