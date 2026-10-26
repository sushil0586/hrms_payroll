# Tenant Admin UI/UX makeover inventory

Prepared: 26 October 2026. Status: Phases 1–6 accepted; the twelve-route Tenant Admin family is closed within the recorded scope.

## Reconciled boundary

Tenant Admin contains twelve current routes under one Accerio workspace shell. The original inventory found that three later governance routes—Financial Years, Leave Years and Data Governance—were absent from the older nine-route final gate. Phases 1–6 now include those routes in the same current-build presentation, lifecycle and authorization evidence as the rest of the family.

The completed makeover recertified all twelve routes on one production build, corrected family-wide dashboard and navigation inconsistencies, and gave the three later routes the same task hierarchy, compact density, table, form, feedback and responsive treatment used elsewhere. Existing APIs, permission keys, tenant isolation, financial transitions, leave-year lifecycle rules and maker/checker controls remain authoritative.

## Route inventory

| ID | Route | Primary task | Existing strength | Makeover focus |
| --- | --- | --- | --- | --- |
| `TADM-001` | `/tenant-admin` | Account control center | **Phase 6 accepted:** shared four-cell account summary, retained action queue/readiness/workspace routing, exact navigation state and responsive parity | Family closed |
| `TADM-002` | `/tenant-admin/users` | Tenant membership | **Phase 2 accepted:** compact access summary, focused task guidance, responsive member cards, confirmed local update plus authoritative refresh, uncertain-write preservation and role-limited denial | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-003` | `/tenant-admin/roles` | Role and permission design | **Phase 2 accepted:** compact summary, responsive catalog/permission stacking, focusable permission overview, protected-state/risk clarity, local mutation reconciliation and compact responses | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-004` | `/tenant-admin/plan` | Subscription and change requests | **Phase 3 accepted:** compact commercial summary, read-only entitlement explanation, persisted and uncertain request behavior, immediate queue update, compact responses and view-only denial | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-005` | `/tenant-admin/setup` | Tenant launch guide | **Phase 3 accepted:** dependency-first primary action, compact progress/next-step summary, retained owner/evidence/outcome context and responsive continuity | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-006` | `/tenant-admin/settings` | Tenant configuration | **Phase 3 accepted:** current/published distinction, draft exclusion, governed account-change handoff and reload-stable URL prefill | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-007` | `/tenant-admin/financial-calendars` | Fiscal calendar and posting periods | **Phase 4 accepted:** compact posting summary, ordered form hierarchy, responsive registers, guarded audited close/reopen, persistent audit counts and ambiguous-response preservation | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-008` | `/tenant-admin/leave-year` | Leave-period lifecycle and year close | **Phase 4 accepted:** compact governance summary plus shared preview, confirmation, job, history and authorization regression without calculation changes | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-009` | `/tenant-admin/security-readiness` | Security posture | **Phase 5 accepted:** compact posture summary, semantic domain status and configured remediation links with retained published evidence authority | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-010` | `/tenant-admin/support-access` | Scoped support grants | **Phase 5 accepted:** compact grant posture, scoped and time-bound lifecycle, decision-note gates, immediate reconciliation, compact responses and uncertain-write preservation | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-011` | `/tenant-admin/trust-audit` | Audit evidence review/export | **Phase 5 accepted:** compact evidence summary, reload-stable URL filters, pagination, empty states, support-session linkage and checksum export | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |
| `TADM-012` | `/tenant-admin/data-governance` | Retention, holds and governed requests | **Phase 5 accepted:** compact governance posture, read-only impact, explicit maker/checker ownership, semantic tables, stable idempotency and confirmed/unconfirmed feedback | **Phase 6 rechecked:** current summary, navigation, responsive, accessibility and joined-workflow contract accepted |

## Phase 6 closure status

All twelve routes were rechecked on one current production build in Chromium, Firefox and WebKit. The final matrix includes desktop/mobile captures, a route-level selected axe scan in every engine, exact database-backed navigation vocabulary, one active desktop destination, joined Settings-to-Plan and Support-to-Audit flows, keyboard dialog restoration and employee route/API denial. The planned Tenant Admin family is complete within the limits recorded below.

## Shared interaction contract

Every page has one visible H1, a concise task description, one current navigation item on desktop, and no page-level horizontal overflow at 320px. Summary information uses the compact strip only when it helps the next decision. Catalogs and ledgers use semantic tables inside named keyboard-scrollable regions. Forms group related fields, show required and invalid states inline, preserve entered values after validation failure and keep the primary action visible at short heights.

Filters that change the represented dataset commit to the URL or expose a deliberate documented local-search contract. Reload, copied links and browser history must restore committed state. Empty population, no match, no permission, unavailable service and failed mutation remain distinct.

Dialogs use the shared modal shell, move focus to the first useful control, contain keyboard focus, close with Escape when safe and restore focus to the opener. Pending state blocks duplicate submission synchronously. Success is shown only after backend confirmation; a confirmed write followed by refresh failure and an ambiguous transport failure receive different guidance.

## Permission and integrity boundaries

- Workspace entry requires Tenant Admin access; each page also enforces its existing permission keys server-side.
- Hidden navigation does not grant or replace route/API authorization.
- Membership and role changes preserve entitlement checks and the last-active-admin guard.
- Financial-period close/reopen and Leave Year transitions preserve current versioning, audit reasons and backend eligibility.
- Support grants retain separate request/approval authority and scoped duration/access.
- Trust exports and data-governance requests remain tenant-scoped; maker/checker and retained-audit rules are unchanged.
- Employee, manager, HR-only, platform-only and unauthenticated personas must not receive Tenant Admin page or API data.

## Existing evidence to reuse

The phase-specific `tenant-admin-*` suites cover users/roles dialogs, plan/setup/settings, financial and Leave Year transitions, support access, trust filters/export, security posture, data governance, role isolation and recovery. The Phase 6 suite adds the final twelve-route matrix and joined cross-page journeys. DB3A, DB4B and DB6 remain domain regression inputs for Leave Year, data governance and financial calendars.

## Scope exclusions

- No billing engine, identity provider, support-session engine, retention policy or audit schema redesign.
- No change to finance, leave, payroll or statutory calculations.
- No production deployment, customer data, external provider, physical-device, native-zoom, screen-reader or formal WCAG claim.
- Platform Admin remains a separate makeover family.
