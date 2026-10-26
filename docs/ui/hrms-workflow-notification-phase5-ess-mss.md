# Workflow and notification makeover — Phase 5 ESS/MSS inboxes

Prepared: 26 October 2026. Status: accepted at 6/6 focused browser scenarios and 8/8 focused backend regressions.

## Delivered contract

The employee and manager inboxes now use the same committed filter and paging model while retaining separate authorization projections. Search, delivery status, channel, priority, subject type, page and supported page size survive detail review, close, Escape, refresh and pagination. Invalid page sizes and filter values fall back to supported defaults; an overlarge manager page resolves to the last available result page.

Counts declare their population. Total notifications refers to the full filtered result, while unread, high-priority and failed counts explicitly refer to the current page. Empty inboxes say `No notifications yet`; a filtered result with no rows gives a recoverable no-match message and Clear action.

Detail dialogs use the shared focus trap, restore the opener, close with Escape, remain scrollable at 320 × 480 pixels and retain the committed inbox URL. Read state changes update the open detail immediately and refresh the server-rendered list after close. Pending actions disable duplicate submission. Network failure, HTTP failure and malformed success payloads keep the prior state and show an error instead of announcing success.

Employee source links are limited to supported ESS leave, attendance, document and payslip destinations. Leave and attendance links require canonical UUID identifiers. Manager links are limited to supported MSS approval destinations; stale identifiers and HR-admin-only document or payroll destinations render no action.

## Authorization and API behavior

The existing employee and manager query projections remain authoritative. The browser suite proves that an employee cannot patch the manager fixture, a manager cannot patch the employee fixture, and unknown identifiers return 404. The focused backend suite additionally covers foreign tenant/detail rejection, ignored targeting parameters, revoked membership, invalid timestamps, repeated read/unread updates, concurrent identical reads, manager exclusion from ESS, and protection of delivery fields.

The Next.js read-state proxies now reject malformed request JSON with 400, return 502 when the notification service is unreachable or unreadable, and preserve valid upstream status and payloads.

## Verification

- Chromium browser suite: 6/6 passed with retries disabled.
- Django notification contract: 8/8 passed on disposable PostgreSQL.
- Focused ESLint: passed.
- TypeScript: passed.
- Django system check: passed.
- Migration drift check: no changes detected.
- Production build: passed. The existing `align-items: end` autoprefixer compatibility warning remains recorded in build evidence.
- Responsive evidence: employee and manager screenshots at 320 × 480 with no body-level horizontal overflow.
- Cleanup: the Playwright workspace removed itself; final tenant count was zero and the disposable PostgreSQL container was removed.

Evidence: [`../qa/evidence/workflow-notification-phase5-2026-10-26/`](../qa/evidence/workflow-notification-phase5-2026-10-26/).

## Next phase

Phase 6 joins configuration, domain workflow generation, notification processing or controlled failure, retry and authorized ESS/MSS consumption. It adds the three-engine browser matrix, selected accessibility scans and final zero-residue certification.
