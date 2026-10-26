# Platform Admin Phase 3: Launch Blueprint, Launch Readiness and Admin Access

Accepted: 26 October 2026. Scope: `/platform-admin/launch`, `/platform-admin/onboarding`, `/platform-admin/admins`, their launch/readiness/admin mutations, and the connected Platform API integrity boundary. Evidence: [`platform-admin-makeover-phase3-2026-10-26`](../qa/evidence/platform-admin-makeover-phase3-2026-10-26/).

## Outcome

The three tenant-launch workspaces now follow one compact, dependency-first Accerio hierarchy. Each route has one page title, one four-cell summary and one explicit next required action. The duplicate shared-console tab strip and repeated panel guide have been removed; the synchronized Platform shell remains the route selector and keeps the selected tenant in the URL.

Launch Blueprint summarizes tenant/plan, selected blueprint/version, current-session preview evidence and safe-setup/handoff state. Its next action advances from required inputs to preview, safe apply, handoff, drift and certification. Input or blueprint changes invalidate the client preview immediately. The server still owns freshness, subscription, version, idempotency, safe-seeder, repair and upgrade decisions.

Launch Readiness summarizes initial setup, usable primary admin access, handoff and activation. The first incomplete checklist dependency becomes the primary action while the full ordered checklist and audit timestamps remain visible. Admin Access separates contact count, provisioned login count and usable primary access, then routes the operator to add a primary contact, provision a login or continue readiness.

## Launch and lifecycle safeguards

- Required blueprint inputs are identified before preview. Apply remains disabled until a fresh preview is apply-ready.
- A tenant plan change after preview causes server rejection; a new preview is required before apply.
- Starter, Growth and Enterprise compatibility remains backend-derived. Plan-locked modules are not silently applied.
- Safe apply creates only certified setup modules and records a launch run. A confirmed apply cannot be replayed through the UI; later changes use governed drift, repair or upgrade operations.
- Customer handoff requires safe-apply evidence and notes. Drift is read-only; repair and upgrade remain disabled without authoritative compare evidence.
- Readiness handoff and activation remain blocked until their backend prerequisites are met. Confirmation dialogs retain customer context.
- Contact creation and edits retain values after validation or interrupted responses. The UI makes no success claim and tells the operator which authoritative record to inspect before retrying.
- Login provisioning is not automatically replayed after an interrupted response. A generated password is shown only after confirmed provisioning, never placed in the URL and removed on reload.
- Contact and onboarding reads remain tenant-isolated. Employee credentials receive no Platform launch, readiness or blueprint data.

## Responsive and accessibility result

Launch Blueprint, Launch Readiness and Admin Access were captured at 1440px and 390px in Chromium, Firefox and WebKit. The 18 full-page captures have no document-level horizontal overflow. Compact summaries become two-by-two blocks on small screens; the next action stacks above a full-width button; long forms, checklists and evidence cards remain readable.

Nine selected WCAG 2 A/AA and 2.1 AA axe reports contain zero violations. Manual screenshot review confirmed one H1, visible tenant context, readable summary values, clear disabled reasons and consistent primary-action placement. This does not establish complete WCAG conformance, native zoom or screen-reader certification.

## Acceptance evidence

| Gate | Result |
| --- | --- |
| Browser scenarios | 12/12 passed, four per engine, retries disabled |
| Responsive captures | 18: three routes at 1440px and 390px in three engines |
| Selected axe scans | 9/9 reports with zero violations |
| Blueprint lifecycle | Required-input guard, Starter/Growth difference, fresh preview, stale-plan rejection, safe apply and repeat protection |
| Governed continuation | Customer handoff, drift check, repair/upgrade disabled without evidence and launch-run persistence |
| Admin lifecycle | Interrupted create preservation, confirmed contact, generated credential receipt, reload clearing and tenant isolation |
| Readiness | Ordered next dependency, direct handoff/activation rejection and disabled UI actions before prerequisites |
| Authorization | Employee denial for onboarding, launch-run and blueprint APIs |
| Backend regression | 29/29 focused Platform onboarding API tests passed on disposable PostgreSQL |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift and diff checks passed |
| Cleanup | Browser workspaces, phase tenants/users, services, ports and PostgreSQL container removed with absence evidence |

## Phase 4 handoff

Phase 4 covers Setup Templates and Permission Catalog. It should apply the same compact catalog/form hierarchy, certify draft/published and clone/version rules, preserve selected tenant and committed permission filters, and prove immutable permission keys, template dependency validation, adoption/upgrade isolation and interrupted-response recovery.
