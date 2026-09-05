# Phase 4 Documents, Letters, and Employee Record Execution Plan

## 1. Purpose

This document is the detailed execution plan for `Phase 4: Documents, Letters, and Employee Record Completion`.

It is meant to define:

- the exact implementation order for backend and frontend
- the configurable-system expectations for Phase 4
- how Phase 4 should reuse the same delivery pattern already used in Phases 1 to 3
- what must be true before Phase 4 can be considered complete

This plan assumes:

- Phase 0 is complete enough for ongoing feature work
- Phase 1 HR admin backbone is complete for agreed scope
- Phase 2 policy execution is complete for agreed scope
- Phase 3 lifecycle completion is effectively complete for agreed scope
- Phase 4 should now take the lifecycle backbone into real document, artifact, and employee-record depth

---

## 2. Phase 4 Objective

Phase 4 should move documents and generated employee artifacts out of shallow metadata handling and into a real system workflow.

By the end of this phase:

- employee documents should be uploaded, stored, versioned, reviewed, rejected, replaced, and expired through the system
- lifecycle-driven document work should be system-generated and deadline-aware
- HR letters should be generated from templates and stored as first-class employee artifacts
- the employee record should feel complete, not split across disconnected modules

In simple terms:

- Phase 3 made lifecycle operational
- Phase 4 should make employee records document-real

---

## 3. Delivery Principles

Phase 4 should follow the same working style as earlier modules:

- backend-first runtime truth
- frontend follows real metadata, not hardcoded assumptions
- configuration-driven behavior
- same sober, compact, professional UI/UX system already established in web
- end-to-end usable slices instead of broad placeholder coverage
- smoke-testable completion after each slice

Specific Phase 4 principles:

- storage must be abstracted, not tied directly to one provider
- document behavior must be rule-driven, not embedded in frontend conditionals
- generated letters must be stored as artifacts, not only streamed ad hoc
- lifecycle and document systems must share the same ownership, due-date, and notification model
- employee record views must compose existing modules rather than duplicating their logic

---

## 4. Phase 4 Completion Definition

Phase 4 should be considered complete only when all of the following are true:

- HR admin can configure document categories, requirements, verification behavior, expiry behavior, and letter templates without engineering help
- ESS and MSS can participate in document-related flows where their role requires it
- uploaded employee documents are backed by real storage and artifact metadata
- rejection, re-upload, replacement, and verification loops work end-to-end
- lifecycle records can generate or require document tasks through validated rules
- generated HR letters are template-driven, employee-linked, and retrievable later
- employee records show document and artifact state as part of normal operations
- document and letter actions are auditable enough for operational use

If these are not true, Phase 4 is still in progress.

---

## 5. Scope Boundaries

## 5.1 In Scope

- document storage abstraction
- file upload and download lifecycle
- employee document versioning
- verification and rejection loop
- re-upload and replacement handling
- expiry tracking and reminders
- lifecycle-linked document task generation
- generated HR letters and employee artifacts
- employee record completion views and APIs
- document and artifact configuration in HR admin

## 5.2 Out Of Scope For This Phase

- full e-signature platform integration
- OCR, AI extraction, or document intelligence
- external DMS synchronization as a first-class integration set
- payroll document packs
- advanced legal retention engine beyond agreed HRMS scope
- broad notification-channel maturity beyond document-triggered needs

These can follow later if needed.

---

## 6. Functional Outcome Areas

Phase 4 should be executed across six outcome areas.

## 6.1 Storage Foundation

- real file storage
- environment-aware storage configuration
- artifact metadata discipline
- secure download access

## 6.2 Document Runtime Completion

- version-aware employee document handling
- reviewable verification state
- rejection and re-upload handling
- expiry tracking and reminders

## 6.3 Lifecycle Document Orchestration

- onboarding, probation, movement, and exit document linkage
- due-date generation from rules
- owner-aware document tasks
- queue visibility for missing or overdue artifacts

## 6.4 Letter Generation Engine

- template-driven artifact generation
- employee and org merge fields
- lifecycle-triggered letters
- generated files stored in the same artifact system

## 6.5 Employee Record Completion

- unified employee record views
- document history
- artifact timeline
- missing / expired / rejected artifact visibility

## 6.6 Admin Configurability

- categories
- requirement rules
- lifecycle document rules
- letter templates
- reminder behavior
- access and visibility rules

---

## 7. Architecture Direction

Phase 4 should preserve the current platform shape:

- Django backend remains the source of truth
- service layer owns execution and state transitions
- serializers define normalized API contracts
- selectors prepare frontend-friendly read models
- web consumes explicit options and metadata instead of embedding rule knowledge

Phase 4 should add these architecture layers:

## 7.1 Artifact Storage Layer

A storage abstraction that supports:

