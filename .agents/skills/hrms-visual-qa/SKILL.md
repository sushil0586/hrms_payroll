---
name: hrms-visual-qa
description: Inspect rendered HRMS screens and interaction states for visual consistency, responsive behavior, keyboard access, and accessibility with retained browser evidence.
---
# HRMS visual QA

Read root `AGENTS.md`, applicable existing `docs/ui` standards, and [screen checklist](references/screen-checklist.md). Use existing shared shell, patterns, and tokens as the design contract; do not create a competing style guide.

Discover every applicable route, role-specific variant, dialog/drawer/tab, and workflow state. Freeze screen/state IDs and the browser/viewport matrix before execution. Existing inventories are starting points, not proof of completeness.

Only launch browsers or trigger workflows within current authorization. Login, fixture hooks, and apparently read-only screens can cause writes; inspect them first. Require actual rendered screenshots inspected by the reviewer. DOM geometry, axe results, screenshot existence, and successful route loading cannot independently establish visual PASS.

Cover Chromium, Firefox, and WebKit; desktop/tablet/mobile including 320px reflow. Inspect each mandatory screen/state combination using the frozen matrix. Record unsupported combinations or unexecuted assistive-technology checks explicitly. A smaller smoke matrix must not be called complete certification.

Link each inspection to candidate, role, synthetic tenant, route/state, engine/version, viewport, screenshot, checklist findings, and result. Retain baseline/failure/fix evidence; do not update approved snapshots without authorization. Return defects and exact missing matrix cells to the orchestrator.
