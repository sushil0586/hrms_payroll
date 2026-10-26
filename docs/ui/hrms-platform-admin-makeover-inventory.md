# Platform Admin UI/UX makeover inventory

Prepared: 26 October 2026. Status: Phases 1–6 accepted; Platform Admin family closed. Scope: all ten `/platform-admin` routes, their shared console, operator mutations, database-backed navigation and connected Platform APIs.

## Reconciled boundary

Platform Admin is a ten-route operator workspace. Eight routes are views of the shared `PlatformAdminConsole`; Launch Blueprint additionally composes `PlatformLaunchWorkspace`. Permission Catalog and Data Governance are separate page compositions. The shell already opts into Accerio appearance, and extensive September certification exists for individual workflows. That historical evidence is valuable regression input, but it does not establish current shared density, three-engine behavior or joined family acceptance after subsequent shell, modal, governance and backend changes.

The makeover covers presentation, interaction clarity, state restoration, confirmed and uncertain mutation feedback, responsive behavior, keyboard operation, operator authorization, tenant isolation and joined workflow evidence. Existing tenant lifecycle rules, launch blueprints, safe seeders, permission authority, retention policy, legal holds, maker/checker requirements and audit records remain backend owned.

## Route inventory

| ID | Route | Current H1 | Primary operator task | Source owner | Planned phase |
| --- | --- | --- | --- | --- | --- |
| `PADM-001` | `/platform-admin` | Platform Admin Dashboard | Prioritize leads, tenant blockers and evidence | Shared console, `control` panel | 2 and 6 |
| `PADM-002` | `/platform-admin/leads` | Leads | Review, qualify, close or convert public leads | Shared console, `leads` panel | 2 |
| `PADM-003` | `/platform-admin/tenants` | Tenants | Search, select, create and update tenant records | Shared console, `tenants` panel | 2 |
| `PADM-004` | `/platform-admin/launch` | Launch Blueprint | Select, preview, safely apply, repair or upgrade a launch blueprint | Shared console plus launch workspace | 3 |
| `PADM-005` | `/platform-admin/onboarding` | Launch Readiness | Confirm setup, handoff and activation gates | Shared console, `onboarding` panel | 3 |
| `PADM-006` | `/platform-admin/admins` | Admin Access | Maintain admin contacts and provision the first customer login | Shared console, `admins` panel | 3 |
| `PADM-007` | `/platform-admin/policy-packs` | Setup Templates | Author, publish, clone, compare and adopt controlled templates | Shared console, `policy-packs` panel | 4 |
| `PADM-008` | `/platform-admin/permissions` | Permission Catalog | Search and maintain platform-owned permission metadata | Dedicated permission page/actions | 4 |
| `PADM-009` | `/platform-admin/audit-logs` | Audit Logs | Review tenant-scoped onboarding evidence and redacted payloads | Shared console, `events` panel | 5 |
| `PADM-010` | `/platform-admin/data-governance` | Retention and controlled erasure | Manage policies and holds; independently decide governed requests | Shared governance workbench in Platform mode | 5 |

Phase 2 completed the Dashboard, Leads and Tenants rows. These routes now use four-cell summaries and omit the shared-console tab strip and repeated panel guide. Lead and tenant filters are explicitly local controls over loaded records, reset on reload/navigation and preserve distinct empty/no-match states. The accepted journey covers qualification, conversion, duplicate denial, tenant create/suspend/reactivate, interrupted-response preservation, domain ownership and non-platform denial. See [Phase 2 acceptance](hrms-platform-admin-phase2-dashboard-leads-tenants.md).

Phase 3 completed Launch Blueprint, Launch Readiness and Admin Access. These routes now use four-cell summaries, omit the duplicate console tab/guide hierarchy and promote the first unmet dependency. Current-session preview freshness, plan drift rejection, safe apply, handoff, drift, guarded repair/upgrade/activation, contact provisioning, one-time credential receipt, ambiguous-response preservation, tenant isolation and employee denial are certified on one disposable PostgreSQL-backed production build. See [Phase 3 acceptance](hrms-platform-admin-phase3-launch-readiness-admin-access.md).

Phase 4 completed Setup Templates and Permission Catalog. These routes now use four-cell summaries and explicit next actions; Setup Templates omits the duplicate console tab/guide hierarchy. Draft-only item changes, dependency validation, publish locks, version cloning, adoption/upgrade isolation and ambiguous-response guidance are certified. Permission search, assignability, risk and module are a committed URL scope; keys remain immutable, confirmed metadata reloads authoritatively, and the edit dialog is portalled with a reachable fixed footer. See [Phase 4 acceptance](hrms-platform-admin-phase4-setup-templates-permissions.md).

Phase 5 completed Audit Logs and Data Governance. Audit tenant, search and event type now form a committed URL scope with bounded pagination, invalid-tenant normalization, distinct empty/no-match states and recursively redacted evidence review. Governance now exposes compact policy/hold/request/eligibility summaries, a clear next action, selected-tenant form defaults, responsive impact and policy registers, confirmed and uncertain mutation behavior, legal-hold independence, maker/checker approval and the disabled-erasure boundary. See [Phase 5 acceptance](hrms-platform-admin-phase5-audit-data-governance.md).

Phase 6 closed the ten-route family on one immutable production build. Three independent browser-engine journeys persisted an Enterprise public lead through conversion, safe launch setup, first-admin access, material template adoption, activation, audit evidence and a Tenant-maker/Platform-checker export request completed by Celery. The final matrix also certifies ten-item navigation/current-route parity, committed Audit and Permission scopes, all-route employee denial, 60 responsive captures, 30 zero-violation axe reports and 38 focused backend regressions. See [Phase 6 acceptance](hrms-platform-admin-phase6-joined-closure.md).

