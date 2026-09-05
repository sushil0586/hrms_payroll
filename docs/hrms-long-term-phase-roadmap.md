# HRMS Long-Term Phase Roadmap

## 1. Purpose

This document defines the next long-term phase-wise roadmap for the product beyond the current execution tracker.

It is meant to help with:

- sequencing major delivery programs
- aligning engineering and product scope
- deciding what must be true before payroll and enterprise scale work begin
- keeping the roadmap focused on exit criteria instead of only feature lists

This roadmap assumes the project remains India-first in the near term, while keeping architecture and configuration patterns ready for broader expansion later.

---

## 2. Planning Principles

- finish the current operating core before widening into too many new modules
- protect quality, auditability, and permission safety before payroll scale
- treat configurability as a product capability, not a future refactor
- prioritize reusable platform layers over one-off module implementations
- define exit criteria for each phase so progress can be measured clearly

---

## 3. Long-Term Roadmap Overview

## Phase 1: Stabilize The Current HRMS Core

Objective:

Turn the current build from a broad MVP into a dependable internal beta product.

Primary scope:

- backend API test foundation
- web lint and CI setup
- permission hardening
- live vs demo behavior discipline
- backend service-layer cleanup in high-change domains
- stronger validation, loading, and failure UX in web flows

Expected outcomes:

- engineers can change core flows with less regression fear
- live environments behave predictably
- admin, ESS, and MSS flows are stable enough for longer evaluation cycles

Exit criteria:

- CI runs typecheck, build, Django check, and backend tests
- lint is configured and non-interactive
- demo fallback behavior is explicitly controlled by environment and docs
- first critical-path automated tests exist for auth, leave, attendance, and approvals

## Phase 2: Complete HR Admin Operations

Objective:

Make the system usable for day-to-day HR operations, not just employee and manager self-service.

Primary scope:

- employee create, edit, detail, and access management completion
- organization masters completion
- manager assignment maintenance
- richer search, filtering, and list workflows
- better operational dashboards for HR users

Expected outcomes:

- HR teams can maintain employee and org records without relying on admin-only workarounds
- upstream master data becomes reliable enough for policy and payroll readiness

Exit criteria:

- employee and organization masters are fully operable through the web app
- access and manager assignment workflows are production-usable
- admin screens have baseline validation, pagination, and error handling discipline

## Phase 3: Policy, Rules, and Workflow Maturity

Objective:

Make the product genuinely configuration-driven in behavior, not only in data structure.

Primary scope:

- leave eligibility and balance validation
- notice period, attachment, sandwich, and backdated logic
- attendance rule enforcement
- workflow step maturity, escalation, delegation, and history
- scoped configuration and publish discipline

Expected outcomes:

- policies consistently drive runtime behavior
- customers can fit the product to their operations with less code change pressure

Exit criteria:

- key leave and attendance rules are enforced at submission and approval time
- workflow templates support real operational complexity
- configuration changes can be published with traceability

## Phase 4: Lifecycle, Documents, and Employee Record Completion

Objective:

Turn the platform into a complete employee-record and lifecycle operating system.

Primary scope:

- onboarding checklist depth
- probation and confirmation maturity
- transfer, promotion, resignation, and exit completion
- document upload and verification lifecycle
- expiry reminders and generated HR letters

Expected outcomes:

- employee lifecycle operations are tracked end-to-end
- document handling is not dependent on manual offline processes

Exit criteria:

- onboarding through exit flows have usable operational screens and state transitions
- document storage and re-upload lifecycle work end-to-end
- key HR letters can be generated from the system

## Phase 5: Reporting, Audit, Notifications, and Operational Trust

Objective:

Give customers and operators the visibility needed to trust and scale the platform.

Primary scope:

- HR, leave, attendance, and lifecycle reports
- CSV and Excel exports
- audit viewers and approval timelines
- notification center
- email, push, and messaging delivery channels
- retry and failure management

Expected outcomes:

- operations teams can monitor usage, exceptions, and history without manual tracing
- communication flows become productized rather than ad hoc

Exit criteria:

- key operational reports are available and exportable
- notification delivery works across at least email and one additional channel
- audit visibility exists for critical employee and approval changes

## Phase 6: Payroll Foundations

Objective:

Start payroll as a controlled program only after HR data, attendance, and policies are stable enough.

Primary scope:

- salary structure and pay component design
- payroll inputs and pay groups
- payroll periods and run orchestration
- payslip foundations
- statutory deduction design
- payroll audit and explainability model

Expected outcomes:

- the project moves from HRMS-first into HRMS plus payroll without destabilizing the current platform

Exit criteria:

- payroll domain model and run lifecycle are agreed and implemented at foundation level
- salary components, periods, and inputs are operable
- payroll output explainability is designed from day one

## Phase 7: Payroll Maturity and India Compliance Depth

Objective:

Make payroll usable for repeatable monthly operations in the India-first target market.

Primary scope:

- arrears, reimbursements, loans, advances, and settlements
- full and final settlement
- statutory outputs
- payroll reports and registers
- compliance process support
- accounting export and bank file generation

Expected outcomes:

- payroll becomes a true operating stream, not only a modeling exercise

Exit criteria:

- monthly payroll can be processed with controlled outputs
- statutory and finance handoff paths are implemented
- payroll audit and approval flow are operational

## Phase 8: Platform Scale and Ecosystem Expansion

Objective:

Prepare the product for larger customers, partner ecosystems, and broader geographies.

Primary scope:

- public APIs and webhooks
- biometric and external system integrations
- localization packs
- observability, staging, backup, and operational readiness
- performance and multi-tenant scale improvements
- enterprise controls and deployment options

Expected outcomes:

- the platform can support larger customer complexity and external system interoperability

Exit criteria:

- platform operations are mature enough for higher-scale and integration-heavy customers
- localization and integration patterns are reusable rather than one-off

---

## 4. Recommended Order Of Investment

The preferred long-term order is:

1. stabilize quality and permissions
2. complete HR admin operations
3. deepen policies and workflows
4. complete lifecycle and documents
5. establish reporting, audit, and notifications trust
6. start payroll foundations
7. mature payroll for India operations
8. expand platform scale and integrations

This ordering reduces the risk of building payroll on top of unstable employee, policy, and attendance behavior.

---

## 5. Program Guardrails

The roadmap should be reviewed if any of the following happen:

- the target market shifts away from India-first SMB and mid-market
- a customer requires payroll earlier than expected
- integration commitments become more important than direct module depth
- the team decides to commercialize the product before the quality baseline is improved

If priorities shift, the sequence may change, but quality hardening and permission safety should still remain near the front of the roadmap.

---

## 6. Summary

The long-term roadmap should now favor completion, trust, and operational depth over adding more isolated module surfaces.

The best next major progression is:

- stabilize the current platform
- complete HR admin and policy execution
- finish lifecycle and documents
- build trust layers
- then begin payroll as a deliberate program
