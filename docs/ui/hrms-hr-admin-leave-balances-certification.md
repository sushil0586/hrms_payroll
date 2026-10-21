# HR Admin Leave Balances and Ledger standardization

Date: 2026-10-20. Scope: `/hr-admin/leave-balances`, its balance/transaction details, existing adjustment form and configured transaction-review workflow. Local tested functionality **PASS**; overall scoped certification **CONDITIONAL**. This is a local synthetic-only assessment, not staging deployment or certification of all Leave Management pages.

## Current-state findings and changes

| Finding | Implementation |
|---|---|
| Large operations/utility sections preceded the working ledgers | Same compact Accerio header as Leave Applications, one contextual return action, collapsible module navigation, filters and ledgers first, action/import disclosures afterward. |
| Page-local encashment, adjustment and pending-review totals appeared global | Use server-derived matching balance/transaction counts and explicitly page-scoped pending reviews. Remove cross-policy unit sums: the backend supports both day and hour units, without a common aggregate projection. Amounts remain available per employee-policy balance/detail. |
| Filters were button-driven drafts without a native Enter form; size changes committed unapplied filters | Shared named GET filter form and independent named page-size form; pagination and page-size use committed URL filters. Applying filters resets both page indices. |
| State copied from initial props could outlive refreshed server data; optimistic insertion could put records outside the active filter/page and leave counts stale | Render authorized server-page records directly. Successful existing mutations refresh server results/counts; no new out-of-scope row is prepended. Success/error feedback is placed with its originating action/review/import context. |
| Balance detail opened automatically and selection was local-only | Explicit named native Inspect links, query-owned selection, focusable detail anchors and native Close links. Selection resolves only among authorized current-page records. |
| Both page indices could exceed their result ranges | Server normalization preserves committed filters and redirects to valid balance/transaction pages independently. Nonstandard supported sizes such as 13 remain accurately represented in the size control. |
| Employee picker rendered the empty choice when a valid selected ID fell outside loaded options | One shared `EmployeeSearchSelect` correction honors its existing selected-label fallback. The new filter's controlled employee state lives inside the shared form subtree, preserving committed history restoration without remounting business forms as a blanket synchronization fix. |
| Employee picker labels/help inherited low-contrast legacy colors | Central form-label/help selectors consume the existing semantic muted-text token. No page-specific colors or new stylesheet/library. A reusable employee-filter grid modifier aligns the search and selector with other fields, avoiding a tall nested picker and wasted desktop space. Expanded-state testing also identified 4.49:1 selected-row secondary text; the existing semantic selected-row rule now covers the established `accerio-data-table` class as well as `workspace-data-table`. |
| `FY`, missing actor shown as System, carry-forward import claims, and unsupported search hints overstated available evidence | Use stored Year, Not recorded when actor evidence is absent, supported CSV action labels, and supported transaction search fields. Carry-forward/year-close functionality is not added. |
| Lost write response implied safe blind retry | Feedback now says the outcome is unconfirmed and instructs inspection of transaction history before retrying. No exactly-once guarantee or new idempotency contract is invented. |

## Source and API contracts

- [Page](../../web/src/app/hr-admin/leave-balances/page.tsx): existing `leave.view` gate; `leave.balances.manage` determines permitted presentation of existing operations.
- [Workspace](../../web/src/app/hr-admin/leave-balances/leave-balance-operations.tsx): existing mutation payloads, review eligibility supplied by the backend, URL adapter, independent pagination, explicit detail selection and compact utilities.
- [Shared employee picker](../../web/src/components/patterns/employee-search-select.tsx): preserves selected value when the provided fallback option is rendered. No new employee lookup or authorization contract.
- [Central styles](../../web/src/styles/workspace-patterns.css), [filter form](../../web/src/components/patterns/workspace-filter-form.tsx), [table scroll region](../../web/src/components/patterns/workspace-table-scroll-region.tsx), existing PageIntro, shell, badges, PaginationBar, WorkspaceLoading and WorkspaceLoadError. New route loading/error boundaries reuse those patterns.
- [Backend views](../../backend/apps/common/api_views.py): `HrAdminLeaveBalanceListView`, `HrAdminLeaveBalanceTransactionListView`, `HrAdminLeaveBalanceActionView`, `HrAdminLeaveBalanceTransactionReviewView`.
- [Services](../../backend/apps/leave_management/services.py): existing `apply_leave_balance_admin_action`, `_employee_can_review_leave_balance_transaction` and `review_leave_balance_transaction`. [Year-close integrity](../../backend/apps/leave_management/year_end_services.py) remains unchanged.

