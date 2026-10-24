# Lifecycle inbox, onboarding, probation and reports — Phase 3

Status: complete within the bounded Phase 3 scope, 23 October 2026. Movements, exits, joined family closure and the lifecycle permission-policy decision remain open.

## Scope and shared composition

This phase follows the [Leave/Attendance standard](hrms-ui-ux-standard.md) and the [Organization/Lifecycle plan](hrms-organization-lifecycle-makeover-plan.md). It owns the lifecycle inbox, onboarding and probation queues, their standalone and query-dialog editors, and the lifecycle queue/aging reports. Movement and exit records remain visible consumers of the inbox; their dedicated form makeovers belong to Phases 4 and 5.

Each page uses one workspace task header. Operational filters and evidence follow the compact scoped summary. Queue summaries distinguish matching population, current page, selected rows and on-page document attention. Inbox detail opens deliberately below the full-width register; it no longer automatically consumes a desktop side column. Tables scroll within labelled regions on narrow screens.

Draft search/filter controls are separate from the committed query. Apply commits the draft; pagination, Inspect, Edit, Cancel and return links retain the committed scope. Enter submits queue search. Native document navigation refreshes server evidence without competing push/refresh transitions. Restored queue pages reset unapplied controls to their committed query.

## Record lookup and read states

The lifecycle queue endpoint now accepts `record=<type>:<uuid>` for a tenant-scoped queue projection of one explicitly selected record. It uses the existing HR context, tenant filters and projection; malformed keys receive validation feedback, and foreign/missing IDs yield no selected item. This does not add a permission grant or expose an unscoped lookup.

Inbox record/edit queries use that projection independently of the visible page/filter. Onboarding and probation editors also fetch their full authorized detail independently. Unknown IDs do not silently select another row. Missing or unavailable detail reads have deliberate unavailable feedback rather than an unhandled page error. Standalone editors and working queues require confirmed live dependencies; a failed read cannot present plausible demo forms or totals.

## Editors and domain preservation

Onboarding retains employee/status, joining dates, template trigger, owner/workflow reference, structured checklist metadata, due dates, escalation fields and notes. Existing template seeding, work-item identity/history and workflow creation remain authoritative. Existing completion requirements for joining date, checklist work and verified required documents remain in force. Duplicate onboarding for an employee now receives validation feedback for the existing one-to-one invariant rather than a predictable integrity error.

Probation retains employee/review/probation dates, decision, conditional extension metadata, reviewer ownership, workflow reference and rationale. The action area explains that confirmation and extension may update employee dates. Existing date/decision validation and employee side effects remain authoritative; save is not described as merely editing a note.

Both forms remove their repeated task introduction while keeping labelled field groups. They retain inputs after known rejection or unconfirmed network/server/malformed responses, focus feedback, disable fields and actions while pending, and synchronously prevent duplicate writes. Cancel/Back guard dirty drafts. Success loads fresh authorized evidence and describes the result as a current record read rather than treating a query parameter as proof of a transaction.

Query dialogs share one dirty/busy owner. Save/Cancel actions use the dedicated footer while remaining associated with the form; lower fields scroll in the bounded body. Close, Escape and Cancel share one discard decision; pending writes block all close paths. Native return navigation restores the actual queue trigger where available. Copied modal URLs have no original trigger to restore. Standalone return destinations are limited to the owning queue, inbox and the two lifecycle reports; report filter/date scope can be retained through supported editors.

## Bulk outcomes

Owner/status actions retain the existing supported record types, owner vocabulary, selection and readiness rules. They operate on selected records from the current page. A shared synchronous guard prevents repeated writes; fields, selection and navigation are guarded while pending.

Acknowledgements must contain a bounded integer `updated_count`. Feedback states the confirmed count against the requested scope and asks for a reload before interpreting current rows. Mixed-type owner requests remain sequential: earlier confirmed counts stay visible if a later group fails. Unknown outcomes retain selection and do not claim rollback or total success. This is not a new transaction/idempotency guarantee across requests.

## Complete bounded reporting

Both report pages and their dedicated CSV/manifest paths use the same live collection contract: pages of 100, maximum 10,000 records, exact page metadata/count agreement, complete expected page lengths and distinct composite type/ID keys. Missing/overlapping pages, observable population changes, unsupported bounds and source failures produce an unavailable result rather than a partial report or successful export.

