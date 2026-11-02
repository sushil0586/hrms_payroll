# Statutory Declaration Transformation Contract

## Scope

This contract governs the employee statutory declaration journey from tenant configuration through employee proof submission, HR review, declaration locking, and payroll/finance consumption.

## Lifecycle ownership

| State or action | Employee | HR reviewer | Payroll approver | Finance reviewer |
| --- | --- | --- | --- | --- |
| Create and update draft | Own declaration only | No | No | No |
| Upload or replace proof | Own editable declaration only | No | No | No |
| Submit declaration | Own declaration only | No | No | No |
| Verify or reject proof | No | Yes | No | No |
| Verify declaration | No | Yes | No | No |
| Lock declaration | No | No | Yes | No |
| Review locked totals and reconciliation | Own summary | Yes | Yes | Yes |
| View private proof | Own proof | Explicit permission | Explicit permission | Not by default |

Lifecycle state, declared totals, verified totals, source references, source hashes, document references, and artifact keys are server-owned. They must not be accepted through generic create or update forms.

## Declaration catalog

The active tenant statutory pack is the source of truth. Its `config_snapshot.declaration_catalog` may define:

```json
{
  "financial_years": [
    {
      "value": "FY2026-27",
      "label": "FY 2026-27",
      "is_open": true,
      "declaration_profile_ref": "payroll.statutory.declaration.india.default.v1",
      "proof_window_ref": "apr-to-jan-proof-window"
    }
  ],
  "sections": [
    {
      "code": "80C",
      "label": "80C investments",
      "item_kinds": ["investment"],
      "component_codes": ["LIC", "ELSS", "PPF", "EPF", "NSC", "TUITION_FEES"],
      "proof_required": true
    }
  ]
}
```

New declaration writes must use an open financial year from this catalog. New proof rows must use a configured section, an allowed item kind, and, when supplied, an allowed component code. The API derives declaration profile and proof-window references from the selected year.

Legacy packs without a declaration catalog receive a bounded India compatibility catalog. The response identifies that source so administrators can migrate the pack to explicit tenant configuration.

## Transition rules

1. Employees may edit only draft or rejected declarations that they own.
2. Employees cannot set proof verification state or provide raw document/artifact identifiers.
3. Submission requires at least one item and all proof-required rows must carry an owned private document.
4. HR proof decisions occur only through the proof decision endpoint.
5. Declaration verification occurs only through the verification endpoint after all required proof rows are resolved.
6. Declaration locking occurs only through the lock endpoint after verification.
7. Payroll consumes only locked declaration snapshots and records their source hashes.

## Compatibility and rollout

Existing declarations remain readable and retain their original references. Catalog enforcement applies to new rows and edits. Before removing the compatibility catalog, every active statutory pack must carry an explicit declaration catalog and pass the employee-to-finance certification suite.

## Implementation progress

### Phase 1 - Catalog and lifecycle integrity

Completed locally:

- Catalog-backed financial year, section, item-kind, and component choices.
- Server-derived declaration profile and proof-window references.
- Explicit rejection of client-supplied lifecycle totals, proof state, and storage identifiers.
- Required-proof enforcement before declaration submission.

### Phase 2 - Proof replacement and review ownership

Completed locally:

- ESS replacement of an existing proof while retaining the previous private document version.
- Replacement requests are bound to the exact declaration item and currently linked document.
- Replaced proof returns to the existing item and the HR review queue; it does not create a duplicate declaration row.
- Raw private document references are no longer displayed in the ESS proof detail.
- Statutory declaration locking requires `payroll.approve`; `statutory.declarations.manage` remains the HR proof-review permission.
- Payroll Finance Manager receives declaration read access but not private-proof access by default.

Destructive proof removal remains intentionally unavailable until a tenant retention and legal-hold policy is approved. Replacement is the supported correction path.

### Phase 3 - Review workbench and finance reconciliation boundary

Completed locally:

