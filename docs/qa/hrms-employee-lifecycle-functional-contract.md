# HRMS Employee Lifecycle Functional Contract

Date: 2026-11-05
Status: proposed normative contract for development and QA; existing approved policy remains authoritative.

## Purpose and boundaries

This contract defines how Employee Lifecycle should operate from HR administration through employee and manager visibility and back to HR administration. It covers employee master data, access, payout accounts, onboarding, effective-dated movements, reporting relationships, status changes, exit, imports, audit, notifications, and downstream continuity.

It does not approve cross-legal-entity transfer or rehire policy. Those operations remain fail-closed until Product, HR, Payroll, Finance, Statutory, Security, and QA owners approve their continuity rules. Hard deletion of an employee with retained history is not a supported lifecycle operation.

## Personas and authority

| Persona | Supported responsibility | Prohibited behavior |
| --- | --- | --- |
| HR Admin | Create and maintain employees; initiate onboarding, movements, access, bank details, and exits within granted tenant scope | Cross-tenant access, bypassing effective dates, deleting protected history, or granting permissions the actor cannot administer |
| Tenant Admin | Govern tenant membership and approved roles where separately permitted | Treating tenant administration as unrestricted HR or payroll authority |
| Manager/MSS | View current and historical reportee context and perform explicitly assigned workflow decisions | Editing employee master, viewing unrelated employees, or retaining reportee access after an effective manager change |
| Employee/ESS | View own approved profile, assignments, documents, requests, and permitted self-service fields | Viewing another employee or editing HR-controlled employment fields |
| Payroll/Finance | Consume approved identity, assignment, payout, and exit inputs according to separate permissions | Rewriting employee lifecycle history or accessing unrelated private profile data |
| Auditor/Security | Read immutable, redacted lifecycle and access evidence | Mutating employee business state through audit access |

Every API and UI operation must enforce tenant, role, object, and effective-date scope independently. Hiding a button is not authorization.

## Canonical lifecycle

### 1. Employee creation

1. HR Admin opens the employee directory and selects **New employee**.
2. The form collects identity, contact, employment dates, and organization assignment using tenant-scoped options.
3. Required fields, formats, uniqueness, date ordering, and organization relationships are validated in the browser and again by the API.
4. Submission is idempotent while pending; duplicate clicks cannot create duplicate employees.
5. A successful transaction creates one employee, the first employment spell, the first effective assignment, and the required audit evidence atomically.
6. The UI displays one truthful success receipt only after durable persistence, selects the created employee, and remains recoverable after refresh.
7. A rejected or uncertain request shows one consolidated summary plus field-level errors, never a false success.

### 2. Onboarding

1. HR Admin creates an onboarding record for an existing employee and assigns an owner, expected joining date, and approved template/checklist.
2. Status transitions follow `not_started -> in_progress -> completed`, with `blocked` and `cancelled` as explicit outcomes.
3. Actual joining date cannot silently contradict the employee master or employment spell.
4. Checklist completion, owner changes, cancellation, and completion are audited.
5. Employee and manager visibility is limited to approved onboarding information; private HR notes remain restricted.
6. Completion does not implicitly grant application access, payroll approval, or statutory readiness.

### 3. Access provisioning

1. Access is maintained separately from employee creation.
2. HR Admin with `employees.access.manage` can create or update the tenant membership and approved roles.
3. Role changes take effect according to the session policy; fresh-session verification is required for revocation.
4. Inactive or exited employees cannot retain unintended active login access.
5. Last-administrator safeguards and privilege-escalation restrictions remain authoritative.
6. Credentials, tokens, and password material never appear in receipts or audit payloads.

### 4. Payout account maintenance

1. Authorized HR/Finance users can add and edit tenant-owned employee bank accounts.
2. Account numbers are masked in ordinary reads and evidence.
3. At most one account is primary according to the approved data contract.
4. Invalid IFSC/account formats, foreign employees, duplicate submissions, and unauthorized writes are rejected without mutation.
5. Changes are audited and do not claim payroll readiness until the payroll module independently validates them.

### 5. Employee maintenance

1. Editable identity/contact fields preserve optional-field clearing and field-level validation.
2. HR-controlled organization, employment, and reporting fields are not retroactively overwritten when they require an effective-dated movement.
3. Concurrent or stale updates are rejected or reconciled by an explicit contract; silent last-write-wins is not acceptable for protected fields.
4. Cancel, close, browser back, and refresh preserve or deliberately discard dirty state with clear confirmation.
5. Inactivation preserves all historical records and removes inappropriate future access.

### 6. Effective-dated movement

