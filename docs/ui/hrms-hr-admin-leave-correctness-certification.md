# Leave report semantics and import identity remediation

Date: 2026-10-20. **Local tested functionality: PASS. Overall acceptance: CONDITIONAL.** This is the targeted follow-up to [LR-01/02/03](hrms-hr-admin-leave-reaudit.md), not completion of all re-audit items.

## Changes and root causes

- **Report quantities:** the existing balance payload does not identify units. Previous cross-policy/year sums could combine days and hours. The report now shows counts of rows, distinct policies, rows with reservations and rows with negative available quantity. It makes no aggregate quantity/financial-valuation claim. Exact existing row quantities/utilization remain unchanged; adding per-row unit metadata is separate work.
- **Factual states:** a shared presentation helper replaces independent UI/CSV two-unit thresholds and High/Medium/Low ratings with Negative available / Reserved / No reservations. This does not alter leave calculations, entitlement or tenant policy. CSV retains the existing `liability_risk` column as `Not assessed`; `liability_state` holds factual labels. The additive factual-state filter matches UI and CSV. Legacy High/Medium/Low filter URLs fail closed with an explicit UI notice and no matching rows, instead of silently broadening the selection.
- **Import identity:** normalized display names were used as Map keys although the domain only guarantees unique tenant/policy codes. Distinct IDs with the same normalized name now make a lookup ambiguous; no payload is generated for that row. Both imports reuse the same helper. Repeated references to one ID remain valid. Balance import checks the existing full authorized policy-options catalog, including policies absent from the current balance page. Employee lookup remains page-scoped and is accurately disclosed.
- Blocked import previews now use attention/error feedback instead of a misleading completed/success label. Existing ready-row commit endpoints, backend validation and partial-success rules remain authoritative; ambiguous rows cannot be committed.

No new API response fields, dependency, migration, approval/risk policy, ledger write logic, RBAC or authentication change. Existing export column names and types remain; derived label values intentionally change to stop asserting unsupported risk. CSV consumers relying on those old values must adopt the factual state or the explicit Not assessed value.

## Evidence

Evidence root: `docs/qa/evidence/hr-admin-standardization/leave-correctness/`. Original pre-fix executions are retained separately under `baseline/` (2 failures) and `baseline-assignment/` (1 failure). They reproduced mixed totals and both ambiguous imports reaching ready state on archived production build `Bs9r-RCJyTl6hV2whHqQa`. No baseline commit was submitted.

Fresh final production-built verification:

| Selection | Passed | Failed / skipped / flaky / blocked / unexecuted |
| --- | ---: | --- |
| New correctness + helper cases, three engines | 15 | 0 / 0 / 0 / 0 / 0 |
| Year/report regression | 33 | 0 / 0 / 0 / 0 / 0 |
| Existing Balances + Setup workflows | 75 | 0 / 0 / 0 / 0 / 0 |
| **Playwright runner total** | **123** | **0 / 0 / 0 / 0 / 0** |
| Backend/API/PostgreSQL | **72** | **0 / 0 / 0 / 0 / 0** |

The 123 executions comprise **114 UI/browser workflows + 9 runner-side helper/collector cases**, not 123 unique UI workflows. Chromium/Firefox/WebKit each passed 41. Retries are disabled. The 72 backend tests were newly executed in this task. No inherited ESS/full-HR counts are added. [Machine summary](../qa/evidence/hr-admin-standardization/leave-correctness/acceptance-summary.json).

TypeScript, ESLint, Django, migration dry-run, whitespace and the final production build passed. No model changes. Final build ID `IjAUs5JT7c21s_jAzlwe9`; [source/test fingerprints](../qa/evidence/hr-admin-standardization/leave-correctness/source-provenance.json) remained unchanged during final acceptance. The strengthened containment assertion is retained, and every selected suite was rerun on this final application build.

New tests cover mixed day/hour records, near-zero factual states with no low-balance threshold, UI/CSV filter parity, legacy-risk fail-closed behavior, ambiguous policy names including one absent from the current balance page, zero mutation requests for blocked imports, repeated same-ID references, normalization/order independence, responsive containment, named keyboard table scrolling and expanded import axe checks.

