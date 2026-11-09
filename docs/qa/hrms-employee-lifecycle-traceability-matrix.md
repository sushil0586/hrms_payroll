# Employee Lifecycle Traceability Matrix

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`

This matrix starts EL-0 traceability without promoting unexecuted scenarios. The stable source register remains `ELC-001` through `ELC-100`.

| Scenario range | Product surface | API/service and persistence | Automated evidence | Current state |
| --- | --- | --- | --- | --- |
| ELC-001 to ELC-010 | `/hr-admin/employees` directory, filters, detail panel, history, responsive table | `/api/hr-admin/employees/workspace`; employee list/detail projection | `directory.spec.ts`; `phase2.spec.ts`; focused PostgreSQL/API tests; cross-browser production run | Passed in EL-1N |
| ELC-011 | `/ess/profile` | `/api/v1/me/profile/`; Employee and lifecycle audit | `ess1-dashboard-profile-certification.spec.ts`; `test_ess1_profile_contract.py`; `test_stg136_batch4_profile_integrity.py` | Passed in EL-1B |
| ELC-012 | MSS reportee projections | manager-scoped employee/reportee services | `phase2-manager-dashboard.spec.ts`; PostgreSQL current-reportee selector contract | Passed in EL-1C |
| ELC-013 | HR directory tenant and role boundary | HR employee endpoints and tenant membership permissions | directory API browser case; lifecycle filter and profile security tests | Passed in EL-1O |
| ELC-014 to ELC-032 | Employee create/edit/deactivate | employee serializers, lifecycle services, spell/assignment tables | `phase3.spec.ts`; `el1e.spec.ts`; focused PostgreSQL integrity and audit tests | ELC-014 to ELC-032 passed |
| ELC-033 to ELC-047 | Access, roles, bank accounts | IAM and employee bank services/tables | EL-1F browser, API, audit, tenant-isolation, and PostgreSQL constraint evidence | Passed |
| ELC-048 to ELC-058 | Onboarding and probation | onboarding/probation services, lifecycle events, and governed exit handoff | EL-1G cross-browser workflow, API, audit rollback, authorization, tenant-scope, and PostgreSQL evidence | Passed |
| ELC-059 to ELC-074 | Effective-dated movements and manager scope | employment assignment and lifecycle services | `phase6-movement.spec.ts`; focused movement API tests; effective-employment and manager-history PostgreSQL tests | ELC-059 through ELC-072 Passed; ELC-073/074 Blocked |
| ELC-075 to ELC-084 | Exit, post-exit, rehire | exit workflow, IAM, payroll/leave/document dependencies | `phase6-exit.spec.ts`; `test_el1k_exit_integrity.py`; focused lifecycle authorization test | ELC-075 through ELC-080 and ELC-082/083 Passed; ELC-081 Not Run; ELC-084 Blocked |
| ELC-085 to ELC-100 | Imports, audit, notifications, accessibility, cleanup | import services, audit events, outbox/providers | `phase5.spec.ts`; focused import/movement and notification PostgreSQL tests; TypeScript, build, accessibility, and cleanup checks | ELC-085 through ELC-100 Passed |

## EL-0 status

- Stable IDs: 100 unique, sequential IDs verified in the source register.
- Technical ownership: mapped by lifecycle phase and primary route/service boundary.
- Policy ownership: still required for cross-entity transfer, retroactive correction, rehire, exit dependencies, and import atomicity.
- EL-0 verdict: **CONDITIONAL**. Technical traceability is established, but owner approvals and per-ID test links remain incomplete outside EL-1A.
