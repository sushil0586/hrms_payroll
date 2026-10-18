# HRMS/Payroll LC-1 Local Engineering Closure

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Production readiness: **not certified**

## Frozen scope

The RG-Final assessment identifies exactly four locally actionable gates. No IDs were added or renumbered.

| Gate | Opening state | LC-1 state | Disposition |
|---|---|---|---|
| `DDG-F-020` | Partial | Partial | Organization import remains atomic/idempotent and governed audit RBAC passed. A product-approved per-module atomic-versus-partial matrix and lost-response contract are still absent for row-by-row employee, bank, manager, attendance, shift, leave and payroll workbenches. No default was invented. |
| `DDG-F-021` | Partial | Partial | Workforce CSV/manifest/checksum/audit and the retained 2,500-row evidence remain valid. The enabled-report catalogue and approved target volumes are not yet signed off, so application-wide report certification cannot be asserted. |
| `DDG-F-023` | Blocked | Blocked | Durable payroll jobs are reusable architecture, but no durable-import launch scope, checkpoint granularity or recovery contract is approved. Background import execution remains disabled; no second job framework was introduced. |
| `DDG-F-030` | Partial | **Verified locally** | All ten currently validated temporal payroll identities now have transaction-serialized PostgreSQL overlap guards, compatibility preflight, bypass tests and browser/API evidence. |

Totals for this four-gate pass: **1 closed, 2 Partial, 1 Blocked**.

## Root cause and remediation

`DDG-F-030` relied on Django `full_clean()` overlap queries. Those checks provided friendly API validation but could be bypassed through `bulk_create`, queryset/raw writes, or simultaneous transactions.

Migration `payroll.0043_temporal_configuration_overlap_guards` now:

- scans existing rows and aborts with a classification count if any ambiguous overlap exists;
- takes a transaction-scoped PostgreSQL advisory lock on each temporal business identity;
- rejects inclusive date-range overlap for fiscal years, accounting periods, payroll periods, pay-group assignments, salary-structure versions, employee salary assignments, statutory packs, employer registrations, employee statutory profiles and payroll-rule versions;
- applies active-status filtering only where the existing model rule already does so;
- rejects inverted ranges and protects ORM bulk and raw SQL paths;
- has a reversible trigger/function installation and does not rewrite historical records.

No payroll formula, precedence, RBAC, tenant scope, API contract or historical row was changed.

## Executed evidence

Commands were run against disposable PostgreSQL 16 on port `55471` and a production-built Next.js server on port `3122`.

```bash
python backend/manage.py migrate --noinput
python backend/manage.py migrate payroll 0042 --noinput
python backend/manage.py migrate payroll 0043 --noinput
python -m pytest backend/tests/test_lc1_temporal_payroll_integrity.py \
  backend/tests/test_db6_payroll_configuration_integrity.py \
  backend/tests/test_phase0_api_smoke.py::<seven focused temporal/import tests> -q
pnpm --dir web exec playwright test tests/e2e/payroll-setup-flows.spec.ts \
  --grep 'payroll setup browser CRUD' --workers=1 --reporter=line
pnpm --dir web exec tsc --noEmit
pnpm --dir web exec eslint tests/e2e/payroll-setup-flows.spec.ts
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
pnpm --dir web build
docker build -f backend/Dockerfile -t hrms-backend:lc1 .
```

Results:

- fresh full migration chain: passed;
- migration rollback and reapply: passed;
- focused PostgreSQL/backend regression: **10 passed**;
- direct bulk/raw bypass and two-transaction race: **2 passed** (included in the 10);
- production-built payroll setup CRUD/validation browser journey: **1 passed in 26.1 s**;
- TypeScript, focused ESLint, Django check and migration drift: passed;
- optimized frontend build: passed with the pre-existing CSS `end`/`flex-end` warning;
- backend production image build: passed;
- browser-created assignment was independently observed in PostgreSQL;
- disposable `lc1-browser` tenant cleanup: `remaining=0`.

Evidence: `docs/qa/evidence/lc1-2026-10-18/`.

The first migration attempt failed because period models use `start_date/end_date`; the corrected fresh-chain run passed. The first Playwright attempt failed because `next start` was pointed at `.next` rather than the repository's `.next/build`; the unchanged rerun passed with `NEXT_DIST_DIR=.next/build`. Neither failed run is counted as product evidence.

## Modified files

- `backend/apps/payroll/migrations/0043_temporal_configuration_overlap_guards.py`
- `backend/tests/test_lc1_temporal_payroll_integrity.py`
- `docs/qa/hrms-release-gate-execution-tracker.csv`
- `docs/qa/hrms-mandatory-launch-gates.csv`
- this report and LC-1 evidence logs

## Remaining prerequisites

- Product and QA must approve the import behavior matrix before `DDG-F-020` can close.
- Reporting and QA must freeze enabled report families and supported volumes before `DDG-F-021` can close.
- Product and Platform Engineering must approve whether durable imports are launch scope, plus checkpoint/recovery semantics, before `DDG-F-023` can move from Blocked.
- Staging evidence remains required for performance, protected storage, TLS, recovery and provider gates outside this pass.

LC-1 is **CONDITIONAL**: the unambiguous temporal integrity gate is closed locally; three scope-dependent gates remain explicitly unresolved. This is not production certification.
