# HRMS Lightsail SES Integration Evidence

Date: 2026-10-18
Environment: synthetic-only HRMS staging
URL: `https://hrms.accerio.in`
AWS account: `227022022984`
Region: `ap-south-1`

## Result

Amazon SES SMTP delivery is configured and accepted from the HRMS staging backend. This evidence does not change real-payroll production readiness or certify inbox placement.

## SES State

- SES account health: healthy.
- Production access: enabled.
- Sending: enabled.
- Quota: 50,000 messages per 24 hours and 14 messages per second.
- Verified domain: `accerio.in`.
- DKIM: enabled and successful.
- Custom MAIL FROM: `mail.accerio.in`, successful.
- Suppression reasons: bounce and complaint.

## Runtime Configuration

- Backend: `django.core.mail.backends.smtp.EmailBackend`.
- Endpoint: `email-smtp.ap-south-1.amazonaws.com`.
- Port: `587` with STARTTLS.
- Sender: `Accerio HRMS <no-reply@accerio.in>`.
- Credential principal: `hrms-staging-ses-smtp`.
- Credential policy: send-only for the verified `accerio.in` identity and `*@accerio.in` sender addresses.
- Secret location: host-managed `/srv/saas/hrms/infrastructure/lightsail/.env.hrms`, mode `0600`.
- Secrets were not printed, committed, or stored in QA evidence.

## Executed Evidence

1. SES account, identity, DKIM and MAIL FROM status were inspected through AWS APIs.
2. TCP connectivity from Lightsail to the SES SMTP endpoint on port 587 passed.
3. Backend, Celery worker and Celery beat were recreated with the protected environment; PostgreSQL, Redis, web, Caddy and persistent volumes were not recreated.
4. Backend health returned healthy and the public API health endpoint returned HTTP 200.
5. Django production preflight passed `email.backend_live`, `email.from_configured` and `email.connectivity`.
6. `verify_email_delivery` returned `status=passed` and `delivered_count=1` for the verified synthetic mailbox.
7. Evidence checksum: `6cd7455bf05a9561d06ff49e85595ccaa0e392561c0c7cc592400f6a79211f08`.
8. Runtime configuration inspection confirmed SMTP, STARTTLS and credential presence without revealing values.
9. The account owner confirmed receipt in the target inbox after the controlled delivery proof.

## Operational Workflow Certification

The following checks used the production-built browser application and synthetic staging identities only:

| Workflow | Result | Evidence |
| --- | --- | --- |
| Password-reset request | Passed | Browser submitted `/forgot-password`; API returned HTTP 200; notification `d3983464-6b6c-463d-ac00-1632c36433f8` moved from `pending` to `delivered` with one `email_smtp` delivery log. |
| Account invitation | Passed | Notification `ecd88bd1-7927-48d5-9020-7a948faf1b64` delivered through `email_smtp`; the generated password was not present in the email body. |
| HR Admin template test send | Passed after fixture correction | Authenticated browser-session request returned a delivered notification through `email_smtp` to the authorized test address. |
| Invalid/missing password-reset account disclosure | Covered by existing backend regression | Public response remains non-disclosing and no notification is created for a missing account. |

The first template test-send attempt correctly identified that notification recipient resolution prefers employee `work_email` over the linked user's email. It therefore targeted the synthetic `.invalid` fixture address and was not counted as a successful recipient proof. The employee `work_email` was temporarily set to the authorized test mailbox, the test passed, and both the user and employee addresses were restored to their original `.invalid` values. The temporary HR Admin password hash was also restored.

Focused verification:

- Playwright password-reset browser flow: 1 passed.
- Playwright HR Admin template test-send flow: 1 passed after one retained fixture-routing failure.
- TypeScript: passed.
- Focused ESLint: passed.
- Temporary identity and email fixture restoration: passed.

## Monitoring And Recovery Gap

SMTP acceptance is currently recorded as `delivered`. A later SES bounce or complaint is not reconciled back into the notification row because no SES event destination/consumer is deployed. CloudWatch/SNS bounce and complaint alarms and an approved alert mailbox are still required. This gap must remain visible until external event evidence is executed.

Operational protection created on 2026-10-18:

