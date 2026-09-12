# Payroll Pilot Pendencies And Phase Plan

Generated: 2026-09-12  
Owner: HRMS Payroll SaaS QA / Delivery  
Current pilot readiness estimate: 87%  
Current local build certified through: R5-G Payroll Finance Handoff Exception Report  
Current staging build certified through: R5-E Payroll Close Readiness  

## Purpose

This is the living pilot-readiness tracker for the HRMS Payroll SaaS product. Update this document after every local certification run, staging deployment, staging certification run, or pilot-data rehearsal.

The goal is to keep the remaining work visible at a granular level and make the pilot decision evidence-based instead of feeling-based.

## Current Position

Already certified on staging:

- R5-C Payroll Adjustments Report.
- R5-D Payroll Settlements Report.
- R5-E Payroll Close Readiness Report.
- R5-F Payslip Publication And Acknowledgement Report certified locally.
- R5-G Payroll Finance Handoff Exception Report certified locally.
- Report catalog includes the new payroll reports.
- Export audit history captures CSV and manifest evidence.
- HR admin positive flows and employee denial flows passed for the latest focused report pack.

Latest staging evidence:

- Date: 2026-09-12.
- Commit: `09fcb8b0c8d357d639ee07d93a0b4abbe049b3c4`.
- Test pack: settlements, close readiness, report catalog, export audit history.
- Result: `8/8 passed`.
- Staging services: backend active, web active.

Latest local evidence:

- Date: 2026-09-12.
- Test pack: payslip publication, finance handoff exceptions, report catalog, export audit history.
- Commands:
  - `pnpm --dir web exec tsc --noEmit`
  - `PLAYWRIGHT_PORT=3000 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/payslip-publication-report-certification.spec.ts --workers=1 --reporter=line --timeout=520000`
  - `PLAYWRIGHT_PORT=3000 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/finance-handoff-exceptions-report-certification.spec.ts --workers=1 --reporter=line --timeout=520000`
  - `PLAYWRIGHT_PORT=3000 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/reporting-foundation-certification.spec.ts tests/e2e/compliance-export-audit-history-certification.spec.ts --workers=1 --reporter=line --timeout=720000`
- Result: TypeScript passed, R5-F focused Playwright `2/2 passed`, R5-G focused Playwright `2/2 passed`, catalog/audit regression `4/4 passed`.

## Pilot Readiness Summary

| Area | Current Confidence | Status | Notes |
|---|---:|---|---|
| Report framework and export audit governance | 92% | Strong | CSV, manifest, checksum, source endpoints, evidence columns, and audit history are repeatedly certified. |
| Payroll setup-to-close visibility | 88% | Strong | Inputs, review exceptions, adjustments, settlements, and close readiness are now visible through reports. |
| Payroll output and payslip visibility | 84% | Strong locally | Payslip publication report now covers published state, acknowledgement, signed URL/download/revocation/expiry counters, and source hash evidence locally; staging deployment still pending. |
| Finance handoff exception visibility | 87% | Strong locally | Finance handoff exception report now covers delivery status, retries, callbacks, queue jobs, blocker category, risk, audit-pack readiness, and source evidence locally; staging deployment still pending. |
| Full local regression after latest reports | 82% | Pending | Focused packs and catalog/audit regression pass; full report pack should be rerun before staging sign-off. |
| Staging pilot-data rehearsal | 65% | Pending | Needs realistic tenant/payroll run with seeded or real pilot data. |
| Operational pilot readiness | 70% | Pending | Backup, restore, rollback, monitoring, credentials, and support runbook need final rehearsal. |

Overall pilot readiness: 87%.

## Open Pendencies

### P0: Pilot Blockers

These must be done before any customer-facing pilot payroll run.

