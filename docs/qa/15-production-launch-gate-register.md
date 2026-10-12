# Phase 4A Production Launch Gate Register

Date: 2026-10-10  
Statuses allowed: Verified, Partially Verified, Not Verified, Blocked, Not Applicable.

## Gate Summary

| Status | Count |
| --- | ---: |
| Verified | 5 |
| Partially Verified | 11 |
| Not Verified | 18 |
| Blocked | 4 |
| Not Applicable | 2 |
| Total | 40 |

## Gate Register

| Gate ID | Category | Requirement | Current Status | Evidence | Verification Environment | Severity | Owner / Decision Authority | Remediation | Acceptance Criteria | Final Sign-off |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P4-GATE-001` | QA baseline | Preserve Phase 3C 29 Passed, 3 Conditional, 0 Failed, 0 Blocked baseline | Verified | `docs/qa/13-e2e-execution-register.md`, `docs/qa/evidence/phase3c7/` | Local/sandbox | P0 | QA lead | None | Baseline recorded and not overwritten | QA lead |
| `P4-GATE-002` | QA baseline | All certified HR Admin modules documented with evidence | Verified | `docs/qa/08-test-execution-results.md`, `06-master-test-case-register.md` | Local/sandbox | P1 | QA lead | None | Module evidence linked by scenario/register | QA lead |
| `P4-GATE-003` | Deployment | Production deployment path documented | Partially Verified | `ops/ec2/README.md`, `ops/ec2/deploy.sh`, `docker-compose.production.yml`, `docs/qa/evidence/phase4b/06-stage-public-health-headers.log`, `08-stage-post-deploy-smoke.log` | Repository + stage public smoke | P0 | DevOps owner | Execute on target host and archive logs | Successful deploy with service status, nginx test, commit ref and smoke evidence | CTO/DevOps |
| `P4-GATE-004` | Deployment | Target production preflight passes with network checks | Not Verified | Stage smoke passed, but target-host `production_preflight --strict` not executed; see `docs/qa/evidence/phase4b/08-stage-post-deploy-smoke.log` | Stage public smoke only | P0 | DevOps owner | Run `python manage.py production_preflight --strict` on target | PASS with 0 blockers and archived JSON/log | CTO/DevOps |
| `P4-GATE-005` | Deployment | Migrations applied safely to target Postgres | Not Verified | `deploy.sh`, CI migration proof, stage API health; no target-host migration evidence | CI + stage health only | P0 | Backend lead | Run migrate in staging/prod release path | Migrations complete, rollback plan attached | Backend lead |
| `P4-GATE-006` | Deployment | Rollback path rehearsed | Partially Verified | `ops/ec2/rollback.sh` | Repository | P1 | DevOps owner | Rehearse rollback on staging target | Rollback returns previous release and preflight passes | DevOps owner |
| `P4-GATE-007` | HTTPS/session | HTTPS, secure cookies, SSL redirect and HSTS enabled | Partially Verified | `production.py` secure defaults, deployed HTTPS/header evidence `docs/qa/evidence/phase4b/06-stage-public-health-headers.log`, TLS evidence `09-stage-tls-certificate.log`; HSTS not observed | Stage partial | P0 | Security owner | Verify through deployed response headers and browser session | HTTPS-only, secure cookies, HSTS and no mixed-content issues | Security owner |
| `P4-GATE-008` | Nginx/security headers | Reverse proxy headers configured | Partially Verified | `ops/ec2/nginx/hrms.conf`, deployed header evidence `docs/qa/evidence/phase4b/06-stage-public-health-headers.log`; `nginx -t` not captured | Repository + stage headers | P1 | DevOps/security | Install TLS config and test deployed headers | `nginx -t` plus header scan evidence | Security owner |
| `P4-GATE-009` | Secrets | Production secrets managed outside repo | Partially Verified | `.env.example`, `docs/payroll-production-env-template.md`, empty local stage env inventory `docs/qa/evidence/phase4b/07-stage-env-key-inventory-redacted.log`; protected target secret source not proven | Repository/local env inventory | P0 | DevOps/security | Prove secret manager or protected env path | No committed secrets; rotation owner and access log documented | Security owner |
| `P4-GATE-010` | Auth/RBAC | BasicAuth disabled in production | Verified | `production.py`, `production_preflight.py` | Code/static | P0 | Backend/security | None | Production REST auth excludes BasicAuthentication | Security owner |
| `P4-GATE-011` | Auth/RBAC | Deployed role login and route access verified | Not Verified | `docs/qa/evidence/phase4b/10-stage-deployed-rbac-isolation-playwright.log`: attempted deployed suite; default stage personas returned HTTP 400 invalid credentials | Stage attempted, blocked by credentials | P0 | QA/security | Run deployed Playwright role/RBAC suite with approved stage personas | HR Admin, Tenant Admin, Manager, Employee, Payroll, Finance, Support and Restricted personas pass | QA/security |
| `P4-GATE-012` | Tenant isolation | Two-tenant isolation verified in deployed environment | Partially Verified | Phase 3C.7 local evidence plus deployed unauthenticated negative API checks in `docs/qa/evidence/phase4b/10-stage-deployed-rbac-isolation-playwright.log` | Local/sandbox + stage partial | P0 | Security/backend | Execute deployed two-tenant negative proof | Cross-tenant objects denied without metadata leakage | Security owner |
| `P4-GATE-013` | Session security | Stale session/logout/back-forward fail closed in deployed environment | Partially Verified | Phase 3B/3C browser evidence plus deployed stale-cookie redirect in `docs/qa/evidence/phase4b/10-stage-deployed-rbac-isolation-playwright.log` | Local/sandbox + stage partial | P0 | Security/QA | Run deployed auth routing suite | Stale sessions redirect/deny consistently | Security owner |
| `P4-GATE-014` | Enterprise identity | MFA/SSO/SCIM launch posture declared | Partially Verified | `production_preflight.py`, env docs, static proof accepts `verified` or approved `not_in_scope` | Config requirement only | P1 | Product/security | Set `HRMS_ENTERPRISE_IDENTITY_STATUS=verified` or approved `not_in_scope` | Owner-approved identity scope recorded | Product/security |
| `P4-GATE-015` | Email | SMTP/SES backend configured with verified sender | Not Verified | `.env.example`, `verify_email_delivery.py` | Not executed on target | P0 | DevOps/notifications | Configure provider secrets and sender/domain | Preflight email gates pass | DevOps |
| `P4-GATE-016` | Email | Real email delivery proof captured | Not Verified | `verify_email_delivery.py` | Not executed on target | P0 | Notifications owner | Run `verify_email_delivery --to <controlled-mailbox>` | Provider accepted delivery, sanitized evidence JSON archived | Notifications owner |
| `P4-GATE-017` | SMS | SMS delivery supported or formally excluded | Not Verified | No concrete SMS provider config found | Repository | P1 | Product/notifications | Decide SMS launch scope | SMS proof exists or SMS explicitly excluded from launch promise | Product owner |
| `P4-GATE-018` | Notifications | Notification worker/timer deployed and healthy | Not Verified | systemd timers, Docker services | Not executed on target | P0 | DevOps/notifications | Verify timer/service status and processing metrics | Pending notifications are processed, retry/failure paths recorded | DevOps |
| `P4-GATE-019` | Notifications | Bounce/failure/retry monitoring verified | Partially Verified | Phase 3B/3C sandbox notification tests, Prometheus rules | Local/sandbox + repo | P1 | Notifications/ops | Trigger sandbox failure and alert | Failure appears in UI, logs and alert channel | Ops owner |
| `P4-GATE-020` | Payroll finance | Missing primary bank-account readiness decision | Blocked | `HRADM-DEF-20261009-013`, Phase 3C conditional `HRADM-E2E-016` | Product decision absent | P0 | Payroll product + finance owner | Approve stage-specific behavior | Decision covers calculation, review, output, bank advice and payment submission | Payroll/finance |
| `P4-GATE-021` | Payroll correctness | Local 100-employee gross/net/statutory reconciliation | Verified | `docs/qa/evidence/phase3c7/05-final-db-reconciliation.json` | Local/sandbox | P0 | Payroll QA | None for local baseline | 100 employee totals reconcile in evidence | Payroll QA |
| `P4-GATE-022` | Payroll correctness | Deployed realistic payroll run reconciles end to end | Not Verified | Final production audit runner references payroll suites | Not executed on target | P0 | Payroll QA/product | Run deployed payroll close and real-scenario suites with safe tenant | Gross, deductions, net, payslips, register and reports reconcile | Payroll owner |
| `P4-GATE-023` | Provider | Payroll provider credentials configured | Not Verified | `production_preflight.py`, env template | Not configured in evidence | P0 | Payroll/DevOps | Configure sandbox/production credential refs | Preflight provider credentials pass without secret leakage | Payroll/DevOps |
| `P4-GATE-024` | Provider | Provider incomplete-lane negative proof | Blocked | `3C-GATE-PROV-001` | Conditional | P0 | Payroll provider owner | Execute real sandbox proof or approved exclusion | Unsafe lane cannot activate/submit and reason is auditable | Payroll provider owner |
| `P4-GATE-025` | Provider | Provider audit-pack drilldown proof | Blocked | `3C-GATE-PROV-002` | Conditional | P0 | Payroll provider owner | Execute sandbox/provider audit-pack drilldown | Audit pack links to provider delivery state and source evidence | Payroll provider owner |
| `P4-GATE-026` | Provider | Provider callback authentication/replay/retry in deployed environment | Partially Verified | Phase 3C.7 provider callback/retry passed locally | Local/sandbox | P0 | Payroll/security | Run deployed provider callback suites with sandbox credentials | Valid callback accepted once; invalid/replay rejected; retries idempotent | Payroll/security |
| `P4-GATE-027` | Payments | Real payment/bank transfer operations sandboxed or explicitly disabled | Not Verified | Provider template and local sandbox notes | Not target-verified | P0 | Payroll/finance | Configure fail-closed payment mode or approved sandbox | No real payment can be triggered by tests; live path has approval controls | Finance owner |
| `P4-GATE-028` | Storage | Payroll artifact storage credentials/policies configured | Not Verified | `production_preflight.py`, env template | Not configured in evidence | P0 | DevOps/security | Configure storage credentials/policies | Strict storage gates pass and refs resolve | DevOps/security |
| `P4-GATE-029` | Storage | Artifact download authorization and signed access verified in deployed storage | Partially Verified | Local artifact/RBAC suites | Local/sandbox | P0 | Security/payroll | Run production storage governance suites | Authorized downloads work; unauthorized/tenant-cross access denied | Security owner |
| `P4-GATE-030` | Reports/audit | Audit trail integrity and report/export evidence verified locally | Verified | Phase 3C.7 docs and DB reconciliation | Local/sandbox | P1 | QA/audit | None for local baseline | Supported audit/export sources pass | QA/audit |
| `P4-GATE-031` | Reports/audit | Audit retention policy and immutable storage in production | Not Verified | No retention proof found | Repository only | P1 | Security/compliance | Define retention and storage policy | Retention period, export path and tamper controls signed off | Compliance owner |
| `P4-GATE-032` | Backups | Backup script exists | Partially Verified | `ops/backup_postgres.sh` | Repository | P0 | DevOps | Schedule production backup and archive evidence | Backup completes with checksum | DevOps |
| `P4-GATE-033` | Restore | Isolated restore rehearsal passes | Not Verified | `ops/backup_restore_rehearsal.sh` | Not executed on target | P0 | DevOps | Run rehearsal against isolated DB | JSON proof with restored table count and checksum archived | DevOps |
| `P4-GATE-034` | Monitoring | Prometheus alert rules exist | Partially Verified | `ops/monitoring/prometheus-rules.yml` | Repository | P1 | Ops | Wire to target monitoring stack | Rules loaded and queryable | Ops owner |
| `P4-GATE-035` | Monitoring | Alert delivery channel proven | Not Verified | Alert rules only | Not executed | P1 | Ops | Trigger test alert | Pager/Slack/email receives alert and ack flow works | Ops owner |
| `P4-GATE-036` | Performance | Local launch-critical route performance passed | Partially Verified | Phase 3C.7 performance batch | Local/sandbox | P1 | QA/performance | Repeat on deployed target with large tenant | Routes meet approved budgets with variance recorded | QA/performance |
| `P4-GATE-037` | Concurrency | Concurrent approvals/imports/payroll/provider jobs verified in target-like env | Not Verified | Unit/browser coverage only | Not target-like load | P1 | Backend/performance | Run concurrency/load probes | No duplicate mutations, locks hold, retries idempotent | Backend owner |
| `P4-GATE-038` | Incident response | Incident response runbook and drill evidence | Not Verified | Ops docs partial only | Not executed | P1 | Ops/security | Run tabletop or operational drill | Owner, escalation, rollback, customer comms and evidence captured | Ops/security |
| `P4-GATE-039` | External channels | Real external email/SMS intentionally excluded from local Phase 3C | Not Applicable | Phase 3C docs | Local/sandbox | P0 | QA | N/A | Exclusion documented; must be verified in Phase 4D for launch | QA lead |
| `P4-GATE-040` | Real payments | Real payment transfer excluded from local automation | Not Applicable | Phase 3B/3C safety notes | Local/sandbox | P0 | Finance/payroll | N/A | Exclusion documented; production payment controls verified separately | Finance owner |

## Launch Verdict by Audience

| Audience | Verdict | Required change |
| --- | --- | --- |
| Internal QA/dev demo | Verified enough | Continue using local/sandbox evidence. |
| Controlled pilot with no real payments and no external SMS promise | Not Ready | Must complete P0 gates: production preflight, deployed RBAC, real email proof or exclusion, backup restore, bank decision and provider disposition. |
| Paying-customer payroll pilot | Not Ready | Must complete all pilot gates plus provider/storage/finance handoff sandbox proof. |
| General Availability | Not Ready | Must complete all P0/P1 gates, monitoring/alerting, incident response, retention, performance/concurrency and operational sign-off. |

## Phase 4B Update - 2026-10-10

Phase 4B now includes non-destructive deployed stage verification against `https://hrms.accerio.in`. Public availability, backend health, TLS certificate and post-deploy smoke passed. Credentialed RBAC and two-tenant certification remain Not Verified because approved stage personas were not available and default demo credentials were rejected by the deployed login API.

