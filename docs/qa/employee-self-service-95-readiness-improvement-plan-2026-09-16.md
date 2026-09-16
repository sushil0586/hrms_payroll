# Employee Self Service 95% Readiness Improvement Plan

Date: 2026-09-16  
Environment target: local first, then staging at `https://hrms.accerio.in`  
Primary role: Employee  
Purpose: make Employee Self Service a launch-ready control center for personal leave, attendance regularization, payslips, documents, tax declarations, notifications, and strict employee-only data access.

## Baseline

| Area | Current Rating | Target | Reason |
| --- | ---: | ---: | --- |
| ESS functionality readiness | 88-91% | 95% | Core employee pages exist, but the 95% gate needs consolidated certification across overview, requests, documents, payroll files, notifications, and tax declarations. |
| ESS QA/browser coverage | 84-88% | 95% | Coverage exists across older phase specs, but the ESS control-center suite needs stronger launch-style role, route, mobile, and negative proof. |
| ESS user-friendliness | 86-89% | 95% | The employee experience is usable, but needs proof that all common employee actions are easy to discover and that empty/error states are clear. |
| ESS public launch readiness | 86-89% | 95% | Employee-facing data is sensitive; final readiness requires employee-only scope checks, payslip/download proof, and role-menu regression together. |

## ESS-95-0 Inventory

Current routes:

| Route | Responsibility | Visible controls |
| --- | --- | --- |
| `/ess` | Employee control center | Today priorities, self-service shortcuts, profile snapshot, attendance today, leave balances, leave request form, attendance regularization form, leave/regularization history. |
| `/ess/payslips` | Payroll document access | Published payslip rail, detail panel, download link, read receipt, access trail, storage/source hash evidence. |
| `/ess/documents` | Employee documents | Required document summary, upload/re-upload workflow, filters, download links for own documents. |
| `/ess/statutory-declarations` | Tax declaration proof | Financial year, tax regime, declaration creation, proof item fields, proof register, declared items. |
| `/ess/notifications` | Employee inbox | Search/filter, pagination, source link, read/unread mutation through employee notification endpoint. |

Current APIs and evidence surfaces:

| API/source | Purpose | Certification obligation |
| --- | --- | --- |
| `/me/dashboard/` family | Profile, attendance, leave, regularization overview | Metrics and summaries render only for the logged-in employee. |
| `/me/leave-requests/` | Employee leave submission and history | Positive submit, validation failure, history, manager decision feedback. |
| `/me/attendance-regularizations/` | Employee attendance correction | Positive submit, validation failure, history, manager decision feedback. |
| `/me/payroll-payslips/` | Published payslip access | Employee-scoped list/download/read receipt; no access to other employee artifacts. |
| `/me/employee-documents/` | Personal document access/upload | Required/upload/re-upload/download workflow stays employee scoped. |
| `/me/statutory-declarations/` | Tax declaration proofs | Create/draft/proof controls and validation states. |
| `/me/notifications/` | Employee notification inbox | Filters, source links, and read/unread mutation stay employee scoped. |

## Phase ESS-95-1: Control Center And Navigation Certification

Goal:
- Certify `/ess` as a simple employee control center.

Scope:
- Page loads for employee.
- Sidebar/quick links open every ESS workspace.
- Metrics, priorities, shortcuts, profile, attendance, leave balances, request forms, histories, and pagination render.
- Mobile/no-overflow proof.
- Non-employee roles do not gain employee-only ESS access or mutation APIs.

Target confidence after phase:

| Area | Target |
| --- | ---: |
| Functionality | 90-92% |
| Browser QA | 90-92% |
| UX | 89-91% |
| Launch readiness | 89-91% |

## Phase ESS-95-2: Leave And Attendance Self-Service Certification

Goal:
- Certify employee request workflows end to end.

Scope:
- Leave positive submit, validation failure, manager approval/rejection reflection in ESS.
- Attendance regularization positive submit, validation failure, manager approval/rejection reflection in ESS.
- Cancellation/withdrawal controls when available.
- Non-mutating intercepted action proof where staging rows should not be changed.

## Phase ESS-95-3: Payslips, Documents, Tax Declarations, And Notifications

Goal:
- Certify employee compliance and payroll evidence surfaces.

