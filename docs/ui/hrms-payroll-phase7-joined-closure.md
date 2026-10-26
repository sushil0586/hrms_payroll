# Payroll Phase 7 — joined closure

Prepared: 24 October 2026. Status: complete within the declared closure boundary.

## Objective

Certify the completed Payroll makeover as one bounded journey on one source-matched production build. Phase 7 joins the 35 owned routes with the ESS, Finance Manager, Tenant Admin, Attendance, Leave, Employee and Organization consumers affected by payroll state. It does not reopen payroll formulas, statutory policy or provider production connectivity.

## Closure rules

- Use one immutable source revision and one production Next.js build for accepted browser evidence.
- Provision only owned synthetic tenants in an isolated PostgreSQL database.
- Keep browser retries disabled and distinguish diagnostic runs from accepted clean runs.
- Exercise real persisted transitions only where the fixture owns every affected record.
- Reuse earlier phase evidence as coverage input, but count only fresh Phase 7 executions in the joined result.
- Record every finding as resolved, accepted within a stated boundary, or open with an owner.
- Verify zero owned tenants, users, payroll records, artifacts, media, processes, containers and volumes after execution.

## Owned route ledger

| ID | Route | Joined responsibility | Phase 7 evidence |
| --- | --- | --- | --- |
| PAY-C01 | `/hr-admin/payroll-setup` | Calendar and period effectivity reaches readiness and run creation | responsive, keyboard, persisted configuration read |
| PAY-C02 | `/hr-admin/salary-setup` | Component, structure, version and assignment reach payroll inputs | responsive, form feedback, source linkage |
| PAY-C03 | `/hr-admin/payroll-statutory` | Pack, component, slab, registration and filing calendar reach statutory reports | responsive, source linkage, masked identifiers |
| PAY-C04 | `/hr-admin/payroll-rules` | Active rule version and evaluation evidence reach calculation | responsive, version/evaluation linkage |
| PAY-C05 | `/hr-admin/time-to-payroll` | Journey status links to the authoritative next task | responsive, link and wording review |
| PAY-C06 | `/hr-admin/payroll-readiness` | Blockers reflect configuration, employee, attendance and leave sources | populated/no-match/unavailable and drilldown |
| PAY-C07 | `/hr-admin/payroll-inputs` | Snapshot, reconciliation and lock state feed calculation once | lock persistence, duplicate guard, recovery |
| PAY-C08 | `/hr-admin/payroll-calculations` | Locked input identity produces an authoritative calculation job | queued/success/failure/reload and no duplicate start |
| PAY-C09 | `/hr-admin/payroll-review` | Exceptions, decisions, approval and final lock preserve order | maker-checker, blocker, reload and denial |
| PAY-C10 | `/hr-admin/payroll-adjustments` | Adjustment lifecycle affects only the owned payroll run | submit/approve/reject/apply and recovery |
| PAY-C11 | `/hr-admin/payroll-settlements` | Settlement lifecycle retains lines, totals and exit linkage | submit/approve/reject/apply and recovery |
| PAY-C12 | `/hr-admin/payroll-outputs` | Reconciled output publishes once and protects artifact access | publish, signed access, revoke and audit |
| PAY-C13 | `/hr-admin/payroll-handoff` | Published output reaches transmission and acknowledgement evidence | transmit, callback, retry and audit pack |
| PAY-C14 | `/hr-admin/payroll-providers` | Certified provider and active mapping gate delivery | certification, simulation, activation and recovery |
| PAY-R01 | `/hr-admin/reports/payroll` | Report family navigation retains group/search/readiness scope | three-engine responsive and URL restoration |
| PAY-R02 | `/hr-admin/reports/payroll-register` | Register totals and artifacts match committed report scope | Apply/Enter/Clear/history and export parity |
| PAY-R03 | `/hr-admin/reports/payroll-adjustments` | Adjustment population and approval evidence match operations | filters, stable page and drilldown return |
| PAY-R04 | `/hr-admin/reports/payroll-close-readiness` | Close predicate matches current blockers and outputs | filters, wording and source parity |
| PAY-R05 | `/hr-admin/reports/payroll-input-exceptions` | Input issues match locked snapshot evidence | filters, no-match and source parity |
| PAY-R06 | `/hr-admin/reports/payroll-review-exceptions` | Review exceptions match decisions and severity | filters, no-match and source parity |
| PAY-R07 | `/hr-admin/reports/payroll-settlements` | Settlement headers, lines and approvals remain complete | filters, stable page and drilldown return |
| PAY-R08 | `/hr-admin/reports/salary-variance` | Variance wording and values retain their declared baseline | filters, ties and calculation drilldown |
| PAY-R09 | `/hr-admin/reports/bank-advice` | Advice reflects published payout artifacts and delivery state | filters, protected export and wording |
| PAY-R10 | `/hr-admin/reports/payslip-publication` | Publication and acknowledgement remain separate states | filters, ESS linkage and protected access |
| PAY-R11 | `/hr-admin/reports/finance-handoff-exceptions` | Failed/queued/retried/acknowledged evidence remains distinct | filters, retry evidence and return scope |
| PAY-R12 | `/hr-admin/reports/provider-filing-receipts` | Submission, callback, receipt and retry evidence remain distinct | filters, provider identity and audit |
| PAY-R13 | `/hr-admin/reports/compliance-summary` | Summary predicates match statutory sources | filters, wording and bounded totals |
| PAY-R14 | `/hr-admin/reports/challan-reconciliation` | Generated evidence never implies payment or reconciliation | filters, wording and artifact linkage |
| PAY-R15 | `/hr-admin/reports/pf-ecr-readiness` | PF/ECR readiness retains registration, UAN and filing gates | filters, wording and provider gate |
| PAY-R16 | `/hr-admin/reports/esic-contribution-readiness` | ESIC readiness retains registration and coverage gates | filters, wording and provider gate |
| PAY-R17 | `/hr-admin/reports/professional-tax-readiness` | PT readiness retains state registration and calendar scope | filters, wording and provider gate |
| PAY-R18 | `/hr-admin/reports/lwf-readiness` | LWF readiness retains state and filing-calendar scope | filters, wording and provider gate |
| PAY-R19 | `/hr-admin/reports/tds-efile-readiness` | TDS readiness retains TAN, PAN, declaration and challan gates | filters, wording and provider gate |
| PAY-R20 | `/hr-admin/reports/statutory-deductions` | Deduction totals retain component and artifact sources | filters, totals and export parity |
| PAY-R21 | `/hr-admin/reports/statutory-filing-status` | Due, generated, submitted, acknowledged and filed stay distinct | filters, wording and export parity |

