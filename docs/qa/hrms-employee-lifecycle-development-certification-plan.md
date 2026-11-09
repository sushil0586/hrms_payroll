# Employee Lifecycle Development and Certification Plan

Date: 2026-11-05
Applies to: Employee Lifecycle contract and `ELC-001` through `ELC-100`
Target: certificate-grade local qualification followed by separately authorized staging verification.

## 1. Certification standard

The module is certified only when all mandatory applicable scenarios pass against one immutable candidate with independent browser, API, PostgreSQL, audit, RBAC, accessibility, responsive, and cleanup evidence.

The following do not establish certification by themselves:

- a successful UI toast;
- unit tests without browser execution;
- API tests without durable database reconciliation;
- screenshots without functional assertions;
- historical results from a different commit;
- a rerun that passes without explaining the original failure;
- local logs used as proof of centralized retention;
- owner-dependent scenarios silently removed from the denominator.

### Verdicts

| Verdict | Meaning |
| --- | --- |
| Passed | Every mandatory assertion and evidence source is satisfied on the candidate |
| Failed | Executed behavior violates the approved contract |
| Blocked | Execution cannot proceed because an external policy, authority, provider, or environment requirement is genuinely unavailable |
| Not Run | Not executed against the candidate |
| Not Applicable | Product and QA owners approved a documented contract disposition while preserving the stable scenario ID |

### Evidence required per scenario

1. Frozen scenario ID and acceptance criteria.
2. Candidate Git SHA, backend image/source revision, frontend build ID, and runner revision.
3. Persona, tenant, employee, run, and correlation references using pseudonymous identifiers.
4. Browser action and exact visible success/error feedback.
5. Authenticated API method, route, and status.
6. PostgreSQL before/after state and integrity invariants.
7. Audit event and denial evidence where required.
8. RBAC and tenant-isolation result.
9. Accessibility and responsive result where applicable.
10. Cleanup or retained-history outcome.

## 2. Shared engineering rules

- Use existing architecture, services, permissions, components, and feedback patterns.
- Preserve stable employee identity and immutable historical relationships.
- Route organization changes through effective-dated assignment services.
- Use database constraints and transactions for integrity, not UI checks alone.
- Use server-owned idempotency for replay-sensitive mutations.
- Use optimistic concurrency or an equivalent explicit stale-write contract for protected updates.
- Reject foreign-tenant identifiers before disclosing whether they exist.
- Record successful and denied protected actions without credentials or unnecessary personal data.
- Do not introduce hard delete for employee history.
- Keep cross-entity transfer, retroactive correction, and rehire fail-closed until approved.
- Reuse the accepted employee in-flow detail panel; do not convert it into a popup merely for visual uniformity.
- Use one error summary plus linked field errors and one truthful success notification.

## 3. Shared test environment

Each development phase uses task-owned infrastructure:

- PostgreSQL 16 database;
- Django backend using production-like settings;
- Redis and Celery worker/beat when asynchronous behavior is in scope;
- production-built Next.js frontend;
- one Playwright worker initially;
- private synthetic media storage;
- isolated notification/provider adapters;
- two tenants for isolation tests;
- HR Admin, Tenant Admin, ESS, MSS, Finance/Payroll, Auditor, and unauthorized personas as required.

Fixtures must be deterministic, run-owned, non-PII, and uniquely identifiable. Cleanup uses exact IDs and cannot rely only on a name prefix.

## 4. Phase EL-0 - Contract, ownership, and traceability freeze

### Development work

- Review the functional contract and scenario register with Product, HR, Security, Payroll/Finance, and QA.
- Classify each scenario as mandatory, optional, blocked, or owner-approved Not Applicable.
- Assign policy owners to cross-entity transfer, correction, rehire, exit dependencies, and import atomicity.
- Build a traceability matrix from every ELC ID to route, component, API, serializer/service, model/table, permission, audit event, and automated test.
- Freeze supported field definitions, configurable policies, role authority, notification events, and retention requirements.

### Certification work

- Verify all 100 IDs remain unique and unchanged.
- Verify every P0/P1 scenario has an owner and evidence contract.
- Verify blocked scenarios state the exact missing decision.
- Verify existing historical evidence is linked but not promoted automatically.