- local development file storage
- production object storage
- future provider replacement without service rewrite

Expected concepts:

- storage backend adapter
- artifact locator / storage key generation
- signed or controlled download strategy
- checksum and metadata persistence

## 7.2 Artifact Domain Layer

A normalized artifact model should represent:

- uploaded files
- generated letters
- replacement versions
- linked lifecycle artifacts

This should prevent letters and uploads from becoming two totally separate systems.

## 7.3 Document Rule Execution Layer

The backend should own:

- upload eligibility
- file-type and size validation
- verification requirements
- expiry requirements
- re-upload eligibility
- lifecycle-triggered requirement creation

## 7.4 Template Rendering Layer

Generated letters should use:

- stored templates
- merge-safe context building
- preview and generation flows
- artifact persistence after generation

---

## 8. Data Model Execution Direction

The exact final schema can evolve, but the implementation should support these model concepts.

## 8.1 Storage And Artifact Models

Expected additions or refinements:

- artifact record
- artifact version record or versioned metadata pattern
- storage provider metadata
- file checksum and file size metadata
- generated-versus-uploaded source distinction

Suggested core fields:

- tenant
- employee
- artifact kind
- source kind
- source module
- storage provider
- storage key
- original filename
- content type
- file size
- checksum
- uploaded by
- generated by
- created at
- superseded by / current version markers

## 8.2 Employee Document Refinement

Current document models should evolve to support:

- current active file version
- historical replacement versions
- verification decision history
- rejection reason history
- re-upload requested state
- expiry-derived operational state

## 8.3 Generated Letter Models

Letters should support:

- template identity
- generation context snapshot
- generated file artifact link
- employee link
- lifecycle record link when relevant
- generated-at and generated-by

## 8.4 Requirement And Task Linkage

Requirement rules should support:

- employee scope
- org scope
- lifecycle trigger scope
- due-date basis
- verification requirement
- expiry behavior
- upload role permissions
- reminder behavior

Lifecycle work items or parallel document tasks may need extensions for:

- document-specific action kind
- linked requirement rule
- linked artifact or document record
- missing / rejected / expired state

---

## 9. Configurability Standard

Phase 4 should be fully configurable in the same spirit as policy and workflow phases.

That means behavior must come from backend-managed configuration for:

- accepted file types
- file size caps
- multiple-file allowance
- employee upload allowance
- verification requirement
- expiry requirement
- replacement or re-upload allowance
- reminder timing
- lifecycle trigger linkage
- generated-letter template content
- artifact visibility rules

The frontend should not hardcode:

- allowed document behaviors
- status transition rules
- lifecycle document anchors
- reminder policy meaning
- letter field availability beyond backend-declared metadata

The backend should expose:

- options APIs
- normalized configuration fields
- derived governance and editability state
- validation errors tied to configuration

---

## 10. UX And Frontend Direction

Phase 4 frontend work should stay aligned with the current product style:

- compact page intros
- shared queue-toolbar patterns
- shared form-shell-card patterns
- shared pagination behavior
- soft but clear notice and action states
- admin surfaces that feel guided instead of free-form

Phase 4 frontend should follow these rules:

- no separate visual language for documents or letters
- reuse existing queue, detail, and form patterns
- use summary chips, panels, and split layouts already introduced
- provide strong empty states and operational guidance
- expose backend configuration metadata instead of duplicating rule logic

---

## 11. Execution Order

This is the required implementation order.

## Slice 1: Storage Foundation And Artifact Metadata

### Backend

Build first:

- storage abstraction
- local and production-ready storage adapters
- artifact metadata persistence
- secure artifact upload and download flow
- upload validation baseline

Backend deliverables:

- storage service interface
- artifact model additions
- artifact upload API
- artifact download or signed access API
- basic file validation and error reporting
- initial audit metadata capture

Backend exit criteria:

- a file can be uploaded through the backend and stored through the abstraction layer
- artifact metadata is persisted and retrievable
- tenant ownership and uploader identity are preserved
- download access is controlled

### Frontend

Build after backend contract stabilizes:

- HR admin document upload UI
- employee document upload UI where allowed
- file selection and validation messaging
- artifact listing with basic metadata

Frontend exit criteria:

- file upload works from the web app with clear success and failure states
- artifact metadata is visible without raw backend jargon

---

## Slice 2: Verification, Rejection, Re-Upload, And Versioning

### Backend

Build next:

- verification state transitions
- rejection loop
- re-upload request flow
- replacement / new version handling
- historical version traceability

Backend deliverables:

- verify document action
- reject document action
- request re-upload action
- replace document upload action
- version history payload
- normalized document review state fields

Backend exit criteria:

- HR can reject a document and request a re-upload
- employee or HR can upload a replacement where configuration allows
- older versions remain historically visible
- current active version is unambiguous