## Joined workflow matrix

| Journey | Start → finish | Required negative and recovery evidence |
| --- | --- | --- |
| Configuration to input lock | payroll/salary/statutory/rules → readiness → inputs → lock | overlap validation, missing source, duplicate lock, permission denial |
| Lock to final review | inputs → calculation → review → decision → final lock | abort, 5xx, malformed success, blocker, repeated request, wrong actor |
| Adjustment and settlement | create → submit → checker approve/reject → apply | maker approval denial, invalid order, rejection rationale, uncertain outcome |
| Output publication and ESS | final lock → generate → reconcile → publish → ESS list/download | unpublished access, revoked/expired grant, foreign artifact, duplicate publish |
| Finance and provider | publish → handoff → transmit → callback/retry → acknowledge | uncertified provider, inactive mapping, duplicate callback, dead letter, unknown outcome |
| Statutory evidence | setup/deductions → readiness → artifact → provider receipt/status | missing registration, no artifact, provider failure, readiness-versus-filed wording |
| Report round trip | committed report scope → drilldown → action/detail → return | unsafe return target, stale/off-page identity, denied export, no-match restoration |

## Shared-consumer checks

- ESS payslips: only published artifacts appear; download, read and revoked/expired access retain authorization.
- Finance Manager: existing handoff and acknowledgement scope reflects authoritative delivery state.
- Tenant Admin: financial calendar and period locks continue to gate payroll dates.
- Attendance and Leave: closed attendance and approved leave inputs appear in readiness without inventing repair actions.
- Employee, Organization and Salary: employee assignment, legal entity, pay group and salary source identifiers remain intact.
- Export audit: successful authorized exports create the expected evidence; denied or incomplete assembly does not.

## Accessibility and visual sample

Run the full 35-route three-engine narrow-screen matrix. Inspect representative populated, empty, filtered-no-match, denied, unavailable, pending and error states at 1440, 1024, 768, 390 and 320 pixels. Add 320 × 568 cases for long forms, lifecycle actions, provider mapping and report tables. Keyboard checks cover task navigation, filters, pagination, row actions, dialogs, first-error focus, dirty close and focus return. Run selected axe checks on one representative screen per phase plus ESS payslips.

## Execution order

1. Freeze source, record revision and create the production build.
2. Run static, Django, migration and focused backend integrity gates.
3. Run read-only 35-route responsive, keyboard and selected axe checks.
4. Run owned joined workflows in dependency order.
5. Run shared-consumer, authorization, foreign-tenant and export-audit checks.
6. Capture and inspect the declared visual sample.
7. Resolve or disposition findings, rerun affected clean gates and publish exact counts.
8. Tear down all owned data and infrastructure and record zero-residue proof.

