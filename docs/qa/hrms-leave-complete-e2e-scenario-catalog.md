# HRMS Leave Complete End-to-End Scenario Catalogue

Status: frozen planning baseline

Scope: HR Admin configuration and operations -> ESS application and lifecycle -> MSS approval and history -> HR Admin reconciliation, reporting, audit, year close, and payroll boundary.

This catalogue supplements the separate 136-workflow register. A scenario is Passed only after its browser, API, PostgreSQL, audit, authorization, notification, accessibility, and cleanup evidence is complete. Existing local evidence may be linked, but it is not automatically copied into a new staging result.

## Personas and fixtures

- HR Admin maker and a distinct HR Admin checker.
- ESS employee with an active employment assignment, reporting manager, holiday calendar, shift/roster, and leave policy assignment.
- Manager 1, Manager 2, delegated manager, and HR final approver.
- Finance/payroll reviewer for downstream reconciliation only.
- Disabled employee, employee without a manager, employee on probation, and employee in a second tenant.
- Two legal entities, branches, departments, grades, and employment types.
- Day-unit and hour-unit leave types; paid, unpaid, sick, compensatory, maternity/paternity, and special categories.
- Open, closed, and locked leave periods; current and next leave years.
- Synthetic clean, invalid, oversized, and signature-positive attachment files.

## Evidence contract

Every attempted ID must record:

1. Browser route, persona, action, viewport, feedback text, loading state, and final UI state.
2. Authenticated API method, endpoint, request correlation/idempotency key, response status, and redacted response contract.
3. PostgreSQL before/after state for request, workflow steps, balance, immutable transactions, entitlement lots, allocations, notifications, and audit rows.
4. Tenant, employee, manager/reportee, permission, effective-date, and policy ownership checks.
5. Exact success, warning, field-error, toast, and fixed-header message; no duplicate or false-success feedback.
6. Keyboard focus, live-region announcement, mobile/tablet containment, and disabled-control behavior where applicable.
7. Notification event and delivery state without sending to an unapproved recipient.
8. Exact-ID ownership manifest and governed cleanup result.

## Configurable policy matrix

The test fixture must vary these tenant-managed values rather than hard-code one universal rule:

- Leave type: category, unit, active state, approval required, attachment required, negative balance, color, and platform delegation/locked fields.
- Policy: entitlement, accrual frequency, proration, effective dates, carry-forward cap and expiry, min/max request, notice period, half day, backdating, weekend/holiday overlap, sandwich rule, probation, service, gender, and marital restrictions.
- Approval: manager-only, manager then manager, manager then HR, HR-only, automatic approval wait, fallback approver, cancellation reapproval, and delegation.
- Lifecycle: withdrawal/cancellation windows, reasons, evidence requirement, approved-request cancellation, and post-expiry treatment.
- Assignment: employee or organization scope, priority, active state, effective dates, and overlap resolution.
- Balance governance: allowed actions, maker-checker threshold, reviewer, encashment cap, negative balance, and reason requirement.
- Calendar: leave-year start, holidays, weekly offs, roster working days, period close/reopen/lock, carry-forward, expiry, and rounding.
- Notifications: in-app/email channel enablement, approved recipients, template, retry policy, and event suppression.

Policy-dependent scenarios remain Blocked until Product and QA owners approve the applicable rule. The application must fail closed meanwhile.