| ID | Pendency | Owner | Status | Exit Criteria |
|---|---|---|---|---|
| P0-1 | Payslip publication and acknowledgement report | Engineering / QA | Done locally | HR admin can see published payslips, employee read acknowledgement, downloads, signed URL grants, revoked/expired access, and failed access events. Staging deployment/certification pending under P0-4. |
| P0-2 | Payroll finance handoff exception report | Engineering / QA | Done locally | HR admin / finance manager can see failed, queued, retried, transmitted, acknowledged, and audit-pack-ready handoff exceptions. Staging deployment/certification pending under P0-4. |
| P0-3 | Full report regression after R5-F/R5-G | QA | Pending | Full local report/compliance Playwright pack passes with all current report specs. |
| P0-4 | Staging certification after final payroll report slice | QA | Pending | Focused staging pack and relevant regression pack pass on `https://hrms.accerio.in`. |
| P0-5 | Pilot payroll rehearsal with realistic data | Delivery / QA | Pending | One tenant can run payroll from configured master data through inputs, review, close readiness, output, payslip publication, and finance handoff. |

### P1: Strongly Recommended Before Pilot

| ID | Pendency | Status | Exit Criteria |
|---|---|---|---|
| P1-1 | Pilot user credential and role matrix | Pending | Named pilot users mapped to platform admin, HR admin, finance manager, manager, employee, and support roles. |
| P1-2 | Pilot known limitations list | Pending | Business-facing document lists accepted gaps and non-pilot features. |
| P1-3 | Backup and restore drill | Pending | Backup can be taken and restored in a verified environment. |
| P1-4 | Rollback rehearsal | Pending | Previous release can be restored and services verified. |
| P1-5 | Monitoring and log review routine | Pending | Basic web/backend service logs and error patterns are reviewed after test payroll run. |

### P2: Can Follow Pilot Start

| ID | Pendency | Status | Exit Criteria |
|---|---|---|---|
| P2-1 | Larger data-volume performance run | Pending | Pilot-scale and 2x pilot-scale data runs complete within acceptable time. |
| P2-2 | Cross-browser spot check | Pending | Chrome primary certified; Safari/Firefox smoke checks pass for core pilot pages. |
| P2-3 | Finance export format refinement | Pending | Finance confirms CSV/manifest fields are sufficient or accepts backlog items. |

## Phase Plan

### Phase R5-F: Payslip Publication And Acknowledgement Report

Goal:

Prove payroll outputs are not only generated but safely published, accessed, acknowledged, and audited.

Scope:

- Add `/hr-admin/reports/payslip-publication`.
- Source payroll output setup and artifact access summaries.
- Include payslip artifact status, employee, run, publication timestamp, notification count, signed URL issued count, download count, read acknowledgement count, revoked/expired grant counts, latest download/read timestamp, checksum, storage provider, and source hash.
- CSV and manifest export.
- Export audit history integration.
- HR admin positive browser certification.
- Employee denial browser certification for HR admin route/API.

Done Gate:

- TypeScript passes. Done on 2026-09-12.
- Dedicated Playwright spec passes. Done on 2026-09-12 with `2/2 passed`.
- Report catalog spec passes. Done on 2026-09-12 inside catalog/audit pack.
- Export audit history spec passes. Done on 2026-09-12 inside catalog/audit pack.
- QA plan updated. Done on 2026-09-12.

Confidence after phase: 84%.

### Phase R5-G: Payroll Finance Handoff Exception Report

Goal:

Prove finance can identify and act on failed or incomplete payroll handoff states.

Scope:

- Add `/hr-admin/reports/finance-handoff-exceptions`.
- Source finance handoff setup, bank advice, provider deliveries, and audit-pack evidence.
- Include handoff status, bank advice status, provider delivery state, retry count, acknowledgement timestamp, reconciliation state, audit pack availability, blocker category, risk, and source hash.
- CSV and manifest export.
- Export audit history integration.
- HR admin / payroll finance browser certification.
- Employee denial browser certification.

Done Gate:

