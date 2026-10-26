# MSS Phase 1 rendered baseline

Prepared: 26 October 2026. Decision: Phase 1 accepted; 12/12 final browser scenarios passed across Chromium, Firefox and WebKit. Evidence: [`../qa/evidence/mss-makeover-phase1-2026-10-26/`](../qa/evidence/mss-makeover-phase1-2026-10-26/).

## Result

The route census resolves to three current MSS pages: dashboard, approvals and notifications. Approvals contains three URL states: Leave, Attendance and an explicit unavailable History view. Shared route scope also includes the Accerio layout, loading boundary, error boundary and the approval decision components.

All current ESS routes are already covered by the ESS-1 through ESS-6A program. Workflow/Notification Phase 5–6 covers the present ESS/MSS notification center. The remaining makeover must therefore improve and certify MSS while running ESS only as an affected consumer.

## Confirmed source contracts

- The dashboard requests only queues the session can view and filters action links by the same permissions.
- Leave and Attendance approvals use independent manager list/detail and decision contracts.
- Queue state is URL-addressable. History has no live completed-decision data and declares that limitation.
- Rejection-note validation, decision eligibility, busy state and feedback live in the existing decision components.
- Manager notifications use the shared notification center with manager-scoped endpoints.
- MSS uses the shared Accerio workspace shell plus shared loading and error patterns.

## Executed acceptance

| Scope | Result |
| --- | --- |
| Dashboard | Four widths per engine: 1440×900, 768×900, 390×844 and 320×480; heading/task hierarchy, primary links and no document overflow |
| Approval routes | Leave selection, Attendance route, truthful unavailable History state and advertised URL contracts |
| Decision dialogs | Leave and Attendance at 320×480, visible note/actions, no document overflow, Escape close and opener focus restoration |
| Notifications and boundaries | Populated manager inbox, empty second-manager projection and denied employee manager mutation |
| Accessibility sample | Dashboard and Notifications scanned in all three engines for WCAG 2 A/AA and 2.1 AA tags: zero violations; Notifications retained two automated incomplete items per engine for later manual review |
| Static/build | Focused ESLint, TypeScript, Django check, migration check and production build passed; build retained the existing `align-items: end` autoprefixer warning |

Final result: **12 passed / 0 failed / 0 skipped / 0 not run**, retries disabled and one worker. Twenty-four final screenshots were captured and representative desktop, 320px dashboard, 320×480 Leave dialog and History images were manually inspected.

## Findings carried into implementation

1. Dashboard counts repeat across the summary, daily priority, action table and team snapshot. Phase 2 should retain decision value while reducing repeated reading.
2. Desktop and 320px Manager-actions rows visually concatenate the bold action label and explanation. Phase 2 needs deliberate column/cell spacing and mobile composition.
3. “Today exceptions” and “Team on leave” point to general queues. Their wording must continue to disclose that scope because no filtered destination API exists.
4. Approval navigation advertises correct `queue=attendance` and `queue=history` URLs, but keyboard activation stayed on the Leave URL in retained Chromium and WebKit diagnostic runs. The final census used the advertised href to isolate route rendering. Phase 3 must repair and re-test actual click/Enter navigation rather than treating the route-state PASS as navigation acceptance.
5. Narrow approval pages remain dense. The selected-detail content is usable through scrolling and the decision dialog retains controls/focus, but Phase 3 should improve scan order and action reach without dropping evidence.
6. Completed-decision History correctly remains unavailable and contains no fabricated rows.

## Diagnostic environment correction

The first attempt used the stale local SQLite database and failed before rendering because current payroll migrations were absent; a direct SQLite migration also reached PostgreSQL-only SQL. Final evidence uses an owned PostgreSQL 16 container with all migrations applied. Production-mode local HTTP required `HRMS_COOKIE_SECURE=false`; this also resolved WebKit rejecting the secure session cookie. These setup failures are retained as diagnostics and are not counted as product-test failures.

## Phase disposition

Inventory, ownership boundaries, route states, security personas and acceptance stages are documented in the [inventory](hrms-mss-makeover-inventory.md) and [plan](hrms-mss-makeover-plan.md). Final guarded cleanup verified zero tenants and zero users before the owned PostgreSQL container and local servers were removed. No application behavior, backend contract, release gate or production environment changed in Phase 1.
