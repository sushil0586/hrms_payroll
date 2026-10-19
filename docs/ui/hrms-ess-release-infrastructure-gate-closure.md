# ESS release infrastructure gate closure assessment

Assessment: **2026-10-19, 16:21 UTC onward**. **Synthetic ESS staging promotion: NO-GO. Real-payroll production: NO-GO.** The deployed HRMS is unchanged. This assessment closes evidence collection and procedure preparation; it does **not** claim that blocked operational gates are satisfied. No deployment, resource creation, IAM/configuration change, backup activation, alert message, schema operation or customer-data mutation occurred.

Evidence: [fresh infrastructure inspection](../qa/evidence/ess-release-infrastructure-gates/). Authoritative baseline: [mixed-operation ledger certification](hrms-ess-ledger-mixed-concurrency-certification.md), [final blocker closure](hrms-ess-final-blocker-closure.md), [ESS tracker](hrms-ess-coverage-tracker.md), [stabilization](../qa/hrms-lightsail-staging-stabilization.md), [operational protection](../qa/hrms-lightsail-operational-protection.md) and [previous promotion readiness](hrms-ess-staging-promotion-readiness.md). Historical failures and frozen statuses are retained.

## Gate results

| Gate | Decision | Fresh evidence / required closure |
|---|---|---|
| Reviewed candidate source | BLOCKED | HEAD exists, but ESS and ledger source remains modified/untracked. No reviewed commit contains the exact candidate. Review and commit the reconciled scoped candidate in a clean release checkout. |
| Immutable candidate image pair | BLOCKED | No candidate registry digests or provenance-linked image pair. Base tags and Python requirements float. Prepare pinned inputs, approved off-host builds, SBOM/scan/signature evidence and test exact digests. |
| Migration compatibility | PASS for inspected delta | 127 applied nodes match candidate graph; no changed migration bytes or model drift. No forward migration or database reversal is required. |
| Mixed ledger concurrency | Prior scoped PASS retained | 74 unique backend checks +10 supplementary and 27 browser checks are historical local evidence, not newly executed or candidate-image certification. No logic changed in this assessment. |
| Encrypted off-host backup | BLOCKED / unverified | S3 discovery denied; no approved bucket/key/object-version/backup-set manifest provided. Same-host dump is not host-loss recovery. |
| Isolated restoration | BLOCKED / unexecuted | No restored database/artifact reconciliation or measured RPO/RTO for a verified off-host set. |
| Current CPU/burst/snapshots | BLOCKED by permissions | Requested six-hour CPU/burst/status metrics and snapshot/instance reads denied. Do not substitute historical depleted-burst results or idle samples for current capacity proof. |
| Runtime health/network/TLS | PASS for sampled idle state | Seven containers running, four healthy checks, zero restarts/OOM; HTTPS and login/health return200. This is not load certification. |
| Infrastructure/backup alert delivery | BLOCKED / unverified | Two SES alarms are configured/OK with a confirmed email subscription; no fresh infrastructure ALARM/OK delivery evidence. |
| Deployment/rollback preparation | Prepared, not execution-certified | Guarded application-image script syntax passed; base Compose syntax passes without runtime secret expansion. Candidate manifests and deployed-only smoke harness still require completion/acceptance. |

## Exact source and image provenance

Local HEAD: **`64cf9f38b0a625781d6bc7dc0dd41f400815f9f0`** (`stabilize HRMS Lightsail staging`). It is **not a reviewed ESS release commit**. `git-status.txt`, `head.txt`, `tracked-diff.txt` and `candidate-changed-source-hashes.json` record the current worktree; no commit or cleanup/reset was performed.

Fresh hash inventory against source extracted read-only from running images: **54 core source/dependency files differ**: backend4changed+1added; web/root33changed+16added. The exhaustive paths and before/after hashes are in [source-to-image-delta.md](../qa/evidence/ess-release-infrastructure-gates/source-to-image-delta.md) and its JSON. This table excludes QA and host configuration; the separate candidate changed-source inventory includes tests/infrastructure. The previous source inventory remains historical and is not overwritten.

