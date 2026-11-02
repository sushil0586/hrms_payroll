# HRMS Leave Release Candidate Freeze

Date: 2026-11-03

## Decision

Status: **CONDITIONAL**

The verified Leave implementation has been isolated into an exact provisional manifest. It is ready for owner review, but it is not yet authorized for staging or commit. The worktree also contains extensive unrelated attendance, employee, organization, notification, statutory and payroll changes; broad staging commands must not be used.

## Source Baseline

- Branch: `main`
- Parent Git SHA: `8b9a4faefdff4efd976dafa189a63e47e986b414`
- Manifest: `docs/qa/hrms-leave-release-candidate-manifest.txt`
- Manifest entries: 41 unique paths
- Manifest SHA-256: `5d34da76dc4ce0dfebffe9efcbd841971c5f05e4adcfec9a0f21f0d14a4ca11e`
- Migrations: none
- Deployment configuration changes: none
- Generated screenshots, traces, videos and JSON evidence: excluded
- Protected payroll Playwright repair: excluded and unchanged

## Candidate Classification

Application code:

- ESS Leave application and request lifecycle controls.
- HR Admin Leave Types, Policies, Assignments, Requests, Balances and Holiday Calendar controls.
- MSS approval history and decision controls.
- Leave/attendance collision report behavior.
- Shared action receipt/toast and stable date formatting used by the Leave workflows.
- Shared ESS and global styles required by the verified Leave presentation and loading/feedback contract.

QA-only files:

- PostgreSQL-backed Leave runtime fixture repair.
- Leave action, balance, completion and correctness Playwright suites.
- Leave Playwright configuration.
- Leave completion and attachment certification reports.

## Deliberate Exclusions

- `backend/apps/common/api_views.py`: roster template behavior, not a Leave patch.
- `backend/apps/common/tests.py`: payroll-output fixture repair.
- `web/src/lib/ui/navigation.ts`: statutory navigation wording.
- `web/package.json` and `web/scripts/audit-ui-interactions.mjs`: whole-application audit tooling.
- Attendance-only pages and tests, statutory/payroll pages and tests, notification/workflow pages, organization/employee pages, release-history evidence, and all generated browser artifacts.
- `web/tests/e2e/db6-payroll-processing.spec.ts`: protected payroll repair.

## Shared-File Caveat

`web/src/app/globals.css` and `web/src/app/ess/ess-experience.css` are required by the verified Leave UI, but their current file-level diffs include shared or adjacent workspace styling. Git commits operate at file granularity, so approving this manifest also approves the reviewed contents of those two shared stylesheets. They must not be described as exclusively Leave-owned.

## Verified Local Evidence

- Connected Leave actions: 17/17 passed.
- Leave balance ledger: 8/8 passed.
- Leave imports: 3/3 passed.
- Connected reports and Leave Year: 11/11 passed.
- Focused Django/PostgreSQL regression: 12/12 passed.
- Schedule, payroll-output and Leave runtime regression: 57/57 passed.
- Attachment boundary regression: 6/6 passed.
- Production build: 313/313 routes generated.
- TypeScript, ESLint, Django system checks, migration drift and `git diff --check`: passed.

These are local results. Shared staging remains 136 Not Run.

Freeze validation performed on 2026-11-03:

- All 41 paths exist, are unique and currently changed or untracked.
- Candidate `git diff --check`: passed.
- Git index: empty.
- Protected payroll diff SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty diff).
- Candidate content scan found only synthetic test passwords and fixture-derived login fields; no AWS keys, private keys, bearer tokens or embedded runtime credentials were found.
- A dedicated `gitleaks` or `detect-secrets` binary is not installed, so dedicated scanner verification remains unavailable.

## Open Governance Items

- `CRUD-02119` and `CRUD-02125`: attachment replacement/removal and retention policy approval is absent.
- `CRUD-05363`: full frozen audit/private-storage evidence contract remains Partial.
- `CRUD-05367`: complete browser isolation-feedback evidence remains Partial.

These items do not invalidate the already verified behavior, but they prevent a claim that every generated Leave/attachment contract is fully closed.

## Release Impact

- Backend image: required because the candidate includes a backend test-only fixture change, but no backend application behavior or migration. If QA-only files are omitted from runtime images, no backend runtime restart is required for this manifest.
- Web image: required.
- Worker/beat restart: not required by candidate application code.
- Database migration: none.
- Rollback: restore the previous immutable web image; no schema rollback is needed.

## Approval Boundary

No staging, commit, push or deployment is authorized by this freeze. Before committing, the repository owner must approve the exact manifest checksum and explicitly accept the two shared stylesheet files. Exact-path staging must be used; `git add .`, `git add -A` and `git commit -a` are prohibited.
