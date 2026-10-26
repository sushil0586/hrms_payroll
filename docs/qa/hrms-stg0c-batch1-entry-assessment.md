# STG-0C Batch-1 Entry Assessment

Date: 2026-10-26
Scope: `STG-E2E-0101` through `STG-E2E-0106`
Execution: not authorized and not started

## Shared Entry Requirements

- Batch 0 deployed provenance, service health, migration and dependency checks complete for the run.
- Approved unique run ID and tenant code `pw-qa-stage-lifecycle-<run>`.
- Platform Admin identity authorized for synthetic tenant operations.
- Synthetic Tenant Admin address and password delivered through an approved secure channel.
- PostgreSQL read-only evidence access and ownership/baseline queries.
- One Playwright worker and trace-on-failure.
- `manage_playwright_workspace --hydrate-existing` only after browser creation.
- Cleanup command and ownership manifest reviewed before mutation.
- Stop immediately on duplicate tenant, identity collision, unauthorized platform access or baseline-tenant mutation.

## Per-ID Decision

| ID | Decision | Automation and evidence assessment | Missing prerequisite |
|---|---|---|---|
| `0101` | REQUIRES REVIEW | Browser tenant creation and API ID capture exist. PostgreSQL ownership/audit assertion and exact cleanup manifest are independently available but not wired into one staging case. No Celery dependency. | Commit/mapping freeze, Batch 0 completion, approved run/persona manifest |
| `0102` | BLOCKED | The cited onboarding test does not submit a duplicate code or prove database count remains one. This is a P0 uniqueness assertion. | Dedicated browser/API duplicate attempt plus PostgreSQL absence/count assertion |
| `0103` | BLOCKED | Duplicate administrator email behavior lacks a dedicated browser test and identity/membership absence query. | Explicit fixture email and no-duplicate user/membership/audit assertions |
| `0104` | REQUIRES REVIEW | Browser activation exists and checks active/enterprise response, but detailed entitlement persistence and audit assertions are not in the cited test. | Add entitlement/API/PostgreSQL/audit verification; requires `0101` tenant ID |
| `0105` | BLOCKED | First Tenant Admin provisioning and first-login routing are not demonstrated by the cited creation test. Email delivery must use only approved synthetic recipient or a secure direct credential fixture. | Dedicated provisioning, membership/role, login and route assertions |
| `0106` | BLOCKED | General employee denial coverage exists elsewhere, but no source-validated test specifically denies tenant list/create to a non-platform identity and proves no row/audit side effect. | Dedicated negative browser/API test and PostgreSQL no-write assertion |

## Rollback And Cleanup

Do not delete by guessed tenant code. Persist exact tenant/user/subscription/audit IDs in the ownership manifest. On failure, stop the batch, audit owned rows, then use the ownership-verified workspace cleanup path. Verify the tenant, memberships and child records are absent while shared tenant counts/checksums remain unchanged.

## Assessment

Batch 1 is **not authorized for execution**. `0101` and `0104` are near-ready but require review/final wiring; `0102`, `0103`, `0105` and `0106` are blocked by scenario-specific automation/evidence gaps. The provider, payroll-storage and worker-interruption blockers do not independently prevent these onboarding tests.