Existing frontend proxy contracts remain: GET `/api/hr-admin/leave-balances`, GET `/api/hr-admin/leave-balances/transactions`, POST `/api/hr-admin/leave-balances/actions`, POST `/api/hr-admin/leave-balances/transactions/{id}/review`. Both lists accept existing employee/policy/search/page/page-size parameters; transaction status affects history only. Backend page size is bounded to 50. Balance search additionally matches leave-type name; transaction search additionally matches reason. Sorting remains the existing backend order, not a new client-only sort.

Actions retain `{employee_id, leave_policy_id, action, units, effective_date, reason}`. Review retains `{decision, rejection_reason}`. Permissions, actor separation, designated reviewer, policy eligibility, effective-period resolution, history locks, ledger calculations, audit generation and response DTOs are unchanged. **No backend application code, dependency, environment contract or migration is introduced by this slice.** Existing uncommitted Attendance/Leave Applications work is retained.

## Fresh verification

| Fresh final check | Result | Evidence |
|---|---|---|
| Production-built browser suite | **24 passed, 0 failed, 0 skipped, 0 blocked/unexecuted** (8 per engine; retries 0) | [Log](../qa/evidence/hr-admin-standardization/leave-balances/browser-acceptance.txt), [JSON](../qa/evidence/hr-admin-standardization/leave-balances/results.json), traces under `results/` |
| Backend/API/PostgreSQL | **57 passed, 0 failed/skipped**, 3 existing deprecation warnings | [Log](../qa/evidence/hr-admin-standardization/leave-balances/backend-tests.txt) |
| TypeScript / ESLint | PASS / PASS | `typecheck-acceptance.txt`, `eslint-acceptance.txt` in evidence root |
| Django checks / production build | PASS (0 issues) / PASS | `django-check.txt`, `build-review.txt` in evidence root |

Executed on macOS arm64, Node 24.14.0, Playwright 1.62.1: headless Chromium 151.0.7922.34, Firefox 153.0 and WebKit 26.5. These are browser-engine checks, not native Safari or real-device certification. [Machine summary](../qa/evidence/hr-admin-standardization/leave-balances/acceptance-summary.json).

Evidence root: [leave-balances](../qa/evidence/hr-admin-standardization/leave-balances/). Browser [configuration](../../web/playwright.leave-balances.config.ts) uses production-built Next, loopback Django and disposable PostgreSQL 16, one worker and retries=0. [Tests](../../web/tests/leave-balances-admin/balances.spec.ts) verify:

- Apply/Enter, employee/policy/status scopes, independent pagination, draft exclusion, page-size changes, reload/Back, empty/reset states and out-of-range page recovery.
- Selected employee remains represented when results are empty; explicit balance and transaction details support keyboard activation and refresh.
- Invalid credit leaves balances unchanged; an injected pre-upstream transport failure retains entered fields; a genuine authorized retry creates one credit and updates server-rendered transaction results.
- Configured maker/checker separation, required rejection reason, rejection without a balance change, and approval of a single 0.25-unit pending debit through the real backend.
- Foreign employee action returns 400; foreign transaction review returns 404; foreign-scoped history is empty; authorized read-only HR cannot mutate; employee administration is denied (403). These statuses preserve existing contracts.
- Desktop/tablet/mobile layout, named keyboard table scrolling, focusable details, accessible control names, normal/expanded form axe checks, and neighboring Leave Applications, Employees and Attendance navigation.

Backend regression selection: `backend/apps/leave_management/tests.py`, `backend/tests/test_db3_leave_year_integrity.py`, `backend/tests/test_db3a_leave_year_operations.py`, `backend/tests/test_ess3_leave_contract.py`, and `backend/apps/common/tests.py::HrAdminOptionMetadataTests::test_leave_balance_list_and_actions_enforce_tenant_scope`. These are newly executed, not inherited certification totals. Existing Python deprecation warnings are retained.

## Defects, failed attempts and evidence preservation

