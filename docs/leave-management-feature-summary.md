# Leave Management Feature Summary

This document summarizes what is currently completed in the leave management module, with a focus on policy configurability, operational governance, workflow behavior, and employee/manager/HR experience.

## Purpose

Use this document for:

- product demos
- implementation status reviews
- onboarding new team members
- identifying remaining gaps before enterprise rollout

## Design Direction

The leave module is now being shaped around a few core principles:

- policy behavior should be configuration-driven, not hardcoded
- workflow routing should support tenant-specific approval chains
- sensitive balance operations should be auditable and approval-governed
- HR should be able to simulate and inspect policy behavior before rollout
- ESS, MSS, and HR review surfaces should support operational throughput, not just data entry

## Completed Scope

### 1. Leave Policy Configuration

The leave policy layer now supports advanced JSON-backed configuration with user-friendly HR admin controls.

Completed areas:

- approval routing configuration
- evidence and attachment rules
- lifecycle governance rules
- entitlement and accrual rules
- balance-operation governance rules
- holiday-linked leave governance rules

Configurable behavior now includes:

- default approval route
- escalation route above a requested-units threshold
- attachment requirements by rule
- medical certificate requirement thresholds
- HR owner override
- second-level approver override
- withdrawal rules
- cancellation rules
- cancellation reapproval rules
- entitlement mode
- proration mode
- policy-year start month and day
- carry-forward mode and cap
- probation accrual behavior
- encashment allowance and cap
- maker-checker thresholds for balance operations
- holiday type filtering such as CH and RH
- required matching holiday-date enforcement
- per-period paid cap for holiday-linked leave usage
- pending-request inclusion in holiday-linked cap counting
- configurable post-cap action, currently enforced as block

### 2. Leave Workflow Routing

The workflow behavior is no longer limited to a simple one-step approval model.

Completed routing support:

- manager only
- manager then second level
- manager then HR
- manager then second level then HR

Operational improvements:

- leave requests can move step-by-step through the workflow chain
- MSS manager scope respects active workflow assignment, not only direct reporting manager rules
- HR owner can be configured per policy
- second-level escalation owner can be configured per policy

### 3. Leave Request Validation

The leave request submission layer now enforces real policy rules instead of relying on minimal checks.

Completed validations:

- invalid date range blocking
- half-day restriction enforcement
- backdated application rule enforcement
- notice-period enforcement
- minimum request size enforcement
- maximum consecutive leave enforcement
- minimum service-days enforcement
- probation eligibility enforcement
- inactive leave type blocking
- active policy resolution requirement
- balance availability validation
- attachment and medical certificate rule enforcement from policy config
- holiday-linked leave-date matching against configured holiday types
- holiday-linked paid-cap enforcement by policy period

### 4. Leave Policy Preview And Simulation

HR can now test policy behavior before rollout.

Completed preview capabilities:

- route preview for draft leave policies
- approver-chain preview
- attachment and medical certificate requirement preview
- entitlement projection preview
- assignment-aware preview using employee context

Preview output can show:

- which route will apply
- whether evidence is required
- who the approvers are
- which assignment resolved the active policy
- whether the current draft policy is already the winning policy

### 5. Leave Policy Assignment Governance

Assignment management is now treated as a governance surface instead of basic CRUD.

Completed governance capabilities:

- assignment conflict preview
- overlap visibility
- exact same-scope and same-priority collision blocking
- route-resolution inspector for employee plus leave type
- winning assignment scope visibility
- winning assignment priority visibility

This helps HR verify:

- which policy will actually apply
- where overlapping assignments exist
- whether a draft assignment creates ambiguity

### 6. Leave Balances And Entitlements

The balance layer now supports configurable entitlement behavior and operational administration.

Completed entitlement behavior:

- upfront grant mode
- scheduled grant mode
- no-proration mode
- join-period proration mode
- configurable policy-year calendar
- carry-forward rules
- probation accrual rules
- encashment rule support

Completed balance operations:

- credit adjustment
- debit adjustment
- encashment

Completed balance validation:

