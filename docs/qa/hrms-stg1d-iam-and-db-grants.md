# HRMS STG-1D IAM And PostgreSQL Grant Proposal

Date: 2026-10-26\
Status: **PROPOSAL ONLY - OWNER APPROVAL REQUIRED**

## AWS Read-Only Inspection

The current shell has no AWS credentials. No IAM change was attempted. The following policy is the minimum API inventory needed for this assessment. Lightsail resource-list operations require `Resource: "*"`; this policy grants no create, update, delete, snapshot, DNS, instance power, or secret access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadStagingLightsailInventory",
      "Effect": "Allow",
      "Action": [
        "lightsail:GetInstances",
        "lightsail:GetStaticIps",
        "lightsail:GetInstancePortStates",
        "lightsail:GetInstanceMetricData",
        "lightsail:GetAlarms",
        "lightsail:GetContactMethods",
        "lightsail:GetOperations"
      ],
      "Resource": "*"
    }
  ]
}
```

This policy does not inspect Docker. Prefer an owner-managed SSH public key restricted to the staging instance and OS account. Do not grant `lightsail:GetInstanceAccessDetails` unless the owner explicitly chooses AWS-generated temporary SSH credentials; it exposes connection material beyond inventory needs.

AWS references: [Lightsail service authorization actions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_lightsail.html) and [resource-level IAM behavior](https://docs.aws.amazon.com/lightsail/latest/userguide/security_iam_service-with-iam.html). The authorization reference classifies `GetInstanceAccessDetails` as a write-level action because it returns temporary access credentials; it is intentionally excluded above.

Host commands must be read-only: `hostname`, `date`, `docker ps`, selected `docker inspect` fields, Django `showmigrations --plan`, health checks, and backup file metadata. Do not print container environments, Compose env files, database URLs, credentials, tokens, or private keys.

## Evidence Collector Object Inventory

`collect_onboarding_evidence()` reads only these application tables:

| Table | Why required |
|---|---|
| `public.tenants_tenant` | Exact tenant ID/code, sandbox, status, plan and recipient ownership |
| `public.tenants_tenantdomain` | Owned tenant domain count |
| `public.iam_tenantmembership` | Generated-admin membership and foreign-tenant membership denial |
| `public.tenant_onboarding_tenantonboarding` | Join from onboarding event to tenant |
| `public.tenant_onboarding_tenantonboardingevent` | Required onboarding audit event types |

It does not need sequence access, user credentials, employee, payroll, leave, attendance, document, finance, or unrestricted audit tables.

## Proposed Staging-Only Role

Substitute owner-approved identifiers through the secret channel. Never place the password in SQL history, Git, reports, or command-line arguments.

```sql
BEGIN;

CREATE ROLE hrms_stg1_evidence
  LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;

ALTER ROLE hrms_stg1_evidence SET default_transaction_read_only = on;
ALTER ROLE hrms_stg1_evidence SET statement_timeout = '15s';
ALTER ROLE hrms_stg1_evidence SET lock_timeout = '2s';
ALTER ROLE hrms_stg1_evidence SET idle_in_transaction_session_timeout = '30s';

GRANT CONNECT ON DATABASE hrms TO hrms_stg1_evidence;
GRANT USAGE ON SCHEMA public TO hrms_stg1_evidence;
GRANT SELECT ON TABLE
  public.tenants_tenant,
  public.tenants_tenantdomain,
  public.iam_tenantmembership,
  public.tenant_onboarding_tenantonboarding,
  public.tenant_onboarding_tenantonboardingevent
TO hrms_stg1_evidence;

REVOKE CREATE ON SCHEMA public FROM hrms_stg1_evidence;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM hrms_stg1_evidence;

COMMIT;
```

Do not grant default privileges. Future tables must not become readable automatically.

## Tenant-Scope Limitation

The five tables do not currently have PostgreSQL row-level security policies. Base-table `SELECT` therefore permits the role to read other tenants' rows, even though the collector uses exact manifest IDs and explicitly rejects foreign membership. Read-only grants are not tenant isolation.

This is a **blocking security decision**. Acceptable closure options are:

1. Preferred: expose security-barrier views or a narrowly scoped database function keyed by an approved run/tenant registry, revoke base-table `SELECT`, and update the collector to use that contract.
2. Add carefully reviewed RLS policies with a trusted transaction-local tenant/run context, ensuring Django joins and the explicit cross-tenant negative assertion remain valid.
3. Time-bound base-table role use only from a controlled runner, with audited statements and owner risk acceptance. This is operational containment, not database tenant isolation, and must not be mislabeled PASS.

STG-1D did not choose among these designs or alter application code.

## Permission Verification

Run first against an approved disposable PostgreSQL database. PASS requires:

```sql
SELECT current_user, current_setting('transaction_read_only');
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname = current_user;
SELECT * FROM information_schema.role_table_grants
WHERE grantee = current_user ORDER BY table_schema, table_name, privilege_type;
```

The exact collector query must pass. Each operation below must fail: `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `CREATE TABLE`, `ALTER TABLE`, sequence use, `SET ROLE`, reading `employees_employee`, reading payroll tables, and reading a tenant outside the approved evidence scope under the selected tenant-control design.

Shared staging role creation and testing remain **APPROVAL REQUIRED**.