## Phase 0 - HR Admin master configuration

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0001 | Open Leave Types workspace | Header, summary, filters, sorting, paging, loading, empty/error states, and permissions render consistently. |
| LV-E2E-0002 | Create valid day-unit leave type | One record persists; success toast/header appear once; audit attributes actor and tenant. |
| LV-E2E-0003 | Create valid hour-unit leave type | Unit persists and later request calculations use hours. |
| LV-E2E-0004 | Required leave-type fields omitted | Inline errors appear once, focus moves to first error, and no row is created. |
| LV-E2E-0005 | Duplicate code in same tenant | API rejects; UI shows one truthful error; existing record is unchanged. |
| LV-E2E-0006 | Same code in second tenant | Creation succeeds without cross-tenant collision or disclosure. |
| LV-E2E-0007 | Invalid color/category/unit payload | Browser and API reject; no mutation or success audit occurs. |
| LV-E2E-0008 | Edit leave-type name and description | Refresh shows saved values; immutable identity/code behavior follows contract. |
| LV-E2E-0009 | Toggle attachment requirement | ESS immediately reflects the active policy requirement without stale cache. |
| LV-E2E-0010 | Toggle approval requirement | New requests follow the new route; historical requests keep their snapshot. |
| LV-E2E-0011 | Toggle negative balance | Validation changes only for new requests; prior ledger rows remain unchanged. |
| LV-E2E-0012 | Deactivate unused leave type | ESS no longer offers it; audit and success feedback are recorded. |
| LV-E2E-0013 | Deactivate referenced leave type | Impact is shown and governed behavior prevents destructive history loss. |
| LV-E2E-0014 | Delete unused leave type | Deletion succeeds only where supported and produces one audit event. |
| LV-E2E-0015 | Delete referenced leave type | Operation is denied or redirected to deactivate/detach with no data loss. |
| LV-E2E-0016 | Platform-managed locked field edit | Locked field is disabled in UI and rejected by API. |
| LV-E2E-0017 | Leave-type search, dropdown-only filter, sorting, paging | Committed filters survive paging/navigation; stale page numbers recover safely. |
| LV-E2E-0018 | Double-click create/save | One API mutation, one record, one audit event, and one message result. |
| LV-E2E-0019 | Create/save transport uncertainty | Draft remains; no false success; list reconciliation prevents duplicate retry. |
| LV-E2E-0020 | Concurrent stale edit | One write wins; stale write is rejected and current data remains visible. |

## Phase 1 - HR Admin policy definition

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0101 | Create draft policy | Draft persists but cannot govern ESS until active. |
| LV-E2E-0102 | Activate valid effective-dated policy | Preview and persisted rule snapshot match. |
| LV-E2E-0103 | End date before start date | Field error, no save, no false toast. |
| LV-E2E-0104 | Zero, fractional, and maximum entitlement boundaries | Approved decimal/rounding contract is enforced. |
| LV-E2E-0105 | Monthly accrual | Scheduled accrual and available balance reconcile. |
| LV-E2E-0106 | Quarterly accrual | Quarter boundary grants exactly once. |
| LV-E2E-0107 | Annual/no accrual | Opening entitlement follows configured mode. |
| LV-E2E-0108 | Join-month proration | Entitlement evidence records formula and rounded result. |
| LV-E2E-0109 | Minimum service restriction | Ineligible employee is denied without reservation. |
| LV-E2E-0110 | Probation restriction | Employee on probation is denied; eligible policy permits request. |
| LV-E2E-0111 | Gender restriction | Matching employee allowed; nonmatching employee receives safe policy denial. |
| LV-E2E-0112 | Marital-status restriction | Matching/nonmatching outcomes are tenant-safe and audited. |
| LV-E2E-0113 | Minimum and maximum units per request | Exact boundaries pass; values outside fail. |
| LV-E2E-0114 | Maximum consecutive days | Working-day calculation, not calendar count alone, controls validation. |
| LV-E2E-0115 | Notice period | Too-short notice fails; exact threshold passes. |
| LV-E2E-0116 | Half-day disabled/enabled | Portion controls and backend enforcement agree. |
| LV-E2E-0117 | Backdated application disabled/enabled | UI and API enforce the configured rule. |
| LV-E2E-0118 | Weekend/holiday overlap | Requested units follow configured include/exclude behavior. |
| LV-E2E-0119 | Sandwich rule | Bridged nonworking days are included only when enabled. |
| LV-E2E-0120 | Carry-forward none/limited/full | Preview and year-close outcomes reconcile. |
| LV-E2E-0121 | Carry-forward expiry | Lots expire on the configured date without rewriting history. |
| LV-E2E-0122 | Cancellation/withdrawal policy | Runtime actions and evidence requirements match configuration. |
| LV-E2E-0123 | Approval route variants | Generated workflow steps and owners match the selected route. |
| LV-E2E-0124 | Automatic approval timer | Due request advances once; early or disabled timer does nothing. |
| LV-E2E-0125 | Archive referenced policy | New assignment/request use is blocked while historical snapshots remain readable. |
| LV-E2E-0126 | Concurrent policy edit | Stale update rejected; active policy remains internally consistent. |
| LV-E2E-0127 | Policy search/filter/sort/page | Query state is committed, accessible, and refresh-stable. |
| LV-E2E-0128 | Managed policy locked fields | Tenant cannot override platform-locked rules. |
| LV-E2E-0129 | Exit/anniversary proration and rounding matrix | Unsupported daily modes remain unavailable; only `none` and `by_join_month` may be configured. |

