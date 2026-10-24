"use client";

import { EmployeeImportPanel } from "./employee-import-panel";

import { useMemo } from "react";

import type { HrAdminEmployeeFormOptions, HrAdminEmployeeListItem, HrAdminEmployeeWriteInput, HrAdminOptionItem, HrAdminManagerOption } from "@/lib/types";

type EmployeeImportWorkbenchProps = {
  employees: HrAdminEmployeeListItem[];
  options: HrAdminEmployeeFormOptions;
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  payload: HrAdminEmployeeWriteInput | null;
  status: ImportStatus;
  message: string;
  createdId?: string;
};

const headers = [
  "employee_code",
  "first_name",
  "middle_name",
  "last_name",
  "preferred_name",
  "work_email",
  "personal_email",
  "phone_number",
  "employment_status",
  "date_of_birth",
  "date_of_joining",
  "probation_end_date",
  "confirmation_date",
  "legal_entity",
  "branch",
  "location",
  "business_unit",
  "department",
  "cost_center",
  "designation",
  "grade",
  "employment_type",
  "reporting_manager_code",
];

function templateCsv() {
  return `${headers.join(",")}\n`;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], error: "CSV must include a header row and at least one employee row." };
  }

  const parsedHeaders = splitCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = headers.filter((header) => !parsedHeaders.includes(header));
  if (missingHeaders.length) {
    return { rows: [], error: `CSV is missing required columns: ${missingHeaders.join(", ")}.` };
  }

  return {
    rows: lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      return Object.fromEntries(parsedHeaders.map((header, index) => [header, values[index] ?? ""]));
    }),
    error: "",
  };
}

function findByName(items: HrAdminOptionItem[], value: string) {
  if (!value.trim()) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  const matches = items.filter((item) => item.name.toLowerCase() === normalized);
  return matches.length === 1 ? matches[0] : null;
}

function findManager(items: HrAdminManagerOption[], value: string) {
  if (!value.trim()) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  const byCode = items.find((item) => item.employee_code.toLowerCase() === normalized);
  if (byCode) return byCode;
  const matches = items.filter((item) => item.name.toLowerCase() === normalized);
  return matches.length === 1 ? matches[0] : null;
}

function nullableDate(value: string) {
  return value.trim() || null;
}

function validateDateOrder(row: Record<string, string>, errors: string[]) {
  if (row.date_of_birth && row.date_of_joining && row.date_of_birth >= row.date_of_joining) {
    errors.push("Date of birth must be earlier than date of joining.");
  }
  if (row.date_of_joining && row.probation_end_date && row.probation_end_date < row.date_of_joining) {
    errors.push("Probation end date cannot be earlier than date of joining.");
  }
  if (row.date_of_joining && row.confirmation_date && row.confirmation_date < row.date_of_joining) {
    errors.push("Confirmation date cannot be earlier than date of joining.");
  }
  if (row.probation_end_date && row.confirmation_date && row.confirmation_date < row.probation_end_date) {
    errors.push("Confirmation date cannot be earlier than probation end date.");
  }
}