- TypeScript passes. Done on 2026-09-12.
- Dedicated Playwright spec passes. Done on 2026-09-12 with `2/2 passed`.
- Report catalog spec passes. Done on 2026-09-12 inside catalog/audit pack.
- Export audit history spec passes. Done on 2026-09-12 inside catalog/audit pack.
- QA plan updated. Done on 2026-09-12.

Confidence after phase: 87%.

### Phase R5-H: Full Reporting Regression

Goal:

Prove the reporting system remains stable after all pilot-critical payroll reports are added.

Scope:

- Run full reporting/compliance Playwright pack locally.
- Include all payroll finance, HR core, attendance, compliance, lifecycle, export manifest, and audit-history report specs.
- Validate no generated file churn remains.
- Update QA plan with total passing count.

Done Gate:

- Full local report/compliance pack passes.
- Any flaky timeout is rerun and classified with evidence.
- `git status` contains only intended changes before check-in.

Confidence target after phase: 89%.

### Phase R5-I: Staging Deployment And Focused Certification

Goal:

Prove latest report stack is live and route manifest is current on staging.

Scope:

- Deploy latest checked-in `main`.
- Confirm deployed commit.
- Confirm backend and web services active.
- Rebuild/restart web if route manifest does not include new pages.
- Run focused staging report certification pack.
- Confirm disk capacity.

Done Gate:

- Deployed commit matches `origin/main`.
- Services active.
- Route manifest includes new report pages.
- Focused staging Playwright pack passes.

Confidence target after phase: 90%.

### Phase P1: Pilot Tenant And Data Rehearsal

Goal:

Prove a realistic tenant can complete one payroll cycle through the SaaS workflow.

Scope:

- Create or select pilot tenant.
- Configure organization masters.
- Configure leave/attendance policies.
- Configure salary components, structures, assignments, pay group, payroll period, and payroll run.
- Add realistic employee set.
- Collect/lock payroll inputs.
- Run calculation.
- Review exceptions.
- Apply adjustments and settlements where needed.
- Certify close readiness.
- Generate outputs.
- Publish payslips.
- Review finance handoff.
- Export reports and manifests.

Done Gate:

- One complete payroll run reaches output/payslip/handoff stage.
- No unresolved P0 blockers remain.
- Pilot sign-off notes recorded.

Confidence target after phase: 93%.

### Phase P2: Operational Readiness Rehearsal

Goal:

Prove support and operations can handle the pilot safely.

Scope:

- Backup drill.
- Restore drill.
- Rollback drill.
- Credential matrix.
- Support escalation path.
- Log review.
- Known limitations.
- Pilot go/no-go checklist.

Done Gate:

- Operations checklist signed off.
- Pilot users and roles confirmed.
- Rollback and restore are documented.

Confidence target after phase: 95%.

## Update Log

| Date | Phase | Environment | Evidence | Result | Confidence |
|---|---|---|---|---|---:|
| 2026-09-12 | R5-D/R5-E staging certification | Staging | Settlements, close readiness, report catalog, export audit history | `8/8 passed` | 80% |
| 2026-09-12 | R5-F payslip publication certification | Local with live staging API | TypeScript, payslip publication, report catalog, export audit history | `tsc passed`; `2/2 passed`; `4/4 passed` | 84% |
| 2026-09-12 | R5-G finance handoff exception certification | Local with live staging API | TypeScript, finance handoff exceptions, report catalog, export audit history | `tsc passed`; `2/2 passed`; `4/4 passed` | 87% |

## Update Protocol

After each run, update:

- Current Position.
- Pilot Readiness Summary.
- Open Pendencies status.
- The specific phase Done Gate.
- Update Log with date, environment, command/test pack, result, and confidence.

If a run fails:

- Record the failure.
- Classify as product defect, environment/deploy issue, test fragility, or data gap.
- Add a remediation item under Open Pendencies.
- Do not raise confidence until rerun evidence passes.
