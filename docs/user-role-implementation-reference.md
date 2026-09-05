# User Role Implementation Reference

## 1. Purpose

This document explains the current HRMS implementation from two angles at the same time:

- user point of view: what each user type can actually do today
- technical point of view: what APIs, models, workflows, validations, and runtime behaviors back that experience

It is intended to be a practical current-state reference, not a future-state wish list.

The scope reflects the repository state after:

- Phase 0 platform hardening
- Phase 1 HR admin backbone completion
- Phase 2 policy execution completion for agreed scope
- Phase 3 lifecycle completion for agreed scope

Phase 4 document-storage and artifact depth is now substantially advanced, while generated letters, richer artifact governance, and broader trust-layer maturity still remain in progress. This document explicitly calls out where the platform is already strong and where a role still has partial or shallow coverage.

---

## 2. Role Map

The current product behavior clusters into four main user personas:

- Platform Admin
- HR Admin
- Manager
- Employee

There is also important shared infrastructure that affects every role:

- auth and session handling
- workspace access gating
- tenant membership and role mapping
- workflow assignments
- notifications
- audit and operational safety validations

---

## 3. Global Architecture By Role

### 3.1 Identity and role model

The system does not treat a user account alone as sufficient context.
Access is determined through:

- `User`
- `TenantMembership`
- `MembershipRole`
- tenant-scoped `Role`
- optional linked `Employee`

This means a person’s effective capabilities depend on:

- whether they have an active tenant membership
- what role codes are attached to that membership
- whether the membership is linked to an employee master
- whether workflow assignments grant manager workspace access even without a static manager role

### 3.2 Workspace access model

Current workspace access is exposed in the session payload as:

- `ess`
- `mss`
- `hr_admin`

Current logic:

- `ess` is available when the membership has employee context
- `mss` is available when the user has `manager`, `hr-admin`, or active pending workflow assignments in manager-style approval flows
- `hr_admin` is available only when the membership has the `hr-admin` role code

Relevant implementation:

- session payload building in [backend/apps/iam/api_serializers.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/iam/api_serializers.py:1)
- web route gating in [web/src/lib/workspace-access.ts](/Users/ansh/Documents/hrms-payroll-saas/web/src/lib/workspace-access.ts:1)
- role-scoped API gating in [backend/apps/common/api_views.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/common/api_views.py:4381)

### 3.3 Channel map

Current channel support is not identical across personas.

Platform Admin:

- backend APIs exist
- no dedicated Next.js platform-admin workspace currently implemented
- practical use today is API-led and admin-led operations

HR Admin:

- strongest web coverage
- backend coverage is broad and deep
- no dedicated HR admin mobile workspace

Manager:

- web MSS approval workspace exists
- mobile ESS + MSS hybrid app supports manager approvals
- backend manager approval APIs exist

Employee:

- web ESS workspace exists
- mobile ESS flows exist
- backend ESS APIs exist

---

## 4. Platform Admin

## 4.1 User point of view

Current platform-admin implementation is focused on tenant setup and initial activation, not on day-to-day tenant HR operations.

A platform admin can currently:

- create tenants
- review tenant detail
- manage tenant onboarding state
- add first admin contacts
- provision the first tenant admin user
- mark onboarding milestones such as baseline publication and handoff readiness
- activate the tenant
- adopt platform policy packs into a tenant runtime

This role is not intended to operate normal employee, leave, attendance, or lifecycle flows inside a tenant as a substitute for tenant HR.

### 4.2 Current implemented experience

From a workflow perspective, the platform-admin journey is:

1. create the tenant
2. prepare onboarding metadata
3. define first admin contact
4. provision first tenant HR admin login
5. adopt baseline policy packs
6. mark tenant onboarding ready
7. activate the tenant

This gives the tenant a usable initial runtime without making platform admins implicit tenant HR operators.

### 4.3 Technical implementation

Current platform-admin APIs live under the platform onboarding namespace:

