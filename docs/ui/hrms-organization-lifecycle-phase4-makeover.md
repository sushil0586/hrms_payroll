# Movement UI/UX makeover — Phase 4

Status: complete within the bounded Phase 4 scope, 23 October 2026. Exit screens, joined closure and the lifecycle permission-policy decision remain open.

## Scope and composition

Follow the [shared Leave/Attendance standard](hrms-ui-ux-standard.md), [family plan](hrms-organization-lifecycle-makeover-plan.md) and [Phase 3 patterns](hrms-organization-lifecycle-phase3-makeover.md). Scope is `/hr-admin/movements`, `/new`, `/[itemId]/edit`, `movementModal=create` and `editMovement=<id>`, with inbox/report handoffs. Exits remain Phase 5.

Use one workspace task heading, matching/current-page/selected counts, committed queue filters and internal table scrolling. Search submits with Enter or Apply. Draft filter changes do not change paging or Edit scope until applied. Native navigation loads current server evidence; restored pages reset uncommitted controls. Selected editors read authorized detail independently of the visible page/filter. Missing selections never open another record. Failed live dependencies produce unavailable feedback.

Standalone and query-dialog editors share the existing lifecycle draft/busy owner and footer actions. Fields wait for hydration; pending writes disable fields, actions and modal close paths. A synchronous guard prevents duplicate submits. Known validation and unknown network/5xx/malformed results retain draft inputs and focus the outcome summary. Dirty Cancel/Back/ordinary navigation uses the shared draft guard. Safe local return targets preserve supported report/inbox/own-queue scope. Current-record confirmation is a fresh read, not a transaction claim based only on the URL.

## Movement fields and owner semantics

Source and destination are paired for all eight supported structural relationships: legal entity, branch, location, business unit, department, designation, grade and employment type. Source manager is separate; destination manager is also the owner. Employee, type, status, effective date, reason, workflow reference and the complete source snapshot remain in the payload. The JSON evidence must be an object, not an array/scalar. Editing evidence does not classify employment history.

The existing backend resolves `owner_value` after `to_manager_id`; its owner resolution remains authoritative. This phase keeps that contract and labels the control explicitly instead of inventing independent manager/owner relationships. Blank destination relationships retain authoritative assignment values when completion is applied; the service does not interpret them as an instruction to clear every relationship. Existing tenant and structural consistency validation remains authoritative.

## Consequences and preservation boundaries

Draft/Approved and Completed have different effects. Completed calls the existing effective-history service inside the existing transaction. It requires a classified employment timeline, refuses same-day baseline replacement and blocks cross-legal-entity completion without the existing policy decisions. Existing resulting-assignment linkage makes repeated application return the same assignment.

Current/past completion creates an active assignment and updates employee mappings. Future completion creates a planned assignment and leaves current employee mappings unchanged. Existing previous-range closure/status and actor semantics are preserved, including the current service's employee-code actor value. This makeover does not repair or redefine employment-history policy, retroactive workflows, payroll continuity or future activation.

Bulk owner actions update the destination manager. Bulk Completed can apply employment history; that consequence is stated beside the selected-record actions. Counts use validated bounded `updated_count` acknowledgements; unknown results retain selection and ask for a reload. The existing endpoint's authorization/transaction rules remain in force. Lifecycle permission-policy finding OL-C03 remains open; a catalog view permission is not certified as read-only.

## Verification

Accepted artifact: `web/.next/organization-lifecycle-phase4-closure`, build `ZTUYHrSYuZ6Q1l4wRPa1z`. Production compilation/type checks and focused ESLint passed. The final runtime manifest matches 817 entries; only eight entries differ from the accepted Phase 3 source. Seven backend contract files remain unchanged.

The main browser selection passed **27 checks** (nine scenarios in Chromium, Firefox and WebKit), with zero skipped, unexpected or flaky cases and no retries. A focused same-build inbox handoff selection passed **three more checks**. The final test source adds only that handoff case to the main accepted suite; the exact main test text and both hashes are retained. Two existing PostgreSQL effective-history tests also passed; six were deselected.

Verified real writes include all eight structural pairs/source manager and source evidence retained through draft save, one create under synchronous duplicate/pending protection, a real self-manager rejection, bulk owner count, and current/future completion. Actual resulting assignment IDs/statuses and employee department readbacks confirm current completion applies the destination while future completion leaves the current mapping unchanged; repeated service application returns the same assignment. Simulated abort/503/malformed outcomes retain drafts, and uncertain bulk status retains selection. Query editors work off-filter, stale IDs remain deliberate, paging ignores unapplied drafts, and report/inbox Cancel retains committed return scope.

Seventy-five captures cover five movement states at 1440/1024/768/390/320px across three engines, including 320x600 dialogs. Eleven representative final images were inspected for composition, field grouping, contained tables and visible actions. Tall captures were viewed scaled down; native WebKit control appearance differs. This is not exhaustive pixel or assistive-technology acceptance.

Cleanup verified all 141 checked tenant-related model counts zero and all twelve recorded fixture directories absent. The exact owned backend/Next processes, PostgreSQL container/anonymous volume and temporary scripts were removed. Existing repository audit hashes and earlier accepted family artifacts were preserved; the accepted Phase 4 build remains available. No commit or deployment was performed.

Evidence: [execution/lineage](../qa/evidence/organization-lifecycle-phase4-2026-10-23/README.md), [final verification](../qa/evidence/organization-lifecycle-phase4-2026-10-23/final-verification.json), [visual review](../qa/evidence/organization-lifecycle-phase4-2026-10-23/visual-review.json) and [cleanup](../qa/evidence/organization-lifecycle-phase4-2026-10-23/environment-cleanup.json).

OL-C02 is resolved for dedicated movement query editors; dedicated exit editors remain Phase 5. OL-C03 remains open. This slice does not certify every movement type/date/tenant/permission combination, future activation, large-load behavior or the whole HRMS. Denied/unavailable service permutations and shared-consumer regression beyond the recorded checks retain joined-closure gates. Next is Phase 5 exit screens.
