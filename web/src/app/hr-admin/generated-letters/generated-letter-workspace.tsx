"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { WorkspaceDataTable } from "@/components/patterns/workspace-standard";
import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { useDocumentUploadDraft } from "@/lib/ui/use-document-upload-draft";
import type { HrAdminEmployeeListItem, HrAdminEnumOption, HrAdminGeneratedLetter, HrAdminGeneratedLetterDraft, HrAdminGeneratedLetterPreview } from "@/lib/types";

type Props = { employees: HrAdminEmployeeListItem[]; letterTypes: HrAdminEnumOption[]; initialLetters: HrAdminGeneratedLetter[] };
const template = "Dear {{ first_name }},\n\nThis confirms {{ employee_name }} as {{ designation }} at {{ legal_entity }} effective {{ issue_date }}.\n\nRegards,\nPeople Operations";
function errorMessage(payload: unknown) {
  if (payload && typeof payload === "object") for (const value of Object.values(payload)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return "The action could not be completed.";
}
export function GeneratedLetterWorkspace({employees,letterTypes,initialLetters}: Props) {
  const [draft,setDraft] = useState<HrAdminGeneratedLetterDraft>({employee_id:"",letter_type:letterTypes[0]?.value??"other",title:"",template_code:"",issue_date:"",workflow_reference:"",template_body:template,payload_values:{}});
  const [payloadJson,setPayloadJson] = useState("{}");
  const [preview,setPreview] = useState<HrAdminGeneratedLetterPreview|null>(null);
  const [previewKey,setPreviewKey] = useState("");
  const [generated,setGenerated] = useState<HrAdminGeneratedLetter|null>(null);
  const [letters,setLetters] = useState(initialLetters);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState<"preview"|"generate"|null>(null);
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(1);
  const ready = useSyncExternalStore(()=>()=>{},()=>true,()=>false);
  const [initial] = useState(() => JSON.stringify({draft,payloadJson}));
  const currentKey = JSON.stringify({draft,payloadJson});
  const [savedKey,setSavedKey] = useState("");
  const dirty = currentKey !== savedKey && currentKey !== initial;
  useDocumentUploadDraft(dirty,Boolean(busy));
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const fresh = Boolean(preview && previewKey === currentKey);
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  useEffect(()=>{if(generated)receiptRef.current?.focus();},[generated]);
  useEffect(()=>{if(preview)previewRef.current?.focus();},[preview]);
  function update<K extends keyof HrAdminGeneratedLetterDraft>(key:K,value:HrAdminGeneratedLetterDraft[K]) {setDraft(valueBefore=>({...valueBefore,[key]:value}));}
  async function perform(kind:"preview"|"generate") {
    if(inFlight.current || (kind==="generate" && !fresh))return;
    setError("");
    let values:unknown;
    try {values=JSON.parse(payloadJson || "{}");if(!values||typeof values!=="object"||Array.isArray(values))throw Error();}
    catch {setError("Payload values must be a valid JSON object.");return;}
    if(!draft.employee_id || !draft.title.trim() || !draft.template_body.trim()) {setError("Select an employee and enter a title and template body.");return;}
    inFlight.current=true;setBusy(kind);
    try {
      const response=await fetch(`/api/hr-admin/generated-letters${kind==="preview"?"/preview":""}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...draft,issue_date:draft.issue_date||null,payload_values:values})});
      const value=await response.json().catch(()=>null);
      if(!response.ok) {setError(response.status>=500 && kind==="generate" ? "Generation outcome could not be confirmed. Check generated letters before retrying; your draft is retained." : errorMessage(value));return;}
      if(kind==="preview") {
        if(typeof value?.rendered_text!=="string" || !Array.isArray(value.used_variables) || !Array.isArray(value.missing_variables))throw Error();
        setPreview(value);setPreviewKey(currentKey);
      } else {
        if(!value?.id || !value.artifact_id || !value.file_name || typeof value.rendered_text!=="string")throw Error();
        setGenerated(value);setSavedKey(currentKey);setLetters(before=>[value,...before.filter(item=>item.id!==value.id)]);
      }
    } catch {setError(kind==="generate"?"Generation outcome could not be confirmed. Check generated letters before retrying; your draft is retained.":"Preview could not be loaded. Your draft is retained; try preview again.");}
    finally {inFlight.current=false;setBusy(null);}
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void perform("generate");}
  const matched=letters.filter(item=>`${item.title} ${item.employee_name} ${item.employee_code} ${item.letter_type}`.toLowerCase().includes(search.toLowerCase()));
  const currentPage=Math.min(page,Math.max(1,Math.ceil(matched.length/10)));
  const visible=matched.slice((currentPage-1)*10,currentPage*10);
  return <section className="document-letter-workspace letter-makeover" data-hydrated={ready}>
    <div className="attendance-summary-strip"><span><strong>{letters.length}</strong> loaded letters</span><span><strong>{letters.filter(item=>item.artifact_id).length}</strong> stored files</span><span><strong>{letterTypes.length}</strong> letter types</span></div>
    <div className="letter-composition">
      <form className="workspace-standard-panel document-letter-form" noValidate onSubmit={submit}>
        <fieldset className="letter-fields" disabled={!ready||Boolean(busy)}>
          <legend>Letter draft</legend>
          <div className="form-grid">
            <div className="form-field"><label htmlFor="letter-employee">Employee (required)</label><select id="letter-employee" className="input-control" required value={draft.employee_id} onChange={e=>update("employee_id",e.target.value)}><option value="">Select employee</option>{employees.map(item=><option key={item.id} value={item.id}>{item.full_name} ({item.employee_code})</option>)}</select></div>
            <div className="form-field"><label htmlFor="letter-type">Letter type</label><select id="letter-type" className="input-control" value={draft.letter_type} onChange={e=>update("letter_type",e.target.value)}>{letterTypes.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            {([['title','Title (required)',255],['template_code','Template code',80],['issue_date','Issue date',undefined],['workflow_reference','Workflow reference',120]] as const).map(([key,label,max])=><div className="form-field" key={key}><label htmlFor={`letter-${key}`}>{label}</label><input id={`letter-${key}`} className="input-control" type={key==="issue_date"?"date":"text"} maxLength={max} required={key==="title"} value={draft[key]} onChange={e=>update(key,e.target.value)} />{key==="issue_date"?<span className="field-help-text">Blank uses the server date. Preview resolves the effective date.</span>:null}</div>)}
            <div className="form-field form-field--full"><label htmlFor="letter-body">Template body (required)</label><textarea id="letter-body" className="input-control" rows={7} required value={draft.template_body} onChange={e=>update("template_body",e.target.value)} /></div>
            <div className="form-field form-field--full"><label htmlFor="letter-values">Payload values JSON</label><textarea id="letter-values" className="input-control" rows={3} value={payloadJson} onChange={e=>setPayloadJson(e.target.value)} /><span className="field-help-text">An object of variable overrides; missing variables are reported by preview.</span></div>
          </div>
        </fieldset>
        {error?<div ref={errorRef} tabIndex={-1} className="notice notice--error" role="alert">{error}</div>:null}
        <div className="letter-actions"><button className="button button--secondary" disabled={!ready||Boolean(busy)} type="button" onClick={()=>void perform("preview")}>{busy==="preview"?"Previewing…":"Preview letter"}</button><button className="button button--primary" disabled={!ready||Boolean(busy)||!fresh} type="submit">{busy==="generate"?"Generating…":"Generate letter"}</button><span className="field-help-text">{fresh?"Current draft previewed. Generation resolves server variables again.":"Preview the current draft before generating."}</span></div>
      </form>
      <aside ref={previewRef} tabIndex={-1} className="workspace-standard-panel document-letter-preview" aria-label="Letter preview"><h2>Preview</h2>{preview?<><p role="status">{fresh?"Preview matches this draft.":"Draft changed. Preview again before generating."}</p><p>{preview.used_variables.length} variables · {preview.missing_variables.length} missing</p><pre>{preview.rendered_text}</pre></>:<p>No preview yet. Select an employee and complete the draft.</p>}</aside>
    </div>
    {generated?<div ref={receiptRef} tabIndex={-1} className="notice notice--success letter-receipt" role="status"><strong>Letter stored.</strong><span>{generated.title} · {generated.file_name}</span>{preview && generated.rendered_text!==preview.rendered_text?<span>Server context changed since preview. Inspect the stored file before sharing.</span>:null}<AsyncDownloadButton href={`/api/hr-admin/generated-letters/${generated.id}/download`} fileName={generated.file_name}>Download generated letter</AsyncDownloadButton></div>:null}
    <section className="workspace-standard-panel letter-register"><h2>Generated letters</h2><p>{matched.length} matching of {letters.length} loaded letters. Collection limit: 10,000; reads are not a transactional snapshot.</p><label className="form-field">Search generated letters<input className="input-control" disabled={!ready||Boolean(busy)} value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} /></label>
      <WorkspaceDataTable ariaLabel="Generated HR letters" scrollLabel="Generated letter records" className="generated-letter-table"><thead><tr><th>Letter</th><th>Employee</th><th>Type / status</th><th>Issue date</th><th>File</th><th>Action</th></tr></thead><tbody>{visible.map(item=><tr key={item.id}><td>{item.title}<br/>{item.workflow_reference||"No workflow reference"}</td><td>{item.employee_name}<br/>{item.employee_code}</td><td>{item.letter_type} · {item.status}</td><td>{item.issue_date||"Not set"}</td><td>{item.file_name||"No stored file"}</td><td>{item.artifact_id?<AsyncDownloadButton href={`/api/hr-admin/generated-letters/${item.id}/download`} fileName={item.file_name}>Download</AsyncDownloadButton>:"Unavailable"}</td></tr>)}</tbody></WorkspaceDataTable>
      {!matched.length?<p>No generated letters match this view.</p>:null}<div className="pagination-bar"><button type="button" className="button button--secondary" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button><span>Page {currentPage} of {Math.max(1,Math.ceil(matched.length/10))}</span><button type="button" className="button button--secondary" disabled={currentPage*10>=matched.length} onClick={()=>setPage(currentPage+1)}>Next</button></div>
    </section>
  </section>;
}