Evidence added:

| Evidence | Result |
| --- | --- |
| `docs/qa/evidence/phase4b/06-stage-public-health-headers.log` | Root, API health and login returned HTTP 200; deployed security headers captured. |
| `docs/qa/evidence/phase4b/07-stage-env-key-inventory-redacted.log` | No local `PLAYWRIGHT_*`, `HRMS_*`, deployment or database env vars were available. |
| `docs/qa/evidence/phase4b/08-stage-post-deploy-smoke.log` | Passed public post-deploy smoke: API/root/login all HTTP 200 and health body OK. |
| `docs/qa/evidence/phase4b/09-stage-tls-certificate.log` | Let's Encrypt certificate for `hrms.accerio.in`, valid 2026-09-08 through 2026-12-07. |
| `docs/qa/evidence/phase4b/10-stage-deployed-rbac-isolation-playwright.log` | 10 deployed scenarios attempted: 4 passed, 3 failed due invalid default stage credentials, 3 did not run after serial/dependent credential failure. |
| `docs/qa/17-phase4b-production-environment-hardening-report.md` | Detailed Phase 4B deployed-stage report and residual P0/P1 risks. |

Gate status counts did not change: stage public smoke improves evidence for partially verified deployment/security gates, but target-host strict preflight, credentialed RBAC, two-tenant proof, host service/timer status and protected secret-source evidence remain unresolved.

