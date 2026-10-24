# Document Management Phase 1 — baseline and design direction

Prepared: 22 October 2026. Status: initial baseline preserved; [follow-up checks and Phase 1 closure](hrms-document-management-phase1-followup.md) complete the bounded discovery scope. No Documents makeover implementation has started.

Read the [makeover plan](hrms-document-management-makeover-plan.md) and [route inventory](hrms-document-management-makeover-inventory.md). Evidence lives in [the baseline folder](../qa/evidence/document-makeover-phase1-2026-10-22/). This record distinguishes current behavior, proposed design and acceptance; it does not certify untouched workflows.

## Artifact and executed scope

The retained Employee Phase 6 build `yZgzuG5se0QVNeeFNH2QD` was reused after all 802 entries in its runtime source manifest matched the current workspace. No application source or build configuration changed. [Provenance](../qa/evidence/document-makeover-phase1-2026-10-22/provenance.json), [runtime hashes](../qa/evidence/document-makeover-phase1-2026-10-22/source-manifest.json) and [backend hashes](../qa/evidence/document-makeover-phase1-2026-10-22/backend-source-manifest.json) identify the reviewed source.

The Chromium capture harness visits 20 HR route/query states at 1440, 390 and 320px, the hub at 1024 and 768px, and ESS at all five widths: 67 captures spanning all 13 route patterns. Desktop/tablet height is 1000px; mobile height is 844px. These are viewport captures, not full-page review of every field or footer. The fixture contains one verified document without a stored artifact, one uploadable category, one requirement and no generated letters. Fixture provisioning/cleanup writes are separate from UI business actions; no successful business write was exercised.

See [observations](../qa/evidence/document-makeover-phase1-2026-10-22/observations.json), [capture source](../../web/tests/document-makeover/baseline.spec.ts) and [runner configuration](../../web/playwright.document-makeover.config.ts). The final harness waits for a visible semantic page heading, with a dialog assertion for dialog states. At the known broken 1024px hub, it waits for the workspace table instead and records heading visibility; this exception records the defect rather than accepting the header. It does not prove complete client hydration, keyboard readiness or interaction acceptance.

Earlier runs remain evidence of harness limitations: an unsupported GET to the requirements adapter, hidden-heading locator failures after viewport changes, and a capture pass that included ESS loading skeletons. Those captures are archived under `pre-readiness-captures`; they are not the final content baseline. A successful later capture does not retrospectively make earlier captures valid.

## Permission and ownership map

The following map comes from current backend views/services and Next adapters. Source inspection is not a complete executed authorization matrix.

| Operation | Current backend gate / scope | Consequence for makeover |
| --- | --- | --- |
| HR options, categories, requirements, document list/detail reads | Authenticated HR workspace context plus documents.view; tenant-scoped lookup | Page-entry combinations are broader than individual read gates. Verify view/manage/verify/export-only roles before changing fallback or visibility |
| Category/requirement writes and HR upload | documents.manage; tenant context | Retain authoritative validation and do not infer write access from visible setup |
| Document review PATCH | documents.verify; tenant-scoped record | Review-only page entry still needs its read/options dependencies verified |
| HR file download | documents.export; tenant-scoped document/artifact | A visible artifact or review permission does not itself authorize download |
| Document reminders | documents.manage | Preserve eligibility, selection scope and sent/skipped outcome |
| Letter list/detail/preview/generation/download | HR workspace context; inspected views do not add a per-operation documents/letters permission gate | Record as an access-contract finding. Do not silently introduce permission policy as part of styling; assess intended policy before Phase 5 |
| ESS center/upload/download | Authenticated employee context; reads/downloads scope by tenant and employee; upload resolves active tenant category and allow_employee_upload | Preserve actual employee ownership and upload rules; never accept a client-selected employee owner |
| Compliance CSV/manifest | Next report export check resolves reports.hr.export for document-compliance | Preserve export gate separately from document review/download permissions |

The broader HR workspace gate accepts the legacy HR role or qualifying permission prefixes, with employee-only roles excluded from that permission-based path. Letter services also constrain target employee lookup to the actor tenant. These are current contracts, not proof that every possible role combination is intended.

[Nine API probes](../qa/evidence/document-makeover-phase1-2026-10-22/permission-probes.json) used Django APIClient with force-authenticated users in two isolated tenants. They observed: HR list 200 with effective page_size 100 when 500 was requested; foreign-tenant detail 404; employee HR list and review PATCH 403; employee center 200; two ESS download attempts 404; employee letter preview 403; HR empty preview 400. No valid mutation was sent. The download fixture has no artifact, so its 404s do **not** independently prove ownership enforcement; the tenant/employee lookup is established by source review and needs a positive-artifact boundary test.

