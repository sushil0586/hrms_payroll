# Phase 2 Policy Execution Matrix

## 1. Purpose

This document defines what Phase 2 must complete after the HR admin backbone.

Phase 2 is not about adding more catalogs.

It is about making leave and attendance policy configuration behave correctly in runtime flows.

Use this document to answer:

- what belongs inside Phase 2
- what already exists as groundwork
- what is still missing in runtime enforcement
- what outcome marks each Phase 2 workstream as complete

---

## 2. Phase 2 Outcome

Phase 2 should end with this result:

- leave policies affect employee request behavior in real submission, approval, withdrawal, and cancellation flows
- attendance policies affect runtime interpretation, regularization, and operational correction behavior
- policy assignment and workflow routing produce understandable real outcomes, not only stored configuration
- backend tests cover the main positive and negative policy-driven scenarios

---

## 3. Matrix

| Workstream | Scope In Phase 2 | Ground Already In Place | Remaining In Phase 2 | Done Signal |
| --- | --- | --- | --- | --- |
| Leave request runtime enforcement | Make leave submission obey configured policy rules | Date validation, half-day checks, backdated rule, notice rule, minimum and maximum days, service-days rule, probation rule, balance rule, attachment rule, holiday-linked policy rule, targeted API smoke coverage for backdated, notice, attachment, probation, and insufficient-balance denials, and platform-to-tenant leave baseline cloning with source traceability | Closed for the current agreed Phase 2 scope. Future additions such as sandwich handling should be treated as later product expansion unless reprioritized. | Leave submission reliably accepts or blocks requests according to active policy behavior |
| Leave lifecycle runtime enforcement | Make withdrawal, cancellation, and approval flows obey policy lifecycle controls | Withdrawal and cancellation rule runtime exists, cancellation reapproval support exists, approval routing exists, and API smoke coverage now proves employee withdrawal of pending leave, policy-blocked withdrawal, withdrawal notice-window blocking, withdrawal attachment-required blocking, direct cancellation of approved leave, cancellation notice-window blocking, attachment-required cancellation blocking, approved-leave cancellation requests that re-enter approval before final cancellation, and rejection of cancellation reapproval that restores the approved leave state | Closed for the current agreed Phase 2 scope. Any further lifecycle rule branches can be scheduled as targeted hardening work later. | Leave lifecycle actions remain consistent with configured policy governance |
| Leave policy assignment trust | Ensure leave assignment resolution produces predictable runtime behavior | Assignment conflict preview, overlap visibility, winning-assignment inspection, scoped priority logic, and API smoke coverage now proves leave-policy resolution across all currently supported leave assignment scopes including employee, legal entity, branch, department, grade, and employment type, with explicit behavior where manual priority remains the HR override, equal-priority matches fall back to the more granular scope, combined matching scopes now outrank broader single scopes when priority is equal, ambiguous active overlaps at the same priority and same granularity are now blocked at save time, and real leave submission outcomes are controlled by the winning assignment | Closed for the current agreed Phase 2 scope. Future denser overlap experiments can be handled as incremental hardening. | HR can predict which leave policy will apply and the runtime matches that prediction |
| Attendance runtime derivation | Make attendance interpretation follow live policy thresholds | Runtime evaluation exists for status derivation, holiday and weekly-off support, late and overtime derivation hooks, preview support exists, platform-to-tenant attendance baseline cloning now creates real shifts, holiday calendars, holidays, and attendance policies with source traceability, and API smoke coverage now proves holiday, weekly-off, half-day, absent, late, and overtime derivation through preview and approval-driven runtime paths including holiday-versus-weekly-off precedence | Closed for the current agreed Phase 2 scope. Remaining derivation expansion should be treated as later operational hardening. | Attendance records and approved regularizations derive policy-driven outcomes consistently |
| Attendance regularization enforcement | Make regularization flow obey attendance policy and operational safety rules | Regularization allowance and reason requirement are enforced, manager workflow exists, approval recalculates attendance runtime, and API smoke coverage now proves that approved regularizations rewrite work duration, overtime, late minutes, and final attendance status from the runtime engine | Closed for the current agreed Phase 2 scope. Additional negative-path branches can be added later if product risk justifies them. | Regularization requests cannot bypass attendance policy or operational control rules |
| Attendance assignment trust | Ensure attendance policy and shift assignment resolution affects real runtime behavior | Attendance policy assignment governance exists, shift assignment governance exists, roster rollout exists, preview tools exist, platform-managed attendance policies can now be detached into tenant-owned clones without breaking references, and API smoke coverage now proves attendance policy resolution across all currently supported assignment scopes including employee, legal entity, branch, location, department, grade, and employment type, with explicit behavior where manual priority remains the HR override, equal-priority matches fall back to the more granular scope, combined matching scopes now outrank broader single scopes when priority is equal, ambiguous active overlaps at the same priority and same granularity are now blocked at save time, plus shift-resolution preview, longer weekly-rotation sequence resolution, temporary-override-versus-rotation precedence across single-day and multi-day windows, and runtime outcomes driven by winning attendance policy and shift assignments | Closed for the current agreed Phase 2 scope. Additional override collision scenarios can be added later as refinement. | Policy and shift assignment decisions match operational runtime outcomes |
| Policy governance safety | Ensure platform-managed runtime policies cannot be edited in unsafe ways | Platform baseline adoption exists, runtime policies now carry source and delegation metadata, leave and attendance policy admin edits now enforce lock and clone-only rules, detach endpoints now exist for clone-only leave and attendance policies, cloned leave types, shifts, and holiday calendars now also surface and enforce governance metadata in HR admin APIs, those non-policy baseline masters can now also be detached into tenant-owned clones when divergence is intentional, HR admin payloads now expose frontend-ready governance state, edit mode, detach availability, locked-field count, and lineage summary fields, the current HR admin frontend now renders governance badges, lineage notices, and detach actions across leave, attendance, shift, and holiday master screens, and governed form controls now disable at field level across those edit surfaces while config-snapshot sections lock as grouped governed blocks when required | Decide whether detached-master follow-up audit or approval flow is required and whether product wants richer grouped rationale or lock-summary UX beyond the current inline hints | Tenant policy editing stays aligned with platform delegation intent and detach flows are explicit instead of ad hoc |
| Phase 2 regression confidence | Keep policy execution safe while broadening runtime behavior | Smoke suite and quality baseline already exist from Phase 0 and Phase 1, and the backend smoke suite now covers the main positive and negative leave and attendance policy-execution branches agreed for this phase | Closed for the current agreed Phase 2 scope. Keep extending coverage only when new product behavior is introduced. | Phase 2 closes with reliable automated coverage on core policy-enforcement scenarios |