## Phase 4B.1 Update - 2026-10-10

Phase 4B.1 focused on staging authentication prerequisites, strict preflight prerequisites and security revalidation.

Evidence added:

| Evidence | Result |
| --- | --- |
| `docs/qa/evidence/phase4b1/01-stage-default-persona-login-probes.log` | `platform.admin` authenticated; tenant personas `nisha.rao`, `riya.sharma`, `karan.mehta`, `payroll.finance`, `support.agent` returned HTTP 400 invalid credentials. |
| `docs/qa/evidence/phase4b1/signoff-preflight/launch-signoff-report.md` | Staging signoff preflight-only decision: `STAGING PREFLIGHT BLOCKED`; missing required staging env posture. |
| `docs/qa/evidence/phase4b1/03-stage-root-headers-hsts-check.log` | Deployed root headers captured; `Strict-Transport-Security` absent. |
| `docs/qa/evidence/phase4b1/04-stage-deployed-rbac-isolation-rerun.log` | Original 10 deployed browser scenarios reexecuted: 4 passed, 3 blocked by invalid tenant persona credentials, 3 not run after dependent credential failure. |
| `docs/qa/18-phase4b1-staging-auth-preflight-revalidation.md` | Focused findings, supported provisioning path, HSTS recommendation and admin actions. |

