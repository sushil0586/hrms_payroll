# P0 Launch Gate Audit - 2026-09-29

This audit tracks the minimum launch-grade gates that must be green before public production launch.

## Decision Legend

| Status | Meaning |
| --- | --- |
| Passed | Verified by current automated evidence in this audit run. |
| Covered, needs live proof | Test or code coverage exists, but the final answer requires stage/prod execution. |
| Blocked | Must be fixed before launch. |
| Manual | Requires operational confirmation outside local automation. |

## P0 Gate Summary

| Gate | Launch requirement | Existing evidence asset | Current status |
| --- | --- | --- | --- |
| Login routing | Logged-in users must land only in the correct workspace. | `web/src/lib/workspace-routing.ts`, `web/tests-live/e2e/live-auth-role.spec.ts`, `web/tests/e2e/production-tenant-role-isolation.spec.ts` | Local live-browser proof passed, needs deployed proof |
| RBAC direct URL boundaries | Users must not access restricted workspace pages by direct URL. | `web/tests/e2e/public-launch-role-menu-certification.spec.ts`, `web/tests/e2e/production-tenant-role-isolation.spec.ts`, `web/tests/e2e/phase7a-role-access-boundaries.spec.ts` | Local live-browser proof passed, needs deployed proof |
| Email reliability | Invite, reset, and notification email paths must queue/deliver correctly. | `backend/tests/test_account_email_flows.py`, notification recovery docs/tests | Local paths passed, needs live SES proof |
| Payroll certification | Clean tenant payroll must run readiness to finance handoff with evidence. | `web/tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts`, `web/tests/e2e/accerio-september-payroll-real-scenario.spec.ts`, payroll/finance docs | Covered, needs current tenant proof |
| Finance handoff | Bank advice, payroll register, statutory evidence, provider receipts, and audit pack must reconcile. | `web/tests/e2e/finance-manager-control-center-certification.spec.ts`, `web/tests/e2e/pilot-100-finance-handoff-compliance-certification.spec.ts` | Covered, needs current tenant proof |
| Production observability | Backend/web health, logs, job queues, notification failures, backup/restore, and alerting must be visible. | `scripts/run-public-launch-gate.py`, `scripts/run-production-launch-signoff.py`, ops health docs | Quick gate passed, needs prod ops proof |
| Secrets and environment posture | Production secrets must not appear in repo/docs/logs and must be configured in runtime only. | `pnpm qa:docs` secret scan, deployment env checklist | Covered, needs prod env proof |
| Documentation readiness | New users must have positive and negative scenario guidance. | `docs-site/docs/scenario-coverage.md`, `docs-site/docs/glossary.md`, `pnpm qa:docs` | Passed |

## Local Audit Run - 2026-09-29

