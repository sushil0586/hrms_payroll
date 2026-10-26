# Workflow and notification makeover — Phase 6 joined certification

Prepared: 26 October 2026. Status: accepted at 9/9 joined browser scenarios across Chromium, Firefox and WebKit plus 8/8 focused backend regressions.

## Certified joined path

The disposable certification creates an active leave workflow template, one manager step and an active scoped assignment through the HR APIs. It creates active in-app templates and event definitions for manager-pending and employee-updated events. An employee then submits a real leave request through the ESS dialog.

The submission produces a workflow trace linked to the configured template and a rendered manager notification linked to the leave request. The certification disables the in-app channel before processing, verifies a cancelled delivery and provider log, enables the channel, retries through the HR operation API and verifies confirmed delivery. The authorized manager reads the alert, follows its supported MSS source and approves the leave request. Processing the resulting event creates a rendered employee notification, which the employee consumes through ESS with a safe source link.

The joined scenario also proves repeated manager decisions do not reapply, an employee cannot use the manager decision endpoint or mutate a manager notification, a foreign manager receives 404 for the owned request, and the foreign MSS inbox does not expose the identifier.

## Cross-browser and responsive result

The same three joined scenarios pass with retries disabled in Chromium, Firefox and WebKit. Each engine covers the end-to-end flow, role and tenant isolation, desktop at 1440 pixels, tablet at 768 pixels, mobile at 320 × 480 pixels, keyboard open/Escape/focus restoration and selected WCAG 2 A/AA and WCAG 2.1 AA axe rules on the HR queue and MSS inbox.

The matrix exposed a Firefox-only six-pixel queue overflow caused by long rendered identifiers. Queue cards now constrain intrinsic width and allow primary text to wrap. The complete matrix passed after the fix.

## Cumulative negative boundary

Phase 6 joins and reuses the accepted controls from earlier phases: inactive template dependencies and foreign catalog references from Phase 3; capped retry, malformed or unknown mutation outcomes, stale and foreign queue IDs and wrong-role HR access from Phase 4; stale and unsafe action suppression, manager/employee cross-access, malformed/5xx/aborted read updates and compact dialogs from Phase 5. The joined run adds disabled-channel processing, recovery retry, repeated decision protection and end-to-end foreign-tenant denial.

## Verification

- Joined browser matrix: 9/9 passed, three tests in each of Chromium, Firefox and WebKit, retries disabled.
- Focused backend notification services: 8/8 passed, covering rendering, event test-send, queue filtering, processing, retry, capped retry and ESS/MSS projections.
- Selected accessibility scans: zero violations on the scanned HR queue and MSS inbox in all three engines.
- Desktop, tablet and 320 × 480 mobile width assertions: passed in all three engines.
- Production build and TypeScript: passed.
- Focused ESLint: passed.
- Django system check and migration drift check: passed with no model changes.
- Final cleanup: both owned workspaces removed, tenant count zero, application processes stopped and disposable PostgreSQL removed.

Evidence: [`../qa/evidence/workflow-notification-phase6-2026-10-26/`](../qa/evidence/workflow-notification-phase6-2026-10-26/).

## Certification boundary

This certification covers the recorded local source, owned PostgreSQL workflows and built-in in-app delivery adapter. It does not claim availability of external email, SMS, push or WhatsApp providers, customer-specific production policies, high-volume performance, physical devices, screen-reader certification, staging deployment or production release.
