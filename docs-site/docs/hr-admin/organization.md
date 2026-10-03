# Organization

Organization is the structural master workspace for legal entities, locations, branches, business units, departments, cost centers, grades, designations, and employee types.

Use this guide to set up the structure before employee onboarding, payroll setup, leave, attendance, documents, statutory reporting, and finance handoff. A clean Organization setup prevents many employee import, ESS, MSS, and payroll blockers.

## What Organization Covers

| Master | What it represents | Used by |
| --- | --- | --- |
| Legal entity | Registered employer or company unit. | Employees, payroll, statutory, finance, audit. |
| Location | City, site, or operating location. | Attendance, HRA/city logic, reports. |
| Branch | Office or payroll branch under a location/legal entity. | Employees, statutory state, payroll readiness, local policies. |
| Business unit | Broad business grouping or operating vertical. | Reporting, leadership review, cost allocation. |
| Department | Functional team such as HR, Sales, Engineering. | Employee directory, approvals, reports, policies. |
| Cost center | Finance allocation bucket. | Payroll costing, finance handoff, reports. |
| Grade / level | Seniority or compensation band. | Salary bands, policy eligibility, approvals. |
| Designation | Job title. | Employee profile, policy eligibility, reports. |
| Employee type | Full-time, contractor, intern, consultant, apprentice. | Leave, attendance, payroll, benefits, documents. |

Organization does not replace employee records. It creates the valid choices that employees, imports, policies, payroll, and reports can use.

## Why This Matters

If Organization is incomplete, users may see:

- Employee import failures.
- Employee **Structure Review** badges.
- Leave policy not resolving for employees.
- Attendance shift or holiday rules not applying correctly.
- Payroll blockers for missing legal entity, branch, department, or cost center.
- Incorrect statutory state or employer registration.
- Wrong department or cost center reporting.
- Managers unable to review the right team because reporting structure is inconsistent.

## Use This Page When

- A new tenant is being set up.
- A new legal entity, branch, location, department, grade, designation, or employee type is needed.
- Employee import fails because a referenced organization code does not exist.
- Payroll readiness shows organization master blockers.
- Leave, attendance, salary, or document policy assignment depends on a missing structure value.
- Finance needs cleaner cost center or department reporting.
- Existing structure needs audit before launch.

## Recommended Setup Order

Create parent masters before child masters. This reduces failed imports and broken dropdown choices.

| Order | Master | Example code | Example name |
| --- | --- | --- | --- |
| 1 | Legal entity | `LE-ACC-IN` | Accerio India Pvt Ltd |
| 2 | Location | `LOC-BLR` | Bengaluru |
| 3 | Branch | `BR-BLR-HO` | Bengaluru HO |
| 4 | Business unit | `BU-PEOPLE` | People Operations |
| 5 | Department | `DEP-HR-OPS` | HR Operations |
| 6 | Cost center | `CC-HR-001` | HR Operations Cost Center |
| 7 | Grade / level | `G5` | Grade 5 |
| 8 | Designation | `DES-HR-EXEC` | HR Executive |
| 9 | Employee type | `FT` | Full-time |

After this, create or import employees.

## Dependency Rules

| Master | Usually depends on | Practical rule |
| --- | --- | --- |
| Legal entity | None | Create first. Payroll and statutory setup depend on it. |
| Location | Country/state context or legal entity, depending on tenant setup | Use a city or site name that HR and payroll both understand. |
| Branch | Legal entity and location | Create only real offices/payroll branches that employees can belong to. |
| Business unit | Legal entity or company structure | Keep it broad enough for reporting. |
| Department | Business unit or legal entity | Use functional team names. Avoid temporary project names unless required. |
| Cost center | Finance structure, often legal entity or department | Align with finance codes before payroll launch. |
| Grade | Tenant-wide or legal-entity-specific policy | Keep stable for salary bands and policy eligibility. |
| Designation | Grade, department, or job family where applicable | Use actual HR job titles. |
| Employee type | Tenant policy | Decide whether each type is payroll eligible, leave eligible, and attendance tracked. |

![Organization guided setup](../assets/screenshots/hr-admin/organization-guided-setup.png)

## Page Sections