### Frontend

Build next:

- inline review controls
- rejection and re-upload prompts
- version history view
- visible current-versus-replaced artifact markers

Frontend exit criteria:

- the document review loop is fully usable from the browser
- the UI makes replacement state and active version clear

---

## Slice 3: Requirement Rules And Lifecycle Linkage

### Backend

Build next:

- configurable requirement-rule execution
- lifecycle-triggered document work creation
- due-date derivation for document obligations
- document-state rollups for onboarding and exit readiness

Backend deliverables:

- requirement rule runtime execution
- lifecycle-to-document linkage rules
- document task generation on onboarding / movement / exit events
- employee record missing-artifact summary
- options metadata for lifecycle document authoring

Backend exit criteria:

- lifecycle events can generate or enforce document obligations
- missing or rejected artifacts affect readiness where intended
- due dates and owners can be derived from configuration

### Frontend

Build next:

- lifecycle screens show document obligations
- HR admin can author lifecycle-linked document behavior through guided forms
- queue views surface missing / overdue / rejected document state

Frontend exit criteria:

- lifecycle and document systems feel like one workflow from the operator perspective

---

## Slice 4: Expiry Tracking And Reminder Events

### Backend

Build next:

- expiry state derivation
- reminder generation rules
- event creation for missing, overdue verification, rejected, and expiring documents

Backend deliverables:

- expiry evaluation service
- reminder scheduling rules
- event-definition alignment with notification engine
- document reminder and escalation payloads

Backend exit criteria:

- expiring or overdue document states are derived consistently
- reminder-worthy document events are system-generated

### Frontend

Build next:

- expiry filters
- reminder state visibility
- employee and admin document urgency chips
- queue and record indicators for expiring artifacts

Frontend exit criteria:

- users can tell what needs action without opening every record manually

---

## Slice 5: Letter Template Engine And Generated Artifacts

### Backend

Build next:

- letter template storage
- merge-field metadata
- generation preview
- final artifact generation and persistence
- lifecycle-triggered letter generation where configured

Backend deliverables:

- template CRUD
- template options API with merge-field metadata
- preview render endpoint
- final generate endpoint
- generated letter artifact persistence
- employee and lifecycle linkage for generated outputs

Backend exit criteria:

- HR can generate a letter from stored templates
- generated output is saved as an artifact, not just streamed once
- letter generation is traceable later

### Frontend

Build next:

- letter template admin UI
- merge-field guidance UI
- generate and preview flows
- generated artifact listing on employee record and relevant lifecycle records

Frontend exit criteria:

- HR can configure and generate letters from the web UI without code changes

---

## Slice 6: Unified Employee Record Completion

### Backend

Build last:

- aggregated employee record API
- artifact timeline
- document compliance summary
- generated letter summary
- unresolved document issue summary

Backend deliverables:

- employee artifact summary selector
- employee document and generated-letter rollup payload
- record completeness summary
- audit-friendly record timeline surface

Backend exit criteria:

- employee record APIs show documents and letters as first-class parts of the person record

### Frontend

Build last:

- unified employee record tab or workspace section
- document timeline
- generated artifacts section
- compliance and missing-items summary
- same UI language as existing employee master detail and lifecycle detail views

Frontend exit criteria:

- HR can review a meaningful employee record without jumping across too many disconnected screens

---

## 12. Backend Work Breakdown

This is the recommended backend sequence in implementation order.

1. add storage abstraction and artifact metadata model updates
2. add artifact upload and controlled retrieval APIs
3. refine employee document runtime states and versioning
4. implement rejection, verification, and re-upload actions
5. implement expiry evaluation and reminder event generation
6. implement lifecycle-linked document requirement execution
7. implement letter template CRUD and merge-field metadata
8. implement letter preview and generation pipeline
9. implement unified employee record read models
10. add smoke coverage and regression coverage for each completed slice

Backend implementation expectations:

- selectors prepare frontend-ready payloads
- services own transitions and side effects
- serializers expose normalized state
- option endpoints provide configuration metadata
- no direct storage-provider logic leaks into API views

---

## 13. Frontend Work Breakdown

This is the recommended frontend sequence in implementation order.

1. upload and artifact metadata surfaces
2. review and rejection loop UI
3. replacement and version-history UI
4. requirement and lifecycle-linked document guidance UI
5. expiry and urgency visibility
6. letter template admin UI
7. letter preview and generation UI
8. unified employee record artifact views

Frontend implementation expectations:

- use existing page-intro, queue-toolbar, form-shell-card, record-card, and pagination patterns
- do not create a special design system for Phase 4
- keep titles compact and operational
- use backend options payloads instead of frontend constants
- preserve explicit disabled states, notices, and empty states

