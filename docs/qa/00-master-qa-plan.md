# HR Admin Master QA Plan

Date: 2026-10-09
Phase: Phase 1 discovery and functionality mapping only
Execution status: Static repository discovery only. No browser tests, API calls, migrations, seed scripts, or automated test suites were executed for this phase.

## Scope

This pass focuses on the HR Admin application surface under `web/src/app/hr-admin`, the HR Admin navigation model in `web/src/lib/ui/navigation.ts`, and the HR Admin backend API routes exposed through `backend/apps/common/api_urls.py`.

The purpose of Phase 1 is to create a production-readiness map before any execution begins:

- inventory routes, screens, child screens, tabs, disclosures, modal-like panels, review pages, and wizards;
- map visible and conditional actions to frontend behavior, API endpoints, permission checks, and data dependencies where the repository makes them explicit;
- identify CRUD, approval workflows, state transitions, validations, and cross-module dependencies;
- separate repository-verified behavior from runtime-unknown behavior;
- assign stable IDs that Phase 2 browser automation can use as the permanent checklist.

## Evidence Sources

Static discovery covered:

- `web/src/app/hr-admin/**`
- `web/src/lib/ui/navigation.ts`
- `backend/apps/common/api_urls.py`
- permission guards using `requireSessionPermission`, `requireWorkspaceAccess`, `sessionHasPermission`, and navigation permission metadata;
- HR Admin frontend action patterns including `Link`, `button`, form actions, `fetch`, filters, pagination, bulk actions, import workbenches, disclosures, and review screens;
- HR Admin API route patterns under `/api/hr-admin/**`.

No runtime behavior is certified in this phase. Anything dependent on rendered data, tenant configuration, feature entitlements, role-specific session state, network responses, browser events, or object status must remain `Runtime unknown` until Phase 2.

## Stable ID Model

Screen IDs use:

`HRADM-SCR-<AREA>-NNN`

Functionality IDs use:

`HRADM-FNC-<AREA>-NNN`

Areas:

| Area | Meaning |
| --- | --- |
| `CMD` | HR Admin command center, dashboard, launch readiness, SaaS operations |
| `WF` | Workforce, employees, lifecycle, access, bank accounts |
| `DOC` | Employee documents, document setup, generated letters |
| `TLA` | Time, leave, attendance, shifts, roster, calendars |
| `PAY` | Payroll setup, salary, rules, inputs, calculation, review, outputs, handoff, providers, statutory, adjustments, settlements |
| `REP` | Reports, report families, exports, evidence manifests |
| `NOTIF` | Notification setup, diagnostics, delivery, queue, review |
| `SET` | Organization setup, workflows, workflow assignments |
| `AUD` | Audit, import history, export audits |

Status labels:

- `Static verified`: discovered in actual repository implementation.
- `Conditional`: available only when permission, data state, feature flag, governance lock, or route parameter allows it.
- `Runtime unknown`: behavior requires browser/API execution in Phase 2.
- `Potential gap`: static discovery found disabled, unreachable, placeholder-like, or incomplete behavior that needs confirmation.

## Module Coverage Summary

| Module | Route/API discovery | Action discovery | Permission discovery | Runtime coverage | Phase 1 status |
| --- | ---: | ---: | ---: | ---: | --- |
| Command and launch readiness | High | Medium | High | Not run | Static mapped |
| Workforce and employee operations | High | High | High | Not run | Static mapped |
| Documents and generated letters | High | High | High | Not run | Static mapped |
| Time, attendance, leave, shifts, roster | High | High | High | Not run | Static mapped |
| Payroll control, setup, statutory, providers | High | High | High | Not run | Static mapped |
| Reports and exports | High | High | Medium | Not run | Static mapped |
| Notifications | High | High | High | Not run | Static mapped |
| Organization and workflows | High | High | High | Not run | Static mapped |
| Audit and imports | High | Medium | Medium | Not run | Static mapped |

## Phase 2 Quality Gates

Phase 2 must not start until the three Phase 1 files are accepted as the baseline. When Phase 2 starts, every discovered screen should be exercised through browser-based Playwright, grouped by module.

Each screen must be checked for:

- navigation reachability from sidebar, search destination, direct URL, and deep link where applicable;
- permission allow/deny behavior for HR admin, manager, employee, payroll, finance, and tenant admin roles where routes overlap;
- compact professional UI layout, including small font scale, slim controls, low-scroll operation, single-responsibility pages, and modal/drawer/detail-panel behavior where intended;
- filters, sorting, pagination, empty states, loading states, and error states;
- create, update, delete, bulk, import, export, approve, reject, lock, unlock, publish, transmit, retry, and revoke actions;
- validation messages and disabled states;
- audit evidence creation and cross-module side effects.

## Cross-Module Dependency Map

| Source module | Depends on | Repository-verified dependency |
| --- | --- | --- |
| Employees | Organization setup, managers, workspace roles | employee forms and imports use organization units, departments, managers, employment status, access, bank account data |
| Lifecycle | Employees, workflow templates, documents | onboarding, probation, movements, and exits link back to employee identity, owners, readiness, missing documents, and workflow state |
| Documents | Employees, document categories, requirements | employee document review, category setup, requirement setup, and generated letters depend on employee and policy metadata |
| Attendance | Employees, shifts, calendars, policies, leave | attendance records include shift, lock, regularization, leave collision, derivation, and payroll-impact state |
| Leave | Employees, leave types, leave policies, attendance, payroll | leave requests, balances, assignments, and collision reports connect to attendance derivation and payroll impact |
| Roster | Employees, shifts, calendars | shift assignments and roster rollout depend on shift definitions, holiday calendars, and employee scope |
| Payroll | Employees, attendance, leave, salary setup, rules, statutory setup, providers | inputs, snapshots, calculation, review, outputs, handoff, and statutory filing use upstream HR/time data |
| Reports | All operational modules | reports expose filtered read models and deep links back to operational screens |
| Notifications | Workflows, documents, payroll, lifecycle, providers | templates, events, queue retries, diagnostics, and review use cross-module event and delivery metadata |
| Audit/imports | All modules | import history and audit surfaces track mutations, bulk imports, exports, and operational evidence |

## Unimplemented or Partial Indicators

Static scan did not find a broad HR Admin `coming soon` implementation pattern. The following require Phase 2 confirmation:

- governance-locked edit paths display "Direct edit unavailable" in some screens; static evidence suggests intentional lock behavior, not necessarily incomplete functionality;
- many actions are conditionally disabled by permission, selection count, record status, lock status, readiness state, or missing data;
- several pages use form posts to `/api/hr-admin/**` routes where success/error UX must be verified in a browser;
- deep report and evidence links depend on runtime data IDs and cannot be proven reachable statically;
- modal, drawer, and disclosure behavior is mostly implemented as inline detail panels, `details` disclosures, query-selected panels, and review screens rather than a single modal component.

## Unresolved Phase 1 Gaps

- Role-specific hidden screens are statically identified through route and permission metadata, but exact rendered visibility must be verified with real sessions.
- Conditional action availability for payroll close states, published outputs, provider jobs, statutory declaration locks, attendance locks, and document review states is runtime unknown.
- API serializer validation and business-rule error messages are not certified by static frontend/API route mapping.
- Import workbench CSV edge cases, duplicate handling, and partial failure UX are runtime unknown.
- Export authorization, signed URL access, audit manifest generation, and provider callback behavior need browser/API execution.
- Every compact UI requirement needs browser screenshot review in Phase 2; Phase 1 only inventories where those checks must apply.

Phase 2 is intentionally not started by this document.
