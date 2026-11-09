# HRMS Leave LVC-R1 Certification

Date: 2026-11-06
Scope: `LV-E2E-0001`-`LV-E2E-0020`, `LV-E2E-0101`-`LV-E2E-0129`
Verdict: **SUPERSEDED BY LVC-R1B - original result 11 Passed, 20 Partial, 18 Not Run**

Current reconciliation: see `hrms-leave-lvc-r1b-certification.md`. This file preserves the original LVC-R1 evidence and verdict.

## Execution environment

- Isolated PostgreSQL 16 database: `hrms_lvc_r1` on loopback port `55449`.
- Django API: loopback only.
- Production-built Next.js application: loopback only.
- Playwright: one worker, Chromium, Firefox, and WebKit.
- Synthetic tenants and identities only.
- Exact-ID workspace cleanup was exercised by the browser fixtures.
- No shared staging or production mutation occurred.

## Verification results

| Check | Result |
|---|---|
| Leave setup browser campaign | 51/51 Passed across Chromium, Firefox, and WebKit |
| PostgreSQL/Django focused campaign | 74/74 Passed |
| Automatic-approval browser campaign | 9/9 Passed across Chromium, Firefox, and WebKit |
| Django system check | Passed, 0 issues |
| Migration drift | Passed, no changes detected |
| Production build | Passed; existing Autoprefixer warning only |
| Accessibility | AXE assertions passed in the 51-test browser campaign |

Two discarded test attempts selected SQLite before application assertions. Their errors were runner configuration failures caused by missing PostgreSQL settings, not product failures. The successful PostgreSQL runs are the qualifying evidence.

## Exact scenario ledger

`Partial` means meaningful current evidence exists but at least one explicit clause in the frozen acceptance contract remains unproven. `Not Run` means this package did not execute the contract-specific journey.

