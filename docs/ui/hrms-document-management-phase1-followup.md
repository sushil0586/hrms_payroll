# Document Management Phase 1 — remaining baseline checks

Prepared: 22 October 2026. Status: Phase 1 discovery complete within the recorded scope; known defects remain implementation requirements. This supplements the [initial baseline](hrms-document-management-phase1-design-baseline.md) and [makeover plan](hrms-document-management-makeover-plan.md). It records discovery, existing defects and implementation decisions; it does not accept the current UI as compliant.

## Environment and evidence

Reused build `yZgzuG5se0QVNeeFNH2QD` with unchanged application source. The follow-up used a new isolated PostgreSQL database, two synthetic tenant fixtures, a 37-byte stored text artifact and 111 document records in the populated tenant. Direct fixture setup created pending, rejected, expired, expiring and re-upload states, plus a missing mandatory category. Bulk records are synthetic coverage data, not proof of valid version/replacement workflows. No UI review, upload or letter-generation write was performed. Permission probes included an empty authorized review PATCH, which may update timestamps, and invalid create/preview requests.

Evidence: [follow-up folder](../qa/evidence/document-makeover-phase1-followup-2026-10-22/), [state contracts](../qa/evidence/document-makeover-phase1-followup-2026-10-22/state-contracts.json), [permission probes](../qa/evidence/document-makeover-phase1-followup-2026-10-22/permission-probes.json), [page/state observations](../qa/evidence/document-makeover-phase1-followup-2026-10-22/observations.json), [supported view-role observations](../qa/evidence/document-makeover-phase1-followup-2026-10-22/view-role-observations.json) and [outage observations](../qa/evidence/document-makeover-phase1-followup-2026-10-22/unavailable-observations.json).

The Chromium sweep captures HR review states and category/requirement footer positions at 1440×600; ESS missing requirements, upload/detail dialogs and their footer positions at 1440×600 and 320×600; genuine empty employee history; and HR/ESS unavailable views. Lower-page checks scroll the owning task into view. This is additional baseline coverage, not a full keyboard, accessibility or cross-browser workflow acceptance run.

## Permission findings

Twenty-nine backend APIClient probes passed their recorded expectations. Positive artifact cases returned the same recorded body checksum for the employee owner, authorized HR and export-only user. Same-tenant wrong-employee, foreign employee and foreign HR requests returned 404 while the artifact actually existed. This closes the earlier no-artifact limitation for these specific cases; it is not exhaustive storage/security testing.

| Explicit permission | Options/list reads | Empty review PATCH | Invalid category create | Artifact download | Invalid letter preview |
| --- | --- | --- | --- | --- | --- |
| documents.view | 200 | 403 | 403 | 403 | 400 |
| documents.manage | 403 | 403 | 400 | 403 | 400 |
| documents.verify | 403 | 200 | 403 | 403 | 400 |
| documents.export | 403 | 403 | 403 | 200 | 400 |

A 400 here means permission checks allowed the request to reach input validation; it does not prove a successful create/generation. Probe roles had one explicit permission each and replaced their original membership roles in the owned fixture. Invalid requests and the empty PATCH are distinguished from successful business workflow tests.

The initial 20 browser page probes produced five redirects to ESS for the non-HR-prefixed view-only role, and 15 redirect-loop observations for manage/verify/export-only roles across queue, upload, category list, review and letters. The view-only result follows the existing role-prefix rule in [workspace access serialization](../../backend/apps/iam/api_serializers.py): a view-only permission requires an HR-prefixed role for HR workspace access. A focused follow-up uses `hr-qa-view` with the same single documents.view permission, checks queue/category access and upload/review fallback destinations. The letter URL stays in HR but renders the workspace error view: its employee-list dependency returns 403 without employees.view, as retained logs show. Remaining on the requested URL is not successful letter-page access.

**DOC-C02 — permission/navigation mismatch:** the backend HR gate accepts qualifying elevated permissions, and session serialization can mark their HR workspace available. However, the [frontend HR layout](../../web/src/app/hr-admin/layout.tsx) lists documents.view among its entry permissions without documents.manage/verify/export. With no other listed permission, layout fallback to `/` can route back into HR and loop. Page-specific read/options dependencies also require documents.view. Phase 2 must include a bounded permission-navigation fix: provide a deliberate accessible or denied destination, retain backend action gates, and test these explicit-role combinations. Do not solve this by granting additional permissions automatically.