| Section | Purpose |
| --- | --- |
| CSV data | Paste or upload master data for bulk setup. |
| Preview import | Validates structure rows before commit. |
| Structure catalog | Search and inspect existing organization records. |
| Structural summary | Shows configured counts by master type. |
| Guided form | Create or edit one master record at a time. |
| Filters | Search by name/code/parent/status and page through records. |

## Browser Form Or CSV Import?

| Scenario | Recommended method | Why |
| --- | --- | --- |
| First tenant setup with many rows | CSV import, then guided review | Faster and dependency validation catches issues. |
| Add one new department | Guided form | Lower risk and easier to verify immediately. |
| Add a new branch and location | Guided form if only one; CSV if many | Keeps parent-child relationships visible. |
| Rename many cost centers | CSV import | Consistent bulk update. |
| Correct one parent relationship | Guided form | Lets HR verify impact before save. |
| Audit current setup | Structure catalog | Search and filter without changing records. |

## Buttons And Actions

| Button | What it does | Expected result |
| --- | --- | --- |
| Load sample template | Loads sample organization CSV. | User sees valid section names and field order. |
| Copy template | Copies CSV template text. | User can paste into spreadsheet. |
| Download template | Downloads CSV template. | User can prepare offline data. |
| Upload CSV | Uploads organization CSV. | File is ready for preview. |
| Preview import | Validates rows before save. | Ready and rejected rows are shown. |
| Commit ready rows | Saves valid rows only. | Only validated masters are created/updated. |
| Apply | Applies catalog filters. | Catalog list updates. |
| Reset | Clears catalog filters. | Catalog returns to default view. |
| Add / Save | Creates or updates one master record. | Master appears in catalog and employee dropdowns if active. |

## Field-By-Field Guidance

### Common Fields

| Field | Guidance | Common mistake |
| --- | --- | --- |
| Code | Short, unique, stable code. Prefer `LE-ACC-IN`, `BR-BLR-HO`, `DEP-HR-OPS`. | Changing code after employees or payroll use it. |
| Name | Human-friendly display name. | Making names too cryptic for HR users. |
| Parent code | Code of parent master where required. | Referencing a parent that does not exist or is inactive. |
| Active flag | Active means available for new employees and policies. | Deactivating a master still used by active employees. |
| Description | Optional business context. | Leaving unclear records with similar names. |
| Payroll eligible | Use for structures that can be included in payroll scope. | Marking contractor-only branches as payroll eligible by mistake. |

### Legal Entity

| Field | Guidance |
| --- | --- |
| Code | Use a stable employer code, such as `LE-ACC-IN`. |
| Name | Registered or commonly used employer name, such as `Accerio India Pvt Ltd`. |
| Country / state context | Required when statutory or payroll rules depend on it. |
| Registered email / phone / address | Useful for audit, statutory, and finance evidence. |
| Payroll eligible | Set true only if employees are paid under this entity. |

Legal entity affects:

- Payroll employer.
- PF, ESIC, PT, TDS, and statutory registrations.
- Finance handoff.
- Payslip employer details.
- Employee import validation.

### Location

| Field | Guidance |
| --- | --- |
| Code | Use city/site code, such as `LOC-BLR`. |
| Name | `Bengaluru`, `Mumbai`, `Noida`, or site name. |
| Timezone | For India, usually `Asia/Kolkata`. |
| State/city | Important for Professional Tax, holidays, and reporting. |

Location affects attendance, holiday calendars, workplace reports, and sometimes salary rules such as HRA city classification.

### Branch

| Field | Guidance |
| --- | --- |
| Code | Use branch code, such as `BR-BLR-HO`. |
| Name | Use office/branch name, such as `Bengaluru HO`. |
| Legal entity | Select the employing legal entity. |
| Location | Select the city/site location. |
| Branch type | Head office, branch, remote, warehouse, plant, or similar. |
| Active | Keep active only if employees can be assigned to it. |

Branch affects payroll readiness, employee structure, local policies, statutory state context, and branch-level reports.

### Business Unit

| Field | Guidance |
| --- | --- |
| Code | Use broad operating code, such as `BU-PEOPLE`. |
| Name | Use leadership-friendly name, such as `People Operations`. |
| Parent | Legal entity or group structure where applicable. |

