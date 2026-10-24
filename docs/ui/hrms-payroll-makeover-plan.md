# Payroll UI/UX makeover plan

Prepared: 23 October 2026; updated 24 October 2026. Status: [Phase 1 baseline complete](hrms-payroll-phase1-design-baseline.md), [Phase 2 configuration complete](hrms-payroll-phase2-configuration-makeover.md), [Phase 3 readiness, inputs and calculation complete](hrms-payroll-phase3-processing-makeover.md), [Phase 4 review, adjustments and settlements complete](hrms-payroll-phase4-review-adjustments-settlements.md), and [Phase 5 outputs, finance and providers complete](hrms-payroll-phase5-outputs-finance-providers.md). [Phase 6 payroll reports](hrms-payroll-phase6-reports.md) is in progress. Scope is defined by the [35-route inventory](hrms-payroll-makeover-inventory.md).

## Purpose

Bring Payroll to the same task hierarchy, filter behavior, form/dialog safety, feedback, responsive layout and evidence standard used by Leave, Attendance and Organization/Lifecycle. Preserve current payroll domain, authorization, audit, statutory, provider, storage and accounting contracts.

Use the [shared UI/UX standard](hrms-ui-ux-standard.md), [HR Admin experience standard](hrms-hr-admin-experience-standard.md), [screen adoption checklist](hrms-ui-ux-screen-adoption-checklist.md), [frontend validation standard](hrms-frontend-validation-feedback-standard.md) and [Leave/Attendance makeover reference](hrms-leave-attendance-makeover-reference.md).

## Phases and exit gates

| Phase | Scope | Required deliverables and exit gate |
| --- | --- | --- |
| 1 — Inventory and rendered baseline | All 35 routes, dialogs, tabs, filters, APIs, permissions and downstream handoffs | **Complete:** machine inventory and contract map; 108/108 current-build executions, 315 captures and six inspected samples. Read-only baseline; no destructive business transitions. |
| 2 — Configuration | Payroll setup, salary setup, statutory setup and payroll rules | **Complete:** shared active-task composition, compact mobile task strips, statutory value containment, 15/15 three-engine responsive checks and 15/15 real Chromium workflow checks on source-matched build `XWGfNDvxUPV0vUHgMpkDV`. |
| 3 — Readiness, inputs and calculation | Time-to-payroll, readiness, input snapshots/import/reconciliation/lock and draft calculation/jobs | **Complete:** core UI and URL-state behavior; 12/12 three-engine responsive, 6/6 established workflow, 4/4 owned transition and 4/4 backend recovery checks passed on build `FOIH5wLjJByqRfBa0TOL_`. |
| 4 — Review, adjustments and settlements | Review/exceptions/close actions, adjustments and settlements | **In progress:** URL-backed review tasks, eligible-only adjustment/settlement transitions, rejection rationale and uncertain-response handling implemented; responsive and owned lifecycle certification pending. |
| 5 — Outputs, finance and providers | Outputs/publication/access, finance handoff and provider connections/delivery/mapping/certification/rehearsal | Reconciliation before publication, secure artifact access, explicit delivery/acknowledgement states, safe retries and complete provider evidence without exposing secrets. |
| 6 — Reports | Payroll hub and all 20 specialized payroll/finance/statutory/provider reports | Every option and meaningful filter intersection, stable sort/paging, complete bounded collection, copied URL/history, drill-down return scope and screen/CSV/manifest/print parity. |
| 7 — Joined closure | All completed slices and affected ESS, Finance Manager, Tenant Admin and shared consumers | One source-matched build, three-engine regression, representative visual review, accessibility checks, domain/backend selections, finding disposition and exact synthetic-data/infrastructure cleanup. |

Each phase is independently reviewable. A phase closes only when implementation, real workflow checks, negative cases, final renders and evidence are complete. Presentation-only adoption does not close a workflow phase.

## Phase 1 — baseline method

Enumerate each route and its meaningful states from source before capturing it. Record server/client ownership, primary task, summaries, filters, tables, selected-record behavior, actions, dialogs, APIs, permissions, audit effects, downstream consumers and known evidence. Render with isolated realistic payroll data rather than demo fallbacks where production paths are under test.

Inspect all routes at 1440, 1024, 768, 390 and 320 pixels. Add short-height cases for dense action groups, long tables, mapping editors and dialogs. Record overflow, clipped labels, duplicated actions, misleading counts, weak hierarchy, stale selection, feedback/focus failures and incorrect empty/error semantics. Tie each finding to a route, state and acceptance check.

Phase 1 produces the test matrix before implementation. This prevents a styling pass from being mistaken for coverage of calculation, locking, publication, transmission or filing behavior.

## Phase 2 — configuration

Use task-first headers and compact summaries. Separate the active catalog from create/edit work, retain useful selected-record context and group long fields by identity, effectivity, calculation behavior and dependencies. Effective-dated versions must show current/future/historical meaning without implying that a saved draft is active.

Payroll calendars and periods preserve financial-calendar and lock dependencies. Salary structures retain component/version composition and assignment effectivity. Statutory screens distinguish packs, components, slabs, employer registrations and filing calendars. Rule screens separate definition, version and evaluation evidence.

Required checks include create/edit, overlap/conflict validation, stale/off-filter detail, deactivate/archive/delete restrictions, dirty close, pending double-submit guard, server field errors, abort/5xx/malformed response, permission denial, tenant isolation and retained return scope. Evaluation is evidence for submitted inputs; it is not a payroll calculation or production activation.

## Phase 3 — readiness, inputs and calculation

