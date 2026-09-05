# Phase 4 Frontend Rollout Matrix

## 1. Purpose

This document breaks `Phase 4: Documents, Letters, and Employee Record Completion` into frontend-specific rollout workstreams.

Use this document to answer:

- what frontend work belongs inside Phase 4
- what UI and UX foundation is already in place
- what remains to be implemented to make documents and letters operationally usable
- what outcome marks each frontend workstream as complete

This document should be read together with:

- [phase4-documents-letters-execution-plan.md](/Users/ansh/Documents/hrms-payroll-saas/docs/phase4-documents-letters-execution-plan.md)
- [phase4-backend-execution-matrix.md](/Users/ansh/Documents/hrms-payroll-saas/docs/phase4-backend-execution-matrix.md)

---

## 2. Frontend Outcome

Phase 4 frontend should end with this result:

- HR, employees, and managers can participate in document flows through guided, compact, operational screens
- upload, review, rejection, re-upload, expiry, and letter-generation experiences follow the same UI/UX system already used in the product
- frontend behavior is driven by backend metadata and option contracts instead of hardcoded rule assumptions
- employee records show document and generated-artifact truth in one coherent experience

---

## 3. Matrix

| Workstream | Scope In Phase 4 Frontend | Ground Already In Place | Remaining In Phase 4 Frontend | Done Signal |
| --- | --- | --- | --- | --- |
| Shared document UI system adoption | Keep documents and letters inside the same compact, sober UX language already used elsewhere | Shared page intros, queue-toolbar patterns, form-shell-card patterns, pagination bar, summary chips, notice states, and polished admin shells are already in place across HR admin, ESS, and MSS | Apply the same shared patterns to all new document, artifact, and letter screens; avoid ad hoc document-specific layouts or styling | New document and letter screens feel native to the current product, not like a separate module |
| Upload experience rollout | Make real file upload operational for HR admin and allowed employee flows | Employee document admin screens, document category setup, and role-aware workspace shells already exist | Add file-picker flows, upload progress or status feedback, validation error messaging, artifact metadata display, and upload-ready empty states in HR admin and allowed ESS surfaces | Users can upload a real file through the web app and clearly understand the result |
| Review and rejection experience | Make document verification and rejection usable without leaving operational context | Inline review patterns, detail panels, and shared notice/action-bar components are already well-established | Add verification controls, rejection reason capture, re-upload request actions, current-state chips, and review-history presentation using backend state | HR can review and reject a document with clear, guided UI and no status ambiguity |
| Replacement and version history UX | Surface current-versus-previous file versions clearly | Record-card, detail-grid, and split-detail patterns already exist and can support version presentation well | Add current-version indicators, version history listing, replacement status markers, superseded-file context, and re-upload loops that clearly preserve history | Users can tell which artifact version is current and what changed before it |
| Lifecycle-linked document guidance | Make lifecycle and document obligations feel like one operator workflow | Phase 3 lifecycle queues, urgency chips, workflow-template SLA authoring patterns, and lifecycle item editors are already in place | Show document obligations inside lifecycle detail and queue surfaces, add guided lifecycle document-rule authoring UI, and surface missing/rejected/overdue artifact signals where readiness matters | HR sees document obligations naturally inside onboarding, movement, and exit workflows |
| Expiry and urgency visibility | Expose expiring or overdue document states without overwhelming the user | Queue urgency patterns, summary chips, detail panels, and queue filters already exist in lifecycle and notification surfaces | Add expiry-based chips, filters, urgency badges, list-level indicators, and employee-record summaries for expiring and expired artifacts | Users can quickly identify what is expiring, overdue, or blocking without manual hunting |
| Letter template admin UI | Make letter configuration feel like other configurable admin modules | Form-shell-card patterns, workflow template admin depth, and config-driven admin UX patterns are already in place | Build template CRUD screens, merge-field guidance UI, preview entry points, config metadata display, and governed editability messaging using existing admin form patterns | HR can configure letter templates through the same admin UX style used elsewhere |
| Letter preview and generation UX | Make letter generation operational and safe | Shared action bars, notices, record cards, and export/action-menu patterns already exist and can be reused | Add generate preview surface, final generate flow, generation success feedback, generated-artifact history, and context-aware entry points from employee and lifecycle screens | HR can preview and generate letters confidently from the browser |
| Unified employee record experience | Present documents and generated artifacts as part of the employee record | Employee detail, access detail, lifecycle detail, and document operations screens already exist, and UI consistency work has improved the shared shell substantially | Add employee artifact summary panels, document compliance summary, generated-letter section, timeline or history view, and links into review or generation actions | HR can understand employee document and artifact state from one coherent employee record experience |
| ESS and MSS document participation | Support role-appropriate self-service and manager participation in document workflows | ESS and MSS shells, queue patterns, and pagination now exist and are operationally consistent | Add employee-facing upload/re-upload views where allowed, manager-facing visibility where needed, and role-appropriate empty states, notices, and action restrictions driven by backend metadata | Employees and managers can participate in required document workflows without HR-only workarounds |
| Phase 4 frontend verification confidence | Keep the new UI behavior stable as rollout widens | Web typecheck, shared component patterns, and repeated UI consistency passes are already in place | Verify upload flows, review loops, expiry state display, letter generation flows, unified employee record surfaces, and metadata-driven disabled states after each slice | Phase 4 frontend closes with stable, consistent document and artifact UX across major role surfaces |

