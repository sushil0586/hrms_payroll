# STG-0C Business Contract Decisions

Date: 2026-10-26

## `STG-E2E-1110` Import Crash Recovery

### Existing behavior

The system has a tenant-scoped `HrmsImportBatchAudit` ledger containing source hash, batch hash, counts, row errors, rollback metadata and statuses including previewed, committed, partial, failed and rollback review. Current browser imports execute synchronously. The audit API can create evidence rows, but it is not a durable import executor and does not atomically bind a job to imported business rows. Worker interruption recovery therefore does not exist.

### Proposed contract

- Stable import job UUID plus idempotency key scoped to tenant, actor, import type and normalized source SHA-256.
- States: queued, validating, ready, applying, succeeded, partially_failed, failed, retryable, cancelled; transitions persisted transactionally.
- Each input row has a stable source-row identity and outcome ledger.
- Atomic imports roll back the complete business write set. Approved partial imports commit successful rows with immutable row outcomes and a compensating/retry plan.
- Same key and fingerprint replays the canonical job/result; same key with a different fingerprint is rejected.
- Duplicate source submission returns the existing job unless an authorized explicit reprocess version is created.
- Bounded retries with categorized retryable/non-retryable failures; no timer-created success.
- Worker lease, heartbeat and stale-job recovery follow the existing payroll background-job pattern.
- Audit records retain actor, tenant, source hash, counts, state changes and errors without raw personal data.
- Every business write and job-status API enforces tenant scope and import permission.

### Decisions required

| Question | Owner |
|---|---|
| Which import types are atomic versus approved partial? | HR operations and domain owner |
| Can corrected files reuse source identity or require a new version? | Product and audit owner |
| Retry count/backoff and stale lease duration | SRE and engineering |
| Retention of source files, row errors and audit metadata | Security/legal/privacy |
| Who may cancel, retry or explicitly reprocess? | Security and HR operations |

Until approved and implemented, durable background import remains disabled and `1110` remains Automation Missing.

## `STG-E2E-1208` Pending-Request Reassignment

### Existing behavior

Leave workflows snapshot concrete approver memberships and actor identifiers when created. MSS pending queues resolve workflow-assigned actors. A later manager change does not silently rewrite an existing workflow assignment. This safely preserves original ownership, but there is no governed reassignment operation or approved rule for stranded pending work.

### Proposed policy

- Only active pending/in-progress steps may be reassigned; terminal, cancelled and completed requests are immutable.
- Authorized initiators: tenant HR workflow administrator, or explicitly scoped delegate; neither requester nor replacement approver may self-authorize reassignment.
- Reassignment is tenant-scoped and, when configured, legal-entity/branch-scoped.
- Record original approver, replacement approver, reason code, free-text justification, initiating actor, approval actor, effective timestamp and request version.
- Preserve the original workflow action history; append a reassignment event rather than editing prior rows.
- Replacement approver must hold current permission and organizational scope. Segregation-of-duties restrictions continue to apply.
- Notify original approver, replacement approver, requester and HR audit owner after commit.
- Lock workflow instance/step during reassignment. Concurrent approval wins or reassignment wins, never both; stale action receives conflict.
- Repeated identical request is idempotent. Different replacement under the same key is rejected.

### Decisions required

| Question | Owner |
|---|---|
| Does a manager change retain original ownership or automatically queue a reviewed reassignment? | HR policy owner |
| Is maker/checker approval mandatory for reassignment? | Security and HR governance |
| Which modules and statuses are eligible? | Domain owners for leave/attendance/lifecycle |
| Can reassignment cross branch or legal entity? | HR/legal and tenant governance |
| Delegation duration, expiry and fallback owner | HR policy and workflow owner |
| Notification channels and SLA | HR operations and communications |

Until approved, the safe behavior is no implicit reassignment. `1208` remains Automation Missing and execution must verify denial rather than inventing a transfer rule.
