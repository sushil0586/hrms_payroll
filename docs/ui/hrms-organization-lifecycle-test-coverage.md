# Organization/Lifecycle — filter and UI/UX coverage audit

Date: 23 October 2026. Status: complete within this supplemental filter and UI/UX audit, on production build `2_ug_WlGuCGPMTYVZJF2_`. The historical closure count is not exhaustive filter coverage.

## What the earlier count means

The [Phase 6 closure](hrms-organization-lifecycle-phase6-closure.md) records 51 unique browser cases run in three engines (153 passes), six report contract tests and six existing backend domain tests. The repository also contains one baseline capture test. Frozen Phase 6 adapters and the copied inline case are reruns, not additional unique coverage. Many cases contain multiple assertions, states and responsive widths, so neither the case count nor screenshot count measures requirements coverage by itself.

The earlier filter interactions were representative: search/committed paging, copied report search/sort/type/date scope, selected return paths and a few direct predicate checks. They did **not** establish every filter control, every option or every combination. This supplement makes the distinction explicit and adds the missing control-level matrix.

## Filter inventory and verification

| Surface | Visible filter dimensions | Supplemental checks |
| --- | --- | --- |
| Nine Organization sections | Section, search, active/inactive/all, page size 10/25/50, page | Independent contrasting active/inactive fixtures in every section; exact counts; case/whitespace search; combined status/search; copied reload; reset retains section; committed paging/back; no matches. |
| Onboarding | Search, status, owner, rows 10/25/50/100, page | Every status; owner classes with matching/nonmatching records; UI row IDs/order match the live API for the committed URL; size, combined query, reload/reset/history and no matches. |
| Probation | Search, decision, owner, rows, page | Every decision and representative owner classes; same navigation/result assertions. |
| Movement | Search, status, movement type, owner, rows, page | Every status and all eight movement types; representative owner classes; same navigation/result assertions. |
| Exit | Search, status, rehire eligibility, rows, page | Every status; both yes/no and all eligibility; same navigation/result assertions. |
| Lifecycle inbox | Search, type, dependent status, employee, owner, inclusive primary date from/to, rows, page | All four types and their status options; representative employee/owner identities; exact-date/open-ended/reversed date ranges; same result/navigation assertions. |
| Queue report | Search, type, status, owner, lifecycle attention, document attention, sort, page, copied as-of date | Every option present in the contrasting live fixture; every offered sort; UI first-page IDs/order and full CSV IDs/order match the filtered complete population; combined filters, copied reload and reset. |
| Aging report | Search, type, status, owner, age bucket, SLA risk, escalation, sort, page, copied as-of date | Every offered bucket/risk/escalation/sort and live type/status/owner option; same UI/full CSV assertions. |

Employee and owner identities are data-dependent, potentially unbounded lists. Browser coverage samples semantic classes (all, populated identifiers, manager alias, no-match identifier and representative employees), rather than claiming every possible identity. Finite enum options are iterated. Combinations are selected intersections and conflicting/no-match cases; this is not the Cartesian product of all filters.

The new independent report contracts cover type/status/owner All/empty/unknown values, intersections, visible-only search/case/whitespace, queue attention/document predicates, all age boundaries (7/8, 14/15, 29/30), High/Medium/Low risk and overdue boundaries, scheduled/missing escalation, state precedence, each offered sort with explicit expected order/stable ties, and UTC/as-of validation. UI/export parity uses the shared selector; the independent contracts test its semantics separately. Queue UI/API parity proves wiring and committed scope, not an independent certification of every backend query predicate. A separate new backend semantic regression covers owner aliases, unmatched owner, unfiltered population and owner/type intersection. It reproduced an unowned Exit leaking into an owner-filtered inbox; the correction excludes Exit items (which expose no record owner) when a recognized owner filter is selected. The failed-before and passed-after evidence is retained separately; this changes neither permissions nor exit-state services.

## UI/UX parity matrix

| Requirement | Evidence and limit |
| --- | --- |
| Common task header and summaries | Existing closure captures/inspected subset; supplement checks exactly one H1 across eight workspaces at 1440/768/320px. Summary population semantics remain domain-specific. |
| Responsive containment and controls | Supplement checks document overflow and nonempty selected option text/usable control width at those sizes; retains screenshots. This does not prove pixel-perfect typography, clipping or contrast. |
| Forms and dialogs | Existing three-engine closure covers create/edit/query dialogs, required/known/unknown outcomes, retained drafts, dirty/busy guards, reachable footer and representative keyboard/focus return. No new business transitions are required for this filter supplement. |
| Empty, missing and unavailable states | Closure covers genuine live empty queues/reports, missing/foreign/off-page edits and required-read failure matrix; supplement adds filter no-match states. |
| Bulk and partial writes | Closure checks confirmed counts, duplicate pending guards, retained selection and confirmed earlier work after later unknown outcomes. |
| Report completeness/export | Closure retains 128-row CSV/manifest hashes and rejects incomplete/overlapping/changing source pages. Supplement checks broader filter/sort CSV parity; the 10,000-row and concurrent-mutation boundaries remain. |
| Domain and permission boundaries | Existing effective-history/exit tests remain applicable. OL-C03 is open; manager API reads and view-only bulk writes are observed existing behavior, not least-privilege acceptance. |

