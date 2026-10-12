# Phase 3D.1 Portal Screen Inventory

Date: 2026-10-10  
Scope: ESS, MSS, Tenant Admin and Platform Admin.  
Method: static repository discovery only. No tests were executed and no staging/local configuration was changed.

## Discovery Summary

| Portal | Stable prefix | Screens | Child views / tabs / modals | Mapped actions | Primary implementation |
| --- | --- | ---: | ---: | ---: | --- |
| ESS | `P3D-ESS` | 7 | 21 | 47 | `web/src/app/ess/**`, `/api/me/**`, `web/src/lib/api.ts` |
| MSS | `P3D-MSS` | 3 | 8 | 19 | `web/src/app/mss/**`, `/api/manager/**` |
| Tenant Admin | `P3D-TADM` | 9 | 24 | 66 | `web/src/app/tenant-admin/**`, `/api/tenant-admin/**` |
| Platform Admin | `P3D-PADM` | 9 | 31 | 74 | `web/src/app/platform-admin/**`, `/api/platform/**` |
| Total |  | 28 | 84 | 206 |  |

Coverage distinction: this inventory records discovered implementation surfaces. Execution status for Phase 3D remains Not Run until portal certification is executed.

## ESS Inventory

| Screen ID | Route | Purpose | Child views / controls | Backend/API dependencies | RBAC/data boundary |
| --- | --- | --- | --- | --- | --- |
| `P3D-ESS-SCR-001` | `/ess` | Employee control center | Priority cards, leave/attendance shortcuts, payslip/document/tax/notification links, today attendance and recent signals | `getEssDashboard()` -> `/api/me/dashboard/` equivalent backend data via `web/src/lib/api.ts` | Requires ESS workspace access; only the signed-in employee's dashboard data should render. |
| `P3D-ESS-SCR-002` | `/ess/leave` | Employee leave requests and balances | Apply leave modal, request detail modal, status tabs, history filters, pagination, attachment download | `GET/POST /api/me/leave-requests`, `GET /api/me/leave-requests/{id}/attachments/{id}/download` | Employee can create/read own leave only; working-day, balance, overlap, attachment and approval validations come from leave services. |
| `P3D-ESS-SCR-003` | `/ess/attendance` | Employee attendance and regularization | Regularize attendance modal, regularization detail modal, status tabs, filters, pagination | `POST /api/me/attendance-regularizations`; dashboard/records from `getEssDashboard()` | Employee can submit own unlocked attendance corrections only; manager/HR approval remains external. |
| `P3D-ESS-SCR-004` | `/ess/documents` | Employee document center | Requirement detail modal, upload/re-upload modal, document review modal, filters, pagination, download | `getEssDocumentCenter()`, `POST /api/me/employee-documents`, `GET /api/me/employee-documents/{id}/download` | Employee can upload/download own documents only; HR review state and re-upload requirements are read-only to employee. |
| `P3D-ESS-SCR-005` | `/ess/payslips` | Published payslip self-service | Payslip detail panel, search/year/page-size filters, pagination, download, read acknowledgement guidance | `getEssPayrollPayslips()`, `GET /api/me/payroll-payslips/{id}/download`, read receipt action component | Employee can see/download only own published payslips; artifact access must be audited. |
| `P3D-ESS-SCR-006` | `/ess/statutory-declarations` | Employee tax declaration/proof workspace | Year rail, declaration modal, proof item modal, submit modal, proof detail modal, filters, pagination, file upload | `getEssStatutoryDeclarations()`, `POST/PATCH /api/me/statutory-declarations`, `/items`, `/proof-upload`, `/submit` | Employee can draft/submit own declaration; locked/submitted states restrict edits; payroll consumes accepted evidence. |
| `P3D-ESS-SCR-007` | `/ess/notifications` | Employee notification inbox | Shared notification center, filters, detail/source links, read/unread actions | `UserNotificationCenter` with `/api/me/notifications` | Employee receives only own notifications; source links must remain role-scoped. |

## ESS Action Map