1. HR Admin selects the employee, movement type, effective date, reason, and tenant-scoped target values.
2. The API snapshots the current assignment and validates date, overlap, tenant, hierarchy, manager, and legal-entity rules.
3. Approval/completion closes the prior assignment on the preceding date and creates exactly one resulting assignment.
4. Future movements remain planned until effective; current projections remain unchanged until the effective date.
5. Same-tenant promotion, department, branch, location, designation, grade, employment-type, and reporting changes use this history-preserving path.
6. Same-day collisions, stale state, replay, invalid overlaps, and foreign references are rejected without partial mutation.
7. Cross-legal-entity transfer remains blocked pending approved continuity policy.

### 7. Manager scope

1. MSS current scope resolves from the assignment effective on the business date.
2. Historical decisions retain the manager identity that made them.
3. A reporting-manager reassignment removes future current-scope access from the former manager without rewriting historical evidence.
4. The new manager sees only effective reportees and permitted history.
5. An employee who also has manager authority may switch personas without leaking manager data into ESS.

### 8. Probation and confirmation

1. Review date, probation end date, decision, extension date, reviewer, and remarks follow explicit validation.
2. Confirm, extend, separate, and pending decisions are distinct and audited.
3. Extension requires a valid future end date; separation must enter the approved exit flow.
4. Confirmation updates the approved projection without deleting probation history.

### 9. Exit and offboarding

1. HR Admin creates a draft exit with dates, reason, owner, and workflow reference.
2. Status follows `draft -> pending_approval -> approved -> clearance_in_progress -> completed`, or an authorized cancellation path.
3. Completion closes the active employment spell and assignment, updates the employee projection, disables inappropriate access, and preserves payroll/statutory/document history atomically.
4. Final settlement, leave treatment, asset clearance, document retention, and communication are separate governed dependencies.
5. Exit cannot erase employee identity or protected records.
6. Cancellation after downstream effects is rejected unless a separately approved correction workflow exists.

### 10. Rehire

Rehire must reuse or link the stable employee identity, create a new spell, and preserve prior history. It remains blocked until continuity rules for tenure, leave, payroll, statutory registrations, documents, prior access, and exit reversal are approved.

### 11. Imports

1. Employee, bank-account, and reporting-manager imports use template, upload, preview, validation, and guarded commit stages.
2. Preview performs tenant-scoped reference resolution and reports every row outcome.
3. Commit processes only eligible rows under the documented atomicity policy and has durable replay protection.
4. Partial failures, ambiguous references, malformed CSV, duplicate identifiers, and retry behavior are reconciled explicitly.
5. Import evidence excludes raw bank numbers and unnecessary personal data.

## Shared UI and feedback contract

- One page heading, clear scope/counts, consistent filters, sorting, loading, empty, error, and pagination states.
- Tables use named keyboard-scroll regions and responsive containment; actions remain reachable at 320px and short heights.
- Inspect opens the established in-flow detail panel for this family. Create/edit/access/bank forms use the established dialog or dedicated-page lifecycle consistently.
- Every close, cancel, save, edit, inspect, retry, filter, sort, pagination, import, and destructive-looking action has an executable outcome.
- Pending actions disable duplicate submission and show a loader without shifting layout.
- Disabled controls use correct semantics and a not-allowed cursor where pointer feedback applies.
- Errors use one summary plus linked field errors; the same error is not repeated in multiple summaries.
- Success feedback appears only after persistence, remains visible for five seconds as a toast where used, and may also persist as a page receipt after navigation.
- Focus moves to the first invalid field or feedback summary, returns meaningfully after close, and status changes use an accessible live region.

## Integrity and audit contract

Each successful or denied protected operation records the event category, timestamp, outcome, reason category, actor, tenant, employee/resource reference, effective date when applicable, changed fields or redacted before/after state, correlation/idempotency reference, and environment identity.

Audit evidence must exclude credentials, sessions, raw tokens, full bank numbers, and unnecessary personal data. Rejected operations must not emit a successful mutation audit. Historical employee, assignment, payroll, leave, attendance, statutory, and document references must remain consistent.

## Configurable policy

The following must be tenant configuration or approved policy, not arbitrary free text in workflows:

- employee-code format and uniqueness scope;
- mandatory/optional profile fields;
- probation duration and confirmation authority;
- onboarding templates, checklist items, owners, and SLAs;
- permitted roles and access-provisioning authority;
- movement approval levels, backdating window, and future-dating window;
- organization relationship rules and allowed movement types;
- manager effective-date and delegation policy;
- exit reasons, notice rules, approval levels, clearance checklist, and access-disable timing;
- payout-account validation and verification requirements;
- import atomicity, row limits, replay window, and approval threshold;
- retention and masking policy;
- notification events, templates, recipients, retries, and escalation;
- cross-entity transfer and rehire continuity rules, once formally approved.

Configuration changes require audit history, effective dates where relevant, tenant isolation, and safe defaults. A missing high-risk policy must fail closed.
