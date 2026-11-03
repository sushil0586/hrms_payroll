# HRMS STG-1G Deployment Gates

Date: 2026-10-29
Candidate state: **CONDITIONAL; exact local artifacts prepared, deployment unauthorized**

| Requirement | Current evidence | Status | Required closure |
|---|---|---|---|
| Patched runtime dependencies | Final local web and backend SBOMs each report 0 high/critical findings. The web artifact contains no Expo or `node-forge`; no web exception is needed. Mobile/EAS remains a separate blocked release plane | PASS LOCALLY | Reproduce scans on CI-published registry digests and retain signed SBOM/provenance |
| Exact candidate approval | 366 release-relevant changed files are frozen at fingerprint `b893a160beb9b48b49fabed6095c1e3956cb688401f1c4e6fb41ea5f3f53643e`; no owner has approved an immutable commit | APPROVAL REQUIRED | Review the exact manifest and authorize one commit |
| Immutable image build/provenance | Local OCI digests and SBOMs exist, but no authorized commit, registry digest, signature, or target-architecture CI provenance exists | BLOCKED | Commit approved source; CI-build, sign and publish backend/web/worker artifacts; record registry digests and attestations |
| AWS/Lightsail or signed runtime provenance | Scoped inventory and host access were verified historically; current candidate/deployed fingerprints have not been reconciled | CONDITIONAL | Run the read-only preflight and record actual deployed commit, images, migrations and services before mutation |
| Staging-only evidence configuration | Fail-closed configuration and bounded evidence API were deployed and verified historically | CONDITIONAL | Reverify disabled-by-default behavior and bind a new expiring grant to the approved fingerprint and namespace |
| QA evidence identity | Dedicated nonstaff evidence identity and scope denial were verified historically | CONDITIONAL | Reuse only after owner review, token rotation and exact fingerprint/tenant denial smoke |
| Audit verification | Accepted and denied events were retained in the 90-day central CloudWatch group | CONDITIONAL | Reverify writer isolation, retention and new correlation IDs during read-only/predeployment smoke |
| SES recipient isolation | Exact allowlist backend passed locally with locmem transport | NOT VERIFIED | Configure SES transport and synthetic recipients; verify deny path without real employee delivery |
| Encrypted off-host backup | Versioned SSE-KMS checkpoint `20261027T131553Z` passed historically | CONDITIONAL | Create a fresh predeployment checkpoint with checksums and versions |
| Isolated restore | Historical isolated PostgreSQL 16 restore reconciled | CONDITIONAL | Rehearse the fresh checkpoint against candidate-compatible migrations |
| Rollback owner/window | Procedure drafted; no named authorization | APPROVAL REQUIRED | Name release/rollback/cleanup owners and approve execution window and stop conditions |
| Batch-1 execution | 6/6 local only; 136 staging scenarios Not Run | BLOCKED | Deploy approved immutable image, close all above gates, then separately authorize `STG-E2E-0101` through `0106` |

## Deployment Sequence After Closure

1. Review fingerprint `b893a160...` and create the authorized commit; no web `node-forge` exception is required. Mobile/EAS remains blocked.
2. CI-build and sign immutable backend/web/worker images; publish registry digests, checksums, SBOMs and provenance.
3. Complete encrypted backup plus isolated restore evidence before changing staging.
4. Inject staging-only secrets and exact synthetic recipient configuration without committing values.
5. Deploy backend/web/worker images together, run migrations check (no new migration expected), restart backend, worker, beat and web, and verify health.
6. Confirm evidence API disabled by default, then enable only for the approved window and verify authentication, scope, audit sink and denial behavior.
7. Run the separately authorized six-scenario batch with one worker; disable the evidence API, revoke/rotate the temporary token, reconcile exact-ID cleanup, and retain secret-safe evidence.

No step above is authorized by this document. Use `hrms-staging-entry-runbook-2026-10-29.md` and its approval record.
