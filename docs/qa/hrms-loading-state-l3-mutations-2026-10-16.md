# HRMS Loading State Phase L3: Mutations and Approvals

Date: 2026-10-16  
Decision: **CONDITIONAL**

Phase L3 establishes a reusable mutation-feedback contract and verifies the highest-risk representative workflows in all five portals. It does not complete all 46 interaction families, so application-wide loading certification is not claimed.

## Implemented

- Added `AsyncActionButton`: stable compact dimensions, operation-specific pending label, `aria-busy`, polite status announcement, duplicate-submit disabling, and reduced-motion-safe spinner.
- HR Admin employee create/edit now exposes `Creating employee` or `Saving changes` while preserving validation and server errors.
- ESS leave submission exposes `Submitting leave`; recoverable failures preserve dates, evidence, and reason.
- MSS approvals distinguish `Approving request` and `Rejecting request`; the opposite action is disabled while the decision is pending.
- Tenant Admin membership and role mutations use shared pending feedback, explicit duplicate guards, and `try/catch/finally`; network failures preserve dialog values and restore controls.
- Platform Admin tenant creation uses the shared pending control, while the console announces an active server mutation.
- Durable payroll actions use the shared control. Poll failures now report `Reconnecting` and retain the last confirmed job state instead of silently appearing current.

No API contract, payroll formula, entitlement, RBAC, tenant-scoping, or business-rule behavior changed.

## Measured Evidence

| Portal/workflow | Injected delay/result | Pending visible |
| --- | ---: | ---: |
| HR Admin employee save | 750 ms / 503 | 65 ms |
| ESS leave submit | 2,000 ms / 503 | 135 ms |
| MSS leave approval | 750 ms / 200 | 159 ms |
| Tenant Admin invite | 750 ms / 503 | 56 ms |
| Platform Admin tenant create | 2,000 ms / 503 | 125 ms |

Focused Playwright: **2 passed**. Duplicate request count was one in each guarded case. Error recovery, form preservation, accessible pending names, and backend-confirmed success were exercised. Production build, TypeScript, and focused ESLint passed.

## Tracker Reconciliation

The 46-family tracker now contains: 5 verified, 16 partial, 23 open, 1 covered, and 1 audited. L3 updated LS-011, LS-015, LS-021, LS-025, LS-029, LS-031, LS-038, LS-039, LS-044, and LS-045 with executed evidence.

Remaining P1 work includes lower-risk CRUD migrations, upload/download/export progress, policy assignment dependency loading, authentication/logout, report exports, provider operations, polling backoff/security responses, and the complete offline/timeout/403 matrix. The broad legacy neighboring suite also requires a database containing its documented Northstar identities; this is an environment fixture gap, not a confirmed product regression.

## Files Changed

- `web/src/components/patterns/async-action-button.tsx`
- `web/src/app/globals.css`
- `web/src/app/hr-admin/employees/employee-form.tsx`
- `web/src/app/ess/leave/leave-workspace.tsx`
- `web/src/app/mss/approvals/manager-decision-panel.tsx`
- `web/src/app/tenant-admin/tenant-membership-actions.tsx`
- `web/src/app/tenant-admin/tenant-role-actions.tsx`
- `web/src/app/platform-admin/platform-admin-console.tsx`
- `web/src/app/hr-admin/payroll-close-actions-panel.tsx`
- `web/tests/e2e/mutation-loading-feedback.spec.ts`
- `docs/qa/hrms-loading-state-coverage.csv`

Evidence: `docs/qa/evidence/loading-state-l3/001-phase-l3-execution-log.md`.

## Decision

**CONDITIONAL.** The implemented priority mutation families meet the L3 feedback, duplicate-prevention, recovery, accessibility, and compact-layout requirements. The unresolved tracker families remain explicit and prevent an application-wide PASS. The frozen 963 functional-case inventory was preserved and no production or staging environment was changed.