- `POST /api/v1/platform/tenants/`
- `GET/PATCH /api/v1/platform/tenants/{id}/`
- `GET/PATCH /api/v1/platform/tenants/{id}/onboarding/`
- `POST /api/v1/platform/tenants/{id}/admin-contacts/`
- `POST /api/v1/platform/tenants/{id}/onboarding/mark-baseline-published/`
- `POST /api/v1/platform/tenants/{id}/onboarding/mark-handoff-ready/`
- `POST /api/v1/platform/tenants/{id}/onboarding/activate/`
- `POST /api/v1/platform/admin-contacts/{contact_id}/provision-user/`

Reference:

- routes in [backend/apps/tenant_onboarding/api_urls.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/tenant_onboarding/api_urls.py:1)
- behavior coverage in [backend/tests/test_tenant_onboarding_api.py](/Users/ansh/Documents/hrms-payroll-saas/backend/tests/test_tenant_onboarding_api.py:1)

### 4.4 Data and model impact

Platform-admin flows currently touch:

- `Tenant`
- `TenantDomain`
- tenant onboarding record state
- admin contact records
- first admin user provisioning
- policy pack adoption links
- tenant activation state

### 4.5 Guardrails and validation

Current platform-admin safety behavior includes:

- onboarding state tracking on the tenant
- first-admin provisioning into a tenant-scoped membership and HR admin role
- activation coupled to onboarding progression
- baseline publication state updated through policy-pack adoption

### 4.6 What is still shallow

Platform Admin remains partial in product terms because:

- there is no dedicated platform-admin web workspace implemented in the current Next.js app
- platform-admin analytics and operational dashboards are not yet a complete product surface
- cross-tenant governance beyond onboarding and policy-baseline adoption is still limited

---

## 5. HR Admin

## 5.1 User point of view

HR Admin is currently the deepest and most operationally complete persona in the product.

An HR admin can currently operate:

- employee administration
- access provisioning
- organization masters
- leave configuration and balances
- attendance configuration and operations
- workflow templates and assignments
- document categories, rules, and employee-document review
- lifecycle operations from onboarding through exit
- notification templates, notification events, and notification queue review
- reporting dashboards and CSV exports

This is the role that most clearly behaves like a real operations workspace instead of a placeholder scaffold.

### 5.2 Web workspace coverage

The Next.js HR admin workspace currently includes route surfaces for:

- dashboard
- employees
- organization
- leave types
- leave policies
- leave policy assignments
- leave balances and transactions
- shifts
- holiday calendars
- attendance policies
- attendance policy assignments
- attendance records
- attendance regularizations
- employee shift assignments
- shift roster templates and rollouts
- workflow templates
- workflow template assignments
- document categories
- document requirement rules
- employee documents
- lifecycle queue
- onboardings
- probation reviews
- movements
- exits
- notifications
- notification templates
- notification events
- reports

Representative route file references:

- [web/src/app/hr-admin/page.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/hr-admin/page.tsx:1)
- [web/src/app/hr-admin/employees/page.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/hr-admin/employees/page.tsx:1)
- [web/src/app/hr-admin/lifecycle/page.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/hr-admin/lifecycle/page.tsx:1)
- [web/src/app/hr-admin/workflow-templates/page.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/hr-admin/workflow-templates/page.tsx:1)
- [web/src/app/hr-admin/reports/page.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/hr-admin/reports/page.tsx:1)

### 5.3 Employee administration

From the HR user’s perspective, employee administration now supports:

- employee listing
- employee detail review
- create and update employee records
- access provisioning and recovery
- reporting-manager assignment
- structure mapping across legal entity, branch, location, business unit, department, designation, grade, and employment type
- review signals for missing structure and access issues

Technical support includes:

- `GET/POST /api/v1/hr-admin/employees/`
- `GET/PATCH /api/v1/hr-admin/employees/{employee_id}/`
- `GET /api/v1/hr-admin/employees/options/`
- `GET /api/v1/hr-admin/employees/access/options/`
- `GET/PATCH /api/v1/hr-admin/employees/{employee_id}/access/`

User-visible guardrails already implemented:

