# Phase 3D Probation, Audit, ESS, and MSS Certification

Date: 2026-09-09  
Environment: local dev  
Frontend: `http://localhost:3211`  
Backend: `http://127.0.0.1:8011/api/v1`

## Scope

Phase 3D continued employee lifecycle certification through browser-only workflows. Every touched page was checked at granular UI level: visible headings, links, buttons, metrics, filters, dropdowns, text fields, queue cards, mutation responses, route state, validation/guard behavior, and horizontal overflow.

## Pages Certified

- `/hr-admin/probation-reviews/new`
- `/hr-admin/probation-reviews/[itemId]/edit`
- `/hr-admin/probation-reviews`
- `/hr-admin/audit`
- `/ess`
- `/mss/approvals`

## Browser Coverage

### Probation Reviews

- Created a disposable employee for the probation flow.
- Certified create form sections: review schedule, extension and ownership, remarks.
- Certified employee, review date, probation end date, decision, extension end date, reviewer, workflow reference, and remarks controls.
- Verified invalid blank create returns a failed mutation and visible save-failed state.
- Verified extension decision guard appears when extension end date is missing.
- Created a probation review through the browser.
- Certified probation queue metrics, create/back links, search/decision/owner/page-size filters, selection, bulk owner, bulk decision, cards, detail fields, and edit link.
- Applied search filter and verified shareable URL state.
- Ran bulk owner assignment.
- Ran bulk decision update using a supported decision path.
- Edited the review, used a valid confirmation date rule, and saved changes through the browser.
- Cleared filters and verified the queue returns to normal state.

### Audit Center

- Certified audit metrics: recent events, approval actions, document reviews, onboarding actions, exit actions, delivery logs.
- Certified reports and notifications drill links.
- Certified search and source filters.
- Applied audit filtering and verified selected source state.
- Cleared filters and verified return to unfiltered audit center.

### ESS Workspace

- Certified employee self-service shell.
- Certified home, MSS, and sign-out actions.
- Certified metrics for pending leave, pending regularizations, hours this month, and today.
- Certified profile snapshot, attendance today, leave balances, leave request history/detail, and regularization history/detail sections.
- Certified visible leave and regularization status tabs.

### MSS Workspace

- Certified manager inbox shell.
- Certified home, ESS, and sign-out actions.
- Certified team members, leave approvals, regularizations, and exceptions metrics.
- Certified approval queue tabs.
- Certified leave approval list/detail section.
- Switched to attendance queue and certified regularization list/detail section.

## Validation

Command:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3211 HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/employee-probation-audit-role-certification-flows.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `3 passed`

Quality checks:

```bash
pnpm --dir web lint
pnpm --dir web typecheck
```

Result: both passed.

## Observations

- Probation decision rules are enforced by backend configuration. Confirm requires the review date to be on or after probation end date.
- Probation form required fields are backend-required, but not all are native-required in the browser. The failed mutation is visible, but this should be improved for UX and accessibility.
- ESS and MSS certification currently proves seeded role workspaces. A later pass should provision a fresh employee/member and prove first login plus reporting visibility for that created identity.

## Confidence Update

- Probation review confidence: 84%
- Audit center lifecycle trace confidence: 78%
- ESS seeded employee workspace confidence: 82%
- MSS seeded manager workspace confidence: 82%
- Phase 3 confidence after Phase 3D: 76%

## Remaining Phase 3 Work

- Completed movement with employee structural writeback proof.
- Audit trail proof tied directly to newly created employee/document/movement/exit records.
- Fresh employee ESS login proof after access provisioning.
- Fresh manager MSS visibility proof for a direct report created in the test.
