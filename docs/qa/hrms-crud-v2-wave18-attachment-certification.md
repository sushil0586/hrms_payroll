# HRMS CRUD V2 Wave 18 Attachment Certification

Date: 2026-10-28

## Decision

**CONDITIONAL PASS.** Wave 18 continued from the verified 314 Passed / 73 Partial / 5,071 Not Run baseline. It mapped `ATT-004` to the implemented `/ess/leave` lifecycle surface and promoted four executable P0 feedback contracts without changing policy-dependent cases.

## Executed IDs

- `CRUD-05360`: selected filename and exact byte size were visible and announced before persistence.
- `CRUD-05361`: delayed real submission displayed a disabled `Withdrawing request` state with no premature success or duplicate POST.
- `CRUD-05362`: success appeared only after the real multipart HTTP 200 response; refresh retained one withdrawn request.
- `CRUD-05368`: keyboard activation, labelled controls, status/alert announcements and 390px feedback visibility passed.

The browser additionally reproduced required-evidence and blocked-file-type rejection, an ambiguity-safe controlled 503, recovery, and one successful real retry. These neighboring assertions did not promote their broader frozen IDs where the complete boundary matrix or post-commit response-loss contract remained incomplete.

## Defect Closure

`CRUDV2-DEF-028` is closed. The withdrawal lifecycle panel previously exposed only its native file input, leaving no durable visible or announced filename/size summary. It now uses the existing leave evidence presentation pattern and a polite live status. No storage, retention, authorization or production policy changed.

The task-owned Playwright fixture now requires synthetic withdrawal evidence so this isolated browser path exercises the real multipart endpoint. This is test-only configuration and does not change application defaults.

## Security And Integrity

The real withdrawal used the authenticated ESS owner and a tenant-bound pending request. The API received one multipart POST with an operation-specific idempotency key. Focused PostgreSQL/Django regression confirmed required evidence, one stored lifecycle attachment, canonical replay/conflict behavior and no duplicate attachment. Exact-ID workspace cleanup verified the synthetic tenant and private media were absent afterward.

Existing Passed ATT-004 authorization, private-media, checksum, cross-user/cross-tenant denial and storage-failure contracts were not reclassified or rerun unnecessarily.

## Validation

- Production build: passed; the pre-existing Autoprefixer warning at `globals.css:4546` remains.
- Playwright: 1/1 passed in 12.7 seconds with one Chromium worker.
- PostgreSQL/Django: 1 passed / 385 deselected in 44.54 seconds.
- Focused ESLint: passed.
- Django system check: passed.
- Migration drift: none.

## Remaining ATT-004 Contracts

`CRUD-02119` and `CRUD-02125` remain Partial pending governed replacement/removal and retention decisions. `CRUD-05363`, `CRUD-05364`, `CRUD-05365`, `CRUD-05366` and `CRUD-05367` remain Partial because the full invalid-file matrix, approved removal semantics, post-commit lost-response browser replay, withdrawal-artifact download failure and complete browser isolation feedback were not all executed.

`PKG-0267` / `ATT-004` is **14 Passed / 7 Partial / 0 Failed / 0 Blocked / 0 Not Run**. Global totals are **318 Passed / 69 Partial / 0 Failed / 0 Blocked / 5,071 Not Run** across 5,458 IDs. Fully certified package count remains zero.

## Cleanup And Next Scope

The run-owned PostgreSQL, Redis, Django, Next.js, synthetic tenant and private files were governed by exact ownership. Shared staging, production and the separate 136-workflow register were untouched.

Next executable scope: the bounded ATT-004 invalid-file boundary and authorization-feedback cases (`CRUD-05363` and `CRUD-05367`), without inventing replacement, removal or retention behavior.

## 2026-11-03 Supplemental Verification

`CRUD-05363` received additional executable evidence. The withdrawal browser rejected an executable file before transport, rejected a spoofed PDF with HTTP 400, displayed no success state, and independently confirmed that the request remained pending after each rejection. A subsequent valid PDF withdrawal completed once. Focused PostgreSQL-backed document validation passed 6/6 for empty, exact-limit, oversized, executable-extension, executable-signature, spoofed and corrupt inputs. The case remains Partial because the frozen contract also requires complete audit and private-storage reconciliation for this lifecycle path.

`CRUD-05367` was not promoted. Existing API tenant isolation remains verified, but the complete frozen browser feedback matrix for unauthenticated, foreign-user and foreign-tenant identities was not executed in this supplemental run.
