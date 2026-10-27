# HRMS STG-1F Integrated Local Verification

Date: 2026-10-27\
Decision: **PASS locally**\
Scope: `STG-E2E-0101` through `STG-E2E-0106` only

## Environment And Provenance

- Git branch/HEAD: `main` at `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus the reviewed, uncommitted STG-1D through STG-1F working-tree changes.
- Runner identity: `local-runner-7a55b33e`; this is a local process label, not a staging deployment revision or immutable image digest.
- Isolated services: PostgreSQL 16, Redis 7, Django 5.1.15 with `config.settings.staging`, and a task-owned Next.js Playwright server.
- Data: synthetic run `stg1-local-20261027b`, tenant namespace `pw-qa-stg1-local-20261027b` and separate Platform QA/tenant-admin identities.
- Email: fail-closed staging backend with locmem transport and one exact synthetic recipient; no SMTP/SES delivery.
- Browser: Chromium, one Playwright worker, `STG_EVIDENCE_API_REQUIRED=1`.
- Ownership manifest: 19 append-only events; final SHA-256 `57c72d4c99748aa2b11d342ec54006bdd9178dc1481481bdf3d1210fc78ca71b`.

The separate `web/tests/e2e/db6-payroll-processing.spec.ts` repair was not edited. Its diff SHA-256 remained `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb` before integrated execution.

## Scenario Evidence

Test file for every row: `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`.

| ID and browser title | Browser | Evidence API | Persisted state and ownership proof | Negative-state proof | Cleanup |
|---|---|---|---|---|---|
| `STG-E2E-0101 creates one owned Enterprise tenant through Platform Admin UI` | PASS | PASS: sandbox, Enterprise, creation audit, one primary domain | Run manifest and PostgreSQL agree on tenant `acb714c8-272b-4d81-a573-356d22694417`; code is run-owned and sandbox is true | N/A | Disposable database removed |
| `STG-E2E-0102 rejects duplicate tenant code without a second tenant` | PASS | PASS: single code count | PostgreSQL same-code count is exactly 1 | Duplicate POST returned 400; no second tenant/domain persisted | Disposable database removed |
| `STG-E2E-0103 rejects duplicate administrator email without partial identity` | PASS | PASS: exact same-tenant membership, one provisioned contact, one unprovisioned contact, provisioning audit | Manifest records two contact IDs, user `ab681048-6611-476b-bddc-69a571f36246` and membership `418100d6-8e56-421d-9456-97b368fe7443`; all use the owned tenant ID | Duplicate provision returned 400; rejected contact has neither user nor membership | Disposable database removed |
| `STG-E2E-0104 activates the Enterprise subscription and exposes persisted state` | PASS | PASS: active, Enterprise, update audit | PostgreSQL tenant status `active`, plan `enterprise`, `tenant_updated` present | N/A | Disposable database removed |
| `STG-E2E-0105 provisioned Tenant Admin logs in and reaches tenant control center` | PASS | PASS: membership active/default and `tenant-admin` role | Membership tenant ID equals owned tenant; active/default true; role list contains only the expected tenant-admin role | Foreign membership count is 0 | Disposable database removed |
| `STG-E2E-0106 non-platform Tenant Admin cannot list or create platform tenants` | PASS | PASS: denied tenant absent and administrator has no foreign membership | Owned administrator identifiers were supplied to the evidence API | Platform list/create returned 403; denied tenant count is 0; platform page remained inaccessible | Disposable database removed |

All six evidence calls returned HTTP 200 with matching run/scenario identifiers and every bounded assertion true. The browser supplied the current ownership-manifest hash and matching environment fingerprint through the narrowly forwarded proxy headers. No browser database credential was present.

## Reconciliation

Independent PostgreSQL inspection after the browser run found:

- one run-owned tenant with one primary domain;
- one provisioned and one unprovisioned contact;
- one active/default membership belonging to the same tenant;
- tenant-admin as the membership role;
- zero cross-tenant memberships for the generated administrator;
- zero rows for the denied tenant code;
- creation, contact, provisioning and update audit event types present.

The first attempt used the same synthetic address for the Platform QA actor and tenant administrator. The application correctly rejected provisioning with HTTP 400. No invalid user or membership was persisted. The fixture identities were separated, an explicit provisioning-response assertion was added, and the complete six-scenario lifecycle was rerun under a new namespace. Only the successful second run is counted.

## Regression Results

| Gate | Result |
|---|---|
| Integrated Playwright | **6 passed** in 28.7 seconds, one worker |
| PostgreSQL onboarding/evidence/security/email subset | **42 passed** in 67.96 seconds; 3 dependency deprecation warnings |
| TypeScript | PASS |
| Focused ESLint | PASS |
| Django system check | PASS, zero issues |
| Migration drift | PASS, no changes detected |
| Evidence API outside enabled staging/test conditions | PASS: disabled/non-staging returns 404; authentication, configured actor and fingerprint checks remain enforced |

## Cleanup

- Django process stopped.
- Playwright-owned frontend stopped automatically.
- Task-owned PostgreSQL and Redis containers stopped and auto-removed.
- Their non-persistent databases, both attempted synthetic namespaces, users, memberships, contacts, tokens and queued local notifications were destroyed with the containers.
- Generated Playwright failure media/report and temporary ownership manifests were removed after report reconciliation.
- No staging, production, AWS, IAM, SSH, SES or shared database resource was accessed or changed.

## Decision

**PASS for integrated local STG-1F verification.** This closes the missing browser-to-evidence-API local test gap. It does not authorize or represent staging execution: all 136 staging scenarios remain `Not Run`, the STG-1F source is not committed/deployed, and staging provenance, backup/restore and execution approvals remain open.
