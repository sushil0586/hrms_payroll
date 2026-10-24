"use client";

import { EmployeeImportPanel } from "./employee-import-panel";

import { useMemo } from "react";

import type { HrAdminEmployeeFormOptions, HrAdminEmployeeListItem } from "@/lib/types";

type EmployeeManagerImportWorkbenchProps = {
  employees: HrAdminEmployeeListItem[];
  options: HrAdminEmployeeFormOptions;
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  employeeId: string | null;
  reportingManagerId: string | null;
  status: ImportStatus;
  message: string;
};

const headers = ["employee_code", "reporting_manager_code", "effective_date", "reason"];

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
    return { rows: [], error: "CSV must include a header row and at least one manager mapping row." };
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

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function isValidDate(value: string) {
  return !value.trim() || !Number.isNaN(Date.parse(value.trim()));
}

function csvCell(value: string) {
  return value.includes(",") ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function sampleCsv(employees: HrAdminEmployeeListItem[], suffix: string) {
  const employee = employees.find((item) => item.direct_reports_count === 0) ?? employees[0];
  const manager = employees.find((item) => item.id !== employee?.id && item.direct_reports_count > 0) ?? employees.find((item) => item.id !== employee?.id);
  if (!employee || !manager) {
    return templateCsv();
  }

  const rows = [
    [employee.employee_code, manager.employee_code, "2026-04-01", `Reporting line load ${suffix}`],
  ];

  return `${headers.join(",")}\n${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
}

function buildImportRow(
  row: Record<string, string>,
  index: number,
  employeesByCode: Map<string, HrAdminEmployeeListItem>,
  managersByCode: Map<string, { id: string; employee_code: string; name: string }>,
  managersByName: Map<string, { id: string; employee_code: string; name: string }>,
  batchEmployees: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const managerCode = row.reporting_manager_code.trim();
  const employee = employeesByCode.get(normalizeCode(employeeCode)) ?? null;
  const manager = managersByCode.get(normalizeCode(managerCode)) ?? managersByName.get(normalizeCode(managerCode)) ?? null;

  if (!employeeCode) {
    errors.push("Employee code is required.");
  }
  if (employeeCode && !employee) {
    errors.push("Employee code must match an existing employee.");
  }
  if (!managerCode) {
    errors.push("Reporting manager code is required.");
  }
  if (managerCode && !manager) {
    errors.push("Reporting manager must match one unambiguous active manager option; use the employee code.");
  }
  if (employee && manager && employee.id === manager.id) {
    errors.push("Employee cannot report to self.");
  }
  if (employeeCode && batchEmployees.has(normalizeCode(employeeCode))) {
    errors.push("Only one manager mapping per employee can be committed in one import batch.");
  }
  if (!isValidDate(row.effective_date)) {
    errors.push("Effective date must be a valid date.");
  }
  if (!row.reason.trim()) {
    errors.push("Reason is required for reporting-line audit context.");
  }

  if (employeeCode) {
    batchEmployees.add(normalizeCode(employeeCode));
  }

  return {
    index,
    source: row,
    employeeId: employee?.id ?? null,
    reportingManagerId: manager?.id ?? null,
    status: errors.length ? "blocked" : "ready",
    message: errors.join(" "),
  } satisfies ImportRow;
}

export function EmployeeManagerImportWorkbench({ employees, options }: EmployeeManagerImportWorkbenchProps) {
  const employeesByCode=useMemo(() => new Map(employees.map(employee => [normalizeCode(employee.employee_code),employee])),[employees]);
  const managersByCode=useMemo(() => new Map(options.managers.map(manager => [normalizeCode(manager.employee_code),manager])),[options.managers]);
  const managersByName=useMemo(() => new Map(options.managers.filter(manager => options.managers.filter(item => normalizeCode(item.name) === normalizeCode(manager.name)).length === 1).map(manager => [normalizeCode(manager.name),manager])),[options.managers]);
  return <EmployeeImportPanel<ImportRow>
    testId="employee-manager-import-workbench" title="Reporting manager import" description="Update reporting lines for existing employees."
    impact="Manager changes apply immediately. The CSV date and reason are checked in this preview but are not submitted as effective-dated changes or saved audit context by this workflow."
    guidance="Employee code, manager code or unique manager name, and reason are required. Use existing employee codes. Date is optional; use YYYY-MM-DD. The date and reason remain preview-only in this workflow."
    template={templateCsv()} sample={() => sampleCsv(employees,String(Date.now()).slice(-5))}
    importType="reporting_manager_mappings" filename="employee-manager-import.csv"
    columns={[{key:"employee_code",label:"Employee"},{key:"reporting_manager_code",label:"Manager"},{key:"effective_date",label:"CSV date (preview only)"},{key:"reason",label:"CSV reason (preview only)"}]}
    prepare={text => {
      const parsed=parseCsv(text);const batch=new Set<string>();
      return {error:parsed.error,rows:parsed.rows.map((row,index) => buildImportRow(row,index+1,employeesByCode,managersByCode,managersByName,batch))};
    }}
    request={row => ({url:`/api/hr-admin/employees/${row.employeeId}`,method:"PATCH",body:{reporting_manager_id:row.reportingManagerId}})}
  />;
}