| Functionality ID | Screen | Actions | Behavior / business rule | Coverage priority |
| --- | --- | --- | --- | --- |
| `P3D-ESS-FNC-001` | Dashboard | Navigate to leave, attendance, inbox, documents, payslips, tax | Links route to focused pages; no cross-role links should appear. | P1 |
| `P3D-ESS-FNC-002` | Leave | Apply, validate, attach evidence, submit | Client prevents empty fields; backend validates policy assignment, units, balance, overlaps, holidays and evidence. | P0 |
| `P3D-ESS-FNC-003` | Leave | Filter, tab, paginate, view detail, download attachment | URL-driven history; attachment download must be own-request scoped. | P1 |
| `P3D-ESS-FNC-004` | Attendance | Submit correction, validate locked/time-order/no-reason states | Backend records pending regularization for manager/HR review. | P0 |
| `P3D-ESS-FNC-005` | Attendance | Filter, tab, paginate, view detail | Employee sees own attendance/regularization only. | P1 |
| `P3D-ESS-FNC-006` | Documents | Upload/re-upload requirement evidence | Upload category, required expiry and file validation; HR review and notifications downstream. | P0 |
| `P3D-ESS-FNC-007` | Documents | Filter, review, download own document | Own-document isolation and artifact download authorization. | P0 |
| `P3D-ESS-FNC-008` | Payslips | Filter, paginate, view, download, read acknowledgement | Published-only scope; download/read audit evidence required. | P0 |
| `P3D-ESS-FNC-009` | Statutory | Create/update declaration, add proof, upload proof, submit | Draft/rejected editable; submitted/locked read-only; proof file/category validation. | P0 |
| `P3D-ESS-FNC-010` | Notifications | Filter, open source, mark read/unread | In-app delivery only unless external channels separately certified. | P1 |
| `P3D-ESS-FNC-011` | All | Responsive/empty/error/loading states | Compact screens must remain usable on desktop/tablet/mobile. | P1 |

## MSS Inventory

| Screen ID | Route | Purpose | Child views / controls | Backend/API dependencies | RBAC/data boundary |
| --- | --- | --- | --- | --- | --- |
| `P3D-MSS-SCR-001` | `/mss` | Manager control center | Leave/attendance queue cards, notification link, ESS cross-links, pending metrics | `getManagerDashboard()` equivalent via `web/src/lib/api.ts` | Requires MSS workspace access; visible queues depend on `leave.requests.approve` and attendance review permissions. |
| `P3D-MSS-SCR-002` | `/mss/approvals` | Manager approval queues | Leave tab, attendance tab, history placeholder, detail panels, decision dialog, pagination | `GET /api/manager/leave-approvals`, `GET /api/manager/attendance-regularizations`, `POST /api/manager/.../{id}/approve|reject` | Manager must see only direct/reporting-scope requests. Reject requires note. |
| `P3D-MSS-SCR-003` | `/mss/notifications` | Manager notification inbox | Shared notification center, approval handoff links, filters, read/unread | `/api/manager/notifications` | Manager receives team/workflow notifications only within scope. |

## MSS Action Map

| Functionality ID | Screen | Actions | Behavior / business rule | Coverage priority |
| --- | --- | --- | --- | --- |
| `P3D-MSS-FNC-001` | Dashboard | Navigate queues and ESS pages | Manager can reach MSS queues without HR escalation. | P0 |
| `P3D-MSS-FNC-002` | Approvals | Switch leave/attendance/history tabs | Permission-aware queue selection and empty states. | P1 |
| `P3D-MSS-FNC-003` | Approvals | Approve/reject leave | Reject note required; only pending/partially approved requests mutate. | P0 |
| `P3D-MSS-FNC-004` | Approvals | Approve/reject attendance regularization | Reject note required; records update downstream attendance state. | P0 |
| `P3D-MSS-FNC-005` | Approvals | Paginate and preserve selected detail | URL-driven queue/detail state. | P1 |
| `P3D-MSS-FNC-006` | Notifications | Filter/open/read manager notifications | Source links must not leak other teams or HR-only data. | P1 |
| `P3D-MSS-FNC-007` | All | RBAC/direct-report isolation | Non-manager and cross-tenant personas denied in UI and API. | P0 |
| `P3D-MSS-FNC-008` | All | Responsive/compact behavior | Decision modal and queue layout usable on smaller screens. | P1 |

