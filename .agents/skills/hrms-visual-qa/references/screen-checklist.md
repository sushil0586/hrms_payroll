# Rendered screen checklist

Apply the existing `docs/ui/hrms-ui-ux-standard.md` and `docs/ui/hrms-hr-admin-experience-standard.md`; record each applicable check and evidence, with justified exclusions.

| Area | Inspect in the browser |
| --- | --- |
| Layout | Content/page widths, margins, padding, spacing, card/panel widths, horizontal/vertical alignment, overlap, document overflow |
| Styling | Typography/hierarchy, readable density, icons, semantic colors, consistency across HR Admin/ESS/MSS |
| Buttons | Primary/secondary/destructive placement and sizes, icon alignment, loading/disabled, duplicate activation, confirm/cancel |
| Forms | Labels/input alignment, required indicators, widths, dropdown/date-picker placement, field/summary errors, retained input, Save/Cancel |
| Grids | Headers/rows/columns, alignment/widths, badges, row actions, search/filter/sort/page-size/pagination, intentional named horizontal scroll |
| Feedback | Truthful success/warning/error wording and severity, API-result agreement, partial outcomes, placement, duplicates, visibility, dismissal, live announcements |
| Dialogs/drawers | Width/height, internal spacing, header/footer, nested scrolling, reachable actions, initial focus, trap, Escape/cancel, restore focus, mobile behavior |
| Navigation | Menus/tabs/current state, permitted links, Back/Forward, refresh, query persistence, keyboard behavior |
| States | Populated, empty, loading, failed read/retry, validation failure, successful write, rejected write, disabled/ineligible |
| Accessibility | Accessible names, labels/errors, focus order/visibility, keyboard-only operation, contrast, status announcements, reduced motion, 200%/400% native zoom |
| Responsive | Desktop/laptop/tablet/mobile/320px reflow; no document overflow, overlap, hidden actions, or inaccessible grid content |

Capture default and open interactions plus state transitions with stable data/fonts/timezone and controlled animation. Inspect screenshots at sufficient detail and inspect viewport/scroll behavior directly; full-page captures can conceal fixed-dialog problems. Test shell and overlays as well as `main`. Automated axe scans supplement manual inspection and cannot prove WCAG conformance. Record actual screen-reader/browser/OS combinations; missing evidence stays NOT RUN.

For a fix, retain before/after evidence under the same scenario and comparable rendering conditions, plus interaction and shared-consumer regression results.
