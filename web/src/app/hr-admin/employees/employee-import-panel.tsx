"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { recordImportBatchAudit, sha256Hex } from "@/lib/import-batch-audit";
import { submitImportRequest } from "@/lib/ui/import-request";

export type EmployeeImportRow = {
  index: number;
  source: Record<string, string>;
  status: "ready" | "blocked" | "created" | "failed" | "unconfirmed";
  message: string;
  createdId?: string;
};
type Feedback = { tone: "info" | "error" | "success"; title: string; text: string };
type Props<Row extends EmployeeImportRow> = {
  testId: string;
  title: string;
  description: string;
  impact: string;
  guidance: string;
  template: string;
  sample: () => string;
  importType: string;
  filename: string;
  columns: { key: string; label: string }[];
  prepare: (text: string) => { rows: Row[]; error: string };
  request: (row: Row) => { url: string; method: "POST" | "PATCH"; body: unknown };
};

/** One session's source, preview and receipts; no implicit mutation retry. */
export function EmployeeImportPanel<Row extends EmployeeImportRow>(props: Props<Row>) {
  const uid = useId();
  const [csv, setCsv] = useState(props.template);
  const [rows, setRows] = useState<Row[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [auditWarning, setAuditWarning] = useState("");
  const [earlierReceipts, setEarlierReceipts] = useState<{employeeCode: string; status: string}[]>([]);
  const [busy, setBusy] = useState<"" | "preview" | "commit" | "file" | "copy">("");
  const lock = useRef(false);
  const receipt = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLTextAreaElement>(null);
  const ledger = useRef(new Map<string, { status: "created" | "unconfirmed"; message: string; createdId?: string }>());
  const ready = rows.filter(row => row.status === "ready").length;
  const uncertain = rows.some(row => row.status === "unconfirmed");
  const done = rows.filter(row => row.status === "created").length;
  const blocked = rows.filter(row => row.status === "blocked").length;
  const failed = rows.filter(row => row.status === "failed").length;
  const fingerprint = (row: Row) => JSON.stringify(row.source);

  useEffect(() => { if (feedback) receipt.current?.focus(); }, [feedback]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    if (busy || csv !== props.template || rows.length) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, csv, props.template, rows.length]);

  function replaceSource(text: string, confirm = false) {
    if (lock.current) return;
    if (confirm && (csv !== props.template || rows.length) && !window.confirm("Replace this CSV and its visible preview? Saved rows remain saved. Check existing records before importing them again.")) return;
    setCsv(text); setRows([]); setAuditWarning("");
    setFeedback(confirm ? { tone: "info", title: "Preview required", text: "CSV changed. Preview again before committing. Previous saved or unconfirmed rows are remembered for this session." } : null);
    source.current?.focus();
  }

  async function audit(next: Row[], status: "previewed" | "committed" | "partial" | "failed", text: string) {
    try {
      const result = await recordImportBatchAudit({
        import_type: props.importType, status, file_name: props.filename,
        source_hash: await sha256Hex(text), row_count: next.length,
        ready_count: next.filter(row => row.status === "ready").length,
        created_count: next.filter(row => row.status === "created").length,
        blocked_count: next.filter(row => row.status === "blocked").length,
        failed_count: next.filter(row => row.status === "failed" || row.status === "unconfirmed").length,
        rollback_supported: false,
        evidence_snapshot: { headers: props.template.trim().split(","), ui: props.testId, created_ids: next.flatMap(row => row.createdId ? [row.createdId] : []), unconfirmed_rows: next.filter(row => row.status === "unconfirmed").map(row => row.index) },
        row_errors: next.filter(row => ["blocked", "failed", "unconfirmed"].includes(row.status)).map(row => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
      });
      if (!result) setAuditWarning("The batch history receipt could not be confirmed. Row results below remain valid; check import history before repeating any action.");
    } catch {
      setAuditWarning("The batch history receipt could not be confirmed. Check import history before repeating any action.");
    }
  }

  async function preview() {
    if (lock.current) return;
    lock.current = true; setBusy("preview"); setAuditWarning("");
    try {
      const parsed = props.prepare(csv);
      if (parsed.error) { setRows([]); setFeedback({ tone: "error", title: "CSV needs attention", text: parsed.error }); return; }
      const next = parsed.rows.map(row => {
        const previous = ledger.current.get(fingerprint(row));
        return previous ? { ...row, ...previous } : row;
      });
      setRows(next);
      const invalid = next.filter(row => row.status === "blocked").length;
      const unconfirmed = next.some(row => row.status === "unconfirmed");
      setFeedback({ tone: invalid || unconfirmed ? "error" : "info", title: unconfirmed ? "Preview contains an unconfirmed row" : "Preview ready", text: `${next.length} rows reviewed. ${invalid} blocked. Only ready rows can be committed; preview does not save employee changes.` });
      await audit(next, "previewed", csv);
    } finally { lock.current = false; setBusy(""); }
  }

  async function commit() {
    if (lock.current || !ready || uncertain) return;
    if (!window.confirm(`Commit ${ready} ready rows? ${props.impact} Rows save individually; this batch cannot be rolled back automatically.`)) return;
    lock.current = true; setBusy("commit"); setAuditWarning("");
    setFeedback({ tone: "info", title: "Committing rows", text: "Keep this page open until the batch stops. Each confirmed row is preserved." });
    const next = [...rows];
    try {
      for (let i = 0; i < next.length; i++) {
        const row = next[i];
        if (row.status !== "ready") continue;
        const input = props.request(row);
        const response = await submitImportRequest(input.url, { method: input.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.body) });
        const payload = response.payload;
        const confirmed = response.ok && payload && typeof payload.id === "string" && payload.id.trim();
        const unknown = response.status === 0 || response.status >= 500 || response.status === 408 || (response.ok && !confirmed);
        const detail = payload && typeof payload === "object" ? Object.values(payload).flat().filter(value => typeof value === "string").join(" ") : "";
        const updated: Row = { ...row, status: unknown ? "unconfirmed" : confirmed ? "created" : "failed", message: unknown ? "Outcome unconfirmed. Check the latest employee records and import history before trying again. No automatic retry was made." : confirmed ? "Saved successfully." : detail || "Row rejected. Correct the CSV and preview again.", createdId: confirmed ? payload.id : undefined };
        next[i] = updated;
        if (updated.status === "created" || updated.status === "unconfirmed") ledger.current.set(fingerprint(row), { status: updated.status, message: updated.message, createdId: updated.createdId });
        setEarlierReceipts(Array.from(ledger.current, ([key, value]) => ({ employeeCode: JSON.parse(key).employee_code || "Employee", status: value.status })));
        setRows([...next]);
        if (unknown) break;
      }
      const unconfirmed = next.some(row => row.status === "unconfirmed");
      const saved = next.filter(row => row.status === "created").length;
      const rejected = next.filter(row => row.status === "failed" || row.status === "blocked").length;
      setFeedback({ tone: unconfirmed || rejected ? "error" : "success", title: unconfirmed ? "Batch stopped — outcome unconfirmed" : rejected ? "Batch finished with rows needing attention" : "Import complete", text: `${saved} saved; ${rejected} blocked or rejected; ${next.filter(row => row.status === "ready").length} not attempted. ${unconfirmed ? "Check current records before another import. Remaining rows were not sent." : "Saved rows remain saved. Correct rejected rows and preview again; unchanged saved rows will not be submitted again in this session."}` });
      await audit(next, unconfirmed || rejected ? "partial" : "committed", csv);
    } finally { lock.current = false; setBusy(""); }
  }

  async function upload(file: File | undefined) {
    if (!file || lock.current) return;
    if ((csv !== props.template || rows.length) && !window.confirm("Replace the CSV and visible preview with this file? Existing saved rows remain saved.")) return;
    lock.current = true; setBusy("file");
    try {
      const text = await file.text();
      setCsv(text); setRows([]); setAuditWarning(""); setFeedback({ tone: "info", title: "File loaded", text: "Preview the uploaded CSV before committing." });
    } catch { setFeedback({ tone: "error", title: "File could not be read", text: "Your previous CSV is preserved. Choose the file again or paste CSV data." }); }
    finally { lock.current = false; setBusy(""); }
  }

  async function copyTemplate() {
    if (lock.current) return;
    lock.current = true; setBusy("copy");
    try { await navigator.clipboard.writeText(props.template); setFeedback({ tone: "info", title: "Template copied", text: "Fill in the CSV headers with your data, then paste or upload it here." }); }
    catch { setFeedback({ tone: "error", title: "Template could not be copied", text: "Download the template instead. Your CSV is unchanged." }); }
    finally { lock.current = false; setBusy(""); }
  }

  return <details className="employee-import-panel" data-testid={props.testId}>
    <summary><span><strong>{props.title}</strong><small>{props.description}</small></span><span aria-hidden="true">＋</span></summary>
    <div className="employee-import-panel__body" aria-busy={Boolean(busy)}>
      <p className="section-copy" id={`${uid}-impact`}>{props.impact} Each row saves independently. Automatic rollback is unavailable.</p>
      <section aria-labelledby={`${uid}-prepare`}>
        <h3 id={`${uid}-prepare`}>1. Prepare CSV</h3>
        <p className="section-copy" id={`${uid}-help`}>Keep all template columns, including empty optional values. Use one record per line; quoted commas are supported. Embedded line breaks are not supported. Samples contain example values: review every row before saving.</p>
        <p className="section-copy">{props.guidance}</p>
        <div className="employee-import-panel__tools">
          <button className="button button--secondary" type="button" disabled={Boolean(busy)} onClick={() => replaceSource(props.sample(), true)}>Load sample template</button>
          <button className="button button--secondary" type="button" disabled={Boolean(busy)} onClick={copyTemplate}>Copy template</button>
          <a className="button button--secondary" download={`${props.filename.replace('.csv','')}-template.csv`} href={busy ? undefined : `data:text/csv;charset=utf-8,${encodeURIComponent(props.template)}`} aria-disabled={Boolean(busy)} tabIndex={busy ? -1 : undefined}>Download template</a>
          <label className="form-field employee-import-panel__upload"><span>Upload CSV</span><input type="file" accept=".csv,text/csv" disabled={Boolean(busy)} onChange={event => { const file=event.target.files?.[0]; event.target.value=""; void upload(file); }} /></label>
        </div>
        <label className="form-field"><span>CSV data</span><textarea ref={source} className="input-control employee-import-panel__csv" aria-invalid={feedback?.title === "CSV needs attention" || undefined} aria-describedby={`${uid}-help ${uid}-impact${feedback?.title === "CSV needs attention" ? ` ${uid}-feedback` : ""}`} disabled={Boolean(busy)} value={csv} onChange={event => replaceSource(event.target.value)} spellCheck={false} /></label>
      </section>
      {feedback ? <div id={`${uid}-feedback`} ref={receipt} tabIndex={-1} role={feedback.tone === "error" ? "alert" : "status"} className={`notice${feedback.tone === "success" ? " notice--success" : ""}`}><strong>{feedback.title}</strong><span>{feedback.text}</span></div> : null}
      {auditWarning ? <div role="alert" className="notice"><strong>Import history needs checking</strong><span>{auditWarning}</span></div> : null}
      {!rows.length && earlierReceipts.length > 0 ? <section aria-label="Earlier row receipts"><h3>Earlier row receipts in this session</h3><p className="section-copy">These outcomes remain saved or unconfirmed after source changes. Check current records before importing edited rows.</p><ul>{earlierReceipts.map((value, index) => <li key={index}>{value.employeeCode}: {value.status === "created" ? "Saved" : "Outcome unconfirmed — check records"}</li>)}</ul></section> : null}
      <section aria-labelledby={`${uid}-review`}>
        <h3 id={`${uid}-review`}>2. Review rows</h3>
        {rows.length ? <>
          <p className="employee-import-panel__counts" aria-label="Row totals">{rows.length} total · {ready} ready · {blocked} blocked · {done} saved · {failed} rejected · {rows.filter(row => row.status === "unconfirmed").length} unconfirmed</p>
          <p className="section-copy">Review every row message. Wide tables scroll horizontally; focus the table region and use the arrow keys.</p>
          <WorkspaceTableScrollRegion label={`${props.title} preview`} className="table-scroll workspace-table-region"><table><caption className="sr-only">{props.title}: preview and row results</caption><thead><tr><th scope="col">Row</th>{props.columns.map(col => <th scope="col" key={col.key}>{col.label}</th>)}<th scope="col">Outcome</th><th scope="col">Message</th></tr></thead><tbody>{rows.map(row => <tr key={row.index}><td>{row.index}</td>{props.columns.map(col => <td key={col.key}>{row.source[col.key] || "Not supplied"}</td>)}<td><span className={`employee-import-outcome employee-import-outcome--${row.status}`}>{row.status === "created" ? "Saved" : row.status === "failed" ? "Rejected" : row.status}</span></td><td>{row.message || "Ready to save"}</td></tr>)}</tbody></table></WorkspaceTableScrollRegion>
        </> : <p className="section-copy">No current preview. Prepare your CSV, then preview to see ready and blocked rows.</p>}
      </section>
      <div className="employee-import-panel__footer">
        <p className="section-copy">{uncertain ? "Commit is paused. Check the unconfirmed row before preparing another batch." : `${ready} ready rows. Preview validates locally; Commit writes to employee records.`}</p>
        <div className="employee-import-panel__actions">
          <AsyncActionButton className={`button button--${ready ? "secondary" : "primary"}`} type="button" disabled={Boolean(busy)} pending={busy === "preview"} pendingLabel="Preparing preview" onClick={preview}>Preview import</AsyncActionButton>
          <AsyncActionButton className="button button--primary" type="button" disabled={Boolean(busy) || !ready || uncertain} pending={busy === "commit"} pendingLabel="Committing rows" onClick={commit}>Commit ready rows</AsyncActionButton>
        </div>
      </div>
    </div>
  </details>;
}
