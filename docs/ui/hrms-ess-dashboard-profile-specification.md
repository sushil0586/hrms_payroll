# ESS dashboard and employee profile specification — UX-0

Implementation follow-up: ESS-1 has been explicitly authorized after UX-0. The discovery/specification below is the retained UX-0 baseline. Current implementation and evidence are maintained in the [ESS tracker](hrms-ess-coverage-tracker.md) and [ESS-1 certification](hrms-ess1-dashboard-profile-certification.md).

Date: 2026-10-18. Status: proposed specification, no implementation. Read with the [horizontal plan](hrms-horizontal-experience-upgrade-plan.md) and [coverage tracker](hrms-horizontal-module-coverage-tracker.md).

## Existing contracts and authority

Sources: [ESS dashboard](../../web/src/app/ess/page.tsx), [ESS layout](../../web/src/app/ess/layout.tsx), [API accessors](../../web/src/lib/api.ts), [Django URL registry](../../backend/apps/common/api_urls.py), [API views](../../backend/apps/common/api_views.py), [serializers](../../backend/apps/common/api_serializers.py), [employee models](../../backend/apps/employees/models.py), [statutory models](../../backend/apps/payroll/models.py), [RBAC resolver](../../backend/apps/iam/permission_checks.py), [session workspace resolver](../../backend/apps/iam/api_serializers.py).

`MeProfileView` supports GET only. `EmployeeContextMixin` resolves the authenticated user's membership and employee; this endpoint takes no employee ID and returns 404 when no employee context exists. Current self-profile is a fixed read projection, not a field-edit policy. There is no current profile PATCH, profile change request or profile request-history route in the inspected registry. Existing employee editing and bank APIs are HR APIs; never call them from ESS to bypass the missing self-service contract.

Tenant field policy was not provided or read from a deployed account. Therefore no employee-master field is classified as currently employee-editable or request-change enabled. Database presence does not establish disclosure rights. This conservative classification preserves the observed authorization rather than inventing new access.

## Dashboard hierarchy and interaction map

Desktop schematic (original proposed arrangement):

```text
Workspace shell / tenant / Inbox / authorized workspace switch
[Employee name · code · role · department] [My Profile] [Apply leave*]
[Today and attendance]                  [Leave balances]
[Your actions, if supported]            [Requests awaiting others]
[Documents / requirements*]             [Payslips and tax shortcuts]
[Upcoming holidays*]                    [Announcements*, if available]
```

`*` Requires the actual capability and enabled release scope; unsupported panels/actions are omitted. The first slice includes existing data only, with document/payslip links rather than invented status counts. Do not reserve blank grid cells for future features. Phone order: identity, employee actions, attendance, balances, waiting requests, documents, payroll, holidays, announcements. A neutral “No requests awaiting approval” is appropriate; “All caught up” is not when sources failed.

| Panel | Read source / current feasibility | Display and interaction | State/authorization rule |
|---|---|---|---|
| Identity | GET `/api/v1/me/profile/` or dashboard.profile | Name, code, designation, department, compact manager/location; My Profile to proposed `/ess/profile` | No invented portrait; initials from authorized name. Missing mapping is explicit. No large greeting banner. |
| Attendance | GET `/me/dashboard/`, `/me/attendance-summary/` | Today status, assigned shift, check-in where present, month hours with period; View attendance to `/ess/attendance` | Do not add Punch in/out: no corresponding self-service route was identified. Regularize opens existing form only for valid eligible record/capability. |
| Leave | Dashboard.leave or `/me/leave-summary/`; `/me/leave-types/` for form | Compact rows by leave type, available/used/reserved and policy; Apply leave to `/ess/leave#apply-leave` | Preserve balance semantics and units; no client recalculation. Query filters reflect backend status. |
| Awaiting others | GET `/me/leave-requests/?status=pending&page_size=3` and `/me/attendance-regularizations/?status=pending&page_size=3` | Type, dates, status, submission/context where returned; View all retains status filter | Pending manager review is informational. Do not count it as an employee task or display Approve. Totals come from authoritative summaries, not visible page length. |
| Employee actions | Existing actionable document requirements, unread notifications or request transitions only where contract supplies them | Specific verb/object, e.g. view rejected document; group by task ownership | If response does not establish actionability, offer a neutral module link. Never infer “needs resubmission” from rejected leave. |
| Payslips/tax | Existing payslip list and declaration endpoints; initially neutral links | View payslips `/ess/payslips`; declarations `/ess/statutory-declarations`; optionally latest published period after scoped read | Do not show net pay on dashboard by default. No “salary paid” based on payslip publication. No assumed Form 16 availability. |
| Documents | GET `/me/document-center/` returns requirement runtime, summary and uploadable categories | Missing/rejected/expiring requirements using exact returned semantics; canonical document center | Current implementation is not blanket launch approval. Honor upload/sharing exclusion and category `allow_employee_upload`; no profile-level bypass. |
| Profile completeness | Not in current dashboard contract | Initially no percentage. Later list approved missing fields with useful section links | Requires versioned tenant requirement policy, eligible fields and disclosure. Hidden/not-applicable fields excluded; error never lowers score. No arbitrary 80% meter. |
| Holidays | HR holiday calendar CRUD exists; no dedicated self upcoming-holiday route identified | Later show next 3 applicable dates/names and calendar context | New employee-scoped read selector for effective shift/location/calendar; no arbitrary tenant-wide list. Distinguish not configured from none upcoming. |
| Announcements | Notifications exist; no dedicated announcement publishing/read model identified in inspected route surface | Omit until a genuine published audience-scoped source exists | Do not relabel transactional notifications as company announcements. Inbox remains available. |