## Phase 2 - HR Admin assignment and opening balance

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0201 | Assign policy to all employees | Eligible employees resolve the policy and balances. |
| LV-E2E-0202 | Scope by legal entity | Only matching employees resolve it. |
| LV-E2E-0203 | Scope by branch/department/grade/employment type | Each filter and combined scope resolve correctly. |
| LV-E2E-0204 | Employee-specific override | Higher-specificity assignment wins deterministically. |
| LV-E2E-0205 | Priority conflict | Preview explains winner and persistence matches it. |
| LV-E2E-0206 | Equal-priority ambiguity | Save is blocked or explicit resolution is required. |
| LV-E2E-0207 | Foreign-tenant scope reference | API returns safe denial and creates nothing. |
| LV-E2E-0208 | Stale/inactive reference | Clear error, no assignment, no success audit. |
| LV-E2E-0209 | Future-effective assignment | Current resolution unchanged; future date resolves new policy. |
| LV-E2E-0210 | Expired assignment | It no longer governs new requests; history remains. |
| LV-E2E-0211 | Update assignment scope | Conflict preview and affected-employee count are truthful. |
| LV-E2E-0212 | Deactivate assignment | New requests stop resolving it without deleting balances/history. |
| LV-E2E-0213 | Duplicate/concurrent assignment | One canonical assignment survives; retry is idempotent. |
| LV-E2E-0214 | Assignment CSV valid import | Exact rows persist with source identity and audit reconciliation. |
| LV-E2E-0215 | Malformed/ambiguous/foreign CSV | Row failures are explicit; no unsafe partial mutation occurs. |
| LV-E2E-0216 | Import replay/crash recovery | Same source identity does not duplicate assignments. |
| LV-E2E-0217 | Opening balance credit | Immutable transaction, lot, period, checksum, and projection reconcile. |
| LV-E2E-0218 | Invalid debit/negative opening balance | Governed validation blocks the mutation. |
| LV-E2E-0219 | Maker-checker threshold | Maker cannot review own pending balance action. |
| LV-E2E-0220 | Checker approve/reject | Approval applies once; rejection requires reason and applies nothing. |

## Phase 3 - ESS request creation

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0301 | Load ESS leave workspace | Entitlements, request history, filters, actions, and policy guidance load. |
| LV-E2E-0302 | Submit valid full-day request | Pending request, reservation, workflow, notification, and receipt persist. |
| LV-E2E-0303 | Submit first-half request | Exactly 0.5 day is reserved where enabled. |
| LV-E2E-0304 | Submit second-half request | Exactly 0.5 day is reserved where enabled. |
| LV-E2E-0305 | Multi-day request with weekend/holiday | Unit breakdown matches calendar/roster/policy. |
| LV-E2E-0306 | Hour-unit request | Valid hour amount reserves correctly. |
| LV-E2E-0307 | Missing required fields | All applicable field errors appear once and are announced. |
| LV-E2E-0308 | End before start | Date error, no API write. |
| LV-E2E-0309 | Invalid day-portion combination | UI/API reject impossible portions. |
| LV-E2E-0310 | Inactive leave type | Not selectable; forged API reference denied. |
| LV-E2E-0311 | No active assigned policy | Clear denial without reservation or workflow. |
| LV-E2E-0312 | Before/after policy effective dates | Request rejected with exact boundary feedback. |
| LV-E2E-0313 | Insufficient balance | No request, reservation, workflow, or success event. |
| LV-E2E-0314 | Negative balance enabled | Request proceeds and projection follows configured lower bound. |
| LV-E2E-0315 | Overlapping pending/approved request | Second request denied without ledger mutation. |
| LV-E2E-0316 | Existing attendance/regularization collision | Warning/block behavior matches policy and snapshot is retained. |
| LV-E2E-0317 | Closed/locked leave period | Mutation is denied and historical period remains unchanged. |
| LV-E2E-0318 | Attachment optional | Request succeeds with or without evidence. |
| LV-E2E-0319 | Attachment required but absent | Submit blocked with one clear error. |
| LV-E2E-0320 | Valid attachment | Private artifact persists and authorized parties can download. |
| LV-E2E-0321 | Invalid type/oversized/malicious attachment | Rejected or quarantined; request cannot bypass required evidence. |
| LV-E2E-0322 | Cross-employee/cross-tenant attachment access | 403/404 and no disclosure. |
| LV-E2E-0323 | Double-click submit | One request, reservation, workflow, and notification. |
| LV-E2E-0324 | Same idempotency-key replay | Original result returned without duplicate effects. |
| LV-E2E-0325 | Concurrent same-period requests | At most one succeeds; balance never over-reserves. |
| LV-E2E-0326 | API timeout after durable save | UI reports uncertain outcome and reconciles before retry. |
| LV-E2E-0327 | Automatic approval not required | Request reaches approved state and consumes once where configured. |
| LV-E2E-0328 | Employee without manager | Approved fallback route is used or request fails closed. |
| LV-E2E-0329 | Disabled employee or membership | Access and submission denied. |
| LV-E2E-0330 | Search/filter/Enter/apply/paging | Results, URL state, loading, empty state, and refresh are correct. |
| LV-E2E-0331 | Mobile/tablet request dialog | Fields, evidence, errors, submit, cancel, and focus remain reachable. |
| LV-E2E-0332 | Browser back/forward/refresh | Committed filters persist; unsaved draft protection is truthful. |
| LV-E2E-0333 | Leave-evidence retention and removal | Evidence remains private and governed; employee destructive deletion is denied. |