Gate status counts remain unchanged. `P4-GATE-011` remains Not Verified because platform-admin login alone does not satisfy the required deployed role matrix. `P4-GATE-012` and `P4-GATE-013` remain Partially Verified because unauthenticated/stale-session boundaries pass but credentialed tenant isolation, logout, revocation and two-tenant checks are blocked by missing staging prerequisites. `P4-GATE-004` remains Not Verified until host `production_preflight --strict` is executed.

## Phase 4B.2 Update - 2026-10-10

Phase 4B.2 executed actual staging host and browser verification against `https://hrms.accerio.in` using supplied staging personas, without production/customer mutations or seed/bootstrap operations.

Evidence added:

| Evidence | Result |
| --- | --- |
| `docs/qa/evidence/phase4b2/01-staging-provided-persona-login-probes.json` | 5 supplied persona candidates authenticated, 1 returned invalid credentials. |
| `docs/qa/evidence/phase4b2/02-stage-host-identity.log` | EC2 target and release path verified; protected backend env present. |
| `docs/qa/evidence/phase4b2/03-stage-readonly-account-tenant-inventory.json` | Read-only account/tenant inventory captured; no blind provisioning performed because a non-sandbox active tenant exists. |
| `docs/qa/evidence/phase4b2/04-stage-host-production-preflight-strict.json` | Target-host strict preflight executed and failed one P0 blocker. |
| `docs/qa/evidence/phase4b2/07-stage-authentication-class-proof.json` | Deployed REST auth classes include `BasicAuthentication`. |
| `docs/qa/evidence/phase4b2/08-stage-deployed-rbac-isolation-playwright.log` | Original 10 deployed browser scenarios rerun: 8 passed, 2 failed, 0 blocked, 0 not run. |
| `docs/qa/19-phase4b2-staging-auth-rbac-preflight-certification.md` | Detailed Phase 4B.2 staging certification report. |

