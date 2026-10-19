# Accerio UI foundation implementation

Scope: ESS Dashboard, My Profile and Attendance presentation; shared ESS/MSS shell. No ESS-3, backend contract, business-policy, calculation, migration, release-gate or Lightsail changes.

## Audit and decisions

| Existing source | Finding | Decision |
| --- | --- | --- |
| `web/src/styles/tokens.css` | Established system font stacks, type/spacing/radius scales and motion durations | Reuse; no external font downloads or new UI dependency |
| `web/src/styles/themes/default.css` | Existing generic palette and compatibility aliases | Preserve for administration; add an opt-in Accerio semantic layer |
| `web/src/app/globals.css` | 249 employee/manager selector starts; repeated density, shell and color overrides | Central opt-in selectors override the cascade for ESS/MSS; broad deletion deferred because other modules depend on it |
| `components/shell/workspace-chrome.tsx` | Auth-independent common shell, authorized menu inputs, search, active routes, mobile menu, logout, navigation feedback | Reuse navigation behavior; opt ESS/MSS into one `accerio-workspace` theme |
| `components/patterns/workspace-standard.tsx` | Stable headers, section panels, table, filter bar, badges, form footer | Reuse instead of creating a second component family |
| `components/patterns/hr-admin-action-modal.tsx` | Existing focus management, Escape, dirty-state handling and explicit Safari tab order | Preserve behavior; attendance keeps its certified modal implementation |
| `components/patterns/workspace-loading.tsx`, `workspace-error-state.tsx` | Existing loading/error semantics | Preserve loading, retry and failure wiring; restyle via shared theme |
| `app/ess/ess-experience.css`, `attendance/attendance.css` | Hardcoded green/gray palette, repeated field/card styles; existing 767px/1100px responsive layouts | Replace page colors with semantic references; preserve calendar short labels, profile select and table scroll behavior |
| `app/ess/ess-profile-summary.tsx` | Employee field formatting mixed with reusable identity/field markup | Extract presentation; keep date/status formatting and authorized employee model adapter here |
| `app/mss/layout.tsx` | Already uses same shell; different product label | Use Accerio label and identical theme opt-in, without changing menus or manager workflows |
| `web/package.json` | React/Next only; no third-party component/icon library | Add no dependency or competing component library |

## Theme architecture

`web/src/styles/accerio.css` defines the single new semantic palette. It is imported once by the root layout after legacy global styles. The shared shell applies `.accerio-workspace` for employee and manager tones; administration can opt in later after its own visual regression review.

- Brand: indigo primary, darker hover and violet tinted selection.
- Surfaces: neutral canvas, opaque white panels, subtle secondary surface; restrained border and shadow.
- Content: dark primary and accessible muted text; semantic success/info/warning/danger foreground/background pairs.
- Shape: compact control and panel radii. Existing type, spacing and motion scales remain authoritative.
- Interaction: visible two-pixel focus outline with offset, semantic focus halo, retained keyboard behavior and disabled states.
- Responsive contracts: 1100px compact desktop and stacked dashboard panels; 900px shell switches to existing mobile navigation; 767px mobile profile/calendar presentation; 360px field fallback. CSS media queries use explicit documented values because native custom properties cannot be used in media query conditions.
- Reduced motion: existing global `styles/motion.css` suppresses animation/transition and smooth scrolling when requested.

No page-level hex colors are introduced. Legacy page CSS reads `--ds-*` variables; unsupported actions and all business statuses continue to come from the existing caller.

## Reused and extracted components