## Phase 4 - MSS approval and delegation

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0401 | Manager sees direct-report pending request | Correct employee, policy, dates, balance, attachment, and collision context. |
| LV-E2E-0402 | Non-reportee request | Hidden from list and denied by direct URL/API. |
| LV-E2E-0403 | Cross-tenant request ID | 404/403 with no metadata disclosure. |
| LV-E2E-0404 | Approve valid request | Workflow advances/finishes, reservation consumes once, ESS/HR update. |
| LV-E2E-0405 | Reject with reason | Reservation releases, reason persists, ESS/HR update. |
| LV-E2E-0406 | Reject without required reason | Inline error; request remains pending. |
| LV-E2E-0407 | Partial approval supported | Partial-unit action is unavailable; full approval/rejection and multi-level intermediate state remain consistent. |
| LV-E2E-0408 | Double-click decision | One terminal decision, one ledger effect, one audit event. |
| LV-E2E-0409 | Concurrent managers decide | One wins; stale decision is rejected. |
| LV-E2E-0410 | Manager approves own ESS request | Denied unless an explicitly approved route permits another approver. |
| LV-E2E-0411 | Manager 1 approve, Manager 2 approve | Multi-level workflow advances in order and consumes only at final approval. |
| LV-E2E-0412 | Manager 1 approve, Manager 2 reject | Final rejection releases reservation and preserves both step decisions. |
| LV-E2E-0413 | Out-of-order Manager 2 action | Denied before prior step completes. |
| LV-E2E-0414 | Manager then HR route | MSS advances; HR final decision controls terminal state. |
| LV-E2E-0415 | Delegated manager within window/scope | Delegated request visible and actionable with attribution. |
| LV-E2E-0416 | Expired/revoked/out-of-scope delegation | Request hidden and mutation denied. |
| LV-E2E-0417 | Reporting-manager reassignment while pending | Original workflow owner remains authoritative; reassigned manager is denied without governed transfer. |
| LV-E2E-0418 | Reporting-manager reassignment after decision | Historical decision remains visible to authorized audit scope. |
| LV-E2E-0419 | Attachment preview/download | Only authorized manager accesses clean private evidence. |
| LV-E2E-0420 | Pending action transport failure | No false success; retry reconciles terminal state. |
| LV-E2E-0421 | More than 25 decisions | Pagination/load-more has no duplicates or missing rows. |
| LV-E2E-0422 | History filters | Employee, date, decision, and current status combine correctly. |
| LV-E2E-0423 | Approved request later cancelled | History shows manager decision plus current cancelled state. |
| LV-E2E-0424 | ESS+MSS dual identity | Workspace switching keeps permissions and request ownership separate. |
| LV-E2E-0425 | Leave-only/attendance-only manager permission | Each queue and history surface is independently restricted. |
| LV-E2E-0426 | Empty/API failure/loading states | Accessible, truthful states with safe retry and no stale action. |
| LV-E2E-0427 | Mobile/tablet/keyboard table behavior | Filters/actions reachable; table scroll and focus are contained. |

