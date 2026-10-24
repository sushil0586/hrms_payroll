# Employee Management Phase 5 — Imports

Status: complete within the implementation and verification scope below. Scope: employee creation, bank-account and reporting-manager CSV workbenches within the existing directory disclosure. Phase 6 joined-family closure remains separate.

This applies the [shared UI/UX standard](hrms-ui-ux-standard.md) and [Leave/Attendance makeover reference](hrms-leave-attendance-makeover-reference.md) to the existing employee import tasks.

## Baseline and decisions

The retained Phase 4 build provides the baseline. Nine screenshots cover three workbenches at 1440, 390 and 320 CSS pixels, with a 568px short height at 320. Two inspected baseline captures show the combined template/preview/commit action strip and a bank import whose mobile action stack fills almost the whole viewport. All three tools render expanded together after opening Bulk imports. Preview uses a green completed-success notice even before employee changes are saved. The first fixture attempt preceded PostgreSQL readiness; that setup failure is retained separately from the successful capture pass.

Code review confirms that editing CSV does not invalidate ready rows, template/file operations remain enabled during writes, and transport failure is presented as a retryable row without distinguishing an uncertain write. Re-preview can reconstruct ready rows already committed. Audit receipt failures are silently ignored. These are workflow defects that the new hierarchy must address as well as its appearance.

Keep imports secondary to the directory. Each workbench becomes a native, individually expandable disclosure, with task purpose and impact followed by Prepare CSV, Review rows, then the preview/commit action area. Use real disclosure semantics, not decorative tabs. Template actions remain secondary; commit only becomes available after preview. Tables keep employee identity, relevant context, outcome and message, in named keyboard-scrollable regions. Keep page-level horizontal overflow contained and long messages readable. The action area is in normal document flow so it cannot cover row results in a short viewport.

## Existing contracts and limits

All three CSV headers, supported quoted commas, one-record-per-line parser behavior, field validation, lookup collection and request payloads remain owned by their adapters. Embedded newlines are unsupported and stated in the UI. Template columns must remain present even when optional values are blank. Bank preview has no account-number column; raw CSV input remains the operator's editable source in component memory. There is no new server-side import endpoint, idempotency token, schema change, or rollback implementation.

Employee import POSTs employee records and does not provision login access. Bank import POSTs accounts to existing employees, normalizes IFSC and preserves the existing primary-account contract: blank `is_primary` means true, and a new primary immediately demotes the old one. Commit confirmation names that impact. Existing duplicate-code and within-batch primary/mapping checks remain in place. Name lookup now requires exactly one match; manager codes take precedence over names. An ambiguous name produces a blocked row instead of silently selecting the first match.

Manager import PATCHes only `reporting_manager_id`. Its CSV effective date and reason are currently validated but are not submitted to the manager update or retained as effective-dated audit context. The UI and preview column captions now state that limitation explicitly; the makeover does not pretend to add scheduling or change the backend policy. Existing broad date parsing is not a new guarantee of strict calendar validation. The backend remains authoritative for tenant ownership, permissions and reporting-cycle rejection.

## Shared interaction contract

A scoped `EmployeeImportPanel` composes the three adapters. It owns CSV, current preview and row receipts, session replay protection, busy locks, focus, feedback and audit receipts. Domain payload construction remains in the original workbench files; other import families and the global request helper are unchanged.

Editing, uploading or loading a sample invalidates the current preview. Replacement by file/sample requires discard confirmation for an existing source. File and clipboard failures preserve input and show recovery guidance. A ref guard protects asynchronous operations; pending preview/commit/file operations disable source and competing actions. An unload warning covers existing source/results or pending operations; this does not claim a new global SPA navigation guard.

Preview does not write employee changes; it retains the existing batch-history audit POST. Commit separately confirms the number of ready rows, immediate domain impact, independent writes and lack of automatic rollback. Confirmed saves remain saved; rejected rows preserve their error and source. Transport failure, 408, server error or an incomplete successful receipt marks a row unconfirmed and stops subsequent writes. Unattempted rows stay ready but Commit remains paused while an unconfirmed row is in the preview. There is no automatic mutation retry.

Earlier saved/unconfirmed employee-code receipts remain visible when editing clears the current preview. Exact source rows with confirmed/unconfirmed outcomes are remembered for the mounted session and retain those outcomes on preview. Edited rows and navigation/reload are outside durable idempotency protection: operators must check existing records/history before preparing another import. Audit confirmation failure is shown separately and never relabels confirmed domain writes as failed. No raw CSV is added to the history evidence snapshot. Feedback receives focus; only completed clean imports use success styling. Blocked, rejected, partial and unconfirmed outcomes use explicit row totals and persistent messages.

## Retained execution findings

The first Chromium run passed 13/17. Three failures came from a test selector matching both the committed receipt and the pending button's separate live status; the test now targets the persistent notice and waits for history recording to settle where required. The fourth failure was a real scoped axe contrast finding on the Upload CSV and CSV data labels (3.97:1 against white). Scoped semantic text color and readable label sizing correct that finding without changing other forms. Rendered review also exposed inherited compact textarea sizing and inherited stacked disclosure summaries; stronger employee-import selectors preserve the intended editor height and horizontal task heading.