**DOC-C03 — letter policy remains broad:** all four custom permission roles reach letter preview validation through the backend HR workspace gate. Inspected letter views do not add an operation-specific permission check. Preserve this observed policy during unrelated makeover phases; before Phase 5 mutation work, explicitly assess the intended letters permissions against the permission catalog/product contract. This baseline neither authorizes a permission-policy change nor claims the broad gate is intended. The unresolved policy decision does not block HR queue visual design; it gates letters authorization changes.

## Report scope finding

The populated tenant has **111 documents**. List total_count is 111 while loaded items are 100. The current report displays 100 total records, the CSV has 100 data rows, and the manifest reports row_count 100. The oldest artifact-backed document is omitted from the export. Thus matching report/export counts do not imply complete tenant coverage.

Evidence: [CSV](../qa/evidence/document-makeover-phase1-followup-2026-10-22/report.csv), [manifest](../qa/evidence/document-makeover-phase1-followup-2026-10-22/report-manifest.json) and report-scope observation. Phase 5 must resolve completeness explicitly, reusing established complete-report pagination where appropriate and testing filtered display/CSV/manifest against the same authoritative scope. Until then, do not label the existing report tenant-complete or use it to conclude there is no expiry/re-upload risk outside the loaded rows.

## Rendered decisions

- HR review and setup footer actions are reachable after scrolling in the 600px-high desktop dialog. HR review actions sit after potentially lengthy version/review history. Move the active decision/footer into a deliberate composition, retain scroll access to history, and verify footer focus and visibility after errors.
- ESS upload/detail use a separate footer that remains visible at 320×600. Preserve this useful pattern. Simplify the task body without letting the footer cover the last field or error; initial and footer captures alone do not verify every intermediate field.
- Missing requirements are distinguishable from populated history, but narrow requirement tables truncate category identity and put next actions beyond the initial horizontal view. Prioritize the employee's missing/returned task while retaining accessible table scrolling.
- A genuinely empty employee history currently uses the copy “No documents match the current filters.” with no active filters. Phase 4 should distinguish first-use/no submissions from a filtered no-match result.
- A document-only synthetic outage with healthy authentication shows explicit HR and ESS unavailable views with enabled retry. It does not show a zero-count live success. The proxy returns 503 for document reads while forwarding authentication/session; retry recovery after restoring service was not exercised.

## Execution lineage and limits

Final successful capture runs do not erase earlier failures. Raw logs/reports retain the initial multiple-main locator failure, the redirect-loop navigation failure, two missing-requirement selector failures and the focused view-role expected-fallback correction. The final broad page probe catches and records navigation errors intentionally; its passing status means baseline collection completed, not that the 15 redirect loops are acceptable. The earlier setup failure attempted deletion of a retained document and correctly hit the historical-delete guard; recovery left the guard intact and used an employee with no documents for the empty case.

The initial baseline reviewed 14 of 67 images. The follow-up visual manifest separately identifies actually inspected images, hashes and dimensions; do not sum captures as accepted screens. Formal assistive-technology/native zoom/device review, non-Chromium behavior, real review/save/replacement/generation, notification effects, durable retry/idempotency, exhaustive permission combinations and storage-provider acceptance remain implementation/assessment work.

The final state/page collection test passed, the outage test passed, and the supported view-role and genuine-empty tests passed (four final tests). Navigation errors in the broad collection remain recorded defects. All 22 follow-up PNGs were inspected; their [visual manifest](../qa/evidence/document-makeover-phase1-followup-2026-10-22/visual-manifest.json) records dimensions and hashes. Together with the initial baseline this is 89 final captures and 36 inspected images, with different scopes in the two manifests.

The [cleanup record](../qa/evidence/document-makeover-phase1-followup-2026-10-22/cleanup.json) identifies the exact owned services, container and volume removed, fixture absence, stored artifact removal and unchanged runtime source hashes. Private fixture manifests and runners were removed. No application source, schema, permission policy, deployment or commit changed.

Phase 1 is complete as a bounded discovery/design baseline. DOC-V01 through DOC-V07 and DOC-C01 through DOC-C03 remain explicit implementation requirements. Phase 2 can begin with the HR hub/queue/review composition and its bounded access/navigation dependency; Phase 5 retains a letter-policy decision gate. Closing discovery does not accept or fix the discovered defects.

Later implementation: [Phase 2](hrms-document-management-phase2-makeover.md) adopts the hub/queue/review composition and resolves the observed DOC-C02 navigation loops through a stable denied destination without granting permissions. DOC-C01 and DOC-C03 remain Phase 5 requirements.