- HR reviewers can verify or reject each submitted proof from the declaration detail, with a mandatory reason for rejection.
- HR reviewers can verify a declaration or return it with a reason; pending actions prevent duplicate submission and surface server errors in an accessible status region.
- The lock action is rendered only for payroll approvers and remains protected by the backend `payroll.approve` check.
- Finance reviewers with `payroll.review` or `payroll.approve`, but no statutory permission, receive only locked declarations and locked-declaration aggregate counts.
- Finance declaration labels are pseudonymous. Employee identifiers, employee codes, statutory profiles, declaration items, actor names, source references, configuration snapshots, and private proof details are removed server-side.
- HR statutory access continues to return the detailed proof-review payload; the finance boundary does not broaden HR or employee permissions.

PostgreSQL verification passed the focused finance-redaction and declaration/proof lifecycle tests. The focused run covered proof replacement ownership, proof verification and rejection, declaration verification, lock authorization, locked-state persistence, and finance payload redaction.

### Phase 4 - Governed catalog and reconciliation evidence

Completed locally:

- The Catalog tab now provides structured financial-year and declaration-section controls instead of requiring administrators to edit raw JSON.
- Catalog saves preserve unrelated statutory-pack configuration, validate required fields, reject duplicate year values and section codes, and reject unsupported declaration item kinds.
- Successful pack and catalog changes write an attributed immutable setup-audit event containing the prior and resulting declaration catalog.
- Declaration detail now presents a readable lifecycle timeline with actor attribution for HR and proof-level decision timestamps and rejection reasons.
- Finance can export a locked-only CSV containing pseudonymous declaration references, totals, proof counts, lock timestamps, and source hashes. Employee identifiers and private proof details are excluded by the server response and therefore cannot enter the export.

PostgreSQL verification passed three focused catalog, declaration lifecycle, and finance-redaction tests. TypeScript, focused ESLint, Django checks, and migration drift checks passed without a schema change.

### Phase 5 - Connected employee-to-finance certification

Completed locally on 2 November 2026 using task-owned PostgreSQL, Django, and a production-built Next.js server:

- An employee updated a draft declaration, selected catalog-controlled FY2026-27, section 80C, and component LIC, then uploaded a synthetic private PDF and submitted the declaration through the browser.
- An HR reviewer verified the proof and declaration, then locked it for payroll through the browser. Each transition displayed its scoped success feedback and persisted after reload.
- PostgreSQL independently confirmed a single locked declaration and proof row, matching tenant and employee ownership, attributed submit/verify/lock actors, equal declared and verified totals of 12,500.00, and 64-character declaration and item source hashes.
- Private storage independently confirmed an active employee document linked to a local test artifact with PDF metadata and a 64-character SHA-256 checksum.
- A Finance-only identity could see and export only the pseudonymous locked reconciliation. The browser assertion confirmed that employee code and proof filename were absent from the page and CSV.
- The connected Playwright suite passed 2/2 with one worker. Three focused PostgreSQL catalog, lifecycle, and finance-redaction tests also passed.

Destructive proof removal remains outside this phase. Replacement remains the supported correction path until retention, legal-hold, and removal ownership are approved.

### Phase 6 - Governed correction and relock

Completed locally on 2 November 2026:

- Payroll approvers can reopen only verified or locked declarations and must provide both a correction reason and an approval reference.
- Reopening is rejected when the declaration financial year is closed. A closed year must use the separate governed year-close exception process.
- Reopening clears verification and lock ownership, returns the employee profile to proofs-pending, and records the previous status and source hash in an immutable lifecycle snapshot.
- A tenant audit event records the actor, declaration reference, financial year, reason, approval reference, prior state, and resulting source hash without exposing proof content.
- Finance reconciliation now exposes pseudonymous matched/exception status, amount difference, and exception count while retaining the private-proof boundary.
- The browser-certified correction path is reopen, replace proof, resubmit, verify proof, verify declaration, and relock. Replacement retains the prior private document as a replaced version.

The clean connected suite passed 3/3 with one worker in 20.3 seconds. PostgreSQL independently confirmed one lifecycle reopen event, one replaced document version, one active replacement, matching tenant and employee ownership, valid artifact checksums and source hashes, and final locked totals of 12,500.00.