## Phase 5 - ESS withdrawal and cancellation

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0501 | Withdraw pending request in window | Status withdrawn; reservation released; manager notified. |
| LV-E2E-0502 | Withdraw after window | Action disabled and forged API request denied. |
| LV-E2E-0503 | Withdrawal reason required | Missing reason blocked; supplied reason retained. |
| LV-E2E-0504 | Withdrawal evidence required | Missing evidence blocked; valid private evidence retained. |
| LV-E2E-0505 | Withdraw another employee request | Denied with no mutation. |
| LV-E2E-0506 | Duplicate/concurrent withdrawal | One transition and one release only. |
| LV-E2E-0507 | Cancel approved future leave directly | Consumed allocation reverses once; balance restores. |
| LV-E2E-0508 | Cancel approved leave requiring reapproval | Request returns pending with cancellation workflow; no early reversal. |
| LV-E2E-0509 | Cancellation approved by route | Status cancelled and reversal occurs exactly once. |
| LV-E2E-0510 | Cancellation rejected | Original approved state and consumption remain authoritative. |
| LV-E2E-0511 | Cancel started/past leave | Denied unless an explicit tenant lifecycle rule enables cancellation and its cutoff is satisfied. |
| LV-E2E-0512 | Cancel after entitlement lot expiry | Fail closed without automatic entitlement recreation; governed correction is required. |
| LV-E2E-0513 | Cancel with required reason/evidence | Validation and private attachment handling are enforced. |
| LV-E2E-0514 | Cancel rejected/withdrawn/cancelled request | Terminal invalid transition denied. |
| LV-E2E-0515 | Cancel after payroll input lock | Protected payroll/attendance history cannot be rewritten. |
| LV-E2E-0516 | Action loader, close, toast, header receipt | One five-second toast plus durable header result; no duplicate feedback. |
| LV-E2E-0517 | Action unavailable | Disabled cursor/tooltip explains why; closing dialog does not claim success. |

## Phase 6 - HR Admin request operations and reconciliation

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0601 | HR queue lists pending/terminal requests | Filters, sorting, paging, loading, counts, and detail panel reconcile. |
| LV-E2E-0602 | HR authorized override create | Request, policy snapshot, ledger, workflow/audit follow override contract. |
| LV-E2E-0603 | Override invalid/foreign employee/type | Safe rejection without mutation. |
| LV-E2E-0604 | HR approve as configured final approver | Maker/approver attribution and terminal effects are correct. |
| LV-E2E-0605 | HR reject with reason | Reservation releases and employee/manager are notified. |
| LV-E2E-0606 | HR unauthorized direct decision | Denied; no success audit or ledger effect. |
| LV-E2E-0607 | HR inspect attachment | Private clean evidence accessible; quarantine/cross-tenant access denied. |
| LV-E2E-0608 | HR request CSV valid import | Source identity, row outcomes, requests, and audit reconcile. |
| LV-E2E-0609 | Import malformed/duplicate/ambiguous rows | Explicit row errors and atomic full-batch rollback. |
| LV-E2E-0610 | Import crash/replay | Restart does not duplicate requests, reservations, or notifications. |
| LV-E2E-0611 | Balance credit/debit/encashment request | Preview and transaction reflect policy and maker-checker rules. |
| LV-E2E-0612 | Balance checker approve | Projection, checksum, lot, source link, and audit advance once. |
| LV-E2E-0613 | Balance checker reject | Reason required; balance unchanged. |
| LV-E2E-0614 | Maker reviews own transaction | Denied. |
| LV-E2E-0615 | Debit/encashment exceeds availability/cap | Denied without pending or applied mutation. |
| LV-E2E-0616 | Historical correction | Compensating transaction preserves source history. |
| LV-E2E-0617 | Stale/concurrent balance review | One terminal decision and one projection change. |
| LV-E2E-0618 | HR search/filter/export | UI, API, CSV totals, sort, and tenant scope match. |
| LV-E2E-0619 | Request and balance audit trail | Actor, tenant, resource, before/after, correlation, and timestamps are complete. |
| LV-E2E-0620 | Notification reconciliation | Each lifecycle event has expected recipients, template, delivery state, and no duplicates. |