Business unit is best for reporting and leadership views. Avoid using it for small teams if Department already covers that.

### Department

| Field | Guidance |
| --- | --- |
| Code | Use stable code, such as `DEP-HR-OPS`. |
| Name | Use practical team name, such as `HR Operations`. |
| Business unit | Link to broad BU where applicable. |
| Parent department | Use only when true hierarchy is needed. |

Department affects employee directory filters, reports, leave/attendance/salary policy scope, manager review, and approvals.

### Cost Center

| Field | Guidance |
| --- | --- |
| Code | Match finance if available, such as `CC-HR-001`. |
| Name | Use readable finance name. |
| Department / legal entity | Map to owning structure where applicable. |
| Active | Keep active only while finance can post costs to it. |

Cost center affects payroll allocation, finance handoff, cost reports, and audit.

### Grade / Level

| Field | Guidance |
| --- | --- |
| Code | Use stable code such as `G5` or `L2`. |
| Name | Use clear display name such as `Grade 5` or `Level 2`. |
| Description | Capture band meaning if needed. |

Grade affects salary banding, policy eligibility, approval limits, and reports.

### Designation

| Field | Guidance |
| --- | --- |
| Code | Use stable job title code, such as `DES-HR-EXEC`. |
| Name | Use actual title, such as `HR Executive`. |
| Grade | Link when titles map to grade. |
| Department | Link only if designation is department-specific. |

Designation affects employee profile, reporting, policy eligibility, and salary setup.

### Employee Type

| Field | Guidance |
| --- | --- |
| Code | Use simple codes like `FT`, `PT`, `CON`, `INT`. |
| Name | Full-time, part-time, contractor, intern, apprentice, consultant. |
| Payroll eligible | Mark true only when paid through payroll. |
| Leave eligible | Decide whether leave policy should apply. |
| Attendance tracked | Decide whether attendance is mandatory. |

Employee type affects leave, attendance, benefits, payroll, documents, and reports.

## Example: Create Accerio India Structure

Use this example for a first tenant setup or customer training.

### Business Case

Accerio India Pvt Ltd has a Bengaluru head office. It has People Operations and Engineering teams. HR wants to onboard employees and run payroll for Bengaluru employees.

### Setup Values

| Master | Code | Name | Parent |
| --- | --- | --- | --- |
| Legal entity | `LE-ACC-IN` | Accerio India Pvt Ltd | None |
| Location | `LOC-BLR` | Bengaluru | India/Karnataka context |
| Branch | `BR-BLR-HO` | Bengaluru HO | `LE-ACC-IN`, `LOC-BLR` |
| Business unit | `BU-PEOPLE` | People Operations | `LE-ACC-IN` |
| Business unit | `BU-ENG` | Engineering | `LE-ACC-IN` |
| Department | `DEP-HR-OPS` | HR Operations | `BU-PEOPLE` |
| Department | `DEP-ENG-PLAT` | Platform Engineering | `BU-ENG` |
| Cost center | `CC-HR-001` | HR Operations Cost Center | `DEP-HR-OPS` |
| Cost center | `CC-ENG-001` | Engineering Cost Center | `DEP-ENG-PLAT` |
| Grade | `G5` | Grade 5 | Tenant-wide |
| Designation | `DES-HR-EXEC` | HR Executive | `DEP-HR-OPS`, `G5` |
| Employee type | `FT` | Full-time | Tenant-wide |

### Browser Form Flow

1. Open **HR Admin > Organization**.
2. Select the master section, starting with **Legal entities**.
3. Click **Add** or use the guided form.
4. Enter code, name, parent values, and active status.
5. Save the record.
6. Continue in setup order: legal entity, location, branch, business unit, department, cost center, grade, designation, employee type.
7. Open the **Structure catalog**.
8. Search each code and confirm records are active.

### Expected Result

- Employee forms show the new legal entity, branch, location, department, grade, designation, and employee type.
- Employee import preview accepts rows using these codes.
- Payroll Control no longer reports missing organization master for those values.

## Example: Add A New Mumbai Branch

Use this when the company opens a new location.

