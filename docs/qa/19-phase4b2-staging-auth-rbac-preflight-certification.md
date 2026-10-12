# Phase 4B.2 Staging Authentication, RBAC and Strict Preflight Certification

Date: 2026-10-10  
Target: `https://hrms.accerio.in`  
Mode: non-destructive deployed staging verification. No production/customer mutations, seed/bootstrap, password resets, external notifications, payments or provider submissions were executed.

## Evidence

| Evidence | Result |
| --- | --- |
| `docs/qa/evidence/phase4b2/01-staging-provided-persona-login-probes.json` | 5 of 6 supplied persona candidates authenticated through `POST /api/auth/login`; one candidate returned HTTP 400 invalid credentials. |
| `docs/qa/evidence/phase4b2/02-stage-host-identity.log` | EC2 host reachable; current release path `/var/www/hrms-payroll-saas/release-20260914023312`; protected backend env present. |
| `docs/qa/evidence/phase4b2/03-stage-readonly-account-tenant-inventory.json` | Read-only inventory confirmed three tenants, including `accerio-india` sandbox and one active non-sandbox tenant; supplied personas are scoped to `accerio-india`. |
| `docs/qa/evidence/phase4b2/04-stage-host-production-preflight-strict.json` | Target-host `production_preflight --strict --json` executed and failed with one blocker: `auth.basic_disabled`. |
| `docs/qa/evidence/phase4b2/05-stage-host-services-nginx.log` | Backend and web services active; notification worker timer active; Redis/Postgres active; nginx config test successful. Celery service names probed were inactive/not installed. |
| `docs/qa/evidence/phase4b2/06-stage-security-headers.json` | HTTPS responses include `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `Strict-Transport-Security` still absent. |
| `docs/qa/evidence/phase4b2/07-stage-authentication-class-proof.json` | Deployed DRF auth classes include `rest_framework.authentication.BasicAuthentication`; strict preflight failure is genuine. |
| `docs/qa/evidence/phase4b2/08-stage-deployed-rbac-isolation-playwright.log` | Original 10 deployed browser scenarios rerun: 8 Passed, 2 Failed, 0 Blocked, 0 Not Run. |
| `docs/qa/evidence/phase4b2/09-stage-platform-admin-candidate-probes.json` | Supplied password candidates did not authenticate `platform.admin`; platform-admin credentialed proof remains blocked. |
| `docs/qa/evidence/phase4b2/10-stage-credentialed-api-allow-deny-probes.json` | Credentialed API probes show tenant/security endpoints deny insufficient roles and support console fails closed without a support session. |

## Environment Identity

Staging host identity was verified through SSH using the approved key path. The deployed application points to release `release-20260914023312`, with backend env loaded from the protected shared env file. Read-only database inspection found sandbox tenant `accerio-india`, draft sandbox tenant `reliance`, and active non-sandbox tenant `reliance-industries`; this is why no seed/bootstrap/provisioning mutation was run blindly.

## Persona Readiness

| Persona label | Authentication | Workspace access proven | Notes |
| --- | --- | --- | --- |
| `persona_1` | Passed | ESS, MSS, HR Admin, Tenant Admin | `accerio-india`; used for HR/Tenant Admin browser scenarios. |
| `persona_2` | Passed | ESS, MSS | `accerio-india`; used for manager browser scenario. |
| `persona_3` | Failed | None | HTTP 400 invalid credentials; account not found in read-only inventory. |
| `persona_4` | Passed | ESS, MSS | `accerio-india`; not needed for the original 10 rerun. |
| `persona_5` | Passed | ESS, MSS, HR Admin, Tenant Admin | Includes payroll-finance-manager role; not used for destructive payroll actions. |
| `persona_6` | Passed | ESS only | `accerio-india`; used for restricted/employee scenario. |
| Platform Admin | Blocked | None | `platform.admin` exists, but no supplied credential authenticated it. |

## Strict Preflight

`production_preflight --strict --json` was executed on the actual staging host. Result: **Failed**.

The only blocker was `auth.basic_disabled`. Follow-up proof confirmed the deployed `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` includes:

- `rest_framework.authentication.TokenAuthentication`
- `rest_framework.authentication.SessionAuthentication`
- `rest_framework.authentication.BasicAuthentication`

This is a P0 deployed security hardening blocker. It must be corrected in deployed configuration/settings and rerun before `P4-GATE-004` or `P4-GATE-010` can be certified.

## Original 10 Scenario Reexecution

| Scenario group | Result |
| --- | --- |
| Unauthenticated privileged workspace redirect | Passed |
| HR Admin workspace access | Passed |
| Employee ESS access and HR redirect denial | Passed |
| Manager MSS access without HR escalation | Passed |
| Tenant Admin control center access | Passed |
| Stale invalid HR Admin session redirect | Passed |
| Public landing privileged-workspace boundary | Passed |
| Privileged mutation/support proxy fail-closed unauthenticated | Passed |
| Employee payslip screen scoped/no HR leakage | Failed: selected employee had zero published payslips, so download action was not available. Security leakage checks reached the page and no HR/provider text was observed in captured context. |
| Tenant Admin/support scoped access controls | Failed: current Tenant Admin dashboard exposes compact Users/Roles workspace links but not the expected `Support access` card; support workspace portion was not reached after assertion failure. |

Fresh result: **8 Passed, 2 Failed, 0 Blocked, 0 Not Run**.

## RBAC and Tenant Isolation

Positive credentialed HR/Tenant/ESS/MSS navigation was partially verified through the browser rerun. API deny probes verified that tenant-admin/security endpoints reject insufficient roles and support console rejects requests without an approved support session.

Full deployed RBAC is **not certified** because Platform Admin, Payroll/Finance dedicated workflow, Support Agent, Restricted persona and full permission-matrix proof were not all executable with supplied credentials.

Two-tenant isolation is **not certified** because no second authorized staging tenant persona was available. Read-only inventory detected multiple tenants, including one non-sandbox tenant, so mutation or cross-tenant probing against unknown/customer-like data was intentionally not attempted.

## HSTS and Headers

HTTPS works and standard defensive headers are present. `Strict-Transport-Security` is still absent from deployed root, login and API-health responses. Keep `P4B1-GATE-HSTS-001` open until the HSTS rollout policy is approved and deployed.

## Defects / Blockers

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| `HRADM-DEF-20261010-033` | P0 | Open | Deployed strict preflight fails because DRF BasicAuthentication is enabled in staging. |
| `HRADM-DEF-20261010-034` | P1 | Open | Employee payslip scenario lacks deterministic published-payslip fixture for the supplied ESS-only staging persona. |
| `HRADM-DEF-20261010-035` | P1 | Open | Tenant Admin support-access assertion is stale or capability is no longer surfaced on the compact dashboard; current UI needs requirement-aligned assertion or route coverage. |
| `P4B2-GATE-PLATFORM-001` | P0 prerequisite | Open | Platform Admin credentialed proof blocked; supplied credentials did not authenticate `platform.admin`. |
| `P4B2-GATE-XTENANT-001` | P0 prerequisite | Open | Two-tenant deployed isolation proof blocked; no second authorized staging tenant persona provided. |

## Gate Updates

| Gate | Phase 4B.2 status |
| --- | --- |
| `P4-GATE-003` deployment path | Partially Verified: host identity, current release, service state and nginx config captured; release commit/rollback rehearsal still missing. |
| `P4-GATE-004` strict target preflight | Blocked/Failed: strict preflight executed but failed one P0 blocker. |
| `P4-GATE-005` target migrations | Partially Verified: target DB connectivity passed in strict preflight; migration plan/status proof still not captured. |
| `P4-GATE-007` HTTPS/session | Partially Verified: HTTPS and security headers captured; HSTS and full logout/revocation remain incomplete. |
| `P4-GATE-008` nginx/security headers | Partially Verified: nginx config test passed and headers captured; HSTS still absent. |
| `P4-GATE-010` BasicAuth disabled | Blocked/Failed on deployed target: BasicAuthentication is enabled. |
| `P4-GATE-011` deployed role login/RBAC | Partially Verified: 8/10 original browser scenarios passed; full persona matrix incomplete. |
| `P4-GATE-012` tenant isolation | Partially Verified only for single-tenant and unauth/API denial checks; two-tenant proof blocked. |
| `P4-GATE-013` session security | Partially Verified: stale invalid session and auth redirects passed; logout/revocation with full role set still pending. |

## Certification Verdict

Phase 4B.2 is **Not Certified** for production/pilot launch security.

Primary blockers:

1. P0 strict preflight failure: BasicAuthentication enabled on deployed staging.
2. Missing Platform Admin credentialed proof.
3. Missing second authorized staging tenant persona for two-tenant isolation.
4. Two browser certification failures requiring deterministic fixture/requirement-aligned test remediation.
5. HSTS still absent from deployed responses.

Readiness for Phase 4C: not ready as certification. Phase 4C can only proceed as preparation until these P0 prerequisites are corrected and Phase 4B.2 is rerun.
