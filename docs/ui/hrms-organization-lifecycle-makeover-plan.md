# Organization and Employee Lifecycle UI/UX makeover plan

Prepared: 23 October 2026. Status: Phases 1–6 complete within the [bounded joined closure](hrms-organization-lifecycle-phase6-closure.md). Lifecycle permission policy remains an explicit open decision.

## Purpose and references

Apply the established Leave/Attendance UI/UX to Organization and Employee Lifecycle. Reuse the [shared standard](hrms-ui-ux-standard.md), [adoption checklist](hrms-ui-ux-screen-adoption-checklist.md), [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md), [Employee closure](hrms-employee-management-phase6-closure.md) and [Documents closure](hrms-document-management-phase6-closure.md). Preserve domain behavior while improving task hierarchy, scope, form grouping, feedback and navigation.

The [inventory](hrms-organization-lifecycle-makeover-inventory.md) owns 18 HR route patterns, nine organization master sections, existing query dialogs and two reports. Guided setup and organization CSV imports are part of Organization, not omitted because they share its page. Employee directory/profile, Documents, workflow templates, notifications and payroll are adjacent consumers: assess actual handoffs and regressions without treating those whole families as new makeover scope. No dedicated organization/employment-lifecycle ESS or MSS page was found; do not invent one from the broader cross-role objective.

## Phases and completion gates

| Phase | Scope | Deliverables and exit gate | Status |
| --- | --- | --- | --- |
| 1 — Inventory and design | All 18 route patterns, master variants, dialogs, services and report boundaries | Source map, current desktop/mobile captures, inspected findings, read probes, concrete composition decisions and declared unexecuted gates | Baseline complete: 115 captures, 14 inspected, 12 GET probes; no business writes |
| 2 — Organization | All nine catalogs and create/edit forms; guided setup and CSV import | Task-first catalog, explicit selection, dependency-aware forms, safe draft/pending paths, meaningful errors/results and accurate step/batch outcomes | Complete within scope: 33 interaction checks + 9 final rechecks, 210 captures; evidence linked below |
| 3 — Lifecycle, onboarding and probation | Shared inbox, owning queues, standalone/dialog forms, owner/status actions and both reports | Committed scope, independent selected-record lookup, clear consequences, complete bounded report/export population, accurate risk labels and explicit lifecycle-policy assessment | Complete within scope: 45 browser checks + 3 inspector checks, 6 contract tests; evidence linked below |
| 4 — Movements | Queue, create/edit, query dialogs and lifecycle handoffs | Readable before/after structure, effective-date/status consequences, existing owner/manager semantics and employment-history integrity | Complete within scope: 27 browser checks + 3 handoff checks, 2 existing domain tests; evidence linked below |
| 5 — Exits | Queue, create/edit, query dialogs, clearance work items and handoffs | Clear date timeline, clearance ownership/history, visible consequences and retained employee/workflow/settlement boundaries | Complete within scope: 33 browser checks, 4 existing exit-contract tests; evidence linked below |
| 6 — Joined closure | Completed slices and affected shared consumers | Cross-screen/role checks, source-matched browsers, inspected renders, finding disposition, exact cleanup and bounded family closure | Complete within the [Phase 6 closure](hrms-organization-lifecycle-phase6-closure.md) |

Phase 2 can be delivered in three reviewable batches: catalog/selection/navigation; nine standalone create/edit variants; guided setup/import preview/commit and partial results. Keep each batch's actual baseline, implementation, interaction checks and visual review together. Do not wait until Phase 6 to inspect renders.

## Phase 2 — Organization composition

Make the active section's search, rows and selected evidence the daily working area. Replace the always-dominant nine-card library with compact section navigation and a secondary master-library/help view. Show summary counts with their real snapshot/filter/page scope. Keep an explicit Create action for the active section. Give guided setup/import a deliberate secondary entry rather than requiring the catalog user to traverse their content.

Maintain each section's supported fields and relationships: legal entities and locations feed branches; business units and parent hierarchy feed departments; legal entities feed cost centers; grades feed designations; employment types retain payroll-eligibility semantics. Preserve current deactivation guidance and linked-record information. Do not describe presentation changes as guaranteed dependency-safe edits or payroll readiness.

Use one task heading per standalone editor, a compact record context and useful identity/dependency/behavior groups. Keep clear required/error associations, retained values, focused feedback, hydration readiness, synchronous write guards and busy fields/actions. Cancel and Back must have deliberate return scope and dirty protection. Organization already has a synchronous submit ref, network handling and native success navigation: retain those strengths rather than assuming every legacy form lacks them.

Resolve OL-C02 selection ambiguity: an invalid or off-filter selected ID must not quietly become a different selected record without explanation. Test inactive and deleted/stale references, hierarchy/self-parent constraints and linked-record deactivation using the actual backend rules.

Guided setup reuses or creates masters sequentially; import has local CSV preview followed by ready-row creation. Preserve these distinct execution models. Document row/step successes, failures and skipped/reused records; retain source input and explain retry scope. Source review during Phase 2 confirmed that the backend commits the submitted CSV ready-row batch atomically; blocked preview rows are not submitted. Guided setup uses separate sequential writes and may retain partial success. Preserve these contracts; do not infer server preview or idempotency guarantees from presentation. Expand and capture both workbenches before their implementation batch; their expanded interactions are not covered by Phase 1.

## Phase 3 — Lifecycle, onboarding, probation and reports

