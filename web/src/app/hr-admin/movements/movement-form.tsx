"use client";
import {useEffect,useRef,useState} from "react";
import {LifecycleFormActions,useLifecycleFormState} from "@/app/hr-admin/lifecycle/lifecycle-form-state";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminLifecycleOptions, HrAdminMovementWriteInput } from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireText, requireValue } from "@/lib/ui/validation";

type Props = {
  initialValue: HrAdminMovementWriteInput;
  mode: "create" | "edit";
  options: HrAdminLifecycleOptions;
  itemId?: string;
  cancelHref?: string;
  successHref?: string;
  compact?: boolean;
};
type MovementField = "employee_id" | "effective_date" | "reason" | "owner_value" | "current_snapshot";

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save movement.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
    if (typeof value === "string" && value.trim()) return value;
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save movement.");
}

function selectOptions(items: Array<{ id: string; name: string; employee_code?: string }>) {
  return [<option key="blank" value="">Select an option</option>, ...items.map((item) => <option key={item.id} value={item.id}>{item.employee_code ? `${item.employee_code} - ${item.name}` : item.name}</option>)];
}

function ownerOptions(items: Array<{ value: string; label: string }>) {
  return [<option key="blank" value="">Select an owner</option>, ...items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)];
}

export function MovementForm({ initialValue, mode, options, itemId, cancelHref, successHref, compact = false }: Props) {

  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<MovementField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId=`lifecycle-movements-${itemId??"create"}`;
  const pending=useRef(false);const errorRef=useRef<HTMLDivElement>(null);const formRef=useRef<HTMLFormElement>(null);const focused=useRef(false);
  const navigation=useLifecycleFormState(formValue,initialValue,isSubmitting,cancelHref??"/hr-admin/movements");
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  useEffect(()=>{if(navigation.ready&&compact&&!focused.current){focused.current=true;formRef.current?.querySelector<HTMLElement>('select,input,textarea')?.focus();}},[navigation.ready,compact]);


  function update<Key extends keyof HrAdminMovementWriteInput>(key: Key, value: HrAdminMovementWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key as MovementField]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(pending.current)return;pending.current=true;
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});
    const nextErrors: FieldErrors<MovementField> = {
      employee_id: requireValue(formValue.employee_id, "Select the employee for this movement."),
      effective_date: requireValue(formValue.effective_date, "Select the movement effective date."),
      reason: requireText(formValue.reason, "Enter the reason for this movement."),
      owner_value: requireText(formValue.owner_value, "Select the owner who will manage this movement."),
    };
    let currentSnapshot: Record<string, unknown> = {};
    try {
      currentSnapshot = formValue.current_snapshot.trim() ? JSON.parse(formValue.current_snapshot) : {};
      if(!currentSnapshot||Array.isArray(currentSnapshot)||typeof currentSnapshot!=="object")throw new Error("object required");
    } catch {
      nextErrors.current_snapshot = "Current snapshot must be a JSON object.";
    }
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted movement fields and try again.");
      setIsSubmitting(false);pending.current=false;
      return;
    }
    try {
      const response=await fetch(mode==="create"?"/api/hr-admin/movements":`/api/hr-admin/movements/${itemId}`,{
        method:mode==="create"?"POST":"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...formValue,current_snapshot:currentSnapshot}),
      });
      const payload=await response.json().catch(()=>null);
      if(!response.ok){setError(response.status>=500?"Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.":getErrorMessage(payload));return;}
      if(typeof payload?.id!=="string"||!payload.id||(itemId&&payload.id!==itemId)){setError("Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.");return;}
      const destination=new URL(successHref??"/hr-admin/movements",window.location.origin);
      if(destination.pathname==="/hr-admin/movements")destination.searchParams.set("recordLoaded",payload.id);
      else if(destination.pathname==="/hr-admin/lifecycle")destination.searchParams.set("record",`movement:${payload.id}`);
      navigation.complete(destination.href);
    } catch {setError("Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.");}
    finally {pending.current=false;setIsSubmitting(false);}
  }
  function handleCancel(){navigation.cancel();}

  return (
    <form id={formId} ref={formRef} data-hydrated={navigation.ready} aria-label="Movement event form" className={`section form-layout-modern lifecycle-phase3-form lifecycle-child-form${compact ? " lifecycle-child-form--modal" : ""}`} data-testid="movement-event-form" noValidate onSubmit={handleSubmit}>
      <fieldset className="lifecycle-fields" disabled={!navigation.ready||isSubmitting}><section className="form-shell-card">
        <div className="form-shell-card__grid">
          <FormSection
            description="Set the employee, type, timing, and workflow context for this structural change."
            fullWidth
            title="Movement context"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">Employee (required)</span><select aria-label="Employee (required)" aria-invalid={Boolean(fieldErrors.employee_id)} className="input-control" required value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>{selectOptions(options.employees)}</select>{fieldErrors.employee_id ? <span className="field-error-text">{fieldErrors.employee_id}</span> : null}</label>
              <label className="form-field"><span className="muted">Movement type</span><select aria-label="Movement type" className="input-control" value={formValue.movement_type} onChange={(e) => update("movement_type", e.target.value)}>{options.movement_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label className="form-field"><span className="muted">Status</span><select aria-label="Status" className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value)}>{options.lifecycle_event_statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label className="form-field"><span className="muted">Effective date (required)</span><input aria-invalid={Boolean(fieldErrors.effective_date)} className="input-control" required type="date" value={formValue.effective_date ?? ""} onChange={(e) => update("effective_date", e.target.value || null)} />{fieldErrors.effective_date ? <span className="field-error-text">{fieldErrors.effective_date}</span> : null}</label>
              <label className="form-field"><span className="muted">Reason (required)</span><input aria-invalid={Boolean(fieldErrors.reason)} className="input-control" value={formValue.reason} onChange={(e) => update("reason", e.target.value)} />{fieldErrors.reason ? <span className="field-error-text">{fieldErrors.reason}</span> : null}</label>
              <label className="form-field"><span className="muted">Workflow reference</span><input className="input-control" value={formValue.workflow_reference} onChange={(e) => update("workflow_reference", e.target.value)} /></label>
            </div>
          </FormSection>

          <FormSection title="Source and destination structure" description="Compare each supported relationship. Blank destinations retain the current assignment when completion is applied." fullWidth>
            <div className="movement-structure">
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From legal entity</span><select aria-label="From legal entity" className="input-control" value={formValue.from_legal_entity_id??""} onChange={e=>update("from_legal_entity_id",e.target.value||null)}>{selectOptions(options.legal_entities)}</select></label><label className="form-field"><span className="muted">To legal entity</span><select aria-label="To legal entity" className="input-control" value={formValue.to_legal_entity_id??""} onChange={e=>update("to_legal_entity_id",e.target.value||null)}>{selectOptions(options.legal_entities)}</select></label></div>
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From branch</span><select aria-label="From branch" className="input-control" value={formValue.from_branch_id??""} onChange={e=>update("from_branch_id",e.target.value||null)}>{selectOptions(options.branches)}</select></label><label className="form-field"><span className="muted">To branch</span><select aria-label="To branch" className="input-control" value={formValue.to_branch_id??""} onChange={e=>update("to_branch_id",e.target.value||null)}>{selectOptions(options.branches)}</select></label></div>
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From location</span><select aria-label="From location" className="input-control" value={formValue.from_location_id??""} onChange={e=>update("from_location_id",e.target.value||null)}>{selectOptions(options.locations)}</select></label><label className="form-field"><span className="muted">To location</span><select aria-label="To location" className="input-control" value={formValue.to_location_id??""} onChange={e=>update("to_location_id",e.target.value||null)}>{selectOptions(options.locations)}</select></label></div>
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From business unit</span><select aria-label="From business unit" className="input-control" value={formValue.from_business_unit_id??""} onChange={e=>update("from_business_unit_id",e.target.value||null)}>{selectOptions(options.business_units)}</select></label><label className="form-field"><span className="muted">To business unit</span><select aria-label="To business unit" className="input-control" value={formValue.to_business_unit_id??""} onChange={e=>update("to_business_unit_id",e.target.value||null)}>{selectOptions(options.business_units)}</select></label></div>
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From department</span><select aria-label="From department" className="input-control" value={formValue.from_department_id??""} onChange={e=>update("from_department_id",e.target.value||null)}>{selectOptions(options.departments)}</select></label><label className="form-field"><span className="muted">To department</span><select aria-label="To department" className="input-control" value={formValue.to_department_id??""} onChange={e=>update("to_department_id",e.target.value||null)}>{selectOptions(options.departments)}</select></label></div>
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From designation</span><select aria-label="From designation" className="input-control" value={formValue.from_designation_id??""} onChange={e=>update("from_designation_id",e.target.value||null)}>{selectOptions(options.designations)}</select></label><label className="form-field"><span className="muted">To designation</span><select aria-label="To designation" className="input-control" value={formValue.to_designation_id??""} onChange={e=>update("to_designation_id",e.target.value||null)}>{selectOptions(options.designations)}</select></label></div>
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From grade</span><select aria-label="From grade" className="input-control" value={formValue.from_grade_id??""} onChange={e=>update("from_grade_id",e.target.value||null)}>{selectOptions(options.grades)}</select></label><label className="form-field"><span className="muted">To grade</span><select aria-label="To grade" className="input-control" value={formValue.to_grade_id??""} onChange={e=>update("to_grade_id",e.target.value||null)}>{selectOptions(options.grades)}</select></label></div>
<div className="movement-structure__pair"><label className="form-field"><span className="muted">From employment type</span><select aria-label="From employment type" className="input-control" value={formValue.from_employment_type_id??""} onChange={e=>update("from_employment_type_id",e.target.value||null)}>{selectOptions(options.employment_types)}</select></label><label className="form-field"><span className="muted">To employment type</span><select aria-label="To employment type" className="input-control" value={formValue.to_employment_type_id??""} onChange={e=>update("to_employment_type_id",e.target.value||null)}>{selectOptions(options.employment_types)}</select></label></div>
</div></FormSection>
          <FormSection
            description="The destination manager is also the movement owner. Identifier owners are resolved by the existing service."
            fullWidth
            title="Manager and owner routing"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">From manager</span><select aria-label="From manager" className="input-control" value={formValue.from_manager_id ?? ""} onChange={(e) => update("from_manager_id", e.target.value || null)}>{selectOptions(options.managers)}</select></label>
              <label className="form-field"><span className="muted">Destination manager / owner (required)</span><select aria-label="Destination manager / owner (required)" aria-invalid={Boolean(fieldErrors.owner_value)} className="input-control" value={formValue.owner_value} onChange={(e) => update("owner_value", e.target.value)}>{ownerOptions(options.lifecycle_owners)}</select>{fieldErrors.owner_value ? <span className="field-error-text">{fieldErrors.owner_value}</span> : null}</label>
            </div>
          </FormSection>

          <FormSection
            description="Preserve the existing source evidence. Editing this JSON does not classify employment history or replace the authoritative assignment timeline."
            fullWidth
            title="Current snapshot"
          >
            <label className="form-field">
              <span className="muted">Current snapshot JSON</span>
              <textarea aria-label="Current snapshot JSON" aria-invalid={Boolean(fieldErrors.current_snapshot)} className="input-control" rows={6} value={formValue.current_snapshot} onChange={(e) => update("current_snapshot", e.target.value)} />
              {fieldErrors.current_snapshot ? <span className="field-error-text">{fieldErrors.current_snapshot}</span> : null}
            </label>
          </FormSection>
        </div>

        {error ? <div className="notice notice--error" role="alert" tabIndex={-1} ref={errorRef}><strong>Review save outcome.</strong><span className="muted">{error}</span></div> : null}
        <LifecycleFormActions><div className="form-actions-bar">
          <span className="muted">Completed creates effective employment history; current or past dates can update employee assignments. Future dates create a planned assignment. Approved alone does not apply the change.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={!navigation.ready||isSubmitting} form={formId} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create movement" : "Save changes"}</button>
            <button className="button button--secondary" disabled={!navigation.ready||isSubmitting} onClick={handleCancel} type="button">Cancel</button>
          </div>
        </div></LifecycleFormActions>
      </section></fieldset>
    </form>
  );
}
