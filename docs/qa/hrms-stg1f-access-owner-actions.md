# HRMS STG-1F Infrastructure Owner Actions

Date: 2026-10-26\
Status: **OWNER ACTION REQUIRED; NO ACCESS CHANGE EXECUTED**

## Verified Identity And Current Denials

| Item | Value/status |
|---|---|
| AWS account | `227022022984` |
| IAM principal | `arn:aws:iam::227022022984:user/lightsail-staging-operator` |
| Profile/region | `lightsail-staging`, `ap-south-1` |
| STS | Verified in STG-1E |
| Lightsail inventory | `lightsail:GetInstances` explicitly denied |
| Staging host | `65.0.231.86:22`, strict known-host match |
| OS account | `ubuntu` |
| Approved RSA public-key fingerprint | `SHA256:xO7RPTT104eUsj2hO+n0LhLdHZGPvoCJ6jH56Iot2iU` |
| SSH result | Key signed the request but server rejected it; no repeated attempts made |

No private key material is recorded here.

## AWS API Permission

Attach a time-bounded read-only policy to the principal allowing only:

- `lightsail:GetInstances`
- `lightsail:GetStaticIps`
- `lightsail:GetInstancePortStates`
- `lightsail:GetInstanceMetricData`
- `lightsail:GetAlarms`
- `lightsail:GetContactMethods`
- `lightsail:GetOperations`

Lightsail list/read actions require `Resource: "*"`. Do not grant create/update/delete, instance power actions, snapshots, DNS mutation, secrets access or `lightsail:GetInstanceAccessDetails` for this probe.

Owner verification:

```bash
AWS_PROFILE=lightsail-staging AWS_REGION=ap-south-1 aws sts get-caller-identity
AWS_PROFILE=lightsail-staging AWS_REGION=ap-south-1 aws lightsail get-instances --query 'instances[].{name:name,state:state.name,blueprint:blueprintId,bundle:bundleId,ip:publicIpAddress}'
```

## Host Permission

Authorize the public key with the fingerprint above for the `ubuntu` account on the one staging instance, preferably restricted by source network and a documented maintenance window. Alternatively, the infrastructure owner may execute the probe and provide signed output.

Read-only probe commands:

```bash
hostname
date -u
docker ps --format '{{.Names}} {{.Image}} {{.Status}}'
docker inspect --format '{{.Name}} {{.Image}} {{.Config.Labels}} {{.State.Health.Status}} {{.RestartCount}}' <approved-container-names>
docker exec <backend> python manage.py showmigrations --plan
docker exec <backend> python manage.py check
docker exec <celery-worker> celery -A config inspect ping
docker exec <celery-worker> celery -A config inspect stats
curl --fail --silent --show-error https://hrms.accerio.in/health/
```

Inspect only the presence, never the value, of the staging fingerprint, evidence-API enablement and mail-control settings. Do not print container environments, Compose environment files, database URLs, tokens, SMTP credentials or private keys. Celery beat identity is verified from its pinned image/OCI revision, singleton container count, command and recent non-sensitive logs; do not restart it.

## Required Evidence

The owner-signed output must establish instance identity/state; backend/web/worker/beat image IDs and immutable digests; OCI source revision; health and restart counts; applied/pending migration state; worker identity; exactly one beat; and safe configuration presence. Historical digest/SHA values must not be promoted as fresh evidence.

## Revocation And Audit

1. Record owner, ticket/reference, policy hash, source network, start/end time and commands run.
2. Retain CloudTrail/IAM change evidence and host authentication logs in the restricted evidence location.
3. Remove the temporary Lightsail policy after provenance collection unless an approved standing read-only role exists.
4. Remove the temporary SSH key authorization or close the certificate/window immediately after the probe.
5. Re-test that the IAM read is denied and the key no longer authenticates; preserve only fingerprints and signed output.

## Unrelated Recovery Blocker

Fresh provenance does not close recovery. Encrypted off-host database/artifact backup, object version/checksum evidence, and an isolated restore rehearsal remain blocked and require infrastructure, security, DBA/recovery and application-owner approval.