- duplicate employee-code blocking
- self-manager blocking
- invalid cross-structure mapping blocking
- date consistency validation
- access-state alignment with inactive or exited employee state
- role-required access provisioning
- warning and recovery hints in review surfaces

Technical references:

- selectors in [backend/apps/common/selectors.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/common/selectors.py:1017)
- save flows in [backend/apps/common/api_views.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/common/api_views.py:413)

### 5.4 Organization administration

HR Admin organization coverage includes:

- legal entities
- locations
- branches
- business units
- departments
- cost centers
- grades
- designations
- employment types

User-visible behavior:

- section-based list and edit flow
- dependency visibility before deactivation
- hierarchy safety
- duplicate-code protection per tenant
- self-parent prevention

Technical APIs:

- `GET /api/v1/hr-admin/organization/`
- `GET /api/v1/hr-admin/organization/options/`
- `GET/POST /api/v1/hr-admin/organization/{section}/`
- `GET/PATCH /api/v1/hr-admin/organization/{section}/{item_id}/`

### 5.5 Leave administration and policy execution

HR Admin currently owns the strongest leave domain coverage.

From a user perspective, HR can:

- configure leave types
- configure leave policies
- preview leave policy runtime
- assign leave policies across multiple scopes
- resolve assignment conflicts
- review leave balances
- add balance transactions
- review transactions

Runtime rule execution already affects real employee leave submissions, not just admin metadata.

Key implemented execution behaviors:

- balance availability validation
- backdated-request denial where configured
- notice-period validation
- attachment requirement validation
- probation restriction validation
- withdrawal and cancellation lifecycle enforcement
- reapproval path for certain cancellation flows
- assignment precedence across employee and organization scopes

Technical endpoints:

- `hr-admin/leave-types/*`
- `hr-admin/leave-policies/*`
- `hr-admin/leave-policy-assignments/*`
- `hr-admin/leave-balances/*`
- `me/leave-summary/`
- `me/leave-types/`
- `me/leave-requests/*`
- `manager/leave-requests/*`

### 5.6 Attendance administration and policy execution

HR Admin attendance coverage includes:

- shift setup
- holiday calendar setup
- attendance policy administration
- attendance policy assignments
- attendance record review and edit
- attendance bulk actions
- regularization review
- employee shift assignments
- shift roster templates and rollouts

Current runtime behaviors already implemented:

- regularization rule enforcement
- reason-required enforcement
- locked-record denial
- duplicate pending regularization denial
- invalid punch order denial
- holiday and weekly-off derivation
- half-day, late, and overtime derivation
- shift resolution and override precedence
- assignment precedence across supported attendance scopes

Technical endpoints:

- `hr-admin/shifts/*`
- `hr-admin/holiday-calendars/*`
- `hr-admin/attendance-policies/*`
- `hr-admin/attendance-policy-assignments/*`
- `hr-admin/attendance-records/*`
- `hr-admin/attendance-regularizations/*`
- `hr-admin/employee-shift-assignments/*`
- `hr-admin/shift-roster-templates/*`
- `hr-admin/shift-roster-rollouts/`
- `me/attendance-summary/`
- `me/attendance-records/`
- `me/attendance-regularizations/*`
- `manager/attendance-regularizations/*`

### 5.7 Workflow configuration

Workflow configuration is one of the most technically mature admin surfaces now.

From a user perspective, HR can:

- create workflow templates
- define workflow steps
- bind templates to assignment scopes
- configure lifecycle-driven workflow behavior
- author SLA rules with guided metadata

Important current capability:

- workflow template authoring for lifecycle no longer depends on frontend hardcoding
- backend `workflow-options` provides lifecycle SLA metadata such as due anchors, allowed fields, offset-unit choices, fallback anchors, and non-working-day configuration choices

Technical APIs:

- `GET /api/v1/hr-admin/workflow-options/`
- `GET/POST /api/v1/hr-admin/workflow-templates/`
- `GET/PATCH /api/v1/hr-admin/workflow-templates/{item_id}/`
- `GET/POST /api/v1/hr-admin/workflow-template-assignments/`
- `GET/PATCH /api/v1/hr-admin/workflow-template-assignments/{item_id}/`

