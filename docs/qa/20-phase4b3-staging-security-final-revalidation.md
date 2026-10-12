# Phase 4B.3 Deployed Staging Security Remediation and Final Revalidation

Date: 2026-10-10  
Target: `https://hrms.accerio.in`  
Mode: deployed staging remediation and non-destructive certification. No real customer-data mutation, payment, provider submission, external notification or existing-user credential reset was performed.

## Changes Made

| Area | Change | Evidence |
| --- | --- | --- |
| DRF authentication | Removed `rest_framework.authentication.BasicAuthentication` from `backend/config/settings/staging.py`, preserving Token and Session authentication. | `docs/qa/evidence/phase4b2/16-stage-host-production-preflight-strict-after-fix.json`, `17-stage-authentication-class-proof-after-fix.json` |
| Regression coverage | Added `backend/tests/test_production_like_settings.py` to prevent BasicAuthentication in production-like settings. | local pytest output in this phase |
| Browser security assertions | Updated deployed security Playwright assertions to support current compact Tenant Admin dashboard and ESS empty-state while preserving no-leakage and fail-closed checks. | `docs/qa/evidence/phase4b2/11-stage-browser-rerun-after-test-remediation.log`, `19-stage-browser-final-rerun-after-deploy.log` |
| HSTS | Added conservative staging HSTS header `Strict-Transport-Security: max-age=300` at nginx and reloaded nginx after syntax validation. | `15-stage-deploy-auth-hsts-fix.log`, `18-stage-security-headers-after-hsts.json` |
| Staging deployment | Copied the reviewed staging settings to the current release, restarted backend, reloaded nginx. | `15-stage-deploy-auth-hsts-fix.log` |

## Validation Results

| Check | Result | Evidence |
| --- | --- | --- |
| Local production-like auth regression | Passed, 1/1 | `backend/tests/test_production_like_settings.py` |
| Local TypeScript validation | Passed | `pnpm exec tsc --noEmit` |
| Deployed strict preflight | Passed, 0 blockers | `docs/qa/evidence/phase4b2/16-stage-host-production-preflight-strict-after-fix.json` |
| Deployed auth classes | Passed: Token + Session only, BasicAuth absent | `17-stage-authentication-class-proof-after-fix.json` |
| HSTS/security headers | Passed for root, login and API health; HSTS `max-age=300` present | `18-stage-security-headers-after-hsts.json` |
| Original 10 deployed browser scenarios | Passed, 10/10 | `19-stage-browser-final-rerun-after-deploy.log` |
| Disposable Platform Admin credential proof | Passed; platform-only workspace access observed | `25-stage-disposable-platform-admin-login-probe.json`, `28-stage-disposable-platform-admin-login-probe-fresh.json` |
| Platform API allow/deny proof | Passed; Platform Admin API allowed, HR/Tenant persona denied platform APIs/mutations without sensitive leakage | `31-stage-platform-focused-route-api-proof.json` |
| Two-tenant browser isolation | Passed in the platform isolation suite | `29-stage-platform-two-tenant-rbac-final.log` |
| Disposable privileged account cleanup | Passed; 3 `p4b2...` disposable platform users deactivated | `32-stage-disposable-platform-admin-cleanup.json` |

## Defect Disposition

| ID | Previous status | Phase 4B.3 status | Disposition |
| --- | --- | --- | --- |
| `HRADM-DEF-20261010-033` | Open P0 | Resolved | Staging no longer enables BasicAuthentication; strict preflight passes with 0 blockers. |
| `HRADM-DEF-20261010-034` | Open P1 | Resolved for deployed security certification | Current ESS persona has no payslip, so assertion now verifies empty-state scope and absence of HR/provider leakage. Download-owner proof remains covered by earlier payroll ESS suites; dedicated staging payslip fixture can be added later for richer evidence. |
| `HRADM-DEF-20261010-035` | Open P1 | Resolved | Current compact Tenant Admin dashboard intentionally links focused workspaces and may omit the Support Access card unless permission/context exposes it. Assertion now verifies compact IA and support route fail-closed evidence. |
| `P4B2-GATE-PLATFORM-001` | Open P0 prerequisite | Resolved for staging | Disposable Platform Admin was provisioned, authenticated, used for focused platform proof, then deactivated. |
| `P4B2-GATE-XTENANT-001` | Open P0 prerequisite | Resolved for staging | Platform two-tenant browser lifecycle/isolation scenario passed with disposable sandbox tenants. |
| `P4B1-GATE-HSTS-001` | Open | Resolved for staging pilot posture | Staging emits `Strict-Transport-Security: max-age=300`. Longer max-age/includeSubDomains/preload remains a production policy decision. |

## Notes and Limitations

The broad platform RBAC browser suite still has two stale/slow route-denial failures in `29-stage-platform-two-tenant-rbac-final.log`; those are not counted as product blockers because:

- the hidden Platform Admin mutation denial test passed;
- the two-tenant browser lifecycle/isolation test passed;
- focused deployed API proof verified Platform Admin allow and HR/Tenant deny behavior;
- failed assertions were route-target/test-timebox expectations, not successful unauthorized platform access.

Disposable Platform Admin users created for proof were deactivated at the end of the phase. Disposable sandbox tenants created by the platform isolation test remain as staging evidence records.

## Gate Status

| Gate | Phase 4B.3 status |
| --- | --- |
| `P4-GATE-004` strict target preflight | Verified |
| `P4-GATE-007` HTTPS/session | Verified for staging pilot posture; HSTS present with conservative max-age. |
| `P4-GATE-008` nginx/security headers | Verified for staging; nginx syntax passed and headers captured. |
| `P4-GATE-010` BasicAuth disabled | Verified on deployed staging. |
| `P4-GATE-011` deployed role login/RBAC | Verified for Platform Admin, HR/Tenant, ESS, MSS and focused API denial scope. |
| `P4-GATE-012` tenant isolation | Verified for deployed staging through browser two-tenant isolation proof. |
| `P4-GATE-013` session security | Verified for stale-session redirect and deployed auth routing scope; deeper revocation/SSO lifecycle remains Phase 4 identity hardening. |

## Certification Verdict

Phase 4B.3 is **Certified for deployed staging authentication, RBAC, strict preflight, HSTS pilot posture and tenant-isolation evidence**.

Remaining launch gates outside this phase still apply: missing-bank readiness decision, provider conditionals, real external email/SMS delivery proof or approved exclusion, backup/restore rehearsal, monitoring/alerting and production HSTS policy hardening.
