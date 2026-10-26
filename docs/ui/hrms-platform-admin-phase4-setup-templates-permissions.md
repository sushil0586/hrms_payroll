# Platform Admin Phase 4: Setup Templates and Permission Catalog

Accepted: 26 October 2026. Scope: `/platform-admin/policy-packs`, `/platform-admin/permissions`, template/item authoring and lifecycle operations, tenant adoption/upgrade, and permission catalog metadata. Evidence: [`platform-admin-makeover-phase4-2026-10-26`](../qa/evidence/platform-admin-makeover-phase4-2026-10-26/).

## Outcome

Setup Templates and Permission Catalog now follow the same compact, task-first Accerio hierarchy accepted for the earlier Platform Admin phases. Both routes have one page title, a four-cell summary, one next required action, a focused primary workspace, and no duplicate console navigation. The Platform shell remains the route selector.

Setup Templates summarizes total versions, editable drafts, published templates, and the selected tenant/template context. Its next action advances from template creation to first item, draft review and publish, impact preview, blocker resolution, apply, and evidence review. Template search, status, and domain controls remain immediate local narrowing over the loaded register and are identified by the existing filter summary.

Permission Catalog summarizes immutable keys, tenant-assignable keys, platform-only keys, critical risk, catalog source, and inactive metadata. Search, assignability, risk, and module form one committed URL scope that survives reload and copied links. The catalog explains database-managed metadata, code fallback, deployed runtime enforcement, and immutable key authority before the edit action.

## Template lifecycle safeguards

- Draft creation validates stable code, name, and version before submission and retains entered values after an interrupted response.
- Guided items validate payload requirements and dependency keys in the API. Draft items can be edited or deleted; published item creation, edit, and deletion remain locked.
- Header-only publish requires explicit confirmation. Content-bearing templates retain the same review-and-publish boundary.
- Published templates can create a new draft version. The source remains locked, while items and delegation rules are copied into the new lineage version.
- First adoption requires an authoritative impact preview. Conflict and blocked counts prevent apply.
- Version upgrade requires comparison evidence. Add, change, remove, detached, and unchanged results are shown before apply.
- Adoption creates tenant-owned runtime records and traceability evidence only for the selected tenant. Repeated no-op upgrades are rejected.
- Interrupted publish, clone, delete, adoption, or upgrade responses make no success claim and direct the operator to inspect template status, lineage, adoption evidence, or runtime records before retrying.

## Permission authority and mutation behavior

- Permission keys are shown as immutable contracts and are never rendered as editable inputs.
- Tenant assignability, platform-only scope, risk, active state, required module, required plan, and default roles remain visible in the register.
- Metadata saves use the platform-only API. A confirmed save reloads the current filtered URL and displays persisted database state immediately.
- The permission dialog is portalled to the document root and uses a constrained header/body/footer layout. Its actions remain reachable in Chromium, Firefox, WebKit, short desktop viewports, and mobile layouts.
- Interrupted metadata responses preserve entered fields and instruct the operator to inspect current catalog state before retrying.
- Employee credentials receive neither permission catalog data nor template lifecycle access.

## Responsive and accessibility result

Setup Templates and Permission Catalog were captured at 1440px and 390px in Chromium, Firefox, and WebKit. The 12 full-page captures have no document-level horizontal overflow. Four-cell summaries become two-by-two blocks, next actions stack above full-width buttons, filter controls become a readable single column, and permission/template records preserve their action context.

Six selected WCAG 2 A/AA and 2.1 AA axe reports contain zero violations. Manual screenshot review confirmed one H1, readable summaries, visible tenant and permission authority, clear disabled reasons, and consistent action priority. This evidence does not establish complete WCAG conformance, native zoom, or screen-reader certification.

## Acceptance evidence

| Gate | Result |
| --- | --- |
| Browser scenarios | 12/12 passed, four per engine, retries disabled |
| Responsive captures | 12: two routes at 1440px and 390px in three engines |
| Selected axe scans | 6/6 reports with zero violations |
| Template authoring | Required fields, interrupted-response preservation, payload/dependency rejection, ordered item persistence, edit/delete and published locks |
| Version lifecycle | Explicit publish, source lock, clone to editable v2, comparison, upgrade apply, and repeat rejection |
| Tenant adoption | Impact preview, tenant-isolated runtime creation, evidence result, and second-tenant isolation |
| Permission scope | Search plus assignability, risk, and module URL state; reload persistence; reset and no-match behavior retained |
| Permission mutation | Immutable key, validation, confirmed DB persistence, immediate authoritative reload, and original metadata restoration |
| Authorization | Employee denial for catalog list/update and template lifecycle APIs |
| Backend regression | 15/15 focused template and permission API tests passed on disposable PostgreSQL |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift, and diff checks passed |
| Cleanup | Browser workspaces, phase tenants/users/templates, services, ports, and PostgreSQL container removed with absence evidence |

## Phase 5 handoff

Phase 5 covers Audit Logs and Data Governance. It should preserve tenant and evidence scope in the URL, standardize pagination and empty states, certify redacted payload review, and prove retention policy, legal hold, maker/checker, execution-boundary, cross-tenant, and non-platform restrictions.