### Phase 7 - Financial-year close and reconciliation operations

Completed locally on 2 November 2026:

- HR and Finance can filter declaration evidence by financial year, lifecycle status, and reconciliation state; HR can additionally search employee identity while Finance searches only pseudonymous declaration references.
- Finance filtering remains downstream of the server-enforced aggregate-only payload, so private proof content and employee identifiers never enter the Finance page or export boundary.
- Financial-year state can no longer be changed through a generic statutory-pack edit. Close and reopen use a dedicated governed endpoint requiring both statutory setup management and payroll approval.
- Closing requires a reason and approval reference and fails while declarations are unresolved, totals differ, or proof exceptions remain. No partial catalog mutation occurs on a failed readiness check.
- Successful close and reopen transitions preserve bounded lifecycle history and write attributed, hashed audit events containing the year, actor reference, approval reference, reason, prior state, and resulting state.
- The catalog UI presents lifecycle state as read-only and exposes only the governed close or reopen action. Successful actions retain accessible feedback while refreshing the returned pack state.
- Server-backed declaration filters now use document navigation, preventing an intercepted RSC transition from leaving selected filters pending without durable URL state.

The connected production-build browser suite passed 3/3 with one worker in 10.5 seconds. PostgreSQL independently confirmed the ordered close/reopen audit pair, both approval references, valid audit hashes, and the final reopened year state. Five focused PostgreSQL/Django tests passed, including denied authorization, readiness blocking, generic-edit bypass prevention, governed close/reopen, finance redaction, declaration correction, and proof lifecycle coverage.

### Phase 8 - Locked evidence payroll consumption

Completed locally on 2 November 2026:

- TDS declaration-cap processing now consumes only declarations in the locked lifecycle state. Verified, submitted, rejected, and draft declarations cannot alter a payroll calculation, even if a profile attempts to configure those states as eligible.
- Every consumed declaration item contributes its declaration ID, declaration source hash, item ID, and item source hash to the immutable calculation provenance payload.
- The same bounded provenance is retained in the calculation trace for Finance review. Proof filenames, document references, employee statutory identifiers, and private payloads are excluded.
- The payroll calculation detail surface now presents the full declaration and item source hashes under a dedicated read-only evidence section.
- PostgreSQL verification demonstrated that a verified declaration produced no cap adjustment, locking that exact declaration enabled the configured cap, and the calculation-line source hash changed when the locked evidence entered the calculation.

The focused final regression passed against PostgreSQL 16. A connected production-build Playwright run also passed 1/1, matching the displayed declaration and item hashes to PostgreSQL while confirming private proof references and PAN data were absent. The run exposed and closed a selected-line API contract gap: paginated rows remain lightweight, while one tenant-scoped full trace is returned for the active line. TypeScript, focused ESLint, Django system checks, migration drift, and the production frontend build passed. This phase used draft calculations with synthetic records only; it did not run, approve, or pay real payroll.

### Phase 9 - Review seal and final-lock integrity

Completed locally on 2 November 2026:

- Opening a payroll review now seals every calculation-line source hash and every consumed statutory declaration/item source hash into the review configuration snapshot.
- Submit, approval, and final lock fail closed when calculation lines change, a consumed declaration is no longer locked, a consumed item is missing, or either statutory source hash differs from the sealed value.
- The transition services lock the review, declaration, and item rows inside PostgreSQL transactions so evidence cannot change between validation and the state transition.
- Maker/checker separation remains enforced in both layers: the maker approval control is disabled in the browser and a direct authenticated approval attempt is rejected by the API.
- Final-locked calculation lines reject model-level update and delete attempts, and a locked payroll run cannot be recalculated.
- Legacy open reviews that do not contain a calculation evidence seal must be replaced by a new controlled calculation and review; they are not silently grandfathered.

The focused PostgreSQL regression passed 2/2. The connected production-build Playwright case passed 1/1 with separate maker and checker identities, proving pre-review evidence visibility, maker submission, self-approval denial, checker approval, final lock, and unchanged post-lock declaration/item hashes. Output generation, payslip publication, provider handoff, payment, and statutory filing were not executed.

