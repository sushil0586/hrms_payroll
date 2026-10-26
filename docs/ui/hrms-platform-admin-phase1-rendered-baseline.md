# Platform Admin Phase 1: rendered baseline

Accepted: 26 October 2026. Scope: all ten Platform Admin routes, synchronized navigation, representative dialog behavior and non-platform denial. Evidence: [`platform-admin-makeover-phase1-2026-10-26`](../qa/evidence/platform-admin-makeover-phase1-2026-10-26/).

## Outcome

Phase 1 establishes a fresh current-build baseline for the complete Platform Admin family. All ten routes render through the Accerio shell at the target widths, expose their exact H1, keep one current desktop navigation destination and avoid document-level horizontal overflow. The database-backed menu now includes Data Governance and matches the fallback ten-route catalog.

The phase intentionally preserves current workflow composition. Dashboard, Leads, Tenants, Launch Blueprint, Launch Readiness, Admin Access, Setup Templates and Audit Logs still share the large Platform console. Permission Catalog and Data Governance retain their dedicated compositions. Later phases own task hierarchy and workflow changes.

## Bounded correction

The layout fallback already exposed Data Governance, but `backend/apps/iam/menu_catalog.py` omitted it. A synchronized database catalog could therefore hide the route. Phase 1 adds `/platform-admin/data-governance` as the tenth Platform Admin sidebar item, normalizes its label/blurb in the layout and adds a backend regression that asserts the complete ordered family.

## Current visual findings

The baseline passes its mechanical and selected accessibility gates, while recording these makeover opportunities:

- The dashboard begins with six metric cards and then repeats the same workspace choices in a horizontal tab strip, the sidebar and command shortcuts. Phase 2 should reduce this to a compact decision summary and retain only navigation that helps the current task.
- At 390px, the shared console tab strip becomes a long vertical block above every panel. It is usable but duplicates the mobile shell menu and delays the primary task.
- Dashboard content has a strong mission/risk/blocker model, but the current two-column cards produce uneven whitespace when one list is empty. Phase 2 should keep truthful empty states while tightening the layout.
- Tenants is readable at 390px and preserves search, filters, record selection and create guidance. Phase 2 should classify its local filters and confirm whether shareable scope is required.
- Launch Blueprint remains functional without horizontal clipping at 320px, but it is exceptionally long and places blueprint, status, certification, handoff, upgrade, drift, repair and run evidence in one sequence. Phase 3 should expose the next dependency first and keep secondary evidence available without losing it.
- The current mobile header exposes four quick links plus identity and sign-out. Phase 6 should recheck density after panel-level changes.

## Acceptance evidence

The suite ran with retries disabled against one production Next.js build and an isolated PostgreSQL database:

| Gate | Result |
| --- | --- |
| Chromium | 3/3 passed |
| Firefox | 3/3 passed |
| WebKit | 3/3 passed |
| Responsive captures | 120: ten routes at 1440px, 768px, 390px and 320px in all three engines |
| Axe scans | 30/30 route reports with zero selected WCAG 2 A/AA and 2.1 AA violations |
| Backend menu/authorization | 27/27 passed |
| Dialog behavior | Create Tenant opens by keyboard, focuses Code, closes with Escape and restores focus |
| Denial | Employee route access redirects safely; representative Platform APIs deny without protected data |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift and diff checks passed |

Representative visual review covered the Chromium dashboard at 1440px, Chromium Tenants at 390px and Firefox Launch Blueprint at 320px. Automated axe results and capture review do not establish complete WCAG conformance, native zoom, screen-reader behavior or production readiness.

## Phase 2 handoff

Phase 2 covers Dashboard, Leads and Tenants. Replace the dashboard metric wall with a compact decision summary, remove repeated route selection from the main task flow, tighten empty/populated layouts and certify real lead qualification/conversion plus tenant create/edit/state behavior. Confirmed, rejected, refresh-failed and ambiguous mutations must receive distinct feedback while preserving duplicate/domain protection and tenant isolation.