| Need | Implementation | Data boundary |
| --- | --- | --- |
| Shell/navigation | Existing `WorkspaceChrome` | Menu/RBAC inputs unchanged |
| Compact header and section | Existing `WorkspaceStandardHeader` / `WorkspaceStandardPanel` | Caller owns title/actions/authorized content |
| Identity | New `WorkspaceIdentity` in `workspace-information.tsx` | Name, initials, child metadata only; no employee fetch |
| Profile information | New `WorkspaceInformation`; existing `EssFields` export remains adapter-compatible | Already formatted label/value pairs |
| Quick action tiles | New `WorkspaceQuickActions` | Caller supplies authorized href/label/detail; no manufactured actions |
| Metrics | Existing attendance summary markup and information fields, styled as compact metric cards | Existing recorded values only |
| Calendar | New `WorkspaceCalendar`, extracted unchanged ESS-2 day/selection/short-label/key presentation into the shared layer | Employee-scoped monthly response unchanged |
| Tables/filter bars/badges | Existing shared patterns and table contracts | No query/permission logic in presentation |
| Forms/dialogs | Existing controls, action modal, validation and submission feedback | Existing UTC correction, idempotency and read-only restrictions preserved |
| Loading/empty/error/retry | Existing loading pattern and page states | No fabricated fallback business values |

## Preserved integration contracts

No backend or API route changes are required. `getEssOverview`, profile projection, monthly attendance reads, correction requests/history and all existing proxy contracts remain unchanged. Attendance native document period/history navigation, local calendar selection, explicit UTC correction input, post-submit read retry, selected-page behavior and closed historical data remain untouched.

Tests gain an optional `HRMS_CERT_EVIDENCE_DIR` output override, preserving the default behavior and original certification evidence. ESS-1/ESS-2 assertions and pass criteria are unchanged. The neighboring MSS smoke test replaces two stale default Inbox labels with exact, semantic heading assertions for the existing MSS Alert labels; all filter, routing and authorization checks are retained.

## Adoption and remaining work

This is an incremental foundation, not a rewrite of the large legacy stylesheet. Other ESS modules inherit the shared shell but retain their existing page layouts. MSS consumes the live shell and palette as an extensibility check; its business layout remains outside scope. HR/Tenant/Platform Admin adoption requires separate review and screenshots. Future cleanup should remove superseded rules only with module-specific regression evidence.

## Acceptance contract

1. Dashboard, Profile and Attendance retain their headings, real actions, employee scope, permissions and disabled/unavailable explanations. No static replacement counters or invented employee details.
2. All three share identical brand, readable text, borders, radii, focus and spacing primitives. Dashboard uses compact identity and actionable two-column sections rather than a decorative greeting banner.
3. Profile retains its overview/detail navigation, mobile select, masking and HR-controlled fields. Navigation and content remain keyboard reachable.
4. Attendance retains month/list/calendar/day links, stored statuses, recorded hours, timezone boundaries, paginated corrections, real validation/submission/status, read retry and finalized protection.
5. At desktop, tablet and mobile widths, navigation remains usable and the page does not overflow horizontally. Wide tables scroll inside their labelled regions. Status text remains visible alongside color.
6. Reduced-motion preference disables nonessential transition/animation. Focus is visible; dialogs keep focus/Escape/opener restoration; loading/error/retry remain semantic.
7. MSS uses the same live shell, token palette and control styles; approval, notification and role-boundary smoke checks remain valid.
8. Existing ESS browser assertions are retained. Existing evidence and frozen release-gate files are preserved. Production builds are tested with demo data disabled against isolated synthetic data, followed by verified cleanup.

## Review boundaries

No claim of complete WCAG conformance is made from browser smoke checks. Native browser zoom, screen-reader interoperability, comprehensive contrast scanning and audit of all legacy admin components require separate formal assessment. The foundation provides semantic tokens and consistent presentation; full migration of every historical global selector is deliberately outside this slice.

## Changed source for this foundation

