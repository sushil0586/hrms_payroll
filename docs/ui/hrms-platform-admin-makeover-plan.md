# Platform Admin UI/UX makeover plan

Prepared: 26 October 2026. Status: Phases 1–6 accepted; Platform Admin family closed. Scope: [Platform Admin makeover inventory](hrms-platform-admin-makeover-inventory.md). Latest acceptance: [Phase 6 joined family closure](hrms-platform-admin-phase6-joined-closure.md).

## Purpose

Bring all ten Platform Admin routes under the same compact Accerio UI/UX contract accepted for Leave, Attendance, Employees, Documents, Payroll, Workflow/Notifications, MSS and Tenant Admin. Preserve Platform-owned lifecycle and security rules while making operator decisions, tenant context, evidence and mutation outcomes easier to understand and verify.

Use the [shared UI/UX standard](hrms-ui-ux-standard.md), [screen adoption checklist](hrms-ui-ux-screen-adoption-checklist.md), [validation and action feedback standard](hrms-frontend-validation-feedback-standard.md) and [Tenant Admin joined closure](hrms-tenant-admin-phase6-joined-closure.md) as the closest family references.

## Phases and exit gates

| Phase | Scope | Required exit gate |
| --- | --- | --- |
| 1 — Reconciliation and rendered baseline | Ten routes, shell, database/fallback navigation, shared console panels, Permissions, Data Governance, dialogs and role denial | **Complete:** ten-route database/fallback parity, 9/9 three-engine scenarios, 120 responsive captures, 30 zero-violation axe reports, dialog focus/Escape restoration, employee route/API denial, 27 backend regressions and verified cleanup |
| 2 — Dashboard, Leads and Tenants | Operator dashboard, public lead queue, qualification/conversion, customer register and create/edit | **Complete:** four-cell summaries and task-first hierarchy; documented local filters; 12/12 three-engine scenarios; 18 responsive captures; nine zero-violation axe reports; confirmed/invalid/ambiguous mutation behavior; lead-to-tenant evidence; duplicate/domain protection and employee denial |
| 3 — Launch Blueprint, Launch Readiness and Admin Access | Blueprint selection/input, preview/apply/repair/upgrade, setup/handoff/activation gates, contacts and first login | **Complete:** four-cell summaries and first-unmet actions; 12/12 three-engine scenarios; 18 responsive captures; nine zero-violation axe reports; stale-plan rejection, safe-apply/handoff/drift evidence; guarded repair/upgrade/activation; credential handling, uncertain outcomes, isolation and employee denial |
| 4 — Setup Templates and Permission Catalog | Template/item authoring, publishing, cloning, comparison, adoption/upgrade and permission metadata | **Complete:** four-cell summaries and next actions; published locks and dependency validation; URL-stable search/assignability/risk/module scope; immutable keys; confirmed persistence; portalled responsive dialog; 12/12 three-engine scenarios; 12 captures; six zero-violation axe reports; 15 backend regressions; tenant isolation, denial and zero-residue cleanup |
| 5 — Audit Logs and Data Governance | Tenant-scoped evidence, redacted payload review, retention policies, legal holds and governed request decisions | **Complete:** four-cell summaries and next actions; URL-restored tenant/search/type scope; invalid-tenant normalization; pagination and empty/no-match states; recursive redaction proof; policy evidence; same-actor hold-release denial; maker/checker request flow; disabled erasure; 12/12 three-engine scenarios; 12 captures; six zero-violation axe reports; 10 backend regressions and zero-residue cleanup |
| 6 — Joined family closure | Dashboard/navigation and Lead→Tenant→Launch→Admin→Template→Audit/Governance journeys | **Complete:** all ten routes on one immutable build; 12/12 three-engine scenarios; three joined persisted journeys; 60 responsive captures; 30 zero-violation axe reports; 38 backend regressions; authorization, documentation and disposable-environment teardown accepted |

## Phase 1 execution matrix

Phase 1 establishes current truth before page-level redesign. It should reuse the repository’s isolated QA workspace command and a disposable PostgreSQL database. Browser retries stay disabled.

