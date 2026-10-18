# DB-6 Final Release Risk Register

Date: 2026-10-17  
Local DB-6 result: **CONDITIONAL PASS**  
Production decision: **NO-GO**

## Open Mandatory Gates

| Risk | Scope | Current control | Required owner/action | Release effect |
| --- | --- | --- | --- | --- |
| DB6-04-006 / DBR-004 | post-expiry leave cancellation | fails closed; append-only ledger preserved | HR policy and legal approve restoration/forfeiture treatment; implement and retest | Restricted pilot must exclude this action |
| DB6-06-004 | cross-entity transfer | fails closed | HR, tax, payroll, and legal approve continuity and statutory rules | Restricted pilot must exclude transfers |
| DB6-06-005 | rehire continuity | fails closed | HR/payroll approve service, benefit, leave, and identifier rules | Restricted pilot must exclude rehire |
| DB6-12-004 / DBR-010 | protected export and irreversible erasure | retention/hold guards active; erasure disabled | Privacy/legal/security approve jurisdiction policies, backup treatment, maker/checker, and production enablement | Production blocker |
| DB6-14-003 / DBR-003/007 | ambiguous historical classification | no guessed backfill; historical records unchanged | Data owners approve deterministic classification or permanent legacy exception handling | Production migration blocker for legacy data |

## External Staging Gates

- TLS, host, CSRF, secure-cookie, proxy, and HSTS verification on the deployed domain.
- Managed PostgreSQL backup/restore rehearsal and migration rollback runbook.
- Managed Redis/broker durability, Celery monitoring, stale-worker alerts, and recovery rehearsal.
- Protected object storage for documents, payslips, exports, and signed-download expiry.
- Email and finance-provider sandbox verification with secrets supplied externally.
- Observability, audit-log retention, error alerting, capacity monitoring, and incident ownership.
- Rolling deployment and zero/controlled-downtime migration rehearsal.
- Staging concurrency validation; local capacity remains 25 VUs compliant and 50 VUs not consistently under the 1,500 ms p95 target.

## Closed Managed-Schema P0 Risks

DBR-001, DBR-002, DBR-005, DBR-006, DBR-008, and DBR-009 are closed for governed records by DB-1, DB-2, and DB-4. DBR-003, DBR-004, DBR-007, and DBR-010 remain partial only because the policy or legacy-data gates above are unresolved. The architecture risk register records these distinctions explicitly.

## Readiness Decisions

- Supported local functional workflows: **GO with documented exclusions**.
- Managed-schema database integrity: **GO for staging entry**.
- Legacy data migration: **NO-GO pending classification approval**.
- Irreversible erasure: **NO-GO**.
- Staging deployment: **GO only after environment owners satisfy staging entry controls**.
- Production deployment: **NO-GO**.

No Northstar, staging, production, or customer data was accessed during DB-6.14.
