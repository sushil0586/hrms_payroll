# HRMS Staging Release Readiness Gates

Date: 2026-10-27\
Candidate parent: `7a55b33e20bfc5ba34f2c15017edd271c2092664`\
Staging entry decision: **BLOCKED**

| Gate | Required evidence | Owner | Status |
|---|---|---|---|
| Exact candidate approval | Reviewed manifest and checksum approved by repository owner | Repository owner | APPROVAL REQUIRED |
| Dependency disposition | Security-owner disposition for `GHSA-86w9-cpqp-85rv`, expiry and remediation ticket, or removal from runtime image | Security owner | BLOCKED |
| Immutable build provenance | Signed/digest-pinned backend, frontend and worker images mapped to candidate SHA | Release owner | NOT VERIFIED |
| Runtime identity | AWS caller, Lightsail host, deployed digests, migration revision and environment fingerprint | Infrastructure owner | BLOCKED |
| Staging evidence API | Explicit staging enablement, bounded GET-only identity, tenant/resource scope and audit verification | Security/QA | NOT VERIFIED |
| PostgreSQL evidence role | Read-only least-privilege role with negative write/escalation tests | DBA | NOT VERIFIED |
| Synthetic identities | Approved namespace for Platform, Tenant, HR, ESS and MSS identities | QA owner | APPROVAL REQUIRED |
| Email isolation | SES sandbox/allowlist, safe recipients and worker-path enforcement | Infrastructure/security | NOT VERIFIED |
| Protected storage | Private object storage, encryption, signed access and denial tests | Infrastructure/security | BLOCKED |
| Backup and restore | Encrypted off-host backup plus successful isolated restore reference | DBA/infrastructure | BLOCKED |
| Monitoring | Central logs, worker/job failures, health, disk/memory and alert delivery | Operations | NOT VERIFIED |
| Rollback | Image rollback, migration compatibility, owner and execution procedure | Release/DBA | APPROVAL REQUIRED |
| Execution governance | Target, IDs, one-worker window, execution/cleanup/rollback owners and stop conditions | Release manager | APPROVAL REQUIRED |

## Required order

1. Approve the exact source manifest and resolve or formally accept the node-forge web-only risk.
2. Build immutable images and record source-to-digest provenance.
3. Establish runtime access, backup/restore, private storage, SES isolation, evidence role and monitoring.
4. Deploy only in an approved window; verify fingerprint, migrations, health and rollback before data mutation.
5. Authorize Batch 0 preflight, then Batches 1-14 sequentially. Keep all 136 staging scenarios `Not Run` until actually executed.

## Stop conditions

Stop immediately on tenant leakage, privilege escalation, financial mismatch, migration drift, failed restore, public artifact access, uncontrolled email, duplicate financial effects, or missing rollback ownership. Production payroll remains **NO-GO**.

## Repository-owner approval record

| Field | Value |
|---|---|
| Candidate parent | `7a55b33e20bfc5ba34f2c15017edd271c2092664` |
| Candidate files | 106 |
| Manifest SHA-256 | `14588ec9c84a0399faf75b180f11e3ae5331fe68730793d3a80f77364d2ab6b5` |
| Proposed message | `feat(hrms): complete functional certification release candidate` |
| Protected excluded diff | `web/tests/e2e/db6-payroll-processing.spec.ts`; SHA-256 `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb` |
| Approval state | **APPROVAL REQUIRED**; this review does not authorize staging or commit operations |
| Authorized scope when approved | One local commit containing exactly the frozen manifest; no push, merge, tag or deployment |

Exact staging and verification commands after explicit owner approval:

```bash
test "$(git rev-parse HEAD)" = "7a55b33e20bfc5ba34f2c15017edd271c2092664"
test "$(shasum -a 256 docs/qa/hrms-staging-release-candidate-manifest.txt | awk '{print $1}')" = "14588ec9c84a0399faf75b180f11e3ae5331fe68730793d3a80f77364d2ab6b5"
test -z "$(git diff --cached --name-only)"
awk 'NF && $1 !~ /^#/' docs/qa/hrms-staging-release-candidate-manifest.txt | git add --pathspec-from-file=-
diff -u <(awk 'NF && $1 !~ /^#/' docs/qa/hrms-staging-release-candidate-manifest.txt | sort) <(git diff --cached --name-only | sort)
test "$(git diff -- web/tests/e2e/db6-payroll-processing.spec.ts | shasum -a 256 | awk '{print $1}')" = "8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb"
git commit -m "feat(hrms): complete functional certification release candidate"
```
