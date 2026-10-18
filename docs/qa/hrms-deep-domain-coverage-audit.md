# HRMS/Payroll Deep Domain Coverage Audit

Date: 2026-10-17  
Phase: DD-0, read-only assessment  
Decision: **CONDITIONAL - deep certification work remains**

## Scope And Method

This audit reconciles the frozen 963-case Playwright baseline, the 92-scenario DB-6 register, DB-1 through DB-5 PostgreSQL controls, performance/reliability evidence, source routes, APIs, models, services, Celery tasks, and current test declarations. Route or test-file presence was not treated as proof. A scenario is `Verified` only when existing evidence proves its material business assertion and downstream state; `Partial` means important assertions were proven separately but not as one deep scenario; `Missing` means no adequate executed evidence was found; `Blocked` means an approved business policy is required.

Source inventory reviewed:

- 187 routed pages: HR Admin 146, ESS 7, MSS 3, Tenant Admin 12, Platform Admin 10, plus shared/auth/support routes.
- 265 Next.js API proxy routes.
- 311 model/enum class declarations across the audited model modules, including 111 core models from the architecture audit.
- 290 Playwright spec files and 854 static `test()` declarations; parameterized generation accounts for the larger frozen 963-case manifest.
- Celery tasks for leave-year close, payroll jobs, notifications, and data governance.
- Frozen DB-6 outcome: 87 passed, 5 blocked, 0 failed/not run.

No application code, test code, fixture data, staging, production, Northstar, or customer data was modified.

## Exact Scenario Result

The DD-0 matrix contains **81 unique scenarios**:

| Status | Count | Meaning |
| --- | ---: | --- |
| Verified | 33 | Existing executed evidence directly proves the material scenario |
| Partial | 25 | Coverage exists but a boundary, connected downstream effect, or recovery assertion remains |
| Missing | 16 | Focused certification evidence is absent |
| Blocked | 7 | Approved business policy is required before behavior can be certified |
| Not applicable | 0 | No scenario was dismissed as non-applicable without proof |

Priority inventory: **45 P0, 35 P1, 1 P2**. Open/partial/blocked exposure is **17 P0, 30 P1, and 1 P2**.

## Domain Assessment

| Domain | Total | Verified | Partial | Missing | Blocked | Principal remaining depth |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Employee lifecycle | 8 | 3 | 2 | 1 | 2 | connected exit/FnF, probation decisions, transfer and rehire policy |
| Documents | 8 | 3 | 3 | 2 | 0 | expiry boundary, storage failure, hold-to-document enforcement, reminder idempotency |
| Leave | 8 | 4 | 2 | 1 | 1 | proration/rounding, reviewed corrections, encashment/FnF, post-expiry cancellation |
| Attendance | 8 | 3 | 3 | 2 | 0 | retroactive roster effects, overtime governance, import replay safety |
| Payroll | 8 | 4 | 3 | 1 | 0 | independent statutory oracle, arrears/reversal chain, partial payment rejection, FnF |
| ESS and MSS | 8 | 4 | 2 | 2 | session/offline recovery, legitimate multi-assignment context |
| Approvals and delegation | 8 | 2 | 2 | 3 | 1 | multi-level modes, delegation, escalation, revoked-role queue access, reassignment policy |
| Organization/history | 8 | 3 | 3 | 1 | 1 | versioned restructure, as-of reporting, concurrent archive, transactional import |
| Notifications/imports/exports | 8 | 3 | 3 | 2 | 0 | import checkpoint recovery, broad volume exports, post-grant download revocation |
| Subscription/governance | 9 | 4 | 2 | 1 | 2 | downgrade lifecycle, support revocation race, erasure and legacy classification policy |

## Root-Cause Patterns

1. **Connected lifecycle gaps.** Individual APIs and pages often pass, while the same-record chain into payroll, finance, access, audit, or retention is not always proven. Exit-to-FnF and leave-encashment-to-payroll are the clearest examples.
2. **Effective-date depth.** Employment, salary, leave, attendance, and payroll have strong database guards, but organization-master versioning, historical reporting, and retroactive roster behavior need deeper browser/API/PostgreSQL correlation.
3. **Failure semantics.** Payroll durable jobs are well covered. Ordinary imports, document storage, notification expiry reminders, and ESS/MSS offline mutation recovery have thinner idempotency and partial-failure evidence.
4. **Approval topology.** Single manager decisions and races are verified. Multi-level sequential/parallel routing, delegation, escalation, and pending-work reassignment remain incomplete or policy-dependent.
5. **Independent calculation oracles.** Payroll lifecycle integrity is strong, but statutory thresholds, ceilings, exemptions, rounding, arrears, reversals, and partial bank rejection need independent expected-value matrices.
6. **Governance boundaries.** Retention, holds, preview, and maker/checker controls exist. Irreversible erasure, protected export packaging, backup disposition, and ambiguous historical classification correctly remain blocked.

## Highest-Priority Gaps

The P0 gap set is the release-significant subset. It includes connected FnF, cross-entity transfer, rehire, leave encashment/expiry policy, overtime-to-payroll rules, statutory calculation oracle coverage, arrears and payment rejection, pending approval reassignment, revoked-role decision denial, cross-entity restructure, irreversible erasure, and legacy classification. Exact ownership, evidence, and recommended suites are in `hrms-deep-domain-gap-register.csv`.

These are not all confirmed application defects. DD-0 found three classes: absent certification evidence, partially connected evidence, and approved-policy blockers. No behavioral change should be made until DD execution reproduces a genuine defect.

## Existing Evidence Reused

- Frozen Phase 3 Playwright registers: 963 unique, 957 passed, 6 justified skips.
- DB-6 register and reports: 92 unique, 87 passed, 5 blocked.
- DB-1 workflow/financial concurrency and immutability.
- DB-2 fiscal and accounting-period integrity.
- DB-3/3A immutable leave ledger and year close.
- DB-4/4B tenant references, retention, legal hold, and governance.
- DB-5 effective-dated employment history.
- Docker payroll jobs, attendance derivation, volume, export, and controlled concurrency evidence.
- Loading-state certification for pending, retry, cancellation, stale-response, and durable-job feedback.

## DD-0 Decision

DD-0 is **PASS as a coverage assessment**. The application is not deeply certified for all identified scenarios: 48 scenarios remain partial, missing, or policy-blocked. Production readiness is not claimed.
