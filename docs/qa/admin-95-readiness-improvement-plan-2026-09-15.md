# Admin 95% Readiness Improvement Plan

Date: 2026-09-15  
Scope: Platform Admin first, then Tenant Admin using the same standard  
Target: raise functionality readiness, QA confidence, and user-friendliness to 95% before public launch.

## Current Baseline

| Area | Current Rating | Target | Current Meaning |
| --- | ---: | ---: | --- |
| Platform Admin functionality readiness | 85% | 95% | Core tenant onboarding, admin contact, activation gate, audit evidence, security denial, tabs, pagination, and validation flows work on staging. |
| Platform Admin QA confidence | 88% | 95% | Live browser certification passed for the current Platform Admin pack, but full real-user checklist coverage still needs stronger evidence per screen and per action. |
| Platform Admin user-friendliness | 70-75% | 95% | Create Tenant and Add Admin Contact are simpler now, but the workspace still uses operational concepts that are not always obvious to a non-technical operator. |

## 95% Definition

A workspace reaches 95% only when all of these are true:

- A first-time operator understands what to do next without asking engineering.
- Each page has one clear responsibility.
- Every primary action has clear success, failure, validation, and blocked-state messaging.
- Every CRUD action that exists in the UI works through the browser.
- Every long list has search, filters where useful, and pagination.
- Every destructive or irreversible action has confirmation or clear guardrails.
- Every workflow leaves audit evidence visible after refresh.
- All role restrictions are tested: allowed role succeeds, wrong role is denied.
- Desktop and mobile layouts have no horizontal overflow, hidden actions, or visual misalignment.
- Local and staging Playwright certification pass after each phase.

## Phase PA-95-0: Baseline Re-Inventory

Status: Complete locally on 2026-09-15  
Goal: freeze the current Platform Admin surface and map every visible control to a test obligation.

Implementation tasks:

- Inventory all Platform Admin routes and tabs.
- List every button, link, tab, form field, dropdown, textarea, status badge, table, and pagination control.
- Mark each item as one of: view-only, create, update, delete/archive, transition, export, filter, navigation.
- Identify ambiguous labels, internal terms, and flows where the next step is unclear.
- Create a “must certify” checklist per page.

Browser certification:

- Login as Platform Admin.
- Visit every Platform Admin menu item and tab.
- Capture screenshots for desktop and mobile.
- Verify no visual overflow or hidden primary action.
- Verify no page shows raw technical validation like JSON arrays without friendly wording.

Exit criteria:

- Every current Platform Admin element has an owner and expected behavior.
- Any unclear UX is logged as a concrete implementation task.
- Ratings do not increase yet; this is evidence collection.

## Phase PA-95-1: Rename And Explain Operator Concepts

Status: Complete locally on 2026-09-15; staging deploy pending check-in  
Goal: make Platform Admin understandable without product-team vocabulary.

Implementation tasks:

- Rename or soften confusing labels in UI:
  - “Policy Packs” -> “Setup Templates” or “Default Setup Templates”.
  - “Baseline” -> “Initial Setup Snapshot”.
  - “Handoff” -> “Ready for Tenant Admin”.
  - “Activation Gates” -> “Launch Checklist”.
  - “First Admin Provisioning” -> “Tenant Admin Users”.
- Add compact helper text only where it prevents confusion.
- Add next-step copy when a gate is blocked.
- Replace technical backend errors with friendly validation summaries.
- Keep messages lightweight so the page does not become noisy or misaligned.

Browser certification:

- Verify all renamed labels appear consistently in sidebar, tabs, headings, buttons, and empty states.
- Trigger blocked handoff before primary admin exists and verify friendly message.
- Trigger duplicate tenant/admin contact validation and verify friendly message.
- Verify desktop/mobile layout remains aligned.

Exit criteria:

- A non-technical platform operator can describe each tab’s purpose.
- No critical Platform Admin action displays unexplained internal terms.
- Target uplift: user-friendliness +5%.

## Phase PA-95-2: Guided Tenant Onboarding Checklist

Status: Complete locally on 2026-09-15; staging deploy pending check-in  
Goal: make the tenant onboarding sequence obvious from one screen.

