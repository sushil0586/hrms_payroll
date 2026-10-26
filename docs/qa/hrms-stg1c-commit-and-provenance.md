# HRMS STG-1C Commit And Provenance

Date: 2026-10-26
Decision: **BLOCKED pending explicit repository-owner commit approval**

## Git Boundary

- Branch: `main`
- HEAD and `origin/main`: `20d832996ef505f0b6c2df2673204e841e7b6a52`
- Approved candidate manifest: 38 unique existing paths
- Manifest SHA-256: `5b1782ee5deb6c7a561f8029c61091a1b1a721bbea037418110064a8af5d9805`
- Git index: empty
- Candidate commit: not created
- Proposed message: `test(qa): add controlled HRMS staging certification tooling`

Before creating the required STG-1C reports, the untracked candidate set exactly equaled the manifest. The three STG-1C reports are now deliberately outside that approved manifest. The required dashboard update changed one of the 38 approved paths after the STG-1B content-hash snapshot. Therefore a repository owner must review the updated dashboard plus decide whether the three STG-1C reports belong in a revised manifest; they cannot be silently included in the prior approval.

The only tracked working-tree modification is `web/tests/e2e/db6-payroll-processing.spec.ts`; its four-line payroll navigation repair is not in the manifest and remains untouched and uncommitted. No generated runtime manifest, evidence output, environment file, database file, key or credential is included.

This task explicitly states that it is not repository-owner approval. Consequently no `git add` or `git commit` was executed.

## Current Public Provenance

| Item | Result |
|---|---|
| URL | `https://hrms.accerio.in` returned HTTP 200 |
| Health | `/health/` returned HTTP 200 |
| TLS | Certificate verification succeeded; HSTS present |
| Public IP | `65.0.231.86` |
| AWS identity | `arn:aws:iam::227022022984:user/lightsail-staging-operator` verified |
| Lightsail inventory | Not verified: current identity is denied `lightsail:GetInstances` |
| Running image digests | Not verified in STG-1C |
| Running commit | Not verified in STG-1C |
| Migration revision | Not verified in STG-1C |
| Environment fingerprint | Not deployed/configured for this candidate |

Historical evidence records running commit `20d8329`, backend digest `sha256:e4fcf34a080973cf02bbf1341ab57251c5a827e9782dabd6b8eff169fc12337b`, web digest `sha256:03bb370c78bf7097c3acdf364443523936084ec183e921580484dc047c061c7a`, and 128 applied migrations. Those values are retained as historical, not relabeled as fresh STG-1C evidence.

## Authorized Commit Procedure

After explicit approval of this exact manifest:

```bash
git add --pathspec-from-file=docs/qa/hrms-stg1b-commit-manifest.txt
git diff --cached --check
git diff --cached --name-status
git diff --cached -- web/tests/e2e/db6-payroll-processing.spec.ts
git commit -m "test(qa): add controlled HRMS staging certification tooling"
```

The payroll diff command must produce no output. Push, deployment and scenario execution require separate authorization.
