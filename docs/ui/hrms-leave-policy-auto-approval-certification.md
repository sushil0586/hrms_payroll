# Policy-level timed Leave approval

21 October 2026. **Scoped local functionality: PASS. Overall release: CONDITIONAL. Lightsail staging and real-payroll production: NO-GO.**

Implemented the requested policy-owned enable flag and waiting hours, including real timed execution through the existing Leave decision service. The prior generic workflow-template timeout field only stored configuration. Leave automation now takes its authority from the applied Leave policy; the Leave template field is disabled with guidance to configure the policy.

## Configuration and behavior

Location: **HR Admin → Leave Policies → Create/Edit → Advanced routing and evidence rules**. The policy detail panel also displays the configured setting. Existing `leave.policies.manage`, tenant scope and platform-governance restrictions continue to control edits; no role permissions were broadened.

| Policy approval setting | Contract | Default / validation |
| --- | --- | --- |
| Enable automatic approval | `config_snapshot.approval.auto_approve_enabled` | `false`; explicit opt-in per policy |
| Automatic approval waiting hours | `config_snapshot.approval.auto_approve_after_hours` | `null`; positive whole hours required when enabled; unsupported datetime ranges rejected |

The editor disables hours when the flag is off and clears the current policy's hours on switching off. Other policies remain independent. No automatic enablement or historical backfill occurs. Existing JSON configuration and workflow-step datetime fields support the change; **no migration or dependency change** is needed.

The implemented clock uses **elapsed hours per active approval step**, including weekends. This follows the preceding proposal; it is not working-day scheduling or an overall request deadline. For 72 hours, a manager step activated Monday at 10:00 becomes due Thursday at 10:00. A later HR step gets its own activation time and waiting interval. Only final approval consumes the reservation; intermediate approval retains it.

1. Submission resolves the normal employee policy, validates the request, reserves units and captures the policy configuration on the request.
2. For an explicitly enabled snapshot, the active workflow step records `started_at + hours` in its existing `due_at` field. Reads/reloads do not restart it.
3. `leave.process_due_auto_approvals` is registered in Celery Beat every 60 seconds, with a bounded batch of 100. Processing occurs at or after the deadline, subject to worker availability and backlog; exact-second delivery is not promised.
4. The processor binds request, policy and workflow to the same tenant and subject. It checks the captured rule, current policy enable flag/active state, current step/deadline and configured assignment.
5. It locks the request, policy and workflow before invoking the existing approval path. Busy requests are skipped for a later scan; human rejection, withdrawal or resolution cannot be overwritten by a stale timer. Ledger/lot locks and calculations remain in the existing service.
6. Decisions record `system:leave-auto-approval`, waiting hours, policy/step IDs, deadline and execution time in workflow/action/audit evidence and request metadata. Existing notification events are reused; external delivery is not certified here.

The snapshot means enabling a policy **does not opt in old requests**. Changing hours does not alter already opted-in requests. Switching off stops subsequent automatic decisions. **Re-enabling permits previously opted-in pending requests to resume under their original recorded deadlines**, including overdue ones; the clock is not reset. This behavior must be reviewed before tenant rollout.

Cancellation requests retain their existing separate manual/reapproval rules. No automatic cancellation, delegation, escalation, parallel/quorum behavior or period reopening was introduced. Closed-period validation rolls back the workflow decision, audit and consumption together; blocked candidates are rotated so another valid due request can be processed. Unexpected failures are logged and make the Celery task fail rather than reporting success.

## Source and preserved boundaries

Final production Next build **`zG1w4MPNp7VL4cKEd00VO`** at `web/.next/leave-policy-auto-approval-final`. Intermediate build `YdYvkrcluSSTcPc3TgYT4` is historical and removed after capture. HEAD remains `2dbfecf02fb1b5dc2d700ac0c2ad33b9d718b161`; the pre-existing dirty tree is preserved, with no commit or immutable deployment-image certification claimed. [Hashes and exact changed-source list](../qa/evidence/leave-policy-auto-approval/source-provenance.json).

| Source | Change |
| --- | --- |
| `backend/apps/leave_management/auto_approval.py` | Policy snapshot/deadline guards, scoped locks and bounded due processor |
| `backend/apps/leave_management/services.py` | Defaults/normalization, deadline arming and guarded system decisions through the existing resolver; automatic audit context |
| `backend/apps/leave_management/tasks.py`, `backend/config/settings/base.py` | Registered task and 60-second Beat schedule |
| `backend/apps/common/api_serializers.py` | Additive policy fields, required-hours and range validation |
| `web/src/app/hr-admin/leave-policies/{form-values.ts,leave-policy-form.tsx,leave-policy-list.tsx}` | Default-off values, working editor controls/feedback and read-only summary |
| `web/src/app/hr-admin/workflow-templates/workflow-template-form.tsx` | Disable the competing timeout input for Leave and direct users to the policy |
| `web/src/lib/{types.ts,api.ts}` | Policy contract types and existing demo fallback default-off values; no new production data |
| `backend/apps/common/management/commands/manage_playwright_workspace.py` | Synthetic-only dated fixture correction: valid current working date, explicit expired-horizon rejection |

