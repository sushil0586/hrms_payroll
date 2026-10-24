# Accerio HR Admin experience standard

Status: HR Admin implementation contract, consolidated 21 October 2026. Use the [cross-workspace UI/UX standard](hrms-ui-ux-standard.md) as the shared baseline, the [makeover reference](hrms-leave-attendance-makeover-reference.md) for implemented examples, and the [adoption checklist](hrms-ui-ux-screen-adoption-checklist.md) for each screen family. Apply incrementally through the [146-route tracker](hrms-hr-admin-coverage-tracker.md). This document does not mark untouched pages compliant or authorize staging deployment.

See the [pre-implementation shell/dialog review](hrms-shared-shell-dialog-design-review.md) for sidebar, header, footer and popup recommendations. Visual consistency is an acceptance requirement in every phase.

## One shared foundation

Reuse `web/src/styles/tokens.css`, semantic `--ds-*` tokens in `styles/accerio.css`, `WorkspaceChrome`, `WorkspaceStandardHeader`, `WorkspaceStandardPanel`, `WorkspaceFilterBar`, `WorkspaceDataTable`, `WorkspaceTableScrollRegion`, status/feedback patterns, `PaginationBar`, `HrAdminActionModal` and existing form/action primitives. Keep module-specific data, permissions, action eligibility and calculations in their current domain/API layers. Do not introduce another component library or copy ESS components with HR-specific names.

The shared Accerio shell has since been implemented and scoped-tested; see the [global shell certificate](hrms-hr-admin-global-shell-certification.md) and later [Leave Phase 2](hrms-leave-phase2-design-certification.md). Shell appearance and page-content adoption are separate boundaries: reuse the existing integration and verify affected legacy consumers rather than switching global classes indiscriminately. Shared presentation must also remain usable by ESS/MSS. HR navigation groups, commercial entitlements and RBAC remain unchanged unless a separate approved contract requires it.

## Page composition

Order: compact header → contextual module navigation → optional useful summary → filters → results → pagination. Open details only by explicit selection; use an existing accessible panel/dialog appropriate to task length. Put imports, bulk setup and administrative utilities behind clearly named secondary entries/disclosures rather than permanently below every list.

- One page `h1`, brief task description, one principal permitted action. Do not repeat the same title/description in an operations banner and table toolbar.
- Overview pages show actionable queues and real backend summaries. Forms, catalogs, reports and processing consoles need different compositions within the same shell; do not force every module into dashboard cards.
- Use existing spacing/typography tokens: base text `--type-size-base` (14px), spacing `--space-1` through existing scale. Prefer `--space-4` inner section padding and compact consistent gaps; avoid density by shrinking all controls/text.
- Use the existing indigo semantic brand and restrained status tones. Backend states retain their exact meaning: a locked record is not synonymous with approved or payroll-ready. Always include a readable label; do not communicate state with color alone.
- Keep totals scoped: “Matching records,” “On this page,” and “Selected on this page.” Do not calculate tenant-wide readiness from a fetched page and label it as the global total.

## Filter and URL contract

Default list/report interaction is **draft fields + Apply**, using a real form with Enter submission. All committed state is represented in the URL or an explicitly documented sensitive-state alternative. Applying filters resets page to 1. Canonical URL state must rehydrate controls after Back, Forward, reload, navigation and copied links.

| Interaction | Required behavior |
|---|---|
| Edit a filter | Draft changes; committed rows/counts stay unchanged until Apply. Make pending draft edits clear. |
| Apply / Enter | Validate, normalize, commit allowed keys, reset page to 1 and show pending feedback. |
| Clear filters | Commit default filters immediately; reset page and selection; preserve documented page-size/context scope. |
| Next / Previous | Use **committed** filters and sort, never unsubmitted draft values. |
| Change page size | Keep committed filters/sort, reset page to 1 and selection. |
| Back / Forward / reload | URL, controls, results, totals and detail selection agree. |
| Date range | Require valid dates and from ≤ to; show inline feedback without silently broadening the query. Preserve date-only semantics and documented tenant timezone. |
| Search | Trim consistently; document supported fields; use backend query semantics. No decorative search inputs. |
| Invalid/out-of-range page | Preserve filters and safely recover to a valid page or clearly explain the empty range; never drop the entire workspace. |

Small **complete** catalogs may use immediate filtering if explicitly documented and consistently labeled; omit Apply in that mode and persist meaningful URL state. A current array is not proven complete merely because its current page is small. Preserve the documented immediate-filter contracts in the standardized catalogs/reports; use the default Apply contract for new multi-field server-paginated queues unless their documented behavior requires otherwise.

Use an adapter for existing query names (`managerView`, `manager_view`, etc.); do not silently rename API keys. Filter schemas define key, label, type, default, authorized options, serialization, validation and scope. They do not grant permissions. Sorting is available only for backend-supported fields across the full filtered dataset, or explicitly labeled “this page.” Use a stable tie-breaker and preserve filters/page-size when sorting.

