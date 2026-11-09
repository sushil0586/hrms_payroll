# HRMS Comprehensive Certification - Phase 1 Shift and Roster Inventory

Date: 2026-11-07

Repository baseline: `b151c8ada` on `main` with unrelated working-tree changes preserved

Phase verdict: **IN PROGRESS**

## Fresh checkpoint results

Executed on 2026-11-07 against isolated PostgreSQL 16 and a production-built Next.js application:

| Gate | Result |
| --- | --- |
| Shift/Roster/Attendance/Leave PostgreSQL and Django tests | 99 passed, 0 failed |
| Shift and roster browser actions | 2 passed, 0 failed |
| Employee shift assignment browser actions | 1 passed, 0 failed after harness-port correction |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Django system check | Passed, zero issues |
| Migration drift | None |
| Production build | Passed |
| Build warning | Existing `globals.css:4686` Autoprefixer mixed-support warning for `end` |
| Core visual/health matrix | 7 passed across three engines and five viewport sizes |
| Automated accessibility | Zero AXE violations after contrast remediation |
| Console/server health | Zero console errors and zero HTTP 5xx responses |

The first employee-assignment browser invocation was not an application failure: its config targets port `3208`, while the initial production server was running on `3206`. It failed before login with `ECONNREFUSED`. The same unchanged test passed against the expected port. The interrupted trace remains preserved in `docs/qa/evidence/employee-shift-actions/results/`.

Fresh mutation workflows currently cover Desktop Chromium; the visual/health matrix below covers Firefox, WebKit and all five required viewport sizes. Connected historical/collision scenarios remain Pending, so this checkpoint does not close Phase 1.

### Visual and accessibility remediation

The first fresh matrix identified one P2 defect on `/hr-admin/shift-roster-templates`: compact `Find person` and `Target employee` labels used hard-coded `#7c879d` at 10px on white, producing 3.61:1 contrast instead of the WCAG AA 4.5:1 requirement. The late Time & Leave label rule now uses the approved accessible secondary text color `#667085`. The complete matrix then passed on:

- Chromium at 1920x1080, 1366x768, 768x1024, 390x844 and 360x800.
- Firefox at 1920x1080.
- WebKit at 1920x1080.

For each project, all three core screens were checked for document overflow, zero-size rendered actions, AXE violations, console errors and HTTP 5xx responses. Default and open interaction screenshots were captured. Manual review of desktop and mobile candidates confirmed reachable primary actions, usable dialogs/panels, readable feedback and intentional contained table scrolling without document-level overflow or critical control clipping.

The roster empty state retains a disabled pager. This is a minor cross-screen consistency candidate, not a functional or accessibility blocker in this phase.

Evidence:

- `docs/qa/evidence/shift-roster-phase1/results.json`
- `docs/qa/evidence/shift-roster-phase1/review-candidates/`
- Historical failed traces remain in the JSON evidence sequence and are not represented as passing attempts.

After this checkpoint, SR-001 through SR-009 have fresh core functional, rendered, responsive and accessibility evidence. Connected locked-history, rollout-apply, Attendance derivation, Leave collision and ESS/MSS integration gates remain pending before Phase 1 can be closed.

## Scope and certification rule

This phase certifies Shift and Roster configuration and their direct Attendance and Leave interactions. A retained result credits prior evidence, but does not replace a fresh rendered review where this matrix says Pending. A screen reaches PASS only after its functional, UI/UX, responsive, accessibility, authorization, and data-integrity gates all pass.

Status terms:

- **Retained PASS**: directly supported by an identified prior test or report.
- **Pending**: not freshly and completely observed for this phase.
- **Policy gate**: behavior cannot be certified until an owner approves the rule.

## Screen inventory