### Phase 10 - Sealed output publication and ESS payslip integrity

Completed locally on 2 November 2026:

- Output generation now revalidates the final-locked review evidence and copies the canonical calculation-evidence payload and SHA-256 hash to the output batch.
- Every generated payslip and payroll register carries the same calculation-evidence hash. Publication revalidates that hash, each artifact source hash, and each stored-file checksum inside a PostgreSQL transaction.
- A tampered generated artifact fails closed before publication. Generated payslips remain hidden from ESS until the complete output batch is published.
- The connected production-build browser flow used separate maker, checker, employee, and other-employee identities. It submitted, approved, and final-locked the review; generated and inspected the outputs through the durable Celery Beat/Redis/worker path; published the batch; and verified the employee download checksum.
- The employee could review and download only their published payslip. A different employee received a tenant-scoped denial for the same artifact.
- Finance handoff remained disabled before publication and was not executed after publication. Provider transmission, payment, bank processing, and statutory filing remained outside this phase.

The focused PostgreSQL/Django regression passed 5/5 and the connected production-build Playwright case passed 1/1 with one worker. TypeScript, focused ESLint, Django system checks, migration drift, and the production frontend build passed. The build retained the pre-existing Autoprefixer warning recommending `flex-end` instead of `end`.

### Phase 11 - Finance handoff generation boundary

Completed locally on 2 November 2026:

- Finance handoff generation now locks and revalidates the published output batch before deriving any downstream artifact.
- The handoff records the final calculation-evidence hash plus a canonical manifest and SHA-256 hash for the published payslip and payroll-register sources.
- Bank advice, accounting export, statutory summary, and statutory filing artifacts retain those evidence references alongside independent source and file checksums.
- A mixed-role Payroll Finance Manager can enter the permission-filtered HR workspace even when the same identity also has ESS and manager roles. Ordinary managers remain excluded.
- The frontend now exposes the authenticated finance-handoff setup proxy used for independent browser assertions; Django continues to enforce the underlying permission and tenant scope.
- The connected production-build browser flow generated and inspected the handoff as Finance, confirmed ESS denial, and stopped before transmission. PostgreSQL independently confirmed three generated artifacts, matching evidence links, reconciled bank and net totals, and zero provider-delivery rows.

The final Playwright run passed 1/1 with one worker in 23.2 seconds. The focused workspace regression passed 2/2 on PostgreSQL. TypeScript, focused ESLint, Django system checks, migration drift, and the production frontend build passed. No provider transmission, bank upload, payment, statutory filing, shared-staging mutation, or production operation was performed by the certified flow.

### Phase 12 - Controlled provider transmission and reconciliation

Completed locally on 2 November 2026:

- Provider transmission now revalidates the final-locked review seal, published output manifest, handoff manifest hash, and every finance artifact source hash before creating delivery rows.
- Tampering with a generated finance artifact fails closed with no provider delivery or handoff-state mutation.
- The production-built browser flow transmitted three synthetic artifacts through the internal manual/sandbox adapter, replayed the request idempotently, reconciled all three deliveries, and generated one immutable provider audit pack.
- PostgreSQL independently confirmed three unique idempotency keys, three matching artifact/payload checksums, no failed or rejected delivery, and an accepted handoff.
- A Finance Manager completed the workflow while an ESS identity remained denied. The list endpoint retained its bounded detail contract; checksum reconciliation was asserted from the authorized action response and PostgreSQL.
- Governed Playwright cleanup now removes provider jobs, callbacks, retries, and deliveries before protected payroll artifacts, allowing exact-tenant teardown after provider testing.

The production-build Playwright case passed 1/1 with one worker. Four focused PostgreSQL tests passed: sealed transmission and tamper denial, callback idempotency, retry/dead-letter handling, and sandbox credential-boundary resolution. TypeScript, focused ESLint, Django system checks, migration drift, and the production frontend build passed. This phase used synthetic records and internal test adapters only; it did not contact a live bank, accounting system, or statutory portal and did not initiate payment or filing.
