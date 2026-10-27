# HRMS STG-1G.1 Dependency Security Remediation

Date: 2026-10-27\
Decision: **BLOCKED**\
Parent Git SHA: `7a55b33e20bfc5ba34f2c15017edd271c2092664`

## Scope And Package Ownership

- Package manager: `pnpm@10.0.0` declared by the repository root; executed with pnpm 10.0.0 and Node.js 24.14.0.
- Workspaces: `web`, `mobile`, and `packages/*`.
- Web runtime before/after: Next.js `15.5.24` to `15.5.28`; React and React DOM remain `19.0.0`.
- Next.js exists only in `@hrms/web`. No duplicate vulnerable Next.js installation remains.
- Image optimization uses Next.js defaults; `sharp` resolves through the existing root override at `0.35.5`. No image configuration or product behavior changed.
- Existing `eslint-config-next` remains on its lock-resolved 16.3.4 line; TypeScript remains 5.8.2.

## Targeted Changes

| Dependency | Before | After | Reason |
|---|---:|---:|---|
| `next` | 15.5.24 | 15.5.28 | Patched 15.x floor for Image Optimization RCE and Server Actions DoS advisories |
| `brace-expansion` affected path | 5.0.6 | 5.0.12 | Exact transitive lint-tool override clears five high DoS advisories |
| `zod` affected path | 4.5.4 | 4.6.7 | Exact transitive lint-tool override clears oversized-collection memory exhaustion advisory |
| `undici` affected Expo CLI path | 6.28.1 | 6.29.1 | Existing exact Expo-compatible overrides moved to the patched floor |
| `node-forge` Expo CLI path | 1.4.0 | 1.4.0 | No patched published version is available; no unsafe override or Expo major upgrade applied |

The update was generated with a lockfile-only pnpm resolution and then verified by `pnpm install --frozen-lockfile`. No broad `audit --fix`, force operation, major framework upgrade, or security suppression was used.

## Vulnerability Reconciliation

| Advisory | Package/path | Before | After | Disposition |
|---|---|---:|---:|---|
| `GHSA-2464-fhr4-w9xw` | `web > next` runtime | Critical | 0 | Resolved by Next.js 15.5.28 |
| `GHSA-p3m5-59mp-jv5r` | `web > next` runtime | High | 0 | Resolved by Next.js 15.5.28 |
| `GHSA-3jxr-9vmj-r5cp`, `GHSA-mh99-v99m-4gvg`, `GHSA-rgw5-rvv9-x895`, `GHSA-qhr7-859c-m2p7`, `GHSA-6j4f-fj2g-mc7p` | `web > eslint-config-next ... > brace-expansion` development/lint path | 5 High | 0 | Resolved at 5.0.12 |
| `GHSA-mrhx-c7xc-m3w5` | `web > eslint-config-next ... > zod` development/lint path | High | 0 | Resolved at 4.6.7 |
| `GHSA-xjj6-f33q-929c` | `mobile > expo > @expo/cli > undici` CLI path | High | 0 | Resolved at 6.29.1 |
| `GHSA-86w9-cpqp-85rv` | `mobile > expo > @expo/cli > node-forge` CLI/code-signing path | High | High | Unresolved: audit reports `<=1.4.0` affected and no patched release (`<0.0.0`) |

Audit totals moved from **1 critical, 9 high, 4 moderate** to **0 critical, 1 high, 0 moderate**. The remaining package is reachable through Expo CLI and code-signing tooling, not the deployed Django/Next.js web runtime. It is still not waived: release remains blocked pending a security-owner decision, a patched upstream release, or a separately certified Expo/toolchain replacement.

## Regression Evidence

| Gate | Result |
|---|---|
| Frozen lockfile install | PASS |
| Web TypeScript | PASS |
| Mobile TypeScript | PASS |
| Full web ESLint | PASS |
| Next.js 15.5.28 production build | PASS; existing CSS autoprefixer warning only |
| Django system check | PASS |
| Migration drift | PASS; no changes detected |
| Python dependency consistency | PASS |
| Batch-1 Playwright | **6 passed** in 53.1 seconds, one worker |
| Independent evidence API | **6/6 passed** with exact tenant/resource assertions |
| PostgreSQL onboarding/evidence/email/security subset | **36 passed** in 88.82 seconds; 3 dependency deprecation warnings |
| Broad live-persona suite | Not counted: requires pre-provisioned HR/ESS/MSS identities absent from the isolated Batch-1 fixture; run stopped after environment connection failures |

The browser run verified tenant creation, duplicate tenant rejection, duplicate administrator protection, Enterprise activation, Tenant Admin login, cross-role denial, exact resource ownership and evidence API assertions. The expected Platform API 403 for the Tenant Admin was observed. No hydration, middleware, cookie/session, proxy, or evidence-route regression appeared in the executed supported scope.

There is no configured frontend unit/component test script in `web/package.json`; TypeScript, full ESLint, production build and focused browser coverage are the available frontend gates.

## Candidate Integrity And Cleanup

- Updated candidate: 36 files, including only the existing STG-1E/F/G controls, dependency metadata, QA evidence and this report.
- Candidate manifest SHA-256: `227f1218adfccbafa86e93dd45caec9234fa8095fa88fa96afed0c11a0f4f5bd`.
- Migrations: none.
- Product business logic changes: none from STG-1G.1.
- Separate payroll repair: excluded and unchanged.
- Staging scenario register: all 136 remain `Not Run`.
- Task-owned PostgreSQL 16, Redis 7, Django and Next.js processes were stopped; no task container or listener remains.
- No staging/AWS/IAM/SSH resource, live email, payroll flow, push, deployment, stage operation or commit was performed.

## Deployment Impact

An approved release would require a fresh immutable web image because the Next.js runtime and lockfile changed. Backend and worker restarts remain required by the underlying STG-1E/F security candidate, not by the dependency-only delta. No database migration is required. Rollback must restore the matching package manifest, lockfile and web image together.

## Decision

**STG-1G.1 BLOCKED.** The critical Next.js exposure and eight of nine high findings are remediated with green functional and security regression evidence. PASS requires zero unresolved critical/high findings or formal security-owner disposition. `GHSA-86w9-cpqp-85rv` has neither a patched upstream version nor an approved risk disposition.