## What “everything” cannot certify

Formal screen-reader use, physical devices/native zoom, every font/locale/long-content permutation, exhaustive field/role/tenant combinations, concurrency/load and business/security policy correctness require separate checks. Browser engines and generated screenshots do not replace inspection. Acceptance must retain a named inspected subset and explicit failures/findings instead of treating the number of passes as a blanket UI/UX guarantee.

Supplemental source, attempts, executed cases, filter-value proofs and teardown: [filter audit evidence](../qa/evidence/organization-lifecycle-filter-audit-2026-10-23/README.md).


## Accepted result and changes

**45 new unique cases** were added: 21 browser cases, 23 report contract cases and one backend semantic regression. The 21 browser cases passed across Chromium/Firefox/WebKit (**63 passes**, zero retries, failures, flaky cases or skips in the accepted main and navigation selections). All **29** report contracts passed (six existing plus 23 new). The new owner semantic test and two existing queue attention/document regressions passed separately. The backend runs each emitted three dependency deprecation warnings.

The finite enum filters and row sizes above are exercised, together with selected intersections/conflicts and representative dynamic identities. The inventory guard checks current control names/types in the defined filter containers, making additions require an explicit coverage update. The reusable [proof audit](../../web/tests/organization-lifecycle/verify-filter-matrix.py) independently checks all recorded finite queue option counts, type/status pair counts and populated owner-class counts against the fixture. Each engine's nine Organization sections produced exact 13/all, seven/active and six/inactive counts. The exact-date inbox fixture matched 14 records; open-ended ranges matched records and the reversed range matched none. Each report filter/sort iteration checked displayed first-page IDs/order and the complete filtered CSV IDs/order. The separate nine-execution navigation selection verifies all nine section dropdown destinations, dependent lifecycle status reset, both reports' copied second page and last-page boundaries, page reset after filtering/clearing, full 40-row filtered manifest from page two, and the print action. The supplemental live population is 76 contrasting records; the earlier retained 128-row browser artifacts and rerun 214-row contract continue to own collection-across-100 verification. This is not a new 10,000-row load test. The live fixture does not populate scheduled escalations or every document-attention state: the browser covers their available controls/no-match branches, while positive escalation and all four document-attention predicates are covered by the independent contracts. This is not visual certification of every report state.

Two defects were corrected:

1. **Owner filtering:** the inbox included unowned Exit items after an owner was selected. The independent backend test failed before the change and passes after the three-line filter correction. Browser owner-filter checks explicitly exclude Exit items as well. Record ownership is separate from clearance-task ownership; no new Exit owner field, role grant or state transition was introduced.
2. **Rows selector visibility:** a 74px inbox select left insufficient room after its existing padding, so the value appeared blank despite a valid selected option. Its scoped width is now 96px. The supplement measures space for the widest offered option and retains cropped controls at 1440/768/320px in all engines; the inspected 320px crops show the value.

The final build/type validation and focused lint passed. All 817 runtime, seven backend-contract and ten test/helper/config hashes match. Compared with accepted Phase 6, runtime changes are limited to that selector width and the backend Exit/owner filter branch. Serializers, Shifts and generated Next/TypeScript files match HEAD. The previous accepted build/evidence is retained; earlier suite counts describe their own build, not a claim that all 153 historical cases were rerun on this supplemental build.

There are **81 accepted captures**, with **seven inspected final samples** (three Rows crops plus representative Organization desktop, inbox mobile, aging mobile and movement tablet renders). The before-fix control crop is a separate inspected diagnostic. Tall full-page renders were viewed at reduced scale. Final source agreement, actual filter-value proofs, capture hashes and explicit limits are in the [evidence record](../qa/evidence/organization-lifecycle-filter-audit-2026-10-23/README.md).

Cleanup verified all 141 checked tenant-related model counts zero and all 22 recorded fixtures/directories absent, including diagnostic attempts. Exact owned backend/Next processes, PostgreSQL container/volume, private export-audit runtime and temporary helpers were removed. Ports 3278/8078/55476 are free. Existing repository audit files and prior accepted builds are preserved. No commit or deployment was performed.


When adding a filter, update this inventory, the contrasting fixture, the browser inventory guard, and independent expected-count checks together. A new passing render or an increased case count alone does not close that filter's acceptance.
