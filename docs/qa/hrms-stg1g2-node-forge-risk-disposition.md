# HRMS STG-1G.2 node-forge Risk Disposition

Date: 2026-10-27\
Advisory: `GHSA-86w9-cpqp-85rv` / `CVE-2026-85393`\
Candidate parent: `7a55b33e20bfc5ba34f2c15017edd271c2092664`\
Recommendation: **ACCEPT TEMPORARILY for web-only synthetic staging, subject to named security-owner approval**\
Current gate: **APPROVAL REQUIRED; the exception has not been approved**

## Authoritative Advisory Status

The GitHub advisory rates the issue High (`CVSS 8.7`), affects `node-forge <= 1.4.0`, and lists no patched version. The flaw permits malformed RSA PKCS#1 v1.5 signature data containing extra nested `DigestAlgorithm` elements to pass verification in affected conditions. The npm registry still publishes `node-forge 1.4.0` as latest, and the fresh pnpm audit reports `patched_versions: <0.0.0`.

The affected dependency resolves through:

`mobile > expo@53.0.27 > @expo/cli@0.24.24 > @expo/code-signing-certificates@0.0.6 > node-forge@1.4.0`

Expo issue `#51773` remains open and does not provide a released, vendor-supported fix. No compatible patched Expo CLI replacement was established in this assessment. A local cryptographic override or source patch is not approved.

Authoritative references:

- GitHub advisory: <https://github.com/advisories/GHSA-86w9-cpqp-85rv>
- npm package: <https://www.npmjs.com/package/node-forge>
- Expo tracking issue: <https://github.com/expo/expo/issues/51773>
- Expo update code signing: <https://docs.expo.dev/eas-update/code-signing/>

## Reachability Matrix

| Surface | Presence | Execution/reachability evidence | Result |
|---|---|---|---|
| Production Next.js server image | `node-forge@1.4.0` is physically present under `/app/node_modules/.pnpm` because `web/Dockerfile` installs the complete workspace and copies root `node_modules` | It is not directly resolvable from `/app`; it is resolvable from Expo's code-signing package. No web source import or compiled `.next/build` match was found | **Present but no web execution path demonstrated** |
| Production browser bundles | No matching package or verification symbols in 2,541 compiled web artifact files | Fresh Next.js 15.5.28 build passed | **Not present in examined browser/server bundle** |
| Django runtime | Backend image installs Python requirements only | No Node workspace copied by `backend/Dockerfile` | **Absent** |
| Celery worker/beat | Uses the backend Python image | No Node workspace copied | **Absent** |
| Expo development tooling | Installed through Expo CLI and code-signing certificates | Package can resolve `node-forge` from the Expo package path | **Present and potentially reachable by Expo tooling** |
| Expo production mobile bundle | Android export was attempted but failed before bundling because Expo could not resolve `../../App` from `expo/AppEntry.js` | No successful bundle artifact exists to inspect | **Not Verified; mobile release blocked** |
| CI build/publishing/signing | Root CI install includes the package. Current workflow runs web lint/typecheck/build/browser tests and mobile typecheck only | No Expo build, publish, EAS update, signing command, Expo token, or signing credential is configured in the reviewed workflow | **Installed in CI; vulnerable signing path not invoked by reviewed jobs** |
| EAS update/signing | No `eas.json`, EAS project ID, update signing certificate, code-signing metadata, `EXPO_TOKEN`, or EAS command exists in repository configuration | External Expo/EAS account state was not examined | **Not configured in repository; external state Not Verified** |

Installed dependency presence is not treated as proof of exploitability. Equally, the absence of an observed web import is not treated as resolution of the advisory.

## Exploitability Assessment

No reviewed HRMS web request, browser input, Django/Celery operation, CI step, or repository-configured EAS workflow passes untrusted signatures, certificates, or external signed artifacts to the Expo/node-forge verification path. The production web artifact contains no matching code, and the Python runtimes do not contain the dependency.

Residual exposure remains because:

1. the complete Expo toolchain is installed during root dependency installation;
2. the current web Dockerfile unnecessarily carries the root pnpm store, including Expo and `node-forge`, into the final runtime image;
3. a future Expo/EAS signing or artifact-verification workflow could activate the affected code path;
4. the mobile production bundle and external EAS account were not successfully verified.

