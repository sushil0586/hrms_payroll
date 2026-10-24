# Documents Phase 3 — category and requirement setup

Prepared: 22 October 2026. Complete within the setup scope and verification boundaries below. This does not certify the unfinished Documents phases.

## Consistency contract

All setup routes adopt the [shared UI/UX standard](hrms-ui-ux-standard.md) and the [Leave/Attendance reference](hrms-leave-attendance-makeover-reference.md). Every page must have one operational heading, a clear primary action, meaningful scoped summaries, readable register/detail composition and the same task form in standalone and dialog entry points. Shared presentation does not change domain authorization or validation policy.

| Surface | Category | Requirement |
| --- | --- | --- |
| Register | `/hr-admin/document-categories` | `/hr-admin/document-requirements` |
| Selected detail | `?selectedCategory=<id>` | `?selectedRequirement=<id>` |
| Standalone create | `/new` | `/new` |
| Standalone edit | `/<id>/edit` | `/<id>/edit` |
| Create dialog | `?categoryModal=create` | `?requirementModal=create` |
| Edit dialog | `?editCategory=<id>` | `?editRequirement=<id>` |

The final four rows use the respective register path as their base. All twelve surface variants are included in rendered verification; a single dialog screenshot cannot accept the entire family.

## Form and workflow requirements

Category identity retains code, name, category type and description. Behavior retains active, system-seeded, expiry, verification, employee-upload and multiple-file flags. Visibility-rules JSON remains editable without discarding unsupported keys. The category impact preview describes the current draft; only a successful server response confirms persistence.

Requirement scope retains category, legal entity, branch, department, grade and employment type. Blank organizational scope means unrestricted, whereas a category must be selected. Selecting a branch can establish its legal entity; changing legal entity clears an incompatible branch. An entity with no active branches explains why branch selection is unavailable. Joining days and priority remain nonnegative whole numbers. Mandatory and active flags retain their existing meanings. The register summarizes active rules rather than summing unrelated priorities.

Both editors share stable labels, input retention, focused error feedback, synchronous duplicate-submit protection and a disabled fieldset while saving. Dialog Cancel, close and Escape use the shared modal's controlled draft/pending state. Standalone Cancel and link navigation ask before discarding. Native unload warns about unsaved or pending work. Setup destination links use fresh document reads; the draft guard runs before shared navigation interception, and an approved departure suppresses a duplicate unload prompt. Registers use full width until a record is selected. Browser history traversal and formal assistive-technology behavior require separate verification; no exhaustive navigation guarantee is implied.

Successful writes return to the register with `setup_saved=1`. This is a navigational receipt, not a new authorization check or durable transaction identifier. Network failures and server errors describe an unconfirmed outcome and advise checking the register before retrying. Known validation failures preserve the draft for correction.

## Permission and ownership boundary

Setup writes still require `documents.manage`; read dependencies require `documents.view`. Setup pages show the explicit document-access notice before attempting unsupported reads. A missing standalone requirement ID displays the not-found state instead of falling back to an unrelated record. No permission, tenant boundary, schema, document history, file storage or backend serializer changes belong to this phase. Upload/ESS remains Phase 4; letters/report completion remains Phase 5.

## Verification record

Accepted build: `web/.next/document-makeover-phase3-finalized`, BUILD_ID `3lKm8JfBN8PpMDMk07-JN`. Production build, type validation and focused ESLint passed. The [evidence directory](../qa/evidence/document-makeover-phase3-2026-10-22/) retains the [15-check browser result](../qa/evidence/document-makeover-phase3-2026-10-22/results.json), [final validation](../qa/evidence/document-makeover-phase3-2026-10-22/final-validation.json), [visual manifest](../qa/evidence/document-makeover-phase3-2026-10-22/visual-manifest.json) and [cleanup](../qa/evidence/document-makeover-phase3-2026-10-22/cleanup.json).

Five scenarios passed in each of Chromium, Firefox and WebKit: **15 passed, zero failures, skips or flaky results**, retries disabled, one worker. The responsive scenario visited twelve surface variants at 1440, 1024, 768, 390 and 320px, totaling 180 surface/viewport/browser visits; 320px captures used 600px height. It asserted no document-level horizontal overflow and visible modal Cancel actions. The suite captured 84 PNGs. Fourteen representative captures were reviewed: ten directly from the accepted run and four with hashes identical to directly inspected prior captures. Paths, dimensions, hashes and reuse are explicit in the visual manifest. WebKit used a device-pixel ratio of two; image dimensions differ from CSS viewport dimensions.