---

## 4. Recommended Frontend Rollout Order

Recommended order for frontend implementation:

1. shared document UI system adoption
2. upload experience rollout
3. review and rejection experience
4. replacement and version history UX
5. lifecycle-linked document guidance
6. expiry and urgency visibility
7. letter template admin UI
8. letter preview and generation UX
9. unified employee record experience
10. ESS and MSS document participation
11. final Phase 4 frontend verification pass and documentation closeout

This order keeps the frontend aligned with backend slices and avoids polishing screens before the underlying behavior exists.

---

## 5. Slice Mapping

Each frontend workstream maps to the main Phase 4 slices as follows.

| Slice | Primary Frontend Workstreams |
| --- | --- |
| Slice 1: Storage Foundation And Artifact Metadata | Shared document UI system adoption, upload experience rollout |
| Slice 2: Verification, Rejection, Re-Upload, And Versioning | Review and rejection experience, replacement and version history UX |
| Slice 3: Requirement Rules And Lifecycle Linkage | Lifecycle-linked document guidance |
| Slice 4: Expiry Tracking And Reminder Events | Expiry and urgency visibility |
| Slice 5: Letter Template Engine And Generated Artifacts | Letter template admin UI, letter preview and generation UX |
| Slice 6: Unified Employee Record Completion | Unified employee record experience, ESS and MSS document participation |

---

## 6. Frontend Implementation Rules

Phase 4 frontend should follow these rules:

- use backend options and metadata for behavior and editability
- reuse `PageIntro`, `queue-toolbar`, `record-card`, `form-shell-card`, `PaginationBar`, and shared notice/action states
- keep titles short and operational
- prefer guided forms over raw JSON-style editing where backend metadata exists
- keep empty states helpful and role-aware
- make disabled states explicit and understandable
- do not add a separate visual system for document or letter screens

---

## 7. Frontend Exit Checklist

Phase 4 frontend can be considered complete when all of the following are true:

- upload, review, rejection, replacement, and expiry workflows are usable from the browser
- document and letter screens visually match the rest of the app
- lifecycle pages expose document obligations through the same guided patterns used elsewhere
- letter template and generation flows are configurable and understandable
- employee record views show document and artifact truth in one coherent place
- ESS and MSS have role-appropriate document participation where required
- web typecheck and slice-level UI verification pass after each rollout stage