| ID | Verdict | Evidence and remaining gap |
|---|---|---|
| `LV-E2E-0001` | Partial | Three-engine catalog, filters, loading transitions, empty state, responsive layout, AXE, keyboard, and authorization passed; explicit injected server-error state was not independently reconciled. |
| `LV-E2E-0002` | Partial | Browser create, persistence, refresh, and truthful feedback passed; exact one-event audit attribution was not queried. |
| `LV-E2E-0003` | Not Run | No hour-unit request calculation journey was executed. |
| `LV-E2E-0004` | Partial | Invalid form feedback, focus containment, and no-save behavior passed; the complete required-field matrix was not executed field by field. |
| `LV-E2E-0005` | Passed | Browser and API duplicate rejection produced one truthful error and preserved the existing record. |
| `LV-E2E-0006` | Passed | PostgreSQL-backed same-code creation in a second tenant passed without collision or disclosure. |
| `LV-E2E-0007` | Partial | Invalid color was rejected in the browser; category and unit tampering plus audit non-creation remain unverified. |
| `LV-E2E-0008` | Partial | Browser edit and refresh persistence passed; description and immutable-code branches remain incomplete. |
| `LV-E2E-0009` | Partial | Configuration persistence is covered; a fresh ESS request proving immediate attachment behavior was not executed. |
| `LV-E2E-0010` | Partial | Policy workflow snapshot behavior passed in backend coverage; the leave-type toggle plus new-versus-historical browser journey remains incomplete. |
| `LV-E2E-0011` | Partial | Ledger immutability coverage passed; a browser toggle followed by new-request negative-balance validation was not executed. |
| `LV-E2E-0012` | Partial | Deactivation passed and the type remained persisted; ESS option removal and exact audit proof were not combined in one journey. |
| `LV-E2E-0013` | Passed | Referenced type impact prevented destructive deletion; deactivation preserved linked policy and type history. |
| `LV-E2E-0014` | Partial | Unused permanent deletion and 404 reconciliation passed; exact one-event audit count remains unverified. |
| `LV-E2E-0015` | Passed | Referenced type deletion returned conflict, UI disabled permanent deletion, and linked records remained readable. |
| `LV-E2E-0016` | Not Run | Platform-managed locked-field UI and API rejection were not executed. |
| `LV-E2E-0017` | Partial | Search, dropdown-only filtering, committed URL state, refresh, Back, empty state, and stale-page recovery passed; every sort direction and type paging boundary was not executed. |
| `LV-E2E-0018` | Not Run | Deliberate double-click mutation and exact API/audit count were not executed. |
| `LV-E2E-0019` | Partial | Transport failure, truthful error, disabled destructive action, retry, and recovery passed for policy impact; leave-type create/save uncertainty remains unexecuted. |
| `LV-E2E-0020` | Not Run | Concurrent stale leave-type edit was not executed. |
| `LV-E2E-0101` | Partial | Draft creation and persistence passed; an ESS governance denial tied to that exact draft was not executed. |
| `LV-E2E-0102` | Partial | Active policy persistence and real resolver preview passed; full persisted rule-snapshot comparison remains incomplete. |
| `LV-E2E-0103` | Partial | Invalid effective-date ordering is covered in the connected validation layer; exact browser field feedback was not captured. |
| `LV-E2E-0104` | Not Run | Zero, fractional, and maximum entitlement boundary matrix was not executed. |
| `LV-E2E-0105` | Partial | Balance refresh/idempotency and policy persistence passed; scheduled monthly grant timing was not exercised. |
| `LV-E2E-0106` | Not Run | Quarter-boundary exactly-once accrual was not executed. |
| `LV-E2E-0107` | Partial | No-accrual policy creation and opening balance behavior are covered separately; one connected annual/no-accrual matrix remains missing. |
| `LV-E2E-0108` | Not Run | Join-month proration formula and rounding evidence were not executed. |
| `LV-E2E-0109` | Not Run | Minimum-service denial without reservation was not executed. |
| `LV-E2E-0110` | Not Run | Probation restriction matching and nonmatching journey was not executed. |
| `LV-E2E-0111` | Not Run | Gender restriction matching and safe denial journey was not executed. |
| `LV-E2E-0112` | Not Run | Marital-status restriction and tenant-safe audit journey was not executed. |
| `LV-E2E-0113` | Not Run | Minimum/maximum units boundary matrix was not executed. |
| `LV-E2E-0114` | Not Run | Maximum-consecutive-working-days boundary was not executed. |
| `LV-E2E-0115` | Not Run | Notice-period below/exact boundary was not executed. |
| `LV-E2E-0116` | Not Run | Half-day enabled/disabled browser and API parity was not executed. |
| `LV-E2E-0117` | Not Run | Backdated application enabled/disabled browser and API parity was not executed. |
| `LV-E2E-0118` | Passed | PostgreSQL-backed weekend and holiday include/exclude calculations passed, including custom attendance policy and roster resolution. |
| `LV-E2E-0119` | Passed | PostgreSQL-backed sandwich-rule inclusion and non-inclusion behavior passed. |
| `LV-E2E-0120` | Passed | Carry-forward disabled, limited/capped, and full-history behavior passed against PostgreSQL. |
| `LV-E2E-0121` | Partial | Immutable lot/history behavior is covered; the exact configured expiry-date transition remains outside this package. |
| `LV-E2E-0122` | Passed | Withdrawal and cancellation policy behavior, notifications, reservations, and historical state passed. |
| `LV-E2E-0123` | Passed | Multi-step workflow generation, ownership, intermediate state, and final routing passed. |
| `LV-E2E-0124` | Passed | PostgreSQL tests passed early/disabled/due timing, idempotency, audit, concurrency, rollback, and per-step ownership; three-engine browser qualification is recorded separately below. |
| `LV-E2E-0125` | Passed | Referenced policy permanent deletion was denied; archive succeeded and historical policy/type records remained readable. |
| `LV-E2E-0126` | Not Run | Concurrent stale policy edit was not executed. |
| `LV-E2E-0127` | Partial | Search, status, leave-type, accrual filters, URL state, refresh, Back, responsive and accessible presentation passed; exhaustive sorting/page boundaries remain incomplete. |
| `LV-E2E-0128` | Not Run | Platform-managed policy locked-field mutation was not executed. |
| `LV-E2E-0129` | Partial | Current UI and API expose the approved modes; an explicit tampered daily-mode rejection and rounding matrix were not executed. |

## Totals

| Phase | Total | Passed | Partial | Failed | Blocked | Not Run |
|---|---:|---:|---:|---:|---:|---:|
| Leave type administration | 20 | 4 | 12 | 0 | 0 | 4 |
| Policy definition | 29 | 7 | 8 | 0 | 0 | 14 |
| **LVC-R1** | **49** | **11** | **20** | **0** | **0** | **18** |
| Remaining Leave catalogue | 160 | 0 | 0 | 0 | 0 | 160 |
| **Full Leave catalogue** | **209** | **11** | **20** | **0** | **0** | **178** |

Strict completed confidence is `11 / 209 = 5.3%`. Attempted coverage is `31 / 209 = 14.8%`. Neither figure is release confidence; shared staging remains unqualified for this unified catalogue.

## Next package

Execute `LVC-R1B` for the smallest outstanding set: locked fields, double-submit, stale edits, complete entitlement/restriction boundaries, exhaustive sorting/paging, and daily-mode tamper rejection. Then proceed to `LVC-R2` assignment and balance contracts.
