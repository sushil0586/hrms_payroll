# Tenant Admin UI/UX makeover plan

Prepared: 26 October 2026. Status: Phases 1–6 accepted; the planned Tenant Admin makeover is complete. Scope: [Tenant Admin makeover inventory](hrms-tenant-admin-makeover-inventory.md). Baseline: [Phase 1 rendered evidence](hrms-tenant-admin-phase1-rendered-baseline.md). Closure: [Phase 6 joined family acceptance](hrms-tenant-admin-phase6-joined-closure.md).

## Purpose

Bring all twelve Tenant Admin routes under the same Accerio UI/UX contract used by the completed Leave, Attendance, Employees, Documents, Payroll, Workflow/Notifications and MSS families. Preserve backend-owned permissions and lifecycle rules while making every task compact, responsive, keyboard usable and explicit about state and outcomes.

Use the [shared UI/UX standard](hrms-ui-ux-standard.md), [screen adoption checklist](hrms-ui-ux-screen-adoption-checklist.md), [validation and action feedback standard](hrms-frontend-validation-feedback-standard.md) and [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md).

## Phases and exit gates

| Phase | Scope | Exit gate |
| --- | --- | --- |
| 1 — Reconciliation and rendered baseline | Twelve routes, shell, responsive layouts, selected dialogs, permission denial and historical test mapping | **Complete:** 9/9 three-engine scenarios, 90 captures, nine zero-violation axe reports, Data Governance navigation and form-label contrast corrected, backend menu regression and zero-residue cleanup |
| 2 — Users and roles | Membership directory, invitation/access changes, role catalog and permission editor | **Complete:** compact task hierarchy, responsive role stacking, persisted role/member mutations, compact response contract, uncertain-write recovery, role-limited UI/API denial, 12/12 three-engine scenarios, six zero-violation axe reports and 10 focused backend regressions |
| 3 — Setup, settings and plan | Launch dependencies, tenant configuration, commercial profile and change requests | **Complete:** dependency-first next action, compact decision summaries, published/current and entitlement explanations, reload-stable request handoff, compact mutations, persisted/uncertain request behavior, view-only denial, 12/12 three-engine scenarios and nine zero-violation axe reports |
| 4 — Financial and leave calendars | Financial calendars/years/periods plus Leave Year regression | **Complete:** compact form/register parity, ordered fiscal setup, guarded audited close/reopen, version/overlap conflict regression, ambiguous-response preservation, Leave Year preview and authorization regression, 12/12 three-engine scenarios and six zero-violation axe reports |
| 5 — Security, support, trust and data governance | Readiness, support grants, audit evidence/export, retention/holds/data requests | **Complete:** compact actionable posture, governed Support lifecycle and responses, reload-stable audit scope and checksum export, maker/checker data requests, uncertain-write preservation, employee denial, 12/12 three-engine scenarios and twelve zero-violation axe reports |
| 6 — Dashboard and joined closure | Account control center, navigation and cross-page journeys | **Complete:** dashboard compact-summary parity, synchronized navigation vocabulary, twelve-route matrix, joined Settings→Plan and Support→Audit journeys, keyboard/role boundaries, 12/12 three-engine scenarios, 72 captures, 36 zero-violation axe reports, 68 backend regressions and zero-residue teardown |

## Phase 1 baseline matrix

The accepted baseline distinguishes historical coverage from new current-build evidence. It also corrected two bounded shared defects discovered by the gate. See the [Phase 1 record](hrms-tenant-admin-phase1-rendered-baseline.md).

| Slice | Required states |
| --- | --- |
| Original nine routes | Authenticated desktop/mobile render, exact H1, active desktop navigation, useful page content, no application error and no document overflow |
| Financial Years | 1440, 768, 390 and 320 widths; create forms according to permission; calendar and period registers; empty/populated behavior; selected axe scan |
| Leave Years | 1440, 768, 390 and 320 widths; period/register/year-close/historical sections; accepted lifecycle controls; selected axe scan |
| Data Governance | 1440, 768, 390 and 320 widths; governed request, impact, request status, holds/policy sections; selected axe scan |
| Shared behavior | One H1, one current desktop nav item, accessible table regions, sign-out access, wrong-role denial, safe dialog open/Escape/focus restoration |

## Implementation rules

Prefer existing shared patterns over new Tenant-only abstractions. Keep native table semantics and internal scrolling for wide operational data. Use compact summary strips for decision signals, `WorkspaceStatusBadge` for status, standard filter bars for dataset scope, and `HrAdminActionModal` for task dialogs.

Do not infer capabilities from visible UI. The server permission and API response remain authoritative. Do not turn current local search into URL state unless the represented scope needs reload/share/history continuity. Do not claim a transition until its response is confirmed, and do not automatically replay an ambiguous mutation.

Leave Year is an accepted shared workbench. Phase 4 changes it only when the fresh Tenant Admin baseline reveals a shell, navigation, responsive or regression defect.

## Final acceptance

Run the final family on one production build with retries disabled in Chromium, Firefox and WebKit. Include desktop, tablet, mobile and 320px/short-height checks; keyboard navigation and dialog focus; selected WCAG 2 A/AA and 2.1 AA axe scans; TypeScript, focused ESLint, Django checks, migrations and focused backend authorization/lifecycle regressions.

Evidence records exact commands, machine-readable results, screenshots, inspected findings, source/build identity and guarded cleanup. Local automated results do not claim production release, native zoom, screen-reader or complete WCAG conformance.
