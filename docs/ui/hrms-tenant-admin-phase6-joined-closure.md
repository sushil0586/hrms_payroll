# Tenant Admin Phase 6: joined family closure

Accepted: 26 October 2026. Scope: the Tenant Admin dashboard, shared navigation, all twelve Tenant Admin routes and the joined account-control workflows. Evidence: [`tenant-admin-makeover-phase6-2026-10-26`](../qa/evidence/tenant-admin-makeover-phase6-2026-10-26/).

## Outcome

The twelve-route Tenant Admin family now follows one compact Accerio workspace contract. The dashboard uses the same four-cell operational summary as the accepted access, setup, calendar and governance pages. Database-backed and fallback navigation use the same labels, including **Roles & Permissions**, **Plan & Billing** and **Audit Trail**. Every desktop route exposes exactly one current navigation item.

The closure preserves the existing permission, lifecycle, maker/checker, audit and tenant-isolation rules. It does not change billing, identity, leave, finance, retention or support-session policy.

## Joined behavior

- All twelve pages expose one H1, a four-cell decision summary, useful task content and no document-level overflow at 1440px or 390px.
- Settings hands a governed account change to Plan through reload-stable URL state. A confirmed request appears immediately in the request register.
- A Support request can be reviewed, approved, started and ended, after which its session reference opens the matching Trust Audit scope and survives reload.
- User invitation dialogs move focus to the first useful field, close with Escape and restore focus to the opener.
- An employee cannot open the Tenant Admin workspace and receives no data from representative dashboard, role, calendar, security, audit or governance API surfaces.
- The dashboard retains its action queue, readiness checklist and focused workspace destinations while adopting the shared compact summary hierarchy.

## Acceptance evidence

The final suite ran with retries disabled against one production Next.js build and one disposable PostgreSQL database:

| Gate | Result |
| --- | --- |
| Chromium | 4/4 passed |
| Firefox | 4/4 passed |
| WebKit | 4/4 passed |
| Responsive captures | 72: twelve routes at 1440px and 390px in all three engines |
| Axe scans | 36/36 route reports with zero selected WCAG 2 A/AA and 2.1 AA violations |
| Backend regression | 68/68 passed: 26 menu/onboarding/authorization, 29 Tenant Admin API and 13 calendar/Leave Year/governance tests |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift and diff checks passed |

The automated evidence covers current-route navigation, responsive summaries, joined state handoffs, persisted governed mutations, support-session audit linkage, keyboard dialog focus and representative employee denial. It does not establish complete WCAG conformance, native-zoom or screen-reader usability, production deployment or customer-data behavior.

## Reusable family contract

Future Tenant Admin work should begin with the shared `PageIntro`, a four-cell summary when it improves the next decision, one primary operational surface and explicit confirmed, uncertain and denied outcomes. Dataset scope belongs in the URL when users need reload, sharing or history. Wide registers retain semantic table structure inside named keyboard-scrollable regions. Navigation wording must remain identical in the code fallback and synchronized database catalog.

Phase 6 closes the planned Tenant Admin makeover. New Tenant Admin routes should be added to the route inventory and certified against this family contract before release.
