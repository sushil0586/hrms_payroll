# MSS Phase 4 notifications and joined journeys

Prepared: 26 October 2026. Decision: accepted; 9/9 final browser scenarios passed across Chromium, Firefox and WebKit. Evidence: [`../qa/evidence/mss-makeover-phase4-2026-10-26/`](../qa/evidence/mss-makeover-phase4-2026-10-26/).

## Change

The manager inbox now renders its supplied “Manager triage” eyebrow above the source-workflow guidance, restoring the intended hierarchy shared by the standardized workspaces. The page-level Decision history action was removed because Phase 3 established that completed-decision history is unavailable. Managers retain the primary Approvals destination, ESS inbox switch and the explicit unavailable History state inside Approvals.

The accepted shared notification center continues to own committed filters, paging, current-page count labels, read/unread mutation, safe source resolution, focus restoration and compact-dialog behavior. No notification query, delivery, permission or read-state API changed.

## Joined acceptance

Owned Leave and Attendance fixtures were exposed through valid manager notifications. The manager opened the exact selected approval from each source identifier, approved Leave and rejected Attendance through the real decision dialogs, and observed successful persisted mutations. Corresponding owned employee outcome notifications linked to the exact ESS request/detail destinations, where the terminal approved and rejected states were visible.

The outcome notifications are deterministic UI certification fixtures. Workflow event generation and delivery/retry were already certified by the Workflow/Notification family; this phase verifies MSS/ESS consumption and continuity.

| Scope | Result |
| --- | --- |
| Inbox hierarchy | Manager triage eyebrow visible; unavailable Decision history removed from page actions |
| Committed state | Search, delivery, channel, priority, page size and page remain in the URL through detail review |
| Read state | Mark-read updates the open detail and remains visible after close |
| Keyboard | Enter opens the selected detail; Escape closes it and restores the opener |
| Safe handoff | Valid Leave/Attendance UUIDs resolve to exact selected MSS and ESS destinations |
| Stale handoff | Non-UUID manager source remains visible as a notification with no fabricated Open source action |
| Joined Leave | Manager dialog approval persisted; employee notification and ESS detail showed approved |
| Joined Attendance | Manager dialog rejection persisted; employee notification and ESS detail showed rejected |
| Isolation | Manager B sees a true empty inbox; employee access to the manager notification returned 404 |
| Responsive/accessibility | 320 × 480 manager detail remained usable without document overflow; selected axe scans reported zero violations in all engines |
| Static/backend/build | Focused ESLint, TypeScript, Django check, production build and three focused notification/approval API regressions passed |

Final result: **9 passed / 0 failed / 0 skipped / 0 not run**, retries disabled, one worker. Three compact screenshots and three machine-readable axe reports were captured. The Chromium compact inbox/detail was manually inspected.

## Cleanup and boundary

Guarded fixture cleanup verified zero tenants and zero users after every browser project. The owned PostgreSQL container and local Django/Next services were removed after verification.

This phase does not add notification delivery rules or completed-decision history. Phase 5 performs the whole-family closure matrix across the three MSS routes and shared ESS consumers.