### Exit gate

- Contract approved by required owners.
- No unowned P0 requirement.
- No contradictory UI/API/database rule.
- Traceability coverage is 100%.

## 5. Phase EL-1 - Employee directory and master data

Scenario scope: `ELC-001` through `ELC-032`.

### Development work

- Reconcile directory totals, filters, search-on-Enter, dropdown-only filtering, sorting, pagination, stale-page handling, loading, empty, and API-error states.
- Preserve URL, browser history, selected employee, and focus behavior.
- Standardize header, in-flow detail panel, table containment, disabled states, warning colors, and feedback placement.
- Complete browser and API validation for every employee field and organization relationship.
- Confirm creation atomically writes employee, first spell, first assignment, and audit event.
- Add server idempotency for employee creation if current API cannot guarantee replay safety.
- Introduce explicit stale-write protection for employee edits.
- Reconcile optional-field clearing, deactivation, and protected DELETE behavior.

### Certificate-grade tests

- Desktop, tablet, mobile, keyboard, and short-height browser execution.
- Required, whitespace, format, minimum/maximum length, date-boundary, uniqueness, and invalid-reference cases.
- Duplicate click, exact replay, network uncertainty, backend validation, cancellation, refresh, and concurrent-session cases.
- PostgreSQL proof for employee/spell/assignment/audit atomicity.
- Cross-tenant and unauthorized reads/writes.
- Hard-delete rejection and historical reference preservation.
- Accessibility scan plus focus and live-region assertions.

### Exit gate

- All mandatory `ELC-001` through `ELC-032` Passed.
- No false success, duplicate employee, stale overwrite, or tenant disclosure.
- No unresolved P0/P1 employee-master defect.

## 6. Phase EL-2 - Access and payout accounts

Scenario scope: `ELC-033` through `ELC-047`.

### Development work

- Enforce `employees.access.manage` independently in UI and API.
- Reconcile role assignment, revocation, fresh-session behavior, privilege boundaries, and last-admin protection.
- Bind access-disable behavior to approved inactive/exit timing.
- Complete bank masking, validation, primary-account constraints, tenant ownership, audit, and concurrency behavior.
- Add stale-write and idempotency controls to sensitive maintenance endpoints.
- Ensure receipts and audit payloads never reveal credentials or complete bank numbers.

### Certificate-grade tests

- Provision ESS; add/remove MSS; revoke access; refresh or reauthenticate; verify effective permissions.
- Attempt unauthorized role grants, self-escalation, final-admin removal, and cross-tenant membership changes.
- Verify persona switching for an employee who is also a manager.
- Add/edit bank account; primary switch; invalid formats; duplicate/concurrent update; foreign employee; unauthorized read/write.
- Reconcile PostgreSQL membership, role, account, and audit state.
- Scan browser output, API bodies, logs, reports, screenshots, and traces for sensitive values.

### Exit gate

- All mandatory `ELC-033` through `ELC-047` Passed.
- Revocation is effective in a fresh session.
- Last-admin, masking, and tenant isolation cannot be bypassed.

## 7. Phase EL-3 - Onboarding and probation

Scenario scope: `ELC-048` through `ELC-058`.

### Development work

- Confirm or implement the probation queue/detail/decision surface.
- Centralize valid onboarding and probation transitions in services.
- Enforce owner/template/employee tenant scope and duplicate prevention.
- Separate employee/manager-visible information from restricted HR notes.
- Define confirmation, extension, and separation consequences.
- Connect separation to the governed exit flow.
- Implement the approved notification matrix and audit rollback requirements.

### Certificate-grade tests

- Create, progress, block, resume, complete, and cancel onboarding.
- Duplicate onboarding and invalid employee/owner/template/date cases.
- Confirm, extend, separate, and reject invalid probation decisions.
- Verify ESS/MSS visibility and private-note denial.
- Inject audit and notification failures according to the approved transaction policy.
- Reconcile UI, API, database, audit, and notification outbox state.

### Exit gate

- All mandatory `ELC-048` through `ELC-058` Passed.
- No invalid transition, duplicate onboarding, privacy leak, or direct destructive separation.

## 8. Phase EL-4 - Effective movements and manager history

Scenario scope: `ELC-059` through `ELC-074`.