Reconciled application scope: employee attendance month projection and scoped integration; ESS navigation and employee pages; centralized design-system/shell/accessibility/SSR changes including MSS/Platform shared-shell consumers; profile/requests/settings/inbox; leave cancellation refresh; documents/payslip dialog behavior; lazy-accrual transaction lifetime, locked idempotency lookup and mixed-operation balance-before-lot/allocation ordering. Backend files are `apps/common/api_views.py`, new `apps/common/ess_attendance.py`, `apps/iam/menu_catalog.py`, `apps/leave_management/services.py` and `apps/leave_management/year_end_services.py`. No untracked work is assumed reviewed merely because earlier tests passed.

| Running component | Reference | Observed local image/config identity |
|---|---|---|
| Backend, worker, beat | `hrms-backend:520202d-stagefix1` | `sha256:1d51cfa8a6c22be9f74df066e70c7e34eac16109dcb2f8ca999f82ea9501e881` |
| Web | `hrms-web:520202d-stagefix1` | `sha256:279457f8529b908b7f3231de4f65f1347be1a796cf73743768a8187f8c20aad3` |

Both are Linux/amd64. Image creation times are2026-10-18T08:10:57Z and09:24:29Z respectively. OCI revision labels are absent. The local `RepoDigests` repeat these identities but do **not** prove a remotely retrievable registry manifest. `running-images.json` records all seven images. Current images remain present and unmodified; no prune was run. Off-host saved-image retention/load verification is still required for portable recovery. The prior `520202d` plus staging-hotfix provenance must not be relabeled as a clean ESS candidate.

`release-manifest.draft.json` deliberately leaves candidate commit/digests null and marks execution unauthorized. Inventing those values or publishing the dirty worktree would not close provenance. Build/test-to-image mapping must include the mixed-operation fix, not just the earlier frontend artifact.

## Migration, configuration and dependency assessment

Fresh read-only database inventory and offline graph/autodetector: **127 / 127 nodes; zero missing/unknown nodes; zero migration-file delta; zero model drift** (`applied-migrations.txt`, `migration-assessment.json`). No migration forward/rollback was executed or claimed. If the eventual reviewed commit adds schema changes, this decision expires and isolated forward/rollback verification is required.

- `web/package.json` / `pnpm-lock.yaml`: `axe-core`4.12.1 added as a development accessibility dependency. No Python requirement change in the current delta; Python ranges nevertheless prevent deterministic dependency resolution across new builds.
- Existing Dockerfiles use `python:3.12-slim` and `node:24-slim`, unpinned apt packages and an unpinned pip upgrade; Python requirements use version ranges. Resolve reviewed digests, dependency hashes/toolchain/OS package inputs before claiming reproducible production builds. `pnpm install --frozen-lockfile` alone does not freeze base images or Python dependencies.
- `infrastructure/lightsail/hrms.env.example` contains separate SES SMTP example configuration/placeholder changes. This is a deployment dependency requiring explicit reconciliation with the already managed host environment, not authorization to overwrite it. Do not commit SMTP credentials or copy the example to `.env.hrms`.
- Preserve existing staging environment, demo=false, secure cookies, canonical public URL, provider-payment worker disablement and erasure protections. The backend sample has no explicit provider-worker variable; that absence is not proof of an enabled provider. Verify effective flags for all workers during release validation.
- Build from an accepted Git archive/sanitized context, never the dirty developer directory. The backend Dockerfile copies the backend tree; `.dockerignore` does not explicitly exclude backend media/staticfiles. No media/backups are currently tracked, but ordinary working-directory builds can include runtime files. Reject such context contents before publishing.

Base Compose and provisioning/preflight shell syntax passed locally. Compose validation used `--no-env-resolution --no-interpolate`; no runtime credential file was loaded. Live Compose/Caddy hashes match historical values `4288ec84…` / `55c2f44d…`. No infrastructure manifest was changed.

