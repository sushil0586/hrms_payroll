# HRMS/Payroll Complete Staging E2E Test Plan

Date: 2026-10-26
Target: `https://hrms.accerio.in`
Environment: synthetic-only AWS Lightsail staging
Decision boundary: functional staging certification only; real payroll and production remain NO-GO

## Purpose

Certify every supported HRMS/Payroll workflow through one connected synthetic organization. Browser actions initiate user-facing behavior; API, PostgreSQL, Celery, email, artifact, audit, and authorization evidence independently confirm the result. Existing frozen 963-case, DB-6, DD, and release-gate evidence is reused but does not replace fresh staging execution.

## Fixed Safety Rules

- Never use Accerio India, Northstar, customer, staging operator, or production records for mutation.
- Create exactly one owned tenant named `pw-qa-stage-lifecycle-<run>` with `playwright.qa.invalid` ownership markers.
- Use `manage_playwright_workspace` hydration/cleanup and retain its manifest throughout the run.
- Run Playwright with `--workers=1`; do not run broad route sweeps or load tests on the 4 GB host.
- No real payments, customer email, production provider callbacks, irreversible erasure, or unapproved statutory calculations.
- Capture every created tenant, entity, employee, request, period, run, job, artifact, and audit ID.
- Stop immediately for tenant leakage, unauthorized payroll access, financial mismatch, duplicate posting, or immutable-history mutation.
- Preserve failed evidence and rerun under the same scenario ID. A failed or interrupted attempt is never a pass.

## Evidence Contract

Each scenario must record:

1. Scenario ID, UTC timestamp, deployed commit and backend/web image identity.
2. Persona, tenant ID, legal-entity ID, route and initiating browser action.
3. HTTP method, endpoint, status and resulting resource ID.
4. PostgreSQL ownership, foreign keys, lifecycle state and audit event.
5. Celery task/job ID and truthful state for asynchronous work.
6. Expected versus actual business result and downstream impact.
7. Screenshot/trace on failure and focused screenshot for financial milestones.
8. Cleanup disposition and independently verified tenant absence.

Evidence root: `/tmp/hrms-stage-e2e-<run>/`. Secrets, cookies, tokens and private keys must never be written to evidence.

## Synthetic Lifecycle Manifest

The same connected data graph is reused across batches:

- Enterprise tenant, active subscription and one primary legal entity.
- Fiscal calendar, financial year, open accounting period and payroll calendar.
- Branch, location, business unit, department, grade, designation, employment type and cost center.
- HR Admin, Tenant Admin, Platform Admin, Employee, Manager A, Manager B and payroll checker identities.
- Employee A as the primary lifecycle employee; Employee B for isolation and negative tests.
- Leave year, two leave types, governed balances, policies and assignments.
- Shift, roster, holiday calendar, attendance policy and effective-dated assignments.
- Salary components, structure/version, salary assignment, pay group, period and statutory fixture.
- Document category/requirement, notification templates and protected artifact fixtures.
- Ownership manifest with all IDs and baseline row counts.

## Execution Order

### Batch 0: Deployment and Recovery Preflight

Scenarios `STG-E2E-0001`–`0006`.

- Verify commit/image mapping, TLS, security headers, public health, container health and zero unexpected restarts.
- Verify migrations, Redis, PostgreSQL, Celery worker and beat.
- Verify current encrypted/off-host backup status separately from the local predeploy dump.
- Capture baseline resource usage and available disk/RAM/swap.
- Confirm email uses only approved synthetic recipients.

Exit: services healthy, migration current, backup limitations documented, and no existing owned tenant for the run ID.

### Batch 1: Platform Tenant Onboarding

Scenarios `STG-E2E-0101`–`0106`.

- Platform Admin creates a sandbox Enterprise tenant through the browser.
- Duplicate tenant code/email is rejected without creating a second tenant.
- Activate the subscription and provision the first Tenant Admin.
- Verify subscription entitlements, platform audit, login and tenant ownership.
- Verify a non-platform identity cannot list/create tenants.
- Hydrate only the exact owned empty tenant using `--hydrate-existing`.

Exit: one tenant, one subscription state, one authorized admin graph and no duplicate identities.

### Batch 2: Organization and Legal Entity

Scenarios `STG-E2E-0201`–`0208`.

- Create/edit legal entity, branch, location, department, business unit, cost center, grade, designation and employment type through Tenant/HR Admin UI.
- Reject duplicate codes, invalid parents and cross-tenant IDs.
- Archive an unused organization record and prove referenced history is protected.
- Verify effective dates and audit events.

Exit: API and PostgreSQL match the browser-created hierarchy exactly.

### Batch 3: Fiscal, Leave-Year and Payroll Calendars

Scenarios `STG-E2E-0301`–`0308`.

- Configure tenant fiscal calendar and legal-entity override.
- Generate financial year and non-overlapping accounting periods.
- Configure leave-year period and payroll calendar/pay group/period with matching calendar references.
- Close/reopen an unused accounting period with authorization and audit evidence.
- Reject overlap, duplicate, cross-tenant and unauthorized transitions.

