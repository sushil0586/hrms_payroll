# Organization and Employee Lifecycle — screen and contract inventory

Prepared: 23 October 2026. Phase 1 source/rendered baseline complete within the [baseline record](hrms-organization-lifecycle-phase1-design-baseline.md). Implementation follows the [six-phase plan](hrms-organization-lifecycle-makeover-plan.md). [Machine-readable routes](hrms-organization-lifecycle-route-inventory.json).

## Owning routes

| Family | Route patterns | Variants and owned components | Phase |
| --- | --- | --- | --- |
| Organization | `/hr-admin/organization`; `/organization/[section]/new`; `/organization/[section]/[itemId]/edit` (all under `/hr-admin`) | Nine section catalogs, selected detail, `organization-form.tsx`, guided setup and CSV workbench | 2 |
| Shared lifecycle | `/hr-admin/lifecycle` | Queue filters, detail, owner/status bulk actions, `editRecord=<type>:<id>`, shared work-item editor | 3; movement/exit consumers in 4/5 |
| Onboarding | `/hr-admin/onboardings`; `/new`; `/[itemId]/edit` | `onboardingModal=create`, `editOnboarding=<id>`; queue and form | 3 |
| Probation | `/hr-admin/probation-reviews`; `/new`; `/[itemId]/edit` | `reviewModal=create`, `editReview=<id>`; queue and form | 3 |
| Movements | `/hr-admin/movements`; `/new`; `/[itemId]/edit` | `movementModal=create`, `editMovement=<id>`; queue and form | 4 |
| Exits | `/hr-admin/exits`; `/new`; `/[itemId]/edit` | `exitModal=create`, `editExit=<id>`; queue and form | 5 |
| Reports | `/hr-admin/reports/lifecycle-queue`; `/hr-admin/reports/lifecycle-aging` | Complete bounded population, copied filters, local paging, CSV/manifest/print handoffs | 3, joined closure in 6 |

Total: **18 route patterns**. Parameterized section editors cover nine distinct field/dependency variants, not one tested master. Query dialogs are additional states of existing routes, not extra route patterns. Organization master keys: `legal_entities`, `locations`, `branches`, `business_units`, `departments`, `cost_centers`, `grades`, `designations`, `employment_types`.

## Query and scope contracts

Organization uses `section`, `q`, `status`, `page`, `page_size`, `itemId`; snapshot filtering/paging is local to the loaded organization snapshot. Requested page size is bounded to 50 at the page adapter. Phase 2 removed automatic fallback: selected detail is explicit and stale/missing selection is deliberate. Deactivation guidance and hierarchy relationships must retain their owning services.

Lifecycle inbox uses `q`, `item_type`, `status`, `employee_id`, `owner`, `primary_date_from`, `primary_date_to`, `page`, `page_size` and selected/detail/edit state. Dedicated queues preserve their own status/decision/type/owner variants; normalize them from each page adapter rather than forcing identical query keys. Backend list page size is capped at 100. Phase 3 reports collect complete bounded live data (maximum 10,000), synchronize supported filters/date to copied URLs, and export all matching records.

Phase 3 removes page-local selection gates from the shared inbox and dedicated onboarding/probation query editors through independent authorized reads. The inbox supports explicit `record=<type>:<uuid>` and `editRecord` across all four types. Phase 4 also independently reads dedicated movement query edits; Phase 5 independently reads dedicated exit query edits as well. Standalone onboarding/probation and report return links were verified separately.

## Backend and authorization ownership