New tests: `backend/tests/test_leave_policy_auto_approval.py`, `web/tests/leave-policy-auto-approval/policy.spec.ts`, and `web/playwright.leave-policy-auto-approval.config.ts`. Two date fixtures in `backend/tests/test_phase0_api_smoke.py` now select working days so the original required-evidence assertions execute. [Exact date-only diff](../qa/evidence/leave-policy-auto-approval/backend-fixture-date-fix.diff). Generated Next type references track the final build; only this task's intermediate generated include was removed.

Shared Accerio form sections, grid, toggles, validation, feedback and readiness controls are reused. No new stylesheet, colors or component library. No payroll/statutory, attendance, IAM or governed year-end calculation module changed; protected modules/migrations and frozen gate hashes remain unchanged. [Integrity verification](../qa/evidence/leave-policy-auto-approval/final-integrity.json). Existing API endpoints and manual approval authorization remain; the new policy JSON fields are additive.

## Exact fresh verification

All accepted browser selections use the final production artifact, Chromium 151.0.7922.34, Firefox 153.0 and Playwright WebKit 26.5 on macOS arm64. WebKit is not native Safari or physical-device certification.

| Accepted selection | Passed | Failed / skipped / blocked / unexecuted |
| --- | ---: | --- |
| Existing HR reporting/year/correctness | 48 | 0 / 0 / 0 / 0 |
| Neighboring catalogs, applications and balances | 102 | 0 / 0 / 0 / 0 |
| Joined HR Admin / ESS / MSS / Tenant Admin journeys | 24 | 0 / 0 / 0 / 0 |
| ESS/MSS session/replay/context | 9 | 0 / 0 / 0 / 0 |
| ESS Leave | 27 | 0 / 0 / 0 / 0 |
| **Existing Leave selection** | **210** | **0 / 0 / 0 / 0** |
| Corrected new policy feature suite, run separately | **9** | **0 / 0 / 0 / 0** |
| **Accepted selections** | **219** | **0 / 0 / 0 / 0** |

These are **207 browser UI executions + 12 Node helper checks**, covering 219 project/case combinations, with retries disabled and no flaky outcomes. The new cases verify policy validation/save/reload/off, keyboard Space activation, policy independence, forbidden employee edits, responsive controls and a real ESS submission → due processor → audited consumption → duplicate retry. Synthetic deadlines were aged deliberately; no real 72-hour wait is claimed.

The **original combined 219-run matrix remains 218 passed / 1 failed** because Chromium's new harness tried reading a response body after ESS document navigation. The corrected feature suite passed 9/9 separately; this does not rewrite that original matrix as a clean combined run. Existing 210-case results were independently clean. Across all browser attempts in this task: **258 executions — 235 passed / 23 failed / 0 skipped**. [Exact cases and all attempts](../qa/evidence/leave-policy-auto-approval/browser-summary.json), [matrix exits](../qa/evidence/leave-policy-auto-approval/browser-matrix-exits.json), [corrected feature results](../qa/evidence/leave-policy-auto-approval/regression/feature-final/results.json). No inherited ESS-204 or preceding certification result is counted as newly executed.

Final backend/API/PostgreSQL command: **192 distinct checks passed; zero failures/errors/skips**. This includes **32 new cases** for configuration, deadline boundary, final/multi-step decisions, policy off/snapshot retention, non-retroactive enablement, cancellation/withdrawal/rejection exclusion, tenant/RBAC guards, closed-period rollback, competing workers/human decisions, busy-row retry, fairness, task error reporting and dated-fixture protection. The other 160 checks re-execute existing Leave/concurrency/API protections. [Selection](../qa/evidence/leave-policy-auto-approval/backend-selection.json), [final output](../qa/evidence/leave-policy-auto-approval/backend-regression.txt), [JUnit](../qa/evidence/leave-policy-auto-approval/backend-regression.xml).

All backend attempts total **468 executions — 447 passed / 21 failed**; repeated checks are not additional distinct cases. [Attempt accounting](../qa/evidence/leave-policy-auto-approval/backend-summary.json).

**Real Redis/Celery proof:** an owned loopback Redis broker and dedicated worker queue executed two actual queued jobs. First job approved exactly one due request; second approved zero and left transaction count unchanged. Reserved/consumed/available changed from **2/0/22 to 1/1/22**. The original future deadline, synthetic aging, task IDs and system audit are retained. [Queue evidence](../qa/evidence/leave-policy-auto-approval/queue-integration.json), [worker log](../qa/evidence/leave-policy-auto-approval/celery-worker-isolated.txt). These jobs are separate integration executions, not two extra pytest tests.

Task registration and the production 60-second schedule were checked. **An actual Beat process dispatching the periodic task was not executed**, nor were broker-outage/worker-crash recovery and large-backlog SLA rehearsals. [Registration evidence](../qa/evidence/leave-policy-auto-approval/task-registration.json). A working production scheduler/worker/monitoring deployment remains an operational gate.

