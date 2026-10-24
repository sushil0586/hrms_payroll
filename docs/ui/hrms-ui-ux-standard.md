# Accerio HRMS UI/UX standard

Implementation follow-up: [shared UI/UX rollout and verification](hrms-ui-ux-rollout-certification.md). The original discovery/evidence baseline below remains historical; presentation adoption does not imply full workflow acceptance.

Established: 21 October 2026. Scope: every HRMS workspace and screen, including HR Admin, ESS, MSS and Tenant Admin; other workspaces adopt the same foundation as they are upgraded.

This is the implementation and review baseline for future screen work, derived from the implemented Leave and Attendance makeovers. It does not mark untouched screens compliant. It documents shared presentation and interaction contracts; domain permissions, calculations, approval policy and historical protections remain owned by their existing services.

## 1. How to use this standard

Before changing a screen, identify its page pattern below, inspect the referenced implementation, and record its API, permission, query and action contracts. Reuse the shared components before adding a new pattern. After implementation, assess behavior and actual rendered output, then update the owning coverage tracker with evidence and remaining gaps.

Read together:

- [Makeover record and evidence map](hrms-leave-attendance-makeover-reference.md): what changed, where it lives, what was tested and what remains conditional.
- [Current route inventory and prioritized gap tracker](hrms-ui-ux-gap-tracker.md): source census, evidence status and rollout order.
- [Screen adoption and review checklist](hrms-ui-ux-screen-adoption-checklist.md): reusable work-item template and acceptance requirements.
- [Validation and action feedback](hrms-frontend-validation-feedback-standard.md): detailed correction, focus, receipt and uncertain-outcome rules.
- [HR Admin experience standard](hrms-hr-admin-experience-standard.md): HR-specific contracts and coverage.

For shared UI/UX, this standard takes precedence over conflicting early design proposals. Current source defines available component APIs, not automatic acceptance of every existing caller. Backend contracts define permitted business behavior. Certification documents record bounded results on particular artifacts; later explicit closure updates supersede the corresponding earlier blocker, without erasing its history. Record unresolved conflicts rather than silently inventing a policy.

## 2. Design direction

Use a compact operational workspace: dark navigation, a calm light header/canvas, solid content surfaces, restrained indigo emphasis and readable semantic status colors. Prioritize the task, useful data and a clear action hierarchy. Density comes from removing repeated headings, decorative panels and excessive gaps, not reducing all text and controls.

Use one visual family across roles. Role-specific navigation, permissions, terminology and workflows can differ. An employee calendar, manager inbox and administrator policy editor should be recognizable siblings without being forced into the same dashboard layout.

Do not add a second component library, module-specific palette, cloned role shell, ornamental metrics, production demo data or a decorative action. New shared patterns need a real task, documented semantics and affected-consumer review.

## 3. Foundation and ownership

Paths below are relative to the repository root. They are implementation entry points, not a prescription to import every component on every screen.

