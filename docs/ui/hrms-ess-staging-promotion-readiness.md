# ESS staging promotion readiness

Assessment: 2026-10-19, approximately 15:57–16:08 UTC. **Decision: NO-GO for promotion now**, including synthetic-only staging. This was a read-only assessment. No deployment, migration, restart, AWS resource creation, alert test, credential change or business-data mutation was performed. The opening request to deploy is constrained by the explicit “READ-ONLY … Do not deploy” instruction.

Target: [existing HRMS staging](https://hrms.accerio.in). Evidence: [`ess-staging-promotion-readiness`](../qa/evidence/ess-staging-promotion-readiness/). The [blocker closure](hrms-ess-final-blocker-closure.md), [coverage tracker](hrms-ess-coverage-tracker.md), [ESS-6A](hrms-ess6a-browser-remediation-certification.md), [visual/accessibility assessment](hrms-ess-final-visual-accessibility-acceptance.md), [operational protection](../qa/hrms-lightsail-operational-protection.md), [stabilization](../qa/hrms-lightsail-staging-stabilization.md), [SES evidence](../qa/hrms-lightsail-ses-integration-2026-10-18.md) and actual running containers inform this decision.

## Decision and blocking prerequisites

| Priority | Finding | Evidence required before reconsideration |
|---|---|---|
| P0 | No clean, immutable candidate release exists. Current ESS work is modified/untracked; local build IDs are not deployable, registry-verifiable release manifests. | Review and commit the exact scoped candidate, preserve synthetic-only configuration, build off-host for `linux/amd64`, record paired backend/web OCI digests, lockfile/base-image provenance, SBOM/scan/signing evidence and test-to-image mapping. |
| P0 | Verified encrypted off-host backup and isolated restore certification are not demonstrated. A same-host bootstrap dump is not host-loss protection. | Verify an approved off-host database/artifact/configuration backup set, immutable versions/checksums, retention/ownership and a timed isolated restore using the intended images. No resource or backup activation was attempted here. |
| P0 readiness gap | Ledger same-balance replay is locally verified, but mixed approval/cancellation/expiry lock ordering is not certified. | Review the balance/lot/allocation lock graph and execute deterministic mixed-operation PostgreSQL tests, with bounded outcomes, no duplicate effects, and full transaction rollback verification. Static risk is not asserted to be an observed new deadlock. |
| P0/P1 operational gap | Current CPU/burst reserve and infrastructure alert delivery cannot be confirmed. Operator metric permissions are denied. Idle health cannot establish deployment/build capacity. | Approved read-only metric access and a fresh representative window; verified CPU/burst/memory/disk/database/backup-age alert routes and named responder. No permission or alarm changes were made. |
| Open local condition | Original Firefox login TCP reset did not recur, but its trigger is unproven. | Keep this condition explicit; collect socket/request-lifecycle evidence if it recurs. Require candidate-image Firefox login/redirect repetition before promotion; any new reset, auth-context leak or hydration error stops promotion. |

These are entry conditions for a new decision, not automatic authorization to deploy. Real payroll, statutory production use and customer onboarding remain outside scope.

## Running image and source provenance

Fresh SSH inspection used the existing key and `ubuntu` account with read-only sudo commands. A first `deploy` login was rejected by public-key authentication; no SSH configuration was changed. The web fetch tool could not open the site; direct TLS-verified HTTP GETs subsequently returned **200 for `/` and `/api/v1/health/`**. No authenticated staging browser suite was executed.

| Component | Running reference | Running image ID / recorded local repository digest |
|---|---|---|
| Backend, Celery worker and beat | `hrms-backend:520202d-stagefix1` | `sha256:1d51cfa8a6c22be9f74df066e70c7e34eac16109dcb2f8ca999f82ea9501e881` |
| Web | `hrms-web:520202d-stagefix1` | `sha256:279457f8529b908b7f3231de4f65f1347be1a796cf73743768a8187f8c20aad3` |

Both are Linux/amd64. Backend image creation: 2026-10-18 08:10:57 UTC; web: 09:24:29 UTC. OCI revision labels are absent. The recorded `hrms-*@sha256:…` repository entries do **not** establish that an off-host registry can supply those images; registry availability or a verified recovery archive remains a prerequisite. All seven image IDs, architecture, health, restart counts and creation metadata are in `running-images.json`.

Deployed Git base is `520202d84ac2e5b41359cd5485becba1176c4516`, with dirty hotfix files `web/Dockerfile` and `web/src/app/platform-admin/platform-admin-renderer.tsx`. Local HEAD is `64cf9f38b0a625781d6bc7dc0dd41f400815f9f0`, which records the stabilization work, but the ESS candidate remains dirty. Therefore neither HEAD alone identifies the candidate nor the deployed base alone identifies its running bytes. Actual container source hashes are used below.

Prior local browser artifact: `Hh1gsxi5NfSm1AoXK9kl1`; fresh local Next build: `E0Ia9xxLsPnlRn1Ozm4RE`, with previously verified matching frontend source. The previous local backend build ID was `sha256:6ba86e1898483186334708ee7507ce30190d65386992329ffeed0abf9c26e409`; its temporary tag/image was removed after certification. These are inherited local build proofs, not new release images or a Linux/amd64 promotion manifest.

## Exact source-to-image delta

[Per-file runtime-source comparison](../qa/evidence/ess-staging-promotion-readiness/source-to-image-delta.md) records running and candidate SHA-256 values. It covers 288 running backend core files and 716 running frontend/root package files. The current candidate has 289 and 732 respectively:

| Scope | Changed | Added | Deleted |
|---|---:|---:|---:|
| Backend runtime/configuration/requirements | 4 | 1 | 0 |
| Frontend source/public/package/build inputs retained in runtime | 33 | 16 | 0 |
| Additional backend tests copied by the existing Dockerfile | 1 | 13 | 0 |

Thus **54 core source/package differences**, plus **14 embedded backend test differences**, are measured against actual running images. Four `packages/*/README.md` entries initially appeared absent from runtime; the runtime Dockerfile does not copy that directory, so they are excluded from the core runtime delta. This distinction avoids treating build-only documentation as new application functionality. Additional `next.config.mjs`, ESLint configuration and generated declaration checks matched; see `additional-source-hashes.json` and `additional-image-delta.json`.

Backend differences are exactly:

- `backend/apps/common/api_views.py`: attendance self projection integration.
- New `backend/apps/common/ess_attendance.py`: employee monthly calendar/list/day/permission projection.
- `backend/apps/iam/menu_catalog.py`: ESS profile navigation entry.
- `backend/apps/leave_management/services.py` and `year_end_services.py`: atomic accrual and idempotency/row-lock sequencing.

Frontend differences include ESS Dashboard/Profile/Attendance/Leave/Documents/Payslips/Statutory/Requests/Notifications/Settings, shared Accerio tokens/components, keyboard table regions, dialog/loading/navigation feedback and companion MSS/Platform Admin hydration boundaries. The exact 49 frontend/root package paths are enumerated in the linked comparison; they must be reviewed as one scoped candidate rather than deploying only the last two ledger files.

Dependency delta: `axe-core` **4.12.1**, declared as a dev dependency in `web/package.json`, and its `pnpm-lock.yaml` entry. Backend requirements, root package manifest, base Dockerfile definitions and shared package source have no measured change. The existing web Dockerfile copies the installed dependency tree, so “dev dependency” does not by itself prove exclusion from the resulting runtime image. No second UI component library is introduced.

[Complete checkout/build-context source inventory](../qa/evidence/ess-staging-promotion-readiness/full-source-delta.md) accounts for **100 differences: 53 additions and 47 changes**, across backend 19, web 75, infrastructure 5 and root lockfile 1. This includes QA sources/configurations excluded from the core runtime comparison; it is not an additional 100 runtime changes. Documentation/evidence and secrets are excluded from that candidate source manifest. The current `.dockerignore` excludes web tests, evidence, dependencies/build outputs and environment secrets; backend tests remain included by `COPY backend .`.

Infrastructure: host Compose and Caddy hashes match the candidate. Four local provisioning/readme/script files are absent from the host deployment tree; they are procedural inputs, not changes applied to the running host. The fifth difference is `hrms.env.example`'s SES placeholder configuration. Actual SES runtime configuration already exists, per the SES report; **never replace the protected live environment with the example file**. No database model or migration source differs. A complete new image-layer delta is unavailable because no immutable candidate image has been built for this promotion.

## Migration and rollback assessment

Fresh read-only staging SQL returned **127 applied migration records**. Local offline `MigrationLoader(None)` and model autodetection found:

- 127 candidate graph nodes; no missing or unknown applied nodes.
- No changed migration-file hashes against the running backend image.
- No model drift; empty forward plan and no new migrations to reverse.

See `migration-assessment.json` and `migration-review.txt`. This verifies the **no-op migration decision locally without a database connection or DDL**. It does not claim a new physical forward/reverse/restore rehearsal. The previous local suite's fresh-database migration success is inherited evidence, not rerun here.

For this candidate, do not run speculative migrations, fake migration records, reverse historical migrations or restore an old database over valid new records. An application rollback should preserve schema and data, restore the approved prior backend/web pair and matching worker/beat backend image, and recheck ledger/payslip/close invariants. The previous backend reintroduces the known concurrent-read availability defect; rollback is recovery under a quiet window, not proof that the old bug is solved. New frontend projection expectations also require a paired release/rollback, not an unsupported new-web/old-backend mixture.

## Ledger transaction and PostgreSQL review

Staging is **PostgreSQL 16.15, READ COMMITTED**, with the partial unique index `uniq_leave_ledger_command` on `(tenant_id, idempotency_key)` still enforced. Local concurrency certification also used PostgreSQL 16.15, on a different architecture. No unsupported PostgreSQL syntax or schema change is introduced by Django atomic transactions or `SELECT FOR UPDATE OF self`.

The fix retains the governed balance lock until scheduled shortfall, ledger transaction and entitlement lot creation complete. It checks replay identity after locking the same balance. This prevents two stale reads from issuing the same accrual, preserves command-payload conflict rejection and serializes a balance rather than all requests. Existing period checks, authorized ledger writes, immutable journal fields, decimal calculations and historical protections remain.

Inherited evidence: three new concurrent/negative tests plus 13 existing DB3 tests passed; 12 authenticated parallel dashboard reads returned 200, with one accrual/transaction/lot and ledger version 1. These were not re-executed in this assessment.

**Deadlock review is conditional, not a deadlock-free claim.** Source orders are not globally uniform:

| Path | Observed lock order |
|---|---|
| Lazy accrual helper | Balance → ledger command/new entitlement lot |
| Governed approval/consumption | Reservation allocation release → balance → entitlement lots |
| Cancellation reversal | Consumed allocations → entitlement lots → balance in ledger append |
| Expiry helper | Entitlement lots → balance; no active caller found in the reviewed application call sites |

Approving one request while cancelling another against shared lots can therefore present a balance/lot lock-order cycle. This is a **static, partly pre-existing risk**, not a newly reproduced staging failure or proof that this patch introduced it. The earlier tests cover same-balance command races and some rollover concurrency, not every mixed operation. Checking an already-applied command now also waits for the balance lock. Staging `lock_timeout=0` and `deadlock_timeout=1s`; PostgreSQL can abort a deadlocked transaction, but this does not certify bounded client feedback or safe application-level retry. No retry, timeout tuning or locking change was made here. Require targeted mixed-operation evidence before claiming transaction safety complete.

## Fresh infrastructure inspection

Host: `saas-staging-01`, Ubuntu host reached at the existing static IP. Measurements at approximately 15:57–15:59 UTC:

| Item | Fresh evidence / interpretation |
|---|---|
| CPU/load | Load 0.06/0.05/0.06; short vmstat samples 84–100% idle. Idle snapshot only, not burst reserve or QA-load evidence. |
| RAM | 3,832 MiB total; 2,154 used; 1,677 available. |
| Swap | 4,095 MiB configured; about 155 MiB used; two interval samples show no swap-in/out. |
| Disk | 21 GiB used of 77 GiB, 27%; 56 GiB free. Docker build cache 9.08 GB, mostly reclaimable. No pruning performed. |
| Containers | Seven running, four configured health checks healthy; all restart counts 0 and OOM flags false. Worker/beat/Caddy have no configured Docker health status, so running is not equivalent to workflow health. |
| App memory | Web ~388 MiB/768 MiB; backend ~406 MiB/768 MiB; worker ~168 MiB/512 MiB; beat ~159 MiB/192 MiB. Beat has limited headroom. |
| Database | 25 MB; seven pg_stat_activity entries including background processes and inspection; one client active and one idle; sampled blocked count 0. No stress test. |
| Redis | ~18.38 MiB reported used memory; running/healthy. This does not certify broker recovery or queue processing. |
| Exposure | Only Caddy binds public 80/443; application, PostgreSQL and Redis ports are container-private in the inspected port mapping. |
| Safety | Both recorded tenants are sandbox-flagged (2/2); demo and irreversible-erasure flags false; worker payroll-provider flag false. This is configuration/count evidence, not a row-by-row data-content audit. |

The AWS identity is the existing `lightsail-staging-operator`. Fresh `GetInstance`, `GetInstanceMetricData`, `GetAlarms`, `GetContactMethods`, `GetInstanceSnapshots` and CloudWatch `ListMetrics` calls were **AccessDenied**. Current Lightsail CPU/burst/status history, snapshots and native alarm/contact inventories are therefore **UNVERIFIED**, not zero or healthy. No permissions were broadened. The older depleted-burst evidence remains a concern, not a current measurement.

Do not build on this host, introduce another product, create capacity load or infer capacity acceptance from these idle measurements. Off-host builds and a guarded synthetic QA window are prerequisites for any later proposal.

## Backup, restore and alert status

Fresh checksum of the sole observed local bootstrap dump matches `7a9d3def19dc127e71ba9636e1e577cafb7ff84c024d9c5cfa883c9278eeb34c` (1,303,256 bytes, dated 2026-10-18). It remains on the same instance. No HRMS backup job appeared in the inspected system timers or root/deploy crontabs. These observations do not exclude an externally scheduled backup, but **no verified encrypted off-host set or successful isolated restore was supplied or discovered**. The historical archive-list check is not a restore. No dump, restore, snapshot or backup upload was created now.

The earlier operational-protection document predates later SES monitoring work. Fresh CloudWatch inspection confirms two SES bounce/complaint alarms, both OK with actions enabled; SNS lists a confirmed email subscription without exposing its endpoint. Historical SES evidence includes owner-confirmed email/event receipt. This is **not** proof of CPU/RAM/disk/database/backup-age alert delivery. No new email, test notification or alarm transition was triggered. Current general infrastructure alarm inventory is denied and remains unknown. Off-host backup, timed restore, general alerting and named recovery ownership stay open.

## Proposed synthetic staging smoke suite — not executed

Run only after a new approved promotion decision, verified release/rollback manifests and resource window. Reuse existing approved sandbox identities; bind a run ID and explicit tenant/employee allowlist. Mutating smoke cases require disposable fixtures in an approved sandbox and verified cleanup; no customer rows, live mail/payment/provider operations, raw punches or finalized history may be altered. Capture image digests, browser versions, traces, request IDs and database invariants. Do not reuse local fault-proxy configurations against public staging.

| ID | Smoke case | Required observations |
|---|---|---|
| S01 | Dashboard | Own identity/attendance/leave/status; canonical actions; controlled parallel first reads; no 500, one accrual/lot, intact unique index. |
| S02 | Profile | Every authorized section, refresh/deep links, masking/read-only controls, no other employee data. |
| S03 | Attendance | Period/calendar/list/day detail/timezone boundary, punches only when authorized, historical close read-only and checksum preserved. |
| S04 | Leave | Balance/history, validation, own request, authorized manager decision and permitted cancellation; pending versus direct cancellation correct; balance/ledger reconciliation. |
| S05 | Documents | Own permitted review/download and disposable upload where approved; cross-employee/tenant/direct-key denial; no provider/storage claim inferred. |
| S06 | Payslips | Published-only history, exact amounts, review/download/read persistence, mobile scrolling/focus, protected source checksums; unauthorized API rejection. |
| S07 | My Requests | Types/status/source links, filters/search/sort/pagination, refresh, keyboard scrolling including WebKit; no fabricated universal workflow. |
| S08 | Notifications | Inbox/category/time, supported read/unread idempotency and retry, stale-response rejection, source links; no outbound mail test. |
| S09 | Settings | Approved navigation/preferences only; employee cannot access HR/tenant roles, payroll configuration or unsupported security changes. |
| S10 | Authentication/Firefox | Fresh contexts, real UI login/logout and platform redirect, employee→manager→employee and HR Admin role isolation; repeat Firefox login/redirect with sanitized client/proxy/backend request lifecycle, status/cookie/tenant context and hydration diagnostics. No sleeps, suppressed warnings or success retries masking resets. |
| S11 | Cross-role/API | Existing HR Admin employee/attendance/leave/payroll-readiness GET smoke, MSS team approvals/notification links, employee privileged API 403, foreign tenant denial, anonymous denial and session-expiry recovery. |
| S12 | Presentation/feedback | Desktop/tablet/mobile, keyboard-only named controls, visible focus, dialog trap/restore, empty/loading/error/retry, reduced motion and 200%/400% native reflow where available. |

Execute the applicable cases in Chromium, Firefox and WebKit; record browser/mobile viewport versus physical-device scope separately. Require zero unexplained skips/unexecuted cases, hydration errors, 5xx, ownership leaks, duplicate financial/leave effects or historical hash changes. For same-balance/mixed-operation concurrency, run deterministic local disposable PostgreSQL tests first; do not discover destructive races by load-testing the constrained staging host. Stop on resource saturation or an unexplained auth/transport failure; preserve failed traces and do not retry them into a pass.

The local 204 frozen + 72 focused/stress browser passes and 69 backend passes are **inherited certification evidence**, not newly run staging cases. Earlier 309-pass/6-failure/21-unexecuted aggregate diagnostics remain preserved in the closure report. This assessment adds public GET, host/image/database metadata and offline graph evidence only.

## Accessibility promotion treatment

No currently confirmed critical keyboard, focus, dialog clipping or contrast blocker remains in the reviewed local evidence; the five earlier visual defects were corrected. However, these are not freshly certified on candidate Linux images or deployed staging.

For a narrowly scoped synthetic functional QA environment, unexecuted actual screen-reader speech review, formal WCAG assessment, native Firefox/Safari zoom and physical-device combinations may remain **documented conditional limitations**, subject to explicit scope acceptance. They cannot be represented as accessibility acceptance, customer readiness or closed production gates. Any observed keyboard trap, unreachable action, lost focus, unreadable status/contrast or disabling reflow defect is a promotion blocker until remediated. Automated axe results do not substitute for AT or formal conformance evidence. Operational P0 blockers above remain independently blocking even if these accessibility limitations are accepted.

## Deployment and rollback checklist — future, not authorization

1. Review the exact 100-file source inventory, separate approved ESS changes from QA/procedural artifacts, commit a clean release and record protected configuration checksums without secrets. Preserve all historical evidence and sandbox/provider restrictions.
2. Build and scan/sign a backend/web pair off-host for Linux/amd64 from that commit and frozen lockfile. Record immutable image references and base digests; use the same backend for API/worker/beat. Confirm no customer files, environment secrets, media, local Next output or test databases enter either image.
3. Resolve metric-read visibility; verify sufficient burst/RAM/disk headroom and an approved quiet window. Do not auto-resize, prune or add AWS resources under this assessment.
4. Verify encrypted off-host DB/artifact/config backups, restore them into an approved isolated environment, reconcile rows/checksums/tenant boundaries, and measure approved RPO/RTO. Prove alert delivery and responder ownership.
5. Retain a registry-verifiable or checksum-verified recovery copy of **both** prior images and configuration. Record all five volume names and ownership. Never use `down -v`, prune a recovery image, overwrite `.env.hrms`, or reset migration history.
6. Revalidate the no-op migration plan against the exact new image and current schema. If a migration appears, stop and reassess its forward/backward compatibility and restore plan rather than running it automatically.
7. After separate deployment authorization, use a controlled paired application change, singleton beat and matching workers; leave PostgreSQL/Redis/Caddy and persistent data intact unless separately reviewed. Current Compose uses mutable release tags and build directives; a reviewed digest-pinned deployment definition/override is still required. No template or override was changed here.
8. Run the approved smoke matrix, compare historical/payroll/document hashes and ledger uniqueness, and capture resource/auth diagnostics. Keep real payment, erasure and external recipient/provider actions disabled.
9. Roll back the pair on unexplained 5xx/login reset/hydration error, tenant leak, duplicate ledger effect, historical mutation, blocked core interaction, failed health or sustained resource pressure. Re-run health/read-only invariants and retain incident evidence. Do not automatically restore an older database over later valid transactions; recovery of suspected data corruption requires a separate verified procedure.
10. Obtain an evidence-based staging acceptance decision after cleanup. This assessment does not alter any production gate or authorize MSS implementation.

## Frozen release gates and final disposition

Both frozen CSVs retain 40 rows and their existing SHA-256 values; no status is changed. [Full 40-gate impact matrix](../qa/evidence/ess-staging-promotion-readiness/release-gate-impact.md) preserves literal statuses from the execution tracker. The older “4 Verified / 15 Partial / 21 Blocked” handoff normalization is not substituted for the current literal CSV fields.

`STG-002` backup/restore and `STG-007` immutable deployment/rollback are direct blockers. `STG-006` infrastructure telemetry/alerts and `STG-008` measured capacity remain unclosed; healthy idle services and SES alarms do not close them. TLS GETs do not close all `STG-001` security requirements. Running Redis does not close `STG-003` recovery; document smoke does not close `STG-004` protected storage; historical SES proof does not close all `STG-005` finance/provider requirements. All policy/statutory/retention/payment gates retain their existing requirements.

**Final deployment decision: NO-GO.** A future synthetic-only **CONDITIONAL GO** could be considered only after immutable provenance, backup/restore, operational visibility and the transaction-concurrency evidence are resolved, with an explicit Firefox/accessibility scope decision and a guarded smoke plan. No Lightsail deployment or AWS resource creation was performed.
