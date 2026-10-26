# HRMS STG-1B Staging Access Gate

Date: 2026-10-26

| Prerequisite | Status | Evidence / missing condition |
|---|---|---|
| Target URL and HTTPS | Verified | `https://hrms.accerio.in/` and `/health/` returned HTTP 200; TLS verification succeeded; HSTS present |
| Deployment provenance | Not verified | Earlier evidence records commit `20d8329` and immutable image digests, but current host SSH/AWS operator access was unavailable for a fresh container inspection |
| Platform-admin availability | Not verified | No staging credential was requested or used; only isolated local identity was exercised |
| Restricted PostgreSQL evidence role | Blocked | Collector support is verified locally, but no staging role name/provisioning evidence is available |
| QA tenant namespace | Approval required | Proposed `pw-qa-stg1-*`; exact run namespace and owner must be approved |
| Synthetic administrator identity | Approval required | Exact recipient and approved domain/SES routing must be recorded without exposing credentials |
| Notification isolation | Approval required | SES delivery mode, recipient allowlist and no-real-recipient confirmation required |
| Cleanup ownership | Approval required | Exact cleanup actor, authorization reference, recovery reference and evidence path required |
| Execution window | Approval required | No mutation window for STG-E2E-0101 through 0106 has been authorized |
| Backup/recovery | Blocked | Local restore mechanics passed historically; only a host-local staging dump was observed and off-host recovery remains unverified |

The public endpoint verifies service availability only. It does not certify the currently deployed Git revision, database role, identities, backup, or cleanup authority.

## Batch Decision

STG-1 execution remains **BLOCKED**. Candidate commit approval alone will not authorize staging mutation; deployment compatibility/provenance and the access/operational prerequisites above must be separately closed or explicitly accepted by their owners.