Exit: all three calendar domains resolve the intended business dates without changing historical rows.

### Batch 4: Employee Onboarding and Access

Scenarios `STG-E2E-0401`–`0410`.

- HR Admin creates Employee A and B through the browser.
- Assign legal entity, organization, manager, employment spell, work email and effective dates.
- Provision ESS for Employee A and MSS for Manager A.
- Validate first login, workspace routing, permitted profile update and HR-only field denial.
- Reject duplicate employee code/email, cross-tenant references and overlapping assignments.
- Verify future manager/department changes do not alter the current projection prematurely.

Exit: employee, membership, role and effective-dated history reconcile independently.

### Batch 5: Leave Configuration and ESS/MSS Lifecycle

Scenarios `STG-E2E-0501`–`0512`.

- Configure leave types, policy period, accrual, carry-forward and expiry using only approved fixture rules.
- Assign the employee and verify opening ledger/balance.
- ESS submits valid leave; duplicate click and lost-response retry produce one request.
- Manager A approves; balance reservation/consumption and attendance representation reconcile.
- Exercise rejection, cancellation and balance restoration on separate requests.
- Reject overlap, insufficient balance, unauthorized manager, cross-tenant access and unsafe post-expiry cancellation.
- Verify append-only ledger entries and no mutation of historical movements.

Exit: opening + earned + adjustments - used - expired equals closing balance.

### Batch 6: Attendance, Shift, Roster and Close

Scenarios `STG-E2E-0601`–`0612`.

- Configure regular and overnight shifts, holiday calendar, attendance policy, roster and assignments.
- Verify present, absent, paid leave, unpaid leave, holiday, weekly off, late, half-day and missing-punch derivation where configured.
- ESS submits regularization; MSS approves and rejects separate requests.
- Verify duplicate/retry safety and correct target record.
- Reconcile, submit, approve and close one attendance period.
- Reject pending exceptions, duplicate close, unauthorized reopen and post-close mutation.
- Verify payable-day/LOP evidence for payroll.

Exit: closed summary equals independent PostgreSQL aggregation and remains immutable.

### Batch 7: Documents and Notifications

Scenarios `STG-E2E-0701`–`0710`.

- Configure document category and requirement.
- ESS uploads an allowed synthetic file; invalid type/size and duplicate action are rejected.
- HR verifies and rejects separate versions; employee resubmits after rejection.
- Verify replacement/version history, expiry, visibility and protected download ownership.
- Deny Employee B and cross-tenant artifact access.
- Verify notification creation, read state, deep link and SES delivery to an approved synthetic mailbox.
- Record malware scanning, signed URL, encryption and storage-retention capabilities as blocked unless actual staging services prove them.

Exit: database metadata, checksum, storage object and audit history agree; no sensitive public URL exists.

### Batch 8: Salary, Statutory and Payroll Readiness

Scenarios `STG-E2E-0801`–`0810`.

- Create salary components, structure/version and employee assignment through HR Admin UI.
- Configure only approved synthetic statutory components; do not infer legal rates.
- Verify future salary revision and historical salary resolution.
- Reject overlap, cross-employee/cross-tenant assignment and invalid pay-group/calendar combinations.
- Confirm leave and closed attendance evidence enter readiness correctly.
- Confirm unresolved prerequisites block payroll with actionable errors.

Exit: readiness is green only for the intended employee/period and historical payroll inputs remain unchanged.

### Batch 9: Connected Payroll Processing

Scenarios `STG-E2E-0901`–`0910`.

- Create run, employee input snapshot and input lock through the browser.
- Verify duplicate run/request protection and immutable locked input.
- Calculate through Celery and verify queued/running/succeeded state survives refresh.
- Submit review, maker/checker approve and final-lock.
- Reject unauthorized approval, concurrent stale decision and finalized mutation.
- Independently reconcile gross, deductions, employer cost and net using the approved synthetic oracle.

Exit: one locked payroll run and one calculation effect, with exact employee/run/snapshot identity continuity.

### Batch 10: Outputs, ESS Payslip and Finance

Scenarios `STG-E2E-1001`–`1010`.

- Generate outputs, publish once and verify idempotent retry.
- ESS lists and downloads only Employee A's payslip.
- Deny Employee B, cross-tenant and unauthenticated artifact access.
- Verify payroll register, bank advice and finance handoff totals/checksums.
- Verify accounting-period mapping and closed-period posting rejection.
- Simulate supported local failure/retry without marking an external payment paid.

Exit: payroll total = payslip total = bank advice total = finance handoff total.

### Batch 11: Reports, Search, Imports and Exports

Scenarios `STG-E2E-1101`–`1110`.

- Verify employee, leave, attendance, payroll and lifecycle reports against independent queries.
- Verify filters, sorting, pagination, effective/as-of dates and export row counts.
- Verify secure download, checksum and tenant scope.
- Run only imports with documented deterministic source identity and outcome semantics.
- Verify duplicate replay, invalid rows, partial/atomic behavior and recoverable failure.
- Keep unsupported durable background imports explicitly disabled.