| Screen ID | Route and screen | Roles and tenant scope | Functional evidence | Visual/UI evidence | Responsive evidence | Accessibility evidence | Negative/error evidence | Phase status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | `/hr-admin/shifts` - shift list, inspect, filter, actions | HR Admin; current tenant | Retained PASS: shift lifecycle Playwright | Retained PASS: route design inventory | Pending fresh five-viewport review | Retained keyboard/focus proof; fresh AXE pending | Retained validation, duplicate-submit and persistence proof | Pending |
| SR-002 | `/hr-admin/shifts/new` - create shift | HR Admin; current tenant | Retained PASS: create and server persistence | Retained configuration-form snapshots | Laptop/mobile retained; desktop/tablet/small-mobile pending | Required-field focus retained; AXE pending | Required fields and duplicate submit retained | Pending |
| SR-003 | `/hr-admin/shifts/[itemId]/edit` - edit shift | HR Admin; current tenant | Retained PASS: update, cancel, refresh persistence | Retained design inventory | Pending fresh matrix | Focus restoration retained; AXE pending | Unsaved cancel and inactive/reference rules pending | Pending |
| SR-004 | `/hr-admin/employee-shift-assignments` - assignment list and inspect | HR Admin; current tenant | Retained PASS: create/filter/inspect/edit | Retained route design inventory | Pending fresh five-viewport review | Focus restoration retained; AXE pending | Retained overlap validation; RBAC and stale update need fresh connected proof | Pending |
| SR-005 | `/hr-admin/employee-shift-assignments/new` - assignment create | HR Admin; current tenant | Retained PASS: create and durable persistence | Retained laptop/mobile snapshots | Laptop/mobile retained; remaining viewports pending | Error focus retained; AXE pending | Retained required fields, conflict preview, duplicate submit | Pending |
| SR-006 | `/hr-admin/employee-shift-assignments/[itemId]/edit` - assignment edit | HR Admin; current tenant | Retained PASS: update/cancel/refresh | Retained route design inventory | Pending fresh matrix | Focus restoration retained; AXE pending | Historical close protection retained in PostgreSQL; browser linkage pending | Pending |
| SR-007 | `/hr-admin/shift-roster-templates` - templates and rollout | HR Admin; current tenant | Retained PASS: create/edit/filter/preview and rollout service | Retained route design inventory | Pending fresh five-viewport review | Focus restoration retained; AXE pending | Atomic rollback and replay retained; apply/error UI pending | Pending |
| SR-008 | `/hr-admin/shift-roster-templates/new` - template create | HR Admin; current tenant | Retained PASS: guided pattern create | Retained route design inventory | Pending fresh matrix | Required-field focus retained; AXE pending | Invalid/inactive/missing shift branches partially retained | Pending |
| SR-009 | `/hr-admin/shift-roster-templates/[itemId]/edit` - template edit | HR Admin; current tenant | Retained PASS: update/cancel/refresh | Retained route design inventory | Pending fresh matrix | Focus restoration retained; AXE pending | Stale/concurrent update and referenced history pending | Pending |
| SR-010 | `/hr-admin/reports/roster-rollout-audit` - rollout history | HR Admin/report permission; current tenant | Retained report route and pagination coverage | Retained aligned route inventory | Pending fresh five-viewport review | Report-family AXE retained; route-specific scan pending | Empty, long-content, API error, and RBAC pending | Pending |
| SR-011 | `/hr-admin/attendance-operations` - schedule/derivation operations | HR Admin; current tenant | Retained Attendance full-local PASS | Retained operational screenshots | Laptop/mobile retained; other viewports pending | Retained no-overflow checks; AXE pending | Recompute/error/retry branches retained in part | Pending |
| SR-012 | `/hr-admin/attendance-records` - derived records | HR Admin; current tenant | Retained Attendance family PASS | Retained route review | Desktop/tablet/mobile retained; exact five-viewport rerun pending | Retained AXE PASS | Empty/loading/error/tenant denial retained | Pending |
| SR-013 | `/hr-admin/attendance-regularizations` - HR review | HR Admin; current tenant | Retained Attendance full-local PASS | Retained route review | Pending fresh matrix | Retained shared patterns; route AXE pending | Approve/reject, retry, stale and denial retained | Pending |
| SR-014 | `/hr-admin/attendance-close` - monthly close | HR Admin/checker; current tenant | Retained close lifecycle PASS | Retained route review | Pending fresh matrix | Retained AXE PASS | Closed-period mutation and concurrency retained | Pending |
| SR-015 | `/hr-admin/reports/attendance-derivation-exceptions` | HR Admin/report permission; current tenant | Retained report certification | Retained route review | Pending fresh matrix | Report-family AXE retained | Empty/API failure/RBAC pending fresh proof | Pending |
| SR-016 | `/hr-admin/reports/attendance-exceptions` | HR Admin/report permission; current tenant | Retained report certification | Retained route review | Pending fresh matrix | Report-family AXE retained | Empty/API failure/RBAC pending fresh proof | Pending |
| SR-017 | `/hr-admin/reports/attendance-register` | HR Admin/report permission; current tenant | Retained pagination/export reconciliation | Retained route review | Pending fresh matrix | Report-family AXE retained | Large result/filter/export proof retained | Pending |
| SR-018 | `/hr-admin/reports/leave-attendance-collisions` | HR Admin/report permission; current tenant | Retained collision evidence | Retained route review | Pending fresh matrix | Shared report AXE retained | Cross-tenant and no-collision states pending fresh proof | Pending |
| SR-019 | `/ess/attendance` - employee records and regularization | ESS; own employee/current tenant | Retained ESS browser lifecycle PASS | Retained route design PASS | Desktop/tablet/mobile retained; five-viewport rerun pending | Retained AXE and keyboard PASS | Retry, duplicate, locked record and own-scope proof retained | Pending |
| SR-020 | `/mss/approvals?queue=attendance` - manager decisions | MSS; assigned report/workflow scope | Retained cross-browser approval workspace PASS | Retained route design PASS | Desktop coverage retained; full matrix pending | Dialog/focus proof retained; AXE pending | Reassignment, former-manager 404, approve/reject and zero mismatch retained | Pending |
| SR-021 | `/ess/leave` - roster-aware leave application | ESS; own employee/current tenant | Retained leave local certification | Retained leave visual certification | Desktop/tablet/mobile retained; exact five-viewport rerun pending | Retained leave AXE/keyboard evidence | Weekly-off, holiday, collision, evidence and balance branches retained | Pending |
| SR-022 | `/mss/approvals?queue=leave` - manager leave decision | MSS; assigned report/workflow scope | Retained cross-browser approval workspace PASS | Retained route design PASS | Desktop coverage retained; full matrix pending | Dialog/focus proof retained; AXE pending | Reassignment, withdrawal cancellation, former-manager denial retained | Pending |