### 5.8 Document administration and compliance review

Current document functionality is split into:

- category and requirement governance
- employee-document review and verification
- lifecycle document gating

HR Admin can currently:

- define document categories
- define tenant document requirement rules
- review employee documents
- approve or reject document verification
- inspect document queues
- see lifecycle blockers caused by missing mandatory due documents

Current deeper lifecycle linkage:

- onboarding completion evaluates due mandatory document rules
- onboarding checklists now auto-sync document-derived checklist items
- those items carry due dates, compliance state, blocking logic, and owner information

Current operational depth now also includes:

- storage-backed employee document records in live HR admin and ESS flows
- HR review approval, rejection, and re-upload request behavior
- manual expiry reminders from the HR admin document queue
- system-driven expiry reminder support through backend command execution
- document notification events for upload, re-upload, expiry attention, and onboarding attention

What is still partial:

- generated letters are not yet implemented
- broader artifact governance and deeper employee-record lifecycle behavior remain follow-on work

### 5.9 Lifecycle operations

Lifecycle is now a real operational domain for HR Admin.

Supported lifecycle modules:

- onboarding
- probation review
- movement
- exit
- combined lifecycle queue

Current user-visible lifecycle depth:

- queue surfaces with urgency and attention signals
- structured onboarding checklist editing
- structured exit clearance editing
- template-trigger selection
- auto-seeded checklist and clearance items from workflow templates
- due-date derivation from lifecycle rule metadata
- document-gated onboarding completion
- employee-state sync on lifecycle completion paths
- rehire-ready onboarding flow
- reminder and escalation state visibility

Current technical behaviors:

- onboarding completion updates employee joining-state readiness
- probation confirmation or extension updates employee confirmation/probation dates
- completed movement updates employee master targets
- exit progression updates employee status to `on_notice` or `exited`
- exit completion blocks while access remains live
- rehire requires exit eligibility and later joining date
- work items carry owner, escalation owner, due dates, next escalation, history, and urgency rank

Technical APIs:

- `hr-admin/lifecycle-options/`
- `hr-admin/lifecycle-queue/`
- `hr-admin/onboardings/*`
- `hr-admin/probation-reviews/*`
- `hr-admin/movements/*`
- `hr-admin/exits/*`
- lifecycle owner and status bulk action endpoints

### 5.10 Notifications and reports

HR Admin can currently work with:

- notification templates
- notification event definitions
- notification queue review
- reporting dashboard
- CSV exports for workforce, approvals, documents, lifecycle queue, and notification queue

Current reporting exports:

- workforce
- pending approvals
- document compliance
- lifecycle queue
- notification queue

These are operationally useful today, although broader reporting trust and analytics depth still have room to grow.

### 5.11 Governance and baseline-pack behavior

HR Admin is also the key consumer of platform-governed runtime masters.

Current admin behavior includes:

- visibility into baseline lineage
- lock-state and governance badges
- detach flows for clone-only tenant records
- governed edit restrictions across leave and attendance policy families, plus related seeded masters like leave types, shifts, and holiday calendars

This matters because the tenant runtime no longer treats adopted baseline records as ordinary uncontrolled rows.

### 5.12 Technical summary for HR Admin

Most HR Admin backend behavior is concentrated in:

- [backend/apps/common/api_views.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/common/api_views.py:413)
- [backend/apps/common/selectors.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/common/selectors.py:231)
- [backend/apps/common/api_urls.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/common/api_urls.py:117)

User gating:

- HR Admin web routes require HR admin workspace access in [web/src/app/hr-admin/layout.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/hr-admin/layout.tsx:1)

### 5.13 Current gaps for HR Admin

Still partial or future work:

- generated letters and broader employee-record artifact governance
- richer audit viewers and workflow timelines as product-grade exploration tools
- broader lifecycle analytics
- import flows
- wider release-grade regression depth across all web surfaces

