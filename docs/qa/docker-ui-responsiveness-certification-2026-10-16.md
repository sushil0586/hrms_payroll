# Docker UI Responsiveness and Feedback Certification

> Follow-up closure: the 15 fixture-limited cases are now 15 passed, 0 failed/blocked/skipped/not-run. See `docs/qa/docker-ui-workflow-reliability-closure-2026-10-16.md`. Certification remains **CONDITIONAL** for staging-only long-running integration evidence.

Date: 2026-10-16  
Decision: **CONDITIONAL**  
Environment: production-built local Docker only

## Executive Result

All five portals now have stable, accessible route-loading boundaries. A confirmed Platform Admin failure-state defect and a pending-label layout shift were fixed. Focused Docker Playwright evidence proves immediate feedback, duplicate-submit prevention, recovery after a failed request, preserved form input, successful retry, zero action-row size shift, accessible live feedback, keyboard-accessible portal shells, mobile/desktop layout integrity, and reduced-motion behavior.

The decision is conditional because this was targeted certification, not a rerun of all 963 tests, and the minimal disposable workspace did not contain every state needed by 15 neighboring validation cases. Long-running payroll/provider job progress and every screen-level async branch were not exercised end to end.

## Screen-Wise Audit

| Portal | Audited areas | Feedback assessment | Outcome |
| --- | --- | --- | --- |
| HR Admin | Navigation shell, employee forms/access, documents, attendance/leave surfaces, payroll setup/input/provider/statutory/output/adjustment/settlement validation | Existing forms commonly disable pending actions and change labels. Shared route skeleton added. Search selector already rejects stale responses by request ID. Several deep workflows need richer fixture states for complete Docker proof. | CONDITIONAL |
| ESS | Leave, attendance, payslips, documents, statutory declarations, notifications | Existing submit/upload/read actions expose pending labels and notifications. Shared route skeleton and reduced-motion behavior added. Leave validation passed; statutory prerequisite and attendance fixture gaps remain. | CONDITIONAL |
| MSS | Approvals and notifications | Approval controls already lock duplicate submissions and use toast feedback. Shared route skeleton added. Shell passed; review-note cases lacked eligible queue records. | CONDITIONAL |
| Tenant Admin | Members, roles, support access, change requests, navigation | Four validation workflows passed. Existing row/action busy states prevent duplicates. Shared route skeleton added. Network-exception recovery across every action still needs dedicated failure injection. | PASS for tested scope |
| Platform Admin | Tenant creation, leads, onboarding, admin access, setup templates, audit navigation | Tenant creation now clears busy state in `finally`, announces busy state, shows actionable network errors, preserves input, retries successfully, and holds button dimensions. Shared route skeleton added. Other panels need richer onboarding fixtures. | PASS for remediated scenario; CONDITIONAL overall |

## Reusable Improvements

- `WorkspaceLoading`: one compact skeleton used by HR Admin, ESS, MSS, Tenant Admin, and Platform Admin, with `role=status`, `aria-busy`, screen-reader text, and decorative regions hidden.
- `button--pending-stable`: reserves action width while status text changes.
- `ActionToast`: now uses `aria-atomic=true` so complete feedback is announced.
- Reduced-motion CSS disables loading shimmer and shortens UI transitions without replacing feedback.
- Platform Admin main landmark exposes `aria-busy` during mutations.
- Platform mutation cleanup now uses `finally`; network exceptions no longer strand controls.

## Defects Resolved

| Defect | Root cause | Fix | Verification |
| --- | --- | --- | --- |
| Platform controls remain disabled after network failure | Busy reset executed only after a successful `fetch`/JSON path | Moved reset to `finally` | Failed request recovered; retry button enabled |
| Raw “Failed to fetch” shown to user | Browser exception was displayed directly | Added workflow-specific network error normalization | Actionable alert displayed while server details remain preserved |
| Tenant-create action row shifts while pending | Pending and idle labels had different intrinsic widths | Added reusable stable pending width | 22.3125 px before, 0 px after |
| Four portals lacked route loading UI | Only HR Admin had a loading boundary | Centralized skeleton and added four boundaries | Production build plus five-portal shell/reduced-motion checks |
| Toast could announce partial updates | Live region was not atomic | Added `aria-atomic=true` | DOM/type/build verification |

## Performance Evidence

With an intercepted 750 ms request delay:

- Pending feedback appeared in **156 ms**.
- Duplicate requests: **0**.
- Button width shift: **22.3125 px before**, **0 px after**.
- Button height shift: **0 px after**.
- UI remained usable outside the scoped action; no full-screen loader was introduced.
- Failure restored the action and retained both form values.
- The next attempt completed successfully.

These figures are local measurements and are not production latency claims.

## Modified Files

- `web/src/components/patterns/workspace-loading.tsx`
- `web/src/components/patterns/action-toast.tsx`
- `web/src/app/hr-admin/loading.tsx`
- `web/src/app/ess/loading.tsx`
- `web/src/app/mss/loading.tsx`
- `web/src/app/tenant-admin/loading.tsx`
- `web/src/app/platform-admin/loading.tsx`
- `web/src/app/platform-admin/platform-admin-console.tsx`
- `web/src/app/globals.css`
- `web/tests/e2e/platform-admin-frontend-validation.spec.ts`
- `web/tests/e2e/workspace-loading-feedback.spec.ts`

## Remaining Risks

1. Production Compose has no TLS terminator; its internal HTTP API URL conflicts with Django HTTPS redirect. The temporary local UI override is not a deployable security solution.
2. Only 3 of 103 client-fetching component files use `AbortController`; some use request IDs instead, but a complete stale-response audit remains open.
3. Long-running payroll calculation, publication, finance handoff, imports/exports, and provider jobs require genuine job-state fixtures to verify progress, cancellation, retry, and completion messaging without invented percentages.
4. Fifteen neighboring cases require richer deterministic fixture provisioning before their UI states can be certified in this Docker workspace.
5. The frozen 963-test Phase 3 result was preserved, not rerun. No claim is made that these focused checks replace it.

## Evidence

Detailed commands, measurements, and batch outcomes: [Docker UI feedback evidence](evidence/docker-ui-smoothness/001-docker-ui-feedback-evidence-2026-10-16.md).

## Decision

**CONDITIONAL PASS for Docker UI responsiveness improvements.** The confirmed defects are resolved and focused cross-portal checks pass. Full smoothness certification requires the remaining fixture-backed workflows, long-running job states, stale-response inventory, and production-equivalent TLS topology. This does not change the Phase 3 regression baseline or certify production readiness.
