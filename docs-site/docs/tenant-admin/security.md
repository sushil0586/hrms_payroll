# Enterprise Security Readiness

Enterprise Security Readiness reviews tenant security posture, audit coverage, data protection, and account controls.

## Purpose

Use Security Readiness to confirm the tenant has the expected safeguards before relying on the system for production operations.

![Enterprise security readiness](../assets/screenshots/tenant-admin/security-readiness.png)

## Use this page when

- Security posture needs review.
- A customer asks for security readiness evidence.
- A setup or launch gate is blocked by security.
- Audit, support, data protection, or role controls need inspection.

## Security domains

| Domain | Meaning |
| --- | --- |
| Access governance | Roles, users, permissions, and high-risk access. |
| Audit | Event capture, evidence, export controls. |
| Support access | Scoped, approved, time-bound support sessions. |
| Data protection | Controls around sensitive data and exports. |
| Account settings | Tenant configuration and governed account changes. |

## Readiness states

| State | Meaning |
| --- | --- |
| Ready | Control is acceptable. |
| Warning | Review is recommended. |
| Blocked | Must be fixed before signoff. |

## Security review checklist

- Tenant admin users are limited to trusted owners.
- High-risk custom roles are reviewed.
- Support access is closed or time-bound.
- Trust Audit has evidence for sensitive changes.
- Data export and document access controls are understood.
- Blocked controls are assigned before launch or renewal review.

## Good practice

- Resolve blocked security checks before production handoff.
- Use Trust Audit for evidence.
- Review support access grants before security signoff.

## FAQ

### Is a warning allowed during launch?

Warnings can be accepted only when the owner understands the risk and the follow-up is tracked. Blockers should be resolved before signoff.

### Where do I prove a security control changed?

Use Trust Audit and filter for the relevant security, support, or tenant admin event.