Implementation tasks:

- Add a guided checklist for selected tenant:
  - Tenant created.
  - Setup template selected/published.
  - Primary tenant admin added.
  - Tenant admin user provisioned.
  - Initial setup snapshot published.
  - Ready for Tenant Admin marked.
  - Tenant activated.
- Show each step as Done, Needs action, Blocked, or Optional.
- Each blocked step must show exactly what is missing.
- Each checklist item should deep-link to the right tab/action.
- Disable or guard actions that are not allowed yet with a clear reason.

Browser certification:

- New tenant starts with expected incomplete checklist.
- Add primary admin and verify checklist updates.
- Publish setup snapshot and verify checklist updates.
- Attempt Ready for Tenant Admin before required step and verify clear blocked message.
- Complete required steps and verify activation path.
- Refresh page and verify checklist state persists.

Exit criteria:

- Operator can onboard a tenant by following visible checklist only.
- No dependency failure requires guessing.
- Target uplift: functionality +3%, user-friendliness +7%, QA +2%.

## Phase PA-95-3: Full CRUD And State Transition Certification

Status: Complete on staging on 2026-09-15  
Goal: prove every Platform Admin mutation works from browser with positive and negative coverage.

Implementation tasks:

- Confirm or implement UI support for all required actions:
  - Create tenant.
  - Edit tenant profile/status where allowed.
  - Add admin contact.
  - Edit admin contact.
  - Provision tenant admin login/access.
  - Publish setup template/snapshot.
  - Adopt setup template into tenant.
  - Mark Ready for Tenant Admin.
  - Activate, suspend, and reactivate tenant where allowed.
  - Review public leads and convert to tenant.
  - Search/filter/paginate tenants, leads, admins, templates, and events.
- Add missing confirmation dialogs for high-impact transitions.
- Add success toasts or inline success states consistently.

Browser certification:

- Positive CRUD for each supported entity.
- Negative validation for each required field and dependency.
- Duplicate and invalid data scenarios.
- Wrong-role denial for each API route and page.
- Refresh-after-mutation proof for each action.
- Audit event proof for each state transition.

Exit criteria:

- Platform Admin CRUD/state transition pack passes locally and on staging.
- Target uplift: functionality +5%, QA +4%.

## Phase PA-95-4: List Usability, Search, Filters, And Pagination

Status: In progress; tenant, setup template, and event filters complete locally on 2026-09-15  
Goal: make long operational pages manageable at realistic data volume.

Implementation tasks:

- Ensure every long list has pagination.
- Add search to tenants, leads, contacts/admins, templates, and events.
- Add useful filters:
  - Tenant status.
  - Plan.
  - Onboarding state.
  - Lead status.
  - Template status/domain.
  - Event type/date range where available.
- Preserve filters in URL where useful.
- Add empty filtered state with reset action.

Browser certification:

- Search narrows results.
- Filters narrow results.
- Pagination moves forward/back.
- Empty state appears and reset works.
- URL reload preserves selected route/panel where expected.
- Desktop and mobile list controls remain aligned.

Exit criteria:

- Operator can manage 100+ tenants/leads/templates without scanning one giant list.
- Target uplift: user-friendliness +5%, QA +2%.

## Phase PA-95-5: Visual Polish And Accessibility Pass

Status: In progress; route-by-route visual/mobile certification complete locally on 2026-09-15  
Goal: make the Platform Admin experience visually consistent with the improved Tenant Admin direction.

Implementation tasks:

- Normalize page headers, cards, modal sizes, spacing, and button hierarchy.
- Keep single-responsibility sections compact.
- Make primary action location predictable.
- Add accessible modal labels and keyboard close/focus behavior.
- Ensure form validation is announced or visibly tied to fields.
- Verify tap targets and readable density on mobile.

Browser certification:

- Playwright screenshot review for every Platform Admin route at desktop and mobile.
- Keyboard navigation through modals and forms.
- Focus returns after modal close.
- No clipped text in buttons, cards, sidebar, tabs, or badges.
- No overlapping elements at common viewport sizes.

Exit criteria:

