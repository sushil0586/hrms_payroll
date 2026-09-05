# Phase 4 Backend Execution Matrix

## 1. Purpose

This document breaks `Phase 4: Documents, Letters, and Employee Record Completion` into backend-specific execution workstreams.

Use this document to answer:

- what backend work belongs inside Phase 4
- what groundwork is already in place from earlier phases
- what still must be built for real document and artifact depth
- what outcome marks each backend workstream as complete

This document should be read together with:

- [phase4-documents-letters-execution-plan.md](/Users/ansh/Documents/hrms-payroll-saas/docs/phase4-documents-letters-execution-plan.md)

---

## 2. Backend Outcome

Phase 4 backend should end with this result:

- documents are stored through a real abstraction layer
- employee document operations are system-driven, not shallow metadata-only flows
- lifecycle events can generate or enforce document obligations
- generated HR letters are first-class persisted artifacts
- employee records expose documents and generated outputs as part of operational truth

---

## 3. Matrix

| Workstream | Scope In Phase 4 Backend | Ground Already In Place | Remaining In Phase 4 Backend | Done Signal |
| --- | --- | --- | --- | --- |
| Storage abstraction foundation | Introduce a real storage layer for uploaded and generated artifacts | Document categories, requirement rules, employee document models, lifecycle records, and broad admin API foundation already exist; current system has the domain base but not full artifact-storage depth | Add storage service abstraction, local/dev adapter, production-ready object-storage adapter path, artifact key strategy, tenant-safe storage ownership, checksum and file metadata persistence, and controlled retrieval design | Backend can persist and retrieve document artifacts through an abstraction without hardwiring business logic to one provider |
| Artifact domain model completion | Normalize uploaded files and generated letters into one artifact-aware model | Employee documents and letter/domain groundwork already exist conceptually, and lifecycle plus document families are already modeled enough to link artifacts later | Add or refine artifact records, source-kind metadata, uploaded-versus-generated distinction, version markers, storage metadata, current-version linkage, and employee/lifecycle linkage fields | Uploaded files and generated letters can be represented consistently as first-class artifacts |
| Upload and retrieval API surface | Support real upload/download lifecycle instead of metadata-only records | HR admin and document APIs already exist, and auth, role gating, and tenant patterns are already established across the backend | Add artifact upload endpoints, document-linked upload flows, retrieval endpoints or signed-access issuance, validation failures for content type and file size, and secure tenant-scoped access checks | A real file can be uploaded, stored, validated, and retrieved safely through backend APIs |
| Document review state machine | Make verification, rejection, and re-upload behavior operational and explicit | Employee document review base and admin document APIs already exist, along with queue/listing patterns and status-driven web surfaces | Add normalized state transitions for verify, reject, request re-upload, replace current file, version history, rejection reasons, and review history; ensure transitions obey configuration rules | HR can review a document end-to-end and the backend preserves current state, review history, and active version clearly |
| Replacement and version trust | Keep current and historical artifact versions auditable | Existing document rows and basic review surfaces give a starting point, but replacement lineage is still shallow | Add version-chain behavior, current-version markers, superseded-file behavior, replacement permissions, historical metadata retention, and list/detail selectors that expose version state cleanly | Re-upload or replacement never destroys traceability, and the backend always knows which version is current |
| Requirement-rule execution | Make requirement rules drive actual behavior instead of only existing as setup rows | Document categories and requirement-rule APIs already exist, and lifecycle templates now expose rule metadata patterns from Phase 3 | Extend requirement-rule runtime so rules determine applicability, mandatory state, verification requirements, expiry requirements, upload role allowance, and lifecycle-triggered obligation creation | Requirement rules actively control document obligations and the backend can explain why a document is required or optional |
| Lifecycle document linkage | Connect onboarding, probation, movement, and exit to document obligations | Phase 3 completed lifecycle state sync, workflow-template-driven work item seeding, due-date derivation, and owner-routing depth | Add lifecycle-to-document trigger execution, rule-based due anchors and offsets for document obligations, missing-document state rollups, and lifecycle readiness gating where configured | Lifecycle events can create, gate, or summarize document work through backend rules and due-date logic |
| Expiry derivation and reminder events | Treat document expiry as an operational state, not just a date field | Document expiry fields already exist in the model family, and notification/event foundations already exist from earlier phases | Add expiry evaluation service, expiring/expired state derivation, reminder scheduling rules, event generation for expiring and overdue artifacts, and selectors for urgency surfaces | Expiring and expired artifacts generate backend-trusted urgency state and reminder-worthy events |
| Letter template engine | Support configurable HR letter generation with backend-owned merge logic | Document and workflow families already exist, and the platform now has stronger config and template patterns from policy and lifecycle phases | Add letter-template CRUD depth, merge-field metadata, context builders, preview render path, final generation path, persistence as artifacts, and generation audit snapshot | HR letters can be configured and generated from backend templates without code edits |
| Generated artifact persistence | Ensure letters are stored as artifacts, not transient outputs | Report exports and document concepts exist, but generated letters are not yet part of employee artifact truth | Persist generated files through the same artifact layer, link them to employees and lifecycle records, store generation context snapshots, and expose later retrieval/list history | Generated letters are retrievable later and appear as real employee artifacts |
| Unified employee record selectors | Expose completed employee-record read models for frontend consumption | Employee detail, access detail, lifecycle detail, and document families already exist independently; selector and serializer patterns are strong | Add employee artifact summary selectors, missing/rejected/expired document rollups, generated-letter summaries, timeline payloads, and completeness signals | Frontend can load a unified employee record API without reconstructing document and letter truth client-side |
| Phase 4 backend regression confidence | Protect the new document and artifact depth with reliable automated coverage | Backend smoke suite is already in place and has been expanded successfully through Phases 0 to 3 | Add smoke coverage for upload validation, secure retrieval, review transitions, version history, lifecycle-triggered obligations, expiry events, and generated-letter persistence | Phase 4 backend closes with smoke coverage on critical document and generated-artifact paths |

