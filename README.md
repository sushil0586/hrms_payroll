# HRMS + Payroll SaaS

This workspace is for a configurable multi-tenant HRMS and payroll management platform designed to support different company sizes, industries, geographies, and payroll policies.

Start with the high-level plan in `docs/high-level-plan.md`.

## Workspace Layout

- `backend/`: Django + DRF backend
- `web/`: Next.js web app for admin, HR, and advanced operations
- `mobile/`: React Native ESS/MSS app for Android and iOS
- `packages/`: shared UI, config, and type packages for JS apps
- `docs/`: product, architecture, and planning documents
- `scripts/`: local automation and setup scripts

## Recommended Reading Order

1. `docs/hrms-prd.md`
2. `docs/tenant-permission-model.md`
3. `docs/configuration-blueprint.md`
4. `docs/django-project-architecture.md`
5. `docs/model-structure-and-relationships.md`
6. `docs/platform-policy-admin-and-delegation-design.md`
7. `docs/platform-policy-admin-schema-proposal.md`
8. `docs/platform-to-tenant-onboarding-flow.md`
9. `docs/tenant-onboarding-schema-and-api-proposal.md`
10. `docs/nexora-target-gap-analysis.md`
11. `docs/hrms-first-completion-plan.md`
12. `docs/hrms-phase-delivery-tracker.md`
13. `docs/phase0-permission-and-demo-review.md`
14. `docs/phase0-backend-decomposition-targets.md`
15. `docs/phase0-release-quality-baseline.md`
16. `docs/mobile-app-information-architecture.md`
17. `docs/ui-ux-modernization-strategy.md`
18. `docs/ui-ux-modernization-rollout-plan.md`
19. `docs/ui-ux-makeover-coverage-plan.md`
20. `docs/phase2-policy-execution-matrix.md`
21. `docs/leave-management-feature-summary.md`
22. `docs/attendance-management-feature-summary.md`
23. `docs/attendance-enhancement-handoff-2026-06-09.md`
24. `docs/playwright-browser-visual-testing-development-plan.md`
25. `docs/hrms-phase-wise-development-and-testing-plan.md`
26. `docs/hrms-long-term-phase-roadmap.md`

## Current Execution Tracker

Use `docs/hrms-execution-plan.md` as the live roadmap for:

- completed foundation
- pending HRMS modules
- technical gaps
- recommended delivery order

Use `docs/hrms-long-term-phase-roadmap.md` for the longer-horizon phase-wise plan after the current stabilization and completion work.
