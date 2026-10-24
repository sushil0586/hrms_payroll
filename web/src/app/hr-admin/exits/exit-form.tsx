"use client";

import {useEffect,useRef,useState} from "react";
import {LifecycleFormActions,useLifecycleFormState} from "@/app/hr-admin/lifecycle/lifecycle-form-state";

import { LifecycleItemEditor } from "@/app/hr-admin/lifecycle/lifecycle-item-editor";
import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminExitWriteInput,
  HrAdminLifecycleClearanceSnapshot,
  HrAdminLifecycleOptions,
  HrAdminLifecycleWorkItem,
  HrAdminWorkflowTemplate,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminExitWriteInput;
  lifecycleTemplates: HrAdminWorkflowTemplate[];
  mode: "create" | "edit";
  options: HrAdminLifecycleOptions;
  itemId?: string;
  cancelHref?: string;
  successHref?: string;
  compact?: boolean;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save exit record.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
    if(typeof value==="string"&&value.trim())return value;
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save exit record.");
}

function selectOptions(items: Array<{ id: string; name: string; employee_code?: string }>) {
  return [
    <option key="blank" value="">
      Select an option
    </option>,
    ...items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.employee_code ? `${item.employee_code} - ${item.name}` : item.name}
      </option>
    )),
  ];
}

function buildLifecycleTemplateTriggerOptions(templates: HrAdminWorkflowTemplate[], currentValue: string) {
  const lifecycleTemplates = templates.filter((item) => item.module === "lifecycle");
  const latestByTrigger = new Map<string, HrAdminWorkflowTemplate>();
  for (const template of lifecycleTemplates) {
    const existing = latestByTrigger.get(template.trigger_key);
    const shouldReplace =
      !existing ||
      (existing.status !== "active" && template.status === "active") ||
      template.version > existing.version;
    if (shouldReplace) {
      latestByTrigger.set(template.trigger_key, template);
    }
  }

  const items = Array.from(latestByTrigger.values()).sort((left, right) => left.name.localeCompare(right.name));
  const options = [
    <option key="blank" value="">
      No template
    </option>,
    ...items.map((item) => (
      <option key={`${item.trigger_key}-${item.id}`} value={item.trigger_key}>
        {item.name} ({item.trigger_key})
      </option>
    )),
  ];

  if (currentValue && !items.some((item) => item.trigger_key === currentValue)) {
    options.push(
      <option key="current-value" value={currentValue}>
        Current value ({currentValue})
      </option>,
    );
  }

  return options;
}

