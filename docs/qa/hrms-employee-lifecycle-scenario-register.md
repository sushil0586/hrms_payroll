# HRMS Employee Lifecycle Scenario Register

Date: 2026-11-05
Scope: frozen planning register for the next local development and certification package.
Verdict vocabulary: `Not Run`, `Passed`, `Failed`, `Blocked`, `Not Applicable` (owner-approved only).

Existing historical evidence may satisfy part of a scenario, but no scenario in this register is promoted without reconciliation against the current commit and full evidence contract.

## Evidence required for every executable scenario

Browser action and feedback; authenticated API status/body contract; PostgreSQL before/after state; audit event; tenant/RBAC result; persistence after refresh; accessibility/responsive assertion where applicable; exact-ID cleanup result.

## A. Directory, read, search, and navigation

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-001 | Authorized HR Admin opens employee directory | Scoped totals and first page load without private-data leakage | Passed |
| ELC-002 | Search by name | Matching employees only; Enter and Apply behave consistently | Passed |
| ELC-003 | Search by employee code | Exact/partial behavior follows declared contract | Passed |
| ELC-004 | Filter by department and status | Dropdown-only filters apply correctly | Passed |
| ELC-005 | Manager/readiness advanced filters | Filters remain represented in URL and result context | Passed |
| ELC-006 | Sort every supported column both directions | Stable ordering and page reset | Passed |
| ELC-007 | Pagination, page size, stale page, and empty result | Correct counts; pagination hidden when no data | Passed |
| ELC-008 | Inspect employee and close panel | In-flow detail opens, URL/focus/history remain coherent | Passed |
| ELC-009 | Refresh/back/forward with filters and selection | Committed state restored without stale detail | Passed |
| ELC-010 | Directory API failure and retry | One error state, no false empty result, retry recovers | Passed |
| ELC-011 | ESS reads own approved profile | Own data only; HR-controlled fields read-only | Passed |
| ELC-012 | MSS reads current reportees | Only effective reportees are visible | Passed |
| ELC-013 | Cross-tenant and unauthorized employee reads | 403/404 and no disclosure | Passed |

## B. Employee create and edit

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-014 | Create employee with minimum valid data | Employee, spell, assignment, and audit commit atomically | Passed |
| ELC-015 | Create employee with all supported optional data | Values persist and render correctly after refresh | Passed |
| ELC-016 | Missing required fields across every step | One summary plus field errors; focus first invalid field | Passed |
| ELC-017 | Invalid email, phone, and employee-code formats | Browser/API reject consistently without mutation | Passed |
| ELC-018 | Whitespace-only and length boundaries | Normalization and rejection match contract | Passed |
| ELC-019 | Duplicate employee code | One conflict response and no duplicate row | Passed |
| ELC-020 | Invalid date ordering | Joining, birth, probation, and confirmation dates rejected | Passed |
| ELC-021 | Invalid organization relationships | Foreign/incompatible legal entity, BU, branch, department, grade, and designation rejected | Passed |
| ELC-022 | Invalid or self reporting manager | Rejected without assignment mutation | Passed |
| ELC-023 | Duplicate create click/replay | Exactly one employee, spell, assignment, and success receipt | Passed |
| ELC-024 | Backend field errors | Correct fields and consolidated summary receive API errors | Passed |
| ELC-025 | Network-uncertain create | UI asks user to reconcile; no blind retry or false success | Passed |
| ELC-026 | Cancel/close dirty create | Explicit discard confirmation and no mutation | Passed |
| ELC-027 | Edit permitted identity/contact fields | Changed fields persist and audit before/after state | Passed |
| ELC-028 | Clear optional fields | Null/blank semantics persist correctly | Passed |
| ELC-029 | Stale/concurrent edit | Protected stale write rejected or explicitly reconciled | Passed |
| ELC-030 | Unauthorized and ESS-controlled-field edit | UI/API deny; no mutation or success audit | Passed |
| ELC-031 | Deactivate employee | History retained; current status and access consequences correct | Passed |
| ELC-032 | Attempt employee DELETE | HTTP 405/protection; historical references remain | Passed |

## C. Access and roles

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-033 | Provision approved ESS access | Membership and roles persist; no credential exposure | Passed |
| ELC-034 | Add approved manager role | Fresh session gains only approved MSS scope | Passed |
| ELC-035 | Revoke role/access | Fresh session loses access; audit retained | Passed |
| ELC-036 | Unauthorized access administration | 403/404; no membership mutation | Passed |
| ELC-037 | Privilege-escalation attempt | Actor cannot grant an unadministrable role | Passed |
| ELC-038 | Last-admin safeguard | Removing final authorized administrator is rejected | Passed |
| ELC-039 | Inactive/exited employee login | Access follows approved disable timing and fails closed | Passed |
| ELC-040 | ESS plus manager persona switch | Persona boundaries remain isolated | Passed |

## D. Bank accounts

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-041 | Add valid payout account | Persisted, masked in reads, and audited | Passed |
| ELC-042 | Edit account and change primary | One primary account under approved contract | Passed |
| ELC-043 | Invalid account/IFSC values | Field errors; no mutation | Passed |
| ELC-044 | Duplicate submit or concurrent primary update | Canonical state and consistent audit | Passed |
| ELC-045 | Cross-tenant employee/account reference | Denied without disclosure or mutation | Passed |
| ELC-046 | Unauthorized bank read/write | Masked/denied according to role | Passed |
| ELC-047 | Cancel, failure, and uncertain save | Draft preserved or deliberately discarded; no false receipt | Passed |

