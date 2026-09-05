# UI/UX Modernization Rollout Plan

## Objective

Modernize the HRMS web experience into a premium, unified design system that can be controlled centrally and rolled out safely without interrupting the current feature roadmap.

This plan intentionally separates:

- design-system foundation
- shell/navigation refactor
- module migration
- visual polish

That sequencing matters. If we skip the foundation, the app will become visually inconsistent very quickly.

## Current Frontend Reality

The current frontend gives us a useful starting point:

- most product surfaces already share common class names like `shell`, `hero`, `card`, `panel`, and `button`
- many admin screens follow similar queue or form patterns
- global styling already lives in one place: `web/src/app/globals.css`

The main problem is not lack of structure. The problem is that the structure is still too primitive for a modern product and too dependent on page-specific markup.

## Rollout Strategy

### Phase 0: Design Audit And Visual Direction

Deliverables:

- inventory of current shared classes and repeated layout patterns
- screenshot audit of key modules
- final visual direction board for light theme
- approved style principles for typography, color, iconography, surfaces, and motion

Key files to review:

- `web/src/app/globals.css`
- `web/src/app/layout.tsx`
- `web/src/app/hr-admin/page.tsx`
- lifecycle, documents, reports, ESS, MSS high-traffic screens

Decision outputs:

- approved color system
- approved typography stack
- approved spacing/radius/shadow language
- approved shell structure

### Phase 1: Build The Single Source Of Truth

Goal:

Create the central theming and component foundation before touching most screens.

Deliverables:

- token files
- theme files
- motion file
- base UI primitives
- central navigation config
- app shell scaffolding

Target implementation structure:

```text
web/src/styles/tokens.css
web/src/styles/motion.css
web/src/styles/themes/default.css
web/src/components/ui/
web/src/components/shell/
web/src/lib/ui/navigation.ts
web/src/lib/ui/module-metadata.ts
```

Success criteria:

- colors and spacing no longer depend on ad hoc page-level values
- button/input/card styles come from shared primitives
- navigation can be changed from one configuration file

### Phase 2: Introduce The New App Shell

Goal:

Replace the current page-by-page structure with one product shell.

Deliverables:

- persistent sidebar
- top utility bar
- shared page header pattern
- responsive shell behavior for laptop and mobile widths
- module-aware active state and breadcrumbs

Target routes for first adoption:

1. `/hr-admin`
2. `/hr-admin/lifecycle`
3. `/hr-admin/employee-documents`
4. `/hr-admin/reports`

Success criteria:

- major admin surfaces feel connected
- users can move between modules without visual reset
- nav grouping is clearer

### Phase 3: Modernize Shared Patterns

Goal:

Upgrade the most repeated interaction patterns so all modules inherit better UX quickly.

Deliverables:

- queue/list recipe
- filter toolbar recipe
- metric cards recipe
- detail card recipe
- form section recipe
- empty state and loading skeleton recipe

Priority reusable components:

- `PageHeader`
- `MetricCard`
- `FilterToolbar`
- `QueueCard`
- `PaginationBar`
- `BulkActionBar`
- `FormSection`
- `InlineNotice`
- `EmptyState`

Success criteria:

- lifecycle and documents pages feel intentionally designed
- queue-heavy admin workflows become faster to scan
- future modules can reuse the same patterns

### Phase 4: Migrate Core Modules

Goal:

Apply the new system to the highest-value product surfaces first.

Migration order:

1. HR admin landing page
2. lifecycle queue and specialist lifecycle queues
3. employee documents queue
4. reports landing page
5. attendance operations
6. employee masters
7. notifications admin
8. ESS and MSS dashboards

Each module migration should include:

- shell adoption
- token-only styling
- primitive replacement
- inline style removal where practical
- state polish for loading, empty, warning, and success cases

### Phase 5: Polish And Personalization

Goal:

Add the features that make the product feel more contemporary and memorable.

Deliverables:

- command palette
- saved filter presets
- keyboard shortcuts for queues
- optional density settings
- optional theme variants
- subtle onboarding and walkthrough cues

These should come after the system is stable, not before.

## Rules For Implementation

### Rule 1: Centralize Before Beautifying

If a style decision cannot be controlled centrally, it should not be introduced yet.

### Rule 2: Prefer Semantics Over Raw Values

Use semantic tokens such as:

- `--color-surface-primary`
- `--space-page-x`
- `--radius-card`

Avoid scattering raw hex values and one-off spacing across pages.

### Rule 3: Replace Inline Styling Gradually

Many current files use inline styles for:

- typography size
- spacing
- input sizing
- justification and layout tweaks

Those should be migrated into shared component APIs and reusable CSS classes.

### Rule 4: Preserve Behavior While Redesigning

The UI refactor must not break:

- current backend integrations
- URL-driven filters
- pagination state
- demo mode parity
- bulk actions
- form validation behavior

## Design-System Governance

To keep the UI modern and controlled, every new frontend change should answer:

1. Which shared token controls this?
2. Which shared primitive or layout recipe should this use?
3. Is this pattern already solved elsewhere?
4. Can the navigation or label change be made from config?

If the answer is no, the system should be extended before the page is hand-styled.

## Risks And How We Avoid Them

### Risk: Visual inconsistency during migration

Mitigation:

- migrate by shell and component recipe, not random screens
- use feature branches by phase

### Risk: Slowing down feature delivery

Mitigation:

- start with the highest leverage primitives
- redesign priority modules already under active development

### Risk: Modern look but weak usability

Mitigation:

- use real workflow screens as test cases
- validate queue density, not just dashboards

### Risk: Theme drift over time

Mitigation:

- centralized tokens
- centralized navigation config
- documented component usage rules

## Recommended Immediate Next Steps

### Step 1

Approve the target visual direction:

- light-first premium theme
- soft neutral surfaces
- bold accent
- modern shell
- cleaner cards and filter bars

### Step 2

Build the design-system foundation only:

- tokens
- theme files
- shell
- primitives

### Step 3

Apply the first redesign to:

- HR admin home
- lifecycle queue

Those two surfaces are enough to validate the direction before rolling it through the rest of the product.

## What We Should Build Next After Approval

Once this plan is approved, the next implementation ticket should be:

**"Create the shared web design system foundation and the new HR admin shell."**

That should include:

- token extraction from `globals.css`
- semantic theme layer
- reusable button/card/input primitives
- central navigation config
- first-pass sidebar + topbar shell

## Definition Of Done For The First UI Milestone

The first milestone is complete when:

- the app has a central theme/token system
- navigation is controlled from one configuration file
- HR admin home uses the new shell
- lifecycle queue uses the new shell and updated shared patterns
- no new page in that milestone depends on one-off styling decisions