function parseClearanceSnapshot(rawValue: string): HrAdminLifecycleClearanceSnapshot {
  if (!rawValue.trim()) {
    return { items: [], workflow_template_code: "", notes: "" };
  }
  const parsed = JSON.parse(rawValue);
  if (Array.isArray(parsed)) {
    return { items: parsed as HrAdminLifecycleWorkItem[], workflow_template_code: "", notes: "" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { items: [], workflow_template_code: "", notes: "" };
  }
  const snapshot = parsed as Partial<HrAdminLifecycleClearanceSnapshot>;
  return {
    items: Array.isArray(snapshot.items) ? snapshot.items : [],
    workflow_template_code: typeof snapshot.workflow_template_code === "string" ? snapshot.workflow_template_code : "",
    notes: typeof snapshot.notes === "string" ? snapshot.notes : "",
  };
}

function getClearancePreview(formValue: HrAdminExitWriteInput) {
  try {
    const snapshot = parseClearanceSnapshot(formValue.clearance_status_snapshot);
    const items = snapshot.items;
    const totalCount = items.length;
    const completedCount = items.filter((item) => item.done).length;
    const openCount = Math.max(totalCount - completedCount, 0);
    const blockingOpenCount = items.filter((item) => item.blocking && !item.done).length;
    const overdueCount = items.filter((item) => item.is_overdue).length;
    return {
      snapshotIsValid: true,
      snapshotWarning: "",
      totalCount,
      completedCount,
      openCount,
      blockingOpenCount,
      overdueCount,
    };
  } catch {
    return {
      snapshotIsValid: false,
      snapshotWarning: "Clearance data is invalid. Fix it before saving this exit record.",
      totalCount: 0,
      completedCount: 0,
      openCount: 0,
      blockingOpenCount: 0,
      overdueCount: 0,
    };
  }
}

export function ExitForm({ initialValue, lifecycleTemplates, mode, options, itemId, cancelHref, successHref, compact = false }: Props) {

  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId=`lifecycle-exits-${itemId??"create"}`;
  const pending=useRef(false);const errorRef=useRef<HTMLDivElement>(null);const formRef=useRef<HTMLFormElement>(null);const focused=useRef(false);
  const navigation=useLifecycleFormState(formValue,initialValue,isSubmitting,cancelHref??"/hr-admin/exits");
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  useEffect(()=>{if(navigation.ready&&compact&&!focused.current){focused.current=true;formRef.current?.querySelector<HTMLElement>('select,input,textarea')?.focus();}},[navigation.ready,compact]);
  const clearancePreview = getClearancePreview(formValue);
  const clearanceSnapshot = clearancePreview.snapshotIsValid
    ? parseClearanceSnapshot(formValue.clearance_status_snapshot)
    : { items: [], workflow_template_code: "", notes: "" };

  function update<Key extends keyof HrAdminExitWriteInput>(key: Key, value: HrAdminExitWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateClearanceSnapshot(snapshot: HrAdminLifecycleClearanceSnapshot) {
    update("clearance_status_snapshot", JSON.stringify(snapshot, null, 2));
  }

  function updateClearanceItems(items: HrAdminLifecycleWorkItem[]) {
    updateClearanceSnapshot({ ...clearanceSnapshot, items });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(pending.current)return;pending.current=true;
    setIsSubmitting(true);
    setError("");

    let clearanceStatusSnapshot: HrAdminLifecycleClearanceSnapshot;
    try {
      clearanceStatusSnapshot = parseClearanceSnapshot(formValue.clearance_status_snapshot);
    } catch {
      setError("Clearance data must stay valid.");
      setIsSubmitting(false);pending.current=false;
      return;
    }

    try {
      const response=await fetch(mode==="create"?"/api/hr-admin/exits":`/api/hr-admin/exits/${itemId}`,{
        method:mode==="create"?"POST":"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...formValue,clearance_status_snapshot:clearanceStatusSnapshot}),
      });
      const payload=await response.json().catch(()=>null);
      if(!response.ok){setError(response.status>=500?"Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.":getErrorMessage(payload));return;}
      if(typeof payload?.id!=="string"||!payload.id||(itemId&&payload.id!==itemId)){setError("Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.");return;}
      const destination=new URL(successHref??"/hr-admin/exits",window.location.origin);
      if(destination.pathname==="/hr-admin/exits")destination.searchParams.set("recordLoaded",payload.id);
      else if(destination.pathname==="/hr-admin/lifecycle")destination.searchParams.set("record",`exit:${payload.id}`);
      navigation.complete(destination.href);
    } catch {setError("Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.");}
    finally {pending.current=false;setIsSubmitting(false);}
  }
  function handleCancel(){navigation.cancel();}

  return (
    <form id={formId} ref={formRef} data-hydrated={navigation.ready} aria-label="Exit record form" className={`section form-layout-modern lifecycle-phase3-form lifecycle-child-form${compact ? " lifecycle-child-form--modal" : ""}`} data-testid="exit-record-form" onSubmit={handleSubmit}>
      <fieldset className="lifecycle-fields" disabled={!navigation.ready||isSubmitting}><section className="form-shell-card"><div className="form-shell-card__grid">
        <FormSection fullWidth description="Choose the employee and set the exit status and timeline anchors." title="Core details">
          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Employee (required)</span>
              <select aria-label="Employee (required)" required className="input-control" value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>
                {selectOptions(options.employees)}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Status</span>
              <select aria-label="Status" className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value)}>
                {options.exit_statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Resignation date</span>
              <input className="input-control" type="date" value={formValue.resignation_date ?? ""} onChange={(e) => update("resignation_date", e.target.value || null)} />
            </label>
            <label className="form-field">
              <span className="muted">Exit reason</span>
              <input className="input-control" value={formValue.exit_reason} onChange={(e) => update("exit_reason", e.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Workflow reference</span>
              <input className="input-control" value={formValue.workflow_reference} onChange={(e) => update("workflow_reference", e.target.value)} />
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Exit reason detail</span>
              <textarea aria-label="Exit reason detail"
                className="input-control"
                rows={3}
                value={formValue.exit_reason_detail}
                onChange={(e) => update("exit_reason_detail", e.target.value)}
              />
            </label>
          </div>
        </FormSection>

        <FormSection fullWidth description="Keep notice dates and final working date decisions aligned in one place." title="Notice and separation dates">
          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Notice start</span>
              <input className="input-control" type="date" value={formValue.notice_start_date ?? ""} onChange={(e) => update("notice_start_date", e.target.value || null)} />
            </label>
            <label className="form-field">
              <span className="muted">Notice end</span>
              <input className="input-control" type="date" value={formValue.notice_end_date ?? ""} onChange={(e) => update("notice_end_date", e.target.value || null)} />
            </label>
            <label className="form-field">
              <span className="muted">Proposed last working date</span>
              <input
                className="input-control"
                type="date"
                value={formValue.proposed_last_working_date ?? ""}
                onChange={(e) => update("proposed_last_working_date", e.target.value || null)}
              />
            </label>
            <label className="form-field">
              <span className="muted">Approved last working date</span>
              <input
                className="input-control"
                type="date"
                value={formValue.approved_last_working_date ?? ""}
                onChange={(e) => update("approved_last_working_date", e.target.value || null)}
              />
            </label>
            <label className="form-field">
              <span className="muted">Actual exit date</span>
              <input className="input-control" type="date" value={formValue.actual_exit_date ?? ""} onChange={(e) => update("actual_exit_date", e.target.value || null)} />
            </label>
          </div>
        </FormSection>

        <FormSection fullWidth description="Store handover and clearance data without leaving the record context." title="Clearance and handover">
          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Lifecycle template trigger</span>
              <select aria-label="Lifecycle template trigger"
                className="input-control"
                value={clearanceSnapshot.workflow_template_code}
                onChange={(e) => updateClearanceSnapshot({ ...clearanceSnapshot, workflow_template_code: e.target.value })}
              >
                {buildLifecycleTemplateTriggerOptions(lifecycleTemplates, clearanceSnapshot.workflow_template_code)}
              </select>
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Clearance plan notes</span>
              <textarea aria-label="Clearance plan notes"
                className="input-control"
                rows={3}
                value={clearanceSnapshot.notes}
                onChange={(e) => updateClearanceSnapshot({ ...clearanceSnapshot, notes: e.target.value })}
              />
            </label>
          </div>

          <div className="notice notice--spaced">
            <strong>Template seeding behavior.</strong>
            <span className="muted">
              On a new exit with no clearance items yet, the selected lifecycle template can seed the first clearance plan automatically. Once items exist, they remain the live source of truth.
            </span>
          </div>

          <div className="stack-block-spaced">
            <LifecycleItemEditor
              addLabel="Add clearance item"
              codePrefix="exit-clearance"
              description="Track clearance work with owners, due dates, escalation timing, and template-derived context."
              emptyState="Add items manually, or leave this empty on create so the selected template can seed the initial clearance plan."
              items={clearanceSnapshot.items}
              onChange={updateClearanceItems}
              ownerOptions={options.lifecycle_owners}
              title="Clearance items"
            />
          </div>

          <div className="form-grid form-grid--spaced">
            <label className="form-field form-field--full">
              <span className="muted">Handover notes</span>
              <textarea aria-label="Handover notes" className="input-control" rows={4} value={formValue.handover_notes} onChange={(e) => update("handover_notes", e.target.value)} />
            </label>
          </div>
        </FormSection>

        <FormSection fullWidth description="Mark important flags that downstream teams often need for reporting and rehiring decisions." title="Flags">
          <div className="detail-grid">
            <label className="detail-row">
              <span className="detail-label">Regrettable</span>
              <input checked={formValue.is_regrettable} onChange={(e) => update("is_regrettable", e.target.checked)} type="checkbox" />
            </label>
            <label className="detail-row">
              <span className="detail-label">Rehire eligible</span>
              <input checked={formValue.rehire_eligible} onChange={(e) => update("rehire_eligible", e.target.checked)} type="checkbox" />
            </label>
          </div>
        </FormSection>

        </div><div className="notice">
          <strong>Clearance preview.</strong>
          <span className="muted">
            {clearancePreview.snapshotIsValid
              ? clearancePreview.totalCount === 0
                ? "No clearance items added yet."
                : `${clearancePreview.completedCount}/${clearancePreview.totalCount} complete, ${clearancePreview.openCount} open, ${clearancePreview.overdueCount} overdue.`
              : clearancePreview.snapshotWarning}
          </span>
        </div>
        {formValue.status === "completed" && clearancePreview.snapshotIsValid && clearancePreview.blockingOpenCount > 0 ? (
          <div className="notice">
            <strong>Completion is still blocked.</strong>
            <span className="muted">{clearancePreview.blockingOpenCount} blocking clearance items are still open.</span>
          </div>
        ) : null}

        {error ? (
          <div className="notice notice--error" role="alert" tabIndex={-1} ref={errorRef}>
            <strong>Review save outcome.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <LifecycleFormActions><div className="form-actions-bar">
          <span className="muted">Approval can place an active employee on notice. Completion marks them exited after clearance and access checks.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={!navigation.ready||isSubmitting} form={formId} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create exit" : "Save changes"}
            </button>
            <button className="button button--secondary" disabled={!navigation.ready||isSubmitting} onClick={handleCancel} type="button">
              Cancel
            </button>
          </div>
        </div></LifecycleFormActions>
      </section></fieldset>
    </form>
  );
}