- SNS topic: `arn:aws:sns:ap-south-1:227022022984:hrms-staging-ses-events`.
- Topic policy permits SES publication only from account `227022022984` and identity `accerio.in`.
- Alert subscription: `renubansal19611@gmail.com`, confirmed.
- CloudWatch alarm: `hrms-staging-ses-bounce-rate-critical`, threshold 5%, five-minute period, missing data non-breaching, state `OK`.
- CloudWatch alarm: `hrms-staging-ses-complaint-rate-critical`, threshold 0.1%, five-minute period, missing data non-breaching, state `OK`.
- SES identity Bounce topic: attached and read back successfully.
- SES identity Complaint topic: attached and read back successfully.
- SES feedback forwarding: enabled.
- Controlled SNS monitoring message: publish accepted and mailbox receipt confirmed by the account owner.
- SES bounce simulator: SMTP acceptance passed for `bounce@simulator.amazonses.com`; evidence checksum `a92db92848a03a768c9c15e00783634785c2e3754cb000941a3cdfd3e3f94e6b`.
- SES bounce-event notification: mailbox receipt confirmed by the account owner.

The bounce simulator does not harm SES sender reputation. The current topic uses a confirmed operational email subscription rather than a machine-readable application consumer.

## Credential Operations

- Dedicated principal: `hrms-staging-ses-smtp`.
- Active keys: one.
- Managed secret: `hrms/staging/ses-smtp` in `ap-south-1`.
- Secret encryption: AWS-managed Secrets Manager key.
- Managed-secret/runtime checksum comparison: matched across all nine SMTP configuration fields.
- Secret tags: environment `staging`, application `hrms-payroll`, data class `credential`.
- Emergency revocation: deactivate or delete that access key, then recreate/redeploy a replacement.
- Routine rotation: create a second key, deploy and prove it, then deactivate and delete the original key.
- Host secret file: mode `0600`, owned by `deploy`.
- Repository and evidence contain no credential value.
- Secrets Manager is now the managed source of truth; the container still receives the SMTP credential at runtime through the protected host environment.
- Automatic rotation is not enabled. Rotation remains a controlled create/deploy/prove/deactivate/delete procedure because an SES SMTP password is derived from an IAM access key.

### Rotation Procedure

1. Create a second access key for `hrms-staging-ses-smtp` without removing the active key.
2. Derive the region-specific SES SMTP password for `ap-south-1`.
3. write a new `AWSCURRENT` version to `hrms/staging/ses-smtp`.
4. Deploy the new value to the protected host environment and recreate only backend/Celery services.
5. Run SMTP connectivity, direct delivery, password-reset and template test-send proofs.
6. Deactivate the prior access key.
7. Observe delivery for an approved validation window, then delete the prior key.

### Emergency Revocation

1. Deactivate the active key immediately through IAM.
2. Confirm HRMS reports actionable delivery failures rather than false completion.
3. Create and deploy a replacement credential using the rotation procedure.
4. Revoke/delete the compromised key after replacement proof.
5. Review CloudTrail/IAM activity, SES sending statistics, suppression entries and notification delivery logs for the affected interval.

Backup inventories may record the secret name, region, version identifier, tags and restoration order. They must never contain the plaintext SMTP username or password.

## Unrelated Existing Gates

The strict production preflight continues to fail existing enterprise identity, payroll-provider worker/credential and protected payroll-artifact storage gates. These are unrelated to SES and remain unchanged.

Celery beat detected and removed a pre-existing corrupt local schedule database during recreation. The beat process recovered and remained running; no email credential appeared in logs.

## Required Security Cleanup

Remove the temporary `HrmsStagingSesBootstrap` inline policy from `lightsail-staging-operator`. Retain the dedicated `hrms-staging-ses-smtp` principal and its `HrmsStagingSesSendOnly` policy. Rotate the SMTP key if it is ever disclosed, and do not copy it into Git, tickets or chat.

## Decision

SES staging integration: **PASS for SMTP acceptance and confirmed inbox receipt**.

Password reset, invitation, notification-template test delivery, alert delivery and SES bounce-event notification are verified. Application-level reconciliation of asynchronous bounce/complaint events back into individual notification rows is not implemented and remains a separate enhancement. Real-payroll production readiness remains **NO-GO**.
