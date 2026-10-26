# Tenant Admin Phase 4: Financial Calendars and Leave Year

Accepted: 26 October 2026. Scope: `/tenant-admin/financial-calendars`, `/tenant-admin/leave-year`, fiscal lifecycle APIs and the shared Leave Year workbench. Evidence: [`tenant-admin-makeover-phase4-2026-10-26`](../qa/evidence/tenant-admin-makeover-phase4-2026-10-26/).

## Outcome

Phase 4 brings the two calendar workspaces under the compact Accerio hierarchy while preserving their domain boundaries. Financial Calendars now presents setup in the required calendar, year and period order, reports the current posting posture at a glance and moves close/reopen into an audited confirmation dialog. Leave Year keeps the accepted shared workbench and adds Tenant Admin summary parity without changing calculations, preview rules or background jobs.

## Financial calendar workspace

- A four-cell summary reports calendars, financial years, open posting periods and closed or locked history.
- The command band states the setup dependency order before the three creation forms.
- Calendar, year and period forms retain the backend-owned tenant, legal-entity, boundary, overlap and version rules.
- Registers keep semantic tables inside named keyboard-scrollable regions for narrow layouts.
- Period status uses the shared status badge. Close and reopen are shown only when the current state and permission allow the transition.
- Close/reopen uses the shared focus-managed modal, identifies the selected period and requires an audit reason of at least eight characters before confirmation.
- Confirmed transitions update the register and audit count, then remain present after reload. Idempotency keys prevent duplicate lifecycle events.
- An interrupted response keeps the form or dialog values, makes no success claim and offers no automatic replay. A confirmed write followed by refresh failure gives separate refresh guidance.

## Leave Year regression

- A four-cell summary reports periods, open periods, locked periods and queued or running jobs.
- The shared period register, close preview, confirmation, historical run and polling behavior remain intact.
- Preview remains read-only and does not create a close run. Confirmation remains gated by backend eligibility and explicit user action.
- Tenant Admin permissions continue to govern create, close and reopen controls. Employee access to both Tenant Admin calendar APIs and routes is denied.
- No leave balance, carry-forward, expiry, version or close-job calculation changed in this phase.

## Lifecycle integrity and disposable QA

Fiscal and financial-year status events remain append-only in normal operation. The PostgreSQL guards now recognize the existing ownership-verified synthetic teardown capability for delete operations, matching attendance and leave cleanup behavior. The exception is limited to sandbox tenants with the `pw-qa-` prefix and an exact Playwright owner marker; updates and ordinary tenant deletion remain blocked.

The browser suite provisions a fresh tenant per engine, grants close/reopen through a disposable custom role, exercises the real APIs and removes the full fiscal graph after the run. This validates both permission-based mutation and zero-residue cleanup without weakening production history.

## Acceptance evidence

The final suite ran with retries disabled against one production Next.js build and a disposable PostgreSQL database:

| Gate | Result |
| --- | --- |
| Chromium | 4/4 passed |
| Firefox | 4/4 passed |
| WebKit | 4/4 passed |
| Responsive captures | 12: Financial Calendars and Leave Year at 1440px and 390px in all three engines |
| Selected axe scans | 6/6 reports with zero WCAG 2 A/AA and 2.1 AA violations |
| Focused backend regressions | 8/8 passed for fiscal scope, version/overlap conflict, audited/idempotent transitions, authorization and Leave Year lifecycle operations |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift check and diff check passed |

The browser scenarios cover responsive hierarchy, page overflow, fiscal creation order, audited close/reopen, persistence after reload, ambiguous-response value preservation, no automatic replay, Leave Year preview safety, permission-controlled UI and employee API/route denial.

The automated scans do not establish complete WCAG conformance, screen-reader usability, native zoom or physical-device behavior. Production deployment and customer data were outside this phase.

## Phase 5 handoff

Phase 5 covers Security Readiness, Support Access, Trust Audit and Data Governance. Apply the same compact decision hierarchy and confirmed/unconfirmed feedback contract while preserving maker/checker boundaries, scoped grants, filter and export integrity, retained audit history, legal holds and governed request lifecycles.
