# Ops Health

Ops Health shows HR-facing service health, queues, support sessions, delivery posture, provider queues, and launch risks.

## On This Page

- [Ops Health Quick Navigation](#ops-health-quick-navigation)
- [Purpose](#purpose)
- [Use this page when](#use-this-page-when)
- [Page sections](#page-sections)
- [Main actions](#main-actions)
- [What to check first](#what-to-check-first)
- [Example: Notification Failures Before Go-Live](#example-notification-failures-before-go-live)
- [Example: Support Access Review](#example-support-access-review)
- [Example: API and Public App URL Health](#example-api-and-public-app-url-health)
- [Example: Pre-Activation Ops Health Review](#example-pre-activation-ops-health-review)
- [Pre-Activation Health Checklist](#pre-activation-health-checklist)
- [Escalate if](#escalate-if)
- [Ops Health signoff checklist](#ops-health-signoff-checklist)

## Ops Health Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Understand if the tenant is operationally healthy | [What to check first](#what-to-check-first) | [Page sections](#page-sections) |
| Investigate notification failures | [Example: Notification Failures Before Go-Live](#example-notification-failures-before-go-live) | [Related guides](#related-guides) |
| Review temporary support access | [Example: Support Access Review](#example-support-access-review) | [Negative Scenario: Active Support Access Without a Ticket](#negative-scenario-active-support-access-without-a-ticket) |
| Diagnose workspace load or API failures | [Example: API and Public App URL Health](#example-api-and-public-app-url-health) | [Escalate if](#escalate-if) |
| Perform pre-activation readiness review | [Example: Pre-Activation Ops Health Review](#example-pre-activation-ops-health-review) | [Pre-Activation Health Checklist](#pre-activation-health-checklist) |
| Decide whether HR can fix or must escalate | [Escalate if](#escalate-if) | [FAQ](#faq) |

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

## Example: Notification Failures Before Go-Live

Use this when employees or managers say they did not receive invite, password reset, leave, document, or payroll email.

### Scenario

HR invited three users, but one employee did not receive the email. Direct SMTP testing works, but the app notification queue shows failed events.

### Steps

1. Open **HR Admin > Ops Health**.
2. Review the **Notifications** section.
3. Check failed and pending counts.
4. Open **Notifications** or **Notification Delivery**.
5. Filter by failed status and email channel.
6. Open the failed item.
7. Review recipient, template, provider, attempt count, and error message.
8. Retry only if the error is temporary.
9. Escalate if provider credentials, sender verification, or recipient validation is wrong.

### Expected result

- HR can see whether this is one failed user or a wider delivery issue.
- Retry is used only when safe.
- Failed provider configuration is escalated instead of repeatedly retried.

## Example: Support Access Review

Use this when support needs temporary access to inspect a tenant issue.

### Scenario

Support asks for access because payroll calculation failed. Tenant Admin grants a time-bound support session.

### Steps

1. Open **HR Admin > Ops Health**.
2. Review **Support sessions**.
3. Confirm the session has a ticket, owner, expiry, and reason.
4. If the session is not needed anymore, ask Tenant Admin to revoke it.
5. Confirm the support session appears in audit evidence.

### Expected result

- Support access is time-bound.
- HR knows who entered the workspace and why.
- Audit evidence is available for customer trust review.

## Example: API and Public App URL Health

Use this when pages show workspace load failures or employees report the app opens but data does not load.

### Scenario

The public app URL opens, but HR Admin pages show **Live workspace load failed**.

### Steps

1. Open **HR Admin > Ops Health**.
2. Check **Public app URL** and **API base URL** signals.
3. Confirm whether the issue is blocked, warning, or ready.
4. If the API base URL is blocked, ask platform support to verify backend service, environment variables, and authentication.
5. After correction, reload HR Admin and open the original page again.

### Expected result

- HR can separate browser/UI issues from backend availability issues.
- Platform support receives the right technical context.

## Example: Pre-Activation Ops Health Review

Use this before HR Admin signs off production use or before a first live payroll cycle.

### Scenario

The tenant setup is complete, but HR wants to make sure the system is operationally healthy before inviting more employees and managers.

### Steps

1. Open **HR Admin > Ops Health**.
2. Review overall operations posture.
3. Confirm **Public app URL** is ready and points to the intended production URL.
4. Confirm **API base URL** is ready and live data loads in HR Admin.
5. Confirm **Notifications** are not blocked and failed delivery count is understood.
6. Confirm **Provider queue** has no stale, dead-lettered, or unexplained pending jobs.
7. Confirm **Support sessions** are disabled or have ticket, owner, reason, and expiry.
8. Confirm **Resilience** and **SLA ops** do not show blocked production signals.
9. Open **Launch Readiness** for any remaining remediation item.
10. Add owner and due date for anything HR cannot fix directly.

### Expected result

- HR knows whether issues are HR-data issues or platform/service-health issues.
- Production go-live is not approved while API, notification, provider, support-access, or resilience signals are blocked.
- Any accepted operational risk has a clear owner and follow-up date.

## Pre-Activation Health Checklist

| Area | Ready means | Escalate when |
| --- | --- | --- |
| Public app URL | Employees and admins open the correct URL. | URL points to test, sandbox, or old domain. |
| API base URL | HR pages load live workspace data. | Pages show live workspace load failure. |
| Notifications | Invite, reset, approval, and payroll-critical notifications can deliver. | Failed count grows, retry cap is reached, or event is not created. |
| Provider queue | No stale or dead-lettered critical jobs. | Payroll, document, notification, or finance jobs remain stuck. |
| Support sessions | No unexpected active access. | Session has no ticket, reason, owner, or expiry. |
| Resilience | Backup/recovery posture is not blocked. | Resilience signal is blocked before production use. |
| SLA ops | No open critical incident or unexplained breach. | Incident or breach affects customer use. |

## Negative Scenario: Provider Queue Is Stale

### Symptom

Provider queue shows pending or stale jobs for a long time.

### Risk

Payroll, notifications, integrations, or document processing may look complete in the UI but not actually finish in the background.

### Correct action

Do not mark go-live ready. Open provider details, check dead-letter or stale counts, and escalate to support with tenant, provider, queue age, and affected workflow.

## Negative Scenario: Active Support Access Without a Ticket

### Symptom

Support access is active, but there is no reason, ticket, owner, or expiry.

### Risk

The tenant cannot prove why support had access.

### Correct action

Ask Tenant Admin to revoke or reissue access with the correct purpose and expiry. Record the reason in audit notes.

## Escalate if

- Provider jobs are dead-lettered or stale.
- Notification pending count keeps increasing.
- Support access is active without a current support case.
- Resilience is blocked.
- SLA breach count is non-zero.
- Public app URL or API base URL is not production-ready.

## FAQ

### Is Ops Health only for technical users?

No. HR users should use it to understand whether failures are caused by HR data, provider delivery, support access, or platform health.

### Can HR fix every Ops Health issue?

No. HR can retry safe delivery items and route launch blockers. Provider, API, service, and environment issues usually need platform support.

### What evidence should I capture before escalation?

Capture tenant, module, failing action, affected user, timestamp, error message, queue status, and whether retry was attempted.

### Should Ops Health be checked before payroll?

Yes. At minimum, check notification health, provider queue health, support access, API readiness, and launch blockers before opening payroll inputs.

## Ops Health signoff checklist

| Check | Expected result |
| --- | --- |
| API health is green. | HR Admin pages can load live data. |
| Notification queues are stable. | Failed, pending, and retry-capped messages are understood. |
| Provider jobs are healthy. | Payroll/document/provider integrations are not silently failing. |
| Support access is controlled. | Temporary access has owner, reason, and expiry. |
| Launch blockers are routed. | Operational blockers have owner and next action. |

## Related guides

- [Notification Issues](../troubleshooting/notifications.md)
- [Launch Readiness](launch-readiness.md)
- [Tenant Admin Support Access](../tenant-admin/support-access.md)
- [Go-Live Checklist](../launch/go-live-checklist.md)
