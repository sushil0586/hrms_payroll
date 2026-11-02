# HRMS Payroll Statutory Phase 12 Provider Transmission Certification

Date: 2 November 2026

Environment: task-owned PostgreSQL 16, Redis, Django, and production-built Next.js

Verdict: PASS for local synthetic transmission, idempotent replay, reconciliation, and audit-pack integrity

## Scope

This phase verifies the controlled boundary from a generated finance handoff through provider delivery and reconciliation. It used synthetic tenant data and internal manual/sandbox adapters only.

Excluded: live provider credentials, external bank or accounting delivery, employee payment, statutory filing, shared staging, production, commit, and deployment.

## Controls verified

- Transmission revalidates the sealed review evidence, published output manifest, handoff manifest, and finance artifact source hashes.
- A tampered generated artifact is rejected before any delivery row is created.
- The Finance Manager transmitted bank advice, accounting export, and statutory report artifacts from the browser.
- Repeating transmission returned the same three delivery IDs and produced no duplicate rows.
- Manual sandbox acknowledgement reconciled all deliveries with matching payload and artifact checksums.
- The accepted handoff produced one published provider audit pack with a SHA-256 checksum.
- An ESS identity could not access the finance-handoff setup endpoint.
- Governed cleanup deletes run-owned provider evidence before protected output artifacts.

## Results

| Verification | Result |
| --- | --- |
| Production-build Playwright | 1 passed, 1 worker, 8.6 seconds |
| Sealed transmission and tamper-denial regression | 1 passed on PostgreSQL |
| Callback, retry, and sandbox-adapter regressions | 3 passed on PostgreSQL |
| Provider deliveries | 3, all reconciled |
| Unique idempotency keys | 3 |
| Artifact/payload checksum matches | 3 of 3 |
| Failed or rejected deliveries | 0 |
| Provider audit packs | 1 published |
| Finance browser workflow | Passed |
| ESS setup denial | Passed |
| TypeScript and focused ESLint | Passed |
| Django checks and migration drift | Passed; no changes detected |
| Production frontend build | Passed |

The production build retained the pre-existing Autoprefixer warning at `globals.css:4677`, recommending `flex-end` instead of `end`.

## Defects closed

1. Transmission previously trusted generated handoff artifacts without revalidating the sealed source evidence. It now fails closed before delivery creation when any linked evidence is stale or altered.
2. The governed Playwright cleanup deleted protected output artifacts before provider-delivery evidence. Dependency-ordered cleanup now removes provider jobs, callbacks, retries, and deliveries first.
3. The initial browser assertion requested detailed reconciliation fields from the intentionally bounded list response. The certification now asserts those fields from the authorized acknowledgement response and independently from PostgreSQL.

## Recovery and retry evidence

Focused regressions verified callback idempotency, bounded retry/dead-letter behavior, and sandbox adapter credential resolution without exposing credentials. No external provider was contacted.

## Stop boundary

Local synthetic provider behavior is certified. Live credentials, provider onboarding, external connectivity, callback ingress, reconciliation ownership, payment approval, and filing authorization remain separate operational gates.

## Cleanup

Exact-seed dry-run and governed cleanup were executed with private-file deletion confirmation. Task-owned tenant data, provider evidence, processes, containers, temporary fixtures, ports, and browser artifacts were checked during final teardown.
