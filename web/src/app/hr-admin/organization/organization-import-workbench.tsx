"use client";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";


import { useEffect, useMemo, useRef, useState } from "react";
import type { OrganizationWorkflowState } from "./organization-workflows";
import { AsyncActionButton } from "@/components/patterns/async-action-button";

import type { HrAdminOrganizationSnapshot, HrAdminOrganizationWriteInput } from "@/lib/types";
import { submitImportRequest } from "@/lib/ui/import-request";
import { ORGANIZATION_SECTION_CONFIG, type OrganizationSectionKey } from "./section-config";

type ImportRow = {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  payload: HrAdminOrganizationWriteInput | null;
  status: "ready" | "blocked" | "created" | "failed" | "unconfirmed";
  message: string;
};

type CreatedLookupItem = { id: string; code: string; name: string };

const SECTION_ORDER: OrganizationSectionKey[] = [
  "legal_entities",
  "locations",
  "branches",
  "business_units",
  "departments",
  "cost_centers",
  "grades",
  "designations",
  "employment_types",
];

const TEMPLATE_HEADERS = [
  "section",
  "code",
  "name",
  "registered_name",
  "country_code",
  "timezone",
  "primary_email",
  "primary_phone",
  "address_line_1",
  "address_line_2",
  "city",
  "state",
  "postal_code",
  "legal_entity_code",
  "location_code",
  "branch_type",
  "business_unit_code",
  "parent_code",
  "grade_code",
  "level",
  "description",
  "is_payroll_eligible",
  "is_active",
];

const SAMPLE_ROWS = [
  "legal_entities,LE-WEST,West Legal Entity,West Legal Entity Pvt Ltd,IN,Asia/Kolkata,ops@example.com,+911234567890,,,,,,,,,,,,,,true",
  "locations,LOC-MUM,Mumbai Office,,IN,,,,123 Business Park,,Mumbai,Maharashtra,400001,,,,,,,,,true",
  "branches,BR-MUM,Mumbai Branch,,,,,,,,,,,LE-WEST,LOC-MUM,Head Office,,,,,,,true",
  "business_units,BU-SALES,Sales,,,,,,,,,,,,,,,,,,,,true",
  "departments,DEP-SALES,Sales Operations,,,,,,,,,,,,,,BU-SALES,,,,,,true",
  "grades,GR-L2,Level 2,,,,,,,,,,,,,,,,,2,,,,true",
  "designations,DES-AE,Account Executive,,,,,,,,,,,,,,,,GR-L2,,,,true",
  "employment_types,EMP-FT,Full Time,,,,,,,,,,,,,,,,,,,Payroll eligible,true,true",
  "cost_centers,CC-WEST,West Cost Center,,,,,,,,,,,LE-WEST,,,,,,,,,true",
];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function boolValue(value: string, fallback = true) {
  if (!value.trim()) {
    return fallback;
  }
  return ["true", "yes", "1", "active", "payroll"].includes(normalizeKey(value));
}

function findIdByCode(items: Array<{ id: string; code: string }>, code: string) {
  if (!code.trim()) {
    return null;
  }
  return items.find((item) => normalizeKey(item.code) === normalizeKey(code))?.id ?? null;
}

function resolvePayload(
  row: ImportRow,
  section: OrganizationSectionKey,
  collections: {
    legal_entities: CreatedLookupItem[];
    locations: CreatedLookupItem[];
    business_units: CreatedLookupItem[];
    departments: CreatedLookupItem[];
    grades: CreatedLookupItem[];
  },
) {
  const payload = { ...(row.payload ?? {}) } as HrAdminOrganizationWriteInput;
  if (section === "branches") {
    payload.legal_entity_id = findIdByCode(collections.legal_entities, row.data.legal_entity_code);
    payload.location_id = findIdByCode(collections.locations, row.data.location_code);
  }
  if (section === "business_units") {
    payload.parent_id = findIdByCode(collections.business_units, row.data.parent_code);
  }
  if (section === "departments") {
    payload.business_unit_id = findIdByCode(collections.business_units, row.data.business_unit_code);
    payload.parent_id = findIdByCode(collections.departments, row.data.parent_code);
  }
  if (section === "cost_centers") {
    payload.legal_entity_id = findIdByCode(collections.legal_entities, row.data.legal_entity_code);
  }
  if (section === "designations") {
    payload.grade_id = findIdByCode(collections.grades, row.data.grade_code);
  }
  return payload;
}

function sectionFromValue(value: string): OrganizationSectionKey | null {
  const normalized = normalizeKey(value);
  return SECTION_ORDER.find((key) => key === normalized || normalizeKey(ORGANIZATION_SECTION_CONFIG[key].label) === normalized) ?? null;
}

function templateCsv() {
  return [TEMPLATE_HEADERS.join(","), ...SAMPLE_ROWS].join("\n");
}

