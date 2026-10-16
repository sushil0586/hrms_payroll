# Docker UI Responsiveness and Workflow Reliability Closure

Date: 2026-10-16  
Environment: production-built local Docker, synthetic PostgreSQL/Redis data only  
Decision: **CONDITIONAL**

## Scope and baseline

This closure preserves the frozen Phase 3 inventory of 963 cases (957 passed, 6 justified skips). It does not replace or recalculate that baseline. The work addressed the 15 fixture-limited Docker UI scenarios from the initial responsiveness audit and focused asynchronous feedback and backend workflow reliability.

## Results

| Evidence set | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fixture-limited browser scenarios (unique) | 15 | 0 | 0 | 0 | 0 |
| Focused async/reduced-motion browser checks | 2 | 0 | 0 | 0 | 0 |
| Disposable fixture command tests | 3 | 0 | 0 | 0 | 0 |
| Payroll/attendance/leave/onboarding backend tests | 103 | 0 | 0 | 0 | 0 |

Historical evidence is retained: the first browser rerun produced 6 passes and 9 failures. Eight failures were deterministic tenant-selection drift or disabled-control ordering; the ninth needed an unprovisioned platform contact. All nine passed on focused rerun.

## Fixture closure

`manage_playwright_workspace` now provisions owned, deterministic prerequisites for document categories, statutory profiles/declarations, statutory packs/components, a locked payroll input snapshot, pending manager queues, and platform onboarding/admin-contact/template records.

The manifest exposes fixture IDs and nine integrity checks. Cleanup handles protected payroll/statutory relations in dependency order and removes the global policy pack only when its ownership marker matches. Final database verification returned tenant `0`, users `0`, and policy pack `0`.

## Root causes and fixes

1. **Fixture incompleteness**: valid UI controls were disabled because required parent or queue records did not exist. Fixed in the supported disposable workspace command.
2. **Platform tenant selection drift**: live validation tests silently selected the demo tenant ID. The shared navigation helper now accepts `PLAYWRIGHT_PLATFORM_TENANT_ID` and carries it through platform routes.
3. **Disabled payroll output field ordering**: the test tried to fill a disabled handoff profile before checking eligibility. It now verifies the disabled field and no mutation when unavailable, retaining the original validation branch for eligible batches.
4. **PostgreSQL leave approval defect**: `SELECT FOR UPDATE` attempted to lock nullable joined rows during leave-balance review. The lock is scoped to the transaction row with `of=("self",)`, preserving concurrency protection. Both reproductions and all 103 focused backend tests pass.

## Async and UX evidence

The delayed-request browser check measured a 750 ms backend delay, 66 ms feedback latency, zero duplicate mutation requests, and zero width/height shift. Failure recovery restored the action and retry succeeded. Reduced-motion behavior passed. Shared loading boundaries cover all five portals without changing compact layouts.

No fake percentage or timer-based completion state was introduced. PostgreSQL, Redis, Celery worker/beat, provider workers, backend, and web were healthy during execution.

## Commands and evidence

```text
docker compose --env-file .env.production -p hrms-ui-closure -f docker-compose.production.yml -f docker-compose.ui-closure.yml --profile release up -d --build ...
pnpm --dir web exec playwright test ... --workers=1
pnpm --dir web typecheck
pnpm --dir web build
docker compose ... exec -T backend python manage.py test apps.payroll.tests apps.attendance.tests apps.leave_management.tests apps.tenant_onboarding.tests
docker compose ... exec -T backend python manage.py manage_playwright_workspace --seed-ref ui-closure-20261016 --cleanup
```

Evidence is under `docs/qa/evidence/docker-ui-smoothness/002` through `018`. Key logs are `007`, `008`, `009`, `010`, `012`, `014`, `015`, `016`, and `017`.

## Remaining gates

- Execute real long-running payroll generation, report/export, bulk import, provider retry, and onboarding jobs in production-like staging with external integrations enabled. Local validation did not prove every job-progress surface.
- Validate HTTPS/security headers, production storage/download controls, and email/provider delivery in staging.
- Preserve the six existing justified Phase 3 skips until their prerequisites or risk acceptance changes.
- Reconcile the existing CSS autoprefixer `align-items: end` warning separately; the production build succeeds.

The Docker closure is **CONDITIONAL**: all formerly fixture-limited scenarios and focused regressions are green, cleanup is proven, and one genuine PostgreSQL defect is fixed. This is not production certification.
