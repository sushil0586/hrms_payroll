# HRMS Release Risk Register

## 1. Purpose

This register tracks release-risk decisions that remain after the first HRMS release-readiness pass.

It is intentionally short and decision-oriented. Detailed phase scope stays in:

- `docs/hrms-phase-wise-development-and-testing-plan.md`
- `docs/hrms-first-completion-plan.md`
- `docs/high-level-plan.md`

---

## 2. Current Release Decision

Status as of September 5, 2026:

- Backend, web, mobile typecheck, browser behavior, visual regression, and live-backend workflow checks are green.
- Critical JavaScript production audit findings have been cleared.
- One unique high-severity audit advisory remains through the mobile React Native Metro dependency chain.

Recommended release posture:

- Web HRMS internal pilot: acceptable to proceed if mobile app distribution is not part of the pilot scope.
- Mobile HRMS production pilot: hold until the `image-size` advisory is removed by an upstream Expo, React Native, or Metro upgrade, or until a security owner explicitly accepts the risk.
- Payroll handoff: can begin after the release owner records the selected decision for this risk.

---

## 3. Risk R1: Mobile Metro `image-size` Advisory

Risk:

- `pnpm audit --prod` reports two high-severity instances of the same `image-size` advisory.
- The dependency path is through the mobile tooling stack, specifically React Native Metro.
- The package audit feed reports patched versions as `<0.0.0`, which means no patched version is currently available through normal package upgrade selection.

Current mitigation:

- Critical Next.js advisories were removed by upgrading `next` to `15.5.21`.
- Vulnerable transitive packages with available patched versions were pinned through root `pnpm.overrides`.
- The remaining advisory is documented rather than suppressed.
- The current mobile validation scope is typecheck-only, not app-store production distribution.

Decision options:

1. Accept for web-only/internal HRMS pilot.
   - Use when the pilot will run the web app and not distribute the mobile app to real users.
   - Record this as a temporary release exception.

2. Hold mobile production readiness.
   - Use when mobile app distribution is part of pilot scope.
   - Upgrade Expo, React Native, or Metro once an upstream dependency path removes the advisory.

3. Security review.
   - Use when mobile scope is uncertain.
   - Have a security owner assess whether the vulnerable path is reachable in the planned deployment.

Recommended decision:

- Accept for web-only/internal HRMS pilot.
- Keep mobile production readiness conditional until the upstream mobile stack removes `image-size` from the vulnerable range.

Owner needed:

- Product/release owner for pilot scope.
- Security owner if mobile distribution is included.

Review trigger:

- Before any mobile app pilot distribution.
- When Expo, React Native, or Metro releases an update that changes the `image-size` dependency path.
- Before payroll handoff is declared fully release-unblocked.

---

## 4. Dependency Audit Snapshot

Current command:

```bash
pnpm audit --prod --audit-level critical
```

Current result:

- Exits successfully at critical threshold.
- Reports no critical vulnerabilities.
- Reports two high-severity instances of the same unpatched `image-size` advisory.

Useful follow-up command:

```bash
pnpm audit --prod --json | jq -r '.advisories | to_entries[] | [.value.module_name, .value.severity, .value.vulnerable_versions, .value.patched_versions] | @tsv' | sort -u
```

