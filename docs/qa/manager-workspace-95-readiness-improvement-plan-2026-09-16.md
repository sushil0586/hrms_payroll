# Manager Workspace 95% Readiness Improvement Plan

Date: 2026-09-16  
Environment target: local first, then staging at `https://hrms.accerio.in`  
Primary role: Manager  
Purpose: make Manager Self Service a launch-ready control center for team approvals, attendance exceptions, leave coverage, notifications, and cross-role security boundaries.

## Baseline

| Area | Current Rating | Target | Reason |
| --- | ---: | ---: | --- |
| Manager functionality readiness | 86-89% | 95% | The MSS control center, approval queues, and notifications exist, but the route set needs role-specific launch certification. |
| Manager QA/browser coverage | 82-86% | 95% | Current browser coverage mostly proves the control center; approvals, notifications, mobile, and denial paths need stronger proof. |
| Manager user-friendliness | 84-88% | 95% | The pages are focused, but certification should prove queue switching, decision detail panels, shortcuts, and no-overflow behavior. |
| Manager public launch readiness | 84-88% | 95% | Manager actions affect leave, attendance, and payroll inputs; final pass must prove safe access boundaries and action controls. |

## MGR-95-0 Inventory

Current routes:

| Route | Responsibility | Visible controls |
| --- | --- | --- |
| `/mss` | Manager control center | Open approvals, notifications, self service, team priority queue, decision shortcuts. |
| `/mss/approvals` | Leave and attendance decision queues | Leave tab, attendance tab, detail panels, decision note, approve/reject controls, pagination. |
| `/mss/notifications` | Manager alerts | Notification search/filter/read workflow through shared notification center. |
| `/ess` | Personal self-service handoff | Manager can switch into personal ESS without gaining HR/platform permissions. |

Current APIs and evidence surfaces:

| API/source | Purpose | Certification obligation |
| --- | --- | --- |
| `/manager/team-summary/` backend | Team counts, coverage, pending approvals | Page metrics match live manager scope. |
| `/manager/leave-requests/pending/` backend | Leave decision queue | Queue/detail/pagination render; approve/reject controls are scoped. |
| `/manager/attendance-regularizations/pending/` backend | Attendance correction queue | Queue/detail/pagination render; approve/reject controls are scoped. |
| `/manager/notifications/` backend | Manager notifications | Search/filter/read surfaces render. |
| `/api/manager/leave-requests/:id/approve|reject` | Manager leave decisions | Non-manager roles denied; manager controls are visible only for pending rows. |
| `/api/manager/attendance-regularizations/:id/approve|reject` | Manager attendance decisions | Non-manager roles denied; error payloads fail closed. |
| `/api/manager/notifications/:id` | Notification mutation | Non-manager roles denied; notification UI remains usable. |

## Phase MGR-95-1: Control Center And Navigation Certification

Goal:
- Certify `/mss` as a simple manager control center.

Scope:
- Page loads for manager.
- Sidebar navigation renders and opens Manager pages.
- Metrics, command queue, shortcuts, and ESS handoff render.
- Mobile/no-overflow proof.
- Employee, HR Admin, Platform Admin, and Support do not gain MSS access.

Target confidence after phase:

| Area | Target |
| --- | ---: |
| Functionality | 90-92% |
| Browser QA | 90-92% |
| UX | 89-91% |
| Launch readiness | 89-91% |

## Phase MGR-95-2: Approval Queue Certification

Goal:
- Certify leave and attendance approval queues as manager-safe workflows.

Scope:
- Leave queue, attendance queue, selected row detail.
- Pagination controls.
- Decision note, approve/reject controls, disabled/resolved states.
- Positive safe rendering and negative invalid/denied paths.

## Phase MGR-95-3: Notifications And Team Signals

Goal:
- Certify manager notifications and team signals.

Scope:
- Notification filters/search/pagination/read affordances.
- Cross-links from notifications to approvals.
- No leakage into HR/Admin/Platform data.

## Phase MGR-95-4: Final Staging Certification

Goal:
- Run Manager workspace as a final staging launch candidate.

Exit criteria:
- Focused Manager browser suite passes.
- Public role-menu and credential matrix remain green.
- Lint/build pass after changes.
- Documentation records environment, evidence, confidence, and non-blocking gaps.

## Execution Log

| Date | Phase | Environment | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 | MGR-95-0 inventory | Local documentation | Created Manager Workspace 95% plan and mapped route/API/workflow obligations. | Functionality 86-89%, QA 82-86%, UX 84-88%, launch 84-88% | Next phase is MGR-95-1 control center/navigation certification. |
| 2026-09-16 | MGR-95-1 control center and navigation certification | Local web with live staging API | Expanded and ran `mss-control-center-certification.spec.ts`: 4/4 passed. Verified Manager control center metrics, team priority queue, decision shortcuts, mobile/no-overflow, leave queue, attendance queue, decision panels, pagination, notifications, approvals cross-link, and non-manager denial for employee/platform/support roles on manager decision APIs. `pnpm --dir web lint` passed. | Functionality 90-92%, QA 90-92%, UX 89-91%, launch 89-91% | HR Admin persona is not used as a negative MSS role because the staging user `nisha.rao` legitimately has manager access too. Next phase is MGR-95-2 approval action workflow certification. |
| 2026-09-16 | MGR-95-2 approval action workflow certification | Local web with live staging API | Expanded and reran `mss-control-center-certification.spec.ts`: 5/5 passed. Added non-mutating route-intercept proof for manager approval success and validation failure handling, plus explicit approve/reject control visibility for leave and attendance decision panels. Verified non-manager decision API denial still fails closed without leaking sensitive fields. `pnpm --dir web lint` passed. | Functionality 92-94%, QA 92-94%, UX 91-93%, launch 91-93% | Staging rows were not mutated; Playwright intercepted manager approve/reject calls to certify UI success/error states safely. Next phase is MGR-95-3 notifications and team signal certification. |
| 2026-09-16 | MGR-95-3 notifications and team signal certification | Local web with live staging API | Expanded and reran `mss-control-center-certification.spec.ts`: 6/6 passed. Certified notification metrics, scoped inbox search/filter controls, empty-state filtering, clear-filter return, pagination, approval cross-link, optional source links, read/unread control with intercepted PATCH success, and non-manager denial for notification mutation APIs. `pnpm --dir web lint` passed. | Functionality 94-95%, QA 94-95%, UX 93-94%, launch 93-94% | Unauthorized-role server logs during the run are expected fail-closed evidence. Next phase is MGR-95-4 final staging certification with role-menu and credential matrix regression. |
| 2026-09-16 | MGR-95-4 final staging certification | Local web with live staging API | Ran final regression pack: `mss-control-center-certification.spec.ts`, `pilot-credential-matrix-certification.spec.ts`, and `public-launch-role-menu-certification.spec.ts`: 23/23 passed. Proved manager workspace, notification/approval workflows, credential boundaries, and all public launch role menus stay green together. | Functionality 95%, QA 95%, UX 94-95%, launch 95% | Manager workspace is at the 95% gate. Remaining non-blocking polish is observational UX only; no launch-blocking manager defects found in this pack. |