Make the current run/period and readiness scope unmistakable. Summaries state whether counts cover the current page, loaded population or complete matched population. Employee blockers need readable reason, source and supported destination. Do not turn readiness into an invented repair workflow.

Input snapshots require committed search/status/run/employee scope, independent selected-record lookup, clear editable versus locked state, reconciliation evidence and bulk-import row outcomes. Preview changes invalidate prepared rows. Submissions guard duplicates and retain source input after rejected, partial or uncertain outcomes according to the backend contract.

Calculation displays queued/running/succeeded/failed state, authoritative job identity, validation issues and safe retry/recalculation behavior. Preserve locked input identity and calculation versioning. Polling, reload and Back/Forward must not start extra calculations. Abort, timeout and malformed responses retain focus and never announce unconfirmed success.

## Phase 4 — review, adjustments and settlements

The review workspace prioritizes current run, exception/risk counts, decision progress and close blockers. Selected exceptions need readable employee/evidence context and an explicit decision consequence. Preserve filters and selection through detail/action/return paths.

Adjustments and settlements show creator, approver, current state, effective payroll impact, lines and audit history. Separate Create, Submit, Approve, Reject and Apply. Enforce maker-checker restrictions in both interface and direct API tests; a disabled button is not authorization evidence.

Test valid and invalid transition order, same-actor rejection, repeated requests, concurrent decisions, partial line validation, post-lock impacts, rejected rationale, unknown outcomes and persisted current state. Joined checks prove calculation/review/close effects without changing existing formula or accounting rules.

## Phase 5 — outputs, finance and providers

Outputs present generation, reconciliation and publication as distinct stages. Publication actions disclose audience and consequences. Downloads, signed grants, revocation, expiration and access-audit exports remain protected. An unpublished artifact must never be exposed through a preview link.

Finance handoff distinguishes generated, transmitted, acknowledged and failed delivery. Show authoritative identifiers, totals, attempt/evidence history and supported retry scope. Provider screens keep connection identity/status separate from credentials, certification, schema mapping versions, simulations, activation, archive, delivery retry and launch rehearsal.

Test reconciliation blockers, duplicate generation/publication/transmission, revoked access, foreign tenant/artifact IDs, callback/retry ordering, provider failure, mapping simulation/activation conflicts and unknown transport outcomes. Mask secrets and sensitive bank/statutory data according to existing contracts.

## Phase 6 — reports

Inventory the full filter domain for each of the 21 report routes. Exercise every finite option, All/empty/unknown handling, meaningful intersections, case/whitespace search, no-match, Clear, page sizes, page boundaries, stable sort ties, copied URLs, reload and Back/Forward. Filters and paging use committed URL state.

Screen rows, totals, CSV, manifest and print views derive from one declared complete bounded population. Test beyond the backend page cap and fail closed on missing, duplicated, overlapping or changing pages. Export audits are written only for assembled authorized exports. Drill-down links retain supported report scope and reject unsafe return targets.

Report wording must match the actual predicate: readiness is not filing, generated is not published, transmitted is not acknowledged, and an exception count is not automatically a financial variance. Empty source, filtered no-match, unavailable source and permission denial need different states.

## Common UI/UX acceptance

Every route uses one visible H1 and a consistent Accerio composition: task header, concise guidance, correctly scoped summaries, committed filters, named data region, primary action, contextual row actions and useful feedback. Avoid repeated titles, competing primary actions and long instructional walls above the working area.

Forms and dialogs require visible labels, required indicators, field-level and summary errors, retained input, focus on the first actionable error, pending disabled state and one submission. Dirty close uses one decision and returns focus to the actual opener. Long dialogs keep header/footer reachable at 320px and short viewport heights.

Tables retain useful columns and use an internal labelled scroll region where needed. Mobile record cards are acceptable only when information/action parity is preserved. Keyboard users reach filters, rows, action menus, pagination and dialogs in a logical order. Loading, empty, no-match, denied, unavailable, partial and success states remain distinct.

## Verification strategy

Use an isolated loopback PostgreSQL database, production Next build and guarded synthetic tenant. Browser retries remain disabled. Each phase runs Chromium, Firefox and WebKit against desktop/tablet/mobile and short-height dialog states. Add selected axe checks, keyboard/focus checks and manual inspection of representative populated, empty, error and dialog captures.

Tests cover:

- every route and meaningful state owned by the phase;
- every declared filter/sort/page-size option and meaningful intersection;
- real create/update/action persistence and resulting audit/history;
- permission, maker-checker and foreign-tenant negatives;
- stale/off-page selection and safe return context;
- pending duplicate guards, abort, 5xx, malformed and uncertain outcomes;
- complete report/export parity beyond one backend page;
- affected ESS/Finance/Tenant/shared consumers;
- TypeScript, focused ESLint, Django checks, migrations and production build.

Evidence records exact source/test hashes, build ID, commands, JSON reports, fixtures, captures, inspected-image notes, failures/corrections and final counts. Diagnostic failures remain visible and are excluded from accepted totals unless a clean source-matched correction run exists.

## Safety and cleanup

All mutating tests use owned synthetic data. Calculation, locking, publication, transmission, provider callbacks, statutory packages and settlement/application actions never run against existing user data. Teardown verifies zero owned tenants/users/artifacts/media and removes owned services, database/container/volume and temporary runtime files. Append-only audit evidence is preserved only where the test contract requires it and ownership is explicit.

## Closure boundary

Phase 7 may certify the declared local source/build and selected workflows. It does not by itself certify payroll formula correctness for every employee, every jurisdiction, bank/provider production connectivity, production secrets/storage, load/concurrency at payroll scale, physical devices, native zoom, screen readers, formal WCAG, staging deployment or release readiness. Those gates remain explicit.
