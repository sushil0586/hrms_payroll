# Organization makeover — Phase 2 implementation record

Status: complete within the Organization Phase 2 scope, 23 October 2026. Lifecycle and reports remain separate phases.

## Scope and shared UI/UX

This slice applies the Leave/Attendance standard to the Organization catalog, all nine master create/edit variants, guided setup and CSV import. It uses the shared workspace header, one primary task heading, committed filters, an internally scrolling table, deliberate record inspection, grouped forms, visible pending state and focused feedback. Lifecycle queues, lifecycle forms and reports remain later phases in the [owning plan](hrms-organization-lifecycle-makeover-plan.md).

The daily catalog appears before the secondary master library and setup/import workbenches. Section, search, active status and page size define the committed catalog scope. Counts distinguish loaded section, matches and current page. Selected records are resolved independently of the visible filter/page; an unknown ID gives an unavailable state instead of selecting another row. Detail can be closed explicitly. Create, edit and return links retain the catalog query.

## Master editors

Legal entities, locations, branches, business units, departments, cost centers, grades, designations and employment types retain their existing fields and relationships. Standalone create/edit pages have one heading and a safe local return destination. Manage permission alone does not bypass the existing read dependencies; unavailable live reads cannot produce credible demo forms or counts.

Editors retain drafts after rejected or unconfirmed writes. Dirty Cancel/Back navigation is guarded. Hydration readiness and synchronous pending guards prevent premature and repeated submissions; fields and Cancel are disabled while saving. Validation feedback receives focus. A valid acknowledgement leads to native navigation and a fresh record read; the catalog receipt says “Current record loaded”, without pretending the read itself proves a new transaction. Unknown network, server and malformed acknowledgement outcomes remain explicitly unconfirmed.

The shared editor preserves each variant's domain structure:

| Master | Preserved field groups and relationships |
| --- | --- |
| Legal entities | Identity, registered/contact details, country and time zone |
| Locations | Identity, address and country |
| Branches | Identity, legal entity, location and branch type |
| Business units | Identity and parent business-unit hierarchy |
| Departments | Identity, business unit and parent department |
| Cost centers | Identity and legal entity |
| Grades | Identity, level and description |
| Designations | Identity, grade and description |
| Employment types | Identity, description and payroll eligibility |

All variants preserve active-state handling and existing dependency feedback. Presentation does not replace backend deactivation or hierarchy validation. Long forms scroll naturally; the action bar remains available at the bottom of the editor. Small screens stack groups, actions and workbench header metadata; wide catalog rows scroll inside their labelled region.

## Guided setup and CSV import

Both tasks remain mounted while switching, retaining their drafts under one navigation guard. Pending work disables task switching. Initial company/contact/code/name/address values are blank; existing country/time-zone defaults remain.

Guided setup performs separate sequential master writes. Confirmed earlier creations are reused on retry after a later known failure. Each acknowledgement is checked before a step is described as confirmed. Partial success is possible and is shown as such.

CSV preview is local and bound to the exact source text. Before Preview, the table remains empty with an explicit prompt; sample rows are not described as ready against zero batch totals. Editing invalidates commit readiness. Only ready rows are submitted; blocked rows stay outside the request. Backend source inspection confirms a transaction around the submitted batch. A known validation rejection rolls that batch back. Network/server/malformed responses do not establish whether records were stored and are reported as unconfirmed. Confirmed unchanged CSV cannot be committed again; reload the catalog before another batch. This is not a general idempotency guarantee.

## Verification and acceptance

| Evidence | Build | Result |
| --- | --- | --- |
| Full interaction run | `vW7GdGkQ33x0WG1DvgI4A`, `web/.next/organization-makeover-phase2-verified` | 33 passed: 11 scenarios in each of Chromium, Firefox and WebKit |
| Final responsive/CSV rechecks | `4GCx4174n9Dh3rhqtMuPg`, `web/.next/organization-makeover-phase2-release` | 9 passed across the same browsers, including initial preview emptiness and small-screen header separation |

The final production build/type validation and focused ESLint passed. A nonblocking existing Autoprefixer `end` compatibility warning remains. All 811 runtime, four test/config and seven backend-contract hashes match the recorded manifests. Generated TypeScript/Next configuration matches HEAD.

The final rechecks regenerate 210 full-page captures: all nine catalogs/create/edit variants at 1440/320px, expanded guided/import at both widths, and representative 1024/768/390px pages. Fourteen full-page views and three mobile detail crops were inspected. The [visual manifest](../qa/evidence/organization-makeover-phase2-2026-10-23/visual-manifest.json) records exact raster dimensions, hashes and review scope. Narrow tables scroll internally; grouped editors retain lower actions; workflow headers separate descriptions and metadata at small widths. Error/pending behavior is asserted by interaction tests rather than a visual review of every state.

The accepted interaction run verifies committed scope and paging, off-filter/stale selection, representative persisted create/edit, validation/dependency rejection, dirty navigation, duplicate-write guards, retained inputs after unknown outcomes, guided partial retry, CSV ready-subset persistence, real transaction rollback, role/read dependencies and keyboard filtering. Twelve persisted proof entries belong to that run; six additional CSV proof entries belong to the final rechecks.

Only two runtime files differ between the full interaction build and final build: the CSV workbench removes its automatic sample-row fallback and adds a preview prompt; Organization-scoped CSS stacks small-screen workbench headers. Write, validation, navigation and acknowledgement logic are unchanged. The [evidence record](../qa/evidence/organization-makeover-phase2-2026-10-23/README.md), source/test manifests and `closure-delta.json` keep that distinction explicit. Earlier setup/test failures and intermediate rechecks are retained as diagnostic lineage, not counted as acceptance.

Cleanup verified zero rows across the 16 checked tenant/user/employee/organization/lifecycle models before removal of the isolated database. All 23 recorded fixture directories, the private runtime directory, owned server processes, Docker container and its exact anonymous volume are absent. Ports 3273/8073/55472 are free. Existing export-audit hashes are unchanged; accepted builds are retained. See `database-cleanup.json`, `cleanup.json` and `final-verification.json` in the evidence directory.

## Boundaries and next phase

No backend model, endpoint, authorization policy or schema was changed. Organization selection resolves its portion of OL-C02. Lifecycle selection, the report population cap OL-C01 and lifecycle permission assessment OL-C03 remain open for Phase 3.

Render coverage for nine create/edit variants differs from domain-write coverage: real create/edit uses departments; guided setup writes its six supported master types; CSV subset/rollback probes use locations. This does not prove every field combination or dependency graph. Dirty navigation checks cover Cancel, header Back and ordinary links; before-unload protection is present in source. Browser-history interception is not certified.

Formal assistive technology, physical devices, native zoom, exhaustive security/domain acceptance and deployment remain outside this bounded verification. Phase 3 applies the same UI/UX to the lifecycle inbox, onboarding, probation and both reports; movements and exits retain their owning later phases.