---

## 14. API Surface Expectations

The exact endpoint names can evolve, but Phase 4 should likely expose APIs in these families.

## 14.1 Artifact APIs

- upload artifact
- fetch artifact metadata
- fetch artifact versions
- download artifact
- replace artifact version

## 14.2 Employee Document APIs

- create employee document with artifact
- review employee document
- reject employee document
- verify employee document
- request re-upload
- list employee document history

## 14.3 Requirement Rule APIs

- document options
- document rule options
- lifecycle document rule options
- requirement rule CRUD

## 14.4 Letter Template APIs

- letter template CRUD
- letter template options
- render preview
- generate final artifact
- list generated letters per employee

## 14.5 Employee Record APIs

- employee artifact summary
- employee document compliance summary
- employee generated artifact timeline

---

## 15. Configurable Admin Surfaces

HR admin should be able to configure these without code changes.

## 15.1 Document Category Configuration

- active state
- category type
- employee upload allowance
- multiple-file allowance
- verification requirement
- expiry requirement
- accepted file rules

## 15.2 Requirement Rule Configuration

- mandatory or optional
- scope targeting
- lifecycle trigger linkage
- due anchor
- due offset
- reminder timing
- visibility and applicability

## 15.3 Letter Template Configuration

- letter type
- active state
- merge-field usage
- template body
- generation trigger eligibility
- storage and retention behavior where needed

## 15.4 Artifact Governance Visibility

- source kind
- uploaded versus generated distinction
- replacement history
- current review status
- expiry status
- editability / re-upload permissions

---

## 16. Testing And Verification Strategy

Phase 4 should follow the same hardening discipline used recently.

## 16.1 Backend Smoke Coverage Priorities

Add smoke tests for:

- upload success and validation denial
- secure artifact retrieval
- employee document verification
- rejection and re-upload loop
- replacement version history
- expiry reminder generation
- lifecycle-triggered document creation
- generated letter preview and generation
- employee record artifact rollups

## 16.2 Frontend Verification Priorities

Verify:

- upload UX states
- rejection and re-upload flows
- expiry and urgency display
- lifecycle document guidance
- template preview and generate flows
- employee artifact record views

## 16.3 Exit Verification Standard

Each slice should close only when:

- backend tests pass
- web typecheck passes
- relevant queue or form workflow works end-to-end in UI
- docs are updated

---

## 17. Risks And Control Points

Phase 4 has several important risks.

## 17.1 Storage Complexity

Risk:

- file handling can become ad hoc and environment-specific

Control:

- require storage abstraction first

## 17.2 Frontend Hardcoding

Risk:

- rule logic drifts into the UI

Control:

- provide backend options and normalized metadata before polishing forms

## 17.3 Letter System Forking

Risk:

- generated letters become a separate artifact silo

Control:

- require generated letters to use the same artifact foundation

## 17.4 Lifecycle Drift

Risk:

- document tasks get implemented separately from lifecycle work patterns

Control:

- reuse lifecycle owner, due-date, escalation, and urgency concepts

## 17.5 Incomplete Employee Record View

Risk:

- documents and letters remain scattered across many screens

Control:

- close the phase only after unified employee record views exist

---

## 18. Recommended Backlog Labels

Suggested labels for Phase 4 work:

- `phase4-storage`
- `phase4-documents`
- `phase4-verification`
- `phase4-reupload`
- `phase4-expiry`
- `phase4-letters`
- `phase4-employee-record`
- `phase4-configurability`

Priority guidance:

- `P0`
  storage, upload, review loop, lifecycle linkage
- `P1`
  expiry, reminders, generated letters
- `P2`
  deeper artifact history and richer employee record views

---

## 19. Phase 4 Exit Criteria

Phase 4 should be marked complete only when:

- storage integration is real and pluggable
- upload, rejection, re-upload, verification, and expiry loops work end-to-end
- lifecycle records can drive document obligations through backend rules
- generated HR letters are configurable and persisted as artifacts
- employee records expose documents and letters in a meaningful operational view
- admin configuration is sufficient to change behavior without code edits
- backend smoke coverage exists for critical document and letter paths
- frontend uses the same shared UI/UX language already established across the platform

---

## 20. Immediate Recommended Start

Start with `Slice 1: Storage Foundation And Artifact Metadata`.

Reason:

- every later slice depends on real artifact persistence
- upload maturity must exist before review loops become trustworthy
- letters should not be implemented before storage and artifact rules are stable

Recommended first implementation sub-sequence:

1. finalize artifact storage abstraction
2. refine artifact and employee-document metadata shape
3. add upload and controlled retrieval API
4. expose frontend-ready artifact metadata
5. add upload UI in HR admin and employee document flows

Once that is stable, continue directly into Slice 2.