- debit operations check available closing balance
- encashment respects policy allowance and cap
- leave submission reserves balance correctly
- approval consumes balance correctly
- rejection and cancellation release reserved or consumed balance correctly as applicable

### 7. Leave Balance Auditability

Balance changes are now historically traceable.

Completed audit capabilities:

- dedicated leave balance transaction ledger model
- action type tracking
- units tracking
- effective date tracking
- actor tracking
- reason tracking
- before and after closing balance tracking
- transaction feed in HR admin

Supported ledger operations include:

- credit adjustment
- debit adjustment
- encashment

### 8. Leave Balance Maker-Checker Governance

Sensitive balance operations no longer need to be immediate single-step mutations.

Completed governance features:

- pending, applied, and rejected transaction states
- reviewer assignment through policy config
- approval-required flags for encashment and debit adjustments
- configurable unit thresholds for approval
- reviewer and review timestamp storage
- rejection reason storage
- self-approval blocking
- review UI in HR admin leave balances workspace

### 9. Leave Lifecycle Governance

Employee-side request lifecycle is now policy-driven instead of fixed.

Completed lifecycle controls:

- employee withdraw while pending
- withdraw notice cutoff
- withdraw attachment requirement and label
- employee cancel after approval
- cancel notice cutoff
- cancel attachment requirement and label
- approved-leave cancellation reapproval
- configurable cancellation approval route

Completed ESS behavior:

- employee can withdraw eligible requests
- employee can cancel eligible approved requests
- ESS sees block reasons when actions are not allowed
- ESS sees attachment expectations for lifecycle actions
- cancellation can either apply directly or create a cancellation approval request

### 10. MSS And HR Review Experience

Operational review surfaces are now more queue-native.

Completed MSS improvements:

- leave request versus cancellation request clarity
- inline approve and reject controls for leave requests
- inline approve and reject controls for attendance regularizations

Completed HR improvements:

- inline attendance regularization review in queue
- inline employee document review in queue
- inline notification review in queue
- full review pages retained for deeper inspection and edits

## End-To-End Capability Now Available

The leave module can now support enterprise scenarios such as:

- “Sick leave above 2 days requires medical certificate”
- “Longer leave requires manager then HR approval”
- “Escalated leave can route to a configured second-level approver instead of only the manager’s manager”
- “Approved leave cancellation can require reapproval”
- “Large encashment or manual balance changes can require reviewer approval”
- “Different entities can use different entitlement and carry-forward rules”
- “Holiday calendars can distinguish CH and RH dates”
- “Only RH dates can be booked under a restricted-holiday policy”
- “An employee may have multiple RH dates available in the calendar, but only a configured number such as 4 can be availed as paid in the policy period”

## Remaining Gaps / Next Logical Enhancements

The module is much stronger now, but there are still a few areas worth finishing for full enterprise maturity.

Recommended next areas:

- scheduled accrual execution jobs and year-end entitlement automation
- payroll linkage for encashment settlement and payable outputs
- richer workflow analytics for approval bottlenecks and escalations
- holiday-calendar and attendance-policy interplay with leave eligibility
- reporting for leave governance, exceptions, and balance-review audit trails
- stronger document/evidence handling if file attachment workflows become first-class beyond reference fields

## Demo Talking Points

For demos, the strongest points to highlight are:

1. Leave policy behavior is configurable rather than hardcoded.
2. Approval chains can differ by tenant, policy, and threshold.
3. HR can preview actual policy behavior before rollout.
4. Policy assignment conflicts are detectable before they cause production confusion.
5. Balance operations are auditable and can require approval.
6. Cancellation and withdrawal behavior can be governance-led, not fixed.
7. ESS, MSS, and HR surfaces now support action-taking directly in queues.

## Summary

Overall, leave management has moved from a basic transactional module toward a configurable governance-led subsystem.

The strongest completed outcomes are:

- policy-driven workflow behavior
- policy-driven entitlement behavior
- policy-driven lifecycle behavior
- audit-ready balance operations
- maker-checker support for sensitive balance changes
- assignment-aware simulation and governance
- improved review UX across ESS, MSS, and HR admin
