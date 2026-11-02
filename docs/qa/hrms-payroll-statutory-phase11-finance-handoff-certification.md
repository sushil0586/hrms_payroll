# HRMS Payroll Statutory Phase 11 Finance Handoff Certification

Date: 2 November 2026

Environment: task-owned PostgreSQL 16, Redis, Celery worker and Beat, Django, and production-built Next.js

Verdict: PASS for generated finance handoff integrity and Finance Manager review; transmission remains outside scope

## Scope

This phase verifies the boundary from a published, sealed payroll output batch to generated bank advice, accounting export, and statutory report artifacts. All identities and records were synthetic and tenant-scoped.

Excluded: provider transmission, bank upload, payment, statutory filing, shared staging, and production.

## Controls verified

- Generation locks and revalidates the published output batch and its sealed source artifacts.
- The handoff retains the calculation-evidence hash, canonical source-artifact manifest, and manifest SHA-256.
- Each finance artifact retains matching evidence references, a 64-character source hash, and a 64-character file checksum.
- Bank-advice total reconciles to handoff net pay.
- A Payroll Finance Manager with simultaneous manager and employee roles receives permission-filtered HR workspace access.
- An ordinary manager remains outside that workspace, and an ESS identity receives a tenant-scoped API denial.
- The Finance page displays the transmit action, but the certified browser flow does not invoke it.
- The final PostgreSQL state contains three generated finance artifacts and zero provider deliveries.

## Defects closed

1. The workspace calculator allowed employee or manager roles to veto an explicitly assigned Payroll Finance Manager role. Finance-role precedence now grants the HR shell while page and API access remain permission-filtered.
2. The frontend lacked the authenticated proxy route for finance-handoff setup. The new route mirrors adjacent payroll setup proxies and delegates authorization to Django.

## Results

| Verification | Result |
| --- | --- |
| Production-build Playwright | 1 passed, 1 worker, 23.2 seconds |
| Mixed-role workspace regression | 2 passed on PostgreSQL |
| Existing focused handoff generation regression | 1 passed on PostgreSQL |
| Finance artifacts | 3 generated: bank advice, accounting export, statutory report |
| Evidence linkage and checksums | Passed |
| Bank/net reconciliation | Passed |
| Finance Manager browser access | Passed |
| ESS API denial | Passed |
| Provider deliveries after certified flow | 0 |
| TypeScript and focused ESLint | Passed |
| Django checks and migration drift | Passed; no changes detected |
| Production frontend build | Passed |

The production build retained the pre-existing Autoprefixer warning at `globals.css:4677`, recommending `flex-end` instead of `end`.

## Regression note

The existing backend handoff regression includes an isolated synthetic provider lifecycle and passed before the final browser certification. It did not contact an external provider. The authoritative Phase 11 browser and PostgreSQL evidence stops at generated status with zero delivery rows.

## Stop boundary

The generated handoff is eligible for a separately governed transmission phase. This report does not authorize or claim provider delivery, bank-file use, employee payment, statutory filing, shared-staging mutation, or production operation.

## Cleanup

The governed exact-seed cleanup was run with private-file deletion confirmation. Task-owned processes, containers, temporary fixtures, and Playwright artifacts were removed after verification.