## E. Onboarding and probation

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-048 | Create onboarding record | Valid owner/template/date and audit persist | Passed |
| ELC-049 | Progress checklist and owner | Authorized transitions persist after refresh | Passed |
| ELC-050 | Block and resume onboarding | Reason and status history retained | Passed |
| ELC-051 | Complete onboarding | Completion is durable and does not imply access/payroll approval | Passed |
| ELC-052 | Cancel onboarding | Allowed only from valid state; history retained | Passed |
| ELC-053 | Duplicate onboarding for employee | One-to-one conflict reported without duplicate | Passed |
| ELC-054 | Invalid/foreign owner or template | Rejected without mutation | Passed |
| ELC-055 | Probation confirmation | Review and resulting projection/history are audited | Passed |
| ELC-056 | Probation extension | Future extension date required and persisted | Passed |
| ELC-057 | Probation separation | Enters approved exit flow; no direct destructive state change | Passed |
| ELC-058 | Unauthorized onboarding/probation action | Denied with no successful mutation audit | Passed |

## F. Effective-dated movements and manager scope

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-059 | Same-tenant department transfer | Prior assignment closes; one new assignment opens | Passed |
| ELC-060 | Promotion/designation/grade change | Effective history and employee projection reconcile | Passed |
| ELC-061 | Branch/location/business-unit change | Tenant hierarchy rules enforced | Passed |
| ELC-062 | Reporting-manager change | Historical manager retained; current MSS scope changes on effective date | Passed |
| ELC-063 | Employment-type change | Assignment history changes without rewriting spell | Passed |
| ELC-064 | Future-effective movement | Planned state; current projection preserved until effective | Passed |
| ELC-065 | Backdated movement inside allowed window | Approved behavior and downstream resolution verified | Passed |
| ELC-066 | Invalid overlap or same-day collision | Rejected atomically | Passed |
| ELC-067 | Duplicate/replayed movement completion | Exactly one resulting assignment and audit event | Passed |
| ELC-068 | Concurrent movements | At most one conflicting writer succeeds | Passed |
| ELC-069 | Stale movement approval | Rejected against changed current assignment | Passed |
| ELC-070 | Cross-tenant target or manager | 403/validation denial without disclosure | Passed |
| ELC-071 | Former manager checks history after reassignment | Prior decisions visible; current queue access removed | Passed |
| ELC-072 | New manager checks current reportee | Current scope visible; unrelated history restricted | Passed |
| ELC-073 | Cross-legal-entity transfer | Fail closed pending continuity policy | Blocked |
| ELC-074 | Retroactive correction | Remains unavailable until correction authority is approved | Blocked |

## G. Exit, post-exit, and rehire

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-075 | Create draft exit | Dates/reason/owner persist with audit | Passed |
| ELC-076 | Submit and approve exit | Valid transition and approval attribution | Passed |
| ELC-077 | Clearance progression | Checklist/state persists; restricted notes remain private | Passed |
| ELC-078 | Complete exit | Spell/assignment close, status/access update, history preserved atomically | Passed |
| ELC-079 | Cancel exit before protected downstream effects | Approved cancellation path restores coherent state | Passed |
| ELC-080 | Invalid dates/status transition | Rejected without partial mutation | Passed |
| ELC-081 | Exit with open payroll/leave/document dependencies | Approved blockers and owner guidance shown | Not Run |
| ELC-082 | Post-exit ESS/MSS/API access | Access and historical visibility follow approved policy | Passed |
| ELC-083 | Hard-delete exited employee | Rejected; retained records remain linked | Passed |
| ELC-084 | Rehire employee | Blocked pending continuity policy | Blocked |

## H. Imports, audit, notifications, and operational behavior

| ID | Scenario | Expected result | Initial status |
| --- | --- | --- | --- |
| ELC-085 | Download each import template | Correct version and headers | Passed |
| ELC-086 | Preview valid employee import | Resolved rows shown without mutation | Passed |
| ELC-087 | Malformed/missing-header CSV | Clear file/row errors; commit disabled | Passed |
| ELC-088 | Duplicate and ambiguous employee references | Every affected row blocked explicitly | Passed |
| ELC-089 | Partial import failure | Atomicity policy and row outcomes reconcile | Passed |
| ELC-090 | Import commit replay | Durable replay protection prevents duplicates | Passed |
| ELC-091 | Bank import masking and validation | Sensitive values absent from evidence | Passed |
| ELC-092 | Reporting-manager import effective behavior | Approved date/reason semantics persist, not preview-only | Passed |
| ELC-093 | Audit success event | Actor/tenant/resource/effective date/change set correct | Passed |
| ELC-094 | Audit denied event | Outcome/reason/correlation present; no sensitive data | Passed |
| ELC-095 | Audit writer failure | Business mutation rolls back where audit is mandatory | Passed |
| ELC-096 | Lifecycle email/in-app notification | Correct approved recipients; retry/idempotency verified | Passed |
| ELC-097 | Notification disabled or provider failure | Business transaction follows declared policy and failure is observable | Passed |
| ELC-098 | Mobile/tablet/keyboard sweep | All actions, dialogs, tables, errors, and receipts remain usable | Passed |
| ELC-099 | Accessibility scan and focus lifecycle | No critical violations; dialog and feedback focus correct | Passed |
| ELC-100 | Run-owned cleanup | Only exact synthetic IDs removed; audit/retention policy respected | Passed |

## Certification rule

The module is not fully certified until every mandatory applicable scenario passes on the same candidate, every blocked scenario has an explicit owner decision or remains visibly blocked, and no Failed or unexplained Not Run P0 scenario remains. Historical test counts are supporting evidence, not substitutes for this register.
