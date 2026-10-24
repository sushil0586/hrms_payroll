# UI/UX screen adoption and review checklist

Version: 21 October 2026. Use with the [Accerio cross-workspace standard](hrms-ui-ux-standard.md) and [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md). Copy the work-item section into the owning implementation/certification note. This template does not certify a screen merely because boxes were copied.

## Work-item record

| Field | Record before implementation |
| --- | --- |
| Screen family / owner | Module, role/workspace and responsible work item |
| Routes | List/create/edit/detail/report/import/loading/error routes in scope |
| Page pattern | Operational list, approval, catalog, form, import, calendar, report or governance |
| Shared reference | Closest implemented screen and latest certificate |
| Baseline | Commit/worktree state, existing screenshots and known defects |
| Data contract | Endpoints/proxies, pagination caps, sort/search fields, units/timezone |
| Filter contract | Committed or immediate; query keys/defaults; full-dataset vs page-local scope |
| Action contract | Permissions, eligibility, idempotency, audit, locks and partial outcomes |
| Impacted consumers | Other routes/roles using changed shared shell/components/helpers |
| Exclusions | Unsupported APIs, policy changes and unexecuted assessment types |

## Discovery gate

- [ ] Inventory actual routes, APIs, permissions, states and relevant tests.
- [ ] Identify which shared components/styles already provide the behavior.
- [ ] Distinguish presentation defects from domain/API gaps and existing limitations.
- [ ] Capture a genuine baseline; label prototype, diagnostic and deployed images accurately.
- [ ] Define a bounded implementation slice; preserve unrelated worktree changes.

## Shared design gate

- [ ] Existing Accerio shell and semantic tokens; no duplicate role shell/palette/library.
- [ ] Correct active/ancestor navigation, permission-filtered search and mobile menu behavior.
- [ ] One task heading, concise description and clear action priority.
- [ ] Compact contextual navigation; no repeated global account/workspace actions.
- [ ] Appropriate page pattern; useful scoped metrics instead of decorative cards.
- [ ] Shared fields, table, status, paging, feedback and dialog components reused.
- [ ] Long labels/names/content, disabled controls and unavailable values remain readable.

## Query and table gate

- [ ] Draft and committed state are distinct where Apply is used; Enter submits.
- [ ] Immediate filters have no hidden Apply and preserve meaningful URL state.
- [ ] Pagination/export use committed values; page-size/Apply reset the page.
- [ ] Clear, refresh, copied links, Back and Forward keep controls/results/counts aligned.
- [ ] Invalid dates/deep links and out-of-range pages recover without silently widening scope.
- [ ] Search/sort/filter scope is accurate across the matching population.
- [ ] Superseded reads cannot overwrite newer results; unsaved business edits survive filter synchronization.
- [ ] Tables have semantic headers, descriptive row actions and named keyboard scrolling.
- [ ] Selection is accurately scoped, cleared/reconciled on scope change and revalidated server-side.
- [ ] Stale detail selections and authorized off-page deep links behave deliberately.

## Forms and outcome gate

- [ ] Visible labels, required/optional help, inline errors and backend validation preserved.
- [ ] Values/evidence/keys remain after failure or uncertain mutation outcome.
- [ ] Duplicate activation guarded synchronously; pending controls reflect actual work.
- [ ] Confirmed, intermediate, queued, partial and unconfirmed outcomes have factual wording.
- [ ] Read retry never repeats a successful/uncertain POST automatically.
- [ ] Confirmation explains actual impact and collects required real reasons.
- [ ] Dialog initial focus, trap, Escape, dirty protection and restoration work.
- [ ] First invalid field/async non-field error receives appropriate focus without typing-time jumps.
- [ ] Long forms and actions remain reachable on mobile, short height and native zoom.
- [ ] Toasts supplement persistent errors/receipts; no raw nested JSON/internal diagnostics.

## Conditional module gates

Mark each row applicable or N/A with a reason; do not silently omit a difficult case.

| Pattern | Required evidence |
| --- | --- |
| Import | Exact authorized identities, ambiguity/invalid-row rejection, preview invalidation, conflict semantics, real commit, partial/unconfirmed outcomes and audit distinction |
| Report/export | Qualifying match beyond page one; complete population or explicit unavailable state; filter/search/count/CSV parity; permission denial; truthful resource/snapshot limits |
| Calendar | Full authorized month, missing-data meaning, calendar/list/day/history scope, date-only preservation, timezone boundaries and keyboard access |
| Approval | Real authorized decision, intermediate/final state, notes, stale/duplicate rejection, ownership/team/tenant denials and audit |
| Governance/job | Preview invalidation, reason/confirmation, durable job states, allowed transitions, close/lock protection and GET-only recovery |
| Sensitive data | Existing masking/download permissions, foreign-ID rejection and least-privilege visibility |

## Responsive and accessibility gate

- [ ] Review 1440/1024/768/390/320 widths as applicable; record exact tested widths and omissions.
- [ ] No document-level horizontal overflow; necessary table overflow stays in its named region.
- [ ] Inspect actual rendered images for layout, hierarchy, contrast, overlap and clipped controls.
- [ ] Keyboard checks cover navigation/search/filtering, table panning, row actions and dialogs.
- [ ] Heading/landmark structure, accessible names/descriptions and status announcements checked.
- [ ] Automated scans retain scope, violations and incomplete/manual-review findings.
- [ ] Reduced motion checked; native 200%/400% zoom and actual screen-reader/browser/OS results recorded separately.
- [ ] Unexecuted physical-device/AT/formal WCAG checks explicitly remain open.

## Verification and cleanup gate

- [ ] Run relevant real backend/API/PostgreSQL and negative authorization/history regressions.
- [ ] Run affected production-built Chromium/Firefox/WebKit selections, including shared consumers.
- [ ] Run appropriate TypeScript, ESLint, Django/migration checks and build for changed layers.
- [ ] Retain historical failures and exact final passed/failed/skipped/blocked/unexecuted/flaky counts.
- [ ] Separate unique cases from repeats, browser workflows from Node helpers, and inherited evidence from fresh executions.
- [ ] Record source/build/config provenance and actual screenshot review scope.
- [ ] Verify guarded removal of task-owned synthetic data/files/services; preserve unrelated data and audit history.
- [ ] Update owning tracker and certificate with open limitations and a scoped decision.

## Acceptance record

| Decision | Required statement |
| --- | --- |
| Scoped functionality | PASS / FAIL / BLOCKED, with exact evidence and remaining cases |
| Visual consistency | PASS / CONDITIONAL / FAIL, based on actual image review |
| Accessibility | Executed scopes/results and unexecuted manual assessments |
| Overall screen family | Accepted / conditional / open, with concrete outstanding work |
| Release/deployment | Separate existing decision; no automatic advancement from UI acceptance |

For documentation-only adoption work, validate links, source references and consistency. Do not claim a new browser/backend pass without executing the relevant selection.

## Completed family examples

Use the [Employee family closure](hrms-employee-management-phase6-closure.md) and [Documents family closure](hrms-document-management-phase6-closure.md) as examples of bounded phased adoption. Documents records route/dialog coverage, real cross-role file handoffs, complete report/export scope, source-matched execution lineage, inspected-image subsets, cleanup and an explicitly unresolved authorization policy decision. Reuse their verification structure while preserving each new screen family's own domain contracts.
