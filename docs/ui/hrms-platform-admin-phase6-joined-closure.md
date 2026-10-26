# Platform Admin Phase 6: joined family closure

Accepted: 26 October 2026. Scope: all ten `/platform-admin` routes and the connected public-lead, tenant launch, admin access, setup-template, audit and data-governance lifecycle. Evidence: [`platform-admin-makeover-phase6-2026-10-26`](../qa/evidence/platform-admin-makeover-phase6-2026-10-26/).

## Outcome

The Platform Admin family is accepted on one immutable production build. Dashboard, Leads, Tenants, Launch Blueprint, Launch Readiness, Admin Access, Setup Templates, Permission Catalog, Audit Logs and Data Governance expose the same compact Accerio hierarchy, ten-item navigation, current-route state, tenant context and responsive behavior.

Committed audit scope now retains `tenantId`, search and event type across reload even when the requested historical type has aged out of the recent-event window. The resulting zero-match view remains explicit instead of silently resetting to all events. Governance tenant chips received the contrast correction found by the closure scan.

## Joined persisted journey

Each browser engine created its own records and completed the same lifecycle:

1. Submit a public Enterprise lead, qualify it and convert it to an isolated sandbox tenant.
2. Complete all required launch inputs, preview the current blueprint and apply its safe configuration.
3. Provision the first active Tenant Admin login without exposing credentials in URLs or audit output.
4. Create a material Leave setup template, publish it, preview tenant impact and adopt it as baseline evidence.
5. Confirm baseline, complete handoff and activate the tenant in the required order.
6. Review tenant activation and first-admin evidence in Audit Logs, including the redacted evidence dialog.
7. Use the new Tenant Admin identity to submit a governed export request.
8. Return as Platform Admin, create the approved retention rule, independently approve and dispatch the request, and wait for the Celery job to finish successfully.
9. Reopen Data Governance and verify the succeeded request in the selected tenant register.

The flow uses Enterprise because governed export permissions are plan-gated. Launch inputs are filled from the rendered required schema, keeping the test valid as the blueprint adds governed requirements.

## Family contracts

- Database and fallback navigation expose the same ten destinations, with exactly one current item per route.
- Launch, readiness, admin, template, audit and governance routes preserve the selected tenant.
- Permission Catalog restores its valid search, assignability, risk and module scope after reload.
- Audit Logs preserves a committed event type even when the current recent-event page has no matching row.
- Responsive pages retain one H1, readable decision summaries, reachable actions and no document-level horizontal overflow.
- Employees cannot open any Platform route or read representative Platform APIs.
- Tenant governance remains maker/checker controlled: the Tenant Admin requests, the Platform operator approves and dispatches, and the worker records completion.

## Responsive and accessibility result

All ten routes were captured at 1440px and 390px in Chromium, Firefox and WebKit, producing 60 full-page screenshots. Thirty selected WCAG 2 A/AA and 2.1 AA axe reports contain zero violations. Manual review covered the mobile Data Governance composition and desktop Audit Logs composition, including navigation, summary hierarchy, filter controls, named tables, empty states and long-form stacking.

The first closure run found two issues that were corrected before acceptance: committed audit event types could visually reset when absent from the ten-event window, and inactive governance tenant chips measured 4.39:1 contrast. The final matrix ran only after the corrected production build was created.

## Acceptance evidence

| Gate | Result |
| --- | --- |
| Browser scenarios | 12/12 passed, four per engine, retries disabled |
| Route matrix | Ten routes on one production build in Chromium, Firefox and WebKit |
| Joined lifecycle | Three independent Lead → Tenant → Launch → Admin → Template → Activation → Audit → Governance journeys passed |
| Responsive captures | 60: ten routes at 1440px and 390px in three engines |
| Selected axe scans | 30/30 reports with zero violations |
| Authorization | All ten employee route denials and five representative Platform API denials passed in every engine |
| Backend regression | 38/38 focused onboarding, launch, authorization, retention and governance tests passed on disposable PostgreSQL |
| Engineering gates | TypeScript, focused ESLint, production build, Django system check, migration drift and diff checks passed |
| Visual review | Mobile Governance and desktop Audit Logs reviewed; hierarchy, stacking, controls and empty states accepted |
| Cleanup | Owned Django, Next.js and Celery processes stopped; the disposable PostgreSQL and Redis containers were removed; ports 3300, 8002, 55511 and 6382 were verified closed |

## Closure and handoff

All six Platform Admin makeover phases are accepted. The next bounded family is Finance Manager: reconcile its one payroll-handoff route, preserve finance authority and payroll-close boundaries, apply the shared compact shell/content contract, and certify its real populated, empty, denied, responsive and accessibility states.
