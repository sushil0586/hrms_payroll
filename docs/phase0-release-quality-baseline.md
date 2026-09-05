# Phase 0 Release-Quality Baseline

## 1. Purpose

This document defines the minimum engineering baseline that later HRMS phases should preserve.

It is not a final production-readiness program.

It is the minimum quality contract that must stay true once Phase 0 is complete.

---

## 2. Required Checks

Every meaningful web or backend change should continue to pass:

- web lint
- web typecheck
- web build in CI
- mobile typecheck in CI
- Django system check
- backend smoke tests

Current baseline commands:

- `corepack pnpm --dir web lint`
- `corepack pnpm --dir web typecheck`
- `corepack pnpm --dir web build`
- `corepack pnpm --dir mobile typecheck`
- `DJANGO_DB_ENGINE=django.db.backends.sqlite3 python manage.py check`
- `pytest -q`

---

## 3. Access-Control Baseline

The following rules should not regress in later phases:

- HR admin API routes require `hr-admin` workspace role
- HR admin web routes are gated at the layout level
- ESS web entry requires authenticated session
- MSS web entry requires manager or workflow-approver-aware session gating
- manager approval actions remain scope-checked
- unauthenticated workspace API reads remain rejected

If a phase changes these rules, the permission docs and tests must be updated in the same phase.

---

## 4. Demo-Mode Baseline

The following rules should remain true:

- demo data is opt-in, not silent default behavior
- live API non-OK responses should not silently render demo state
- workspaces should show explicit failure UI for live-load problems
- demo mode should remain environment-driven unless a later product decision adds an explicit user-facing demo flow

---

## 5. Testing Baseline

At minimum, later phases should preserve smoke coverage for:

- auth login, session, and logout
- ESS request submission
- MSS approval success path
- MSS workflow-approver session access path
- HR admin access denial for ordinary employees
- unauthenticated workspace denial
- manager-scope denial for out-of-scope actions

Expected direction:

- Phase 1 should add admin CRUD and validation coverage
- Phase 2 should add policy enforcement coverage
- later phases should widen from smoke tests toward regression suites

---

## 6. Documentation Baseline

After each completed phase, update at least:

- `docs/hrms-execution-plan.md`
- `docs/hrms-first-completion-plan.md`
- `docs/hrms-phase-delivery-tracker.md`
- `docs/model-structure-and-relationships.md` when model relationships change materially

This is part of the quality baseline, not optional cleanup.

---

## 7. What Is Still Not Solved By Phase 0

Phase 0 does not mean:

- staging is fully defined
- observability is complete
- secrets management is mature
- release automation is final
- regression coverage is broad

Those remain later-phase maturity areas.

The Phase 0 baseline simply means the project now has a trustworthy minimum delivery floor.