A subsequent unserved build was interrupted when targeted lint rejected reading a replay-ledger ref in render. Displayed earlier receipts now use React state, with the event-owned ledger still guarding writes. The lint failure and interrupted-build log remain as history. Final acceptance must use the new final build and final manifests, not the candidate or interrupted artifact.

## Verification and closure

The accepted build is **`jSAhnfAV3d_QcvbA7viVS`**, retained at `web/.next/employee-makeover-phase5-final`. All **78 executions passed**: 26 cases each in Chromium, Firefox and WebKit, with retries disabled, zero failures, zero skips and zero flaky cases. Page-error assertions remained enabled. This is one final run against an immutable build, with no source or test edits in flight. The 802-entry source/config/package manifest and final test manifest match the closure files.

| Check | Executed result |
| --- | --- |
| Employee, bank and manager workflows | Client preview errors, upload, source invalidation, focus, confirmed real saves, cancelled commit, same-row replay prevention, real history receipt verification |
| Rejection and uncertainty | Gated pending controls, preserved rejected drafts, transport uncertainty in all three imports, stop before later rows, no replay through preview; shared 500/incomplete-200 handling |
| Partial batches | First row saved through the real backend; second row deliberately rejected; saved receipt retained and only rejected row becomes ready on re-preview |
| Template and input recovery | Sample replacement keep/discard, fresh preview required, clipboard and file-read failure preserve CSV |
| Identity and scope | Ambiguous manager-name rejection and explicit-code recovery in both relevant imports; filtered directory still resolves employees outside the visible result scope |
| Permission | Employee persona cannot see tools or POST/PATCH affected employee resources (403) |
| Responsive and keyboard | All three workbenches at 1440/1024/768/390/320 CSS pixels, with 320×568 short height; no document overflow, editor sizing, action text-fit, named table region arrow-key scrolling |
| Scoped axe | Three workbenches at 390px in each engine; WCAG 2 A/AA and 2.1 AA rule tags; zero violations in executed scans |
| Quality | Production build with type validation, separate typecheck, full lint before final refinements and final targeted lint across changed TSX/tests/configs passed; scoped whitespace and continuity checks passed |

The five runtime changes are the three original workbench adapters, new `employee-import-panel.tsx` and scoped additions to `workspace-patterns.css`. No directory route, global import-request helper or backend policy change is part of this phase.

There are **75 accepted PNG captures**, nine baseline captures and 26 historical candidate captures. Actual inspection covers **15 images: two baseline, one candidate and twelve accepted final images**. The [visual review manifest](../qa/evidence/employee-makeover-phase5-2026-10-22/visual-review.json) lists exactly those paths, hashes, image-pixel dimensions and observations. The reviewed final set covers desktop task hierarchy, 320/390px row/action layouts, tablet composition, long content, clean saves, partial rejection and unconfirmed writes across the three engines. Captures outside that list are not manually certified. Scoped axe and reflow checks do not establish whole-product accessibility; screen-reader sessions, native zoom, physical devices and exhaustive domain acceptance were not executed.

Task-owned fixtures were removed and guarded database counts confirmed zero tenants, users, employees, bank accounts, batch audits, employee documents and document artifacts before database teardown. The exact PostgreSQL container/anonymous volume and owned Django/Next services were removed/stopped; intermediate builds, private scripts and the empty failed-fixture/output directories were removed. Only the accepted Phase 5 build is retained alongside earlier phase builds. Generated Next config files match HEAD. Unrelated services, workspace changes and audit history outside the isolated database were preserved.

### Known capability limits and Phase 6 handoff

- **EM-P5-H01:** manager CSV date/reason remain preview-only; updates are immediate. The UI now exposes this existing limitation. Effective-dated updates and reason persistence would require a separately scoped backend contract change.
- **EM-P5-H02:** replay protection is per mounted session and exact source row. It does not provide durable backend idempotency across edits, reloads or sessions. Check current records/history after an uncertain outcome; server idempotency is separate future work.
- The existing single-line CSV parser and broad date validation remain bounded capabilities; this phase does not certify a complete CSV implementation or strict calendar validation.
- Phase 6 must review the joined directory/forms/import experience and retain the earlier **EM-P4-H01** inactive-provisioning Firefox hydration follow-up. Clean Phase 5 import runs do not resolve that separate finding.

See the [evidence index](../qa/evidence/employee-makeover-phase5-2026-10-22/README.md), [accepted provenance](../qa/evidence/employee-makeover-phase5-2026-10-22/accepted-provenance.json), [browser report](../qa/evidence/employee-makeover-phase5-2026-10-22/results.json), [database cleanup](../qa/evidence/employee-makeover-phase5-2026-10-22/database-cleanup.json) and [resource cleanup](../qa/evidence/employee-makeover-phase5-2026-10-22/resource-cleanup.json). No commit, deployment or Phase 6 completion is claimed.