| Concern | Reuse / source | Ownership boundary |
| --- | --- | --- |
| Base typography, spacing, motion | `web/src/styles/tokens.css` | Shared foundation; avoid page-level magic numbers |
| Semantic theme | `web/src/styles/accerio.css` | Surfaces, text, borders, brand, status and focus |
| Shell presentation | `web/src/styles/workspace-shell.css` | Shared sidebar, header, mobile menu and compact footer |
| Content patterns | `web/src/styles/workspace-patterns.css` | Shared headers, forms, summaries, tables, imports, feedback and responsive composition |
| Role shell | `web/src/components/shell/workspace-chrome.tsx`; HR adapter `hr-admin-chrome.tsx` | Caller supplies permitted navigation/workspace context |
| Page heading | `components/patterns/page-intro.tsx` | Existing Accerio appearance; one task heading |
| Panels, fields, status | `components/patterns/workspace-standard.tsx`, `workspace-form-controls.tsx` | Presentation and semantics; no eligibility calculation |
| Metrics and paging | `components/patterns/metric-tile.tsx`, `pagination-bar.tsx` | Explicit data scope and authorized query state |
| Committed GET filters | `components/patterns/workspace-filter-form.tsx` | Module owns inputs, query names, serialization and validation |
| Immediate query filters | `components/patterns/use-workspace-query-filter.ts` | Only for a documented immediate-filter contract |
| Wide table access | `components/patterns/workspace-table-scroll-region.tsx` | Named region and keyboard scrolling |
| Pointer dialog trigger | `web/src/lib/ui/focus-action-trigger.ts` | Focus the actual button in its click handler before opening, so Safari returns focus to the correct trigger |
| Secondary actions | `components/patterns/action-menu.tsx` | Native disclosure links; opt into `documentNavigation` for established document-GET destinations; existing consumers retain their default behavior |
| Action dialog | `components/patterns/hr-admin-action-modal.tsx` | Existing lifecycle is shared despite its historical HR-specific name |
| Read failures | `components/patterns/workspace-load-error.tsx`, `workspace-error-state.tsx` | Honest error state and fresh authorized read retry |
| Feedback | `action-toast.tsx`, `action-feedback-receipt.tsx` in the patterns directory | Presentation only; success never grants access |
| Validation/error helpers | `web/src/lib/ui/api-error-message.ts`, `use-validation-focus.ts`, `use-feedback-focus.ts` | Readable errors and deliberate focus behavior |
| Complete bounded reports | `web/src/lib/complete-report.ts` | Explicit completeness checks; no accounting snapshot guarantee |
| Streaming containment | `components/patterns/document-hydration-boundary.tsx` | Existing targeted hydration workaround; not a general screen-state manager |

Component paths without `web/src/` in this table are beneath `web/src/`. Keep shared changes centralized, with domain adapters supplying data and actions. Do not move attendance derivation, balances, payroll math or RBAC into visual helpers.

### Token rules

Use semantic `--ds-*` tokens for colors, controls, panels, status and focus, backed by the existing base tokens. Current base body size is `--type-size-base: 14px`; common gaps are `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`. Use the scale and existing compact component styles rather than copying literal values into each screen.

The implemented shared shell uses `--ds-shell-width: 224px` and `--ds-shell-header-height: 64px`. The latter is a minimum baseline with responsive wrapping, not a fixed-height clipping requirement. Generic legacy `--sidebar-width` and `--topbar-height` values are different; do not treat them as the Accerio shell contract. Shell colors and dimensions belong in `workspace-shell.css`, not local overrides.

Retain readable text, control boundaries, disabled states and visible focus. Use solid operational surfaces so contrast can be assessed. Do not remove native select affordances or rely only on opacity/color to communicate meaning. Treat current token values as centralized source values, not permission to duplicate constants.

## 4. Shell and navigation

Use `WorkspaceChrome` and the existing role adapter. Keep product/workspace context in the global header and the task title in page content. Do not repeat Home, workspace switching and Sign out in page cards when the shell already provides them.

- Show the active permitted destination and meaningful ancestor context for list/create/edit/detail routes. Preserve deliberate navigation-group expansion.
- Search is **Search pages and actions**: local navigation/shortcut search. Do not imply employee-record or global business-data search.
- Preserve permitted workspace shortcuts, identity, role context and logout. Long names must not overlap controls.
- On narrow screens use the shared bounded mobile menu. Verify selection dismisses it, Escape closes it and focus returns correctly.
- Keep a compact supported utility footer where the shared shell renders one. Do not add a large fixed promotional footer or fabricated health/build claims.
- Menu visibility does not authorize a route or API. Preserve commercial restrictions, database menu overrides and direct-access permission enforcement.

A shell change affects every role using it. Include affected routes in regression even when the originating task is a single module.

## 5. Page composition and action hierarchy

Default list order: **page header → compact contextual navigation → useful summary → filters → results → pagination**. Include only sections that serve the task.

Use one `h1`, one concise task description and a clear principal permitted action. Put imports, bulk setup and occasional administration behind named secondary entries or disclosures. Contextual operations/report navigation must not repeat a large banner on every route.