Fresh scoped axe: **57 scans, zero reported violations**. Retained screenshots: 18 targeted, 21 Year/report and 54 neighboring captures. The targeted images were visually reviewed through three-engine contact sheets; long import error messages still create tall mobile table rows, retained as a density follow-up rather than claimed visually perfect; neighboring captures are regression evidence, not an assertion that every policy combination was visually accepted. [Screenshot index](../qa/evidence/hr-admin-standardization/leave-correctness/screenshots.md). Headless macOS arm64 Chromium151.0.7922.34 / Firefox153.0 / WebKit26.5; viewport emulation is not native Safari/real-device certification.

The expanded balance-import scan exposed nine heading contrast failures at 3.61:1. Shared table/scroll/status components fix these without changing axe rules. Screenshot review then exposed persistent WebKit metric overflow after resizing: the card stayed 80px tall with content extending 12px below its border. Card-only corrections were insufficient. The final central pattern uses responsive flex wrapping and intrinsically sized flex-column cards; it preserves the four/two-column arrangement and passes the strengthened containment assertions on the compiled build.

[Historical executions](../qa/evidence/hr-admin-standardization/leave-correctness/execution-history.md) preserve the failed and insufficient candidates, interrupted broader runs, superseded passes and all three exploratory diagnostics (2 passed / 1 failed). These are excluded from final selected totals. The diagnostic data and final geometry checks support the scoped layout correction; no general browser-engine root-cause claim is made.

[Cleanup](../qa/evidence/hr-admin-standardization/leave-correctness/cleanup.json) verifies zero synthetic tenants/users before deletion, exact owned PostgreSQL container/volume removal, temporary environment removal and closed local ports. All historical failures and superseded results are retained. Historical executions are not added to final pass totals. The regression copy changes the report filter's expected accessible name from Liability risk to Balance state, preserving the existing filter/sort/history/export assertions. Original certification files/results remain untouched.

## Remaining restrictions

Visual review also records a non-blocking density follow-up: long blocked-import messages can create tall rows on 390px layouts; messages remain in a named keyboard-scrollable table and blocking feedback is visible. No claim of perfect mobile density.

The rest of the re-audit backlog remains open: page-scoped employee resolution, full import/error/partial-success matrices, worker/scheduler operational certification, planned-period activation, exhaustive policy/custom-role/governance permutations, scale/snapshot reporting and production provenance/recovery gates. Historical Chromium hydration stability watch remains separate.

Scoped axe/keyboard/viewport tests do not certify screen readers, native 200%/400% zoom, real devices or formal WCAG; these remain unexecuted unless explicitly evidenced. No live Lightsail/staging changes, customer data or frozen-gate changes. No automatic next module.

## Source and release decision

Changed application files: [report workspace](../../web/src/app/hr-admin/reports/leave-balance/leave-balance-report-workspace.tsx), its [page](../../web/src/app/hr-admin/reports/leave-balance/page.tsx), [CSV route](../../web/src/app/api/hr-admin/reports/%5BreportKey%5D/route.ts), [balance import](../../web/src/app/hr-admin/leave-balances/leave-balance-operations.tsx), [assignment import](../../web/src/app/hr-admin/leave-policy-assignments/leave-policy-assignment-import-workbench.tsx), [shared factual presentation](../../web/src/lib/ui/leave-balance-presentation.ts), [shared ambiguity index](../../web/src/lib/ui/unambiguous-name-index.ts). The existing [central stylesheet](../../web/src/styles/workspace-patterns.css) changes the metric layout to responsive flex wrapping and content-sized card interiors to fix WebKit resize containment. No new stylesheet or component library. Substantial prior dirty-worktree changes are preserved.

**Local selected functionality: PASS. Overall: CONDITIONAL** for the remaining re-audit/accessibility/release restrictions above. **Lightsail staging deployment: NO-GO; real-payroll production: NO-GO.** No deployment, production data, release-gate advancement or next-module implementation performed.

New cases: [browser workflows](../../web/tests/leave-correctness/correctness.spec.ts) (3), [shared presentation/identity regressions](../../web/tests/leave-correctness/presentation.spec.ts) (2), each executed in three projects. [Year/report regression copy](../../web/tests/leave-correctness-regression/final.spec.ts) retains substantive assertions while updating the factual filter name. Owned intermediate builds were removed; the accepted local build and historical evidence are retained.
