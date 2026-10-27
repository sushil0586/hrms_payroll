# HRMS Security Backlog

Last updated: 2026-10-27

| ID | Advisory | Component | Severity | Current disposition | Owner | Due / reassess | Acceptance requirements |
|---|---|---|---|---|---|---|---|
| HRMS-SEC-20261027-001 | `GHSA-86w9-cpqp-85rv` | `node-forge@1.4.0` through Expo CLI | High | Open. A time-limited exception is proposed for the web-only staging candidate; approval is pending. Mobile and EAS releases remain blocked. The raw `pnpm audit` result remains visible. | Security owner to be assigned | Exception expiry proposed for 2026-11-27; reassess on Expo/node-forge update, mobile/EAS work, image definition change, or CI signing change | Prefer an upstream patched dependency or compatible Expo update. Otherwise remove Expo tooling from web runtime images and prove it is absent from server/browser artifacts. Any temporary acceptance must name an approver, ticket, compensating controls, expiration, and reassessment trigger. |

Functional testing in an isolated local environment may continue. Deployment of an affected artifact still requires the security-owner disposition documented in `hrms-stg1g2-node-forge-risk-disposition.md`.
