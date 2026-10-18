# RG-3B Evidence Index

Date: 2026-10-18

## Outcomes

- RG-3B production-built Playwright: final strict non-persistence run 1 passed in 30.3 seconds; preceding corrected run 1 passed in 26.8 seconds; 1 earlier automation-verification failure retained.
- Neighboring DD-7 Playwright: 2 passed.
- Focused RG-3B API/PostgreSQL: 9 passed.
- Integrated lifecycle/workflow/organization PostgreSQL: 18 passed.
- Subscription/entitlement regression: 2 passed.
- TypeScript, focused ESLint, Django checks, migration drift, production frontend build, and backend production Docker image build: passed.

## Browser Artifacts

Playwright generated run artifacts under `web/test-results/` during execution. The successful RG-3B test attached `rg3b-workflow-safe-restrictions.json`; failure trace and screenshot from the corrected 405 verification mismatch were retained for the run and were not counted as passing evidence.

## Isolation And Cleanup

All browser cases used `provisionIsolatedQaWorkspace` and ownership-verified cleanup. The final PostgreSQL query returned `0` sandbox tenants. The local API and frontend processes were stopped, and the temporary `hrms-rg3b-postgres` container and `hrms-rg3b-backend-check` image were removed. No Northstar, staging, production, or customer records were accessed.
