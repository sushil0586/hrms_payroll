# Document Management makeover — family inventory

Prepared: 22 October 2026. Status: source inventory and [detailed phased makeover plan](hrms-document-management-makeover-plan.md) recorded; [initial rendered discovery](hrms-document-management-phase1-design-baseline.md) is recorded; [follow-up discovery](hrms-document-management-phase1-followup.md) closes Phase 1 within its recorded scope; [Phase 2 HR operations](hrms-document-management-phase2-makeover.md) is complete within recorded scope; [Phase 3 setup](hrms-document-management-phase3-makeover.md) is complete within recorded scope; [Phase 4 intake and ESS](hrms-document-management-phase4-makeover.md) is complete within recorded scope; [Phase 5 letters/compliance](hrms-document-management-phase5-makeover.md) and [Phase 6 joined closure](hrms-document-management-phase6-closure.md) are complete within recorded scopes, with DOC-C03 retained as a policy decision. This follows Employee Management's bounded phased workflow and the [shared UI/UX standard](hrms-ui-ux-standard.md).

## Existing routes to review

The current source contains these 13 route patterns. Query entry points are additional states of their owning route, not separate screens.

| Surface | Existing routes / query states | Proposed review boundary |
| --- | --- | --- |
| HR control center | `/hr-admin/documents` | Task hierarchy, meaningful summary scope, entry into review/setup/letters/compliance, unavailable reads and permissions |
| Employee document queue | `/hr-admin/employee-documents`; `?reviewDocument=[id]`; search/status/category/expiry/paging query | Committed filtering and server paging, row identity, inspect/review entry, return context, pending decisions and receipts |
| HR upload | `/hr-admin/employee-documents/new` | Employee/category selection, file controls, required evidence, actual upload restrictions, preserved draft and outcome |
| Standalone review | `/hr-admin/employee-documents/[itemId]/review` | Same review task and domain meaning as the queue dialog; validation, dates, decisions, rejection and return |
| Category setup | `/hr-admin/document-categories`, `/new`, `/[itemId]/edit`; `categoryModal=create`, `selectedCategory`, `editCategory` | Identity/behavior groups, meaningful switches, reusable setup, page/dialog consistency and every close/cancel path |
| Requirement setup | `/hr-admin/document-requirements`, `/new`, `/[itemId]/edit`; `requirementModal=create`, `selectedRequirement`, `editRequirement` | Requirement scope, category/organization dependencies, required/expiry meaning and safe editing |
| Employee document center | `/ess/documents` | Employee-only scope, required/missing/current files, upload and preview/download, progress and recovery |
| Generated HR letters | `/hr-admin/generated-letters` | Existing preview → generation → stored artifact flow, variables, task impact, uncertain outcomes and employee attachment |
| Compliance report | `/hr-admin/reports/document-compliance` | Report scope, date/status interpretation, filtering/paging/export where actually supported, links back to the owning task |

The source search found no dedicated MSS document-page route. Discover actual manager handoffs before proposing an MSS screen. Employee-specific document handoffs must be verified where implemented; do not invent a context-preserving link that the current UI does not offer.

## Proposed delivery sequence

1. **Baseline and contracts:** capture the listed routes and query dialogs on desktop/mobile; map real APIs, permissions, artifact ownership, upload limits, date semantics and audit. Inspect empty/unavailable/expired/rejected/pending states. Confirm which actions and exports actually exist.
2. **HR hub, queue and review:** establish the list/detail/decision composition and preserve committed scope through review/save/return. Include the standalone review counterpart.
3. **Category and requirement setup:** align standalone and dialog forms with employee/Leave form patterns. Review both the shared modal and each form's own Cancel/navigation/pending path; passing the shared Escape guard alone does not verify those paths.
4. **HR and ESS upload/document center:** establish clear file selection, validation, progress, preview/download and recovery with tenant/employee ownership intact. Reuse established controls; retain real file and artifact contracts.
5. **Letters and compliance:** review generation preview/impact/receipt, attachment and report handoffs. Preserve actual date/evidence meaning rather than adding unsupported states.
6. **Joined closure:** focused cross-screen/browser checks, actual image review, findings disposition, cleanup and a scoped record. Keep formal accessibility and exhaustive domain/security acceptance separate.

Each implementation slice follows baseline → design → implementation → rendered review → interaction checks → scoped closure. Use 1440/1024/768/390/320px viewports, short dialogs, keyboard and pointer, meaningful backend cases and a fresh isolated fixture environment. Publish exact executed scope, actually inspected images and unexecuted assessments.

This proposal introduces no document policy changes, permission changes, storage migration, new backend workflow, deployment or scheduled work. Existing historical certificates remain evidence of their own artifacts and scopes; they do not automatically accept a later makeover.

## Execution status — 23 October 2026

Phases 1–5 are complete within their linked plan/closure scopes. [Phase 5](hrms-document-management-phase5-makeover.md) records the generated-letter workspace and complete bounded compliance report/export: 12 final checks across three browsers, 48 captures and ten inspected images. Generated letters remain separate stored artifacts rather than employee-upload records. DOC-C01 is resolved within the bounded collector contract; DOC-C03 remains an explicit letter-authorization policy decision. [Phase 6 joined closure](hrms-document-management-phase6-closure.md) is complete within UI/workflow scope: 42 current-source cases covered by the combined matrix and focused setup recheck, with raw execution lineage and remaining limits recorded.
