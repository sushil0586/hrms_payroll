"use client";

import { EmployeeImportPanel } from "./employee-import-panel";

import { useMemo } from "react";

import type { HrAdminEmployeeBankAccountWriteInput, HrAdminEmployeeListItem } from "@/lib/types";

type EmployeeBankImportWorkbenchProps = {
  employees: HrAdminEmployeeListItem[];
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  employeeId: string | null;
  payload: HrAdminEmployeeBankAccountWriteInput | null;
  status: ImportStatus;
  message: string;
};

const headers = [
  "employee_code",
  "account_holder_name",
  "bank_name",
  "account_number",
  "ifsc_code",
  "branch_name",
  "is_primary",
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
    return { rows: [], error: "CSV must include a header row and at least one bank account row." };
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

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["true", "yes", "y", "1", "primary"].includes(normalized);
}

function normalizeIfsc(value: string) {
  return value.trim().toUpperCase();
}

function validateIfsc(value: string) {
  return !value || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);
}

function buildPayload(
  row: Record<string, string>,
  employeesByCode: Map<string, HrAdminEmployeeListItem>,
  batchPrimaryEmployees: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const employee = employeesByCode.get(employeeCode.toLowerCase()) ?? null;
  const isPrimary = parseBoolean(row.is_primary || "true");
  const ifscCode = normalizeIfsc(row.ifsc_code);

  if (!employeeCode) {
    errors.push("Employee code is required.");
  }
  if (employeeCode && !employee) {
    errors.push("Employee code must match an existing employee.");
  }
  if (!row.account_holder_name.trim()) {
    errors.push("Account holder name is required.");
  }
  if (!row.bank_name.trim()) {
    errors.push("Bank name is required.");
  }
  if (!row.account_number.trim()) {
    errors.push("Account number is required.");
  }
  if (row.account_number.trim() && !/^[0-9A-Za-z-]{6,64}$/.test(row.account_number.trim())) {
    errors.push("Account number must be 6-64 letters, digits, or hyphens.");
  }
  if (!validateIfsc(ifscCode)) {
    errors.push("IFSC code must use the 11-character bank format.");
  }
  if (employeeCode && isPrimary && batchPrimaryEmployees.has(employeeCode.toLowerCase())) {
    errors.push("Only one primary account per employee can be committed in one import batch.");
  }

  if (employeeCode && isPrimary) {
    batchPrimaryEmployees.add(employeeCode.toLowerCase());
  }

  if (errors.length || !employee) {
    return { employeeId: employee?.id ?? null, payload: null, errors };
  }

  const payload: HrAdminEmployeeBankAccountWriteInput = {
    account_holder_name: row.account_holder_name.trim(),
    bank_name: row.bank_name.trim(),
    account_number: row.account_number.trim(),
    ifsc_code: ifscCode,
    branch_name: row.branch_name.trim(),
    is_primary: isPrimary,
  };

  return { employeeId: employee.id, payload, errors };
}

function sampleCsv(employees: HrAdminEmployeeListItem[], suffix: string) {
  const first = employees[0];
  const second = employees[1] ?? employees[0];
  if (!first) {
    return templateCsv();
  }

  const rows = [
    [first.employee_code, first.full_name, `Primary Bank ${suffix}`, `910000${suffix.padStart(6, "0")}`, "HDFC0001234", "Main Payroll Branch", "true"],
    [second.employee_code, second.full_name, `Secondary Bank ${suffix}`, `920000${suffix.padStart(6, "0")}`, "ICIC0001234", "Backup Payroll Branch", "false"],
  ];

  return `${headers.join(",")}\n${rows.map((row) => row.map((value) => (value.includes(",") ? `"${value}"` : value)).join(",")).join("\n")}`;
}

export function EmployeeBankImportWorkbench({ employees }: EmployeeBankImportWorkbenchProps) {
  const employeesByCode=useMemo(() => new Map(employees.map(employee => [employee.employee_code.toLowerCase(),employee])),[employees]);
  return <EmployeeImportPanel<ImportRow>
    testId="employee-bank-import-workbench" title="Bank account import" description="Add payout accounts to existing employees."
    impact="Primary accounts take effect immediately and replace the employee's previous primary account. Blank is_primary means true."
    guidance="Employee code, account holder, bank name and account number are required. Use an existing employee code. IFSC is optional and uses the 11-character bank format. Use true or false for primary; blank means true."
    template={templateCsv()} sample={() => sampleCsv(employees,String(Date.now()).slice(-5))}
    importType="employee_bank_accounts" filename="employee-bank-import.csv"
    columns={[{key:"employee_code",label:"Employee"},{key:"bank_name",label:"Bank"},{key:"is_primary",label:"Primary (blank = true)"}]}
    prepare={text => {
      const parsed=parseCsv(text);const primary=new Set<string>();
      return {error:parsed.error,rows:parsed.rows.map((row,index) => {
        const result=buildPayload(row,employeesByCode,primary);
        return {index:index+1,source:row,employeeId:result.employeeId,payload:result.payload,status:result.errors.length ? "blocked" : "ready",message:result.errors.join(" ")};
      })};
    }}
    request={row => ({url:`/api/hr-admin/employees/${row.employeeId}/bank-accounts`,method:"POST",body:row.payload})}
  />;
}