## Shared component and interaction inventory

The phase must inspect these interaction families across the listed screens rather than treating route load as certification:

- Standard page header, count summaries, filters, table regions, pagination, empty/loading/error states.
- Inspect side panels, create/edit dialogs, close/cancel behavior, focus restoration, Escape and backdrop behavior.
- Primary, secondary, destructive and disabled actions, including duplicate-submit protection.
- Search, dropdown-only filtering, sort direction, pagination boundaries and stale page correction.
- Success, warning and error feedback with no duplicate or false-success messages.
- Shift time, weekly-off and overnight semantics; effective periods and overlap conflicts.
- Roster pattern steps, preview/apply parity, skipped targets, audit history and replay.
- Roster/shift changes against locked attendance history and payroll inputs.
- Leave units across working days, roster off days, holidays, partial days and collisions.
- HR Admin, ESS and MSS tenant/RBAC boundaries and audit attribution.

## Existing evidence retained

- `docs/qa/hrms-attendance-full-local-certification-2026-11-05.md`: 43 PostgreSQL/Django tests and 206 focused browser assertions passed; 30 HR Admin Attendance routes plus ESS/MSS scope.
- `docs/qa/hrms-dd4-attendance-domain-certification.md`: roster atomicity/replay and derivation retained; three enterprise gaps remain explicit.
- `docs/qa/hrms-stg136-batch6-attendance-certification.md`: 12 frozen scenarios passed locally; shared staging was not represented as executed.
- `web/tests/attendance-setup-actions/shift-roster-lifecycle.spec.ts`: shift and roster create/edit/inspect/filter/preview contracts.
- `web/tests/employee-shift-actions/employee-shift-lifecycle.spec.ts`: assignment validation, conflict preview, persistence and focus contracts.
- MSS staging synthetic proof at deployed `d93aa7f60`: manager ownership reconciliation, former-manager denial, attendance approval, leave withdrawal cancellation, exact cleanup and zero global mismatches.

## Open certification risks

1. A connected browser proof must show that retroactive shift/roster changes cannot alter locked historical attendance and reports.
2. Overtime eligibility, maker/checker approval, rates and payroll conversion remain a Product/QA policy gate. This phase will not invent those rules.
3. Durable biometric source identity and crash/replay recovery remain outside a simple CSV success path.
4. Current action suites are primarily Desktop Chromium. Fresh Firefox, WebKit, five-viewport, visual-state and route-specific accessibility evidence is required for comprehensive certification.
5. Existing approved screenshots are incomplete for the exact five required viewports and must not be silently regenerated as accepted baselines.

## Phase 1 execution sequence

1. Run current focused backend Shift/Roster/Attendance/Leave integrity tests and migration/system checks.
2. Run shift, roster and employee-assignment action suites in one isolated PostgreSQL-backed environment.
3. Add deterministic visual candidates for default, populated, empty, loading, validation, API error, success, warning, open-dialog/panel and permission-denied states.
4. Review actual screenshots at 1920x1080, 1366x768, 768x1024, 390x844 and 360x800.
5. Run Chromium, Firefox and WebKit functional checks; run AXE, keyboard, overflow, clipping, console and failed-request health assertions.
6. Execute connected roster-to-attendance and roster-to-leave scenarios with PostgreSQL and audit reconciliation.
7. Record defects with before/after evidence, apply minimal fixes, and rerun affected plus shared-component regressions.
8. Publish a Phase 1 verdict and confidence score. Any unexecuted required state remains NOT RUN.

## Confidence rubric

Phase confidence is calculated from executed evidence, not route count alone:

- Functional and business rules: 30 points
- API/PostgreSQL/audit integrity: 20 points
- Security and tenant/RBAC boundaries: 15 points
- Rendered UI/UX and interaction review: 15 points
- Responsive and cross-browser coverage: 10 points
- Accessibility: 5 points
- Regression health and cleanup/evidence integrity: 5 points

No score above 95 is allowed while a mandatory P0/P1 case is open, any required browser/viewport is Not Run, or data-integrity evidence is incomplete.