## Tenant Admin Inventory

| Screen ID | Route | Purpose | Child views / controls | Backend/API dependencies | RBAC/data boundary |
| --- | --- | --- | --- | --- | --- |
| `P3D-TADM-SCR-001` | `/tenant-admin` | Tenant control center | Setup cards, commercial posture, account actions, audit export link | `GET /api/tenant-admin/console/` | Requires `tenant.dashboard.view`; cards hidden by permission. |
| `P3D-TADM-SCR-002` | `/tenant-admin/users` | Membership and access directory | Invite dialog, update roles dialog, access-status dialog, search, pagination | `POST/PATCH /api/tenant-admin/memberships` | `tenant.users.manage` required for mutations; last-admin/seat limits should protect tenant. |
| `P3D-TADM-SCR-003` | `/tenant-admin/roles` | Tenant role design | Create/edit role modal, permission module tabs, active toggle, search | `POST/PATCH /api/tenant-admin/roles` | `tenant.roles.manage` required; system roles protected; plan-unavailable permissions disabled. |
| `P3D-TADM-SCR-004` | `/tenant-admin/plan` | Plan, subscription and change requests | Change request form, JSON payload, approve/reject/apply/cancel actions, pagination | `POST/PATCH /api/tenant-admin/change-requests`, audit export | `tenant.plan.view`; `tenant.change_requests.manage` for lifecycle. |
| `P3D-TADM-SCR-005` | `/tenant-admin/setup` | Setup guide | Ordered launch path, owner links, status details | Console/readiness data | `tenant.setup.view`; primarily read/navigation. |
| `P3D-TADM-SCR-006` | `/tenant-admin/settings` | Account settings | Settings review/change-request route into plan workflow | Console/change-request APIs | `tenant.settings.view`; direct mutation appears routed through change requests. |
| `P3D-TADM-SCR-007` | `/tenant-admin/support-access` | Scoped support access governance | Request form, scope picker, approve/reject/start/end/revoke, search, pagination | `POST/PATCH /api/tenant-admin/support-access-grants` | Request/approval permissions split; time-bound scopes; audit required. |
| `P3D-TADM-SCR-008` | `/tenant-admin/security-readiness` | Enterprise security readiness | MFA/SSO/SCIM/session/audit/data-protection checks and owner links | `GET /api/tenant-admin/security-readiness/` | `tenant.security.view`; read-only posture page. |
| `P3D-TADM-SCR-009` | `/tenant-admin/trust-audit` | Customer-visible audit evidence | Event group/type/source/support filters, pagination, audit export download | `GET /api/tenant-admin/trust-audit/`, `/commercial-support-audit/download/` | `tenant.audit.view/export`; tenant-scoped evidence only. |

## Tenant Admin Action Map

