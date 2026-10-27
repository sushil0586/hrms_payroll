# HRMS STG-1E Access Recovery

Date: 2026-10-26\
Decision: **PARTIAL - AWS identity restored; Lightsail inventory and SSH remain blocked**

## AWS Diagnosis

| Item | Verified result |
|---|---|
| Profile | `lightsail-staging` |
| Credential provider | Shared credentials file with static IAM access key; not IAM Identity Center/SSO |
| Region | `ap-south-1` |
| Account | `227022022984` |
| Principal | `arn:aws:iam::227022022984:user/lightsail-staging-operator` |
| STS identity | PASS on 2026-10-26 |
| Lightsail inventory | BLOCKED: `lightsail:GetInstances` denied by IAM |

No AWS credential value or token was printed or retained. Because this is a static-key profile, there is no SSO session to renew. The safe operator command is:

```bash
AWS_PROFILE=lightsail-staging AWS_REGION=ap-south-1 aws sts get-caller-identity
```

If this later returns `NoCredentials`, restore the profile through the approved secret-management process; do not paste a key into shell history. The infrastructure owner must attach the reviewed read-only policy from `hrms-stg1d-iam-and-db-grants.md`. STG-1E did not change IAM.

## SSH Diagnosis

| Item | Verified result |
|---|---|
| Target | `65.0.231.86:22` |
| Username | `ubuntu` |
| Host key | Existing ED25519 known-host entry matched; strict checking remained enabled |
| Network/protocol | Connection established; OpenSSH 9.6p1 server; public-key authentication only |
| SSH agent | Running agent has no identities |
| Key files | Three local RSA private keys exist with restrictive permissions and valid readable fingerprints |
| Bounded attempt | `sushiljyoti.pem` was loaded, signed the authentication request, and was rejected by the server |
| Final result | BLOCKED: `Permission denied (publickey)` |

No host-key bypass, password attempt, brute force, key replacement, or `authorized_keys` mutation occurred. The infrastructure owner must either re-authorize the approved operator public-key fingerprint on `saas-staging-01` or run the documented read-only provenance probe and provide signed output. AWS temporary access-key retrieval was not attempted.

## Public Service Observation

At `2026-10-26T18:05:45Z`, `https://hrms.accerio.in/health/` returned HTTP 200 with `{"status":"ok","service":"hrms-backend"}`. HSTS, `nosniff`, frame denial, and strict referrer policy were present.

This proves public service availability only. It does not prove the running application SHA, images, migrations, container restarts, fingerprint, or Celery identity.

## Fresh Provenance

**NOT VERIFIED.** Host access never succeeded and Lightsail inventory was denied. Historical SHA/digest values were not promoted to fresh evidence. Required owner action:

1. Grant the exact read-only Lightsail inventory policy.
2. Restore one approved SSH public key for the `ubuntu` account, restricted to the staging operator/network, or provide signed read-only probe output.
3. Rerun container image ID, OCI revision, health/restart, migration, worker/beat, safe environment-setting presence, and backup-metadata inspection.
