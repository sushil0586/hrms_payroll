# STG-0A Staging Evidence Contract

Date: 2026-10-26
Scope: the frozen 136 `STG-E2E-*` scenarios
Execution status: all scenarios remain `Not Run`

## Purpose

This contract defines the minimum evidence needed to assign a staging execution result. Existing local, DB-6, DD, and historical Playwright evidence can justify automation reuse, but it cannot be copied into a staging PASS.

## Directory Contract

Each authorized run uses an access-controlled root outside the repository:

```text
/tmp/hrms-stage-e2e-<run-id>/
  provenance/
  batch-00/
    STG-E2E-0001/
      result.json
      browser/
      api/
      postgres/
      worker/
      reconciliation/
      defects/
  manifests/
  cleanup/
```

File names contain scenario IDs and UTC timestamps, never employee names, email addresses, payroll values, tokens, cookies, passwords, or private keys. Financial evidence uses synthetic employee IDs and redacted values in unrestricted reports; detailed reconciliation remains access-controlled.

## Per-Scenario Minimum

1. `result.json`: scenario ID, batch, UTC start/end, deployed commit and image digests, persona, tenant/legal-entity IDs, browser route, result, attempt number, and evidence checksums.
2. Playwright: exact project, command, test title, result, meaningful checkpoint screenshot, and trace/video only on failure or investigation.
3. API: method, redacted URL, status, request fingerprint, resulting resource ID, and response schema assertions. Authorization-negative cases include expected denial.
4. PostgreSQL: read-only parameterized query, expected and actual ownership/state/count, database identity, and transaction timestamp. SQL output must be redacted.
5. Worker/external: Celery task/job ID, queue, attempt, truthful state transitions, bounded retry, and provider/storage/SES reference where applicable.
6. Financial/ledger reconciliation: independently calculated expected totals, actual totals, rounding rule identifier, and equality result. Unapproved statutory formulas remain blocked.
7. Tenant isolation: same-tenant success plus unauthorized or second-tenant denial where applicable.
8. Defect/provenance: issue reference, historical failed attempt, rerun link, source commit, image digest, and test-source checksum.
9. Cleanup: owned resource disposition and absence verification. Cleanup evidence is mandatory even after failure.

## Result Rules

- `Passed`: the browser action and every applicable independent assertion passed against the same record IDs.
- `Failed`: the expected business/security outcome did not occur or reconciliation differs.
- `Blocked`: execution could not begin or complete because an approved prerequisite is absent.
- `Skipped`: only an explicitly approved, documented justification; no new skips are planned.
- `Not Run`: no complete staging attempt exists.

Interrupted, timed-out, setup-only, local, API-only, and historical runs are never staging passes. A rerun retains the original evidence beside the successful attempt.

## Batch-Level Evidence

Every batch must include the command log, scenario result manifest, browser report, API summary, PostgreSQL assertion summary, worker/external summary, defect list, pre/post resource sample, and lifecycle-manifest delta. Batch 9 and 10 additionally require signed-off financial reconciliation. Batch 14 requires cleanup and shared-baseline integrity evidence.

## Security Controls

- Redact authorization headers, cookies, session IDs, CSRF tokens, SMTP credentials, database URLs, private storage URLs, and private keys at capture time.
- Do not attach raw employee documents, payslips, bank files, or unrestricted payroll exports to Git.
- Evidence storage must use least-privilege access, encryption at rest, retention policy, and an audit trail.
- Screenshots use synthetic identities and values only.
- Read-only database credentials are preferred for independent assertions.

## Applicability

The mapping CSV declares required evidence by scenario. `Not applicable` must be justified in `result.json`; absence of an applicable evidence class prevents PASS.
