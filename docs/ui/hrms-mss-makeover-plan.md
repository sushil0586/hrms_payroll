# Manager Self-Service UI/UX makeover plan

Prepared: 26 October 2026. Status: Phases 1–5 accepted; makeover complete within the recorded scope. Scope: [MSS makeover inventory](hrms-mss-makeover-inventory.md). Closure: [MSS family closure](hrms-mss-phase5-family-closure.md).

## Purpose

Complete the Accerio makeover for Manager Self-Service using the same operational hierarchy, URL-state, feedback, responsive and evidence contracts applied to Leave, Attendance, Organization, Employees, Documents, Payroll and Workflow/Notifications. Preserve all manager scope, tenant isolation and backend-owned approval rules.

ESS is already complete through ESS-6A. During this plan it is a shared-shell and cross-workspace regression consumer, not an implementation family.

Use the [shared UI/UX standard](hrms-ui-ux-standard.md), [screen adoption checklist](hrms-ui-ux-screen-adoption-checklist.md), [frontend validation standard](hrms-frontend-validation-feedback-standard.md) and [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md).

## Phases and exit gates

| Phase | Scope | Deliverable and exit gate |
| --- | --- | --- |
| 1 — Reconciliation and rendered baseline | Three MSS routes, two queues, history state, dialogs, loading/error/shell, permissions and ESS handoffs | **Complete:** 12/12 Chromium/Firefox/WebKit scenarios, 24 captures, six selected axe scans with zero violations, exact source/build identity and zero-residue teardown; retained Approval-tab activation, hierarchy and density findings for Phases 2–3 |
| 2 — Manager control center | `/mss`, permission-scoped metrics/actions, team snapshot and ESS switching | **Complete:** 9/9 three-engine scenarios; decision-only action list, summary-only team signals, duplicate panel removal, readable responsive rows, clear-queue state, zero selected axe violations and zero-residue cleanup |
| 3 — Approval workspace | Leave and attendance queues, selected detail, pagination and decision dialogs | **Complete:** 12/12 three-engine scenarios; reliable keyboard/document tab activation, browser-history detail restoration, validation and ambiguous-response recovery, single-submit dialogs, persisted decisions, role/tenant/terminal denials, responsive evidence and zero selected axe violations |
| 4 — Notifications and joined journeys | Manager inbox, safe source handoff, approvals return context and employee request/manager decision/employee outcome | **Complete:** 9/9 three-engine scenarios; committed filters/read state, keyboard focus, valid/stale source handling, role isolation, real Leave/Attendance decisions, exact ESS outcomes, compact evidence and zero selected axe violations |
| 5 — Closure | Whole MSS family plus ESS/shared consumers | **Complete:** 12/12 final three-engine scenarios, 36 responsive captures, nine zero-violation axe reports, keyboard/dialog verification, persisted ESS outcomes, six backend regressions, all engineering gates and zero-residue teardown |

## Phase 1 baseline matrix

Capture each state against the current production build before presentation edits:

| Surface | Required states |
| --- | --- |
| Dashboard | both permissions/populated; each single permission; no decision permission; zero pending; unavailable read; 1440, 768, 390 and 320 widths |
| Leave approvals | populated; empty; page 2; selected detail; stale/foreign selection; invalid queue/page; approve; reject without/with note; terminal transition; read/mutation failure |
| Attendance approvals | same queue matrix plus downstream attendance identity and payroll-impact wording |
| History | explicit unavailable explanation, active-queue recovery links and no fabricated rows/counts |
| Notifications | populated/unread; read; no-match; empty; safe/unsafe/stale source; detail dialog; service and mutation failures |
| Shared route behavior | loading skeleton, error/retry, unauthenticated, wrong workspace, permission changes, mobile navigation, ESS switch and focus restoration |

Phase 1 compared rendered behavior with source contracts and existing evidence on one production build. See the [Phase 1 baseline](hrms-mss-phase1-source-baseline.md). Historical results remain context rather than being added to the 12 current-build scenarios.

## Shared MSS screen contract

Every route has one visible H1 and concise task guidance. Dashboard metrics describe the exact authorized manager population. A queue presents one primary review path, stable employee/request identity, status/effectivity evidence and a named keyboard-scrollable data region. Query state remains in the URL.

The selected detail and decision dialog keep request identity visible. Reject requires the backend-required note. Pending controls block duplicate activation synchronously. Confirmed decisions reconcile from the server; lost transport remains unconfirmed and must not be retried automatically. Focus enters, stays within and returns from the dialog deliberately.

Mobile composition preserves every decision fact and action. The document must not overflow horizontally; wide tables scroll inside their labelled region. Empty population, no match, permission restriction, stale selection and service failure are separate states.

## Phase 2 — control center

Accepted 26 October 2026. See [Phase 2 manager dashboard evidence and implementation](hrms-mss-phase2-manager-dashboard.md).

Keep one daily priority derived only from authorized counts. Leave and attendance actions appear only when their permission exists. “Today exceptions” and “Team on leave” may link to the general corresponding queue only with wording that makes that destination explicit; do not imply a filtered population that the API does not provide.

Reduce repeated metrics when the same value appears in the summary strip, priority card, action table and team snapshot without helping a different decision. Keep ESS links in a secondary personal-workspace region. Test zero, singular, large and unavailable values and long localized/user content.

## Phase 3 — approval workspace

Accepted 26 October 2026. See [Phase 3 approval workspace evidence and implementation](hrms-mss-phase3-approval-workspace.md).

Leave and attendance share navigation and presentation, while their business evidence stays domain-specific. Preserve supported page parameters and selected IDs across reload and history. Queue permission changes must choose a permitted state without exposing hidden counts.

The decision flow covers allowed approve, allowed reject, missing rejection note, stale version, terminal record, wrong reporting scope, foreign tenant, duplicate activation, server validation, read failure after confirmed mutation and ambiguous transport. Feedback names the affected request and actual state without claiming downstream payroll completion.

Completed-decision history remains an honest unavailable state. A new history feature requires separate product, API, retention, permission and audit approval.

## Phase 4 — inbox and joined journeys

Accepted 26 October 2026. See [Phase 4 notifications and joined journeys](hrms-mss-phase4-notifications-joined.md).

Retain the shared notification center accepted in Workflow/Notification Phase 5. Add only MSS-specific continuity needed to move from a notification to an authorized approval and back. Unsafe, foreign, stale and unsupported action URLs remain unavailable with useful guidance.

Joined owned fixtures prove: employee Leave submission → manager decision → employee history/notification; employee attendance correction → manager decision → employee attendance/notification; manager notification read state; leave-only and attendance-only manager scope; foreign tenant and non-manager denial.

## Phase 5 — final acceptance

Accepted 26 October 2026. See [Manager Self-Service makeover closure](hrms-mss-phase5-family-closure.md).

Run Chromium, Firefox and WebKit with retries disabled against one immutable production build. Cover desktop/tablet/mobile and short-height dialogs; keyboard queue navigation, table panning, modal focus and restoration; selected WCAG 2 A/AA and 2.1 AA axe scans; TypeScript, focused ESLint, Django checks, migrations and focused backend permission/transition tests.

Evidence must include exact commands, machine-readable results, screenshots, manually inspected findings, source/build identity and guarded fixture cleanup. Existing customer data and unrelated local services must remain untouched.

## Closure boundary

This plan can certify the recorded local source/build and owned synthetic workflows. It cannot certify every customer hierarchy or approval policy, production scale, external notification delivery, physical devices, native zoom, screen readers, formal WCAG conformance, staging deployment or production release.
