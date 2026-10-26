# MSS Phase 3 approval workspace makeover

Prepared: 26 October 2026. Decision: accepted; 12/12 final browser scenarios passed across Chromium, Firefox and WebKit. Evidence: [`../qa/evidence/mss-makeover-phase3-2026-10-26/`](../qa/evidence/mss-makeover-phase3-2026-10-26/).

## Change

The Leave, Attendance and History tabs now use browser document navigation. This closes the Phase 1 cross-engine defect in which keyboard activation could leave Chromium or WebKit on the previous queue even though the link exposed the correct URL. Queue, page and selected-record parameters remain addressable, and browser Back restores the selected Leave context.

A confirmed Leave or Attendance decision now closes its review dialog before the server-backed queue refresh. The synchronous submission guard remains active, so rapid repeat activation sends one request. Rejection continues to require a decision note; a lost transport produces an unconfirmed-outcome message, keeps the note, and moves focus to the error for a deliberate retry.

History guidance now states at both hierarchy levels that completed-decision history is unavailable. It directs managers to the pending queues or HR instead of describing an audit capability that the product does not expose.

No approval policy, reporting scope, permission, tenant boundary, mutation endpoint or history API was added or changed.

## Acceptance

| Scope | Result |
| --- | --- |
| Cross-engine queue navigation | Focus + Enter changed Leave → Attendance and History in all three engines; each active tab and URL agreed |
| URL continuity | Browser Back restored the exact `leaveId` and selected-detail context |
| Decision validation | Reject without a note showed inline guidance and focused the note field |
| Failure recovery | Aborted mutation showed an ambiguous-outcome error, focused it, and preserved the manager note |
| Duplicate safety | Delayed synthetic success plus double activation produced exactly one request for both domains |
| Confirmed completion | Both review dialogs closed before queue refresh after success |
| Persistence | Owned manager Leave approval and Attendance rejection returned success; a repeated terminal decision was denied |
| Security | Employee mutation returned 403; foreign-tenant manager mutation returned 404 |
| Responsive behavior | Leave and Attendance detail/review flows remained usable at 320 × 480 with no document overflow |
| History/accessibility | Honest unavailable state rendered in each engine; selected WCAG 2 A/AA and 2.1 AA axe scans reported zero violations |
| Static/backend/build | Focused ESLint, TypeScript, Django check, production build and four focused approval API regressions passed |

Final result: **12 passed / 0 failed / 0 skipped / 0 not run**, retries disabled, one worker. Fifteen final screenshots were captured across the three engines. Chromium desktop history, compact queue/detail states and both compact dialogs were manually inspected.

## Cleanup and boundary

Guarded fixture cleanup verified zero tenants and zero users after each browser project. The owned PostgreSQL container and local Django/Next services were removed after verification.

This phase certifies pending Leave and Attendance decisions and the truthful unavailable-history state. It does not create completed-decision history. Notifications and the joined employee → manager → employee journeys remain Phase 4 scope.