The evidence supports isolation from the current web staging execution path, not a claim that the vulnerable library is universally non-exploitable.

## Remediation Options

| Option | Current assessment | Disposition |
|---|---|---|
| A. Official patched `node-forge` | No patched version is published | Monitor; preferred when available |
| B. Compatible Expo CLI update/replacement | No released compatible path proven to remove the advisory; current Expo issue remains open | Reassess on vendor release; do not force an incompatible Expo major |
| C. Remove mobile/Expo tooling from web build and runtime images | Technically applicable and reduces avoidable runtime/CI surface without changing product behavior | **Preferred local remediation**: use a web-filtered install or Next.js standalone runtime, then verify image SBOM and runtime absence |
| D. Vendor-supported mitigation | None established for this exact advisory | Not available |
| E. Time-limited risk acceptance | Defensible only for the synthetic web staging candidate with mobile/EAS excluded and controls below | **Recommended pending approval** |

No audit suppression, cryptographic monkey patch, forced downgrade, or unsupported override is permitted.

## Required Temporary Acceptance Record

This document recommends but does not approve the exception. Approval must record:

- Advisory: `GHSA-86w9-cpqp-85rv` / `CVE-2026-85393`.
- Component: `node-forge@1.4.0` through Expo CLI/code-signing tooling.
- Scope: synthetic HRMS **web staging only**; mobile builds, EAS Update, mobile publishing/signing, real payroll and production excluded.
- Verified isolation: no web source import; zero compiled web artifact matches; Python backend/worker images exclude Node; reviewed CI has no Expo/EAS signing or publishing command.
- Compensating controls: no Expo/EAS credentials in web CI; immutable image/SBOM review; mobile/EAS jobs disabled from this release; untrusted signed artifacts prohibited; least-privilege CI; raw audit remains visible.
- Security owner: **TBD; a named approving security owner is mandatory**.
- Expiration: **2026-11-27 or earlier upon a patched upstream release, Expo toolchain change, mobile/EAS enablement, CI signing change, or evidence of reachability**.
- Reassessment trigger: any item above, advisory revision, or deployment-definition change.
- Remediation ticket: **TBD; must be opened and linked before approval**.

Until those fields are completed by an authorized security owner, the disposition is not accepted and the release gate remains `APPROVAL REQUIRED`.

## Compensating Controls And Release Boundary

The web staging candidate may proceed to the remaining deployment gates only after formal approval of the scoped exception. It must not authorize mobile/EAS release. Before unrestricted release, the preferred engineering closure is to remove Expo/mobile dependencies from the final web image and demonstrate through an SBOM/runtime inventory that `node-forge` is absent.

The raw `pnpm audit` result remains **0 critical, 1 high, 0 moderate**. The finding is open, not resolved.

## Verification Evidence

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; all three workspace projects already consistent |
| `pnpm audit --json` | Expected non-zero exit; 892 dependencies; 0 critical, 1 high, 0 moderate |
| Advisory dependency paths | Six paths, all rooted at `mobile` and Expo CLI |
| Web production build | PASS on Next.js 15.5.28; existing CSS autoprefixer warning only |
| Web artifact scan | PASS; zero `node-forge`/verification-symbol matches across 2,541 files |
| Web runtime image build | PASS with required API build argument; image inspected at `sha256:8319e49b2287a86f155a7aba43c81a6f212320da0da433ac59c8a71de6a1a15f` |
| Web runtime inventory | `node-forge` physically present in root pnpm store; not directly resolvable from `/app`; resolvable from Expo package path |
| Mobile Android export | BLOCKED before bundle generation by unresolved `../../App`; mobile bundle remains Not Verified |
| Frozen scenario status | Unchanged: all 136 staging scenarios remain `Not Run` |

The first Docker build attempt omitted the required `HRMS_API_BASE_URL` argument and failed during prerender. The corrected production-equivalent build passed; the failed attempt is retained as environment evidence rather than counted as a product failure.

## Decision

**Recommended disposition: ACCEPT TEMPORARILY for web-only synthetic staging, with approval required.**

- Web staging candidate: may proceed only after a named security owner approves the exact time-limited exception and the other deployment gates close.
- Mobile/EAS candidate: **BLOCK RELEASE** until a successful production bundle and signing-path assessment plus patched/remediated dependency evidence exist.
- Production/real payroll: remains **NO-GO**.
