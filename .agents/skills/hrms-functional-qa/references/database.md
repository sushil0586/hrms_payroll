# PostgreSQL verification and reconciliation

Before execution, explicitly identify approved disposable database/server/schema/user and settings, frontend/BFF/backend destinations, worker/Redis routing, and external-effect controls. `backend/pytest.ini` uses `config.settings.local`, which converts PostgreSQL to SQLite. Use explicitly reviewed suitable settings; POSTGRES environment variables alone do not overcome this override.

When execution is authorized, observe effective Django `connection.vendor`, redacted connection target and settings module; verify `SELECT current_database(), current_user, current_schema(), version()` on that same connection. Match the approved target. Check migration graph and test-database naming/creation permissions before pytest; never run migrations against a shared target merely for QA readiness. Do not publish secrets.

Backend pytest-django test isolation is distinct from browser fixture isolation: browser helpers call a running database and create persistent synthetic tenants. Inspect `web/tests/helpers/isolated-qa-workspace.ts` and `backend/apps/common/management/commands/manage_playwright_workspace.py`; verify exact namespace, owner IDs, storage ownership, and interruption recovery before use.

Reconcile scenario-scoped before/after assignments, effective periods, row counts, constraints, timestamps/versions, audit actor/tenant, history locks, attendance derivation, leave balances, and payroll input snapshots as applicable. Rejected writes must retain legitimate prior state. Validate replay and concurrent outcomes with actual PostgreSQL behavior; SQLite is insufficient.

Cleanup: preserve a private credential manifest outside published evidence; retain a redacted ownership manifest. Dry-run deletion, check exact ownership and planned private files, delete only authorized IDs, verify absence and shared-resource preservation. On failure retain recovery identifiers and report BLOCKED/residuals; never broaden deletion. Stop only campaign-owned processes/resources within approved scope.
