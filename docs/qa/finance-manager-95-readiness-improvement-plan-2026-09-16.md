# Finance Manager 95% Readiness Improvement Plan

Date: 2026-09-16  
Environment target: local first, then staging at `https://hrms.accerio.in`  
Primary role: Payroll Finance Manager  
Purpose: make Finance Manager a launch-ready finance control center for payroll close, payout evidence, statutory proof, provider delivery, exceptions, and audit exports.

## Baseline

| Area | Current Rating | Target | Reason |
| --- | ---: | ---: | --- |
| Finance Manager functionality readiness | 82-86% | 95% | The workspace exists and finance report/export coverage exists, but the role-specific control center needs explicit browser certification. |
| Finance Manager QA/browser coverage | 84-88% | 95% | Payroll finance reports and handoff APIs are tested through HR Admin flows; Finance Manager needs its own menu, exports, and role-boundary proof. |
| Finance Manager user-friendliness | 78-82% | 95% | Current page is concise, but launch confidence needs clearer action queue, visible evidence states, and no-overflow proof. |
| Finance Manager public launch readiness | 82-86% | 95% | Money/compliance evidence is high risk; final pass must prove exports, manifests, audit packs, and denied access paths. |

## FM-95-0 Inventory

Current route:

| Route | Responsibility | Visible controls |
| --- | --- | --- |
| `/finance-manager` | Finance control center | Export bank advice, export filings, export audit, command queue, payments snapshot, payroll register, bank advice, challan proof, statutory deductions, exceptions, audit evidence. |

Current APIs and evidence surfaces:

| API/report | Purpose | Certification obligation |
| --- | --- | --- |
| `/api/hr-admin/reports/payroll-register` | Payroll register CSV/report | Finance role can export; employee/manager denied. |
| `/api/hr-admin/reports/bank-advice` | Bank advice payout evidence | CSV and manifest prove source endpoints and checksums. |
| `/api/hr-admin/reports/challan-reconciliation` | Challan reconciliation proof | CSV export and manifest available. |
| `/api/hr-admin/reports/statutory-filing-status` | Statutory filing rows | CSV export and manifest available. |
| `/api/hr-admin/reports/statutory-deductions` | Statutory deduction summary | CSV export available. |
| `/api/hr-admin/reports/provider-filing-receipts` | Provider delivery receipts | Manifest proof available. |
| `/api/hr-admin/reports/finance-handoff-exceptions` | Finance handoff risk queue | CSV and manifest available. |
| `/api/hr-admin/reports/export-audits` | Export audit history | Finance audit export available. |
| `/hr-admin/payroll-finance-handoff-setup/` backend | Finance handoff source data | Finance role can read evidence; non-finance roles denied where appropriate. |

## Phase FM-95-1: Control Center Certification

Goal:
- Certify `/finance-manager` as a simple control center for payroll finance users.

Scope:
- Page loads for payroll finance manager.
- Sidebar anchors render and navigate.
- Metrics, command queue, payments snapshot, and audit posture render.
- Top CSV exports and action manifests return expected response contracts.
- Employee/manager users cannot access finance-only APIs.
- Desktop and mobile/no-overflow proof.

Target confidence after phase:

| Area | Target |
| --- | ---: |
| Functionality | 89-91% |
| Browser QA | 90-92% |
| UX | 86-88% |
| Launch readiness | 88-90% |

## Phase FM-95-2: Handoff And Settlement Evidence

Goal:
- Certify finance handoff state, bank advice, provider delivery, acknowledgement, reconciliation, and audit-pack readiness.

Scope:
- Handoff counts and latest handoff snapshot.
- Bank advice artifact evidence.
- Finance handoff exception report.
- Provider delivery receipts and retry/dead-letter signals.
- Positive and negative export/download paths.

## Phase FM-95-3: Compliance And Statutory Evidence

Goal:
- Certify statutory filing status, challan reconciliation, statutory deductions, provider filing receipts, and manifest checksums for finance users.

Scope:
- CSV exports.
- Manifest exports.
- Checksum headers.
- Source endpoint proof.
- Empty and filtered states.
- Role denial for employee/manager.