| Screen pattern | Required composition | Reference |
| --- | --- | --- |
| Operational list | Header, scoped summary, filters, table, pager, explicit detail/review action | HR Attendance Records; Leave Requests |
| Approval queue | Queue navigation/counts, committed scope, evidence/detail, authorized decision dialog | HR regularizations; MSS approvals |
| Catalog | Compact list/search, create/edit action, truthful active/status fields | Leave Types/Policies; Shifts/Holidays |
| Business form | Task heading, labelled sections, help/validation, reachable save/cancel | Leave Policy and Assignment forms |
| Import | Instructions, identity lookup, preview, row outcomes, guarded commit, receipt | Leave assignment/balance imports |
| Calendar/history | Period control, legend, calendar/list, selected-day detail, independently scoped history | ESS Attendance and Leave |
| Report | Authorized filters, scoped summary, complete results, matching export/error state | Attendance Register; Leave Balance Report |
| Processing/governance | Current durable state, evidence/preview, reason/confirmation, job progress and permitted transitions | Attendance Close; Leave Year |

A summary must help a decision. Label “Matching requests”, “On this page” and “Selected on this page” accurately. Do not sum mixed day/hour quantities, infer payroll readiness from a page, convert leave units to money, or label a descriptive indicator as approved policy/SLA.

## 6. Filters, URLs and navigation

Choose and document one of two contracts per filter group. Do not display an Apply button that does nothing or make a nominally draft field silently change results.

| Contract | Use | Required behavior |
| --- | --- | --- |
| Committed form | Default for multi-field, server-paginated queues/reports | Draft inputs → validation → Apply/Enter → committed URL/read; reset page to 1 |
| Immediate filter | Explicit existing catalog/report contract with a complete authorized local population or supported server query | Change commits immediately; meaningful URL state persists; no hidden Apply step |

Reuse `WorkspaceFilterForm` for committed GET forms. It contains hydration and browser-restoration handling; it does not generate filters or perform module validation. Reuse the immediate-query hook for applicable catalogs. Read the live URL on each multi-key update so clearing one field does not resurrect another.

Required invariants:

1. URL, controls, rows, count, selected detail and export scope agree after refresh, copied links, Back and Forward.
2. Apply and page-size changes reset the page; pagination uses committed values, never unsaved drafts.
3. Clear commits defaults and clears stale selection. Preserve only documented context/page-size keys.
4. Validate dates, ranges, enum values and page sizes. Invalid deep links show correction feedback before an invalid read. Recover out-of-range pages without losing filters.
5. Declare search fields and whether predicates apply to the complete history/dataset or a loaded page. A small page does not prove a complete population.
6. Sort only supported full-dataset fields, or explicitly label page-local sort. Use stable tie-breaking.
7. Cancel or ignore superseded reads; a late response cannot replace a newer committed query.
8. Reset/remount the filter subtree only when necessary. Do not destroy unsaved business forms or import receipts to synchronize search inputs.

Preserve existing query names through adapters. Do not rename backend fields as a styling cleanup. Use the route's established document GET/history approach where implemented; do not reintroduce redundant RSC prefetch/refresh requests into those flows. Local day selection can update history without a server read when the complete authorized month is already loaded.

The parsed-document hydration boundary addresses a documented streaming/parser problem. Preserve it at existing integration boundaries; investigate new errors rather than suppressing warnings or wrapping every new component by default.

## 7. Tables, pagination and selection

Use semantic tables with column headers and descriptive row actions. Keep identity and state readable, align quantities consistently and retain API precision. Dates and missing values must have explicit meaning. Do not shrink or clip action groups to force a wide table into the viewport.

Use a meaningfully named `WorkspaceTableScrollRegion`. Its focusability is enabled when its keyboard handler is attached. Left/Right scrolling must operate from the region without stealing input keys from nested controls. Keep focus visible and maintain readable mobile details for any intentionally hidden columns.

Reuse `PaginationBar`; mobile uses the compact shared first/previous/next/last pattern where available. Show result/page scope and preserve committed query state. A selection is page-scoped unless a real backend all-matching selection contract exists.

Clear selected IDs on committed filter/sort/page/tenant changes; intersect IDs with visible eligible records before enabling and submitting bulk actions. Revalidate ownership, permissions and historical locks server-side. Report partial outcomes per row. Reconcile or dismiss selected details when their scope changes; authorized deep links may resolve through an independent detail endpoint without exposing another employee's data.

## 8. Forms, dialogs and focus

Use visible labels, explicit required/optional guidance, native control semantics and shared field styling. Keep relevant help near the input. Business forms preserve values after rejection, transport loss or incomplete confirmation. Client checks accelerate correction; backend validation remains authoritative.