## Current composition and state contracts

The eight shared-console routes render one large client component with route-selected panels. The selected tenant is represented by `tenantId` in the URL for launch, onboarding, admin, template and audit work. Leads, tenants and setup templates retain documented immediate client-side narrowing with eight-row pagination. Audit evidence uses committed `tenantId`, `q` and `eventType` URL state and restores it on reload and copied links.

Permission Catalog uses committed GET parameters: `q`, `assignable`, `risk` and `module`. Data Governance uses `tenantId` to select the governed tenant. Phase 4 and Phase 5 certify reload persistence and invalid-scope handling for these contracts.

The shared console contains tenant creation, tenant editing, lead status/conversion, contact creation/editing, login provisioning, onboarding metadata, template authoring, adoption and launch/readiness transitions. `PlatformLaunchWorkspace` owns preview, apply, drift, certification, repair, upgrade and handoff operations. The governance workbench owns policy, hold and request decisions. Permission metadata edits are owned by `PermissionCatalogActions`.

## Navigation finding

The source audit found that the layout fallback defined all ten routes while the code-backed database menu catalog omitted `/platform-admin/data-governance`. Phase 1 corrected the omission, added explicit label normalization and accepted a backend regression for the complete ordered catalog. Database and fallback navigation now expose the same ten destinations.

Navigation vocabulary otherwise agrees on Dashboard, Leads, Tenants, Launch Blueprint, Launch Readiness, Admin Access, Setup Templates, Permissions and Audit Logs. The final family gate must assert one current desktop item for every route and one agreed label in both sources.

## Authorization and integrity boundaries

- The workspace layout requires Platform Admin access. Platform APIs use the binary `IsPlatformStaff` boundary.
- Platform Admin currently has full operator access; the product does not expose a delegated read-only Platform Admin role. Fine-grained operator-role design is outside this makeover.
- Permission Catalog navigation declares `platform.permission_catalog.manage`, while its API is restricted through Platform Staff. Phase 4 must certify the implemented contract without inventing a second authority model.
- Public lead creation remains unauthenticated; lead review, conversion and all tenant operations remain Platform-only.
- Tenant selection must scope onboarding, contacts, templates, launch runs, certification and audit evidence to the selected tenant.
- Launch preview must precede safe apply when required. Subscription, blueprint or preview drift invalidates stale apply evidence.
- Safe launch seeders create only their documented configuration. They must not create payroll runs, live provider credentials, deliveries or submissions.
- Activation remains blocked until setup, primary admin access and handoff dependencies are satisfied.
- Published template locks, clone/version rules and adoption isolation remain authoritative.
- Permission keys remain immutable identifiers; only supported metadata can be edited.
- Governance keeps approved-policy, legal-hold, maker/checker and deployment-disabled erasure restrictions.
- Audit payload rendering continues to redact credentials, tokens, cookies and session-like values.
- HR, Tenant Admin, manager, employee and unauthenticated users must not receive Platform route or API data.

## State and feedback matrix

Every phase must cover populated, empty, no-match, invalid-input, unavailable-service and denied states where applicable. Mutations must prevent duplicate submission immediately, retain useful input after validation failure and distinguish these outcomes:

| Outcome | Required UI behavior |
| --- | --- |
| Confirmed success | Update the affected record immediately or reconcile through an authoritative refresh; show a specific receipt |
| Confirmed validation or lifecycle rejection | Keep the entered values, identify the failing field or gate and provide the next corrective action |
| Confirmed write followed by refresh failure | State that the change was saved and that the displayed register may be stale |
| Interrupted or ambiguous response | Preserve input, make no success claim, avoid automatic replay and direct the operator to the relevant register/evidence |
| Authorization denial | Reveal no protected data and keep route and API behavior consistent |

Generated first-login credentials require separate treatment: show them only after confirmed provisioning, never place them in logs or URLs, and preserve existing secure-sharing guidance.

## Existing evidence to reuse

The repository already includes focused browser suites for dashboard behavior, leads, tenant CRUD/state transitions, launch blueprint, launch readiness, admin access, setup-template lifecycle/deep regression, permission catalog, audit evidence, tenant isolation, validation, negative security, route/tab pagination, visual accessibility and the joined public-lead-to-active-tenant journey. Backend coverage in `tenant_onboarding` exercises blueprint preview/apply, drift, repair, upgrade, certification and handoff rules. DB4B covers shared governance integrity.

These are regression inputs. Most Platform browser records predate the current makeover sequence, use route-specific fixtures and do not provide one immutable current-build three-engine family matrix. Phase 1 will inventory what still passes, what needs fixture migration and what must be replaced by isolated disposable-workspace evidence.

## Makeover constraints

- Prefer existing shared `PageIntro`, compact summary, status, table, pagination, filter, modal and feedback patterns.
- Do not split backend-owned workflows merely for visual symmetry.
- Do not change launch, payroll, provider, policy, permission, retention or activation semantics as presentation work.
- Do not turn a local search into URL state unless reload/share/history continuity is part of the task contract.
- Keep semantic tables where the data is tabular and provide named keyboard-scrollable regions for wide registers.
- Keep destructive and lifecycle-changing actions behind explicit context and confirmation.
- No production deployment, customer data, live provider operation, native-zoom, screen-reader or formal WCAG claim is included.
