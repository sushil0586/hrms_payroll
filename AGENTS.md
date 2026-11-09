# HRMS repository instructions

## Architecture and existing contracts
This pnpm workspace contains Next.js/React/TypeScript in `web`, Django/DRF domain apps in `backend/apps`, Expo/React Native in `mobile`, and shared-package foundations in `packages`. Web API routes and server helpers bridge authenticated browser requests to Django; do not bypass backend authorization. PostgreSQL is the certification database; Redis/Celery support asynchronous work.

Read the applicable existing contracts before scoped work:
- [Execution roadmap](docs/hrms-execution-plan.md)
- [Shared UI standard](docs/ui/hrms-ui-ux-standard.md)
- [HR Admin acceptance standard](docs/ui/hrms-hr-admin-experience-standard.md)
- [Confidence model](docs/qa/hrms-module-confidence-model-and-certification-plan.md)
- [Shift/roster inventory](docs/qa/hrms-comprehensive-certification-phase1-shift-roster-inventory.md)
- [Agentic framework](docs/qa/agentic/framework.md)

Preserve existing standards and historical evidence. These instructions do not authorize implementation, tests, deployment, or external actions beyond the current user request.

## Scope, ownership, and progression
Use one primary agent as orchestrator, one source-modification owner, and one mutating-test owner. Optional subagents may perform independent read-only reviews when authorized and supported; they must not change files, provision fixtures, run mutating tests, or clean up resources. Skills describe procedures, not permissions.

Distinguish read-only discovery, authorized implementation, authorized isolated execution, and certification. Finish only the authorized stage. Validation phases are Shifts → Rosters → Attendance → Leave interactions → End-to-end roles → Final certification. A passing phase does not authorize the next: require explicit user authorization before next-phase execution. Do not conflate implementation prompt numbers with validation phase numbers.

## Preserve the working tree and identify the candidate
Inspect global, ancestor, repository, and deeper applicable instructions. Record `git status --short` before edits. Preserve all existing tracked/untracked changes; never reset, clean, stash, overwrite, or commit them merely to obtain a clean tree. Modify only authorized paths. Record pre/post hashes when preserving a dirty candidate.

Candidate identity includes full HEAD SHA, dirty status, a deterministic source-content fingerprint, included path policy, test/config content identity, migration graph, build identity, and redacted runtime fingerprint. SHA alone cannot certify a dirty tree. Use the documented fingerprint helper in `docs/qa/agentic/`; generated artifacts and secrets are excluded. Recheck candidate identity after execution and invalidate affected evidence when source changes. Never emit credentials or raw secret files into evidence.

## Environment, data, and execution safety
Before any mutating campaign, verify the explicitly authorized environment, frontend/BFF/backend destinations, database server/database/schema/user, settings module, worker/Redis targets, storage, and notification/provider sandbox routing. Do not infer safety from localhost or a suite name. Stop on ambiguous targets, production/shared destinations without authorization, or missing isolation.

`backend/pytest.ini` selects local settings; `config.settings.local` replaces PostgreSQL with SQLite. Setting POSTGRES variables alone is insufficient. Certification requires explicit suitable settings plus observed effective Django vendor/configuration and server-side PostgreSQL identity/version. SQLite passes cannot establish PostgreSQL locking, concurrency, or integrity certification.

Use disposable synthetic tenants and exact campaign-owned identifiers. Existing `web/tests/helpers/isolated-qa-workspace.ts` provisions database records and deletes owned data/private files during cleanup; inspect it and its management command before use. Audit test hooks before even collection or purported read-only runs. Predeclare fixture/cleanup ownership, allowed resources, external side-effect controls, and interruption recovery. Cleanup requires an ownership-verified dry-run followed by exact-ID deletion within authorization, verified absence, and retained evidence. Never broadly delete by a generic prefix. Stop on ownership mismatch; report residuals instead of widening cleanup.

## QA and evidence
Every mandatory scenario needs a stable ID, expected business/UI/API/database/audit results, role/tenant scope, dependencies, severity, and current evidence. Exercise positive, negative, boundary, concurrency/stale-update, replay, closed-history, RBAC, reportee-scope, and tenant-isolation cases where applicable. Validate downstream attendance, leave, and payroll effects without initiating real payroll or external delivery.

Inspect every discovered in-scope rendered screen and applicable interaction/state using actual browser screenshots and visual review. DOM assertions alone are insufficient. Include grids/forms/toasts/dialogs/drawers/navigation, keyboard/accessibility, 320px reflow, and Chromium/Firefox/WebKit. Follow existing UI standards; retain reviewed evidence and approved exclusions. Never silently update screenshot baselines.

Centralize campaign scenarios, defects, and certification under `docs/qa/agentic`; store new execution artifacts in a unique campaign under `docs/qa/evidence`. Link historical artifacts without overwriting them or borrowing stale PASS results. Retain failed attempts, skips, console/network errors, before/after fix evidence, regression results, and cleanup. Redact personal data, cookies, tokens, and fixture credentials.

Statuses: PASS = complete current acceptance evidence; CONDITIONAL = evidence with explicitly accepted limitations; BLOCKED = unmet prerequisite; FAIL = observed acceptance violation; NOT RUN = no execution. Priority: P0 catastrophic security/data/financial harm; P1 critical workflow/integrity failure; P2 significant impairment; P3 minor cosmetic defect. No unresolved P0/P1 permits certification. Exceptions require named owner, rationale, expiry, and user acceptance; they do not erase failures.

Preserve the existing confidence model: `35F + 25S + 15U + 15D + 10O`, with fractions 0–1 from frozen applicable denominators and current evidence. Missing prerequisites mean UNSCORED. Report local completion separately. Scores cannot override hard gates or constitute statistical reliability proof.

## Approval boundaries
Do not infer authorization for installs, application fixes, database migrations, mutating tests, fixture deletion, shared staging/production actions, baseline updates, commits, pushes, or deployment from a QA planning request. Ask only for missing authorization relevant to the next concrete action. Record authorized scope; stop at its boundary. Report actual commands/results and unresolved risks without claiming unexecuted tests passed.