Use one operational inbox heading, a compact labelled summary, committed filters and readable rows. Keep advanced filters secondary but visible when active. Reveal selected detail deliberately without compressing the working table into a narrow column. Differentiate matching population, current page, selected rows, document attention and domain-wide counts; avoid calling the loaded 25 rows the full matching view.

Preserve owner vocabulary: identifier owners for onboarding/probation and employee/manager ownership where supported for movements/exits. Keep type-dependent status choices and bulk-action eligibility. Bulk actions must state the selected scope and disclose rejected/skipped/changed records according to the existing response contract.

Resolve OL-C02 for query edits through authorized independent lookup or deliberate stale/unavailable feedback. Preserve filters/page through Inspect, Edit, Cancel, success return, copied links and Back/Forward. Test all four record types, off-page/off-filter IDs and standalone counterparts. The inbox's separate probation fetch alone does not remove its page-local `editItem` gate.

Group onboarding around joiner/status/dates, owner/workflow/template and checklist execution. Preserve template-derived due dates, work-item identity/history and notifications. Group probation around review schedule, decision, conditional extension metadata and reviewer/rationale. Existing confirmation/extension services update employee dates; do not relabel a save as a harmless note edit. Explain consequences using authoritative contracts and test them in isolated fixtures before acceptance.

Resolve OL-C01 before claiming complete report/export coverage. The Phase 1 baseline found both report pages and their export helper fetched only page 1 with a requested size of 500, capped by the backend at 100. Phase 3 replaces this with a bounded complete collection contract. Establish one bounded complete collection contract, visible fail-closed behavior and matching screen/CSV/manifest search/filter/sort/date semantics. Check more than 100 records, missing/overlapping continuation, bounds and churn. This must not claim transactional or same-count concurrent consistency. Align “high risk”, “attention required”, owner gaps and date/aging labels with their actual predicates rather than inventing new risk calculations.

Assess OL-C03 against the permission catalog before authorization changes. Current lifecycle endpoints inherit the broad HR gate; inspected create/update/bulk handlers do not add operation-specific `lifecycle.manage` enforcement. Preserve that observed contract during unrelated visual work, explicitly record its limits and separate any policy decision from UI acceptance. Do not silently grant permissions or infer a new backend policy from makeover authorization.

## Phase 4 — Movement composition and preservation

Use one task heading and compact employee/type/status/effective-date context. Present supported source and destination structure together; retain all payload fields and source snapshots, including fields not currently prominent in the default form. Preserve legal-entity, branch, location, business-unit, department, designation, grade, employment-type and reporting-manager relations where supported.

Completed movements invoke the effective-history service and can update employment assignments and current employee mappings. Preserve status/date validation, idempotent application/history constraints and actor semantics; do not imply that Approved and Completed are interchangeable. Test draft and completed paths, future/effective dates, invalid cross-tenant selections, manager relationships and repeated submission against existing domain behavior. Review side effects and UI consequences before any real completion test. Source inspection is not acceptance of these transitions.

## Phase 5 — Exit composition and preservation

Prioritize employee/status, resignation/notice dates and proposed/approved/actual last-working dates. Keep reason, handover, rehire/regrettable flags, workflow and clearance work items grouped and understandable. Preserve template-derived tasks, owner vocabulary, due-date refresh, item history and employee-state synchronization. Timeline and clearance validators remain authoritative.

Show actual closure consequences without claiming final payroll settlement, statutory completion or release of downstream artifacts. Identify implemented employee, document, notification and settlement handoffs before adding links. Test required chronology, blocked clearance, draft/approved/completed/cancelled cases and uncertain writes in isolated fixtures; do not execute them against existing user data.

## Common verification and acceptance

Each implementation phase records its exact routes, variants, source/test hashes, immutable production build, fixtures and cleanup. Review 1440/1024/768/390/320px, short-height dialogs, long labels and tables with internal scrolling. Inspect representative captures; image count alone is not visual review. Exercise keyboard entry, Tab/Shift+Tab, Escape, focus return, field visibility and every supported close/cancel/navigation path.

Test field and server validation, retained drafts, synchronous duplicate-submit prevention, disabled fields/close actions while pending, network/5xx/malformed acknowledgements and known versus unconfirmed outcomes. Wait for semantic hydration and completed navigation; avoid competing push/refresh success transitions. Capture real persisted readback for each accepted write and verify actual side effects and ownership. Do not write tests that merely mirror implementation details.

Keep genuine empty data, no matches, stale IDs, denied access and unavailable reads distinct. Existing live/demo classification must not turn a failed read into credible live numbers. Verify role/read dependencies and API gates with scoped personas. Formal assistive technology, physical-device/native-zoom, exhaustive security/domain acceptance, large-load testing and deployment remain separate from this makeover.

Phase 2 Organization is authorized and implemented; bounded acceptance is recorded in the [Phase 2 implementation record](hrms-organization-lifecycle-phase2-makeover.md). Lifecycle, onboarding, probation and reports are accepted within the [Phase 3 record](hrms-organization-lifecycle-phase3-makeover.md). Movement screens are accepted within the [Phase 4 record](hrms-organization-lifecycle-phase4-makeover.md). Exit screens are accepted within the [Phase 5 record](hrms-organization-lifecycle-phase5-makeover.md). [Phase 6 joined closure](hrms-organization-lifecycle-phase6-closure.md) completes the current-source three-engine matrix, report label/owner-wrap polish, unavailable-read guards, retained exports, shared consumers and exact cleanup. All six UI phases are complete within their recorded bounds; OL-C03 remains a policy follow-up. No schema, backend permission policy, commit or deployment is included.
