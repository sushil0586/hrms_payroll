# Support Agent User Guide

Date: 2026-09-13

## Purpose

The Support Agent helps diagnose tenant issues without bypassing tenant trust boundaries. Support should work through approved, scoped, time-bound access and should leave clear evidence of actions taken.

## Main Workspace

- Primary route: `/support`
- Domain snapshot route: `/support/domain-snapshot`

## What The Support Agent Can Do

- Review tenant support requests.
- Inspect tenant configuration health.
- Inspect domain/runtime snapshots.
- Confirm API reachability and environment posture.
- Record support observations.
- Help reproduce user-reported issues.

## What The Support Agent Should Not Do

- Do not access a tenant without approval.
- Do not change payroll or employee data unless the support runbook explicitly requires it.
- Do not download sensitive payroll exports unless approved and documented.
- Do not keep access after the incident is resolved.

## First Login Checklist

1. Open Support workspace.
2. Confirm support role.
3. Confirm no tenant data is visible without selecting an approved context.
4. Open domain snapshot.
5. Confirm runtime and API health sections load.
6. Confirm support notes or evidence areas are available.

## Support Incident Workflow

1. Receive issue report.
2. Confirm tenant, role, page, action, expected result, actual result, and time.
3. Confirm tenant approval or support access grant.
4. Reproduce the issue through the browser.
5. Capture exact page, filters, and error state.
6. Check domain snapshot and API health.
7. Record observation and severity.
8. If code fix is needed, create a development task.
9. Retest after fix.
10. Close access or confirm it expires.

## Domain Snapshot Review

Use the domain snapshot to check:

- Frontend deployment version.
- Backend/API health.
- Environment configuration.
- Tenant/domain routing.
- Live data availability.
- Error or fallback state.

## Escalation Levels

| Severity | Example |
| --- | --- |
| P0 | Tenant cannot access app, payroll close impossible, cross-tenant data exposure |
| P1 | Payroll totals wrong, finance handoff blocked, employee privacy issue |
| P2 | Important workflow blocked but workaround exists |
| P3 | UX improvement, unclear copy, non-blocking validation gap |

## Common Issues

| Issue | What to check |
| --- | --- |
| Workspace cannot load | API base URL, backend availability, authentication |
| User sees wrong data | Role, tenant membership, tenant boundary |
| Report export fails | Report API, filters, permissions, export audit |
| Dropdown empty | Master data mapping and active status |
| Long page hard to use | Need tabs, pagination, categorized sections |

## Completion Criteria

A support case is complete when:

- Issue was reproduced or explained.
- Tenant impact is recorded.
- Root cause or next action is documented.
- Any fix is retested.
- Access is revoked or expired.
- Pilot tracker is updated if the issue affects launch readiness.