1. Create location:
   - Code: `LOC-MUM`
   - Name: `Mumbai`
   - State: `Maharashtra`
2. Create branch:
   - Code: `BR-MUM`
   - Name: `Mumbai Branch`
   - Legal entity: `LE-ACC-IN`
   - Location: `LOC-MUM`
3. Confirm holiday calendar and attendance setup for Mumbai separately.
4. Confirm Professional Tax and statutory state setup if payroll depends on state.
5. Create or update departments/cost centers if they differ from Bengaluru.
6. Assign employees to `BR-MUM` only after setup is ready.

Expected result:

- Mumbai appears as a valid branch/location for employee records.
- Attendance and payroll rules can be configured by Mumbai context.

## Example: Fix Employee Import Missing Department

### Problem

Employee import preview rejects a row:

`Department code DEP-CS not found.`

### Fix

1. Open **Organization**.
2. Search `DEP-CS`.
3. If missing, create the department:
   - Code: `DEP-CS`
   - Name: `Customer Success`
   - Business unit: correct parent BU
   - Active: true
4. If it exists but inactive, confirm whether it should be reactivated.
5. Return to **Employees > Import updates**.
6. Upload the file and preview again.

Expected result:

- The import row moves from rejected to ready if no other validation fails.

## CSV Import Guidance

Use CSV import for initial setup or many changes.

### Recommended Import Order

1. Legal entities
2. Locations
3. Branches
4. Business units
5. Departments
6. Cost centers
7. Grades
8. Designations
9. Employee types

Parent rows must exist before child rows. If one file contains all records, place parent rows above child rows.

### Validate Before Commit

| Check | Expected result |
| --- | --- |
| Section | Matches supported master section. |
| Code | Unique and stable. |
| Name | Clear and user-friendly. |
| Parent code | Already exists or appears earlier in the import order. |
| Active flag | Correct for whether employees can use it. |
| Payroll eligibility | Correct for legal entities, branches, and employee types used in payroll. |
| Dependency errors | No missing parent or duplicate code errors. |

### Common CSV Rejections

| Error | Likely reason | Fix |
| --- | --- | --- |
| Unknown section | Section name is not supported. | Use template values exactly. |
| Duplicate code | Code already exists or appears twice in CSV. | Keep one row per stable code. |
| Missing parent | Branch references missing legal entity/location. | Create parent first or move row earlier. |
| Inactive parent | Child is assigned to inactive master. | Reactivate parent or choose correct active parent. |
| Invalid active value | Active flag is not true/false or expected format. | Use template value format. |
| Employee import still fails | Employee file references display name instead of code. | Use the code expected by the employee import template. |

## Safe Edit Rules

- Do not delete or deactivate a master that active employees still use.
- Prefer renaming display names over changing stable codes.
- Avoid changing legal entity or branch mapping during an open payroll period unless payroll owners approve.
- Review dependent employees after changing parent relationships.
- Keep inactive records visible for history where reports need them.
- Use Lifecycle or Movement workflow for employee transfers; do not silently change many employee branches without audit.
- Coordinate cost center changes with finance before payroll close.

## What Each Master Affects

| Master | Affects |
| --- | --- |
| Legal entity | Payroll employer, statutory reports, finance handoff, payslips, audit evidence. |
| Location | Attendance, holidays, HRA/location rules, reports, employee workplace. |
| Branch | Payroll readiness, statutory state context, local policies, reporting. |
| Business unit | Reporting, cost allocation, leadership review. |
| Department | Employee filters, approvals, manager review, reports, policy assignment. |
| Cost center | Finance posting, payroll reports, allocation evidence. |
| Grade | Salary bands, policy eligibility, approvals. |
| Designation | Employee profile, policy eligibility, reports. |
| Employee type | Benefits, payroll eligibility, attendance and leave policy assignment. |

## Positive End-To-End Scenario

### Scenario

HR prepares Organization masters, imports employees, and clears employee structure blockers before payroll.

### Steps