### Development work

- Route interactive and imported reporting-manager changes through the effective assignment service.
- Persist effective date, reason, source, actor, approval, and resulting assignment.
- Add durable movement idempotency and stale-approval checks.
- Implement deterministic planned-assignment activation with retry, monitoring, and audit.
- Complete same-tenant transfer, promotion, designation, grade, branch, location, business-unit, reporting, and employment-type behavior.
- Preserve old-manager historical decisions while changing current MSS scope.
- Keep cross-entity and retroactive correction paths blocked until policy approval.

### Certificate-grade tests

- Execute every supported movement type with current, future, and permitted backdated dates.
- Verify prior assignment closure and one canonical resulting assignment.
- Test overlap, same-day collision, stale approval, exact replay, and simultaneous writers.
- Validate point-in-time leave and attendance organization resolution.
- Verify former/new manager current and historical scope across effective dates.
- Verify foreign target and foreign manager denial without disclosure.
- Verify activation retry does not duplicate business effects.

### Exit gate

- All mandatory executable `ELC-059` through `ELC-072` Passed.
- `ELC-073` and `ELC-074` remain visibly Blocked unless formally approved and implemented.
- No assignment overlap, duplicate activation, historical rewrite, or manager-scope leak.

## 9. Phase EL-5 - Exit, post-exit, and rehire boundary

Scenario scope: `ELC-075` through `ELC-084`.

### Development work

- Create one authoritative exit-transition service.
- Enforce valid status transitions and maker-checker authority where approved.
- Calculate downstream blockers for payroll/FnF, leave, attendance, documents, statutory records, assets, and open workflows.
- Atomically close assignment/spell, update employee projection, disable access at the approved point, and emit audit/notification events.
- Define allowed pre-effect cancellation and governed correction after protected effects.
- Keep hard delete prohibited and rehire blocked until policy approval.

### Certificate-grade tests

- Draft, submit, approve, progress clearance, complete, and eligible cancellation.
- Invalid dates, invalid transitions, stale approval, duplicate completion, concurrent completion, and audit failure.
- Open downstream dependencies and correct owner guidance.
- Post-exit ESS, MSS, HR, Finance, document, audit, and API access behavior.
- Historical payroll/leave/attendance/statutory/document reference integrity.
- Hard-delete denial at API, ORM, and database boundaries where relevant.

### Exit gate

- All mandatory executable `ELC-075` through `ELC-083` Passed.
- `ELC-084` remains Blocked unless rehire policy is approved and implemented.
- No partial exit, retained unauthorized access, or broken historical reference.

## 10. Phase EL-6 - Imports, audit, notifications, and operations

Scenario scope: `ELC-085` through `ELC-100`.

### Development work

- Add server-owned import batches, row identities, immutable outcomes, and idempotency keys.
- Implement approved all-or-nothing or eligible-row atomicity semantics.
- Persist reporting-manager effective date/reason instead of preview-only metadata.
- Freeze lifecycle notification events, recipients, templates, channels, retries, and deduplication.
- Ensure audit events are structured, redacted, queryable, and transactionally correct.
- Standardize operational loading/error/retry states and exact-ID cleanup tooling.

### Certificate-grade tests

- Correct templates and valid previews for all three imports.
- Malformed CSV, encoding, header, row limit, duplicate, ambiguous, foreign, and invalid-date cases.
- Partial failure, retry, replay, concurrent commit, interrupted commit, and reconciliation.
- Audit success, denial, redaction, correlation, and mandatory-writer failure.
- Notification success, duplicate suppression, provider interruption, retry, disabled channel, and recipient isolation using an isolated provider.
- Full mobile/tablet/keyboard/accessibility sweep.
- Exact-ID cleanup with protected-history and cross-tenant safeguards.

### Exit gate

- All mandatory `ELC-085` through `ELC-100` Passed.
- No duplicate import effects, sensitive evidence, missing mandatory audit, or unauthorized notification.

## 11. Phase EL-7 - Joined local certification

### Candidate freeze

- Freeze exact source/test/report manifest and SHA-256 checksum.
- Record parent SHA, application revision, migration list, frontend build ID, and image expectations.
- Run secret and generated-artifact scans.
- Preserve unrelated working-tree changes and protected payroll tests.