- Platform Admin visually feels like a launch-ready SaaS control center.
- Target uplift: user-friendliness +5%, QA +1%.

## Phase PA-95-6: Staging Launch Certification

Status: Pending  
Goal: certify Platform Admin at 95% on staging after deployment.

Required staging pack:

- Post-deploy smoke.
- Platform Admin full route/menu pack.
- Platform Admin CRUD/state transition pack.
- Platform Admin negative/security pack.
- Platform Admin audit evidence pack.
- Platform Admin desktop/mobile visual pack.

Exit criteria:

- All required staging packs pass.
- No open critical/high Platform Admin defects.
- Medium defects must be documented with user-facing workaround or explicitly accepted.
- Platform Admin ratings reach:
  - Functionality readiness: 95%.
  - QA confidence: 95%.
  - User-friendliness: 95%.

## Tenant Admin Follow-On

After Platform Admin reaches 95%, repeat the same model for Tenant Admin:

- TA-95-0: inventory every route/control.
- TA-95-1: simplify dashboard into account control center.
- TA-95-2: split users, plan, support access, setup, security, and trust audit into single-responsibility pages.
- TA-95-3: move add/update flows into modals or drawers.
- TA-95-4: certify all CRUD/list/filter/pagination behavior.
- TA-95-5: certify mobile, accessibility, and visual alignment.
- TA-95-6: staging launch certification.

## Execution Log

