# Tenant Admin Phase 1 rendered baseline

Accepted: 26 October 2026. Result: **9/9 browser scenarios passed** on the current production build across Chromium, Firefox and WebKit. Scope: [inventory](hrms-tenant-admin-makeover-inventory.md) and [plan](hrms-tenant-admin-makeover-plan.md).

## Executed result

Build `Ajh0yjFwzwbPa6V7VXw7b` was served against a disposable PostgreSQL 16 database. Retries were disabled and one owned workspace was provisioned and removed per engine.

| Gate | Result |
| --- | --- |
| Twelve-route desktop/mobile contract | 3/3 engines passed; 72 captures |
| Financial Years, Leave Years and Data Governance at 768px/320px | 3/3 engines passed; 18 additional captures |
| Selected WCAG 2 A/AA and 2.1 AA axe scans | 9 reports, zero violations after the form-label contrast correction |
| Dialog keyboard and focus restoration | Invite Member opens from keyboard, focuses Email, closes with Escape and restores opener focus |
| Wrong-role boundary | Employee direct workspace navigation redirects and the governance API fails closed |
| Backend menu catalog regression | 2 passed; 23 deselected |
| TypeScript, focused ESLint, Django check, diff whitespace | PASS |
| Fixture cleanup | Zero tenants and zero users remain in the owned database |

The [machine-readable result](../qa/evidence/tenant-admin-makeover-phase1-2026-10-26/results.json), [browser log](../qa/evidence/tenant-admin-makeover-phase1-2026-10-26/browser.txt), [evidence manifest](../qa/evidence/tenant-admin-makeover-phase1-2026-10-26/evidence-manifest.json) and [cleanup record](../qa/evidence/tenant-admin-makeover-phase1-2026-10-26/database-cleanup.json) retain the final run. Failed harness/preflight attempts are preserved in named subdirectories and are excluded from acceptance counts.

## Defects corrected in Phase 1

The database-backed menu catalog omitted `/tenant-admin/data-governance`. Direct authorization worked, but an authorized user could not discover or mark the route active in the normal shell. The code catalog now includes Data Governance under `tenant.retention.view`; a backend regression and the twelve-route browser matrix prove it appears only through the existing permission filter.

Compact form labels used `#738099` on white at 10px, producing 3.97:1 contrast. The shared label color is now `#64748b`, clearing the selected 4.5:1 axe threshold in all three engines. No field, permission or workflow behavior changed.

## Visual review and implementation findings

Representative Financial Years desktop, Leave Years 320px and Data Governance 390px captures were manually inspected in addition to automated overflow checks.

- **Users and Roles, Phase 2:** existing behavior is mature, but the fresh family baseline should be used to normalize database labels against source fallback labels and to verify compact dialog/action density on the final build.
- **Setup, Settings and Plan, Phase 3:** no blocking render defect appeared. These routes still need joined change-request and dependency feedback acceptance rather than more shell-only tests.
- **Financial Years, Phase 4:** all controls fit, but the desktop form stack is visually compressed and empty registers make headings/columns read as one dense band. Phase 4 should add task grouping, breathing room and clear empty registers while keeping the efficient compact layout.
- **Leave Years, Phase 4:** 320px containment is correct and tables scroll internally. The page is necessarily long; preserve the accepted lifecycle workbench and improve only Tenant Admin navigation/context if joined review finds a defect.
- **Data Governance, Phase 5:** mobile structure needs the largest presentation pass. The request panel has excess vertical gaps, record-category choices dominate the first screen, and Submit Request still reads like a browser-default control. Tables are safely contained, but form hierarchy and shared button treatment require correction.
- **Dashboard and navigation, Phase 6:** database labels such as `Roles`, `Plan` and `Trust Audit` differ from longer source fallback labels. The active-route contract is correct. Final closure should choose one vocabulary and certify it across database and fallback sources.

## Boundaries

This baseline proves current local rendering, selected automated accessibility rules, a safe dialog path and one wrong-role boundary. It does not certify every mutation, fault state or permission combination; those belong to Phases 2–5. It does not claim production deployment, physical-device behavior, native zoom, screen-reader results or full WCAG conformance.

Phase 2 can now begin with Users and Roles using this accepted twelve-route baseline.
