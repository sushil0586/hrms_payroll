# Employee Lifecycle EL-1G Certification

Date: 2026-11-05
Candidate parent: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Environment: task-owned PostgreSQL 16, Django, and production-built Next.js on loopback only

## Scope

EL-1G certifies `ELC-048` through `ELC-058`: onboarding creation, checklist and owner progression, blocked/resumed/completed/cancelled transitions, duplicate and foreign-reference rejection, probation confirmation and extension, separation handoff, audit integrity, and unauthorized-access denial.

No shared staging or production system was used.

## Changes

- Enforced lifecycle view/manage permissions on onboarding and probation endpoints.
- Validated onboarding and probation owners against the current tenant.
- Rejected missing or inactive onboarding workflow templates.
- Added guarded onboarding transitions, required blocked reasons, and terminal-state protection.
- Added terminal probation-decision protection.
- Routed probation separation into a draft governed exit record without directly deactivating the employee.
- Added redacted employee lifecycle events for onboarding and probation writes.
- Made lifecycle record and audit persistence atomic and added forced audit-failure rollback coverage.
- Made lifecycle modal focus restoration deterministic across browser engines.
- Hardened the retained lifecycle browser login helper against Secure-cookie and redirect races in local production-build testing.

No database migration is required for EL-1G.

## PostgreSQL And API Evidence

Focused qualification: **8 passed, 0 failed, 405 deselected**.

- Onboarding create, block, resume, cancel, terminal protection, and audit sequencing passed.
- Foreign-tenant owners and inactive or missing templates were rejected without mutation.
- Duplicate onboarding remained rejected by the one-to-one contract.
- Confirmation and extension updated only the approved employee projections.
- Separation created one draft exit workflow and preserved active employment state.
- ESS access to onboarding and probation list/write endpoints returned 403 with no mutation.
- Forced lifecycle audit failure returned an error and rolled back both the onboarding row and audit row.

## Browser Evidence

Focused production-build lifecycle qualification covered five contracts in Chromium, Firefox, and WebKit:

- Onboarding validation, template checklist persistence, completion, and duplicate-submit suppression.
- Probation extension and confirmation projection updates.
- Unknown-response draft retention and deliberate return navigation.
- Short-viewport keyboard trapping, discard confirmation, and trigger-focus restoration.
- Read-only lifecycle permission enforcement.

Results: **15 passed, 0 failed** across the three engines with one worker. The final WebKit focus assertion passed after the deterministic focus-restoration repair.

Two earlier WebKit attempts were harness failures, not product verdicts. The first used a production Secure cookie over loopback HTTP; the second returned from login before the client redirect completed. The clean run used the supported local-only `HRMS_COOKIE_SECURE=false` setting and waited for the authenticated workspace URL. Production cookie behavior was not changed.

## Quality Gates

- TypeScript: PASS
- Production build: PASS, 313 static pages generated
- Django/PostgreSQL focused regression: PASS
- Cross-browser focused regression: PASS
- Existing Autoprefixer warning at `globals.css:4686`: unchanged

## Scenario Verdicts

Promoted to Passed: `ELC-048` through `ELC-058`.

No scenario outside the EL-1G range was changed.

## Verdict

EL-1G executed scope: **PASS**. Onboarding and probation lifecycle behavior is locally certified across Chromium, Firefox, WebKit, API authorization, audit rollback, tenant isolation, and PostgreSQL persistence.

No commit, push, deployment, shared migration, email, or payroll execution occurred.
