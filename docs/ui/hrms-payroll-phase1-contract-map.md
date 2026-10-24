# Payroll Phase 1 — action, filter and authorization map

Prepared: 24 October 2026. This map is a source-derived implementation contract for the [35-route inventory](hrms-payroll-route-inventory.json). It is not evidence that every option or mutation has already been executed.

## Operational actions

| Slice | Reads and selection | Mutations and transitions | Primary permissions to verify |
| --- | --- | --- | --- |
| Payroll setup | Calendars, periods, pay groups and assignments; active/effective selection | Create/update calendars and periods, maintain groups/assignments | `payroll.setup.view`, `payroll.setup.manage`; financial-period dependencies |
| Salary setup | Components, structures, versions, structure components and employee assignments | Create/update/version and assign effective salary structures | `payroll.setup.view`, `payroll.setup.manage`; salary-data minimization |
| Statutory setup | Packs, components, slabs, employer registrations and filing calendars | Create/update effective statutory configuration | `statutory.setup.view`, `statutory.setup.manage` |
| Rules | Definitions, versions and evaluation inputs/results | Create/update definitions/versions and evaluate | `payroll.setup.view`, `payroll.setup.manage`; evaluation is not calculation |
| Readiness | Search/page employee readiness and current period/configuration | Navigation to owning remediation only | `payroll.inputs.view`, `payroll.review`, `payroll.outputs.view` |
| Inputs | Runs, paged snapshots, independent snapshot detail and reconciliation | Create/update snapshots, bulk import and lock inputs | `payroll.inputs.view`, `payroll.inputs.manage`, `payroll.lock` |
| Calculation | Run/calculation lines, validation issues and background jobs | Calculate draft and retry eligible jobs | `payroll.calculate`; locked-input and idempotency guards |
| Review | Review, calculation lines, exceptions, approvals and close jobs | Create/decide exception, submit, approve, lock, generate outputs and retry close jobs | `payroll.review`, `payroll.approve`, `payroll.lock`, `payroll.publish` |
| Adjustments | Adjustment setup, record/detail and post-lock impact | Create, submit, approve/reject and apply | `payroll.review`, maker-checker separation |
| Settlements | Settlement setup, header/detail and lines | Create header/lines, submit, approve/reject and apply | `payroll.review`, maker-checker separation |
| Outputs | Batches, artifacts, reconciliation, grants and access events | Generate, publish, download, grant/revoke signed access and audit export | `payroll.outputs.view`, `payroll.outputs.download`, `payroll.publish` |
| Finance handoff | Handoffs, provider deliveries/callbacks/retries/jobs | Generate handoff, transmit, acknowledge, retry/requeue and audit pack | `finance.handoff.view/create/transmit/acknowledge` |
| Providers | Connections, certifications, schema packs/simulations and registries | Configure, certify, clone/simulate/activate/archive/export mapping, retry delivery and rehearse launch | `payroll.setup.view`, `payroll.setup.manage`; secrets remain masked |

## Filter and URL families

| Family | Controls requiring exhaustive inventory and tests | Navigation/export contract |
| --- | --- | --- |
| Readiness and inputs | Search, run, employee/snapshot selection, status, reconciliation/lock state, page and page size | Draft inputs are separate from committed URL scope; off-page details use an authorized read; lock/import preserves safe return context |
| Calculation/review | Run/review selection, calculation/exception status, severity/category/source, page and line selection | Poll/reload does not repeat a mutation; selection and committed scope survive supported handoffs |
| Adjustments/settlements | Run, employee, type/status, creator/approver and selected record | Transition eligibility comes from persisted state and permission, not a page-local assumption |
| Outputs/handoff/providers | Run/batch/artifact, publication, delivery/provider/callback/retry/certification/mapping status | Secure downloads and exports retain authorization; return targets stay local; unknown transport status remains unconfirmed |
| Core payroll reports | Search, run/period, employee, batch/artifact, status, exception/risk, sort, page and page size | Screen, CSV, manifest and print use the same committed selector and complete bounded source |
| Finance/provider reports | Search, provider, handoff/delivery/filing/publication status, blocker/risk category and sort | Delivery state and acknowledgement remain separate; exported scope matches the visible committed filters |
| Statutory reports | Search, readiness/due/payment/filing status, gate/area/type/jurisdiction/provider, date/as-of and sort | Readiness is distinct from filing/payment; package and manifest access require their own permission |

## Report-by-report minimum matrix

- Payroll register: run/file/profile/hash search, batch status, artifact status and stable publication sort.
- Adjustments and settlements: employee/run/type/status/creator or approver, impact and stable amount/date sorting.
- Close readiness: run/period/stage/blocker or risk, warning/blocked/ready states and exact close evidence.
- Input and review exceptions: employee/run/category/severity/status/source/decision and selected-record return scope.
- Salary variance: period/run/employee/variance direction or threshold and stable amount ordering.
- Bank advice and payslip publication: batch/run/status/artifact, authorized download/publication evidence and exact totals.
- Finance handoff exceptions: handoff status, delivery status, provider, risk, blocker category and all five declared sort modes.
- Provider filing receipts: provider/filing/status/evidence and receipt identity.
- Compliance summary and the five readiness-package reports: search, Ready/Warning/Blocked and gate area; package/manifest evidence.
- Challan reconciliation: search, payment status, provider and due-date/amount/provider/status sorts.
- Statutory deductions: search, statutory type, provider and amount/component/employee/provider sorts.
- Statutory filing status: search, due status, provider and due-status/filing/provider/artifact sorts.

## Negative and integrity cases

Every mutation-owning slice must cover field and summary validation, retained values, first-error focus, dirty cancel, one pending submission, repeated request, abort, timeout, 5xx, malformed response, stale identity, foreign tenant and insufficient permission. Calculation, lock, apply, publish, transmit, acknowledge, provider activation and package generation also require persisted-state and audit/history assertions.

Every report must distinguish a genuine empty source, filtered no match, unavailable or changing source, permission denial and successful empty export. Collection tests must exceed one backend page and reject missing, duplicate, overlapping and count-changing pages.