## Phase 7 - Leave year, ledger, reports, and payroll boundary

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0701 | Open/close/reopen/lock policy period | Allowed transitions persist with immutable status events. |
| LV-E2E-0702 | Invalid period transition | Denied without changing period/checksum. |
| LV-E2E-0703 | Duplicate/concurrent close command | One close run and deterministic result. |
| LV-E2E-0704 | Carry-forward under cap | Target lot equals unused units. |
| LV-E2E-0705 | Carry-forward over cap | Cap carries; remainder forfeits with evidence. |
| LV-E2E-0706 | No carry-forward | Unused entitlement forfeits exactly once. |
| LV-E2E-0707 | Expiry | Expired lots become unavailable without deleting source transactions. |
| LV-E2E-0708 | Earliest-expiry consumption | Allocation consumes eligible lots in deterministic order. |
| LV-E2E-0709 | Cross-year request | Units allocate to correct periods without rewriting closed history. |
| LV-E2E-0710 | Pending request during year close | Approved policy determines reserve/carry treatment and prevents double allocation. |
| LV-E2E-0711 | Failed employee close item and retry | Other items follow approved atomicity; retry is idempotent. |
| LV-E2E-0712 | Leave balance report | UI/API/export totals reconcile to immutable ledger. |
| LV-E2E-0713 | Leave-attendance collision report | Exact request/attendance references and filters reconcile. |
| LV-E2E-0714 | Approved leave to attendance derivation | Approved/cancelled changes produce correct attendance effect exactly once. |
| LV-E2E-0715 | Payroll input snapshot | Paid/unpaid leave values match locked leave and attendance state. |
| LV-E2E-0716 | Mutation after payroll lock | Leave action cannot silently rewrite locked payroll input. |
| LV-E2E-0717 | Encashment to FnF/payroll | No automatic posting; leave encashment and payroll settlement remain independent. |
| LV-E2E-0718 | Restore/replay reconciliation | Restored ledger, lots, allocations, checksums, and reports remain consistent. |

## Phase 8 - Security, accessibility, resilience, and UX

| ID | Scenario | Required outcome |
|---|---|---|
| LV-E2E-0801 | Anonymous access to all leave routes/APIs | Redirect/401 without data disclosure. |
| LV-E2E-0802 | ESS attempts HR/MSS mutation | 403/404 and no audit claiming success. |
| LV-E2E-0803 | Manager attempts HR configuration | Denied. |
| LV-E2E-0804 | HR without required permission | Menu/action hidden and API denied. |
| LV-E2E-0805 | Foreign-tenant identifiers in every mutation | Safe denial and zero cross-tenant joins. |
| LV-E2E-0806 | Disabled/revoked session | Immediate denial without stale client authorization. |
| LV-E2E-0807 | CSRF, method, malformed JSON, oversized payload | 403/405/400/413 behavior is safe and consistent. |
| LV-E2E-0808 | Sensitive evidence/log redaction | No attachment content, token, cookie, or private reason leaks into logs. |
| LV-E2E-0809 | Audit append-only and restricted writer | Business actors cannot alter/delete audit evidence. |
| LV-E2E-0810 | Notification recipient isolation | Only intended employee/approver/HR recipients are addressed. |
| LV-E2E-0811 | Notification retry and provider failure | Bounded retry, no duplicate business mutation, visible delivery state. |
| LV-E2E-0812 | Database deadlock/transient failure | Transaction rolls back or retries safely; no partial ledger/workflow state. |
| LV-E2E-0813 | Worker interruption during auto approval/notification/import | Durable recovery and exactly-once business effects. |
| LV-E2E-0814 | API failure and retry UI | Error, focus, retry, and retained draft are truthful. |
| LV-E2E-0815 | Empty and large datasets | Empty states and multi-page results are correct and performant. |
| LV-E2E-0816 | Keyboard-only complete workflow | Setup, apply, approve, inspect, filter, cancel, and close are operable. |
| LV-E2E-0817 | Screen-reader semantics | Labels, descriptions, errors, status, dialogs, tables, and focus return pass. |
| LV-E2E-0818 | Contrast and status colors | Meaning is not color-only; warning/error/success tokens meet contract. |
| LV-E2E-0819 | 320px/mobile, tablet, laptop layouts | No clipped controls, blocked overlays, or incoherent horizontal overflow. |
| LV-E2E-0820 | Tenant-aware date/time formatting | Server/client output matches; no hydration warning or timezone drift. |
| LV-E2E-0821 | Browser back/forward/deep link | Selection, filters, panels, and dialogs restore without duplicate fetch/mutation. |
| LV-E2E-0822 | Sorting all declared columns/directions | Stable deterministic order with paging and null values. |
| LV-E2E-0823 | Pagination boundaries | First/last, page size, empty result, deletion, and stale page recover correctly. |
| LV-E2E-0824 | Success/error message lifecycle | One five-second toast plus durable receipt where required; no duplicate errors. |
| LV-E2E-0825 | Loading and disabled actions | Busy state prevents duplicate commands and uses not-allowed semantics correctly. |