function buildPayload(
  row: Record<string, string>,
  options: HrAdminEmployeeFormOptions,
  knownCodes: Set<string>,
  batchCodes: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const firstName = row.first_name.trim();
  const status = row.employment_status.trim() || "active";

  if (!employeeCode) {
    errors.push("Employee code is required.");
  }
  if (!firstName) {
    errors.push("First name is required.");
  }
  if (employeeCode && (knownCodes.has(employeeCode.toLowerCase()) || batchCodes.has(employeeCode.toLowerCase()))) {
    errors.push("Employee code already exists in this tenant or import batch.");
  }
  if (!options.employment_statuses.some((item) => item.value === status)) {
    errors.push("Employment status must match an available status value.");
  }

  validateDateOrder(row, errors);

  const legalEntity = findByName(options.legal_entities, row.legal_entity);
  const branch = findByName(options.branches, row.branch);
  const location = findByName(options.locations, row.location);
  const businessUnit = findByName(options.business_units, row.business_unit);
  const department = findByName(options.departments, row.department);
  const costCenter = findByName(options.cost_centers, row.cost_center);
  const designation = findByName(options.designations, row.designation);
  const grade = findByName(options.grades, row.grade);
  const employmentType = findByName(options.employment_types, row.employment_type);
  const reportingManager = findManager(options.managers, row.reporting_manager_code);

  [
    ["Legal entity", row.legal_entity, legalEntity],
    ["Branch", row.branch, branch],
    ["Location", row.location, location],
    ["Business unit", row.business_unit, businessUnit],
    ["Department", row.department, department],
    ["Cost center", row.cost_center, costCenter],
    ["Designation", row.designation, designation],
    ["Grade", row.grade, grade],
    ["Employment type", row.employment_type, employmentType],
    ["Reporting manager", row.reporting_manager_code, reportingManager],
  ].forEach(([label, value, match]) => {
    if (String(value).trim() && !match) {
      errors.push(`${label} must match one unambiguous active option.`);
    }
  });

  if (branch?.legal_entity_id && legalEntity && branch.legal_entity_id !== legalEntity.id) {
    errors.push("Branch does not belong to the selected legal entity.");
  }
  if (costCenter?.legal_entity_id && legalEntity && costCenter.legal_entity_id !== legalEntity.id) {
    errors.push("Cost center does not belong to the selected legal entity.");
  }
  if (department?.business_unit_id && businessUnit && department.business_unit_id !== businessUnit.id) {
    errors.push("Department does not belong to the selected business unit.");
  }
  if (designation?.grade_id && grade && designation.grade_id !== grade.id) {
    errors.push("Designation does not belong to the selected grade.");
  }

  if (errors.length) {
    return { payload: null, errors };
  }

  const payload: HrAdminEmployeeWriteInput = {
    employee_code: employeeCode,
    first_name: firstName,
    middle_name: row.middle_name.trim(),
    last_name: row.last_name.trim(),
    preferred_name: row.preferred_name.trim(),
    work_email: row.work_email.trim(),
    personal_email: row.personal_email.trim(),
    phone_number: row.phone_number.trim(),
    employment_status: status,
    date_of_birth: nullableDate(row.date_of_birth),
    date_of_joining: nullableDate(row.date_of_joining),
    probation_end_date: nullableDate(row.probation_end_date),
    confirmation_date: nullableDate(row.confirmation_date),
    legal_entity_id: legalEntity?.id ?? null,
    branch_id: branch?.id ?? null,
    location_id: branch?.location_id ?? location?.id ?? null,
    department_id: department?.id ?? null,
    business_unit_id: department?.business_unit_id ?? businessUnit?.id ?? null,
    cost_center_id: costCenter?.id ?? null,
    designation_id: designation?.id ?? null,
    grade_id: designation?.grade_id ?? grade?.id ?? null,
    employment_type_id: employmentType?.id ?? null,
    reporting_manager_id: reportingManager?.id ?? null,
  };

  return { payload, errors };
}

function sampleCsv(options: HrAdminEmployeeFormOptions, suffix: string) {
  const manager = options.managers[0]?.employee_code ?? "";
  const values = [
    `BULK-${suffix}-001`,
    "Aditi",
    "",
    "Sharma",
    "Aditi",
    `aditi.${suffix.toLowerCase()}@example.test`,
    "",
    "+91 90000 00001",
    "active",
    "1995-04-10",
    "2026-04-01",
    "2026-09-30",
    "",
    options.legal_entities[0]?.name ?? "",
    options.branches[0]?.name ?? "",
    options.locations[0]?.name ?? "",
    options.business_units[0]?.name ?? "",
    options.departments[0]?.name ?? "",
    options.cost_centers[0]?.name ?? "",
    options.designations[0]?.name ?? "",
    options.grades[0]?.name ?? "",
    options.employment_types[0]?.name ?? "",
    manager,
  ];
  return `${headers.join(",")}\n${values.map((value) => (value.includes(",") ? `"${value}"` : value)).join(",")}`;
}

export function EmployeeImportWorkbench({ employees, options }: EmployeeImportWorkbenchProps) {
  const existingCodes = useMemo(() => new Set(employees.map(employee => employee.employee_code.toLowerCase())), [employees]);
  return <EmployeeImportPanel<ImportRow>
    testId="employee-import-workbench" title="Employee import" description="Create employee records from CSV."
    impact="This creates employee records immediately; it does not provision login access."
    guidance={`Employee code and first name are required. Use configured organization names and a unique manager code or name. Dates use YYYY-MM-DD. Employment status: ${options.employment_statuses.map(item => item.value).join(", ")}; blank means active.`}
    template={templateCsv()} sample={() => sampleCsv(options, String(Date.now()).slice(-5))}
    importType="employees" filename="employee-import.csv"
    columns={[{key:"employee_code",label:"Employee"},{key:"work_email",label:"Work email"}]}
    prepare={text => {
      const parsed=parseCsv(text); const batchCodes=new Set<string>();
      return {error:parsed.error,rows:parsed.rows.map((row,index) => {
        const result=buildPayload(row,options,existingCodes,batchCodes);
        if(row.employee_code.trim()) batchCodes.add(row.employee_code.trim().toLowerCase());
        return {index:index+1,source:row,payload:result.payload,status:result.errors.length ? "blocked" : "ready",message:result.errors.join(" ")};
      })};
    }}
    request={row => ({url:"/api/hr-admin/employees",method:"POST",body:row.payload})}
  />;
}
