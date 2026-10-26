# MSS Phase 2 manager dashboard makeover

Prepared: 26 October 2026. Decision: accepted; 9/9 final browser scenarios passed across Chromium, Firefox and WebKit. Evidence: [`../qa/evidence/mss-makeover-phase2-2026-10-26/`](../qa/evidence/mss-makeover-phase2-2026-10-26/).

## Change

The dashboard now separates actionable manager decisions from informational team signals. The Manager actions region contains only Leave approvals and Attendance regularizations, each with a distinct status, label, explanation, pending count and queue destination. Same-day attendance signals and employees on leave remain truthful summary metrics without pretending to have filtered queue destinations.

The duplicate Coverage context panel was removed. Personal ESS links now occupy one full-width secondary card. The former action table was replaced by a semantic labelled list whose rows use the existing responsive MSS action pattern. This prevents the label/description concatenation seen in the Phase 1 desktop render and keeps count and action controls directly reachable at 320px.

No API, permission, team scope, count calculation, approval policy or ESS behavior changed.

## Acceptance

| Scope | Result |
| --- | --- |
| Action hierarchy | Exactly two real approval queues; no duplicate Coverage panel or non-actionable queue links |
| Destination meaning | Leave and Attendance actions advertise the exact supported queue URLs |
| Row readability | Label and explanation have a positive grid gap; desktop captures show distinct reading lines |
| Responsive behavior | Both decision actions and all four ESS links visible and within the 320px viewport; no document overflow |
| Clear state | Second manager with zero pending work receives the ready priority state while retaining queue access |
| Accessibility sample | Dashboard scanned in each engine for WCAG 2 A/AA and 2.1 AA: zero violations; two automated incomplete items per engine remain manual-review evidence |
| Static/build | Focused ESLint, TypeScript and production build passed; Django check passed; build retains the existing autoprefixer `end` warning |

Final result: **9 passed / 0 failed / 0 skipped / 0 not run**, retries disabled, one worker. Six final desktop/mobile screenshots were captured; Chromium desktop and 320px outputs were manually inspected.

## Cleanup and boundary

Guarded fixture cleanup verified zero tenants and zero users. The owned PostgreSQL container and local Django/Next services were removed. Phase 2 does not close the Approval-tab activation defect or approval workflow/state matrix recorded in Phase 1; those belong to Phase 3.