## Golden end-to-end journeys

These connected journeys certify the complete handoff rather than isolated screens:

1. **Standard approval:** HR creates type/policy/assignment/balance -> ESS applies with evidence -> Manager approves -> ESS sees approval -> HR reconciles request, ledger, audit, notification, report, attendance, and payroll input.
2. **Rejection:** ESS applies -> Manager rejects with reason -> reservation releases -> ESS and HR see the same terminal state.
3. **Multi-level mixed decision:** ESS applies -> Manager 1 approves -> Manager 2 rejects -> history retains both decisions and no consumption occurs.
4. **Approved cancellation:** ESS applies -> final approval consumes -> ESS requests/carries out cancellation according to policy -> reversal restores exactly once -> MSS history and HR ledger reconcile.
5. **Withdrawal:** ESS applies -> pending reservation -> ESS withdraws with configured reason/evidence -> reservation releases -> MSS queue and HR history update.
6. **Automatic approval:** HR configures timer -> ESS applies -> worker advances once -> all projections and notifications reconcile after interruption/retry.
7. **Delegation and reassignment:** request moves through approved delegated/reassigned ownership while historical attribution remains immutable.
8. **Year boundary:** approved and pending requests, carry-forward, forfeiture, expiry, report, attendance, and payroll snapshots reconcile across close.
9. **Security denial:** foreign tenant, non-reportee manager, revoked role, and direct attachment access all fail without side effects or disclosure.
10. **Failure recovery:** transport uncertainty, database rollback, worker interruption, duplicate command, and import replay each preserve exactly-once state.

## Certification phases

| Phase | Scope | Exit gate |
|---|---|---|
| LVC-0 | Contract freeze and policy decisions | Every scenario classified executable, policy-dependent, or not applicable with owner. |
| LVC-1 | HR configuration and assignments | Phases 0-2 pass on PostgreSQL with browser evidence. |
| LVC-2 | ESS request and attachment lifecycle | Phase 3 passes across three browser engines. |
| LVC-3 | MSS decisions, delegation, and history | Phase 4 passes, including concurrent and multi-level decisions. |
| LVC-4 | Withdrawal, cancellation, and HR operations | Phases 5-6 pass with immutable ledger reconciliation. |
| LVC-5 | Year close and downstream boundaries | Phase 7 passes or named policy blockers remain explicit. |
| LVC-6 | Security, accessibility, resilience, and UX | Phase 8 passes across desktop/mobile and three engines. |
| LVC-7 | Connected golden journeys | All ten journeys pass in one fresh isolated campaign. |
| LVC-8 | Staging qualification | Exact deployed SHA/digests, approved identities/recipients, recovery, audit, and cleanup gates pass. |

## Approved conservative policy boundaries

- Do not restore or recreate expired entitlement automatically.
- Do not expose daily exit/anniversary proration.
- Do not post leave encashment automatically into FnF/payroll.
- Do not transfer pending approval ownership on manager reassignment.
- Do not expose partial-unit approval.
- Deny started/past cancellation unless explicitly enabled by tenant policy.
- Retain private evidence and deny employee destructive deletion.
- Reject and roll back mixed-validity leave-request imports atomically.

These boundaries were approved on 2026-11-04 and are testable acceptance criteria. They may change only through governed Product/Policy/QA change control.