These checks were run locally from the repository root unless noted.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| User documentation coverage and strict build | `pnpm qa:docs` | Passed | 94 docs, 94 nav files, 69 menu links, 83 child/utility routes, 52 screenshots |
| Web type safety | `pnpm typecheck:web` | Passed | TypeScript completed with no errors |
| Web lint | `pnpm --dir web lint` | Passed | ESLint completed with no errors |
| Live auth and workspace routing | `PLAYWRIGHT_LIVE_BACKEND_PORT=8022 PLAYWRIGHT_LIVE_WEB_PORT=3222 PLAYWRIGHT_LIVE_DB_NAME=db.playwright.p0-launch.sqlite3 pnpm --dir web exec playwright test --config playwright.live.config.ts tests-live/e2e/live-auth-role.spec.ts` | Passed | 4 browser tests passed: unauthenticated redirect, HR admin workspace, employee ESS redirect from HR admin, manager approval workflow trace |
| Production tenant and role isolation | `PLAYWRIGHT_PORT=3230 HRMS_API_BASE_URL=http://127.0.0.1:8024/api/v1 pnpm --dir web exec playwright test tests/e2e/production-tenant-role-isolation.spec.ts --project=chromium --workers=1` | Passed | 5 browser tests passed: stale session redirect, public privileged-boundary landing, ESS payslip isolation, fail-closed privileged APIs, tenant/support scope controls |
| Cross-role menu certification | `PLAYWRIGHT_PORT=3231 HRMS_API_BASE_URL=http://127.0.0.1:8024/api/v1 pnpm --dir web exec playwright test tests/e2e/public-launch-role-menu-certification.spec.ts --project=chromium --workers=1` | Passed | 7 browser tests passed: platform, tenant, HR, finance, manager, employee sidebars, plus support session fail-closed surface |
| Deployed health smoke | `HRMS_SMOKE_BASE_URL=https://hrms.accerio.in HRMS_SMOKE_APP_DIR=/var/www/hrms-payroll-saas HRMS_SMOKE_ATTEMPTS=3 HRMS_SMOKE_SLEEP_SECONDS=2 HRMS_SMOKE_CHECK_SYSTEMD=false bash scripts/hrms-post-deploy-smoke.sh` | Passed | `/api/v1/health/`, `/`, and `/login` returned 200; health body reported `{"status": "ok", "service": "hrms-backend"}` |
| Deployed read-only auth routing | `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in pnpm --dir web exec playwright test tests/e2e/deployed-readonly-auth-routing.spec.ts --project=chromium --workers=1` | Blocked | Unauthenticated `/hr-admin` redirect passed; role login proof requires valid deployed role credentials via `PLAYWRIGHT_LIVE_*_USERNAME` and `PLAYWRIGHT_LIVE_*_PASSWORD` env vars |
| Django system check | `cd backend && ./.venv/bin/python manage.py check` | Passed | `System check identified no issues` |
| Migration drift check | `cd backend && ./.venv/bin/python manage.py makemigrations --check --dry-run` | Passed | `No changes detected` |
| Account email flows | `cd backend && ./.venv/bin/python -m pytest tests/test_account_email_flows.py` | Passed | 3 tests passed: reset, missing-account privacy, invite email |
| Quick public launch gate | `pnpm qa:public-launch-gate:quick` | Passed | `web/qa-artifacts/public-launch-gate-20260929T014508Z/public-launch-gate-report.md` |

Local result: no code-quality or local backend blockers found in this audit run.

Stage/prod proof still required before public launch:

- Browser login routing and RBAC using real deployed users.
- SES/provider delivery for reset, invite, and notification queues.
- One clean tenant payroll run from readiness through finance handoff.
- Backup restore, alert delivery, and production log/queue observability evidence.

## Gate 1: Login Routing

Required outcomes:

- Unauthenticated `/hr-admin` redirects to `/login`.
- HR Admin opens HR Admin workspace.
- Tenant Admin opens Tenant Admin workspace.
- Finance Manager opens Finance Manager workspace.
- Employee opens ESS and cannot open HR Admin.
- Manager opens MSS and cannot open HR Admin.
- User with no active workspace role lands on Workspace Access only when setup is incomplete.

Evidence to run:

```bash
pnpm --dir web exec playwright test --config playwright.live.config.ts tests-live/e2e/live-auth-role.spec.ts
```

