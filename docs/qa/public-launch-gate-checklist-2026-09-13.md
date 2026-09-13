# Public Launch Gate Checklist

Date: 2026-09-13  
Product: HRMS Payroll SaaS  
Primary command: `pnpm qa:public-launch-gate`  
Quick command: `pnpm qa:public-launch-gate:quick`

## Purpose

This checklist converts the public-launch readiness work into an executable gate with evidence.

The app is pilot-ready. Public launch needs repeatable proof that code, deployment health, browser-critical flows, operational checks, and manual business approvals are all in a known state.

## Gate Levels

| Gate | Owner | Automated | Public launch requirement |
| --- | --- | --- | --- |
| PLG-1 Code and migration safety | Engineering | Yes | Must pass |
| PLG-2 Deployment health | Engineering/Ops | Yes | Must pass |
| PLG-3 Browser-critical workflows | QA/Product | Yes | Must pass or formally waived |
| PLG-4 Payroll/provider readiness | Payroll/Ops | Partially | Must pass for enabled providers |
| PLG-5 Tenant/security boundary | Engineering/Security | Partially | Must pass |
| PLG-6 Backup/rollback/release retention | Ops | Partially | Must pass in target environment |
| PLG-7 Monitoring and alert delivery | Ops | Manual proof | Must pass before public launch |
| PLG-8 Commercial/legal/support signoff | Business | Manual proof | Must pass before public launch |

## Executable Gate

Run quick gate after small changes:

```bash
pnpm qa:public-launch-gate:quick
```

Run full gate before release candidate approval:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
HRMS_ENABLE_DEMO_DATA=false \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm qa:public-launch-gate
```

The runner writes evidence under:

```text
web/qa-artifacts/public-launch-gate-*/
```

Each run creates:

- `public-launch-gate-report.md`
- `public-launch-gate-report.json`
- `logs/` with command stdout/stderr

## Automated Checks

The public launch gate currently runs:

- Django system check.
- Django migration dry run.
- Backend `/api/v1/health/` regression test.
- Post-deploy smoke check against `/api/v1/health/`, `/`, and `/login`.
- Web TypeScript check.
- Web production build unless `--skip-web-build` is used.
- Critical Playwright browser pack unless `--skip-browser` is used.

Critical browser pack:

- `production-launch-release-gate.spec.ts`
- `pilot-credential-matrix-certification.spec.ts`
- `payroll-outputs-flows.spec.ts`
- `payroll-statutory-flows.spec.ts`
- `payroll-providers-flows.spec.ts`
- `tds-efile-package-certification.spec.ts`

## Manual Gates Still Required

These cannot be honestly closed by code alone:

- Real production AWS monitoring alert delivery.
- Production backup creation and restore rehearsal.
- Real provider contracts, sandbox keys, and credential ownership.
- Real statutory/e-file provider certification for enabled geographies.
- Security/legal/privacy review.
- Support staffing and escalation ownership.
- Customer onboarding checklist and owner approval.

## Launch Decision Rule

Public launch can proceed only when:

- `pnpm qa:public-launch-gate` passes in the target environment.
- Remaining manual gates are marked `Passed` or `Waived with owner/date/risk`.
- No `Critical` or `High` launch blockers are open.
- Disk usage is below `85%`; below `80%` preferred.
- Rollback release is retained and verified.
- Stakeholder acceptance pack is signed.

## Current Status

As of 2026-09-13:

- Controlled pilot confidence: `98%`.
- App-code public-launch confidence: `92-95%`.
- Overall public-launch confidence: `82-85%`, mostly held back by production infra, monitoring, provider procurement, and legal/support signoff.

## Next Use

After every release-candidate deployment:

1. Deploy commit.
2. Run `pnpm qa:post-deploy-smoke` on the host.
3. Run `pnpm qa:public-launch-gate`.
4. Attach `public-launch-gate-report.md` to the launch tracker.
5. Update public-launch confidence and open exceptions.
