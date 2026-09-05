# UI/UX Modernization Strategy

## Why This Work Is Needed

The current web app is functionally strong, but its interaction model and visual language still feel like an early internal tool:

- most pages are built from the same `hero`, `card`, `panel`, and `button` patterns
- visual styling is mostly controlled from `web/src/app/globals.css`
- many pages still rely on repeated inline styles
- navigation is page-by-page instead of feeling like one connected product
- list-heavy admin workflows work, but they do not yet feel premium, fast, or modern

The goal is to evolve the app into a cleaner, more contemporary HR operating system that feels:

- lighter
- sharper
- more personalized
- more keyboard-friendly
- more mobile-aware
- more aligned with what Gen-Z users expect from modern workplace software

This does not mean copying any one reference screen exactly. It means adopting the underlying qualities:

- clear visual hierarchy
- softer surfaces and better spacing
- bolder typography
- fewer hard edges
- stronger iconography
- dashboard layouts that feel curated, not generic
- fast actions, fast filtering, and instant feedback

## Product Design Direction

### Core Experience Principles

1. The app should feel like one product, not a collection of forms.
2. The most frequent actions should be visible within one click or one shortcut.
3. Dense HR operations should still feel calm and easy to scan.
4. Every state should feel intentional: loading, empty, success, warning, and error.
5. Mobile and smaller laptops should remain usable without the layout collapsing awkwardly.

### Gen-Z Friendly, But Still Enterprise-Safe

For this product, "Gen-Z friendly" should be interpreted as:

- modern and expressive, not playful for its own sake
- fast and responsive, with subtle motion and feedback
- customizable, with visible personalization controls later
- less text-heavy, more signal per screen
- more guided flows, fewer intimidating walls of fields

This should still remain enterprise-safe:

- readable
- accessible
- trustworthy
- stable
- not dependent on trend gimmicks

## Target Visual Language

### Overall Mood

The target UI should feel:

- bright
- soft
- layered
- premium
- operationally confident

### Recommended Visual Characteristics

- soft neutral canvas with selective color accents
- glass-light surfaces or elevated matte panels, used sparingly
- expressive headings with tighter line-height and stronger scale
- rounded but not overly playful radii
- clean icon-led navigation
- gentle gradients and ambient background depth
- stronger card grouping using bento-style composition where useful
- richer status chips and inline metadata

### What To Avoid

- flat corporate gray screens
- purple-everywhere defaults
- generic admin-template look
- inconsistent corner radii across controls
- oversized forms without grouping
- too many competing button styles
- excessive animation

## Single-Place Control Architecture

The redesign must be controlled from a central system, not by re-styling every page independently.

### Design System Control Layers

#### 1. Global Design Tokens

Create one source of truth for:

- colors
- spacing
- radii
- shadows
- typography
- surface opacity
- border styles
- motion timing
- layout widths

Recommended file structure:

```text
web/src/styles/tokens.css
web/src/styles/themes/default.css
web/src/styles/themes/brand-neo.css
web/src/styles/motion.css
```

These files should replace the current role of `web/src/app/globals.css` as the main visual authority.

#### 2. Semantic Theme Layer

Use semantic variables instead of hard-coded colors:

- `--color-bg-app`
- `--color-bg-surface`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-border-soft`
- `--color-accent-primary`
- `--color-accent-success`
- `--color-accent-warning`
- `--color-accent-danger`

This allows one theme change to restyle the whole application without rewriting component CSS.

#### 3. Shared UI Primitives

Create reusable primitives for:

- buttons
- inputs
- selects
- textareas
- pills
- badges
- cards
- notices
- section headers
- page containers
- empty states
- loading skeletons

Recommended location:

```text
web/src/components/ui/
```

#### 4. Shared Product Shell

Create a consistent shell that all major app areas can reuse:

- left sidebar navigation
- top command/search bar
- global user menu
- page title area
- optional secondary tabs
- content container rules

Recommended location:

```text
web/src/components/shell/
web/src/lib/ui/navigation.ts
```

This is the biggest step toward making the app feel unified.

#### 5. Central Navigation Configuration

The sidebar, section groups, icons, labels, and route metadata should come from one config instead of being scattered across pages.

Recommended location:

```text
web/src/lib/ui/navigation.ts
web/src/lib/ui/module-metadata.ts
```

This gives us one place to control:

- labels
- icons
- ordering
- route grouping
- quick actions
- future permissions-aware nav

#### 6. Layout Recipes

Define standard layout recipes that page authors can reuse:

- dashboard
- queue/list
- detail + side panel
- create/edit form
- reports
- settings

Recommended location:

```text
web/src/components/patterns/
```

## Proposed Technical Structure

### Current State

Today the app is visually anchored by:

- `web/src/app/globals.css`
- repeated page markup in `web/src/app/hr-admin/**`
- inline style objects inside forms and queue components

### Target State

We should move toward:

```text
web/src/
  app/
    globals.css
  components/
    shell/
    ui/
    patterns/
  lib/
    ui/
      navigation.ts
      module-metadata.ts
      theme-config.ts
  styles/
    tokens.css
    motion.css
    themes/
      default.css
      brand-neo.css
```

### Role Of `globals.css`

`web/src/app/globals.css` should remain, but its job should become:

- import tokens
- import theme files
- import base resets
- define a few app-wide utility classes

It should not remain the long-term home for every visual rule in the product.

## UX Patterns We Should Introduce

### Global App Shell

The whole application should move to a shared shell with:

- fixed left navigation
- compact top bar
- searchable modules and actions
- clearer module identity

### Better Queue/List Experience

For admin-heavy areas like lifecycle, documents, attendance, and notifications:

- filter bar should feel compact and powerful
- bulk actions should be sticky and obvious
- selected state should be stronger
- pagination should look more modern
- row cards should support fast scanning
- important metadata should be grouped into chips and sublabels

### More Guided Forms

Current forms work, but many still look like long technical forms. The redesign should move them toward:

- grouped sections
- better labels and helper text
- progress indicators for multi-part forms
- sticky action bar where appropriate
- inline warnings and readiness summaries

### Feedback And Motion

Add restrained motion for:

- hover elevation
- page entrance
- filter application
- success confirmation
- loading skeletons

Motion should feel polished, not noisy.

### Empty, Loading, And Error States

Every major list and form flow should have standardized:

- empty states
- loading skeletons
- inline save states
- actionable error banners

## Accessibility And Usability Requirements

This redesign must improve accessibility, not reduce it.

Required standards:

- strong text contrast in the default light theme
- visible focus states for keyboard users
- minimum target sizes for touch interactions
- reduced-motion support
- semantic headings and landmarks
- readable form labels and descriptions

## Rollout Principles

1. Do not restyle route-by-route in an ad hoc way.
2. Build the design system first, then migrate screens in batches.
3. Start with the shared shell and primitives before touching niche pages.
4. Move inline styles into reusable components or token-driven classes.
5. Preserve current backend functionality and URL-driven state while modernizing visuals.

## Priority Surfaces For Redesign

The first redesigned surfaces should be:

1. global shell
2. HR admin landing page
3. lifecycle queue
4. employee documents queue
5. onboarding create/edit flow
6. reports landing page

These screens are high-traffic and will establish the new product language for the rest of the app.

## Definition Of Success

The redesign is successful when:

- the app looks like one modern platform
- colors, spacing, and surfaces are controlled from one system
- navigation and layout are centralized
- new pages can be built quickly using shared recipes
- dense HR workflows feel lighter and easier to use
- the product feels premium enough for customer demos and stakeholder reviews