---

## 4. Recommended Backend Execution Order

Recommended order for backend implementation:

1. storage abstraction foundation
2. artifact domain model completion
3. upload and retrieval API surface
4. document review state machine
5. replacement and version trust
6. requirement-rule execution
7. lifecycle document linkage
8. expiry derivation and reminder events
9. letter template engine
10. generated artifact persistence
11. unified employee record selectors
12. final Phase 4 backend regression pass and documentation closeout

This order keeps runtime truth ahead of UI polish and prevents generated letters from being built on top of weak artifact foundations.

---

## 5. Slice Mapping

Each backend workstream maps to the main Phase 4 slices as follows.

| Slice | Primary Backend Workstreams |
| --- | --- |
| Slice 1: Storage Foundation And Artifact Metadata | Storage abstraction foundation, artifact domain model completion, upload and retrieval API surface |
| Slice 2: Verification, Rejection, Re-Upload, And Versioning | Document review state machine, replacement and version trust |
| Slice 3: Requirement Rules And Lifecycle Linkage | Requirement-rule execution, lifecycle document linkage |
| Slice 4: Expiry Tracking And Reminder Events | Expiry derivation and reminder events |
| Slice 5: Letter Template Engine And Generated Artifacts | Letter template engine, generated artifact persistence |
| Slice 6: Unified Employee Record Completion | Unified employee record selectors |

---

## 6. Backend Exit Checklist

Phase 4 backend can be considered complete when all of the following are true:

- artifact storage is real and pluggable
- uploaded and generated artifacts share a normalized backend model
- document review, rejection, re-upload, and replacement behavior is explicit and auditable
- lifecycle rules can generate or enforce document obligations
- expiry and reminder behavior is system-derived
- letters are template-driven and persisted as artifacts
- unified employee-record APIs expose document and artifact truth cleanly
- backend smoke tests cover major Phase 4 risk paths
