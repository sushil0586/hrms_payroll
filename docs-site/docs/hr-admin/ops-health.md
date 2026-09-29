# Ops Health

Ops Health shows HR-facing service health, queues, support sessions, delivery posture, provider queues, and launch risks.

## Purpose

Use Ops Health when you need to understand whether the tenant is operationally healthy beyond normal HR data checks.

## Use this page when

- The dashboard shows operational risk.
- Notifications, provider jobs, or support access need review.
- Launch remediation points to service health.
- You need to check resilience or SLA operations.
- A customer reports broad system behavior, not a single employee record.

## Page sections

| Section | Meaning |
| --- | --- |
| Operations posture | Overall ready, warning, or blocked state. |
| Open remediation | Launch or service risks still needing action. |
| Resilience | Backup or recovery posture. |
| SLA ops | Incidents, breaches, and service-level health. |
| Notifications | Failed and pending delivery counts. |
| Provider queue | Queued, stale, running, or dead-lettered provider jobs. |
| Support sessions | Active or expired support access. |
| Tenant requests | Pending tenant-owned change requests. |

## Main actions

| Button | Opens | Use it when |
| --- | --- | --- |
| Control plane | SaaS control details. | Tenant-level operating controls need review. |
| Resilience | Backup and recovery posture. | Production safety or launch evidence is needed. |
| SLA ops | Incident and breach posture. | Service-level commitments need review. |
| Launch remediation | Launch blockers. | Operational risks must be assigned or closed. |

## What to check first

1. Review overall operations posture.
2. Check blocked signals.
3. Check failed notifications and provider queue.
4. Review support access sessions.
5. Open launch remediation for unresolved blockers.
6. Escalate technical items that cannot be solved from HR Admin.

## Escalate if

- Provider jobs are dead-lettered or stale.
- Notification pending count keeps increasing.
- Support access is active without a current support case.
- Resilience is blocked.
- SLA breach count is non-zero.
- Public app URL or API base URL is not production-ready.

## Related guides

- [Notification Issues](../troubleshooting/notifications.md)
- [Launch Readiness](launch-readiness.md)
- [Tenant Admin Support Access](../tenant-admin/support-access.md)
- [Go-Live Checklist](../launch/go-live-checklist.md)