---

## 6. Manager

## 6.1 User point of view

Manager coverage is currently focused on approval operations rather than broad people management.

A manager can currently:

- view team summary signals
- review pending leave requests
- approve or reject leave requests
- review pending attendance regularizations
- approve or reject attendance regularizations

The current manager experience is intentionally narrower than HR admin.
It behaves like an approvals workspace, not a full manager operations suite.

### 6.2 Web workspace coverage

Current MSS web workspace includes:

- approvals page
- manager decision panel
- workspace gating for MSS access

References:

- [web/src/app/mss/approvals/page.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/mss/approvals/page.tsx:1)
- [web/src/app/mss/layout.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/mss/layout.tsx:1)

### 6.3 Mobile manager coverage

Manager capability also exists in the Expo mobile app.

Mobile manager support includes:

- approval inbox behavior within the shared app shell
- leave approve/reject actions
- attendance regularization approve/reject actions
- pull-to-refresh and retry behavior

Technical reference:

- [mobile/App.tsx](/Users/ansh/Documents/hrms-payroll-saas/mobile/App.tsx:1)

### 6.4 Backend APIs

Current manager APIs:

- `GET /api/v1/manager/team-summary/`
- `GET /api/v1/manager/leave-requests/pending/`
- `GET /api/v1/manager/leave-requests/{request_id}/`
- `POST /api/v1/manager/leave-requests/{request_id}/approve/`
- `POST /api/v1/manager/leave-requests/{request_id}/reject/`
- `GET /api/v1/manager/attendance-regularizations/pending/`
- `GET /api/v1/manager/attendance-regularizations/{regularization_id}/`
- `POST /api/v1/manager/attendance-regularizations/{regularization_id}/approve/`
- `POST /api/v1/manager/attendance-regularizations/{regularization_id}/reject/`

### 6.5 Manager approval behavior

Current business behavior:

- manager can only act inside their scope
- pending workflow assignments can extend MSS access beyond static manager-role assignment
- manager review actions operate on live runtime records
- leave and regularization decisions affect the actual domain state

Safety behavior already covered:

- out-of-scope manager access is denied
- employee cannot use manager actions
- approval lists respect manager reporting line or workflow assignment context

### 6.6 What managers do not yet have

Still shallow or absent:

- rich team analytics
- broader direct-report lifecycle management
- manager document review workflows
- manager-facing workflow timelines and audit tools
- full team roster, attendance exception cockpit, or performance-oriented manager suite

---

## 7. Employee

## 7.1 User point of view

Employee Self Service is a real MVP today, not just a placeholder.

An employee can currently:

- sign in
- restore session
- view dashboard information
- view leave summary and available leave types
- submit leave requests
- view leave request detail
- withdraw pending leave where policy allows
- cancel approved leave where policy allows
- view attendance summary
- view attendance records
- submit attendance regularizations
- view regularization detail

### 7.2 Web employee workspace

Current web ESS route surface includes:

- dashboard
- leave lifecycle actions
- ESS route gating and session behavior

References:

- [web/src/app/ess/page.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/ess/page.tsx:1)
- [web/src/app/ess/leave-request-lifecycle-actions.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/ess/leave-request-lifecycle-actions.tsx:1)
- [web/src/app/ess/layout.tsx](/Users/ansh/Documents/hrms-payroll-saas/web/src/app/ess/layout.tsx:1)

### 7.3 Mobile employee workspace

Mobile coverage is strongest for employee common actions.

Current mobile ESS support includes:

- login
- secure session restore
- demo fallback mode when backend is unavailable
- employee home
- attendance tab
- leave tab
- leave request form
- attendance regularization form
- refresh and retry handling
- native mobile date and datetime pickers

Reference:

- [mobile/App.tsx](/Users/ansh/Documents/hrms-payroll-saas/mobile/App.tsx:1)

### 7.4 Backend APIs

Current ESS APIs:

