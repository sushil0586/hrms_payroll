# Pilot 100 Final Sign-Off

Date: 2026-09-13  
Environment: staging, `https://hrms.accerio.in`  
Certified commit: `e5c075e35a070662af7166a53cc11947b51585bb`  
Primary tracker: `docs/qa/pilot-100-execution-tracker-2026-09-12.md`

## Decision

Status: `Pilot-ready with accepted limitations`

Confidence: 95% for a controlled staging pilot rehearsal / internal pilot run.

This is not yet a 100% unattended production-payroll launch sign-off. The remaining gaps are operational and external-provider gates, not core browser flow blockers.

## What Is Certified

- P100-0 through P100-14 have been executed or accepted with documented limitations.
- 1 organization / 100 employee payroll rehearsal data exists under the `PILOT100_20260912` identity.
- Organization masters, policy setup, payroll setup, 100-employee access matrix, attendance/leave/lifecycle inputs, payroll input snapshot/lock, calculation/review, adjustments, settlements, outputs, payslips, finance handoff, reporting, security/isolation, UX/performance, and release-gate evidence are browser-certified.
- Final staging release-gate rerun passed: `5/5`.
- Final P100 UX/performance staging rerun passed: `3/3`.
- Pilot credential matrix staging rerun passed: `6/6`.
- Backend and frontend staging services were active at final verification.

## Evidence Commands

P100 UX/performance staging:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 pnpm --dir web exec playwright test tests/e2e/pilot-100-ux-performance-certification.spec.ts --project=chromium
```

Result: `3/3` passed in `7.3m`.

Production launch release gate staging:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/production-launch-release-gate.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000
```

Result: `5/5` passed in `1.9m`.

Pilot credential matrix staging:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/pilot-credential-matrix-certification.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000
```

Result: `6/6` passed in `1.3m`.

## Accepted Limitations

- Mobile is certified for review/smoke usage, but dense payroll administration should be done on desktop.
- Staging deterministic cross-tenant object-pair mutation was intentionally not run to avoid extra staging tenant mutation; role/API/artifact isolation was certified on the active pilot tenant.
- Real external provider filing/payment rails are not production-certified by this run; provider rehearsal and finance handoff evidence are certified.
- Backup/restore and rollback runbooks still require an operations drill before customer-facing production payroll.
- Payroll finance manager and support-agent need separate named business users before external pilot. Current finance/support flows are certified through existing HR/platform/admin personas.
- Customer acceptance sign-off remains a business readiness task.

## Retention Decision

Do not run cleanup yet.

Retain:

- `PILOT100_20260912` pilot data.
- Payroll outputs, payslips, handoff evidence, compliance exports, and audit rows.
- Playwright screenshots/videos/test outputs under `web/test-results`.
- Tracker and sign-off documents.

Cleanup should run only after stakeholder review confirms the evidence pack is no longer needed.

## Next Required Gates

1. Create separate named payroll finance manager and support-agent users.
2. Rerun P100-14 after those users exist.
3. Run backup/restore and rollback drills.
4. Validate real provider credentials in a non-production rehearsal mode.
5. Review known limitations with pilot stakeholders.
6. Confirm retain/cleanup decision for `PILOT100_20260912`.
