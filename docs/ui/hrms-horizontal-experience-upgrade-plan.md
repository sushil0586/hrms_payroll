# HRMS horizontal experience upgrade plan — UX-0

Implementation follow-up: ESS-1 has been explicitly authorized after UX-0. The discovery/specification below is the retained UX-0 baseline. Current implementation and evidence are maintained in the [ESS tracker](hrms-ess-coverage-tracker.md) and [ESS-1 certification](hrms-ess1-dashboard-profile-certification.md).

Date: 2026-10-18 (Asia/Kolkata). Status: design specification only; UX-1 not started.

## Scope and evidence limits

Read-only repository discovery covers the five Next.js workspaces, their layouts, reusable patterns, Django routes, employee serializers/models, authorization and retained QA reports. The companion coverage tracker inventories every current workspace `page.tsx` and registered API path in the inspected URL files. Findings describe source behavior and prior certification, not newly executed browser certification. No authenticated local or staging browser walkthrough was run in UX-0; pixel-level spacing, contrast, device behavior and deployed tenant policy remain validation tasks. Public reference analysis uses official product/help material, not authenticated competitor accounts. No proprietary assets or layouts are reproduced.

Only these three planning documents are authored. Existing working-tree changes, application code, databases, migrations, credentials, Lightsail resources and historical certification artifacts are outside this change.

## Established interface standard and discovery totals

The existing [interface coverage tracker](hrms-interface-coverage-tracker.md) and [surface inventory](hrms-interface-inventory.json) already establish the employee directory/create-edit modal as the compact operational reference: table-first comparable records, compact summary/filter strip, selected-row highlight, inspection drawer and guided forms. This plan extends that standard; it does not replace it with a second visual system. Dashboard and personal-profile sections may use summaries/definition lists; operational queues remain table-first. Keep guided modal Back/Continue/final Save behavior where applicable.

The current source census finds **178 workspace page entry points** (ESS 7, MSS 3, HR Admin 146, Tenant Admin 12, Platform Admin 10) and **372 API path registrations** across common/auth/platform/policy registries. The older interface tracker has lower route counts in several workspaces; retain it as historical context and use the new source census for this proposal, without rewriting previous evidence. Dynamic routes count once; these are source entry points, not a claim of 178 newly verified pages.

## Current state and preservation priorities

| Finding | Evidence | Product implication and preservation rule |
|---|---|---|
| ESS already has a compact control header, attendance strip, actions, shortcuts, profile snapshot and leave balances | [ESS page](../../web/src/app/ess/page.tsx) | Evolve the functioning surface; avoid replacing it with a generic greeting/dashboard template. |
| Pending leave/corrections are described as employee attention although normally awaiting manager review; documents/payslips have literal Ready status | ESS `commandActions`, `activeSignals`, `essActionStatus` | Separate employee tasks, requests awaiting others and neutral shortcuts. A link is not a readiness result. |
| Leave and regularization counters recur in the summary, action table and Today card; Apply leave recurs in three places | ESS page | One summary count, one contextual destination; repeat a CTA only where it completes a local task. |
| Profile has no dedicated ESS route or edit workflow | [ESS layout](../../web/src/app/ess/layout.tsx), [MeProfileView](../../backend/apps/common/api_views.py), [profile serializer](../../backend/apps/common/api_serializers.py) | Introduce a read-only My Profile first. Do not infer edit rights from possession of an employee record. |
| Personal email/phone are already in the self-profile response; addresses, emergency contacts and DOB are not | `EmployeeContextMixin.build_profile_payload`, `EmployeeProfileSerializer`, [employee models](../../backend/apps/employees/models.py) | Reuse the safe existing projection; a database field is not an ESS API entitlement. |
| Current dashboard accessor couples three requests with Promise.all | [getEssDashboard](../../web/src/lib/api.ts) | A failed history request can reject the whole accessor; later isolate optional panels without disguising authorization failures. |
| MSS gates decisions by permission and backend current approver/direct-manager scope | [MSS page](../../web/src/app/mss/page.tsx), `ManagerDecisionMixin` in common API views | Keep assignment authority and decision idempotency; team counts must link to matching scoped content. |
| HR already has an employee selection workbench and access/bank dialogs | [employee directory](../../web/src/app/hr-admin/employees/page.tsx) | Preserve URL selection, latest-selection protection, imports, access separation and bank controls. Do not reuse its broad DTO for ESS. |
| Navigation is catalog-driven with permission-filtered fallback | [menu catalog](../../web/src/lib/ui/menu-catalog.ts), [workspace access](../../web/src/lib/workspace-access.ts) | Update catalog and fallback together; workspace switching uses authoritative session access. Audit role-name shortcut logic in ESS layout. |
| Multiple visual primitives coexist: PageIntro, workspace-control-header, workspace-standard-header, status/readiness classes | [patterns](../../web/src/components/patterns), [global styles](../../web/src/app/globals.css) | Converge contracts gradually. Large layered stylesheet and workspace-specific overrides create regression risk; excess whitespace is a source-level concern pending viewport measurements. |
| Shared async buttons, downloads, skeletons, toast, errors, modal and upload progress exist | patterns directory; [UI helpers](../../web/src/lib/ui) | Reuse tested behavior. Avoid a parallel component library. |
| Documents, statutory declarations, payslip downloads/read receipts and notifications have real self-service routes | [common URL registry](../../backend/apps/common/api_urls.py), ESS child pages | Preserve these workflows and their current state constraints; expose them contextually on profile. |
| Demo data is explicitly opt-in and prohibited in production runtime | [runtime flags](../../web/src/lib/runtime-flags.ts) | Keep fail-closed behavior; never use sample balances or fallback identities after a live request fails. |

