# Employee Management Phase 4 — Access and bank accounts

Status: complete within the scope and verification below. This slice covers standalone access/bank pages and the matching directory dialogs. Imports and joined-family closure remain Phases 5 and 6.

## Baseline and design

The fresh baseline uses the retained Phase 3 footer build, whose application source matches the pre-Phase-4 source manifest, against a new task-owned database. Twelve captures cover access/bank × standalone/dialog × 1440, 390 and 320 CSS pixels, with a 568px short viewport at 320. The first attempt ran before PostgreSQL was ready; that setup failure is retained separately. The successful repeat is a capture pass, not acceptance of the old forms.

Observed implementation gaps include unguarded bank transport failure and duplicate requests, missing error focus, cancellation by history, draft loss on account switching, plain sensitive inputs, and shared dialogs unaware of actual save state. Rendered baseline shows a large stacked mobile bank footer covering fields, decorative dialog tabs without tab behavior, and repeated standalone summaries/navigation.

Use one task heading with employee identity, explicit provision/update state, grouped settings and reachable actions. Access groups remain Identity/membership, Controls and Roles; no wizard or new role model is introduced. Bank records remain a named, selectable masked list above an editor. Keep the same field order/columns in page and dialog, with single-column small screens and a compact wrapping footer. Drop decorative tab captions and duplicated page pills/summaries. Existing standalone routes remain supported.

## Contract to preserve

Access retains username, email, profile names/phone, optional temporary password, membership status, active/default membership/password-change controls and configured tenant roles. Required username/email/roles and inactive/exited restrictions remain enforced; safe defaults set non-active membership/access rather than granting a bypass. The backend remains authoritative for permitted role IDs and ownership.

Bank retains holder, bank, account number, optional IFSC/branch and primary flag. Existing IFSC normalization/validation is retained. The current serializer exposes no effective-date editor: saves apply immediately, and selecting a primary demotes the previous primary through the existing backend contract. Do not invent effective dates or a new bank policy. The frontend adds an impact confirmation when another primary would be replaced.

Sensitive fields start masked, with deliberate reveal/hide controls. Record cards show only the existing masked account identifier. Authorized editors still receive the account value from the existing API; UI masking does not claim a changed transport/data-access policy. Generated passwords remain a masked, separately labelled credential in component memory, excluded from the success announcement. Component disposal releases that state; browser history/cache disposal is not separately certified. No credential is placed in a URL or persistent browser storage.

## Workflow and shared boundary

Use explicit client/backend field associations, first-error focus and persistent global feedback. Preserve drafts on rejection and use shared unconfirmed-outcome wording for transport/server errors, without automatic write retries. Confirm access changes with their immediate sign-in/membership/role impact. Confirm discard before replacing a dirty account draft; selecting/resetting a draft must not silently lose work.

A scoped `useMaintenanceDraft` hook tracks readiness, saved baseline, explicit return and standalone unload warning. The employee maintenance adapter supplies actual busy and dirty state to the existing shared modal. Its new optional controlled `dirty` prop falls back to prior input tracking for other consumers, including master create/edit. Busy disables fields, Save, Cancel, account selection/New and modal close/Escape. After a confirmed save the local view and baseline update from the API receipt, success feedback receives focus, and clean closing preserves committed directory context without a discard prompt. The old redundant router refresh is removed: local state already contains the saved access/account values, and closing uses document navigation to refresh the underlying directory. This prevents that refresh from stealing success focus.

Standalone Cancel deterministically returns to the selected employee. Dialog closes retain directory filters/sort/paging through the original close URL. There is no new global guard for every sidebar/browser-history navigation. The shared modal's default behavior must receive focused consumer regression.

## Retained findings and fixes

The first Chromium implementation run passed 7/11 and failed four cases. Access saved successfully in both entry points, but redundant route refresh moved focus away from the receipt; confirmed local-state updates and an after-commit focus effect replace that refresh. Bank saves/primary replacement, dirty guards and pending/error recovery already passed in that run.

One provisioning assertion incorrectly assumed a password input could never have a textbox role; the accepted check measures its actual masked type and exclusion from the live success notice. The responsive check compared control baselines despite different label wrapping. It now checks aligned grid items and responsive column structure; the opt-in CSS explicitly aligns labels and increases specificity against older modal rules. Rendered review also found the primary-checkbox caption needed spacing, which is corrected. Account selection/New and safe-default application now focus the relevant editor control. The initial whitespace issue was removed.