1. Create legal entity `LE-ACC-IN`.
2. Create Bengaluru location and branch.
3. Create People Operations and Engineering business units.
4. Create HR Operations and Platform Engineering departments.
5. Create cost centers aligned to finance.
6. Create grade, designation, and employee type masters.
7. Preview employee import using these codes.
8. Commit ready employee rows.
9. Open **Employees** and verify Structure Ready badges.
10. Open **Payroll Control** and verify no missing organization blocker remains.

### Result

- Employee onboarding works without repeated missing-master corrections.
- Leave, attendance, salary, and documents can scope rules by organization values.
- Payroll readiness has reliable structure data.

## Negative Scenarios And Fixes

| Scenario | What user sees | Root cause | Fix |
| --- | --- | --- | --- |
| Employee import fails for branch | Row rejected with missing branch code. | Branch code does not exist or is inactive. | Create or activate branch, then preview import again. |
| Payroll shows missing legal entity | Employee has no legal entity or references invalid one. | Organization master missing or employee not mapped. | Create legal entity and update employee. |
| Leave policy does not apply | Employee cannot apply leave. | Policy assignment scoped to wrong branch/department/employee type. | Correct organization mapping or policy assignment. |
| Attendance holiday is wrong | Employee marked absent on branch holiday. | Location/branch holiday mapping wrong. | Fix location/branch and attendance setup. |
| Finance report has wrong cost center | Payroll cost allocation mismatch. | Employee department/cost center mapping wrong. | Correct cost center and review affected employees. |
| Dropdown value missing | HR cannot select department/designation. | Master not created or inactive. | Create or reactivate master. |
| Duplicate-looking departments | HR sees similar department names. | Codes/names were not governed. | Keep one active master and retire duplicates carefully. |
| Changed code breaks import | Employee CSV rejects previously working code. | Stable code was changed after templates were shared. | Restore old code or migrate templates and dependent records in a controlled way. |

## Troubleshooting

| Problem | First check | Then check |
| --- | --- | --- |
| Master does not appear in employee dropdown | Active flag | Parent is active and valid |
| Import row rejected | Preview message | Section name, code, parent code, duplicate code |
| Employee still shows Structure Review | Employee field value | Master status and parent relationship |
| Payroll blocker remains | Payroll period and employee scope | Legal entity, branch, cost center, salary/pay group |
| Report counts look wrong | Employee mapping | Inactive duplicate masters |
| Leave or attendance policy not resolving | Employee branch/department/type | Policy assignment scope |

## Quality Checklist

Run this before bulk employee import and before go-live.

- Legal entities are active and payroll/statutory ownership is clear.
- Locations include city/state/timezone where needed.
- Branches link to valid legal entities and locations.
- Business units are broad and not duplicated as departments.
- Departments are active, correctly named, and linked to the right parent.
- Cost centers match finance expectations.
- Grades and designations are stable enough for salary setup.
- Employee types clearly define payroll, leave, attendance, and document eligibility.
- Codes are short, unique, and stable.
- No active employees point to inactive masters.
- Employee import preview has no missing organization code errors.
- Payroll Control has no unexplained organization master blockers.

## FAQ

### Should I create every possible department on day one?

No. Create the structures needed for current employees, near-term onboarding, and payroll. Too many unused masters make dropdowns harder to use.

### Can I change a code later?

Avoid changing stable codes after employees, imports, reports, payroll, or integrations use them. Change the display name when the business name changes but the meaning is the same.

### Can I deactivate an old branch?

Only after confirming active employees no longer use it and reporting/history needs are understood. Deactivation should prevent new use without breaking old records.

### Why does employee import fail when the name exists in Organization?

The import may require the code, not the display name. Use the exact code from Organization and keep spelling/case consistent.

### How does Organization affect payroll?

Payroll uses organization mappings to determine employer, branch, statutory context, employee scope, cost allocation, reports, and finance handoff. Missing or inconsistent masters can block payroll even when salary is configured.

## Related Guides

- [Onboarding Prerequisites](onboarding-prerequisites.md)
- [Employees](employees.md)
- [Employee to Payroll Workflow](../workflows/employee-to-payroll.md)
- [Payroll Control](payroll/payroll-control.md)
- [Salary Setup](payroll/salary-setup.md)
- [Leave](leave.md)
- [Attendance](attendance.md)
- [Payroll Issues](../troubleshooting/payroll.md)