Deployed read-only evidence, without mutating approvals or payroll:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME=<hr-admin-user> \
PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD=<hr-admin-password> \
PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME=<employee-user> \
PLAYWRIGHT_LIVE_EMPLOYEE_PASSWORD=<employee-password> \
PLAYWRIGHT_LIVE_MANAGER_USERNAME=<manager-user> \
PLAYWRIGHT_LIVE_MANAGER_PASSWORD=<manager-password> \
PLAYWRIGHT_LIVE_TENANT_ADMIN_USERNAME=<tenant-admin-user> \
PLAYWRIGHT_LIVE_TENANT_ADMIN_PASSWORD=<tenant-admin-password> \
pnpm --dir web exec playwright test tests/e2e/deployed-readonly-auth-routing.spec.ts --project=chromium --workers=1
```

Launch blocker if:

- Non-HR user lands on `/hr-admin`.
- Authenticated user lands on marketing/index page instead of a workspace.
- Restricted direct URL shows data instead of redirecting/failing closed.

## Gate 2: RBAC and Tenant Isolation

Required outcomes:

- Direct API calls fail closed without a session.
- Employee-scoped pages do not expose HR/payroll/provider artifacts.
- Tenant Admin and support pages expose only scoped access.
- Export endpoints do not leak evidence without an authenticated authorized session.

Evidence to run:

```bash
pnpm --dir web exec playwright test tests/e2e/production-tenant-role-isolation.spec.ts tests/e2e/public-launch-role-menu-certification.spec.ts --project=chromium --workers=1
```

Launch blocker if:

- Direct URL access bypasses menu/RBAC.
- Export route leaks payroll, salary, bank, provider, or audit payload details.
- Support scope allows data without an approved session.

## Gate 3: Email and Notification Reliability

Required outcomes:

- Password reset request queues email and reset token works.
- Invite email queues secure setup link and does not expose generated password.
- Missing-account reset does not disclose account existence.
- SES/provider delivery succeeds for approved sender/recipient.
- Notification failure and retry capped queues are visible and actionable.

Evidence to run:

```bash
cd backend
../.venv/bin/python -m pytest tests/test_account_email_flows.py
```

Live proof required:

- Send password reset to verified test email.
- Send invite to verified test email.
- Confirm notification delivery status in HR Admin notifications.

Launch blocker if:

- Reset/invite email does not arrive.
- Generated password appears in email body.
- Notification failures are invisible to HR Admin.

## Gate 4: Clean Tenant Payroll Certification

Required outcomes:

- Payroll setup is complete for a real tenant.
- Employee source data has no launch-grade blockers.
- Inputs lock for the intended period.
- Calculation produces explainable gross, deductions, and net pay.
- Review exceptions are cleared or accepted with notes.
- Outputs generate payslips, payroll register, bank advice, statutory files, and manifest.
- Finance handoff reconciles bank advice and audit evidence.

Evidence to run:

```bash
pnpm --dir web exec playwright test tests/e2e/accerio-september-payroll-real-scenario.spec.ts tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts --project=chromium --workers=1
```

Launch blocker if:

- Payroll can close with unresolved blockers.
- Bank advice does not match payroll register.
- Payslips publish before final approval.
- Finance handoff lacks audit evidence.

## Gate 5: Production Observability and Operations

Required outcomes:

- Backend health endpoint responds.
- Web app serves expected pages.
- Backend and web services restart cleanly.
- Notification failures are visible.
- Payroll provider jobs and retries are visible.
- Backup and restore rehearsal has evidence.
- Alerts/logs exist for production incidents.

Evidence to run:

```bash
pnpm qa:public-launch-gate
pnpm qa:launch-signoff:staging
```

Manual proof required:

- Stage/prod system logs.
- Backup restore evidence.
- Alert delivery proof.
- Provider credential and delivery proof.

Launch blocker if:

- Health checks fail.
- Background jobs fail silently.
- Backup exists but restore was not rehearsed.
- Logs or alerts cannot identify failed notification/payroll/provider jobs.

## Gate 6: User Documentation

Required outcomes:

- Every workspace menu has a guide.
- Every major child route family is covered by parent guide or workflow.
- Positive and negative scenarios are mapped.
- Status terms are explained.
- Docs build strictly.

Evidence to run:

```bash
pnpm qa:docs
```

Current status: Passed in this audit cycle.

## Final Launch Rule

Public launch should not proceed until:

1. `pnpm qa:docs` passes.
2. Web typecheck and lint pass.
3. Backend check, migrations dry-run, and email-flow tests pass.
4. Stage/live browser gates prove login routing and RBAC.
5. One clean real-tenant payroll run is certified through finance handoff.
6. Production observability, backup restore, and alert delivery are evidenced.