function buildRows(csvText: string, snapshot: HrAdminOrganizationSnapshot): ImportRow[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map(normalizeKey);
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const valueAt = (values: string[], key: string) => values[indexes.get(key) ?? -1] ?? "";
  const pendingIds = new Map<string, string>();
  const toLookup = (items: CreatedLookupItem[]) => items.map((item) => ({ id: item.id, code: item.code, name: item.name }));
  const localCollections = {
    legal_entities: toLookup(snapshot.legal_entities),
    locations: toLookup(snapshot.locations),
    business_units: toLookup(snapshot.business_units),
    departments: toLookup(snapshot.departments),
    grades: toLookup(snapshot.grades),
  };

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const data = Object.fromEntries(TEMPLATE_HEADERS.map((header) => [header, valueAt(values, header)]));
    const rowNumber = index + 2;
    const errors: string[] = [];
    const section = sectionFromValue(data.section);
    const code = data.code.trim();
    const name = data.name.trim();

    if (!section) {
      errors.push("Section is required and must match a supported organization master.");
    }
    if (!code) {
      errors.push("Code is required.");
    }
    if (!name) {
      errors.push("Name is required.");
    }
    if (section && code) {
      const existing = (snapshot[section] as Array<{ code: string }>).some((item) => normalizeKey(item.code) === normalizeKey(code));
      if (existing || pendingIds.has(`${section}:${normalizeKey(code)}`)) {
        errors.push("Code already exists in this tenant or import batch.");
      }
    }

    let payload: HrAdminOrganizationWriteInput | null = section && code && name ? { code, name, is_active: boolValue(data.is_active) } : null;
    if (payload && section === "legal_entities") {
      payload = {
        ...payload,
        registered_name: data.registered_name,
        country_code: data.country_code || "IN",
        timezone: data.timezone || "Asia/Kolkata",
        primary_email: data.primary_email,
        primary_phone: data.primary_phone,
      };
    }
    if (payload && section === "locations") {
      payload = {
        ...payload,
        address_line_1: data.address_line_1,
        address_line_2: data.address_line_2,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country_code: data.country_code || "IN",
      };
    }
    if (payload && section === "branches") {
      const legalEntityId = findIdByCode(localCollections.legal_entities, data.legal_entity_code);
      const locationId = findIdByCode(localCollections.locations, data.location_code);
      if (!legalEntityId) {
        errors.push("Branch requires a valid legal_entity_code from existing rows or earlier import rows.");
      }
      payload = { ...payload, legal_entity_id: legalEntityId, location_id: locationId, branch_type: data.branch_type };
    }
    if (payload && section === "business_units") {
      payload = { ...payload, parent_id: findIdByCode(localCollections.business_units, data.parent_code) };
    }
    if (payload && section === "departments") {
      payload = {
        ...payload,
        business_unit_id: findIdByCode(localCollections.business_units, data.business_unit_code),
        parent_id: findIdByCode(localCollections.departments, data.parent_code),
      };
    }
    if (payload && section === "cost_centers") {
      const legalEntityId = findIdByCode(localCollections.legal_entities, data.legal_entity_code);
      if (!legalEntityId) {
        errors.push("Cost center requires a valid legal_entity_code from existing rows or earlier import rows.");
      }
      payload = { ...payload, legal_entity_id: legalEntityId };
    }
    if (payload && section === "grades") {
      payload = { ...payload, level: data.level ? Number(data.level) : null };
    }
    if (payload && section === "designations") {
      payload = { ...payload, grade_id: findIdByCode(localCollections.grades, data.grade_code) };
    }
    if (payload && section === "employment_types") {
      payload = { ...payload, description: data.description, is_payroll_eligible: boolValue(data.is_payroll_eligible) };
    }

    if (section && payload && !errors.length) {
      const fakeId = `pending:${section}:${code}`;
      pendingIds.set(`${section}:${normalizeKey(code)}`, fakeId);
      if (section in localCollections) {
        localCollections[section as keyof typeof localCollections].push({ id: fakeId, code, name });
      }
    }

    return {
      rowNumber,
      data,
      errors,
      payload: errors.length ? null : payload,
      status: errors.length ? "blocked" : "ready",
      message: errors.join(" "),
    };
  });
}