- `GET /api/v1/me/profile/`
- `GET /api/v1/me/dashboard/`
- `GET /api/v1/me/leave-summary/`
- `GET /api/v1/me/leave-types/`
- `GET/POST /api/v1/me/leave-requests/`
- `GET /api/v1/me/leave-requests/{request_id}/`
- `POST /api/v1/me/leave-requests/{request_id}/withdraw/`
- `POST /api/v1/me/leave-requests/{request_id}/cancel/`
- `GET /api/v1/me/attendance-summary/`
- `GET /api/v1/me/attendance-records/`
- `GET/POST /api/v1/me/attendance-regularizations/`
- `GET /api/v1/me/attendance-regularizations/{regularization_id}/`

### 7.5 Runtime business behavior

Employee-facing leave and attendance behavior is not just form acceptance.
It is now governed by real runtime rules.

Implemented employee leave checks include:

- insufficient balance denial
- backdated leave denial where disallowed
- notice-period denial where required
- required attachment denial
- probation restriction denial
- policy resolution from actual scoped assignment data

Implemented employee leave lifecycle behavior includes:

- withdraw pending leave when allowed
- block withdraw when policy denies it
- cancel approved leave when allowed
- route cancellation back into approval when configured

Implemented employee attendance regularization checks include:

- policy allowance validation
- required-reason validation
- locked attendance denial
- duplicate pending request denial
- invalid punch sequence denial
- shift and policy resolution affecting real outcomes

### 7.6 Current limitations for employees

Still partial:

- richer request history and timeline depth can grow further
- broader personal records management is still not at final artifact-governance depth
- deeper notification center experience is still evolving

---

## 8. Cross-Role Technical Surfaces

## 8.1 Authentication

All personas rely on:

- `POST /api/v1/auth/login/`
- `GET /api/v1/auth/session/`
- `POST /api/v1/auth/logout/`

User-visible behavior:

- login accepts username or email
- invalid credentials are rejected
- session payload includes memberships, role codes, and workspace access hints
- web uses token-based session bridging
- mobile stores live sessions securely on-device

References:

- [backend/apps/iam/api_urls.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/iam/api_urls.py:1)
- [backend/apps/iam/api_serializers.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/iam/api_serializers.py:1)

## 8.2 Demo workspace

For local development, the repository includes a reusable seeded workspace with:

- employee user
- manager user
- HR admin user
- platform admin user

Reference:

- [backend/apps/common/management/commands/bootstrap_demo_workspace.py](/Users/ansh/Documents/hrms-payroll-saas/backend/apps/common/management/commands/bootstrap_demo_workspace.py:1)

## 8.3 Testing and trust

Current trust signals already implemented:

- backend smoke coverage across auth, ESS, MSS, HR admin, policy execution, and lifecycle paths
- role-gated route and API behavior
- negative-path validation coverage for major leave and attendance rules
- tenant onboarding API tests

This means role behavior is not only documented; key parts are actively regression-tested.

---

## 9. Current Role Maturity Summary

Platform Admin:

- functional for tenant creation and first-admin onboarding
- not yet a full product workspace

HR Admin:

- broadest and deepest role
- genuinely operational across employee, policy, lifecycle, workflow, document-governance, notifications, and reporting surfaces

Manager:

- solid approval-focused MVP
- intentionally narrow beyond approvals

Employee:

- working ESS MVP across web and mobile
- strong around leave and attendance self-service
- document upload and review participation now exists, while broader employee-record lifecycle and notification-center depth still remain incomplete

---

## 10. What This Means Practically

If the question is "who can realistically operate the system today?" the answer is:

- HR Admin can operate the product in the most complete way
- Employee and Manager experiences are real and usable for agreed common flows
- Platform Admin can prepare and activate tenants, but does not yet have a full productized workspace

If the question is "what still remains after this implementation state?" the main unfinished areas are:

- generated letters and broader employee-record artifact governance
- richer reporting and audit exploration
- additional lifecycle analytics and broader operational intelligence
- broader manager and platform-admin product surfaces

That is the clearest current-state interpretation of the codebase and implementation tracker.
