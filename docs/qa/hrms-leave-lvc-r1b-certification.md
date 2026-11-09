# HRMS Leave LVC-R1B Certification

Date: 2026-11-06
Scope: incomplete Leave Type and Leave Policy contracts from LVC-R1
Verdict: **CONDITIONAL - 2 newly Passed; 36 contracts remain incomplete**

## Repairs

- Added `updated_at` version tokens to Leave Type and Leave Policy read contracts.
- Added `expected_updated_at` to edit contracts and both production forms.
- Rejected stale updates with HTTP 409 while holding the existing PostgreSQL row lock.
- Preserved the newer database value and emitted no false update audit for a rejected stale write.
- Added deterministic policy validation for reversed effective dates, negative entitlement/carry-forward/notice/service values, and invalid minimum/maximum request ranges.
- Fixed a confirmed Firefox test race by waiting for first-page navigation and the local table transition to finish before selecting Inspect.
- Corrected the local production-server test configuration with `HRMS_COOKIE_SECURE=false` for HTTP WebKit qualification. No production cookie default was changed.

## Verification

| Check | Result |
|---|---|
| Pre-change focused PostgreSQL regression | 26 Passed |
| New endpoint regression plus neighboring audit cases | 3 Passed |
| Post-change focused PostgreSQL campaign | 27 Passed, 420 deselected |
| Stale-edit browser proof | 3 Passed: Chromium, Firefox, WebKit |
| Existing Chromium package | 17 Passed |
| Existing Firefox package | 16 Passed, 1 initial failure; failed case passed after confirmed synchronization repair |
| Existing WebKit package | 17 Passed after local secure-cookie configuration correction |
| TypeScript | Passed |
| Targeted ESLint | Passed |
| Django system check | Passed, 0 issues |
| Migration drift | Passed, no changes detected |
| Production build | Passed; existing Autoprefixer `end` compatibility warning only |
| Cleanup | Passed; zero task-owned `pw-qa-*` tenants remain |

The first WebKit attempt was stopped after five systemic redirects to Sign in. Traces showed that the production server's secure-cookie default was being used over local HTTP. WebKit discarded that cookie as expected. The corrected local run passed 17/17. This was a harness configuration issue, not a product authorization bypass or Leave UI defect.

The original Firefox failure was reproducible. Its trace showed Inspect being clicked on the old page-2 row while the `First` navigation was still `aria-busy`; completion of that navigation discarded the click. The test now waits for the URL and local transition before asserting the same detail behavior. The bounded rerun passed.

## Frozen ID Reconciliation

| ID | Previous | Current | Evidence |
|---|---|---|---|
| `LV-E2E-0020` | Not Run | Passed | A newer Leave Type update wins; the stale browser form receives HTTP 409 feedback on all three engines, the modal remains truthful, the current value remains persisted, and no rejected-update audit is created. |
| `LV-E2E-0126` | Not Run | Passed | A newer Leave Policy update wins; the stale browser form receives HTTP 409 feedback on all three engines, the policy remains internally consistent, and no rejected-update audit is created. |
| `LV-E2E-0103` | Partial | Partial | API and PostgreSQL now reject reversed dates without mutation; exact browser field-level feedback remains to be captured. |
| `LV-E2E-0104` | Not Run | Not Run | Negative inputs are now rejected, but the frozen zero/fractional/maximum rounding matrix was not fully executed. |
| `LV-E2E-0111` | Not Run | Not Run | Product-model blocker: Employee has no governed gender attribute against which policy eligibility can be evaluated. |
| `LV-E2E-0112` | Not Run | Not Run | Product-model blocker: Employee has no governed marital-status attribute against which policy eligibility can be evaluated. |

No other LVC-R1 verdict was promoted. Passing broad setup regressions do not satisfy missing per-ID audit, browser, notification, boundary, sorting, paging, or policy-decision evidence.

## Totals

| Scope | Total | Passed | Partial | Failed | Blocked | Not Run |
|---|---:|---:|---:|---:|---:|---:|
| Leave type administration | 20 | 5 | 12 | 0 | 0 | 3 |
| Policy definition | 29 | 8 | 8 | 0 | 0 | 13 |
| **LVC-R1/R1B** | **49** | **13** | **20** | **0** | **0** | **16** |
| Remaining Leave catalogue | 160 | 0 | 0 | 0 | 0 | 160 |
| **Full Leave catalogue** | **209** | **13** | **20** | **0** | **0** | **176** |

Strict completed confidence is `13 / 209 = 6.2%`. Attempted coverage is `33 / 209 = 15.8%`. This remains local evidence only and is not staging or release certification.

## Remaining R1B Work

- Locked platform fields: `LV-E2E-0016`, `LV-E2E-0128`.
- Deliberate duplicate submission and uncertainty recovery: `LV-E2E-0018`, residual `LV-E2E-0019` branch.
- Full required-field, category/unit tamper, audit-count, ESS propagation, sorting, and paging clauses in the Partial contracts.
- Entitlement, service, probation, request-unit, notice, half-day, backdate, expiry, and proration boundary contracts.
- Product/QA decisions and employee model support for gender and marital-status restrictions.

## Next Action

Execute the remaining contract-valid R1B boundary and locked-field cases, while routing `LV-E2E-0111` and `LV-E2E-0112` to Product/Data Governance for an explicit employee-attribute and privacy contract. Then begin LVC-R2 assignment and opening-balance reconciliation.