Implemented reuse: `WorkspaceFilterForm` supplies the committed GET form and browser-restoration boundary; `use-workspace-query-filter.ts` supplies immediate URL updates. Modules still own their inputs, validation, query serialization and announcements. The current `WorkspaceFilterBar` is only a styled div; it does not implement these semantics. Fix the behavior at a shared boundary, with per-module schemas and adapters. Avoid ten copies of synchronization effects; do not blindly remount an entire form/workspace and lose unsaved business edits.

## Tables, selection and details

- Use semantic headers, descriptive row actions, consistent dates/statuses and row density. Keep identifying columns readable. Align numbers consistently; retain precision supplied by the API.
- Use `WorkspaceTableScrollRegion` for necessary horizontal overflow with keyboard navigation and a meaningful accessible name. Do not clip actions to hide overflow.
- Default selection is page-scoped. Clear selected IDs on committed filter/sort/page/tenant changes; reconcile against visible, eligible IDs before enabling/submitting bulk actions. Show exact scope and count. “Select all matching” requires a genuine supported backend contract and explicit UX; never infer it from current IDs.
- Revalidate all bulk actions server-side, including ownership, RBAC and historical locks. A UI selection fix must not weaken backend guards. Show per-row failures and exact outcomes; do not mark partial processing as a full success.
- Keep details tied to a valid result ID; dismiss/reconcile stale details when scope changes. A side panel can remain visible on desktop; mobile uses an accessible dialog/full-page pattern without duplicate state.

## Forms and guarded actions

Reuse existing validation and mutation helpers. Labels remain visible; required/optional and help text are explicit. Map field errors to inputs, announce summary errors, retain unsaved input after failure, and prevent duplicate submissions. Success requires an actual successful authorized response and a refreshed source of truth.

Review/archive/remove actions explain actual backend impact. Use existing confirmation/impact workflows. Do not create universal approval rules, new unlock paths, payroll actions or profile-edit permissions for visual consistency. Unauthorized actions are hidden or explained according to existing policy; unsupported capabilities are clearly unavailable. Keep salary/bank/document data appropriately masked and scoped.

Dialogs require an accessible name, focus trap, sensible initial focus, Escape/close behavior consistent with unsaved changes, focus restoration and visible scrollable mobile actions. Long forms need usable page/section navigation rather than nested tiny scroll containers.

## Reports and exports

Use a server-filtered paginated report contract where available. Reuse legitimate export contracts; develop missing projection/filter/count contracts explicitly. Do not request an oversized first page and silently treat it as a complete report. Document/validate API limits independently: Attendance allows 500; Documents/Lifecycle currently cap at 100.

One committed filter/sort snapshot must govern screen results, counts, export and manifest. If export intentionally covers all matching rows while the screen is paginated, label that scope explicitly. Display freshness and error/retry states. On fetch failure, do not silently restore unfiltered rows beneath still-active filters. Preserve authorized last-known data only with an explicit stale indication; never present it as a successful new query.

## Responsive and accessibility contract

Desktop/tablet/mobile targets: 1440, 1024, 768, 390 and 320 CSS pixels. Reflow controls, summaries and navigation; no document-level horizontal overflow. Tables may scroll in their named container. Mobile advanced filters and dialogs retain Apply/Clear/actions in reachable scroll content. Do not discard important columns without an accessible detail alternative.

Check keyboard-only operation, Enter submission, skip link, focus visibility/order/restoration, controls' accessible names, status/live announcements, contrast, reduced motion and 200%/400% native zoom/reflow. Use automated accessibility scans as evidence, not a WCAG certificate. Report actual screen-reader/browser/OS combinations; leave unexecuted checks open. Avoid forcing focus to a page heading after every keystroke/filter change; preserve the operating control and announce result updates appropriately.

## Acceptance and regression gate

Each route remains open until applicable evidence exists:

1. Render/navigation and allowed action visibility match role and tenant.
2. Filter values reach the intended BFF/backend unchanged; supported predicates affect the entire matching dataset.
3. Filter combinations, no-match, Clear, refresh, copied URL, Back/Forward, page-size and sorting behave consistently.
4. Draft edits never leak into pagination/export; stale requests cannot overwrite a newer committed query.
5. Hidden/ineligible rows cannot remain silently actionable; backend negative authorization and closed-history checks still reject unsafe writes.
6. Loading, errors, retry, partial mutation, validation and successful refresh are exercised.
7. Reports include a qualifying match beyond the first server page and screen/export/count parity under the same scope.
8. Desktop/tablet/mobile, keyboard and accessible-name checks pass across Chromium, Firefox and WebKit.
9. Relevant backend/PostgreSQL/RBAC regressions, TypeScript, ESLint, Django checks and production builds pass for actual changes. Keep all failed/skipped/blocked/unexecuted counts and synthetic cleanup evidence.

Do not relabel the previous ESS evidence as new HR Admin certification. Do not deploy an untested global styling/filter rewrite or change frozen production gates for cosmetic acceptance.
