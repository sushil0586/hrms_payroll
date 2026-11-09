---
name: hrms-certification
description: Orchestrate authorized HRMS QA phases, reconcile scenario and rendered-screen evidence, select regression, and issue candidate-specific verdicts and confidence scores.
---
# HRMS certification

Read root `AGENTS.md`, `docs/qa/agentic/framework.md`, the campaign plan, and the existing confidence model. One primary agent owns orchestration, one owner edits sources, and one owner executes mutating tests; optional independent reviewers are read-only.

1. Record authorization and phase. Freeze scope, unique scenario/screen/state IDs, applicable denominators, roles/tenants, browser/responsive cells, policy assumptions, and candidate/runtime identity. Missing prerequisites block execution.
2. Invoke functional and visual QA skills according to scope; reuse existing assets. Read [regression selection](references/regression.md) to map affected domains and shared consumers.
3. Verify evidence content, candidate/source fingerprint, runtime/build identity, timestamps, assertions, failed attempts, exclusions, and cleanup. Historical reports cannot confer fresh PASS. Any candidate drift requires impact review and affected reruns.
4. Reconcile each scenario, visual cell, defect, and regression result centrally. Defects need severity, reproduction, expected/actual behavior, evidence, owner, status, fix identity, retest, and before/after evidence. Report remaining risks; do not hide skipped/failed attempts.
5. Report PASS/CONDITIONAL/BLOCKED/FAIL/NOT RUN using framework definitions. Mandatory failures prevent PASS; missing prerequisites are BLOCKED; unexecuted checks remain NOT RUN. No unresolved P0/P1 permits certification. CONDITIONAL never authorizes progression.
6. Preserve `Score = 35F + 25S + 15U + 15D + 10O` using 0–1 fractions for functional, security/integrity, UX/accessibility, deployed environment, and operations/recovery. Every dimension needs a frozen denominator and current execution evidence. Otherwise report UNSCORED. Only passed complete checks earn numerator credit; exclusions require Product Owner and QA Owner approval. Report local scenario completion separately. A score is not statistical proof or a substitute for hard gates; preserve the existing >=95 release criterion and independent review requirement.
7. Publish candidate, environment, raw totals/dimension fractions, score or UNSCORED reason, evidence links, defects, cleanup/residuals, and explicit next-stage authorization request. Stop; never execute the next phase automatically.