| Contract | Source / boundary |
| --- | --- |
| Organization snapshot/options/detail | `getHrAdminOrganizationSnapshot`, options/item API helpers; backend `HrAdminOrganization*View` in `backend/apps/common/api_views.py`; reads require `organization.view` |
| Organization create/update/import | Existing write serializers and organization services; require `organization.manage`. Manage permission alone does not satisfy options/snapshot read dependencies |
| Lifecycle options, queue, four record collections/details and bulk actions | `HrAdminLifecycle*`, Onboarding/Probation/Movement/Exit views in common `api_views.py`; broad HR context and tenant lookups. Operation-specific lifecycle permission policy needs explicit assessment |
| Effective employment history | `backend/apps/employee_lifecycle/models.py`, `effective_services.py`; preserve movement/assignment and employee-state contracts |
| Reports | Owning report pages/workspaces plus `web/src/app/api/hr-admin/reports/[reportKey]/route.ts`; `getLifecycleQueueExportRows` serves both keys through the shared bounded complete collector and selector in `web/src/lib/lifecycle-report.ts` |
| Client data and proxy contracts | `web/src/lib/api.ts`, `types.ts`, `web/src/app/api/hr-admin/organization/**`, lifecycle record/action proxies |

Adjacent sources include employee master/profile, Documents requirements and attention, workflow templates, lifecycle notifications, HR reports and payroll/settlement consumers. No dedicated Organization/Employment Lifecycle ESS or MSS route was identified by the source search; an ESS leave-request lifecycle helper is a different domain and is not added to this family.

## Historical baseline and phase acceptance

The Phase 1 baseline captured all 18 route patterns through 54 concrete states at 1440/320 widths: all nine catalog/new/edit variants, inbox/reports, four queue/new/edit/create-dialog/edit-dialog sets, no matches, stale organization selection and an off-page probation edit. Hub captures at 1024/768/390 and a lifecycle-view-only render bring the total to 115.

Phase 1 captures and GET probes are a discovery baseline. Organization implementation and its bounded acceptance now belong to the [Phase 2 record](hrms-organization-lifecycle-phase2-makeover.md): all nine catalog/editor variants, expanded guided/import, representative persisted writes, keyboard/draft/pending/unknown outcomes and read dependencies. Lifecycle detail/edit variants, genuine empty-tenant/service-outage coverage, report bytes and exhaustive domain/role/tenant cases retain their owning implementation or closure gates. Phase 2 does not close these whole-family gates.

Current Phase 3 acceptance: [implementation record](hrms-organization-lifecycle-phase3-makeover.md), 45 main browser checks plus three inspector checks, six report contract tests and retained 128-row exports. OL-C01 is resolved within its declared collection limits; Phase 4 closes OL-C02 for dedicated movement editors; Phase 5 closes the dedicated exit-editor portion within its recorded scope; OL-C03 remains open. These results do not replace Phase 1 historical counts or certify remaining family routes.

[Phase 4 movement acceptance](hrms-organization-lifecycle-phase4-makeover.md) adds all eight structural pairs and preserves source manager/snapshot, effective-history consequences, guarded writes and supported return scope: 27 main browser checks plus three handoff checks and two existing PostgreSQL domain tests. Exit and joined closure scopes remain open.

[Phase 5 exit acceptance](hrms-organization-lifecycle-phase5-makeover.md) records 33 browser checks, four existing PostgreSQL exit-contract tests, preserved clearance/workflow/date/employee-state behavior and the shared owner-display correction, including its onboarding consumer. Joined closure, exhaustive permutations and OL-C03 remain open.


## Current joined acceptance

[Phase 6 closure](hrms-organization-lifecycle-phase6-closure.md) supersedes the earlier next-phase statements above for current delivery status. All 18 route patterns and nine Organization variants are included in the bounded joined UI acceptance: 150 main checks and three inline checks on one current production build in Chromium/Firefox/WebKit, six report contract tests, six existing domain tests, retained 128-row exports for both reports, 531 captures and 22 inspected representative images. The final report wording/owner polish and deliberate Organization read-failure guards are included. Exact source/fixture/storage/process cleanup is recorded in the closure evidence.

OL-C01 and OL-C02 are resolved within their stated collection/lookup bounds. OL-C03 remains open: employee and manager UI access is denied without an HR workspace, but the manager's direct lifecycle API read remains allowed, and the existing view-only fixture can write bulk ownership. No lifecycle authorization-policy migration or exhaustive security/assistive-technology/concurrency certification is implied. Other HRMS screen families retain their own rollout gates.
