# Pilot 100 Stakeholder Acceptance Pack

Date: 2026-09-13  
Environment: staging, `https://hrms.accerio.in`  
Technical sign-off source: `docs/qa/pilot-100-final-signoff-2026-09-13.md`  
Execution tracker: `docs/qa/pilot-100-execution-tracker-2026-09-12.md`

## Decision Request

Approve a controlled pilot run for the HRMS Payroll SaaS product with the accepted limitations listed below.

Technical recommendation: go for controlled pilot.

This is not a blanket approval for unattended production payroll, real statutory filing, or real bank/payment provider execution.

## Certified Pilot Scope

The following has been certified through browser-based Playwright testing and staging operational checks:

- One realistic organization / tenant payroll rehearsal.
- 100 employee pilot dataset under `PILOT100_20260912`.
- Organization masters and structural mapping.
- Policy and payroll setup.
- Employee access matrix across HR admin, payroll finance manager, manager, employee, support agent, and platform admin.
- Attendance, leave, lifecycle, payroll input, snapshot, lock, calculation, review, adjustments, settlements, close readiness, output, payslip, finance handoff, reports, and export audit flows.
- Payroll reports and export manifests.
- Payslip publication and employee evidence.
- Finance handoff exception visibility and provider audit-pack evidence.
- Role and API denial checks.
- Backup/restore drill.
- Rollback/roll-forward drill.
- Provider rehearsal without real live rail execution.
- Monitoring/log/disk review.
- Release retention and disk-alert runbook.

## Accepted Limitations

| Limitation | Impact | Acceptance Required |
|---|---|---|
| Dense payroll administration is desktop-first. | Mobile is suitable for smoke/review, not heavy admin work. | Business accepts desktop as required for pilot payroll operations. |
| Real provider credentials were not executed for live filing/payment. | No real bank payout or statutory filing is certified by this pilot evidence. | Business accepts non-production provider rehearsal only until sandbox/live credentials are supplied and separately certified. |
| Provider callback/retry optional drilldowns were skipped where staging seed rows did not exist. | Available provider audit-pack evidence passed; missing optional seed rows should be generated when testing a real provider callback/retry integration. | Business accepts this for controlled pilot if no live provider rail is used. |
| Cross-tenant destructive mutation was intentionally avoided on staging. | Role/API/artifact isolation is certified, but destructive cross-tenant mutation was not performed. | Business accepts non-destructive isolation proof for pilot. |
| Pilot data is retained until stakeholder review is complete. | Data cleanup is intentionally paused. | Business confirms retention window and cleanup owner. |
| Real statutory return formats and e-file submission require provider/government-channel validation. | Reports and readiness evidence exist, but official filing output must be certified separately. | Business accepts statutory filing as out of scope for this controlled pilot unless separately approved. |

## Not Approved By This Sign-Off

This pilot sign-off does not approve:

- Unattended production payroll.
- Real bank payment transmission.
- Real statutory filing/e-file submission.
- Live provider credential use without a non-production credential rehearsal.
- Multi-country statutory payroll launch.
- Cleanup of `PILOT100_20260912` evidence before stakeholder review.

## Required Stakeholder Decisions

| Decision | Options | Current Recommendation |
|---|---|---|
| Pilot start | Approve / defer | Approve controlled pilot. |
| Provider rail use | Non-production only / live allowed | Non-production only. |
| Pilot evidence retention | Retain / cleanup | Retain until stakeholder review is complete. |
| Desktop requirement | Accept / reject | Accept for payroll admin operations. |
| Support model | Named owner / pending | Assign one support owner before pilot start. |
| Pilot rollback plan | Accept / request more drill | Accept staging drill with readiness wait. |

## Go / No-Go Checklist

| Gate | Status | Evidence |
|---|---|---|
| Product QA certification | Go | P100-0 through P100-19 recorded in tracker. |
| Staging deployment health | Go | Backend/web active; `/login` and `/` returned HTTP `200`. |
| Payroll functional rehearsal | Go | 100 employee rehearsal completed with accepted limitations. |
| Reports and exports | Go | Report/export regression and audit evidence passed. |
| Security and role access | Go | Role matrix and denial checks passed. |
| Backup/restore | Go | Scratch restore verified and cleaned up. |
| Rollback/roll-forward | Go | Previous release and current release activation verified. |
| Provider rehearsal | Go with limitation | Provider rehearsal passed without live rail execution. |
| Monitoring/log review | Go | Expected noise classified; no launch blocker found. |
| Disk/release retention | Go | Disk remediated and runbook created. |
| Stakeholder acceptance | Pending | Requires sign-off below. |
| Evidence cleanup decision | Pending | Recommend retain until review complete. |

## Sign-Off

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| Business owner |  |  |  |  |
| HR/payroll owner |  |  |  |  |
| Finance owner |  |  |  |  |
| Product owner |  |  |  |  |
| Engineering owner |  |  |  |  |
| QA owner |  |  |  |  |
| Support owner |  |  |  |  |

## Recommended Final Decision

Proceed with a controlled pilot if stakeholders accept the limitations and agree to retain the `PILOT100_20260912` evidence pack until review is complete.

Treat live provider/payment/statutory filing as a separate certification gate.
