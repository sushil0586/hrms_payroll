# Tenant Admin Phase 3: Setup, Settings and Plan

Accepted: 26 October 2026. Scope: `/tenant-admin/setup`, `/tenant-admin/settings`, `/tenant-admin/plan`, the change-request client and its existing API mutations. Evidence: [`tenant-admin-makeover-phase3-2026-10-26`](../qa/evidence/tenant-admin-makeover-phase3-2026-10-26/).

## Outcome

Phase 3 aligns the three account-configuration workspaces with the compact Accerio hierarchy accepted for Tenant Admin users and roles. Each page now begins with a four-cell decision summary, keeps one clear primary path, explains which state is authoritative and retains the existing governed ownership boundaries.

The work preserves subscription, tenant configuration, permission and change-request lifecycle rules. Tenant Admin remains a requestor/reviewer surface; the UI does not directly edit platform-owned commercial or tenant identifiers.

## Setup guide

- The primary action now resolves to the first blocked setup area, then the first warning. When every area is ready, it routes to the final launch-readiness review.
- The compact summary reports ready, warning and blocked counts and names the next setup step without duplicating dashboard-sized metrics.
- Five ordered setup areas retain their owner, dependency, evidence, outcome, status and destination.
- Desktop and narrow layouts keep the dependency map, action and status readable without page-level horizontal overflow.

## Tenant settings

- The summary distinguishes tenant status, current plan, published configuration and governance posture.
- Published configuration is identified as the current operational state; draft records are explicitly excluded until publication completes.
- Platform-governed identifiers remain read-only. Users with change-request authority receive a prefilled Settings-to-Plan handoff; view-only users receive no mutation link.
- The handoff commits type, title, target and description to the URL, and reload restores those values.

## Plan and change requests

- Current plan, subscription, seat usage and recent requests use the same compact summary grammar as the other Tenant Admin workspaces.
- Subscription and entitlement data explains that it is read-only and names the governed request path.
- Confirmed create and transition responses update the request queue immediately and then reconcile with an authoritative server refresh.
- Transport interruption preserves the proposed values, makes no success claim and tells the user that the outcome is unconfirmed before any retry.
- Change-request create and update proxies request `?compact=1`. Direct API clients retain the original full-console response unless they opt into compact mode.
- The request queue retains backend statuses, decision-note requirements, paging and permission-controlled approve, reject, cancel and apply transitions.

## Accessibility correction

The first acceptance pass exposed low-contrast inherited text color on Setup step/status labels and a Settings warning badge. Scoped selectors now preserve the semantic ready, warning and blocked colors inside setup areas and console rows. The final nine axe reports contain zero WCAG 2 A/AA and 2.1 AA violations for the selected mobile page scans.

## Acceptance evidence

The final suite ran with retries disabled against one production Next.js build and a disposable PostgreSQL workspace:

| Gate | Result |
| --- | --- |
| Chromium | 4/4 passed |
| Firefox | 4/4 passed |
| WebKit | 4/4 passed |
| Responsive captures | 18: Setup, Settings and Plan at 1440px and 390px in all three engines |
| Selected axe scans | 9/9 reports with zero violations |
| Focused backend regressions | 4/4 passed for full/compact mutation responses, lifecycle audit, payload validation and employee denial |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift check and diff check passed |

The browser scenarios cover compact hierarchy, no page overflow, dependency-first setup routing, prefilled and reload-stable URL state, persisted create/cancel behavior, immediate queue reconciliation, uncertain-write input preservation, view-only explanations, hidden mutation entry points and denied mutation APIs.

The automated scans do not establish complete WCAG conformance, screen-reader usability, native zoom or physical-device behavior. Production deployment and customer data were outside this phase.

## Phase 4 handoff

Phase 4 covers Financial Calendars and the shared Leave Year regression. Apply the same compact summary and confirmed/unconfirmed feedback rules while preserving audited close/reopen, version conflicts, Leave Year preview/confirmation/jobs and all existing calculation boundaries.
