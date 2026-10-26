# Workflow and Notification Management UI/UX makeover plan

Prepared: 24 October 2026. Status: all six phases accepted. Phase 6 closed at 9/9 joined Chromium/Firefox/WebKit scenarios plus 8/8 focused backend regressions. Scope: [20-route family inventory](hrms-workflow-notification-makeover-inventory.md).

## Purpose

Bring workflow configuration, notification operations and ESS/MSS inboxes to the same task hierarchy, URL-state, form safety, feedback, responsive layout and evidence standard used by the completed Leave, Attendance, Organization, Employee, Documents and Payroll makeovers. Preserve current authorization, tenant isolation, approval resolution, provider, retry and audit contracts.

Use the [shared UI/UX standard](hrms-ui-ux-standard.md), [HR Admin experience standard](hrms-hr-admin-experience-standard.md), [screen adoption checklist](hrms-ui-ux-screen-adoption-checklist.md), [frontend validation standard](hrms-frontend-validation-feedback-standard.md) and [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md).

## Phases and exit gates

| Phase | Scope | Deliverable and exit gate |
| --- | --- | --- |
| 1 — Inventory and rendered baseline | All 20 route patterns, dialogs, filters, APIs, permissions and affected-domain links | **Complete:** 63/63 three-engine responsive route checks plus 5/5 state, permission, modal and selected axe scenarios; 68/68 total |
| 2 — Workflow configuration | Workflow control, templates, assignments and runtime trace | **Complete:** 7/7 persisted catalog/editor scenarios plus 6/6 authorization, isolation, recovery, conflict, responsive and accessibility hardening checks |
| 3 — Notification configuration | Control center, delivery configuration, templates and events | **Complete:** 6/6 implementation scenarios plus 6/6 persistence, secret-boundary, dependency, isolation, recovery, duplicate-submit and compact-height hardening checks |
| 4 — Queue and diagnostics | HR delivery queue, review, retry/bulk retry and diagnostics | **Complete:** 7/7 URL-state, review continuity, retry evidence, recovery, isolation, responsive and accessibility scenarios plus 8/8 focused backend regressions |
| 5 — ESS and MSS inboxes | Employee and manager notification consumers | Responsive inbox/detail behavior, read state, authorized links, role isolation and parity with HR delivery evidence |
| 6 — Joined closure | Configuration → event → notification → delivery/retry → ESS/MSS plus affected domains | Three-engine joined workflows, tenant/role isolation, accessibility sample, static/build gates and zero-residue teardown |

Each phase remains independently reviewable. Presentation changes alone do not close phases with persisted actions.

## Shared screen contract

Each screen uses one visible H1, concise task guidance, correctly scoped metrics, committed filters, a named data region, one primary action and contextual secondary actions. Dense control centers must route operators to a task without repeating the same navigation in several competing blocks.

Catalogs use stable row identity, backend-supported filters and deliberate empty/no-match/unavailable states. Tables use labelled internal scrolling at narrow widths. Mobile cards are acceptable only when content and action parity remain intact.

Forms group identity, applicability/routing, content/steps, effectivity, delivery policy and evidence. They require visible labels, required indicators, field and summary errors, first-error focus, retained values, a pending duplicate guard and a safe dirty-close decision. JSON inputs need syntax feedback and readable examples without placing implementation notes in the normal product flow.

## Phase 2 — workflow configuration

The workflow control page must distinguish reusable definitions, active assignments and runtime traces. Metrics declare whether they represent a complete collection or the current page. Trace filters commit to the URL and restore through reload and browser history.

Template editing preserves step order, actor/approver rules and escalation timing. Assignment editing makes template, organization scope, effectivity and precedence visible. Required tests cover create/edit, invalid steps, overlap/conflict, stale records, denied writes, foreign IDs, aborted/5xx/malformed responses, dirty close, duplicate submit and persisted return scope.

## Phase 3 — notification configuration

The control center prioritizes delivery failures, disabled/misconfigured channels, inactive/unlinked templates and untested active events. Delivery configuration separates channel enablement, provider identity, credentials, operational policy and health evidence. Secrets stay masked.

Template and event editors distinguish save, preview, test-send and activation. Preview never implies persistence; test-send never implies provider delivery unless the resulting notification and attempts confirm it. Tests cover variable validation, invalid JSON, channel requirements, recipient/test-data validation, inactive dependencies, duplicate codes, failure retention and audit evidence.

## Phase 4 — queue and diagnostics

The queue commits all supported search/status/channel/priority/subject/retry/page scope to the URL. Apply/Enter, Clear, pagination, page size, copied URLs and Back/Forward remain consistent. Selection survives only while authorized and addressable; stale/off-page/foreign IDs fail deliberately.

Review presents recipient, subject, channel, provider attempts, timestamps, failure reason, retry eligibility and audit evidence in reading order. Retry and bulk retry disclose selected count and skipped/capped results, prevent duplicate submission and never announce unconfirmed success. Diagnostics links preserve supported queue scope and separate catalog hygiene from live delivery incidents.

## Phase 5 — ESS and MSS

Accepted 26 October 2026. See [Phase 5 ESS/MSS inbox evidence and contract](hrms-workflow-notification-phase5-ess-mss.md).

Employee and manager inboxes share interaction patterns while retaining different authorization projections. Committed filters, paging, unread counts, priority and subject labels must use clearly declared populations. Detail dialogs trap and restore focus, support Escape/close, retain the inbox scope and mark read only according to the existing API contract.

Action links are restricted to supported local destinations and checked for authorization. Tests cover unread/read transitions, no-match, empty, loading and unavailable states, direct foreign IDs, manager/employee cross-access, stale action targets, abort/5xx/malformed updates and 320-pixel short-height dialogs.

## Phase 6 — joined certification

Accepted 26 October 2026. See [Phase 6 joined certification](hrms-workflow-notification-phase6-joined-certification.md).

Owned synthetic workflows prove template creation, scoped assignment, a domain-generated trace, event/template rendering, notification creation, processing or controlled failure, retry evidence and authorized ESS/MSS consumption. Negative cases include wrong role, foreign tenant, inactive template/event, disabled channel, invalid recipient, capped retry, repeated request, unsafe action URL and unknown transport outcome.

Run Chromium, Firefox and WebKit with retries disabled. Verify desktop/tablet/mobile, keyboard/focus, selected WCAG 2 A/AA and 2.1 AA axe scans, TypeScript, focused ESLint, Django checks, migrations and production build. Evidence records exact commands, machine-readable results, screenshots, inspected findings and verified cleanup.

## Closure boundary

This makeover may certify the recorded local source/build, the owned workflows and selected adapters. It does not certify every customer approval policy, external provider availability, real email/SMS/push/WhatsApp delivery, production credentials, high-volume performance, physical devices, native zoom, screen readers, formal WCAG conformance, staging deployment or production release.
