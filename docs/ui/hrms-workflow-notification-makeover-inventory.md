# Workflow and Notification Management makeover — family inventory

Prepared: 24 October 2026. Status: source inventory complete and all six makeover phases accepted; joined certification closed at 9/9 cross-browser scenarios plus 8/8 focused backend regressions. Machine-readable scope: [20-route inventory](hrms-workflow-notification-route-inventory.json).

## Purpose and boundary

This family owns reusable approval templates, organization-scoped workflow assignments, runtime trace visibility, notification channel configuration, content templates, event routing, delivery operations, diagnostics and the employee/manager inbox experience. The makeover applies the shared Leave, Attendance, Organization, Documents and Payroll interaction standard without changing approval authority, workflow resolution, escalation semantics, recipient selection, provider delivery behavior, retry limits or audit retention.

Domain screens that produce approvals or notifications remain affected consumers rather than owned routes. Leave, Attendance, Documents, Lifecycle and Payroll keep ownership of their business actions. This family owns how their workflow traces and notification receipts are configured, observed and consumed.

## Owned route ledger

| ID | Route pattern | Responsibility | Primary state/actions |
| --- | --- | --- | --- |
| WN-W01 | `/hr-admin/workflows` | Workflow control center and runtime trace | module/status/search scope, trace timeline, template/assignment handoff |
| WN-W02 | `/hr-admin/workflow-templates` | Approval-template catalog | list, inspect, create/edit entry |
| WN-W03 | `/hr-admin/workflow-templates/new` | Template creation | identity, module, steps, escalation and validation |
| WN-W04 | `/hr-admin/workflow-templates/[itemId]/edit` | Template editing | persisted values, step order and safe return |
| WN-W05 | `/hr-admin/workflow-template-assignments` | Scoped rollout catalog | template and organization-scope evidence |
| WN-W06 | `/hr-admin/workflow-template-assignments/new` | Assignment creation | template, legal entity/branch/department/business unit/grade, effectivity |
| WN-W07 | `/hr-admin/workflow-template-assignments/[itemId]/edit` | Assignment editing | overlap/conflict feedback and persisted scope |
| WN-N01 | `/hr-admin/notifications-admin` | Notification control center | health summaries and task routing |
| WN-N02 | `/hr-admin/notification-delivery` | Tenant channel/provider configuration | enablement, backend/provider configuration, delivery policy |
| WN-N03 | `/hr-admin/notification-templates` | Message-template catalog | search/status/source/channel scope and create/edit entry |
| WN-N04 | `/hr-admin/notification-templates/new` | Message-template creation | channel content, variables, metadata, preview and test send |
| WN-N05 | `/hr-admin/notification-templates/[itemId]/edit` | Message-template editing | persisted content, preview/test evidence and status |
| WN-N06 | `/hr-admin/notification-events` | Event-definition catalog | module/active scope, template linkage and create/edit entry |
| WN-N07 | `/hr-admin/notification-events/new` | Event-definition creation | event identity, routing, recipients, template and test data |
| WN-N08 | `/hr-admin/notification-events/[itemId]/edit` | Event-definition editing | persisted routing, preview/test evidence and activation |
| WN-N09 | `/hr-admin/notifications` | Delivery queue | committed filters, paging, selection, inline review and bulk retry |
| WN-N10 | `/hr-admin/notifications/[itemId]/review` | Delivery review | payload, attempts, provider evidence, status and retry |
| WN-N11 | `/hr-admin/notification-diagnostics` | Cross-catalog and delivery diagnostics | channel/template/event health and safe queue drilldowns |
| WN-C01 | `/ess/notifications` | Employee inbox | committed search/filter scope, detail, read state and action link |
| WN-C02 | `/mss/notifications` | Manager inbox | committed search/filter scope, detail, read state and action link |

Dynamic IDs are route variants, not additional route patterns. Modal notification detail states on ESS/MSS belong to their inbox route.

## API and authority map