Reuse the existing action modal lifecycle: accessible title, deliberate initial focus, Tab/Shift+Tab containment, Escape/close policy, scroll lock, dirty-change protection, busy guards and focus restoration. A frame that adds dialog semantics is not by itself a full focus lifecycle.

- Choose confirmation, ordinary form or wide/long-form composition to match task length. Long policy forms need usable sections/full-page space, not nested tiny scroll areas.
- Keep close and task actions reachable at mobile widths, short heights and zoom. Use one clear body scroll owner; avoid a footer covering fields or a second nested scrollbar.
- Section labels must be plain labels unless real navigation exists. Actual tabs require keyboard behavior, selection and associated panels.
- Preserve existing unsaved-change protection, including native confirmation where still used. A replacement must preserve both Keep editing and Discard and avoid competing focus traps.
- Focus the first invalid enabled field and reveal its section. Non-field asynchronous errors need a persistent alert in the current context. Editing must not repeatedly move focus.
- Restore focus to the real opener; focus it explicitly before opening when pointer activation does not establish a useful target. If the opener disappears, move to a meaningful next action/heading.

Do not remove configured fields, change policy defaults or invent a wizard to simplify visual layout. Internal copy such as storage details and unchanged API history should become useful task guidance.

## 9. Loading, errors and mutation outcomes

Every route family needs real loading and error/retry boundaries. Distinguish no data yet, no matching data, permission denied and unavailable service. Do not replace failed authorized reads with demo/fixture rows or fabricated zeroes.

| State | Required user experience |
| --- | --- |
| Loading | Stable bounded layout and clear pending state; no misleading empty-state flash |
| Empty population | Explain what is absent and offer an authorized relevant next step |
| No matching results | Retain filters and provide Clear/edit guidance |
| Read failure | Persistent explanation and fresh current-query GET retry |
| Invalid input | Inline associated correction and appropriate focus; preserve other inputs |
| Confirmed write | Factual outcome, authoritative reconciliation and destination receipt when navigating |
| Confirmed write, refresh failed | Say the write succeeded and the view failed; retry only the read |
| Lost transport / ambiguous write | Say confirmation is unavailable; retain inputs and guide checking current records |
| Partial import | Exact saved/failed/blocked/unconfirmed counts plus row explanations |
| Accepted background job | Show queued/running/succeeded/failed durable state; accepted is not completed |
| Stale/conflicting record | Refresh/review current state before a new attempt |

Guard duplicate activation synchronously as well as visually. Preserve existing idempotency keys and server transition checks. Never auto-retry a mutation after uncertain transport. A successful intermediate approval or pending cancellation must not be described as a completed final outcome.

Use shared error parsing and feedback focus helpers. Toasts supplement persistent validation/outcome information. Confirmed-save receipts are short-lived, path-scoped, one-shot presentation messages; browser storage failure must not block navigation. See the feedback standard for exact current helper behavior and durations.

## 10. Imports and bulk work

Use a consistent sequence: **instructions/template → input → authorized identity/conflict lookup → preview → guarded commit → exact receipt**.

Resolve identity from stable authorized identifiers. The shared import code lookup uses exact trimmed case-insensitive employee codes; reject missing and ambiguous/case-colliding identities. Do not choose the first fuzzy result, silently overwrite duplicate names or infer identity from the current balance page.

Validate existing formats, precision, dates and field ranges without introducing new policy. Preview conflicts through the existing domain service, with effective dates and priority forwarded consistently. A ready preview is not a guarantee that a later write will be accepted.

Changing CSV or relevant fields invalidates preview. Disable conflicting changes during preview/commit; retain input on lookup failure. Reads may be retried explicitly. Report supplemental audit confirmation separately from persisted business rows. Show row-level partial results; never silently resubmit the full file after ambiguous success.

Lookup limits and concurrency belong to the owning implementation and must be documented honestly. Do not copy Leave-specific limits into another module as business rules.

## 11. Reports, exports and numerical meaning

Prefer an authorized server-filtered paginated projection. Where an existing bounded collector is used, follow all pages and fail visibly on incomplete/overlapping results, changing populations or upstream errors. Never treat the first response as the whole report.

