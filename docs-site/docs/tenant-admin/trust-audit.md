# Tenant Trust Audit

Tenant Trust Audit provides account-level evidence for user changes, role changes, support access, setup activity, and security review.

## Purpose

Use Trust Audit to answer what happened in the tenant account and to export evidence when permitted.

![Tenant trust audit](../assets/screenshots/tenant-admin/trust-audit.png)

## Use this page when

- A tenant admin asks who changed access or roles.
- Support access needs evidence.
- Commercial or compliance teams need an audit pack.
- Setup, security, or plan actions must be reviewed.

## Page sections

| Section | Meaning |
| --- | --- |
| Audit summary | Counts by event group and support session. |
| Filters | Event group, support session, actor, action, and date filters. |
| Audit taxonomy | Event categories and evidence groups. |
| Support sessions | Support access history and linked events. |
| Audit events | Detailed event list. |

## Common event groups

| Event group | Examples |
| --- | --- |
| Tenant admin | User invites, role changes, settings changes. |
| Support | Support access request, approval, revoke, session actions. |
| Security | Security readiness, audit exports, access posture. |
| Plan | Subscription or usage evidence. |

## Evidence review workflow

1. Choose the event group.
2. Filter by actor, support session, action, or date.
3. Review event sequence before exporting.
4. Confirm the event answers the business question.
5. Export only the relevant evidence when permitted.

## Trust questions this page answers

| Question | Where to look |
| --- | --- |
| Who changed a user role? | Tenant admin event group. |
| Who approved support access? | Support event group and support session detail. |
| Was support access revoked? | Support session timeline. |
| What changed before a security review? | Security and tenant admin event groups. |
| What plan evidence was available? | Plan event group and commercial support audit. |

## Good practice

- Export audit only when policy allows.
- Use filters before exporting so the evidence pack is relevant.
- Treat exported audit files as sensitive.

## FAQ

### Should I export all events?

No. Filter first and export only the evidence required for the support, compliance, or commercial question.

### Are audit exports sensitive?

Yes. They may include account, user, support, and security evidence. Store and share them carefully.