## Read-only joined baseline — 24 October 2026

The first Phase 7 execution certifies the route inventory and shared presentation contract on one production build:

- 35 unique owned routes matched the route inventory: 14 operational routes and 21 report routes.
- Chromium, Firefox and WebKit each passed 37 of 37 checks with retries disabled: one inventory guard, 35 route checks and one ESS payslip affected-consumer check. Accepted total: 111 of 111.
- Every owned route returned HTTP 200, exposed one visible page heading and avoided document-level horizontal overflow at 1440 × 900, 390 × 844 and 320 × 568.
- Every visible table region remained keyboard focusable and named; focus entry and forward movement passed in all three engines.
- Selected WCAG 2 A/AA and WCAG 2.1 AA axe scans passed with zero violations on seven representative payroll routes and ESS payslips.
- The run found and fixed shared contrast defects in compact header pills, payroll section helpers, cycle helper text and provider/readiness badges. The unchanged final accessibility gate passed after those fixes.
- The isolated PostgreSQL fixture cleanup reported `verified_absent: true`; the final tenant count was `0`.

Accepted logs and machine-readable accessibility output are in [`docs/qa/evidence/payroll-makeover-phase7-2026-10-24`](../qa/evidence/payroll-makeover-phase7-2026-10-24/). Diagnostic and interrupted logs remain evidence of discovery and are not included in the 111 accepted checks.

## Persisted configuration-to-ESS journey — 24 October 2026

The accepted Chromium journey ran with retries disabled against isolated PostgreSQL, Redis, Celery worker and Celery Beat services. It passed as one continuous owned-data workflow and verified:

- statutory pack, statutory component, employer registration and filing calendar creation;
- payroll rule definitions and active rule versions, including statutory source references;
- isolated calendar, period and pay-group creation without colliding with the seeded active run;
- payroll run and employee input-snapshot creation, persisted snapshot editing and input locking;
- asynchronous calculation dispatch, worker completion, durable status polling and action restoration after reload;
- review creation, HR administrator submission, separate checker approval and final lock;
- rejection of review reopening and run editing after final lock;
- asynchronous output generation and publication with persisted output-batch identity;
- asynchronous finance-handoff generation, available transmission/acknowledgement/audit actions and statutory-report evidence;
- authorized statutory artifact download with checksum evidence;
- publication visibility in the employee's named payslip table and protected payslip-detail download.

The run corrected stale certification assumptions without relaxing product gates: it provisions its own pay group, follows asynchronous jobs through their status API, reloads server-rendered controls after durable state changes, switches actors for maker-checker approval and uses the current action-tab and ESS table semantics. Accepted evidence is `persisted-browser-final.txt` and `persisted-results.json` in the Phase 7 evidence directory.

## Workflow, isolation and provider closure — 24 October 2026

The final joined gate added 17 accepted checks with retries disabled where applicable:

- 8 Chromium persisted-workflow checks passed for adjustment apply, exit-linked settlement apply, adjustment and settlement rejection, operator-input recovery after abort/5xx/malformed responses, blocker preservation, durable asynchronous calculation, employee authorization denial and foreign-tenant object isolation.
- 1 Chromium provider UI recovery check passed for abort, service-failure and malformed-success handling without false completion.
- 8 focused PostgreSQL backend checks passed for callback idempotency, strict callback security, configured HMAC/runtime-secret/RSA adapters, retry/dead-letter behavior, due-event worker execution and worker heartbeat/stale recovery.
- Every browser workspace used an owned synthetic tenant and cleanup completed after the test. The final tenant count was `0`.

Together with the 111 read-only browser checks and the continuous persisted journey, Phase 7 accepted **129 of 129 checks**. The initial workflow and backend invocations that selected stale SQLite settings are diagnostic infrastructure runs and are excluded from this total. Accepted logs are `workflows-final.txt`, `workflow-results.json`, `provider-ui-recovery.txt`, `provider-backend-final.txt`, `persisted-browser-final.txt` and `persisted-results.json` in the Phase 7 evidence directory.

## Completion boundary

Phase 7 closes the bounded payroll UI, workflow and affected-consumer makeover for the recorded source/build. It does not certify every payroll formula, jurisdiction, bank or provider production connection, production secret/storage configuration, payroll-scale load, physical device, native zoom, screen reader, formal WCAG conformance, staging deployment or production release.
