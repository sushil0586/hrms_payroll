# Phase 5I Payroll Register Export Authorization Certification - 2026-09-09

## Scope

Certified run-level payroll register export authorization through local browser-authenticated routes:

- `/hr-admin/payroll-outputs`
- `/ess/payslips`
- `/api/hr-admin/payroll-output-artifacts/[registerArtifactId]/download`
- `/api/hr-admin/payroll-output-artifacts/[registerArtifactId]/access-audit-export`
- `/api/me/payroll-payslips/[registerArtifactId]/download`

## Browser Path Certified

1. Logged in as HR admin and opened payroll outputs.
2. Selected a run-level `Payroll Register` artifact from the artifact register.
3. Verified the selected artifact detail shows `Run level` and `Register`.
4. Downloaded the register through the same-origin HR admin proxy route.
5. Confirmed CSV response, attachment disposition, payroll checksum header, and register payload content.
6. Exported access audit CSV for the register artifact.
7. Confirmed the audit export includes the register download event.
8. Logged in as employee and opened ESS payslips.
9. Confirmed employee cannot use the HR admin register download route.
10. Confirmed employee cannot access the register through the ESS payslip download route.
11. Confirmed the ESS payslip UI does not expose `Payroll Register`.

## Element Coverage

- HR payroll outputs page: artifact register, register row link, selected detail heading, kind/status evidence, download link, access audit export link.
- HR register download route: content type, content disposition, checksum header, payload content.
- HR access audit route: CSV content type and download-event audit evidence.
- ESS payslips page: payslip-only visibility, employee-scoped denial for register artifact.
- Negative paths: employee denial through HR route and employee denial through ESS payslip route.

## Confidence

- Payroll register export authorization confidence: 92%.
- Run-level artifact isolation confidence: 92%.
- Current Phase 5 confidence: 96%.

## Residual Risks

- Final locked payroll edit/reopen negative paths need a focused destructive-control browser test.