- [Attempt 1 log](../qa/evidence/hr-admin-standardization/leave-balances/browser-attempt1.txt), [results](../qa/evidence/hr-admin-standardization/leave-balances/attempt1/results.json): 3 setup failures and 21 cases not run. The synthetic seed passed a string to a Decimal-only internal service. Fix belongs in the fixture; production service validation was not weakened. Standalone [preflight](../qa/evidence/hr-admin-standardization/leave-balances/preflight.txt) subsequently passed and verified its cleanup.
- [Attempt 2 log](../qa/evidence/hr-admin-standardization/leave-balances/browser-attempt2.txt), [results](../qa/evidence/hr-admin-standardization/leave-balances/attempt2/results.json): 18 passed / 6 failed. Three read-only checks used a manager fixture that correctly lacked HR-workspace access; the replacement is an actual restricted HR account in the foreign synthetic tenant, with balance management removed there only. No production permission rule changed. Three axe checks found real label/help contrast failures (including 3.61:1 versus 4.5:1 required for those small labels); fixed centrally with existing tokens. Original traces/axe output remain in attempt2.
- [Attempt 3 log](../qa/evidence/hr-admin-standardization/leave-balances/browser-attempt3.txt), [results](../qa/evidence/hr-admin-standardization/leave-balances/attempt3/results.json): 21 passed / 3 failed. Normal-view contrast and the corrected read-only checks passed. Expanded detail/action scans exposed selected-row text at 4.49:1 versus 4.5:1; the shared selector was corrected, not the threshold or scan.
- [Functional candidate](../qa/evidence/hr-admin-standardization/leave-balances/functional-candidate/results.json) passed 24/24. Actual screenshot review then prompted compact shared employee-filter grid presentation and a consistent import disclosure; final acceptance evidence is separate, not inherited from that candidate.
- Early TypeScript checks recorded JSX tag mismatches during implementation; corrected before production acceptance. Intermediate and interrupted build logs remain separate from accepted evidence.

## Visual and accessibility review

[Screenshot index](../qa/evidence/hr-admin-standardization/leave-balances/screenshots.md) links final desktop 1440px, tablet 768px, mobile 390px, mobile detail and expanded action form. Actual rendered screenshots are reviewed in addition to test assertions. Table overflow stays in named keyboard-operable containers, rather than clipping data/actions at document level. UI uses central Accerio tokens/surfaces/typography and existing shell/header/form/table patterns; domain data and eligibility remain in existing API/workspace layers.

Axe scans use WCAG 2 A/AA and WCAG 2.1 AA tagged rules on the workspace main content, including the expanded balance detail/action form. Keyboard detail activation, table scrolling, control names and mobile action reachability are exercised. These checks do **not** establish formal WCAG conformance. Actual screen readers, native 200%/400% browser zoom, real mobile devices, exhaustive assistive-technology coverage and fresh reduced-motion/performance certification remain unexecuted.

## Restrictions and release decision

CSV parsing/commit behavior remains the existing implementation; preview resolves employees and policies from the loaded balance page and now explicitly says so. Full multi-page import resolution, exhaustive CSV/error/partial-commit cases, encashment browser permutations and carry-forward/year-close screens are not newly certified here. No automatic safe retry after an ambiguous committed write is promised: existing action contracts do not provide a new client idempotency key. The transport test aborts before backend processing; it does not prove exactly-once execution after a lost successful response.

Loading/error boundaries are connected to shared components, but a complete server-outage recovery matrix is not newly executed. This is a scoped implementation/QA slice, not the frozen 204-case ESS suite or a complete Attendance/HR Admin re-certification. Remaining Leave sequence is Types/Policies/Assignments and their forms, then Leave Year and balance reporting, each with separate QA.

[Source/build provenance](../qa/evidence/hr-admin-standardization/leave-balances/source-provenance.json) records HEAD, final build ID and scoped source hashes. Source remains uncommitted on an existing dirty worktree; it is not a pinned deployment image. [Cleanup](../qa/evidence/hr-admin-standardization/leave-balances/cleanup.json) verified zero synthetic tenants/users, removed the owned PostgreSQL container/volumes and secure temporary environment, stopped frontend/backend, and confirmed ports 3203/8053/55448 closed. Final screenshots were inspected at 1440/768/390 widths across all three engines, including mobile action/detail presentation; compact filter alignment and consistent disclosure presentation were confirmed.

**Local tested functionality: PASS. Overall scoped certification: CONDITIONAL** for the explicit unexecuted areas above. **Staging promotion: NO-GO under existing open gates; no deployment authorization is inferred from this local slice**. Lightsail staging and frozen production release-gate statuses remain unchanged. No deployment, customer data, payroll/statutory calculation changes or automatic next-module work.