Collection is not a transactional snapshot. Same-count concurrent replacement or field mutation can escape these checks. No large-load or concurrent consistency guarantee is claimed.

Browser and export selection share search fields, filter predicates and deterministic sorting with type/ID tie ordering. Reports apply filters immediately and synchronize the supported query state into the copied URL. Paging is local to all matching collected records; CSV/manifest include that complete matching population, not the visible ten rows. Print is labelled “current page”.

Age and overdue calculations share an explicit `as_of` UTC calendar date, including normalized effective export metadata. Date-only milestones remain dates; timestamp ages use UTC dates. Existing age buckets, escalation and SLA predicates are preserved. The queue report calls its existing warning-inclusive classification “attention priority”; it does not equate every readiness warning with a new domain risk decision. Redundant report introduction/insight chrome is removed.

## Permission assessment — OL-C03

The lifecycle endpoints continue to use the existing broad HR context. The catalog advertises `lifecycle.view` and `lifecycle.manage`, but existing create/update/bulk handlers do not consistently enforce that operation split. This phase does not silently introduce a new backend authorization policy or claim that a view-only catalog permission guarantees read-only behavior. Source assessment and the scoped persona observations belong in the final evidence. A permission-policy migration requires its own explicit decision and tests.

## Verification and acceptance

Accepted production artifact: `web/.next/organization-lifecycle-phase3-release`, build ID `7MHWnY9r1U_mBLMSLJy3A`. The final manifests match 817 runtime entries, seven backend contract files, six main test/helper files and five export/inline checkpoint files. Production compilation/type checks, focused ESLint and six report contract tests passed.

The final browser run passed **45 checks**: 15 scenarios each in Chromium, Firefox and WebKit, with no retries, skipped or flaky checks. A separate same-build inspector checkpoint passed **three checks**. Coverage includes independent lookup for all four record types, off-filter edits, committed paging/Back, actual onboarding template/completion/history writes, probation extension/confirmation employee-date readback, pending and uncertain outcomes, short-dialog keyboard/dirty/focus return, bulk counts and mixed-type partial outcomes, complete reports above 100 rows, copied report filters/return scope, genuine empty data and fail-closed report faults. A lifecycle-view-only persona could still submit the existing bulk-owner action (HTTP 200); this confirms OL-C03 remains a policy decision, not read-only acceptance.

Retained CSV and manifest pairs each contain 128 matching records with checked byte checksums and effective `as_of=2026-10-23`. Failed collections did not create successful export audit entries. Screens and CSV selection/order were compared against the same matching population.

The 159 root captures cover 21 main states at 1440/320px in three engines, representative 1024/768/390px states, and the explicit inline inspector at 1440/320px. Sixteen representative final images were inspected for composition, responsive containment, field grouping, footer visibility and focus. Tall captures were viewed at reduced scale; this is not a claim of exhaustive pixel inspection. Minor report polish remains for joined closure: replace the inherited `workflow.pending` empty-reference label and improve narrow owner-column wrapping. Neither changes report inclusion or export correctness.

All 32 checked isolated tenant/identity/organization/lifecycle/workflow model counts were zero at teardown; all 15 recorded fixture directories were absent. The owned database container/anonymous volume, servers, proxy and private audit runtime were removed. Existing repository audit files retained their baseline hashes. The final build and prior accepted family artifacts remain available. No deployment or commit was performed.

Evidence: [execution and lineage README](../qa/evidence/organization-lifecycle-phase3-2026-10-23/README.md), [final verification](../qa/evidence/organization-lifecycle-phase3-2026-10-23/final-verification.json), [visual review](../qa/evidence/organization-lifecycle-phase3-2026-10-23/visual-review.json) and [export verification](../qa/evidence/organization-lifecycle-phase3-2026-10-23/exports/verification.json).

OL-C01 is resolved within the bounded complete-collection contract. OL-C02 is resolved for the shared inbox and owning onboarding/probation editors; dedicated movement/exit editors remain Phases 4/5. OL-C03 remains open. Formal assistive technology, physical devices/native zoom, exhaustive field/tenant/domain combinations, large-load testing and deployment are separate. Phase 3 does not certify the entire HRMS.