API paths in this table use the `/api/v1` prefix throughout even where abbreviated. Existing browser mutation proxies use `/api/me/...`; inspect actual proxy methods before wiring actions. Reuse existing module workspaces instead of reimplementing forms on the dashboard.

Keep no more than one dashboard primary action and two identity-header secondary actions. Dashboard counts, period labels and destination filters must agree. Do not rank by fabricated urgency, deadline or payroll impact. A section may display “Updated …” only if its source provides a reliable timestamp; browser fetch time must be labelled as refresh time.

## Profile navigation and section behavior

Proposed `/ess/profile?section=overview` uses stable section values: `overview`, `personal`, `contact`, `emergency`, `employment`, `organization`, `bank-statutory`, `qualifications-skills`, `documents`, `time-leave`, `payroll`, `requests`. Desktop uses a compact section rail and content; tablet/phone uses a labelled section select or horizontally scrollable navigation. Section links are navigation with `aria-current`, not pseudo-tabs without keyboard behavior.

Overview shows identity, employment summary and links to existing leave/attendance/documents/payroll pages. Personal and Contact initially display only existing self DTO fields. Employment and Organization show the existing name/value projection; manager name is not a link until a safe target exists. Documents, Time and leave, and Payroll provide concise summaries and canonical module links; do not fork filters, download or submission logic. Sections without a current disclosure contract remain absent in the first slice. A hidden future section must not be presented as employee data “missing.”

Requests is the eventual profile-update request/history section. Until a real workflow exists, show no request-change button or fake timeline. Existing leave/document histories stay in their own modules. HR employment-history logs are not automatically employee-visible request history.

## Field and permission matrix

Legend: **H** HR-controlled/read-only; **X** restricted/hidden in current ESS. **E** employee editable and **R** employee request change with approval are supported categories but have **zero authorized employee-master fields today**. H means ESS may read only where the current self endpoint exposes it; X does not mean the field is unavailable to authorized HR. Fields listed together have the same classification individually. Future disclosure/editing always requires policy approval and a dedicated contract.

