# HRMS Document Download And Recovery E2E Certification

Date: 2026-11-05
Environment: `https://hrms.accerio.in`
Application revision: `4ff3ea086568175780023bc9009f3c6d419a1c15`
Decision: **PASS for the bounded staging document-download and recovery scope**

## Certified Scope

This certification covers authenticated ESS and HR Admin document downloads,
download audit attribution, denial behavior, protected artifact recovery,
off-host backup integrity, isolated PostgreSQL restore, immutable retention, and
centralized object-access auditing. It does not certify every unrelated document
lifecycle policy or production readiness.

## Application Evidence

| Case | Result | Independent evidence |
|---|---|---|
| ESS authorized clean download | PASS | HTTP 200; employee-code actor; one successful `DOWNLOADED` event |
| HR Admin authorized clean download | PASS | HTTP 200; canonical login actor; one successful `DOWNLOADED` event |
| Cross-employee download | PASS | HTTP 404; no download audit event |
| Cross-tenant HR download | PASS | HTTP 404; no download audit event |
| Quarantined artifact | PASS | ESS/HR HTTP 423; no successful download audit |
| Pending scan artifact | PASS | ESS/HR HTTP 503; no successful download audit |
| Scanner/error artifact | PASS | ESS/HR HTTP 503; no successful download audit |
| Missing artifact | PASS | ESS/HR HTTP 404; no successful download audit |
| Audit minimization | PASS | Metadata contains only audience and artifact reference; no file content or credential |

The synthetic run `qa-download-cert-20261105-01` used tenant
`pw-qa-staging-demo`, employee `QA-EMP-001`, and HR identity `QA-HR-001`.
Hard deletion was correctly rejected by the historical-record trigger. Exact
run-owned records were safely quarantined: five documents archived, category
disabled, employee upload disabled, no active documents, and no live files.
Historical audit rows were retained.

## Off-Host Recovery Evidence

Backup prefix:
`s3://accerio-hrms-staging-backups-227022022984-ap-south-1/hrms/staging/checkpoints/20261105T022558Z/`

| Artifact | Version / checksum |
|---|---|
| PostgreSQL custom dump | Version `J6Mx14xWqIYTqOeJWDECa_2qSh.Tjt_L`; SHA-256 `971de5930232534c284f522575cdfdb26603db0a3da9c3450eebb1c1863a9102` |
| Private media archive | Version `nclS93KOrg2l0BndHW3P2JOcow3mBOaq`; SHA-256 `21e6c5d18f8c453596f356646110948e97e563539e34e4f38e7678b264aa32f4` |
| Checksum manifest | Version `t371MV67ZjqtUVTFrWyNEs_6rs6FlUYz` |
| Backup metadata | Version `8KGwOEsLnnvguXwv_AlnB9tXZml3d45F` |
| Restore evidence | Version `7d6Q.TNkMDkgOLHCdKrxexgrY0d4EJ2X` |

The media archive contained 94 entries. An isolated PostgreSQL 16 restore
completed in 9 seconds. Source and restored counts matched exactly: 3 tenants,
18 memberships, 68 employee documents, 28 document audit events, and 135
migration rows. The disposable restore container, volume, and downloaded copies
were removed after verification.

## Storage And Audit Controls

| Control | Result | Observed evidence |
|---|---|---|
| Public access | PASS | All four S3 Block Public Access controls enabled |
| Object ownership | PASS | Bucket-owner-enforced; ACLs disabled |
| Encryption | PASS | Customer-managed KMS key `da2a2edd-3bbe-4043-81e0-68c01a3182df`; bucket key enabled; SSE-C blocked |
| Transport | PASS | Bucket policy denies insecure transport |
| Versioning | PASS | Enabled |
| Lifecycle | PASS | Current versions 120 days; noncurrent versions 90 days retaining 10 newer versions; incomplete uploads 7 days |
| Immutability | PASS | Object Lock enabled; default Governance retention 30 days |
| Checkpoint retention | PASS | All five checkpoint objects retained in Governance mode through `2026-12-05T02:54:21Z` |
| Server access logging | CONFIGURED | Target `accerio-hrms-staging-audit-logs-227022022984-ap-south-1`, partitioned `s3-access/` prefix; first asynchronous delivery was not yet present during the observation window |
| CloudTrail data audit | PASS | Multi-region trail `accerio-hrms-staging-backup-audit` active with log-file validation and S3 object events limited to `hrms/staging/` |
| Central audit delivery | PASS | Signed digest and event files delivered to the private audit bucket |
| Operator evidence access | PASS | Managed policy `HRMSBackupGovernanceReadOnly` grants only six required read-only S3 governance actions |

The final retained audit probe
`hrms/staging/audit-probes/20261105T030000Z-certification.txt` is KMS-encrypted
and retained in Governance mode through `2026-12-05T02:59:09.645Z`.
CloudTrail centrally recorded:

- `PutObject` at `2026-11-05T02:59:09Z`
- `HeadObject` at `2026-11-05T02:59:10Z`
- actor `arn:aws:iam::227022022984:root`
- the exact source bucket and object ARNs

## Verdict And Residual Risk

The bounded end-to-end chain is certified: authorized application download,
least-privilege denial, minimized application audit, encrypted off-host backup,
checksum validation, isolated database/media recovery, immutable retention, and
centrally delivered object-access evidence all passed.

Residual operational observations:

1. Confirm the first S3 server-access-log object during the next routine audit;
   CloudTrail object-level audit delivery is already proven and remains the
   authoritative access evidence.
2. Governance mode permits an explicitly privileged bypass. Production policy
   may require Compliance mode or a longer retention period after legal approval.
3. This report does not close unrelated malware-provider, document-visibility,
   or production-readiness decisions recorded in DD-2.

No application deployment, database migration, payroll processing, employee
communication, or production mutation occurred during the governance closure.