| Date | Phase | Environment | Result | Ratings After Run | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-15 | Baseline before PA-95 | Staging | Platform Admin modal-flow deploy and certification passed: post-deploy smoke passed, Platform Admin browser pack `4 passed`. | Functionality 85%, QA 88%, UX 70-75% | Create Tenant and Add Admin Contact are modal-based; validation is clearer, but onboarding language and guided sequence still need simplification. |
| 2026-09-15 | PA-95-0 and PA-95-1 | Local UI against staging API | Passed: `pnpm --dir web lint`, `pnpm --dir web typecheck`, Platform Admin browser pack `4 passed`, `pnpm --dir web build`. | Functionality 87%, QA 90%, UX 80% | Renamed operator-facing concepts: Policy Packs -> Setup Templates, Activation Gates -> Launch Checklist, Baseline -> Initial Setup, Handoff -> Ready for Tenant Admin, Provision Admin -> Create Login Access. Found and fixed a real UX/layout defect where the login-access form could intercept Admin Contact edit clicks. |
| 2026-09-15 | PA-95-2 | Staging | Deployed commit `a55342f`; post-deploy smoke passed; Platform Admin browser pack `5 passed`. | Functionality 90%, QA 92%, UX 87% | Guided tenant launch checklist is live. Five-tenant browser onboarding proof now passes, including tenant admin login landing with clear selected-tenant context. |
| 2026-09-15 | PA-95-3 focused CRUD/state transitions | Local UI against staging API | Passed: `platform-admin-crud-state-transition-certification.spec.ts` `1 passed`. | Functionality 92%, QA 93%, UX 88% | New proof creates tenant, edits setup fields, suspends, reactivates, updates onboarding metadata, verifies tenant list persistence, verifies API payload state, and verifies audit event visibility. Observation: Events search currently matches event keys like `tenant_updated`; human phrase search such as `tenant updated` should be added in PA-95-4. |
| 2026-09-15 | PA-95-3 full certification | Staging | Deployed commit `b1519f0`; post-deploy smoke passed; Platform Admin browser pack with CRUD/state-transition proof `6 passed`. | Functionality 94%, QA 95%, UX 89% | Staging now proves create tenant, edit tenant profile/status, suspend/reactivate, onboarding metadata update, admin contact add/edit, first admin provisioning, setup template create/publish/apply, handoff/activation gates, security denial, pagination, and audit evidence after refresh. |
| 2026-09-15 | PA-95-4 event search usability | Local UI against staging API | Passed: `platform-admin-crud-state-transition-certification.spec.ts` `1 passed`; `pnpm --dir web lint`; `pnpm --dir web typecheck`. | Functionality 94%, QA 95%, UX 90% | Events search now normalizes internal keys so human phrases such as `tenant updated` match `tenant_updated` audit events. |
| 2026-09-15 | PA-95-4 event search usability | Staging | Deployed commit `d8eece1`; post-deploy smoke passed; full Platform Admin browser pack `6 passed`. | Functionality 94%, QA 95%, UX 90% | Human-readable event search is live and certified inside the CRUD/state-transition proof. |
| 2026-09-15 | PA-95-2 | Local UI against staging API | Passed: `pnpm --dir web lint`, `pnpm --dir web typecheck`, Platform Admin browser pack `4 passed`, `pnpm --dir web build`. | Functionality 90%, QA 92%, UX 87% | Added selected-tenant guided launch checklist with numbered steps, Done/Needed/Blocked status, direct action links, and clear dependency messaging for tenant record, setup template, tenant admin login, readiness, and activation. |
| 2026-09-15 | PA-95-4 filters and pagination usability | Local UI against staging API | Passed: `pnpm --dir web lint`, `pnpm --dir web typecheck`, focused Platform Admin tabs/pagination/filter proof `1 passed`, `pnpm --dir web build`. Full local Platform Admin pack had `5 passed`, `1 failed` due local Next.js dev chunk reload error for `/tenant-admin/layout.js`; staging had previously passed the same tenant-admin landing path. | Functionality 94%, QA 95%, UX 92% | Added compact filters for tenant status/plan, setup template status/domain, and audit event type. Browser proof verifies filters narrow/reset without breaking pagination layout. Rerun full pack after local dev-server restart or after staging deploy. |
| 2026-09-15 | PA-95-4 filters and pagination usability | Staging | Deployed commit `78c6404`; post-deploy smoke passed; full Platform Admin browser pack `6 passed` in 7.3m. | Functionality 94%, QA 95%, UX 92% | Tenant, setup template, and audit event filters are live. Staging browser proof covers tab routing, filters, pagination, CRUD/state transitions, audit evidence, negative validation, security denial, and five-tenant onboarding. |
| 2026-09-15 | PA-95-5 feedback and dialog accessibility | Local UI against staging API | Passed: `pnpm --dir web lint`, `pnpm --dir web typecheck`, focused Platform Admin tabs/pagination/accessibility proof `1 passed`, `pnpm --dir web build`. | Functionality 94%, QA 95%, UX 93% | Feedback banners now use `status`/`alert` semantics with success/error styling. Create Tenant and Add Admin Contact dialogs now have labelled descriptions, focus the first required field on open, support Escape/backdrop close, and are covered by desktop/mobile screenshot-buffer proof with no horizontal overflow. |
| 2026-09-15 | PA-95-5 feedback and dialog accessibility | Staging | Deployed commit `7eb8f8d`; post-deploy smoke passed; full Platform Admin browser pack `6 passed` in 7.1m. | Functionality 94%, QA 95%, UX 93% | Staging certification confirms the accessibility/dialog changes did not regress Platform Admin onboarding, CRUD/state transitions, filters, pagination, validation, security denial, or audit evidence. |
| 2026-09-15 | PA-95-5 route visual/mobile certification | Local UI against staging API | Initial run found mobile horizontal overflow on `/platform-admin/admins`; fixed `.platform-admin-users-grid .tenant-support-access-row` mobile stacking. Passed after fix: new visual/accessibility pack `2 passed`, existing tabs/pagination pack `1 passed`, `pnpm --dir web lint`, `pnpm --dir web typecheck`, `pnpm --dir web build`. | Functionality 94%, QA 95%, UX 94% | New proof visits every Platform Admin route on desktop and mobile, captures Playwright report screenshots, checks active tab state, checks no app error/no horizontal overflow, and certifies dialog keyboard focus plus Escape close. |

## Current Next Recommended Phase

Start **PA-95-5 Visual Polish And Accessibility Pass** for Platform Admin, then close with **PA-95-6 staging launch certification**.

Reason:

- Core Platform Admin workflows are already staging-certified.
- PA-95-4 is now live and staging-certified.
- The remaining launch gap is mostly visual/accessibility polish, screenshot review, keyboard behavior, and final signoff rerun.
