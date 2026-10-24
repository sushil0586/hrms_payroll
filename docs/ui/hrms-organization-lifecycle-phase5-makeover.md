# Exit UI/UX makeover — Phase 5

Status: complete within the bounded Phase 5 scope, 23 October 2026. Joined closure and the lifecycle permission-policy decision remain open.

## Scope and composition

Apply the [shared UI/UX standard](hrms-ui-ux-standard.md), [family plan](hrms-organization-lifecycle-makeover-plan.md) and accepted [lifecycle editor patterns](hrms-organization-lifecycle-phase3-makeover.md) to `/hr-admin/exits`, `/new`, `/[itemId]/edit`, `exitModal=create` and `editExit=<id>`. Include actual inbox/report handoffs; joined family closure remains Phase 6.

Use one workspace task header, explicitly scoped counts, committed filters, readable status labels and internally scrolling tables. Rehire eligibility is a stored flag, not a certification of readiness. Draft filters do not change paging or edit links until Apply/Enter. Native document navigation refreshes server evidence; restored pages reset uncommitted controls. Genuine empty data and filtered no matches have distinct copy. Live dependencies must succeed before rendering credible forms/counts; unavailable detail never falls back to another selected record.

Query editors use independent authorized detail reads rather than searching only the visible queue page. Standalone and query-dialog editors share the lifecycle dirty/busy owner, bounded body, associated footer buttons, hydration readiness and synchronous submit guard. Pending saves disable fields/actions/close. Rejected or unconfirmed network/5xx/malformed results retain values and focus the outcome summary. Unknown outcomes require checking the queue before retry, without implying rollback or idempotency. Safe local returns preserve owning queue/inbox/report scope, and the actual trigger can regain focus after closing a dialog. A current-record notice comes from fresh authorized readback, not a URL-only proof of save.

## Retained field and clearance contracts

Employee/status/resignation, notice start/end, proposed/approved last working dates and actual exit remain editable with the existing server chronology rules. Full date names replace unexplained LWD labels. Exit reason/detail, workflow reference, plan/handover notes, regrettable and rehire flags remain in the payload.

The shared work-item editor displays plain stored usernames through their known canonical owner options without rewriting the stored value. Owners absent from current options remain explicit current-value choices, including escalation owners. An unrelated edit therefore cannot silently clear ownership. This shared correction also applies to onboarding; its consumer is checked separately.

The structured clearance editor retains code/label, owner/escalation owner, required/blocking/done flags, due/escalation dates, auto-reassignment settings, source-template identity and history metadata. New empty plans may seed from the selected lifecycle trigger. Once items exist, they remain authoritative; a template choice does not silently replace them. Existing workflow creation, notifications and escalation handling are preserved.

The existing API refreshes template-derived due dates when a date-only update omits the snapshot; full snapshot submissions remain authoritative as before. This makeover does not claim every form date edit automatically recomputes existing task dates. The UI continues to send the complete structured snapshot. Existing normalizers accept legacy list snapshots; there is no schema migration.

## Consequences and handoffs

Approved requires an approved last working date. Clearance in progress also requires at least one task. These states can move an Active employee to On Notice. Completed requires an actual exit date, no unfinished blocking task and deactivated employee access; it marks the employee Exited. Existing behavior applies that status synchronization when saved, without a new future-date scheduler. Cancellation does not automatically restore Active status. The footer explains the positive state effects without implying payroll or access processing is automatic.

Completion does not certify payroll settlement, statutory completion, release letters or document clearance. Inbox and report editor links preserve actual return scope. Documents requirements, notifications, workflow and payroll settlement remain adjacent owning services; no invented downstream completion link or new side effect is introduced.

Existing one-to-one employee/exit uniqueness and the broad HR authorization gate remain unchanged. This phase does not add duplicate-create idempotency or migrate the lifecycle permission catalog split. OL-C03 remains an explicit policy decision, not read-only acceptance.

## Verification and acceptance

Accepted immutable artifact: `web/.next/organization-lifecycle-phase5-release`, build `P5wXA-U4IlZS1dczTIx0f`. Production compilation/type checks and focused ESLint passed. The final runtime manifest matches 817 entries; eight frontend entries differ from accepted Phase 4. Seven backend contract files remain unchanged.

The complete final browser selection passed **33 checks**: eleven scenarios each in Chromium, Firefox and WebKit, with no retries, skipped, unexpected or flaky results. Four existing PostgreSQL exit-contract tests passed; 365 were deselected, with three dependency deprecation warnings. Earlier interrupted/diagnostic runs do not count as acceptance.

Real persisted readbacks cover all timeline/flag/note fields, item code/owner/history, known and absent-from-options owner display, one pending create, template source identity and derived due dates, omitted-snapshot date refresh, approval/clearance/Completed employee transitions, blocked clearance and live access, and cancellation remaining On Notice under the existing contract. Simulated abort/503/malformed outcomes retain drafts with focused feedback. Independent lookup, committed navigation, actual inbox/report returns, short-dialog keyboard/dirty/focus paths and genuine empty versus filtered no matches passed. The shared onboarding owner-display consumer also passed in all engines.

Seventy-five final captures cover five exit states at 1440/1024/768/390/320px in three engines, including 320x600 dialogs. Eleven representative final images were inspected for grouping, containment, populated-owner display and visible actions. Tall images were viewed at reduced scale; native browser control appearance differs. Capture count is not an exhaustive pixel or assistive-technology review.

Cleanup verified all 141 checked tenant-related model counts zero and all 16 recorded fixture directories absent. The exact owned backend/Next processes, PostgreSQL container/anonymous volume and temporary scripts were removed. Existing repository audit hashes and earlier accepted family artifacts were preserved; the accepted build remains available. No commit or deployment was performed.

Evidence: [execution and lineage](../qa/evidence/organization-lifecycle-phase5-2026-10-23/README.md), [final verification](../qa/evidence/organization-lifecycle-phase5-2026-10-23/final-verification.json), [visual review](../qa/evidence/organization-lifecycle-phase5-2026-10-23/visual-review.json) and [cleanup](../qa/evidence/organization-lifecycle-phase5-2026-10-23/environment-cleanup.json).

Phase 5 closes the dedicated exit-editor portion of OL-C02 within its recorded scope. OL-C03 remains open. Formal assistive technology, physical-device/native-zoom, exhaustive role/tenant/date/task combinations, denied/unavailable service permutations beyond the recorded checks, concurrent consistency and deployment are separate. Next is Phase 6 joined closure, including shared-consumer regression and the carried report wording/wrapping polish. This slice does not certify the entire HRMS.
