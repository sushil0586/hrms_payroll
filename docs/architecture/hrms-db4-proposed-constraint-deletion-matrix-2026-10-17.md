# DB-4 Proposed Constraint and Deletion Matrix

Date: 2026-10-17  
Status: pre-implementation design gate

## Risk scope

- **DBR-009:** direct tenant-owned foreign keys can currently be made cross-tenant through bulk updates or raw SQL unless a domain-specific DB-2/DB-3 trigger already covers the edge.
- **DBR-010:** several legally or financially relevant child rows remain reachable through `CASCADE`; terminal-row guards cover only part of the historical graph.

The broad model inventory contains 336 foreign-key/one-to-one edges originating from tenant-owned tables. Of these, 268 managed direct edges have a persisted `tenant_id` on both source and target and receive generated DB-4 triggers. Eight additional derived/nested ownership paths receive explicit guards. User actors and platform/global catalogs are deliberately excluded.

## Relationship matrix

| Domain | Critical tenant-owned relationships | Current deletion pattern | Proposed database rule | Retention disposition |
| --- | --- | --- | --- | --- |
| Employee master | membership, legal entity, branch, location, department, business unit, cost center, designation, grade, employment type, manager | Mostly `SET_NULL`; tenant and some history cascade | Tenant equality on every direct edge; employee delete preflight | Archive employment status; block delete after operational history |
| Employment lifecycle | employee, movement from/to organization and manager references, onboarding, probation, exit | Employee often `CASCADE`; scope references `SET_NULL` | Tenant equality on all direct edges; protect lifecycle evidence from parent delete | Retain movement/onboarding/exit history |
| Documents | employee, category, artifact, previous version, verification log, requirement scope | Several `CASCADE` edges | Tenant equality; block retained employee-document and artifact deletion | Archive/supersede; do not erase verified or versioned documents |
| Leave | type, policy, assignment scopes, employee, request, balance, period, close run, lots, allocations | Legacy balances/requests often `CASCADE`; DB-3 governed rows mostly `PROTECT` | Tenant equality on all direct edges; retain DB-3 guards; block balance deletion with ledger provenance | Append corrections; preserve ledger/year-close history |
| Attendance | policy scopes, shifts, roster, employee, record, regularization | Employee and record histories often `CASCADE` | Tenant equality on direct edges; block employee deletion with attendance evidence | Archive policy/employee; retain attendance evidence |
| Payroll setup | calendar, period, pay group, organization scopes, structure/version/components, salary assignment | Mixed `CASCADE`, `PROTECT`, `SET_NULL` | Tenant equality on every direct tenant edge | Archive setup versions referenced by payroll |
| Statutory payroll | packs, components, registrations, profiles, declarations/items | Several employee/declaration cascades | Tenant equality; employee delete protection once statutory history exists | Retain locked/submitted declarations and filing evidence |
| Payroll processing | run, snapshot, calculations/lines, validation, adjustment, settlement, review/approval | Many run children `CASCADE`; DB-1 protects terminal states | Tenant equality; run delete preflight; preserve DB-1 terminal guards | Retain any run with processing or financial evidence |
| Payroll outputs/finance | batch, artifact, access grant/event, handoff, delivery, callback/retry, provider jobs | Some output/provider children cascade | Tenant equality; protect artifacts/batches/handoffs and audit events | Archive/revoke access; retain financial and access audit evidence |
| Background jobs | payroll run/review/output and provider delivery/connection/retry/callback | Mixed `PROTECT` and `CASCADE` | Tenant equality on every direct edge | Retain durable job evidence with source workflow |
| Workflow | template assignment scopes, instance/template, steps/actions | Mixed assignment cascade and template `SET_NULL` | Tenant equality; protect instance deletion after action evidence | Archive template; retain decision trail |
| Notifications | event definition, role, membership, notification/delivery | Delivery log cascades from notification | Tenant equality; protect delivery/audit history where legally referenced | Retain delivery evidence according to policy |
| Tenant root | all tenant-owned rows | Broad tenant cascade | Tenant-delete history preflight at database and service layers | Separate export/legal-hold/secure-erasure workflow |
| Platform/global | permission catalog, platform packs, configuration definitions, users | Shared intentionally | No tenant-equality trigger unless a tenant-owned adoption/membership edge points to it | Preserve legitimate global references |

## Delete decision matrix

| Parent | Delete allowed | Delete rejected | Supported alternative |
| --- | --- | --- | --- |
| Employee | Empty synthetic employee with no operational history | Payroll, statutory, leave, attendance, document, or lifecycle history exists | Set employment status inactive/terminated and retain ID |
| Payroll run | Unused draft with no processing children | Any snapshot, calculation, review, adjustment, settlement, output, handoff, or job exists | Cancel/archive lifecycle state |
| Leave balance | Never when ledger/lot/close/allocation provenance exists | Any historical provenance exists | Compensating ledger movement |
| Employee document | Unverified placeholder with no artifact/version/log | Artifact, prior version, verification, or retained status exists | Archive/supersede/revoke access |
| Payroll output batch/artifact | Never after generated evidence is linked; existing terminal guards remain | Artifact/access/finance/provider history exists | Revoke access or archive metadata |
| Workflow instance | No action/step history and no business object dependence | Action/decision history exists | Retain terminal instance |
| Tenant | Empty sandbox after explicit preflight | Any protected history, legal hold, incomplete export, or non-sandbox tenant | Archive tenant; separate approved retention/export/secure-erasure process |

## Migration compatibility rule

Before trigger installation, the migration must scan every proposed direct tenant-owned edge and stop with a table/column violation summary if incompatible rows exist. It must not modify, delete, relink, or infer ownership for any historical row.

The migration is additive and reversible: reverse removes only DB-4 triggers/functions. Existing DB-1, DB-2, and DB-3 guards remain installed throughout rollback.
