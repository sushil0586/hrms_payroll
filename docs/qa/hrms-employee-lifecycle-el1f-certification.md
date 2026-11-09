# Employee Lifecycle EL-1F Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1F certifies `ELC-033` through `ELC-047`: ESS access provisioning, manager-role activation and revocation, unauthorized and privilege-escalation denial, last-admin and inactive-login controls, dual ESS/MSS personas, and the employee bank-account lifecycle.

No shared staging or production system was used.

## Changes

- Restricted non-tenant administrators from assigning the `tenant-admin` role.
- Added transactional access-change audit events with actor, employee, login state, membership state, and sorted role references; credentials are excluded.
- Added bank-account create/update audit events containing only the last four account digits.
- Added friendly duplicate-account and IFSC validation.
- Added PostgreSQL uniqueness constraints for employee/account number and one primary account per employee.
- Added fixed directory success receipts after modal access and bank saves.
- Added an EL-1F Playwright suite for dual-role provisioning, fresh-session activation/revocation, and modal receipts.

Migration: `employees.0003_employeebankaccount_employee_bank_account_number_unique_and_more`.

Existing databases must be checked for duplicate `(employee, account_number)` values and multiple primary accounts before deployment. The migration fails closed if conflicting records exist; it does not silently rewrite financial configuration.

## Browser Evidence

New EL-1F lifecycle suite:

- Chromium: 3/3 passed.
- Firefox: 3/3 passed.
- WebKit: 3/3 passed.
- Aggregate: **9 passed, 0 failed** with one worker.

Focused retained phase-4 qualification:

- Chromium: 5/5 passed.
- Firefox: 5/5 passed.
- WebKit: 5/5 passed.
- Aggregate: **15 passed, 0 failed** with one worker.

The retained suite verifies access and bank validation, masking, primary replacement, pending-state close guards, deterministic field rejection, uncertain-request draft retention, and unauthorized employee denial.

WebKit initially remained on the login page because the local production server issued a Secure cookie over plain HTTP. Restarting the task-owned frontend with `HRMS_COOKIE_SECURE=false` aligned the local transport policy; the clean WebKit run passed 3/3. No production cookie behavior or application security control changed.

## PostgreSQL and API Evidence

Focused Django/PostgreSQL qualification: **6 passed, 0 failed, 402 deselected**.

- HR Admin cannot save access without a role.
- A non-tenant administrator cannot grant `tenant-admin`; state and audit count remain unchanged.
- Access updates are audited without passwords or credentials.
- Valid bank create/update persists and produces redacted audit snapshots.
- Invalid IFSC, duplicate accounts, and foreign-tenant employees are rejected without mutation.
- Database constraints reject duplicate account numbers and competing primary accounts.
- The existing last-active-tenant-admin safeguard remains green.

## Quality Gates

- TypeScript: PASS
- ESLint: PASS
- Django system check: PASS, zero issues
- Migration drift: PASS, no changes detected
- Migration application: PASS on PostgreSQL 16
- Production build: PASS, 313 static pages generated
- Existing Autoprefixer warning at `globals.css:4686`: unchanged

## Scenario Verdicts

Promoted to Passed: `ELC-033` through `ELC-047`.

`ELC-039` also retains its prior EL-1E browser evidence for access suspension followed by inactive-employee login denial. No scenario outside the EL-1F range was changed.

## Verdict

EL-1F executed scope: **PASS**. Access, role, persona, and employee bank-account lifecycle behavior is locally certified across Chromium, Firefox, WebKit, API authorization, audit redaction, tenant isolation, and PostgreSQL integrity controls.

No commit, push, deployment, shared migration, email, or payroll execution occurred.