## Backup, restore and IAM evidence

The only visible host backup is **2026-10-18T08:52:50Z**, **1,303,256 bytes**, custom PostgreSQL16.15 dump. SHA-256 remains **`7a9d3def19dc127e71ba9636e1e577cafb7ff84c024d9c5cfa883c9278eeb34c`**. `pg_restore --list` succeeds with2,307 TOC entries. It is approximately31.5 hours old at inspection, exceeding the proposed 26-hour backup-age threshold. This threshold is an earlier proposal, not an approved customer retention policy.

An initial archive read was denied by filesystem permissions because the outer SSH shell opened the redirected file. Repeating the read inside `sudo sh` succeeded; both errors/catalog evidence are retained. No dump was created or restored. Catalog readability does not demonstrate transaction/artifact consistency, recoverability or completeness. There is no supplied artifact archive, per-file manifest, configuration/secret recovery set, off-host object version or KMS metadata. No HRMS backup timer was evident in the system timer/root-cron inventory; other operators or off-host jobs cannot be ruled out from that inventory alone.

Current operator: `lightsail-staging-operator`, account 227022022984, region ap-south-1. Fresh S3 ListBuckets and KMS ListAliases calls are denied. This does not prove that no bucket/key exists or that resource-scoped access would be denied. An owner must provide the approved bucket/prefix, key ARN, immutable backup versions, retention owner and restore evidence.

Required least-privileged access/approvals, **not applied**:

- Read-only Lightsail instance/metric/snapshot/alarm/contact/port-state actions for this instance/region; corresponding denied operations are retained individually. Restore snapshot-status visibility before asserting retention or automatic snapshots.
- Approved-prefix S3 ListBucket/GetObject/GetObjectVersion and encryption/retention/versioning metadata reads; scoped PutObject only for an authorized backup operator. Discovering the whole account is not necessary when a bucket is supplied.
- KMS DescribeKey/Decrypt for a restore role, Encrypt/GenerateDataKey for the approved writer, with bucket/key policy and ownership review; no broad admin grant.
- Approved encrypted storage/retention/budget, snapshot spend and operations recipient. Alert tests send messages and require explicit authorization; none were sent here.

Run a disposable isolated restore only after a complete accessible verified set is available. Restore database and artifacts to separate volumes with exact recorded images, outbound providers/schedulers disabled; reconcile schema, critical tables, tenant isolation, protected ledger/history and authorized downloads. Record elapsed time and source data age. Earlier proposed24-hour RPO / 4-hour RTO is not measured or production-approved. Snapshot inventory/retention is **currently unverified**, with historical “none” retained separately.

## Fresh infrastructure measurements

Host sample at 16:22 UTC:

| Item | Observed |
|---|---|
| RAM | 3,832MiB total;1,652MiB available;268MiB free |
| Swap | 4,095MiB configured;155MiB used; zero swap-in/out in the two interval samples |
| Disk | 21GiB used/77GiB;27%;56GiB available |
| CPU | Short idle vmstat interval96–99% idle; **six-hour Lightsail CPU/burst/status metrics denied** |
| Containers | Seven running; web/backend/PostgreSQL/Redis healthy; all zero restarts and OOM flagsfalse |
| Beat | 159.5MiB/192MiB (~83%); inspect sustained growth before accepting release capacity |
| Web / backend | 391/768MiB and406.6/768MiB |
| PostgreSQL | 16.15;26,680,343bytes;7connections/100maximum |
| Docker footprint | Images5.597GB; build cache9.082GB; no prune/cleanup performed |

The 4GB/two-vCPU host remains suitable only for bounded HRMS synthetic QA under previously documented conditions. Idle headroom does not supersede historical authenticated SSR pressure or exhausted burst reserve. No on-host builds, stress workload, Finacc/GST co-location or resize was attempted/approved. All service limits sum above physical RAM; they are limits, not reserved memory or capacity certification. Beat memory is a risk to monitor, not proof of a leak from one sample.