| Functionality ID | Screens | Actions | Behavior / business rule | Coverage priority |
| --- | --- | --- | --- | --- |
| `P3D-TADM-FNC-001` | Dashboard | Read commercial/security/setup posture, navigate focused pages, export audit when allowed | Dashboard is summary only; action ownership lives in child pages. | P1 |
| `P3D-TADM-FNC-002` | Users | Invite member, assign roles, suspend/reactivate/revoke | Email/username/role validation, tenant membership lifecycle, audit, seat and last-admin guards. | P0 |
| `P3D-TADM-FNC-003` | Users | Search, paginate, empty state, role coverage | Directory stays tenant-scoped and compact. | P1 |
| `P3D-TADM-FNC-004` | Roles | Create/edit custom role, activate/deactivate | System roles protected; permission catalog governs assignable keys. | P0 |
| `P3D-TADM-FNC-005` | Roles | Search/filter permission modules and unavailable permissions | Plan/module gates visible and enforced. | P1 |
| `P3D-TADM-FNC-006` | Plan | Create change request | Required title/target/valid JSON validation. | P0 |
| `P3D-TADM-FNC-007` | Plan | Approve/reject/apply/cancel change request | Decision note required for sensitive transitions; audit preserved. | P0 |
| `P3D-TADM-FNC-008` | Support Access | Request support grant with scopes/duration/reason | Valid agent, duration bounds, scopes and reason required. | P0 |
| `P3D-TADM-FNC-009` | Support Access | Approve/reject/start/end/revoke grant | Only permitted lifecycle transitions; session scope and evidence retained. | P0 |
| `P3D-TADM-FNC-010` | Security | Review readiness checks | Readiness must distinguish warning/blocker and route to owner pages. | P1 |
| `P3D-TADM-FNC-011` | Trust Audit | Filter, paginate, download audit pack | Tenant-only audit data; export permission required. | P0 |
| `P3D-TADM-FNC-012` | All | RBAC/tenant isolation | Employee, manager, HR admin, platform admin and support roles must fail closed unless granted. | P0 |
| `P3D-TADM-FNC-013` | All | Responsive/modal usability | Dialog focus, Escape, validation copy, compact mobile pages. | P1 |

## Platform Admin Inventory

| Screen ID | Route | Purpose | Child views / controls | Backend/API dependencies | RBAC/data boundary |
| --- | --- | --- | --- | --- | --- |
| `P3D-PADM-SCR-001` | `/platform-admin` | Platform control center | Control metrics, selected tenant context, panel navigation | `GET /api/platform/summary/` | Platform operator only; tenant users denied. |
| `P3D-PADM-SCR-002` | `/platform-admin/leads` | Public lead review | Search/status filters, lead detail, mark reviewing/qualified/closed, convert to tenant | Platform public-lead APIs | Platform-only; conversion creates tenant/onboarding records. |
| `P3D-PADM-SCR-003` | `/platform-admin/tenants` | Tenant registry | Search/status/plan filters, create tenant dialog, select tenant | Platform tenant APIs | Platform-only cross-tenant controls. |
| `P3D-PADM-SCR-004` | `/platform-admin/launch` | Launch blueprint safe apply | Blueprint selection, launch inputs, preview, apply, certification refresh | Tenant launch preview/apply APIs | Preview non-mutating; apply limited to certified safe seeders and subscription scope. |
| `P3D-PADM-SCR-005` | `/platform-admin/onboarding` | Tenant onboarding workflow | Metadata, baseline/adoption, handoff, activation gates, drift/repair/upgrade sections | Platform onboarding APIs | Activation blocked until baseline/admin/handoff gates pass. |
| `P3D-PADM-SCR-006` | `/platform-admin/admins` | Tenant admin contacts and access | Contact CRUD, provision first admin, readiness dependency | Platform onboarding admin APIs | Platform-only; creates tenant admin access through supported workflow. |
| `P3D-PADM-SCR-007` | `/platform-admin/policy-packs` | Setup template/policy pack lifecycle | Create/edit item, publish, adopt preview, adopt/apply, clone, compare, upgrade apply | Platform policy-pack APIs | Published locks, versioning, conflict detection, tenant adoption evidence. |
| `P3D-PADM-SCR-008` | `/platform-admin/audit-logs` | Platform onboarding audit evidence | Event list/detail, tenant/context filters | Platform onboarding event APIs | Platform-only evidence; selected tenant context must not leak between tenants. |
| `P3D-PADM-SCR-009` | `/platform-admin/permissions` | Platform permission catalog | Search/filter/module grouping, edit permission dialog | `GET/PATCH /api/platform/permission-catalog/{key}` | Platform-only; DB catalog metadata changes do not change runtime permission key contract. |

## Platform Admin Action Map