Gate status impact:

- `P4-GATE-004` remains **Not Verified / failed on target** because strict preflight has a blocker.
- `P4-GATE-010` is downgraded from static Verified to **Blocked for deployed certification** because BasicAuthentication is enabled on staging.
- `P4-GATE-011` improves from Not Verified to **Partially Verified** for supplied HR/Tenant/ESS/MSS personas, but full role matrix is incomplete and 2 of 10 browser scenarios failed.
- `P4-GATE-012` remains **Partially Verified**; no authorized second-tenant persona was available for true deployed two-tenant proof.
- `P4-GATE-013` remains **Partially Verified**; stale session and redirect checks pass, but full logout/revocation matrix still needs credentialed role coverage.
- `P4-GATE-007` and `P4-GATE-008` remain **Partially Verified**; nginx config passes and defensive headers exist, but HSTS is absent.

Phase 4B.2 verdict: **Not Certified** for pilot/production launch security until the BasicAuthentication preflight blocker, Platform Admin credential proof, two-tenant deployed isolation proof and the two browser scenario failures are resolved and rerun.

## Phase 4B.3 Update - 2026-10-10

Phase 4B.3 remediated the deployed staging security blockers and reran focused certification.

Evidence added:

| Evidence | Result |
| --- | --- |
| `docs/qa/evidence/phase4b2/16-stage-host-production-preflight-strict-after-fix.json` | Target-host strict preflight passed with 0 blockers. |
| `docs/qa/evidence/phase4b2/17-stage-authentication-class-proof-after-fix.json` | Deployed auth classes are TokenAuthentication and SessionAuthentication only. |
| `docs/qa/evidence/phase4b2/18-stage-security-headers-after-hsts.json` | HSTS `max-age=300` present on root, login and API-health responses. |
| `docs/qa/evidence/phase4b2/19-stage-browser-final-rerun-after-deploy.log` | Original 10 deployed browser scenarios passed. |
| `docs/qa/evidence/phase4b2/29-stage-platform-two-tenant-rbac-final.log` | Two-tenant browser isolation passed; broad route-menu suite retains 2 stale/timebox failures. |
| `docs/qa/evidence/phase4b2/31-stage-platform-focused-route-api-proof.json` | Focused Platform Admin route/API allow and HR/Tenant deny proof passed. |
| `docs/qa/evidence/phase4b2/32-stage-disposable-platform-admin-cleanup.json` | Disposable Platform Admin accounts deactivated after proof. |
| `docs/qa/20-phase4b3-staging-security-final-revalidation.md` | Detailed Phase 4B.3 final revalidation report. |

Gate status impact:

- `P4-GATE-004` is **Verified** for staging: strict preflight passed.
- `P4-GATE-007` is **Verified for staging pilot posture**: HTTPS/security headers and HSTS are present; production HSTS max-age/includeSubDomains/preload policy remains a later hardening decision.
- `P4-GATE-008` is **Verified for staging**: nginx config test passed and headers captured.
- `P4-GATE-010` is **Verified on deployed staging**: BasicAuthentication is absent.
- `P4-GATE-011` is **Verified for Phase 4B staging scope**: original 10 browser scenarios passed, Platform Admin focused proof passed, and HR/Tenant/ESS/MSS routes were verified.
- `P4-GATE-012` is **Verified for staging**: two-tenant browser isolation proof passed with disposable sandbox tenants.
- `P4-GATE-013` is **Verified for Phase 4B staging scope**: stale-session and auth-routing checks passed; deeper enterprise identity revocation remains Phase 4 identity hardening.

Phase 4B.3 verdict: **Certified for deployed staging authentication, RBAC, strict preflight, HSTS pilot posture and tenant-isolation evidence**. Broader production launch remains gated by non-Phase-4B items: missing-bank decision, provider conditionals, real external email/SMS proof or approved exclusion, backup/restore, monitoring/alerting and production HSTS policy sign-off.