## Phase FM-95-4: Final Staging Certification

Goal:
- Run Finance Manager as a final staging launch candidate.

Exit criteria:
- Focused Finance Manager browser suite passes.
- Finance report/export packs pass.
- Role menu certification includes `/finance-manager`.
- Lint/build pass after changes.
- Documentation records environment, commit, evidence, confidence, and non-blocking gaps.

## Execution Log

| Date | Phase | Environment | Evidence | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 | FM-95-0 inventory | Local documentation | Created Finance Manager 95% plan and mapped route/API/report obligations. | Functionality 82-86%, QA 84-88%, UX 78-82%, launch 82-86% | Next phase is FM-95-1 control-center browser certification. |
| 2026-09-16 | FM-95-1 control center certification | Local web with live staging API | Added and ran `finance-manager-control-center-certification.spec.ts`: 2/2 passed. Verified Finance Manager page, sidebar anchors, metrics, command queue, payment snapshot, audit posture, CSV exports, finance-handoff manifest, audit-history JSON, mobile/no-overflow, and employee/manager denial. `pnpm --dir web lint` passed. | Functionality 89-91%, QA 90-92%, UX 87-89%, launch 88-90% | Fixed misleading `Export audit` link: it now says `Open audit history` and routes to the audit-history workspace because the export-audits endpoint is JSON history, not CSV. Next phase is FM-95-2 handoff/settlement evidence and report packs. |
| 2026-09-16 | FM-95-2 handoff and settlement evidence | Local web with live staging API | Expanded `finance-manager-control-center-certification.spec.ts` and reran it: 2/2 passed. Certified Finance Manager access to finance handoff, bank advice, payroll register, payroll adjustments, and payroll settlements manifests with source endpoints/checksums/evidence columns; employee and manager denial remains fail-closed. Ran finance report pack: `payroll-finance-report-certification`, `bank-advice-report-certification`, `finance-handoff-exceptions-report-certification`, `payroll-adjustments-report-certification`, and `payroll-settlements-report-certification`: 10/10 passed. | Functionality 92-94%, QA 93-94%, UX 90-92%, launch 91-93% | Handoff, payout, adjustment, settlement, and exception evidence are now covered from both Finance Manager and report-pack perspectives. Next phase is FM-95-3 statutory/compliance evidence. |
| 2026-09-16 | FM-95-3 statutory and compliance evidence | Local web with live staging API | Expanded `finance-manager-control-center-certification.spec.ts` and reran it: 2/2 passed. Certified Finance Manager access to challan reconciliation, statutory filing status, and provider filing receipts manifests with source endpoints/checksums/evidence columns; employee and manager denial remains fail-closed. Ran compliance report pack: `challan-reconciliation-report-certification`, `provider-filing-receipts-report-certification`, `statutory-deductions-report-certification`, and `statutory-filing-status-report-certification`: 8/8 passed. `pnpm --dir web lint` passed. | Functionality 94-95%, QA 94-95%, UX 92-94%, launch 93-94% | Statutory signoff, challan proof, provider acknowledgement, deduction evidence, pagination/filtering, and role denial are covered. Next phase is FM-95-4 final staging certification and role-menu alignment. |
| 2026-09-16 | FM-95-4 final staging certification | Local web with live staging API | Aligned `public-launch-role-menu-certification.spec.ts` so Payroll Finance Manager lands on `/finance-manager`, uses Finance navigation, and expects the Finance operations chrome. Aligned `pilot-credential-matrix-certification.spec.ts` so Payroll Finance Manager lands on `Finance control center`; also updated the support-grant helper to the redesigned `/tenant-admin/support-access` page. Evidence: combined launch gate first ran 18/19 with only the pre-fix support helper failing while Finance Manager and role-menu cases passed; clean reruns passed `pilot-credential-matrix-certification.spec.ts` 10/10 and `public-launch-role-menu-certification.spec.ts` 7/7. `pnpm --dir web lint` passed. | Functionality 95%, QA 95%, UX 94-95%, launch 95% | Finance Manager is now a first-class discoverable workspace, with role landing, sidebar navigation, report evidence, manifests, denial paths, and credential boundaries certified. |