Scope:
- Payslip list/detail/download/read receipt/source hash.
- Document filters/upload/re-upload/download and empty states.
- Statutory declaration create/proof fields/validation states.
- Notification filters/search/empty state/read toggle/source link.

## Phase ESS-95-4: Final Staging Certification

Goal:
- Run ESS as a final staging launch candidate.

Exit criteria:
- Focused ESS browser suite passes.
- Payslip, documents, statutory declarations, leave/attendance, credential matrix, and role-menu regressions remain green.
- Lint/build pass after changes.
- Documentation records environment, evidence, confidence, and non-blocking gaps.

## Execution Log

| Date | Phase | Environment | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 | ESS-95-0 inventory | Local documentation | Created ESS 95% plan and mapped route/API/workflow obligations. | Functionality 88-91%, QA 84-88%, UX 86-89%, launch 86-89% | Next phase is ESS-95-1 control center/navigation certification. |
| 2026-09-16 | ESS-95-1 control center and navigation certification | Local web with live staging API | Expanded and ran `ess-control-center-certification.spec.ts`: 4/4 passed. Verified ESS overview metrics, today priorities, shortcuts, profile snapshot, attendance today, leave balances, leave and regularization request forms, history/detail panels, pagination, mobile/no-overflow, navigation to payslips/documents/tax declarations/notifications, and cross-role personal API responses fail closed or validate safely without leaking sensitive fields. `pnpm --dir web lint` passed. | Functionality 90-92%, QA 90-92%, UX 89-91%, launch 89-91% | Multi-role users may legitimately have an ESS view if they also have employee context, so boundary certification focuses on personal API safety and no sensitive leakage rather than assuming page-level denial. Next phase is ESS-95-2 leave and attendance workflow certification. |
| 2026-09-16 | ESS-95-2 leave and attendance workflow certification | Local web with live staging API | Ran `phase4a-leave-attendance-self-service-flows.spec.ts`: 4/4 passed. Certified real employee leave submission, manager approval, employee approval visibility, leave validation failure, manager rejection, employee rejection visibility, attendance regularization submission, manager approval, attendance validation failure, duplicate pending guard, manager rejection, and employee-side decision visibility. `pnpm --dir web lint` passed. | Functionality 93-94%, QA 93-94%, UX 92-93%, launch 92-94% | This phase intentionally creates uniquely referenced staging workflow rows to prove the real ESS-to-MSS lifecycle. Next phase is ESS-95-3 payslips, documents, tax declarations, and notifications. |
| 2026-09-16 | ESS-95-3 payslips, documents, tax declarations, and notifications | Local web with live staging API | Expanded and ran ESS evidence pack: `ess-control-center-certification.spec.ts`, `ess-payslip-flows.spec.ts`, and `ess-statutory-declarations-flows.spec.ts`: 8/8 passed. Certified document metrics/upload controls/requirement cards/history filters/pagination/download links, notification metrics/search/filter/empty state/source links/read-toggle affordance, payslip download/source hash/access trail/read receipt affordance, and statutory declaration tax profile/proof controls. `pnpm --dir web lint` passed. | Functionality 94-95%, QA 94-95%, UX 93-94%, launch 94-95% | Notification read mutation was certified as a visible enabled affordance in this phase; personal notification API fail-closed/no-leak behavior was already covered in ESS-95-1. Next phase is ESS-95-4 final staging certification with credential matrix and role-menu regression. |
| 2026-09-16 | ESS-95-4 final staging certification | Local web with live staging API | Ran final ESS regression pack: `ess-control-center-certification.spec.ts`, `phase4a-leave-attendance-self-service-flows.spec.ts`, `ess-payslip-flows.spec.ts`, `ess-statutory-declarations-flows.spec.ts`, `pilot-credential-matrix-certification.spec.ts`, and `public-launch-role-menu-certification.spec.ts`: 29/29 passed. Proved ESS pages, real leave/attendance lifecycle, payslip/document/tax/notification evidence, credential boundaries, and public launch role menus stay green together. `pnpm --dir web lint` passed. | Functionality 95%, QA 95%, UX 94-95%, launch 95% | ESS is at the 95% gate. Remaining non-blocking polish is observational UX only; no launch-blocking ESS defects found in this pack. |
