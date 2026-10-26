# Workflow and Notification Management Phase 2 — workflow configuration

Prepared: 24 October 2026. Status: complete; implementation pass accepted at 7/7 and hardening accepted at 6/6, for **13/13** focused Phase 2 scenarios.

## Implemented behavior

- Workflow template and assignment catalogs now use committed `q`, module and state/status URL filters with Apply, Clear, copied-URL and browser-history continuity.
- Genuine empty catalogs and filtered no-match results have distinct guidance and recovery actions.
- Catalog and control-center metrics explicitly identify loaded collections or values calculated from the visible trace page.
- Workflow trace no-match results include a direct Clear action, and the timeline region has an accessible heading relationship.
- Template and assignment editors focus the first invalid field, announce a consolidated failure, retain entered values after service or malformed-response failures, expose save progress with `aria-busy`, and prevent duplicate submit.
- Template steps can be added, removed and reordered with named keyboard-operable controls. Persisted order is normalized before save.
- Cancel and browser exit protect unsaved template or assignment changes.

## Accepted focused execution

Chromium passed **7 of 7** scenarios with retries disabled against an isolated PostgreSQL tenant and a fresh production Next.js build:

1. catalog URL filters, no-match recovery and Back navigation;
2. first-error focus and keyboard-operable step reordering;
3. declined dirty-form discard for both editors;
4. aborted template save with retained input and retry-ready controls;
5. assignment first-error focus;
6. persisted template create and edit;
7. persisted assignment create and edit.

Evidence is stored under `docs/qa/evidence/workflow-notification-phase2-2026-10-24`, including the production build, migration log, Playwright list output and machine-readable results.

## Accepted hardening execution

Chromium passed **6 of 6** hardening scenarios with retries disabled against two isolated tenants and the rebuilt production application:

1. employee and manager workflow writes denied by the backend role boundary;
2. stale and foreign-tenant template IDs render the standard unavailable page;
3. 5xx and malformed save responses retain entered values;
4. duplicate submit produces one write request;
5. exact duplicate template/scope assignment returns actionable conflict feedback while broader scoped priority resolution remains available;
6. workflow control, template catalog, assignment catalog and template editor avoid 320-pixel document overflow and pass selected WCAG 2 A/AA and 2.1 AA axe scans.

Hardening also corrected unreadable upstream write responses to return 502, mapped verified detail 404s to the standard unavailable page and raised workflow-card label contrast from `#7c879d` to `#596579`. Evidence is stored under `docs/qa/evidence/workflow-notification-phase2-hardening-2026-10-24`.

Phase 2 is complete within its documented local production-build scope. It does not certify every customer-specific approval chain, high-volume assignment resolution or staging deployment.
