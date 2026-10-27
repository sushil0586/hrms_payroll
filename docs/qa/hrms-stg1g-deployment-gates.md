# HRMS STG-1G Deployment Gates

Date: 2026-10-27\
Candidate state: **BLOCKED; local working tree only**

| Requirement | Current evidence | Status | Required closure |
|---|---|---|---|
| Patched runtime dependencies | Next.js 15.5.28 installed; critical runtime finding closed. STG-1G.2 confirms the remaining high `node-forge` finding is an Expo CLI/code-signing dependency with no observed web execution path, but it is unnecessarily present in the web runtime image | APPROVAL REQUIRED | Named security owner must approve the exact time-limited, web-only exception and remediation ticket, or remove Expo dependencies from the web image / adopt a patched upstream toolchain |
| Exact candidate approval | 32-file manifest prepared; no exact-manifest owner approval | APPROVAL REQUIRED | Review post-remediation manifest/checksum and explicitly approve one commit |
| Immutable image build/provenance | No candidate commit or image exists | BLOCKED | Commit approved source, CI-build backend/web/worker images, record repository SHA and image digests/SBOM |
| AWS/Lightsail or signed runtime provenance | Prior Lightsail inventory permission and host SSH access unresolved | BLOCKED | Restore reviewed read-only inventory/SSH path or provide signed runtime probe evidence |
| Staging-only evidence configuration | Fail-closed examples and local tests exist | NOT VERIFIED | Inject secret-managed fingerprint/token actor; keep API disabled outside authorized window; verify 404 when disabled |
| QA evidence identity | Exact superuser actor and token behavior verified locally | NOT VERIFIED | Create dedicated staging identity, scope and rotate token, verify wrong actor/tenant/fingerprint denials |
| Audit verification | Structured allow/deny events verified by tests | NOT VERIFIED | Route security logger to centralized immutable sink and capture accepted/denied event evidence |
| SES recipient isolation | Exact allowlist backend passed locally with locmem transport | NOT VERIFIED | Configure SES transport and synthetic recipients; verify deny path without real employee delivery |
| Encrypted off-host backup | Procedure documented only | BLOCKED | Capture encrypted backup reference, integrity check, retention and access evidence |
| Isolated restore | No executed current restore rehearsal | BLOCKED | Restore candidate-compatible database/artifacts into disposable isolated environment and reconcile health/data |
| Rollback owner/window | Procedure drafted; no named authorization | APPROVAL REQUIRED | Name release/rollback/cleanup owners and approve execution window and stop conditions |
| Batch-1 execution | 6/6 local only; 136 staging scenarios Not Run | BLOCKED | Deploy approved immutable image, close all above gates, then separately authorize `STG-E2E-0101` through `0106` |

## Deployment Sequence After Closure

1. Obtain named security-owner approval for the STG-1G.2 web-only exception, or remove Expo/mobile dependencies from the web image and re-audit; mobile/EAS release remains blocked.
2. Create the authorized commit and immutable backend/web/worker images; publish checksums and SBOM.
3. Complete encrypted backup plus isolated restore evidence before changing staging.
4. Inject staging-only secrets and exact synthetic recipient configuration without committing values.
5. Deploy backend/web/worker images together, run migrations check (no new migration expected), restart backend, worker, beat and web, and verify health.
6. Confirm evidence API disabled by default, then enable only for the approved window and verify authentication, scope, audit sink and denial behavior.
7. Run the separately authorized six-scenario batch with one worker; disable the evidence API, revoke/rotate the temporary token, reconcile exact-ID cleanup, and retain secret-safe evidence.

No step above is authorized by STG-1G itself.
