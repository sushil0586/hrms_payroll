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
| Immutability | PASS | Object Lock enabled; certified artifacts carry explicit 30-day Governance retention |
| Checkpoint retention | PASS | All five checkpoint objects retained in Governance mode through `2026-12-05T02:54:21Z` |
| Server access logging | PASS | Target `accerio-hrms-staging-audit-logs-227022022984-ap-south-1`, partitioned `s3-access/` prefix; 17 server-access objects observed after asynchronous delivery |
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

1. Governance mode permits an explicitly privileged bypass. Production policy
   may require Compliance mode or a longer retention period after legal approval.
2. This report does not close unrelated malware-provider, document-visibility,
   or production-readiness decisions recorded in DD-2.

No application deployment, database migration, payroll processing, employee
communication, or production mutation occurred during the governance closure.

## Automated Recovery Qualification

The staging host now runs two bounded systemd timers:

| Timer | Schedule | Verified behavior |
|---|---|---|
| `hrms-staging-backup.timer` | Daily, approximately 01:30 UTC with randomized delay | PostgreSQL custom dump, private-media archive, source counts, metadata, and SHA-256 manifest uploaded to the scheduled prefix |
| `hrms-staging-restore-rehearsal.timer` | First Sunday monthly, approximately 03:30 UTC with randomized delay | Latest scheduled artifact downloaded, checksummed, restored into a network-isolated PostgreSQL 16 container, reconciled, and removed |

Both timers are enabled. Failed units trigger the local failure recorder and do
not replace the previous success record. The host identity has an inline policy
limited to `hrms/staging/scheduled/*`, the existing backup KMS key, and the
object-retention operations required for that prefix.

Qualified scheduled backup:
`s3://accerio-hrms-staging-backups-227022022984-ap-south-1/hrms/staging/scheduled/20261105T032938Z/`

- manifest SHA-256: `26a693038dffea8d3187740861b68a2d6ce885243e4f2ffabd97bb8e3a120937`
- all four objects: SSE-KMS and Governance Object Lock through
  `2026-12-05T03:29:38Z`
- restore duration: 8 seconds
- reconciled counts: 3 tenants, 18 memberships, 73 employee documents, 32
  document lifecycle events, and 136 migrations
- private-media archive entries: 96
- disposable restore containers remaining: zero

The initial automation qualification deliberately preserved three failed-run
causes: obsolete membership table name, unavailable `postgres` shell binary,
and missing KMS permission. A fourth rehearsal exposed the PostgreSQL image's
temporary initialization-server race. The final scripts use the canonical
membership table, `pg_dump --version`, least-privilege KMS access, retained
`s3api put-object` uploads, and a stable two-phase PostgreSQL readiness gate.

## Document Lifecycle Regression

PostgreSQL-backed qualification passed **34/34** focused tests. Coverage
included upload policy and signatures, malware clean/detected/error states,
replacement lineage, withdrawal, rejection and re-upload, concurrent upload
serialization, employee/tenant ownership, physical-file cleanup, notifications,
audit events, and download authorization.

The production-built browser qualification covered the 15-case document slice
on Chromium, Firefox, and WebKit. The first run used the production default
`Secure` cookie on a plain-HTTP local URL, producing 401s in API-context calls
and broad WebKit session rejection. This was a local harness configuration
defect, not a product-code defect. With `HRMS_COOKIE_SECURE=false` limited to
the local HTTP harness:

- Chromium/Firefox failed-contract rerun: **8/8 passed**
- WebKit complete slice: **15/15 passed**
- browser tests were unchanged
- HR upload, review, employee download, cross-employee denial, replacement
  lineage, report persistence/export, responsive layouts, keyboard focus,
  pagination, validation, and duplicate suppression passed

Static verification also passed: TypeScript, ESLint, Django system checks,
migration drift, shell syntax, unit-file verification, and Git whitespace checks.

## Production Control Handoff

Staging is certified for the bounded document lifecycle and recovery scope.
Production activation still requires owner-approved values rather than inferred
defaults:

1. legal/security approval for Governance versus Compliance Object Lock and the
   production retention duration;
2. a production KMS key and separate backup/restore identities scoped to the
   production bucket and prefix;
3. an external malware-scanner availability and fail-closed operating decision;
4. production RPO/RTO targets, named recovery owner, and alert destination;
5. a production recovery rehearsal in an approved isolated account or network.

Authenticated application streaming remains the approved staging download
mechanism. It preserves authorization checks and download audit attribution;
switching to direct signed URLs is not required for staging certification.