### Joined execution

- Provision one connected isolated environment from empty database through complete employee lifecycle.
- Execute HR Admin -> ESS -> MSS -> HR Admin transitions with API and PostgreSQL reconciliation.
- Run every mandatory ELC scenario not owner-approved as blocked or Not Applicable.
- Run critical paths in Chromium, Firefox, and WebKit; use the approved bounded browser matrix for lower-risk validations.
- Run focused neighboring regressions for Organization/RBAC, Leave, Attendance, Documents, Notifications, Statutory inputs, and Payroll inputs.
- Execute TypeScript, ESLint, production build, Django checks, migration drift, database constraints, and secret scanning.

### Local certificate gate

- Zero Failed mandatory scenarios.
- Zero unexplained Not Run P0/P1 scenarios.
- All Blocked scenarios carry current owner/action references.
- All evidence maps to the same immutable candidate.
- No unresolved critical/high security, integrity, privacy, accessibility, or tenant-isolation defect.
- Cleanup independently verifies zero unintended task-owned resources.

Local PASS qualifies a staging candidate; it does not certify staging or production.

## 12. Phase EL-8 - Controlled staging qualification

This phase requires separate environment-specific authorization.

### Preconditions

- Immutable candidate image digests and deployed SHA verified.
- Encrypted off-host backup and isolated restore evidence current.
- Named execution, cleanup, security, and recovery owners.
- Approved synthetic tenant namespace, identities, recipient controls, window, and evidence retention.
- Active environment fingerprint and time-bounded evidence authorization.

### Execution

- Run a bounded staging subset proving deployment provenance, authentication, employee creation, access, same-tenant movement, manager scope, deactivation/exit boundary, audit, notification isolation, and cleanup/quarantine.
- Do not use real employee, payroll, or communication data.
- Stop immediately on privilege escalation, tenant disclosure, duplicate lifecycle effects, missing mandatory audit, or unapproved notification.

### Staging gate

- Every authorized staging scenario has browser/API/evidence/audit proof.
- Deployed SHA and digests match throughout execution.
- Cleanup or quarantine reconciles every owned resource.
- Unexecuted scenarios remain explicitly Not Run.

## 13. Phase EL-9 - Release decision

The release report must state:

- candidate SHA and exact manifest;
- Passed, Failed, Blocked, Not Run, and approved Not Applicable totals;
- module and subpackage confidence based on executed evidence, not intuition;
- unresolved policy, security, accessibility, performance, and operational risks;
- rollback and recovery references;
- environment-specific scope;
- explicit GO, CONDITIONAL, or NO-GO verdict.

Production remains NO-GO until the authorized release owner accepts all mandatory gates and the production deployment has its own change, recovery, privacy, and operational approvals.

## 14. Execution order and estimated batches

| Order | Batch | Primary IDs | Expected output |
| ---: | --- | --- | --- |
| 1 | EL-0 contract freeze | All IDs | Approved traceability matrix and policy register |
| 2 | EL-1A directory/read | ELC-001-013 | Directory and scope certificate |
| 3 | EL-1B create/edit | ELC-014-032 | Employee master certificate |
| 4 | EL-2 access/bank | ELC-033-047 | Sensitive-controls certificate |
| 5 | EL-3 onboarding/probation | ELC-048-058 | Joining and probation certificate |
| 6 | EL-4A movements | ELC-059-070 | Effective-assignment certificate |
| 7 | EL-4B manager history | ELC-071-074 | MSS scope and policy-blocker report |
| 8 | EL-5 exit | ELC-075-084 | Exit and retained-history certificate |
| 9 | EL-6 imports/operations | ELC-085-100 | Import, audit, notification, and accessibility certificate |
| 10 | EL-7 joined local | Mandatory executable set | Immutable local module certificate |
| 11 | EL-8 staging | Separately approved subset | Staging qualification report |
| 12 | EL-9 release | Evidence reconciliation | Release decision |

## 15. Immediate next action

Perform EL-0 traceability reconciliation, then begin EL-1A. No implementation should proceed for owner-dependent policies until their approvals are recorded. The first engineering focus is directory consistency and atomic employee creation because every later lifecycle phase depends on reliable employee fixtures and identity history.
