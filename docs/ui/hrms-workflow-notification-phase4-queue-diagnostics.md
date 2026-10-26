# Workflow and Notification Management Phase 4 — queue and diagnostics

Prepared: 24 October 2026. Status: complete at **7/7** browser scenarios plus **8/8** focused backend notification regressions.

## Implemented behavior

- The HR notification queue commits search, status, channel, priority, audience, retry state, module, subject type, page and page size to the URL. Enter and Apply commit the same scope; Clear, reload and browser history restore the expected state.
- Queue state remounts from committed URL values, which also clears selections that no longer belong to the visible page.
- Review and full-review links carry a validated local return target so operators return to the same queue filters, page and page size.
- Stale and cross-tenant notification IDs render the standard unavailable page.
- Individual retry reports the returned current status and directs the operator to delivery-log evidence instead of claiming provider delivery.
- Bulk retry reports processed and skipped/capped counts, retains selection after uncertain failures and blocks duplicate requests while pending.
- Queue review, retry and bulk-retry clients reject unreadable responses. Network and malformed-response failures retain the operator's selections and review choices.
- HR notification diagnostics, queue reads, review writes and retry operations now require an active HR-admin or tenant-admin role at the backend boundary. ESS and MSS retain their separate notification projections.

## Accepted execution

Chromium passed **7 of 7** scenarios with retries disabled against a fresh production build and isolated PostgreSQL tenants:

1. complete queue filter commitment through Enter, reload, Clear and Back;
2. scoped queue-to-review return and evidence-based individual retry feedback;
3. persisted bulk retry with selected-count disclosure and one-request double-submit protection;
4. unreadable bulk response and aborted quick-review save with retained state;
5. stale and foreign review IDs plus employee/manager HR-operation denial;
6. diagnostics-to-queue drilldown continuity;
7. 320-pixel responsive checks and selected WCAG 2 A/AA and 2.1 AA axe scans for queue, review and diagnostics.

Focused notification API regressions passed **8/8**. TypeScript, ESLint, Django system checks, migrations, production build and diff checks also passed. Evidence is stored under `docs/qa/evidence/workflow-notification-phase4-2026-10-24`.

## Boundary and handoff

This phase verifies application-owned queue state, retry requests and recorded backend/provider evidence. It does not certify external email, SMS, push or WhatsApp delivery. Phase 5 moves to the ESS and MSS notification inboxes, read-state behavior, safe action links and role isolation.