export function OrganizationImportWorkbench({ snapshot, onStateChange }: { snapshot: HrAdminOrganizationSnapshot; onStateChange?: (state:OrganizationWorkflowState)=>void }) {
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [summary, setSummary] = useState("");
  const [previewText,setPreviewText]=useState("");const [confirmedText,setConfirmedText]=useState("");
  const [baseline,setBaseline]=useState(()=>templateCsv());const pending=useRef(false);const feedback=useRef<HTMLDivElement>(null);
  useEffect(()=>{onStateChange?.({dirty:csvText!==baseline,busy:isCommitting});},[csvText,baseline,isCommitting,onStateChange]);
  useEffect(()=>{if(summary)feedback.current?.focus();},[summary]);
  const parsedRows = useMemo(() => buildRows(csvText, snapshot), [csvText, snapshot]);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const createdCount = rows.filter((row) => row.status === "created").length;

  function preview() {
    if(pending.current)return;
    setPreviewText(csvText);
    setRows(parsedRows.map((row) => ({ ...row, data: { ...row.data }, errors: [...row.errors], payload: row.payload ? { ...row.payload } : null })));
    setSummary(parsedRows.length ? "Preview ready. Review blocked rows before committing." : "Add CSV rows before preview.");
  }

  async function commitReadyRows() {
    if (pending.current || previewText!==csvText || confirmedText===csvText) return;
    const nextRows=rows.map(row=>({...row}));const readyRows=nextRows.filter(row=>row.status==="ready");if(!readyRows.length)return;
    pending.current=true;setIsCommitting(true);
    try {
      const response=await submitImportRequest("/api/hr-admin/organization/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows:readyRows.map(row=>({row_number:row.rowNumber,section:row.data.section,data:row.data}))})});
      const created=response.payload?.created;
      const confirmed=response.ok && Array.isArray(created) && created.length===readyRows.length && new Set(created.map((item:{id?:string}|null)=>item?.id)).size===readyRows.length && readyRows.every(row=>created.filter((item:{row_number:number;id:string;section:string;code:string})=>item && item.row_number===row.rowNumber&&typeof item.id==="string"&&item.section===row.data.section&&item.code===row.data.code).length===1);
      const uncertain=response.status===0 || response.status>=500 || (response.ok&&!confirmed);
      const message=confirmed?"Created in the submitted batch.":uncertain?"Outcome unconfirmed. Check the catalog before retrying.":JSON.stringify(response.payload?.rows??response.payload?.detail??"The submitted batch was rejected.");
      readyRows.forEach(row=>{row.status=confirmed?"created":uncertain?"unconfirmed":"failed";row.message=message;});
      if(confirmed){setConfirmedText(csvText);setBaseline(csvText);}
      setSummary(confirmed?"Submitted ready rows confirmed. Blocked rows were not submitted. Reload the catalog before another batch.":uncertain?"Import outcome could not be confirmed. The CSV is retained; check the catalog before retrying.":"The submitted batch was rejected. Review the messages and preview the retained CSV again.");
    } finally { setRows(nextRows);pending.current=false;setIsCommitting(false); }
  }

  return (
    <section className="section" data-testid="organization-import-workbench">
      <details className="organization-workflow-disclosure panel-card-soft" data-testid="organization-import-disclosure">
        <summary>
          <span>
            <strong>CSV import</strong>
            <small>Open when loading many legal entities, locations, branches, departments, or employment types.</small>
          </span>
          <span className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{blockedCount}</strong> blocked</span>
          </span>
          <span className="button button--secondary button--compact">Open import</span>
        </summary>
      <article className="organization-import-workbench"><fieldset className="organization-fields" disabled={isCommitting}>
        <div className="tenant-console-panel__header">
          <div>
            <span className="workspace-card__eyebrow">Bulk onboarding</span>
            <h2>Organization master import</h2>
            <p className="section-copy">Preview locally, then submit ready rows as one atomic backend batch. Guided setup uses separate sequential steps.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{blockedCount}</strong> blocked</span>
            <span className="queue-summary-chip"><strong>{createdCount}</strong> created</span>
          </div>
        </div>
        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">CSV data</span>
            <textarea aria-label="CSV data" className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(templateCsv())}>Load sample template</button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard?.writeText(templateCsv())}>Copy template</button>
            <a data-navigation-mode="document" className="button button--secondary" download="organization-master-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>Download template</a>
            <label className="button button--secondary">
              Upload CSV
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void file.text().then(setCsvText);
                }}
              />
            </label>
            <button className="button button--primary" type="button" onClick={preview}>Preview import</button>
            <AsyncActionButton className="button button--primary" type="button" disabled={!rows.some((row) => row.status === "ready") || previewText!==csvText || confirmedText===csvText} pending={isCommitting} pendingLabel="Creating organization rows" onClick={commitReadyRows}>Commit ready rows</AsyncActionButton>
          </div>
        </div>
        {previewText && previewText!==csvText ? <p role="status">CSV changed. Preview again before committing.</p> : null}
        {summary ? <div ref={feedback} tabIndex={-1} className="notice" role="status"><strong>{summary}</strong><a data-navigation-mode="document" href="/hr-admin/organization">Reload catalog</a></div> : null}
        {!rows.length ? <p>Preview CSV to review rows and batch totals.</p> : null}
        <WorkspaceTableScrollRegion label="Organization import table 1" className="responsive-table-wrap workspace-table-region">
          <table className="data-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Section</th>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.rowNumber}-${row.data.code}`}>
                  <td>{row.rowNumber}</td>
                  <td>{row.data.section}</td>
                  <td>{row.data.code}</td>
                  <td>{row.data.name}</td>
                  <td><span className={`readiness-badge readiness-badge--${row.status === "ready" || row.status === "created" ? "ready" : "blocked"}`}>{row.status}</span></td>
                  <td>{row.message || "Valid for import"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </WorkspaceTableScrollRegion>
      </fieldset></article>
      </details>
    </section>
  );
}