TypeScript, full ESLint, Django checks, migration-drift check and production build **PASS**. [Quality exits](../qa/evidence/leave-policy-auto-approval/quality-results.json), [build](../qa/evidence/leave-policy-auto-approval/build-final.txt). Existing Autoprefixer `end`, Python deprecation and Celery broker-startup deprecation warnings remain; no unrelated dependency upgrade.

## Failed attempts and fixes retained

| Finding | Classification / resolution |
| --- | --- |
| First focused backend: 18 failures / 9 passes | New fixture users shared a blank unique email. Use unique synthetic addresses; business assertions unchanged. |
| Second focused backend: 1 failure / 26 passes | Year close creates a target-year balance; test helper selected all balances. Select the source year explicitly. |
| First broad backend: 2 failures / 190 passes | Required-evidence fixtures landed on weekends and failed earlier unit validation. Use existing working-date helper; retain required-evidence assertions. |
| First browser attempt: 9 failures | Existing synthetic manager-queue date was fixed to 20 October and became backdated on 21 October. Correct synthetic scheduling and reject expired fixture horizons; no application backdating restriction relaxed. Two new PostgreSQL tests prove this. |
| Second browser attempt: 9 failures | Harness addressed controls inside the existing closed Advanced routing disclosure. Open the real disclosure first. |
| Third browser attempt: 4 failures / 5 passes | Three unused response-body reads occurred after policy navigation; remove the unused reads while retaining HTTP/persistence assertions. One WebKit full-page screenshot timed out after business assertions; it passed three unchanged focused repeats. Original capture trigger remains **unproven**. |
| First final-build feature attempt: 1 failure / 8 passes | ESS navigated before Chromium could retrieve the submission body. Reuse the established real upstream response-buffering pattern, retaining HTTP 201, actual request ID and database assertions. Corrected feature suite passes 9/9; no sleeps, mock success or application warning suppression. |
| Initial real-queue driver | Test client used disallowed `testserver` host; use allowed localhost. No production host/security setting changed; first attempt dispatched no jobs. |

A detached backend launch produced no test output and was unexecuted; the foreground runner supplies the actual evidence. Two intermediate shell evidence-path errors were corrected before final frontend startup. These are not passed browser/API cases. Earlier files/traces remain retained under the phase evidence directory.

## Visual and accessibility evidence

[Screenshot index](../qa/evidence/leave-policy-auto-approval/screenshots.md) contains **180 final PNGs**, including **15 new feature captures**. All 15 feature images were actually viewed: policy section at 1440/768/390 px and ESS decision detail at desktop/mobile in each engine. [Manual inventory](../qa/evidence/leave-policy-auto-approval/manual-visual-review.json).

New controls retain the shared presentation and reflow without tested page overflow. Help text uses the existing paragraph style to avoid inherited uppercase label styling. Description-bearing desktop grid rows remain relatively tall; no whole-form density redesign is claimed. ESS screenshots retain its existing initial reason-field focus/internal scroll, so not every decision field is in frame simultaneously; DOM assertions and SQL/action-log evidence are separate proofs.

Existing summaries retain the **assigned manager** name; the automatic method is identified by the decision comment and actual system actor in workflow/audit records. A dedicated system-decision badge or employee deadline countdown is **not implemented**. Broader MSS density and prior family-consistency advisories remain open.

- Keyboard/names: new checkbox Space activation and named inputs/feedback; existing selected Leave dialog trap/restoration, Escape, table scrolling, navigation and reduced-motion checks passed.
- Automated checks: **105 scan files / zero violation entries**. Nine complete policy-section scans retain **nine incomplete contrast-rule entries** on the routing-section heading; the other 96 reused main/dialog files save violations only. Incomplete results are not passes or formal conformance.
- **Actual screen-reader speech, native 200%/400% zoom, physical devices and formal WCAG assessment: unexecuted** in this pass.

## Cleanup and decision

[Fixture audit](../qa/evidence/leave-policy-auto-approval/fixture-cleanup.json): zero tenants, users, document artifacts and private media files. [Infrastructure cleanup](../qa/evidence/leave-policy-auto-approval/cleanup.json): owned PostgreSQL and Redis containers/volumes, worker, API/frontends, caffeinate, private runtime/environment and intermediate build removed; owned ports closed. Nine empty failed-provision directories were removed. Final artifact/evidence retained; existing shared Docker images preserved.

Append-only report-export audit history was not truncated; its last certified prefix remains unchanged. [Audit preservation](../qa/evidence/leave-policy-auto-approval/audit-preservation.json). Frozen gate hashes are unchanged. No Lightsail deployment, customer data operation, billable resource or unrelated module redesign occurred.

**Local policy feature functionality PASS; overall release CONDITIONAL.** Review the documented opt-in/per-step/reenable behavior and complete scheduler/operations acceptance before enabling tenant policies after a future deployment. Existing projection, statutory, production recovery/provenance, accessibility and frozen release gates remain separate and open. **Lightsail staging NO-GO; real-payroll production NO-GO.** Stop at this feature for review.