## Reference interaction analysis

Reviewed official sources on 2026-10-18. Product descriptions establish patterns, not proof that every interaction is available in every edition.

| Reference | Supported pattern | Adaptation to this HRMS |
|---|---|---|
| [BambooHR mobile](https://www.bamboohr.com/ca/platform/hr-data-and-reporting/mobile-app) and [document help](https://help.bamboohr.com/s/article/1098497) | Employee tasks and documents on mobile; help search material ties document upload visibility to web access (full article requires community access) | Keep mobile tasks short and permission-aware. No inference of local upload authority. |
| [Zoho People ESS handbook](https://help.zoho.com/portal/en/kb/people/zoho-people-4-0/employee-handbook-zoho-people-4-0/employee-self-service/articles/zoho-people-employee-self-service), [approvals](https://help.zoho.com/portal/en/kb/people/administrator-guide/common-settings/articles/approvals-overview-use-cases) | Profile, team, files and attendance are connected services; permissions govern features and approvals are configured | Sectioned profile with contextual links. No universal approval chain or automatic profile editing. |
| [HiBob employee experience](https://www.hibob.com/platform/employee-experience-software/), [employee database](https://www.hibob.com/platform/employee-database-software/) | Person record connects documents/history and organization context; homepage can carry company news | Employee 360 navigation over authorized projections. News only if a real scoped publishing source exists. |
| [Darwinbox employee experience](https://darwinbox.com/en-us/solutions/use-cases/employee-experience) | Public material emphasizes employee self-service and mobile adoption; regional redirect limits detailed interaction evidence | Task-first responsive entry points; no claim to have inspected its private dashboard or approval implementation. |

Design inference: compact information hierarchy, clear ownership of tasks, consistent review surfaces and context-preserving navigation matter more here than decorative cards. These are original recommendations, not copied layouts.

## Navigation and information architecture

Retain current routes and deep links. Add proposed `/ess/profile` with stable `section` query values; Overview is the default. ESS primary navigation: Home, My Profile, Attendance, Leave, Documents, Payslips, Tax declarations, Inbox. A profile section links to existing canonical modules rather than duplicating their mutation implementation. Do not add a directory to ESS until a separately authorized public employee projection exists.

MSS: Dashboard, Approvals, Inbox; make Personal workspace a clear workspace switch, not a mixed team/personal queue. Team context remains scoped to backend authority. A future team view needs a dedicated read contract; an approvals queue is not an employee directory.

HR Admin groups: People (directory, lifecycle, documents), Time and leave (attendance, rosters, close, leave), Payroll (setup, inputs, runs, review, outputs, settlements), Reports and compliance, Operations (notifications, workflows), Setup (organization and policies). Preserve existing URLs, report-family submenus and active selection.

Tenant Admin groups: Account overview, Users and roles, Setup and calendars, Plan and usage, Security and support, Data governance and audit, Settings. Platform Admin groups: Overview, Leads and onboarding, Tenants, Admin access and permissions, Policy packs, Launch readiness, Governance and audit. Do not collapse platform access into tenant RBAC.

Global shell: persistent workspace/tenant identity, one active navigation item, breadcrumb for nested details, keyboard skip link, permission-filtered workspace switch and compact mobile menu. Search must state its actual scope; do not imply global employee search where only navigation search exists. Hide unauthorized destinations, while backend rejects direct requests independently. Distinguish lack of permission, disabled launch capability and missing data.

## Reusable design-system contracts

Use existing primitives as starting points; names below are target contracts, not new code delivered in UX-0.

| Pattern | Contract and reuse | Acceptance |
|---|---|---|
| Shell/navigation | WorkspaceChrome and HrAdminChrome; menu-catalog permissions and current URL | Accessible current-page state, history restores context; no unauthorized content flash. |
| Page header | Converge PageIntro/WorkspaceStandardHeader; title, one-line context, maximum one primary and two secondary actions | One h1; no slogan/pill strip displacing useful content. |
| Filter bar | WorkspaceFilterBar, labelled controls, URL query, explicit clear, total and active-filter summary | Back/forward restores controls/results; stale searches cannot replace latest results. |
| Table | WorkspaceDataTable + PaginationBar; semantic caption/headers, real sort only where supported, selection identity and scoped row action menu | Filtered totals match API, row actions keyboard usable, no invented bulk capability. |
| Detail panel | Stable employee/request ID, title, status, owner, effective date, provenance and allowed actions | Correct latest selection during races; escape/close returns focus and preserves list query. |
| Drawer/modal | Extend HrAdminActionModal after cross-workspace audit; labelled dialog, focus trap, dirty guard, error summary, footer | Mobile full-width, no nested modal stacks, focus remains usable after delayed hydration/failure. |
| Form | FormSection, AsyncActionButton, json-mutation, validation helpers; backend field errors and one authoritative confirmation | Preserve inputs on recoverable failure; block duplicate activation; no success before commit. |
| Profile section | Definition-list fields, disclosure classification and section-local actions | No edit pencil without an approved write contract; distinguish withheld from not recorded. |
| Status | WorkspaceStatusBadge with neutral/info/success/warning/danger; text is domain status, tone is presentation | Pending is not failure; absent/error is not zero/Ready; color never carries meaning alone. |
| Loading | workspace-loading, skeletons and navigation feedback | Initial shell stable; local aria-busy; retain prior content only within same authorized identity. Clear it on identity/session change. |
| Error/validation | WorkspaceErrorState, action-toast, inline error and accessible summary | Retry targets failed operation; 401 prompts reauthentication, 403 removes blocked action, conflict refreshes record without auto-repeat. |
| Confirmation | Action-specific object, consequence, period/effective date and required reason | Safe default focus; destructive/payroll transitions remain governed by current backend. |
| Empty state | Heading, reason, scoped next action | Separate no records, no filter matches, no permission, unavailable and unconfigured. |
| Upload/download | upload-progress, AsyncDownloadButton and existing secure grants | Check policy, owner and release scope; preserve quarantine/access controls; one current artifact per click. |

Visual tokens proposed for later validation: 4/8px spacing rhythm; 16–24px panel padding; 12–16px gaps; 14px body minimum, 12px secondary text minimum; readable 1.4–1.5 line height; neutral surfaces with a restrained workspace accent. Desktop rows approximately 44px, touch targets at least 44px. Tokens must be checked against current CSS before consolidation. Meet WCAG 2.2 AA with 4.5:1 normal text contrast, visible focus and 200% zoom/reflow. No reduction in usability to achieve density.

At >=1200px use bounded two-column dashboard content; 768–1199px use flexible paired panels; below 768px use one task-ordered column, collapsible menu and full-width dialogs. At 390px and 320px no page overflow; wide tables scroll in labelled regions while essential actions remain reachable. Avoid truncating names/status without an accessible full value. Reduced motion disables decorative transitions. Sticky headers/footers must not cover errors or keyboard focus.

## API and backend development boundary

Reuse session, `/me/profile/`, `/me/dashboard/`, leave/attendance summaries and histories, document center, published payslips, declarations and notifications. The ESS specification maps each panel to its contract. Keep Django authoritative and Next.js as scoped presentation/proxy; do not authorize using route labels or client role names.

Required before expanded profile: approved field disclosure policy; dedicated self projection for addresses/emergency contacts and selected employment fields; server-side masked bank/statutory projections if approved; section availability and field capabilities derived from real policy. New write APIs, change-request records, review routing and audit history are separate work, not automatic reuse of general workflow templates. Do not grant `employees.edit` to employees to make ESS editing work.

Upcoming holidays need an employee-effective calendar read projection; HR calendar CRUD does not authorize ESS access. Profile completeness requires an approved required-field definition and explicit denominator; document requirements can reuse current document-center semantics. Announcements require a genuine audience/publishing contract, otherwise omit the panel. An additive dashboard summary can reduce fan-out later, but must reuse domain selectors and preserve per-panel availability/errors.

## Regression and release strategy

The [final readiness assessment](../qa/hrms-final-release-readiness-assessment.md) remains CONDITIONAL for synthetic staging and NO-GO for real payroll/unrestricted production: 3 Verified, 16 Partial, 21 Blocked across 40 frozen gates. UX work cannot promote these gates. Respect signed exclusions, including document uploads/sharing where excluded, workflow authority/delegation and other policy-blocked capabilities. Source implementation is not launch approval.

The [DB-6.8 ESS certification](../qa/db6-8-ess-employee-lifecycle-certification.md) preserves successful leave/regularization, artifact ownership and multi-year payslip evidence, while retaining a neighboring notification Clear-filters instability and post-expiry cancellation policy dependency. Recheck those relevant cases rather than describing ESS as unconditionally certified.

The [loading certification](../qa/hrms-loading-state-independent-certification-2026-10-17.md) records 12 Verified, 2 Covered and 32 Partial families; preserve [fixture cleanup](../qa/evidence/loading-state-final-closure/018-fixture-cleanup-summary.md) and historical logs. [DD-6](../qa/hrms-dd6-ess-mss-domain-certification.md) records a lost-response boundary: leave retry may return overlap conflict rather than replay success. Never present transparent replay as already solved.

For each implementation slice: record build commit, enabled scope, browser/device, permission persona, synthetic fixture IDs, baseline evidence and changed routes; run typecheck/lint/build and focused browser/API checks in disposable local infrastructure. Append new evidence; never rewrite old passes or snapshots merely to accept changed semantics. No execution against live Lightsail in this phase or implicit staging deployment later.

Browser matrix: Chromium primary plus Firefox/WebKit for shared shell/dialog changes; desktop 1440x900 and 1280x800, tablet 768x1024, phone 390x844 and 320px width, 200% zoom, keyboard-only, reduced motion and screen-reader announcements. Check deep links/back/forward, filter persistence, loading, no results, unmapped employee, errors/timeouts, rapid navigation, stale responses, expired session and revoked permissions. Use existing suites identified in the tracker before adding focused gap tests.

API/RBAC matrix: anonymous, employee A/B same tenant, other tenant, manager direct/non-direct/assigned approver, multi-role user, custom role with removed permission, HR read-only/editor, Tenant Admin, Platform Admin and support-session scope. Prove unauthorized fields absent in JSON/HTML/RSC/network responses, not CSS-hidden. Test cache separation by user/tenant, object IDs, artifact grants, list/count scoping, revocation and direct route/proxy/API access. Admin status alone must not create employee context.

Integrity checks for changed workflows: exactly one mutation under duplicate click/concurrency, persisted read after save/reload, approved effective date/history, no overwrite of newer record, closed attendance/payroll immutability, same ledger/output snapshots before and after presentation changes. Include documented lost-response behavior and provider failures when applicable. No calculation/rate change is part of this program.

## Prioritized delivery and complexity

Estimates are engineering person-days including focused QA, assuming one engineer with design/product reviews available. They are planning ranges, not commitments; policy/external wait time is excluded.

| Phase | Scope | Complexity / estimate | Exit dependency |
|---|---|---|---|
| UX-0 | Current documents, inventory and specifications | Complete as documentation | Stakeholder review; no UX-1 auto-start. |
| UX-1A | ESS dashboard semantics/density + read-only `/ess/profile` using existing DTO; preserve canonical links | M, 5–8 days | Approved layout and current-field visibility; focused browser/API/RBAC pass. |
| UX-1B | Shared header/status/panel contracts and optional panel resilience | M, 5–9 days | No shell/navigation or loading regression across five workspaces. |
| UX-2A | Approved expanded profile read projections, holidays, masked banking/statutory, requirement definitions | L, 8–15 days | Field policy/security review; contract and isolation tests. Can split into independent sections. |
| UX-2B | Governed editing/change requests/history, only fields explicitly approved | XL, 15–25 days | Named policy owner, field rules, routing/concurrency/effective-date design, separately reviewed migration if needed. |
| UX-3 | MSS review context, employee directory/profile consistency and documents | L, 10–18 days | Assignment authority, sensitive-field scope, document release gates. |
| UX-4 | Attendance/leave/rosters and HR operations | L, 12–20 days | Existing close/correction and policy boundaries preserved. |
| UX-5 | Payroll/report/compliance presentation | XL, 15–25 days | Financial snapshot parity and report-family evidence; no statutory logic changes. |
| UX-6 | Tenant/Platform administration consistency and final cross-workspace audit | L, 10–18 days | Tenant/platform separation, support/governance gates and responsive/accessibility checks. |

Recommended first slice is UX-1A: make pending-versus-action-needed truthful, remove static readiness decoration and redundant summaries, place compact identity at the top, add read-only My Profile using only the current self-profile fields, and retain working leave/attendance/document/payslip flows. Holidays, completeness scores, new personal-field access and edit buttons wait for their contracts. Stop after UX-0 documents until an explicit implementation request.
