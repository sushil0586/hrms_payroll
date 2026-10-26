# Workflow and Notification Management Phase 3 — notification configuration

Prepared: 24 October 2026. Status: complete at **12/12** browser scenarios across the implementation and hardening passes, plus **8/8** focused backend notification regressions.

## Implemented behavior

- Template and event editors focus the first invalid field, retain input after network or malformed-response failures, expose save progress and protect unsaved changes.
- Delivery configuration retains channel edits after network or unreadable responses and exposes alert/status semantics for save feedback.
- Notification template, event, preview, test-send and delivery write proxies return 502 for unreadable upstream responses instead of treating an empty object as success.
- Preview explicitly remains non-persistent. Test-send creates a controlled notification and states that creation does not confirm delivery.
- Notification configuration APIs now require an active HR-admin or tenant-admin role; employee and manager personas cannot write configuration.
- Persisted template and event create/edit paths return to their committed catalogs.

## Accepted implementation execution

Chromium passed **6 of 6** scenarios with retries disabled against an isolated PostgreSQL tenant and fresh production build:

1. template/event first-error focus and declined dirty-form discard;
2. persisted template and event create/edit;
3. preview without persistence followed by explicit test-notification evidence;
4. malformed template and delivery responses with retained operator input;
5. employee and manager configuration-write denial;
6. 320-pixel overflow checks and selected WCAG 2 A/AA and 2.1 AA axe scans across the control center, delivery, both catalogs and both editors.

Evidence is stored under `docs/qa/evidence/workflow-notification-phase3-2026-10-24`.

## Accepted hardening execution

Chromium passed **6 of 6** additional scenarios with retries disabled against a fresh production build and isolated PostgreSQL tenants:

1. delivery settings persisted through reload and credential-shaped provider keys were rejected with deployment-secret guidance;
2. duplicate template/event codes and inactive or channel-mismatched template dependencies returned actionable validation;
3. stale and cross-tenant template/event edit URLs rendered the standard unavailable page;
4. 5xx and aborted template writes retained operator input;
5. rapid double submission produced one write request;
6. invalid preview JSON produced explicit feedback and preview controls remained reachable at a 360-pixel viewport height.

The backend now validates existing event/template linkage when an event channel or active state changes, rejects active events linked to draft templates, and redacts any legacy credential-shaped provider values returned by the API. Notification provider credentials remain deployment-owned and cannot be added through channel configuration JSON.

Focused notification API regression checks passed **8/8**. TypeScript, ESLint, Django system checks, migration, production build and diff checks also passed. Evidence is stored under `docs/qa/evidence/workflow-notification-phase3-hardening-2026-10-24`.

Phase 3 is closed. Phase 4 moves to the HR delivery queue, review, retry and diagnostics surfaces.
