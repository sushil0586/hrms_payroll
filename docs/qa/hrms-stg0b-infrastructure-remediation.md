# STG-0B Infrastructure Remediation

Date: 2026-10-26
Release baseline: `20d832996ef505f0b6c2df2673204e841e7b6a52`
Decision: **CONDITIONAL**

## Baseline And Git Boundary

`main` remains aligned with `origin/main`. No explicit authorization to commit was received. Commit A therefore remains proposed only. Its manifest is the staging plan/register, STG-0 reports, STG-0A reports/mapping, this STG-0B report set, and the dashboard. The executable payroll repair remains a separate unstaged change and is not part of Commit A.

Exact proposed Commit A manifest:

1. `docs/qa/hrms-staging-complete-e2e-test-plan.md`
2. `docs/qa/hrms-staging-e2e-workflow-register.csv`
3. `docs/qa/hrms-stg0-readiness-assessment.md`
4. `docs/qa/hrms-stg0-infrastructure-checklist.md`
5. `docs/qa/hrms-stg0-risk-and-blocker-register.md`
6. `docs/qa/hrms-staging-certification-dashboard.md`
7. `docs/qa/hrms-stg0a-scenario-automation-mapping.csv`
8. `docs/qa/hrms-stg0a-evidence-contract.md`
9. `docs/qa/hrms-stg0a-git-change-review.md`
10. `docs/qa/hrms-stg0a-execution-readiness.md`
11. `docs/qa/hrms-stg0b-infrastructure-remediation.md`
12. `docs/qa/hrms-stg0b-celery-beat-durability.md`
13. `docs/qa/hrms-stg0b-backup-restore-readiness.md`
14. `docs/qa/hrms-stg0b-monitoring-and-alerts.md`
15. `docs/qa/hrms-stg0b-automation-gap-closure.md`

Prepared command, not executed:

```bash
git add <the 15 paths above> && git commit -m "docs(qa): freeze HRMS staging readiness baseline"
```

No application code, migration, shared configuration, staging service, or infrastructure was changed. No credentials were added. The active `Finacc/` IDE files are outside this repository and excluded.

## Strict Preflight Dependency Matrix

| Dependency | Configuration source and owner | Expected non-secret shape | Validation | Security implication | Safe remediation | Status |
|---|---|---|---|---|---|---|
| Enterprise identity scope | `HRMS_ENTERPRISE_IDENTITY_STATUS`; security/identity owner | `verified` or `not_in_scope` | `production_preflight` gate `enterprise_identity.scope_declared` | Prevents undeclared SSO/identity posture | Security owner records scope and injects deployment value | Missing |
| Provider worker declaration | `HRMS_PAYROLL_PROVIDER_WORKER_ENABLED`; payroll platform/DevOps | Boolean true only when supervised worker loops exist | `payroll.worker_declared`, process inventory and job evidence | Avoids accepted provider work with no executor | Declare only after provider job/retry workers are deployed and monitored | Missing on verified staging preflight |
| Provider credentials | `HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON` or secret-backed settings; payroll integration owner | JSON object keyed by opaque credential ref; values contain provider ref, sandbox mode, secret resolver metadata | `payroll.providers.credentials`, adapter registry, sandbox handshake | Prevents hardcoded or absent provider secrets | Store in approved secret manager; inject refs; use sandbox credentials only | Blocked pending provider/sandbox decision |
| Payroll artifact storage credentials | `HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON`; storage/security owner | JSON object keyed by credential ref; cloud family and default/secret resolver metadata | `storage.credentials`, signed read/write isolation test | Protects payslips, bank files and payroll outputs | Create private staging bucket/IAM/KMS configuration and inject ref | Blocked pending external protected storage |
| Storage security policies | `HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON` plus strict verifiers; security/compliance owner | Enabled policy with provider/credential allowlists, encryption, retention, lifecycle, scanner, durability and signed-URL bounds | strict storage registry and control verifiers | Prevents public, unencrypted or ungoverned payroll artifacts | Approve policy, configure verifier integrations, then execute upload/download/denial evidence | Blocked pending policy and external controls |

No dummy production credentials or weakened preflight values are acceptable. Synthetic-only staging may explicitly keep provider submission disabled, but that does not satisfy provider or storage launch gates.

## Safe Validation Performed

- `backend/tests/test_staging_configuration.py`: 4 passed.
- Staging Compose resolves with the checked-in example contract.
- Example staging validator correctly fails placeholders and missing external controls; it did not expose secrets.
- Backup, restore and rehearsal shell syntax passed.
- Frozen mapping validation: 136 unique IDs, 14 execution batches plus Batch 0 preflight, all `Not Run`.
- Payroll repair: Playwright discovery, TypeScript, and focused ESLint passed; no payroll mutation executed.

## Status

Local contracts fail closed as designed. The five strict dependencies are not locally remediable without approved ownership, credentials or external services. STG-1 remains blocked until affected scenarios are explicitly dispositioned and Batch 0 can capture deployed evidence.
