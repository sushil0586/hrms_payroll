# HRMS STG-1B Security Review

## Verdict

**PASS for candidate safety.** No critical safety defect remains in the reviewed local tooling. Destructive staging cleanup remains deployment-disabled and additionally requires explicit staging identity, configured fingerprint, authorization, recovery reference and privileged actor.

## Control Review

| Control | Result |
|---|---|
| PostgreSQL evidence | PostgreSQL-only, transaction set read-only, optional exact restricted-role enforcement |
| Query safety | Fixed ORM/parameterized statements; no externally supplied SQL or arbitrary model selector |
| Ownership | Exact UUID, tenant code, owner email, sandbox and manifest-run checks; no prefix deletion |
| Tenant isolation | Foreign memberships and ambiguous/cross-tenant resources fail closed |
| Environment identity | Parser checks the requested fingerprint; destructive cleanup also compares a deployment-configured fingerprint |
| Production protection | Cleanup requires `HRMS_ENVIRONMENT=staging`; other environments are rejected before feature-gate evaluation |
| Cleanup default | Dry-run; execution requires feature gate, superuser, authorization and recovery references |
| History protection | Any legal entity, payroll, leave, attendance, document or unowned employee dependency refuses cleanup |
| Concurrency/recovery | Advisory transaction lock, atomic deletion, injected interruption rollback, safe retry and replay verified |
| Sensitive output | No passwords, tokens, cookies, private employee data or generated password in journal/evidence |
| Synthetic recipients | Default domain is `playwright.qa.invalid`; any additional staging domain requires explicit configuration |

The generated tenant-admin employee row is removable only when derived from the exact owned membership and when no protected downstream history exists. Unowned resources are never deletion candidates.

## Residual Requirements

- Staging must provision and name a restricted read-only evidence role.
- Any non-default synthetic email domain requires owner approval and explicit configuration.
- Cleanup must remain disabled until backup/recovery and a separate destructive authorization are documented.
- Application/database credentials must come from the approved secret channel; none belongs in Git or the manifest.
