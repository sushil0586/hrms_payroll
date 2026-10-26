# STG-1A Ownership And Cleanup Contract

## Ownership Journal

The manifest is newline-delimited JSON, mode `0600`, append-only, and synchronized after each event. Each row includes schema version, event UUID, timestamp, run ID, candidate SHA, deployed application SHA, backend/web digests, and environment fingerprint. Scenario events add the frozen ID, exact test file/title, result and evidence locations. Resource events add exact resource UUID, tenant UUID, ownership (`created`, `observed`, or `unowned`) and non-secret attributes.

A truncated row fails closed. Conflicting duplicate ownership, wrong run, wrong environment, unknown scenario, missing UUID, or ambiguous tenant ownership is rejected. Observed/unowned resources are never deletion candidates.

## Evidence Contract

The collector accepts no SQL and no broad prefix selector. It derives queries from validated UUIDs, opens a PostgreSQL transaction, sets it read-only, and optionally enforces the configured evidence role. Output verifies exact tenant code/ID, sandbox marker, Enterprise entitlement, primary domain, generated-admin membership, cross-tenant absence, rejected-operation absence, and onboarding audit events.

## Cleanup Contract

Cleanup is dry-run by default. A destructive run additionally requires:

- deployment feature gate enabled;
- active superuser actor;
- authorization and recovery references;
- exact run and environment match;
- PostgreSQL advisory transaction lock;
- exact tenant ID/code/email/sandbox ownership;
- no unowned membership or cross-tenant generated-user membership;
- zero legal entity, payroll, leave, attendance or document history;
- zero employee rows except the admin employee derived from the exact owned membership;
- authorized synthetic-tenant teardown context.

The deletion transaction removes the owned tenant graph and then only generated users with no remaining membership. An injected interruption rolled back the tenant deletion; retry then completed once. A repeated successful cleanup returned verified-absent without deleting unrelated data.

## Staging Restriction

Destructive cleanup is not enabled by this change. Staging execution still requires a separate authorization, recovery mechanism, restricted evidence role, and approved cleanup owner/window.
