# Employee Management Phase 3 — Create and edit

Status: complete within the enumerated Phase 3 scope (22 October 2026). This record covers the employee master wizard; it does not close access, bank accounts, imports or family-wide acceptance.

## Scope and design decisions

Use the existing four steps — Identity, Contact, Structure, Review — on `/hr-admin/employees/new`, `/hr-admin/employees/[employeeId]/edit` and the directory's create/edit dialogs. Keep the existing employee fields, structure dependencies, default status, permissions, POST/PATCH payloads and backend validation. Do not introduce a second wizard or change employee policy.

The standalone page supplies the task title and the form supplies employee identity/status plus field groups. Remove decorative page pills and the extra unguarded Back link. The form's Cancel action is the explicit return: new records return to the directory; existing records return to the selected employee. Dialog cancellation retains its committed directory query and uses the shared dirty confirmation.

Give the four steps consistent navigation, an announced current step and usable mobile controls. Use two field columns on desktop and one at 820px and below in both entry points; Review uses two columns until its mobile breakpoint. Avoid inherited auto-fit rules creating six small desktop fields on a standalone page while its dialog shows two. Continue/Back and direct step navigation focus the revealed section heading. Submission validation reveals the affected step and focuses its first invalid control. Field messages have explicit control associations, and typing to clear an error must not steal focus.

While saving, disable editing, step changes and submit/cancel controls. A small employee-specific dialog adapter supplies the actual pending state to the existing shared modal; its close button and Escape guard follow the same request lifetime. Keep one request in flight. A transport failure preserves the draft and explains that an unconfirmed write should be checked in the directory before resubmission.

Successful dialog saves preserve directory search, sort, filters and paging, remove create/action flags and select the saved employee. Standalone saves select that employee in the directory. Cancellation uses deterministic destinations instead of browser-history guesses. Standalone full-document unload warns about unsaved input; a confirmed save/discard bypasses that warning. Dialog close buttons, Cancel and Escape use the existing shared dirty confirmation. This slice does not introduce an application-wide guard for every sidebar link or same-document browser-history transition.

## Field and interaction contract

| Step | Existing fields | Presentation / validation behavior |
| --- | --- | --- |
| Identity | Employee code; employment status; first, middle, last and preferred names | Code and first name are required. Keep the configured status options/default. Backend uniqueness and policy errors remain authoritative. |
| Contact | Work/personal email; phone; birth, joining, probation-end and confirmation dates | Validate nonblank email addresses. Birth must precede joining; probation cannot precede joining; confirmation cannot precede joining or probation end. Preserve optional values and existing date warnings. |
| Structure | Legal entity; branch; location; business unit; department; cost center; designation; grade; employment type; reporting manager | Preserve option filtering, explanatory hints, disabled dependent controls and existing mapping sanitation. Branch can align entity/location; department can align business unit; designation can align grade. Changing a parent clears incompatible selections according to existing rules. |
| Review | All preceding employee values | Display labels and readable values, resolved option names and “Not set” for blank optional values. Wrap long values. Saving still runs validation across all steps, including those not currently visible. |

| State / action | Expected behavior |
| --- | --- |
| Initial render | Fields/actions remain disabled until hydration; modal mount-time focus settles before typing is possible. |
| Step change | Retain all draft values. Buttons expose the current step using `aria-current="step"`; direct navigation, Continue and Back focus the revealed section heading. Steps are navigation buttons rather than an invented tab interaction. |
| Client / field rejection | Select the first affected step, focus its first actionable invalid control, associate its field message with `aria-describedby`, retain all other input and allow correction. Clearing one error while typing does not move focus elsewhere. |
| Form-wide rejection | Keep the current step and draft; focus persistent feedback. Distinguish global errors from known field keys so an unknown backend key cannot create an unfocusable field error. |
| Save pending | One request in flight; fields, step controls, Cancel and submit are disabled. Dialog close and Escape use the same pending state. The submit label reports creating/saving. |
| Transport or server failure | Keep values, release pending state and use the shared mutation-feedback wording. An unconfirmed write is not described as a guaranteed rollback; the user is directed to check latest records before retrying. No automatic write retry is introduced. |
| Confirmed success | Reopen the directory with the saved employee selected and show “Employee created” or “Employee changes saved.” The query receipt is informational UI feedback, not a substitute for the saved backend record. |