TLS1.3 with verified certificate chain/hostname; root, login and API health all HTTP 200. HSTS, nosniff and strict-origin referrer headers present. Host public application listeners 80/443; SSH 22 is restricted by UFW to the recorded operator IPv4. PostgreSQL/Redis/backend/web have no public host listener. Lightsail firewall-state read is denied, so current cloud-firewall equivalence remains unverified. Caddy routes `/api/v1/*` to backend and other application requests to web. Certificate expiry is 2027-01-16, as recorded in `public-tls-health.json`.

CloudWatch read succeeds: **two SES reputation alarms, bothOK, actions enabled**. Target-topic subscription read shows a confirmed email subscription (endpoint redacted in evidence). Global SNS listing is denied. No CPU/memory/disk/container/database/backup-age alarm or actual ALARM/OK delivery is evidenced. SES delivery certification cannot substitute for infrastructure recovery alerting. Native Lightsail alarm/contact reads are denied; their present absence is not inferred from the denial.

## Executable release and rollback preparation

[Deployment/rollback runbook](../qa/evidence/ess-release-infrastructure-gates/deployment-rollback-runbook.md) defines clean-commit archive builds, digest/SBOM/provenance capture, recovery prerequisites, maintenance order, rollback, synthetic fixture ownership and smoke acceptance. [Guarded application-image script](../qa/evidence/ess-release-infrastructure-gates/apply-approved-images.sh) passed `bash -n`; it was **not executed**. It requires explicit target confirmation, accepted-gate evidence and a reviewed absolute override, validates expected local image identities and digest references, then changes only the four application services. It never builds/pulls, migrates or replaces database/media volumes. A failure leaves schedulers stopped pending operator recovery. Script syntax is not deployment certification.

Rollback must retain/load-verify the old pair, use the previous approved override/IDs and preserve PostgreSQL/media/history. No schema reversal is necessary for this delta. Never use `down -v`, blanket pruning or automatic database restoration as an application rollback. An actual rollout/rollback rehearsal against the exact candidate images remains unexecuted.

The runbook defines **20 smoke scenarios × three engines = 60 planned browser executions**, including authentication/Firefox diagnostics, all requested ESS modules, HR/MSS navigation, ownership/privileged negatives, historical protection and responsive keyboard use. Zero of these planned executions ran here. Deterministic ledger concurrency belongs in isolated PostgreSQL candidate-image verification; run only bounded real synthetic approval/cancellation state transitions on shared staging. Existing local fixture servers cannot safely be retargeted unchanged. The deployed-only harness/fixture manifest is an explicit remaining dependency, not falsely counted as an implemented or passing suite.

## Restrictions and final decision

No new browser/API functional regression suite ran in this read-only assessment. Prior 204 frozen,74backend+10repeat and 27browser results remain historical. No actual screen reader, native zoom or formal WCAG reassessment occurred. Documented accessibility limitations may be proposed to the release owner for a restricted synthetic QA acceptance; this report does not waive them or certify conformance. Any blocking keyboard/dialog/access defect in candidate smoke remains a stop condition.

Fresh checks establish source/image inventory, schema compatibility, sampled health/TLS and prepared procedures. They **do not close** candidate provenance, recovery, current metric visibility, alert delivery or candidate-image smoke. Therefore both **synthetic staging promotion and real-payroll production remain NO-GO**. The unproven original Firefox reset trigger remains a candidate smoke stop condition.

Next approvals/evidence: release-owner review of the source commit; named registry/build/security owner; approved backup bucket/key/retention/budget and IAM; verified complete off-host set and isolated restore; current capacity and alarm delivery; then exact-image smoke/rollback rehearsal and a new explicit deployment authorization. No billable resource or message was created to bypass these missing inputs.

Final image/restart verification matches all seven initial containers (`nonmutation-verification.json`). Frozen 40-gate CSV hashes remain unchanged. No synthetic fixture/infrastructure was created in this assessment; only local report/scripts/evidence were added. No ESS features or MSS work began. Stop at this assessment.