---

## 4. Recommended Execution Order

Recommended order for Phase 2:

1. attendance regularization enforcement safety
2. leave request runtime enforcement coverage
3. attendance runtime derivation coverage
4. platform baseline adoption and policy-governance safety
5. leave lifecycle runtime enforcement coverage
6. assignment-to-runtime trust checks
7. final Phase 2 regression pass and documentation closeout

This order starts with clear operational-risk controls, then expands into deeper policy behavior and final test confidence.

---

## 5. First Slice

Current first implementation slice:

- attendance regularization safety enforcement

Included in this slice:

- block regularization on locked attendance records
- block duplicate pending regularizations for the same attendance record
- block invalid requested punch ordering where requested check-out is earlier than requested check-in

This slice is intentionally narrow and concrete so Phase 2 starts with unambiguous runtime enforcement instead of speculative rule semantics.

Current second implementation slice:

- leave request negative-path runtime coverage

Included in this slice:

- verify backdated leave blocking
- verify notice-period blocking
- verify attachment-required blocking
- verify probation ineligibility blocking
- verify insufficient-balance blocking

This slice strengthens confidence that existing leave runtime enforcement is working in the ESS submission path before deeper rule expansion.

---

## 6. Phase Boundary Note

Phase 2 remains focused on tenant runtime policy execution.

That means this phase should complete:

- leave rule enforcement in real request flows
- attendance rule enforcement in real operational flows
- policy-assignment-to-runtime trust
- regression coverage for policy-driven behavior

This phase does not need to fully implement platform-owned baseline policy publishing yet.

The newly identified `Platform Policy Admin` layer is important, but it is a policy ownership and delegation concern above tenant runtime records.

That work should be treated as an adjacent follow-on design and implementation stream:

- platform publishes first-time policy baselines
- tenant adopts baseline packs
- delegated fields remain tenant-editable
- protected fields remain platform-locked

Reference design:

- `docs/platform-policy-admin-and-delegation-design.md`

Practical rule for execution:

- Phase 2 proves that tenant-owned leave and attendance policies execute correctly
- the later platform-policy-admin stream will continue widening how those tenant-owned policies are seeded, governed, and delegated beyond the current leave and attendance foundation
