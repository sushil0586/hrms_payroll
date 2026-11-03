# Employee Document Lifecycle

## Authority model

For a category that permits one active file, an employee has at most one authoritative document. Uploading a replacement must not remove that authority while HR review is pending.

## States

- `active`: authoritative current document, or an initial submission awaiting its first review.
- `pending_replacement`: candidate version awaiting review while its previous document remains active.
- `replaced`: previously authoritative version superseded by an approved replacement.
- `archived`: retained non-authoritative record, including a rejected replacement.
- `withdrawn`: employee-withdrawn candidate retained for audit.

Verification state remains separate: `pending`, `verified`, `rejected`, or `expired`.

## Replacement transitions

1. An employee selects Replace on the current document.
2. The server validates ownership, tenant, category and current active status under a row lock.
3. A manual-review replacement is created as `pending_replacement`; the previous version remains `active`.
4. Approval atomically changes the previous version to `replaced` and the candidate to `active`.
5. Rejection changes only the candidate to `archived`; the previous version remains authoritative.
6. Auto-accepted categories perform replacement and supersession atomically during upload.
7. A second pending replacement for the same employee and category is rejected.

## Completed application controls

- Employee withdrawal is limited to the employee's own pending replacement. It is idempotent, audited, and leaves the approved version unchanged.
- A conditional database constraint prevents two pending candidates for the same approved document while still allowing distinct files in multi-file categories.
- Structured lifecycle events record upload, replacement submission, approval, rejection, and withdrawal independently from verification comments.
- HR review presents the candidate and approved version together and requires a reason for rejection.

## Operational integration boundary

- Tenant retention and legal-hold controls remain governed by the platform retention service; document deletion must use that service rather than a lifecycle status shortcut.
- Malware scanning and quarantine require an approved scanner/storage integration. Upload MIME, size, tenant ownership, and private-storage controls do not constitute malware certification.

## Category policy controls

The following controls are typed, validated, and enforced by the upload service:

- Accepted MIME types, with legacy `visibility_rules.accepted_mime_types` compatibility.
- Per-category maximum upload size, capped by the platform-wide limit.
- Replacement policy: employee and HR, HR only, or prohibited.

Advanced visibility JSON remains available for backward-compatible visibility rules, but upload security and replacement behavior must use the typed controls above.
# Employee document lifecycle

## Artifact security states

Every stored artifact has an explicit malware scan state. `clean` and `not_required` artifacts may be downloaded. `pending`, `error`, and `quarantined` artifacts are held and cannot be downloaded or approved.

`HRMS_DOCUMENT_MALWARE_SCAN_MODE` supports these modes:

- `disabled`: local-development mode; records `not_required` and never implies a staging security approval.
- `local_signature`: deterministic local qualification using non-production signatures.
- `required_external`: fail-closed staging/production mode. An approved external scanner must update the artifact to `clean`; unavailable scanning leaves it held.

Scanner references, timestamps, and a safe reason category are retained. Raw file bytes, access tokens, and sensitive document payloads are never copied into scan metadata or lifecycle audit evidence.