| Section / exact fields | Current ESS class | Current evidence / display | Required development or rule |
|---|---|---|---|
| Identity: `id` | H | Self DTO; internal reference | Do not show raw UUID as a business field. |
| Identity: `employee_code`, `full_name` | H | Self DTO; full_name currently combines first/last only | Display returned name; any revised name semantics must be deliberate. |
| Personal: `preferred_name` | H | Self DTO | No inline edit until a policy-approved E or R contract exists. |
| Personal: `first_name`, `middle_name`, `last_name` individually | X | Employee model; only derived full_name is exposed | Do not reconstruct separate legal-name inputs from full_name. |
| Personal: `date_of_birth` | X | Model field absent in self DTO | New self disclosure policy/API required. Never infer gender/age. |
| Contact: `work_email`, `personal_email`, `phone_number` | H | Self DTO | Display only to the self owner; no public directory reuse. Copy action optional if privacy reviewed. |
| Address: `address_type`, `address_line_1`, `address_line_2`, `city`, `state`, `postal_code`, `country_code`, `is_primary` | X | EmployeeAddress model, no self profile projection | Scoped nested read contract first; separate approved write/validation if desired. |
| Emergency: `name`, `relationship`, `phone_number`, `email`, `is_primary` | X | EmergencyContact model, no self profile projection | Treat third-party personal data with explicit disclosure/retention and update policy. |
| Employment: `employment_status`, `date_of_joining` | H | Self DTO | Read-only; no status/tenure mutation in profile. |
| Organization: `legal_entity`, `branch`, `location`, `department`, `designation`, `reporting_manager` (names) | H | Self DTO | Current snapshot only; not historical as-of or clickable directory authority. |
| Organization: `business_unit`, `cost_center`, `grade`, `employment_type` | X | Employee model; not current self DTO | Approve read projection; do not copy HR detail response. |
| Employment: `probation_end_date`, `confirmation_date` | X | Model fields absent in self DTO | Approve self visibility; preserve lifecycle authority and effective history. |
| Record controls: `tenant`, `membership`, related organization/manager IDs, `created_at`, `updated_at` | X | Model relations/metadata | Server resolves scope; client cannot set ownership or memberships. A later version token is opaque. |
| Bank: `account_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `branch_name`, `is_primary` | X | EmployeeBankAccount; HR bank routes only | New masked self read contract after approval. No raw account number in HTML/JSON then CSS masking. |
| Statutory identities: `pan_number`, `uan_number`, `pf_number`, `esi_number` | X for profile | EmployeeStatutoryProfile; not MeProfile | Future self projection masks on server. Existing authorized declaration/document views retain their own contract; never broaden via profile. |
| Statutory applicability: `pf_applicable`, `esi_applicable`, `professional_tax_state`, `lwf_state` | X for profile | Statutory model | HR-controlled even after approved read disclosure; no ESS applicability switches. |
| Statutory governance: `statutory_pack`, `profile_ref`, `effective_from`, `effective_to`, `status` | X for profile | Statutory configuration | Only approved descriptive/effective-date subset may later be read; no override of effective windows. |
| Tax: `tax_regime`, `declaration_status`, `previous_employment_income`, `previous_employment_tax_deducted` | X in profile DTO | Governed self declaration routes already exist | Link to canonical declarations; existing editable declaration inputs follow their own serializer/status checks. This does not authorize employee-master editing. |
| Internal statutory metadata: `source_ref`, `source_hash`, `config_snapshot`, tenant/employee foreign keys, timestamps | X | Statutory model internals | Exclude from self-facing profile payload. |
| Qualifications/skills: qualification, institution, subject, completion year, proficiency, skill name | X / capability absent | No dedicated model/self route found in inspected employee surface | Proposed data dictionary, storage, verification/privacy and E/R policy needed; do not use arbitrary JSON or fake records. |
| Other requested personal fields: photo, gender, marital status, nationality, dependants | X / not established | Not in inspected Employee master/self DTO | No collection or input before model, policy and disclosure review. |
| Employee documents: title/category/verification/expiry and authorized artifact | Separate document workflow | `/me/document-center/`, employee-document POST/download | Employee uploads only eligible categories; HR verifies. This is document submission, not E master-field permission. |
| Attendance and leave summaries | Read-only aggregate, separate request workflows | `/me/dashboard/`, summaries and histories | Employee may submit eligible leave/regularization through existing workflows; cannot edit derived summary. |
| Payroll documents | Read/download/acknowledge under existing contract | `/me/payroll-payslips/`, download/read/signed-access | Published own documents only; publication != bank settlement. |
| Profile update requests/history | X / absent | No current self route | New governed workflow required; no invented approval status. |

The matrix covers all business fields on Employee, EmployeeAddress, EmergencyContact, EmployeeBankAccount and EmployeeStatutoryProfile inspected for this proposal. It is not a claim that all payroll model fields are employee profile fields. Profile does not expose salary configuration, deductions, disciplinary records, secrets, access roles, workflow administration or other employees' personal data.

## Governed editing: future contract, blocked until policy exists

Before any field becomes E or R, product/HR/security must approve a tenant-scoped register containing field key, read audience, E/R/H/X class, requiredness, validation, masking, evidence requirement, effective-date rule, reviewer authority, conflict behavior, retention and applicable launch capability. Missing policy fails closed; a role title or generic workflow-template existence is insufficient. Reuse current permission resolution, not a new frontend RBAC engine.

For E fields: section editor opens current server values; save validates allowlisted fields and expected version; backend persists and audits atomically; success refreshes authoritative values. Server rejects extra restricted keys. No optimistic success for personal/financial data.

For R fields: proposed request contains explicit field diffs, reason, permitted evidence and base version. A state model such as draft/submitted/approved/rejected/withdrawn is a design option requiring policy approval, not an existing promise. Submission cannot modify the live employee. Review applies only an authorized current assignment and must validate conflicts/effective-date constraints again. Concurrent conflicting requests or HR edits require explicit resolution rather than last-write-wins. Approval/rejection, reason, actor, timestamps and application outcome require immutable history. Delegation/escalation/reassignment remain disabled where release gates exclude them.

Use section-level editors to keep review concise. E and R fields in one section must have separate explicit outcomes or disallow mixed submission. The UI must say “Saved” versus “Request submitted”; an approved request must not be described as applied until backend application succeeds. Pending requests display proposed values alongside current values only to allowed audiences. Approved bank changes must never rewrite historical payroll snapshots or imply the next payroll used them.

No mutation contract or migration is approved by this document. Schema design, security review and migration review are prerequisites to that later slice.

## Backend reuse versus development

| Work | Reuse | Additional work / dependency |
|---|---|---|
| First profile page | Existing self DTO and layout access | New Next.js page/accessor wiring, menu catalog/fallback entry and focused regression; no backend required for current fields. |
| Dashboard cleanup | Dashboard summaries, histories, canonical links and shared patterns | Presentational semantics/density; remove literal Ready assertions and duplicated signals. |
| Independent panels | Existing domain APIs | Explicit server fetch-result taxonomy and panel-level retry; session/tenant failures invalidate identity-bound content globally. |
| Expanded personal/employment/contact | Existing models and HR validation as reference | New self serializer/selector and approved disclosure; do not expose HR serializer. |
| Bank/statutory summary | Existing records | Masked minimal projection and tests; no reveal control without separately approved authority/audit. |
| Holiday list | Calendar/assignment domain | Employee-effective selector and capped read response; test location/shift/date boundaries. |
| Completeness | Document requirement runtime | Approved profile requirement definition; return missing authorized fields, denominator/version and not-applicable semantics. |
| Profile requests | Existing authentication/RBAC/audit/workflow infrastructure | New field policy, request persistence, assignment authority, versioning, application transaction and history; potential reviewed migration. |
| Skills and announcements | No established self contracts found | Separate product scope and domain/API work; omitted initially. |

## UX and functional acceptance scenarios

1. Authorized employee sees their own current name/code/organization. Switching tenant, employee identity or session clears cached content before another response renders. A user without employee context receives a useful mapping error, not synthetic identity.
2. Dashboard leave/attendance numbers match the underlying authorized API and filtered page. Pending requests read “Awaiting approval”; neutral document/payslip links never claim verification/readiness. No request is advertised as requiring employee action without an actionable state.
3. Apply leave and regularization links open the existing form; submission, validation, session expiry and backend decision behavior remain unchanged. Existing request/history filters survive Back. Do not promise transparent lost-response replay beyond existing certification.
4. My Profile current-field slice contains no edit, request-change or reveal action. Hidden fields are absent from serialized/RSC/browser responses; browser URL or POST/PATCH manipulation cannot expose or change them.
5. Expanded profile sections remain unavailable until their policy and contract pass review. A withheld bank value is distinct from a missing bank value; masking cannot leak through tooltips, clipboard, logs or accessible labels.
6. Document actions honor requirement category and release configuration. A rejected/expired document does not change payroll eligibility by frontend inference. Published payslip access remains own-employee only; download/read receipt works after reload.
7. Simulate dashboard read failure, optional panel failure, 401, 403, 404, 409 and transport timeout. Never replace failed values with zero, fake data or a green status. Retry is scoped, controls recover, and stale responses cannot overwrite newer selection.
8. At desktop/tablet/phone sizes, the first useful employee task appears without a greeting wall. No page overflow at 320px; all actions work by keyboard, dialog focus returns, field errors are announced, reduced motion and 200% zoom remain usable.
9. Any later E field persists once across click/retry/reload and records audit. Any later R field leaves current values unchanged until authorized approval/application; rejected requests retain the old value. Unauthorized approver, concurrent HR edit, cross-tenant ID and closed-period effect all fail safely.
10. No financial/statutory calculation, effective-dated history, payroll/attendance snapshot or release-gate status changes as a consequence of UI presentation work. Existing browser/API evidence remains intact; new results are appended separately.

Execution strategy, personas, browsers and phase estimates are defined in the horizontal plan. These are acceptance requirements for future implementation, not UX-0 test-pass claims.