The other scenarios checked category required/JSON validation and focused errors; arbitrary JSON-key retention after a real create; dirty Cancel, header close and Escape keep paths; pending disabled fields/actions, ignored Escape and synchronous duplicate-submit protection; confirmed category create/edit and fresh-register readback; requirement category/numeric validation, branch-to-entity selection, incompatible-branch reset, no-branch explanation, confirmed create/edit and readback; standalone dirty Back keep and Cancel discard; simulated 503 draft retention and approved Escape discard; and stale requirement IDs showing not-found without another record's editor. A 503 simulation is not proof of a real lost-response write. These checks are not a complete Tab-order or accessibility certification.

The source manifest records 807 runtime entries, and the test manifest records the exact suite/config/fixture hashes. Post-run verification found zero runtime/test mismatches. The runtime delta from Phase 2 is nine changed files and two new setup adapters; no removed files. Six backend contract files matched the Phase 1 follow-up hashes, including `backend/apps/common/api_serializers.py`.

After fixture teardown, Tenant, User, Employee, EmployeeDocument and DocumentArtifact counts were all zero in the isolated database. The owned backend/Next processes, PostgreSQL container and volume, temporary fixture contexts/private scripts and seven intermediate build directories were removed. The accepted Phase 3 build and previous accepted phase builds were retained. Ports 55472, 8073 and 3273 were free. `web/tsconfig.json` and `web/next-env.d.ts` were restored exactly to HEAD.

Earlier runs remain historical: `initial-run/` contains an interrupted result with one pass, four failures and seven skips; `reviewed-run/` retains partial diagnostics for client-navigation and harness issues; `close-navigation-run/` records fourteen passes and the Firefox close failure. Its visual inspection is retained separately. Unserved intermediate builds were interrupted during refinement and carry no acceptance. Only the final result above closes this phase.

## Implementation ownership

The six setup route files own read permissions, heading/actions, register summaries, selection and return destinations. Category and requirement form components each own their original write payload and domain-specific validation. `documents/document-setup-dialog.tsx` supplies controlled busy/dirty state to the existing shared modal. `documents/use-document-setup-draft.ts` supplies common draft, pending, discard and navigation behavior. The shared modal implementation is unchanged by this phase.

CSS additions are scoped to `.document-setup-form` and `.document-setup-dialog`; shell colors, navigation and base tokens remain shared. A one-column switch group on small screens, explicit labels and an opaque dialog action bar retain readable controls without introducing a separate visual system. Standalone forms scroll normally; their action bar is not promised to remain visible from the first field on every viewport.

The fresh-document link mode is intentional: the earlier rendered run persisted a create but reopening Edit through client navigation remained in a loading state. This phase changes only setup destinations, not the navigation behavior of unrelated workspaces. Approved link departures avoid a second unload prompt. Programmatic external navigation and browser history traversal are outside the executed dirty-guard matrix.

## Acceptance boundaries

The implementation is intended for all six setup route patterns and their selected-detail/create/edit query counterparts. The browser matrix exercises real category create and edit plus requirement create and edit; all standalone/modal variants use those same domain form components and are rendered at five widths. This does not mean every possible input combination or write entry point has an independent end-to-end test.

Read-only/custom-role combinations retain the discovery and Phase 2 evidence; this phase adds source-level read-dependency handling on setup routes without claiming a new exhaustive permission matrix. No new backend authorization acceptance, full accessibility scan, formal screen-reader assessment, physical-device/native-zoom certification, browser-history draft interception or very-large-register performance result is included. Query receipts can be copied into a URL and are not durable proof of a transaction. Not-found responses may carry HTTP 200 after Next.js streaming has started; acceptance checks the not-found UI and absence of an editor.


## Next phase

Phase 4 applies the same standard to HR upload and the ESS document center: category/file restrictions, ownership, progress, recovery and replacement/version behavior. Include every page/dialog entry point and its empty, invalid, pending and confirmed states. Letters/compliance remain Phase 5; joined family closure remains Phase 6.