Workflow reads use options, trace list/detail, template list/detail and assignment list/detail APIs. Workflow writes create or update templates and assignments. The UI must retain the backend's permission checks and tenant scoping; hiding an editor is not authorization evidence.

Notification configuration uses options, channel configurations, templates, template preview/test-send, event definitions and event preview/test-send APIs. Operations use diagnostics, notification list/detail, individual retry and bulk retry. ESS and MSS use separate `me/notifications` and `manager/notifications` projections. Provider credentials and configuration secrets remain masked and must never be echoed through page source, error messages, screenshots or test evidence.

## Query, selection and return contracts

- Workflow trace scope includes module, status and search; catalog filtering capabilities must be verified from the current endpoint rather than invented in the UI.
- Template scope includes search, status, source and channel where supported. Event scope includes search, module and active state.
- Delivery-queue scope includes search, status, channel, priority, subject type, retry state, page and page size where supported.
- ESS/MSS inbox scope must preserve its supported search, status/read state, priority, subject type and paging keys.
- Draft controls stay separate from committed URL state. Apply/Enter, Clear, copied URLs, reload and Back/Forward must restore the same committed scope.
- A supplied item ID is resolved independently. Missing, stale, foreign-tenant or off-filter IDs produce deliberate unavailable/denied feedback and never select the first visible record.
- Successful save, Cancel, dialog close, queue review and diagnostic drilldowns retain only supported local return scope.

## Integrity boundaries

| Boundary | Required preservation |
| --- | --- |
| Template versions and steps | Step order, actor rules, escalation timing, module applicability and active state remain authoritative. Reordering or editing must not mutate historical runtime traces. |
| Assignment resolution | Organization scope, priority/effectivity and overlap rules remain backend-owned. The interface must disclose the scope being changed and surface conflicts without guessing the winning assignment. |
| Runtime traces | Pending, in-progress, approved, rejected, cancelled and completed remain distinct. Timeline evidence cannot imply that the underlying business object changed unless its owning domain confirms it. |
| Template rendering | Variables, subject/body content, metadata and channel constraints remain validated. Preview and test-send are evidence, not activation or proof of external delivery. |
| Recipient routing | Employee, manager, HR and configured recipient rules retain server-side authorization and tenant scope. Test sends must use explicitly owned recipients. |
| Delivery state | Queued, processing, sent, delivered, failed, retry-ready and retry-capped remain distinct. Unknown transport outcomes never appear as confirmed delivery. |
| Retry behavior | Retry and bulk retry preserve attempt limits, idempotency, operator input and audit history. Repeated requests must not duplicate a confirmed send. |
| Consumer inboxes | ESS sees only the authenticated employee's notifications; MSS sees only its authorized manager projection. Action links must be local, authorized and safe. |

## Existing evidence baseline

The repository already contains notification setup CRUD, workflow assignment, operational queue, production notification, ESS launch, modal, role-boundary and failure-recovery suites. These establish useful historical behavior. They do not certify the future makeover because several use shared seed data, older layout assumptions or partial viewport/filter coverage. Phase acceptance counts only fresh source-matched executions.

## Phase 1 completion record

The accepted bounded baseline produced:

1. a current-build render for all 20 route patterns at 1440, 1024, 768, 390 and 320 pixels;
2. populated and filtered-no-match examples, with loading, unavailable and recoverable-error behavior retained as phase-specific implementation gates;
3. an endpoint/permission/action matrix for every read and write;
4. a complete query/filter/paging matrix for workflow traces, catalogs, the HR queue and ESS/MSS inboxes;
5. a transition map for template/assignment saves, preview/test-send, read-state updates, retry and bulk retry;
6. keyboard, focus, accessible-name, reduced-motion and selected axe findings;
7. concrete defects separated from design preferences, with source/build and cleanup provenance.

The 63 responsive route checks and five state scenarios passed with retries disabled, for **68 of 68** accepted Phase 1 tests. Completing this baseline does not certify provider production connectivity, email/SMS/WhatsApp delivery, every approval policy, formal WCAG conformance or release readiness.
