---
name: hrms-functional-qa
description: Plan or perform authorized HRMS shift, roster, attendance, and leave workflow QA with API, role, tenant, audit, and PostgreSQL reconciliation evidence.
---
# HRMS functional QA

Read root `AGENTS.md` and the current campaign scope. Planning does not authorize execution. Reuse existing scenario registers, backend suites, browser fixtures, and reports before adding coverage.

1. Freeze stable scenarios for positive/negative paths, field boundaries, employee eligibility, assignments/effective dates, overnight/weekly-off rules, overlap, cancellation, and historical locks. Record uncertain business rules as policy blockers; do not invent expectations.
2. Map each scenario to browser action, authenticated API response, durable database effect, audit attribution, and downstream attendance/leave/payroll expectations. Inspect current services/models/API contracts to resolve actual boundaries.
3. Read [security verification](references/security.md) for RBAC, tenant/reportee isolation, stale writes, concurrency, and replay. Read [database verification](references/database.md) before any data-backed certification.
4. Select existing tests by scenario/assertion, inspect hooks and side effects, and verify authorization/environment before running anything. One owner executes mutations using isolated synthetic resources.
5. Retain actual results, rejected-request non-effects, database/audit reconciliation, retry attempts, and cleanup. Report PASS/CONDITIONAL/BLOCKED/FAIL/NOT RUN per scenario. Do not replace complete workflow evidence with a raw test count.

Return the scenario-to-evidence mapping, defects, downstream regression requirements, data residuals, and blockers to the orchestrator. Read-only reviewers must not provision or clean fixtures.