| Entry | Cancel / confirmed discard | Confirmed save |
| --- | --- | --- |
| Standalone create | Directory, without relying on history | Directory with new employee selected |
| Standalone edit | Directory with original employee selected | Directory with saved employee selected |
| Directory create/edit dialog | Original directory query, using the shared dirty confirmation | Preserve committed search/filter/sort/paging parameters; remove create/action flags; select the saved employee. A saved record can be outside the visible filtered page; selected detail still loads independently. |

For subsequent makeovers, reuse the established tokens, field/error helpers, footer and dialog lifecycle. Keep the employee wizard's opt-in `.employee-master-form` styles local to these master forms; do not restyle access, bank or import forms incidentally through their shared dialog/child-form classes. Other families can adopt the same task hierarchy, focus, draft preservation and pending/outcome rules while retaining their own domain fields.

## Implementation boundary

- `employee-form.tsx`: existing wizard, validation/focus, field associations, pending state and deterministic return.
- `employee-form-dialog.tsx`: employee-only adapter for shared modal pending state.
- `page.tsx`: create/edit dialog composition; existing access/bank modal code retained.
- `new/page.tsx`, `[employeeId]/edit/page.tsx`: simplified task headers and guarded in-form return.
- `workspace-patterns.css`: opt-in employee master presentation and mobile reflow.

Initial controls stay disabled until hydration completes, allowing the shared modal's mount-time focus to settle before editing. An observed trace showed a First name fill reaching Employee code before this guard; accepted verification must check both fields in the submitted payload.

The shared action modal and its other consumers are unchanged. This is a presentation/workflow slice; backend contracts and ownership checks remain authoritative.

## Findings and retained iterations

| Iteration | Result / finding | Resolution |
| --- | --- | --- |
| Initial Chromium run | 5 passed, 3 failed. Two create cases tried to read a response body after document navigation; Review labels failed contrast at 2.57:1. Visual review also found unstyled standalone Review rows and a vertically stacked dialog footer. | Read the created ID from the confirmed destination, verify the persisted record through GET, style both entry points together, darken labels and keep mobile footer actions in a row. |
| Refined Chromium run | 10 passed, 2 failed. A success assertion selected two live-status elements; a pending-edit trace showed `Preserved` inserted before the original employee code while First name remained Esha. | Scope the success receipt locator. Disable form interaction until hydration completes so modal mount-time focus settles before editing; assert both submitted first name and employee code. |
| Refined visual review | Standalone field groups occupied half the desktop form width. | Make the active-step body a single block, preserve responsive field columns within it and assert the section fills that body. Increase mobile input/select height to 44px; shorten the required-field note. |

The initial and refined raw reports, traces and screenshots remain in the evidence directory. Failed reports reference their original output paths; the retained directories are now named `results-initial` and `results-refined`. Local build names such as “release” identify verification artifacts and do not imply deployment.

| Additional iteration | Result / finding | Resolution |
| --- | --- | --- |
| Complete candidate workflow run | 35 passed, 1 failed. Firefox/WebKit viewport sweeps passed; Chromium's number/label-dependent step locator timed out during its sweep. | Locate buttons within the named progress navigation by step label; give the 32-state screenshot sweep its own 240-second overall budget while retaining 15-second action timeouts. Align field columns across page/dialog; the next full run passed all 36 cases. |
| Final image review after 36-pass run | At 320px, the shared async label's no-wrap rule squeezed the Save changes label. | Scope wrapping and a little extra primary-action width to employee-form mobile footers. Check text/controls fit, all four steps and all viewport/entry combinations on the final footer artifact; do not reclassify the earlier 36-case build as that artifact. |

## Verification and artifact boundary

| Accepted evidence | Local production build | Exact result |
| --- | --- | --- |
| Main workflow suite — `results.json` | `ovU2DbpFFjpeEaZETYQ46`, `.next/employee-makeover-phase3-closure` | 36 passed; 0 failed, skipped or flaky. Twelve case types in each of Chromium, Firefox and WebKit. |
| Final footer layout — `results-footer.json` | `8shC5tPXtqXoPHKUfBh4T`, `.next/employee-makeover-phase3-footer` | 3 passed; 0 failed, skipped or flaky. Repeats the responsive case in all three engines with explicit footer text/control containment checks. |
| Directory consumer regression — `results-regression.json` | Same final footer build | 6 passed; 0 failed, skipped or flaky. Pointer/keyboard detail selection and focus return; existing Edit, Access and Bank dialogs opening/closing with employee context. |