| Slice | Checks |
| --- | --- |
| Route contract | Exact H1, useful primary content, no application error, no document overflow and exactly one current desktop nav item for all ten routes |
| Shell | Product/role/identity, truthful “Search pages and actions”, mobile menu, active ancestry, sign out and keyboard access |
| Database navigation | Ten synchronized sidebar entries with the same labels/order as the fallback, including Data Governance |
| Tenant context | `tenantId` preservation across Launch, Readiness, Admin Access, Templates, Audit and Data Governance; invalid/missing tenant handling |
| Responsive | 1440, 1024, 768, 390 and 320 widths; short-height inspection for long forms and dialogs |
| Dialogs | Create tenant and admin contact open/focus/trap/Escape/restore behavior; validation and pending state |
| Accessibility | Selected WCAG 2 A/AA and 2.1 AA axe scans on every distinct composition; manual heading, label, keyboard and status review |
| Security | Unauthenticated redirect; HR/Tenant/manager/employee route denial; representative Platform API denial with no protected response data |

Phase 1 may correct bounded shared defects needed to make the baseline truthful, such as a missing navigation entry, invalid label association or focus failure. Workflow redesign belongs in the owning later phase.

## Shared implementation rules

Each route has one H1 and a concise task description. Use a four-cell compact summary when it helps the next decision; avoid six-card metric walls. Keep one primary operational surface before secondary guidance. Status language must reflect backend state and use the shared semantic badge system.

Filters representing a committed dataset scope must be encoded in the URL and restored on reload/history. Immediate local narrowing can remain client state when documented. Reset must clear the represented scope, pagination must stay within valid bounds and empty population must remain distinct from no-match results.

Forms show requirements before submission, focus the first invalid field, preserve input after failure and disable duplicate actions synchronously. Dialogs move focus to the first useful control, contain focus, close with Escape when safe and restore focus to their opener.

Confirmed success, confirmed rejection, refresh failure and ambiguous transport outcome are separate states. No launch, tenant, template, permission or governance mutation is replayed automatically after an unconfirmed response.

## Phase-specific test design

Phase 2 should test dashboard count/action truth, lead search/status variants, close/qualify/convert, duplicate conversion, tenant create/edit/suspend/reactivate, URL/back-forward behavior and cross-tenant evidence.

Phase 3 should test required launch inputs, Starter/Growth/Enterprise plan differences, preview freshness, safe apply, drift, repair, upgrade, certification, handoff, repeat protection, activation blockers, contact CRUD, login provisioning and credential receipt handling.

Phase 4 should test multi-item templates, dependency ordering, invalid JSON/payloads, draft-only changes, publish locks, clone/version comparison, tenant adoption/upgrade isolation, permission search/filter combinations, protected keys, edit persistence and catalog fallback/database parity.

Phase 5 tests audit tenant/event filters, pagination, redacted evidence, missing/no-match states, policy and legal-hold lifecycle, governed request approval/dispatch restrictions, maker/checker separation and disabled erasure. The current API exposes approve and dispatch actions; it does not define a reject transition.

Phase 6 exercised one joined journey per browser engine without depending on another engine's records. Each engine created uniquely scoped tenants, users, templates and governance evidence. Because retained governance rows protect their maker/checker users by design, the owned PostgreSQL database is the teardown boundary; removing that disposable container eliminates the complete joined graph without weakening production retention rules. The evidence manifest records build ID, commands, results, screenshots, axe counts, backend results, container removal and closed ports.

## Engineering and acceptance gates

Each phase runs focused TypeScript and ESLint checks, relevant backend tests and the phase browser suite. Final closure additionally runs a production Next.js build, Django system check, migration drift check and diff check.

Automated acceptance does not claim production readiness, complete WCAG conformance, native zoom, screen-reader usability or live customer/provider behavior. Any policy limitation found during the makeover is documented as a separate product decision rather than silently changed through UI work.

## Handoff after Platform Admin

After Phase 6, move to Finance Manager as a one-route payroll-handoff family, followed by Support/domain snapshot and then public authentication/access surfaces. The cross-workspace tracker should be refreshed after these bounded closures so its historical discovery labels do not appear to supersede newer family evidence.