Current `completeReport` requests pages of 100, enforces a 10,000-row interactive bound and restarts once on a detected population change. These are implementation resource controls, not policy or a promise of an available async export service. It does not guarantee a transaction snapshot or detect every equal-count concurrent value change.

The committed filter/search/sort meaning must agree across rows, counts, CSV and manifest. Label exports covering all matching rows while the screen is paginated. Do not narrow export source data with a different search contract. Retain export permissions and audit paths.

Respect units, policy/year scope, exact precision and canonical API meanings. Do not subtract reservations again from a quantity already defined as available. Display unavailable evidence explicitly; do not invent zeros, risk thresholds, SLA approval, currency valuation or leave-year projections. A stale last-known result is allowed only with an explicit stale state and the scope it actually represents.

## 12. Calendars, dates and history

Use calendar and list as coordinated views of the same authorized period. Include every calendar date, preserve selection/page meaning, and keep day details available. Missing attendance means **No record**, not inferred absence, holiday or weekly off.

Declare the timezone for timestamps and input fields. Date-only values remain dates and must not shift through UTC conversion. Preserve the existing ESS Attendance contract: correction inputs explicitly UTC; daily display uses tenant timezone and numeric offset; finalized history does not acquire live current-policy derivations.

ESS Leave history filters apply before pagination under its current contract, including search/type/period/date/day. Calendar counts describe matching requests, not chargeable units, holiday entitlements or approved policy projections. Historical types can remain filter choices without becoming application choices. Month editing uses explicit Apply where implemented.

Keep record-list pagination separate from request-history pagination. Resolve notification IDs through authorized own/detail endpoints independently of the visible history page. Do not invent employee projection, raw-punch-edit or closed-period correction capabilities.

## 13. Responsive and accessible behavior

Review 1440, 1024, 768, 390 and 320 CSS pixels as applicable; existing certificates may cover fewer widths, which must remain disclosed. Reflow summaries, filters, actions and shell. The document must not overflow horizontally; wide data tables scroll inside their named region.

Preserve reachable actions at short heights and with long content. Test actual disabled states, expanded forms, errors, imports and dialogs, not only empty lists. Use native disabled semantics plus readable styling and an explanation where necessary. Do not simulate disabled controls with appearance alone.

Check heading/landmark structure, visible labels, accessible names/descriptions, keyboard order, Enter activation, table scrolling, focus containment/restoration, announcements, contrast and reduced motion. Do not add ARIA labels to generic containers without valid semantics or claim that a decorative label is a tab.

Automated axe, keyboard assertions, screenshots, native zoom, actual assistive technology and physical-device testing are separate evidence types. Record rule scopes and incomplete/manual findings. Viewport resizing does not prove 200%/400% native zoom. Zero automated violations does not establish formal WCAG conformance.

## 14. Security and historical boundaries

Presentation consistency must preserve employee ownership, manager/team scope, tenant isolation, custom permissions, governance locks, historical immutability, audit records and financial semantics. Hiding controls is not authorization. Exercise foreign-ID and direct mutation denials where applicable.

Closed attendance snapshots remain protected; Leave reservations/consumption/cancellation remain ledger-owned. Existing backend policy decides action eligibility even after a stale preview. Unsupported actions must be unavailable with accurate guidance; a design task must not create new unlock, force-complete, delegation or payroll paths.

## 15. Adoption and evidence

Use the [adoption checklist](hrms-ui-ux-screen-adoption-checklist.md) for each bounded screen family. Shared defects are fixed at the shared component level and verified in affected consumers; domain-specific defects stay in their owning layer.

A screen is accepted only with relevant workflow and negative authorization evidence, actual responsive image review and truthful status accounting. Required checks depend on the implementation delta; documentation-only changes need link/source review, not a fresh product test claim.

Record source/build provenance, exact suite selections, passed/failed/skipped/blocked/unexecuted counts, accessibility limits, historical failures and guarded synthetic cleanup. Do not add repeated executions into a unique-test total. Retain open limitations and distinguish scoped local functional PASS from overall acceptance and deployment readiness.

This standard introduces no deployment or frozen release-gate change. UI adoption proceeds through reviewable screen slices, not a global untested stylesheet switch.