| Functionality ID | Screens | Actions | Behavior / business rule | Coverage priority |
| --- | --- | --- | --- | --- |
| `P3D-PADM-FNC-001` | Control | Read dashboard counts, tenant context, navigate panels | Counts should reconcile to platform APIs. | P1 |
| `P3D-PADM-FNC-002` | Leads | Filter/search, qualify/review/close, convert lead | Duplicate prevention and tenant field mapping; audit evidence. | P0 |
| `P3D-PADM-FNC-003` | Tenants | Create/update/suspend/reactivate tenant | Tenant lifecycle transitions and audit; no customer data overwrite. | P0 |
| `P3D-PADM-FNC-004` | Launch | Select blueprint, validate inputs, preview, apply | Preview non-mutating; apply requires certified safe modules and change reason after prior apply. | P0 |
| `P3D-PADM-FNC-005` | Onboarding | Update metadata, handoff, activate | Gates block premature activation; handoff records audit. | P0 |
| `P3D-PADM-FNC-006` | Admins | Contact CRUD, provision first admin | Valid identity required; tenant admin access dependency for launch. | P0 |
| `P3D-PADM-FNC-007` | Policy Packs | Create/edit item, publish, clone, adopt preview/apply, compare/upgrade, drift/repair | Published locks, conflict reporting and runtime record generation must be deterministic. | P0 |
| `P3D-PADM-FNC-008` | Audit Logs | Filter/open evidence | Platform actions produce tenant-specific evidence after refresh. | P1 |
| `P3D-PADM-FNC-009` | Permissions | Filter catalog, edit metadata, restore | Runtime enforcement must remain unchanged; platform-only permissions protected. | P0 |
| `P3D-PADM-FNC-010` | All | RBAC/cross-tenant isolation | Tenant/HR/ESS/MSS users denied platform UI and APIs; two-tenant isolation required. | P0 |
| `P3D-PADM-FNC-011` | All | Responsive/modal validation | Keyboard focus, Escape, current compact layout and clear validation. | P1 |

## Known Conditional or Unknown Behavior

| ID | Area | Classification | Notes |
| --- | --- | --- | --- |
| `P3D-GAP-ESS-001` | ESS payslip on deployed staging | Known fixture limitation | Phase 4B.3 accepted empty-state/no-leakage staging evidence because the current ESS staging persona had no published payslip. Local payroll suites provide owner-download proof, but Phase 3D should create a deterministic portal fixture. |
| `P3D-GAP-MSS-001` | MSS completed decision history | Placeholder/partial implementation | `/mss/approvals?queue=history` explicitly says completed-decision feed will be wired later. Treat as product gap, not failed test, until requirement is approved. |
| `P3D-GAP-TADM-001` | Tenant Admin settings direct mutation | Unknown/indirect | Settings page appears to route account changes through change requests. Phase 3D should verify requirements before expecting direct settings save. |
| `P3D-GAP-PADM-001` | Platform admin broad route-menu suite | Stale/timebox historical issue | Phase 4B.3 focused API/two-tenant proofs passed; broad route-menu checks had stale/timebox failures and should be cleaned before treating as release evidence. |
| `P3D-RISK-PERSIST-001` | Phase 4B deployment persistence | Drift risk | Source-controlled `staging.py` and `ops/ec2/nginx/hrms.conf` contain fixes, but active nginx target naming/runbook should be reconciled so HSTS survives normal redeploys. |

## Module-Wise Discovery Coverage

| Portal | Discovery coverage | Unresolved discovery gaps |
| --- | --- | --- |
| ESS | High: all routes, principal actions, APIs and existing tests identified. | Exact backend route names for every `/api/me/**` proxy should be confirmed in Phase 3D.2 execution evidence. |
| MSS | High for current screens. | Completed decision history is not live; direct-report negative API proof needs fresh run. |
| Tenant Admin | High: route/menu/API/action split is clear. | Settings/setup mutation boundaries need requirements confirmation; two-tenant deployed tenant-admin proof should be repeated in Phase 3D execution. |
| Platform Admin | High: platform panels and dedicated permission route mapped. | Some platform console mutation endpoints are embedded in a large client component; Phase 3D.5 should verify each with fresh scenario evidence. |
