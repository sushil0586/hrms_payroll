# Platform Admin Phase 2: Dashboard, Leads and Tenants

Accepted: 26 October 2026. Scope: `/platform-admin`, `/platform-admin/leads`, `/platform-admin/tenants`, their lead and tenant mutations, and the connected Platform API integrity boundary. Evidence: [`platform-admin-makeover-phase2-2026-10-26`](../qa/evidence/platform-admin-makeover-phase2-2026-10-26/).

## Outcome

The first three Platform Admin workspaces now follow the compact Accerio hierarchy established by the accepted Leave, Attendance, MSS and Tenant Admin families. Each route has one page title, one four-cell decision summary and one primary task surface. The duplicate shared-console tab strip and repeated workflow guide no longer delay Dashboard, Leads or Tenants; the synchronized ten-item shell remains the route selector.

Dashboard replaces six metric cards with Open actions, Active tenants, Onboarding and Active leads. Its mission queue, tenant pipeline, risk signals, activation blockers and evidence links retain backend-derived counts and next actions. Leads exposes active, new, qualified and converted totals. Tenants exposes total, active, onboarding and sandbox totals.

## Filter contract

Lead search/status and tenant search/status/plan are immediate local narrowing controls over the already loaded registers. They deliberately do not represent shareable server scope. Both pages now explain that the controls reset on reload or navigation, reset pagination whenever scope changes, expose active-filter context and provide one reset action. Empty population and no-match language are distinct.

Phase 2 tests cover lead status values `active`, `all`, `new`, `reviewing`, `qualified`, `converted` and `closed` through seeded records, direct selection and lifecycle transitions. Tenant status and onboarding values remain available alongside Starter, Growth and Enterprise plan filters. The acceptance journey combines search, status and plan controls, verifies no-match behavior, resets the full state and confirms reload returns to the documented default.

## Mutation and integrity behavior

- Confirmed lead qualification refreshes to the authoritative record; conversion creates one tenant, one primary contact and conversion evidence, then opens Admin Access for that tenant.
- A converted lead cannot be converted again. Duplicate tenant codes and domains return controlled validation responses.
- Direct tenant creation and editing now reject domains owned by another tenant instead of surfacing a database conflict or moving that domain. Tests prove the rejected create leaves no partial tenant and the rejected edit preserves the original owner.
- Confirmed tenant creation opens the new onboarding workspace. Tenant updates persist suspension and reactivation through authoritative API reads.
- Interrupted create, conversion and update responses make no success claim. The UI tells the operator to check the relevant register before retrying and retains entered form values. The browser suite aborts a tenant-create response and verifies the open dialog and values before a deliberate retry.
- Employee credentials cannot read Platform summary, lead or tenant APIs.

## Responsive and accessibility result

Dashboard, Leads and Tenants were captured at 1440px and 390px in Chromium, Firefox and WebKit. All 18 captures avoid document-level horizontal overflow. The compact summary becomes a two-by-two block on small screens, registers remain readable and form controls retain useful labels.

The first current-build Chromium run found tenant metadata contrast at 4.47:1. The Platform-scoped metadata color was corrected and the immutable rerun produced nine selected WCAG 2 A/AA and 2.1 AA axe reports with zero violations. This scan does not establish complete WCAG conformance, native zoom or screen-reader certification.

## Acceptance evidence

| Gate | Result |
| --- | --- |
| Browser scenarios | 12/12 passed, four per engine, retries disabled |
| Responsive captures | 18: three routes at 1440px and 390px in three engines |
| Selected axe scans | 9/9 reports with zero violations |
| Lead lifecycle | New → Qualified → Converted; persisted tenant/contact evidence and duplicate conversion denial |
| Tenant lifecycle | Interrupted create preservation, confirmed create, suspend and reactivate |
| API integrity | Duplicate code/domain create denial and cross-tenant domain takeover denial |
| Authorization | Employee denial for representative Platform APIs |
| Backend regression | Full focused Platform onboarding API file passed on disposable PostgreSQL |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift and diff checks passed |
| Cleanup | Browser-owned workspaces removed; final database, port and container proof recorded in the evidence manifest |

## Phase 3 handoff

Phase 3 covers Launch Blueprint, Launch Readiness and Admin Access. It should remove their remaining duplicate tab/guide hierarchy, make the first unmet dependency the primary task, preserve tenant context, guard preview/apply/version transitions, and certify contact plus first-login provisioning without exposing credentials in URLs, logs or retained evidence.