## Rendered findings and concrete design decisions

| Finding | Observed baseline | Decision for owning phase |
| --- | --- | --- |
| DOC-V01 — tablet hub hierarchy breaks | At 1024px the hub title wraps character by character while five actions occupy most header width | Phase 2 must make the header responsive to available content width, stack actions before title collapse and verify the neighboring breakpoint range; do not fix only the exact captured width |
| DOC-V02 — repeated navigation dominates | Desktop and mobile hub repeat setup/review/letter destinations in the header and workspace table; mobile table actions require horizontal exploration | Phase 2: make review the daily primary task, group setup/letters/report entries and remove redundant navigation. Keep counts scoped and destinations readable |
| DOC-V03 — dense review context | Desktop review shows a large grid of metadata before decision fields. Mobile initial focus scrolls the context away beneath the fixed dialog header | Phase 2: compact employee/category/file/outcome context, elevate decision and evidence, place extended metadata/history below. Verify initial scroll/focus together |
| DOC-V04 — form nesting and control scale | Category setup has nested panels and large checkbox tiles; narrow requirement forms spend substantial height on repeated containers | Phase 3: simplify surfaces, group identity/behavior/applicability, retain dependent-scope guidance and replace oversized checkbox presentation using existing controls |
| DOC-V05 — duplicate upload introduction | Mobile HR upload repeats page/task/upload-details introductions before file controls | Phase 4: one task introduction, concise ownership/file guidance, readable field grouping and persistent outcome feedback |
| DOC-V06 — letter composition wastes space | Desktop form controls use a narrow portion of a wide panel while the empty preview occupies a tall column | Phase 5: allocate useful draft width and make preview height/content state deliberate; clarify current preview versus changed draft |
| DOC-V07 — report chrome delays evidence | Desktop compliance repeats task descriptions, evidence navigation and summaries before results; first viewport largely contains chrome and filters | Phase 5: compact report context, one truthful summary, clear filters and earlier results; preserve CSV/manifest actions and their permission checks |
| DOC-C01 — report scope is capped | Source request size 500 is capped to 100 by the backend, confirmed by a runtime API probe | Resolve loaded-versus-total reporting/export semantics before any claim of complete compliance coverage. Multi-page display/export parity remains unexecuted |

These decisions refine the [source findings DOC-01 through DOC-08](hrms-document-management-makeover-plan.md). Preserve useful existing behavior: shared shell, semantic table scroll regions, independent selected review lookup, query-backed HR scope, options-driven upload limit, progress, employee-facing review labels and version/audit history.

Fourteen final captures were actually inspected; [the visual manifest](../qa/evidence/document-makeover-phase1-2026-10-22/visual-manifest.json) records all 67 file hashes/dimensions and marks that subset. The final capture test passed with no captured pageerror events. This is a baseline collection result, not an implementation acceptance pass. The final ESS content captures show a tall summary at 320px pushing requirements below the first viewport; Phase 4 should compact that summary and prioritize missing/returned evidence.

## Initial remaining work — disposition in follow-up

- Capture and inspect short-height dialogs, actual modal footers, ESS upload/detail dialogs and representative lower-page content after explicit interactive readiness.
- Add synthetic pending, rejected, expired/expiring, re-upload, actual downloadable artifact, missing requirement, genuine empty and unavailable-read cases. The verified/no-artifact fixture and no-match route do not cover those states.
- Verify custom view-only/manage-only/verify-only/export-only combinations against page entry, API reads/options, writes and downloads. Determine intended letter permission policy; this baseline does not authorize changing it.
- Exercise positive artifact ownership boundaries and verify report/export scope with more than 100 records. Current 404 download probes are deliberately limited.
- Retain the recorded visual-review scope: 14 of 67 final captures were inspected. Extend review when the additional states above are captured.

The [follow-up record](hrms-document-management-phase1-followup.md) executes these remaining baseline cases, records their limits and carries discovered defects into the owning implementation phases. Phase 2 can proceed within that bounded scope. Formal screen-reader/native zoom/device assessment, all-browser workflows, upload/review/generation mutations and exhaustive security acceptance have not been performed here.

## Cleanup and verification

The [cleanup record](../qa/evidence/document-makeover-phase1-2026-10-22/cleanup.json) confirms zero Tenant, User, Employee, EmployeeDocument and DocumentArtifact rows in the task database, removal of the exact owned container and volume, and release of ports 55472/8073/3273. Both permission fixtures reported verified absence. The capture harness cleans each fixture in afterAll. Task services and private runners were removed; the accepted build remains available. Runtime source hashes still match all 802 entries. Repository documentation links and whitespace checks passed. No deployment or commit was performed.