Exit: displayed totals and exported rows match PostgreSQL; no duplicate import effects.

### Batch 12: Lifecycle Changes and Historical Protection

Scenarios `STG-E2E-1201`–`1208`.

- Same-entity promotion/department/manager movement with effective dates.
- Manager A loses authority after the effective date; Manager B receives new work.
- Archive versus active assignment protections.
- Deactivate employee access while retaining payroll, payslip, leave, attendance and document history.
- Verify safe blockers for cross-entity transfer, rehire, FnF and pending-request reassignment where policy remains unapproved.

Exit: current and historical projections resolve correctly and prior payroll remains immutable.

### Batch 13: Failure, Recovery and Security

Scenarios `STG-E2E-1301`–`1310`.

- Session expiry and reauthentication; logout invalidates access.
- Cross-role and cross-tenant API/UI denial.
- Duplicate mutation, lost response and idempotency replay.
- Browser refresh/navigation during durable jobs.
- Controlled worker interruption only in an approved maintenance window; otherwise retain as pending infrastructure evidence.
- Retry bounded failures without duplicate payroll, leave, attendance, document or finance effects.
- Verify logs contain actor/tenant/action/outcome without tokens or secrets.

Exit: all protected operations fail closed and recovery preserves one business effect.

### Batch 14: Cleanup and Certification

Scenarios `STG-E2E-1401`–`1406`.

- Export final lifecycle manifest, financial reconciliation and audit inventory.
- Record pre-cleanup owned row/object/job counts.
- Run ownership-verified synthetic teardown.
- Verify tenant, users, files, jobs, artifacts and queue references are absent.
- Confirm Accerio India and all baseline tenant counts/checksums are unchanged.
- Capture post-run resource, restart and error-log sample.

Exit: zero owned residue and no shared-tenant mutation.

## Planned Inventory

| Batch | Scenarios | Primary portal(s) | Mutation |
|---|---:|---|---|
| 0 Preflight | 6 | Public/operations | No |
| 1 Tenant onboarding | 6 | Platform Admin | Yes |
| 2 Organization | 8 | Tenant/HR Admin | Yes |
| 3 Calendars | 8 | Tenant/HR Admin | Yes |
| 4 Employees/access | 10 | HR Admin/ESS/MSS | Yes |
| 5 Leave | 12 | HR Admin/ESS/MSS | Yes |
| 6 Attendance | 12 | HR Admin/ESS/MSS | Yes |
| 7 Documents/notifications | 10 | HR Admin/ESS | Yes |
| 8 Salary/readiness | 10 | HR Admin | Yes |
| 9 Payroll | 10 | HR Admin/checker | Yes |
| 10 Outputs/finance | 10 | HR Admin/ESS | Yes |
| 11 Reports/import/export | 10 | All applicable | Controlled |
| 12 Lifecycle/history | 8 | HR Admin/MSS/ESS | Yes |
| 13 Recovery/security | 10 | All portals | Controlled |
| 14 Cleanup | 6 | Operations | Destructive, owned tenant only |
| **Total** | **136** | **Five portals** | **Synthetic only** |

## Batch Execution Mechanics

For every batch:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
PLAYWRIGHT_SKIP_WEB_SERVER=1 \
PLAYWRIGHT_EXISTING_QA_WORKSPACE_MANIFEST=/tmp/hrms-stage-e2e-<run>/workspace.json \
PLAYWRIGHT_EXISTING_QA_WORKSPACE_SEED_REF=stage-lifecycle-<run> \
pnpm --dir web exec playwright test <focused-specs> --workers=1 --trace=retain-on-failure
```

After browser execution, run a batch-specific read-only Django/PostgreSQL reconciliation and save redacted JSON. Record host/container metrics before and after payroll, export and document operations. Do not run another mutable batch until the current batch has a reconciled status.

## Status Definitions

- **Passed:** browser action plus required API/database/Celery/downstream evidence all passed.
- **Failed:** executed behavior violates an approved requirement or confirmed product defect remains.
- **Blocked:** required policy, provider, storage, recovery window or infrastructure is unavailable.
- **Skipped:** only an explicitly approved non-applicable scenario; no convenience skips.
- **Not Run:** no complete execution evidence.

## Certification Decisions

- **Functional staging PASS:** all enabled ordinary lifecycle scenarios pass; blocked advanced/provider scenarios are technically disabled and documented.
- **Conditional:** no integrity/security failure, but external storage, backup restore, provider sandbox, policy or capacity evidence remains.
- **FAIL:** unresolved tenant isolation, RBAC, financial reconciliation, immutable history, duplicate posting or cleanup failure.

Completion of this plan does not establish production readiness. Real-payroll entry additionally requires approved statutory oracles, payment-provider sandbox reconciliation, protected object storage, off-host backup/restore, monitoring, deployment rollback and accepted capacity evidence.