These are **45 passing test executions**, including **three responsive repeats**. They are not 45 unique workflows or a 36-case full-suite rerun on the final footer build. The final application difference from the 36-case artifact is confined to mobile employee-form footer CSS; all other application source hashes match. `footer-only-change.patch` records the exact difference. Both builds are retained, and each report links to its source/test manifests. Main/final test-source snapshots preserve the added footer assertion without rewriting the earlier evidence.

The main suite executed real create and edit saves through both standalone and dialog entry points, checked stored values through API reads, exercised required/email/date validation, real duplicate-code rejection, branch/entity/location dependencies, keep/discard cancellation, preserved-input field/global failures, an unconfirmed transport/server failure and employee-persona route/API denial. Delayed intercepted requests exercised busy close/Escape/step guards and verified the submitted first name/code and single-request count. A mocked rejection is not described as a real backend policy test.

Responsive sweeps cover all four steps in both standalone edit and edit-dialog composition at 1440×844, 768×844, 390×844 and 320×568. They check full-width step sections, desktop/tighter-width field columns, current-step state, navigation target height, document overflow, footer reachability and final text/control containment. Real create flows also run at 390×844. Keyboard step changes and scoped axe checks run against each field group in both entry types; the responsive case includes a mobile Review scan. Runtime page errors are asserted absent in the executed cases.

Quality checks passed: production compilation and type validation; full ESLint on the release sources, followed by targeted ESLint for the final dialog identity/test changes; CSS parsing and type validation in the final builds; whitespace checks and documentation links. The later production builds use `--no-lint` because lint ran separately. The pre-existing Autoprefixer/cache warnings from `globals.css` remain recorded in build logs; no unrelated CSS was changed to silence them.

## Visual acceptance

The accepted workflow run captured 82 screenshots in `closure-images/`. The final footer sweep captured 64 in the evidence root, and directory regression captured 15 in `regression-images/`. **Nineteen images were individually inspected:** 14 main, three final-footer and two regression images. The three `image-review-*.json` records name and hash the actual inspected images; the other captures are retained without claiming individual review. Earlier screenshots/traces remain in their separate initial/refined/verified groups.

Representative reviewed results:

- [Desktop identity — consistent field grouping](../qa/evidence/employee-makeover-phase3-2026-10-22/closure-images/page-identity-1440-top.png)
- [Desktop Review — readable values](../qa/evidence/employee-makeover-phase3-2026-10-22/closure-images/page-review-1440-top.png)
- [Real backend rejection and focused correction](../qa/evidence/employee-makeover-phase3-2026-10-22/closure-images/chromium-real-duplicate-validation.png)
- [Final short 320px dialog — fitting save label and reachable actions](../qa/evidence/employee-makeover-phase3-2026-10-22/dialog-review-320.png)
- [Final mobile contact step](../qa/evidence/employee-makeover-phase3-2026-10-22/dialog-contact-390-top.png)

The review accepted the shared task hierarchy, full-width active groups, consistent field columns, readable/wrapping Review values, employee context, inline/form feedback, mobile controls and compact footer. Bank/Access remain working destinations with their existing composition; their visual makeover belongs to Phase 4.

## Cleanup and limits

All manifest-owned fixture workspaces were removed. A database-name/port-guarded read verified zero tenants, users, employees, employee documents and document artifacts in the fresh `hrms_employee_phase3` database. Owned Django/Next listeners, PostgreSQL container and anonymous volume were removed; task-only runners and unserved intermediate builds were removed. Generated Next configuration files were restored exactly to their pre-task HEAD content. Unrelated data, services, media and audit history were preserved. Source/test continuity and resource checks are recorded in `final-validation.json`, `database-cleanup.json` and `resource-cleanup.json`.

This closes the listed makeover tasks, not exhaustive employee-domain acceptance, every role/permission combination, assistive-technology or WCAG certification. Automated axe scans are scoped to the stated components/states. Native full-document unload warnings were implemented for standalone forms; the executed keep/discard checks cover the explicit Cancel/shared-dialog lifecycle, not every browser-history/sidebar navigation path. No deployment or production migration occurred. Phases 4–6 remain open.
