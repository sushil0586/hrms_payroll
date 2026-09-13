# Pilot 100 Final Sign-Off

Date: 2026-09-13  
Environment: staging, `https://hrms.accerio.in`  
Certified commit: `1efce7e5dbf91867d6abbce2bf5288192608efb9`  
Primary tracker: `docs/qa/pilot-100-execution-tracker-2026-09-12.md`

## Decision

Status: `Pilot-ready with accepted limitations`

Confidence: 98% for a controlled staging pilot rehearsal / internal pilot run.

This is not yet a 100% unattended production-payroll launch sign-off. The remaining gaps are operational and external-provider gates, not core browser flow blockers.

## What Is Certified

- P100-0 through P100-16 have been executed or accepted with documented limitations.
- 1 organization / 100 employee payroll rehearsal data exists under the `PILOT100_20260912` identity.
- Organization masters, policy setup, payroll setup, 100-employee access matrix, attendance/leave/lifecycle inputs, payroll input snapshot/lock, calculation/review, adjustments, settlements, outputs, payslips, finance handoff, reporting, security/isolation, UX/performance, and release-gate evidence are browser-certified.
- Final staging release-gate rerun passed: `5/5`.
- Final P100 UX/performance staging rerun passed: `3/3`.
- Pilot credential matrix staging rerun passed: `10/10`.
- Backup/restore drill passed with scratch restore verification.
- Rollback and roll-forward drill passed with readiness-wait observation.
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

Initial result: `6/6` passed in `1.3m`.

Post-deploy result on commit `05fe1f583f55641d56fe973d13e48430445ef48d`: `6/6` passed in `1.2m`.

Expanded named finance/support result after seeding `payroll.finance` and `support.agent`: `10/10` passed in `2.2m`.

Post-deploy expanded named finance/support result on commit `1efce7e5dbf91867d6abbce2bf5288192608efb9`: `10/10` passed in `2.3m`.

## Accepted Limitations

- Mobile is certified for review/smoke usage, but dense payroll administration should be done on desktop.
- Staging deterministic cross-tenant object-pair mutation was intentionally not run to avoid extra staging tenant mutation; role/API/artifact isolation was certified on the active pilot tenant.
- Real external provider filing/payment rails are not production-certified by this run; provider rehearsal and finance handoff evidence are certified.
- Rollback runbook passed on staging, with a required readiness wait/retry after web restart.
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

1. Validate real provider credentials in a non-production rehearsal mode.
2. Review monitoring/log routine after the pilot rehearsal.
3. Review known limitations with pilot stakeholders.
4. Confirm retain/cleanup decision for `PILOT100_20260912`.

## Backup / Restore Evidence

- Backup file: `/var/backups/hrms-payroll-saas/hrms_stage_p100_20260913T084053Z.dump`.
- SHA-256: `38e4d3a03265d2b49277878da5d309e81ed6ff04d06e709f6f2356313bbbebfb`.
- Scratch DB restored and verified: `hrms_stage_restore_drill_20260913084114`.
- Scratch DB was dropped after verification.

## Rollback Evidence

- Rolled back from `/var/www/hrms-payroll-saas/release-20260913062101` at commit `1efce7e5dbf91867d6abbce2bf5288192608efb9`.
- Previous release used: `/var/www/hrms-payroll-saas/release-20260913060836` at commit `00110139cf13c788e8b736b2aebd0d608b8602f0`.
- Backend and web services were active after rollback and after roll-forward.
- Rolled forward to commit `1efce7e5dbf91867d6abbce2bf5288192608efb9`.
- `/login` and `/` returned HTTP `200` after an 8-second readiness wait.
- Operational note: immediate HTTP checks during restart may return `502`; use a readiness wait/retry loop before declaring rollback unhealthy.