The next full production run passed 32/33: Firefox reported one hydration (#418) event on an inactive employee's new access route while all case actions and backend checks succeeded. The same scenario then passed in a development build and three fresh production repeats. The error was not localized; retain it as a Phase 6 follow-up rather than calling it fixed or suppressing page errors. The final reviewed build keeps the error assertion and reruns the entire suite.

Final short-height review found that repeated access headings/chips consumed the 320px dialog body before the first field. The dialog now uses one compact provision/update/role-count line under the shared task header, and standalone descriptions explicitly include employee code/status because the Accerio header hides its eyebrow. Dialog description includes employee name alongside the code. Bank editor captions and impact notes are compact, Reset keeps a descriptive accessible name with a short visible label, and success receipts clear when the draft changes. These are rendered changes, not backend policy changes.

## Verification

The accepted production build is `JU-WHcqqhTMBVTajm58Zc`, retained at `web/.next/employee-makeover-phase4-reviewed`. Both final suites ran against this immutable build and the isolated Django/PostgreSQL fixture environment. Application source remained unchanged between suites; all 799 source hashes and both final test manifests match the working files at closure.

| Verification | Result |
| --- | --- |
| Main workflows, 11 cases × Chromium/Firefox/WebKit | 33 passed; zero failures, skips or flaky cases |
| Integration regression, 6 cases × the same engines/build | 18 passed; zero failures, skips or flaky cases |
| Production build and type validation | Passed |
| Full ESLint, final targeted ESLint and separate typecheck | Passed |
| Scoped whitespace check and source/test continuity | Passed |

The 51 accepted executions cover page/dialog saves, real provisioning, inactive-employee rejection/safe defaults, preservation of role grants and backend-invalid-role rejection, real bank creation/update and primary demotion, client/server field errors, transport uncertainty, one-request pending guards, dirty account switching/reset, clean versus dirty close, directory context and employee-persona denial. Regression includes the shared modal's default uncontrolled master-form behavior and existing busy-close policy. Main responsive assertions cover all four entry types at 1440/1024/768/390/320 CSS pixels, including 320×568, keyboard containment and scoped axe checks. These bounded checks are not whole-product accessibility or domain certification.

The accepted suites produced 79 root PNGs (58 main, 21 regression); the baseline has another 12. Actual visual inspection covers **14 images: two baseline and twelve accepted main images**, enumerated with hashes and image dimensions in [visual-review.json](../qa/evidence/employee-makeover-phase4-2026-10-22/visual-review.json). Other captures were not manually certified. Reviewed states include desktop page/dialog layouts, small access and bank layouts, tablet/footer reflow and focused unconfirmed outcomes. The WebKit error capture shows the feedback heading above the footer; the full message remains in the scrollable body and is separately asserted by the workflow test.

The first integration run passed 13/18 and exposed test defects: directory-link accessible names included helper text, and role enumeration occurred before streamed controls were ready. The tests now wait for the relevant controls and use the complete link-name contract; the corrected run passed 18/18. Initial reports and exact initial/final test snapshots remain alongside accepted evidence. The obsolete combined `accepted-test-manifest.json` is historical; use `main-test-manifest.json` and `regression-final-test-manifest.json` for final source verification.

**EM-P4-H01 — Phase 6 follow-up:** the earlier Firefox hydration #418 event remains unlocalized. One development probe, three production repeats and the final full suite were clean. This is a scoped nonblocking carry-forward, not a claimed fix. Recheck the inactive provisioning route during joined-family review with page-error assertions retained.

Task-owned fixture cleanup left zero tenants, users, employees, employee documents and document artifacts. The isolated database container and its exact anonymous volume were removed; task-owned Django/Next services and debug listeners are stopped. Intermediate Phase 4 builds, private runner scripts and the empty failed-fixture directory were removed. The accepted build and audit evidence remain. Generated Next config files match HEAD; unrelated services, earlier phases and existing workspace changes were preserved.

See the [evidence index](../qa/evidence/employee-makeover-phase4-2026-10-22/README.md), [accepted provenance](../qa/evidence/employee-makeover-phase4-2026-10-22/accepted-provenance.json), [database cleanup](../qa/evidence/employee-makeover-phase4-2026-10-22/database-cleanup.json) and [resource cleanup](../qa/evidence/employee-makeover-phase4-2026-10-22/resource-cleanup.json). No commit, deployment or Phase 5 implementation is claimed.