- `web/src/styles/accerio.css`: opt-in semantic theme, shared identity/information/action/calendar styles, shell/controls/status/table and metric-card presentation.
- `web/src/app/layout.tsx`: single theme import.
- `web/src/components/shell/workspace-chrome.tsx`: ESS/MSS opt-in class and mobile-menu close on ordinary link activation; existing routes, modified-click behavior and auth retained.
- `web/src/components/patterns/workspace-information.tsx`: presentation-only identity, fields and authorized action tiles.
- `web/src/components/patterns/workspace-calendar.tsx`: presentation-only calendar with caller-supplied day descriptors and event callback.
- `web/src/app/ess/error.tsx`: retry reloads the same authenticated document URL to avoid a stale failed RSC boundary; no POST replay or query changes.
- `web/src/app/ess/ess-profile-summary.tsx`, `page.tsx`: consume extracted presentation components; service-panel layout hook.
- `web/src/app/ess/ess-experience.css`, `attendance/attendance.css`: semantic token references; shared presentation moved to the central stylesheet.
- `web/src/app/ess/attendance/attendance-workspace.tsx`: calendar presentation extraction and explicit opt-in class on portalled dialogs; certified date/query/submission/refresh behavior unchanged.
- `web/src/app/mss/layout.tsx`: Accerio product label; existing shared shell automatically consumes theme.
- `web/playwright.ess1.config.ts`, `web/playwright.ess2.config.ts`, their two existing suites: optional evidence-directory override only.
- `web/playwright.accerio.config.ts`, `web/tests/e2e/accerio-foundation.spec.ts`: isolated foundation and existing neighboring MSS checks.
- `web/tests/e2e/user-journey-phase4-manager-workflow.spec.ts`: two stale label assertions corrected to exact existing MSS headings; no workflow/RBAC assertions removed.
- The two foundation documents, ESS coverage tracker and new evidence directory.

The workspace already contained ESS-1/ESS-2 implementation and other uncommitted work at task start. Those prior backend, API, infrastructure, QA and documentation changes are not newly attributed to this foundation. No API contract or backend source was edited for this task.

## Shared presentation interfaces

```tsx
WorkspaceIdentity({ name, initials, children })
WorkspaceInformation({ fields: Array<[label, formattedValue]> })
WorkspaceQuickActions({ actions: Array<{ href, label, detail }> })
WorkspaceCalendar({ offset, days, onSelect })
```

`WorkspaceCalendarDay` contains date/number, full accessible label, visible status/short status, finalized/selected flags and href. It does not compute attendance, date ranges, shifts, availability or approvals. Native modified-link behavior and day-selection handling remain the caller's responsibility. Every day remains a real link; selected state uses `aria-current="date"`; the mobile key preserves text alternatives.

Metric cards, section panels and information panels use label/value semantics and avoid color-only meaning. Existing badges keep explicit text. Empty data retains real unavailable/not-recorded explanations. No component fetches APIs, examines role codes or approves a request.

Legacy `ess-*` class names on the extracted presentation are retained to avoid breaking certified selectors and existing page CSS. Their shared baseline now lives in `styles/accerio.css`; the components do not require the ESS route stylesheet or employee APIs. This compatibility naming is not a separate theme. The search chip explicitly contains its minimum-size input, and portalled attendance dialogs opt into the same variable aliases as the shell.

Rendered regression findings fixed in this slice: the shared search frame now contains its input instead of retaining the old 26px frame; attendance metrics explicitly reset legacy `white-space: nowrap`, preserve bounded grid widths and restore the last card's border. The wrapping fix addresses real 320px overflow without clipping data or relaxing overflow assertions. Loading surfaces and success/error feedback consume the same semantic palette.

Tablet dashboard panels stack below 1100px and balance columns use automatic sizing. This prevents touching/overlapping headings at intermediate widths and eliminates the unused half-row beside the approval card. A focused rendered assertion now rejects clipped leave-table headings.

Fault-injection regression also exposed an intermittent global ESS retry stall in `router.refresh()`/boundary reset. Retry now performs a fresh document GET via `window.location.reload()`, retaining the current route/query and authentication. This is read-recovery infrastructure, with no change to employee permissions, data contracts, attendance decisions or submission semantics. Metric grid rows stretch their cards so wrapped labels preserve alignment.

Shared mobile navigation is positioned against the full header rather than the left-hand Menu trigger, so wrapped action rows cannot push the dropdown off-screen. Its scrollable panel uses the viewport height, semantic surfaces and primary selected state. ESS/MSS mobile selection closes the native details panel; modified clicks keep native behavior. Bounds and actual approval-link navigation/closure are tested.
