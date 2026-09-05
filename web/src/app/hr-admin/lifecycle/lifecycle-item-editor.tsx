"use client";

import type { HrAdminLifecycleOwnerOption, HrAdminLifecycleWorkItem } from "@/lib/types";

type Props = {
  title: string;
  description: string;
  addLabel: string;
  emptyState: string;
  codePrefix: string;
  items: HrAdminLifecycleWorkItem[];
  ownerOptions: HrAdminLifecycleOwnerOption[];
  onChange: (items: HrAdminLifecycleWorkItem[]) => void;
};

function ownerSelectOptions(items: HrAdminLifecycleOwnerOption[]) {
  return [
    <option key="blank" value="">
      Select an owner
    </option>,
    ...items.map((item) => (
      <option key={item.value} value={item.value}>
        {item.label}
      </option>
    )),
  ];
}

function createEmptyLifecycleItem(codePrefix: string, existingItems: HrAdminLifecycleWorkItem[]): HrAdminLifecycleWorkItem {
  const nextIndex = existingItems.length + 1;
  let code = `${codePrefix}-${nextIndex}`;
  const seenCodes = new Set(existingItems.map((item) => item.code));
  let attempt = nextIndex;
  while (seenCodes.has(code)) {
    attempt += 1;
    code = `${codePrefix}-${attempt}`;
  }

  return {
    code,
    label: "",
    done: false,
    required: true,
    blocking: true,
    owner: "",
    owner_label: "",
    owner_source_type: "",
    escalation_owner: "",
    auto_reassign_on_escalation: false,
    due_on: "",
    escalate_after_days: null,
    escalates_on: "",
    is_overdue: false,
    is_escalation_due: false,
    is_escalated: false,
    escalated_at: "",
    notes: "",
    due_date_source: "",
    source_due_offset_unit: "",
    source_non_working_weekdays: [],
    source_template_code: "",
    source_template_name: "",
    source_template_version: null,
    source_step_id: "",
    source_step_order: null,
    source_step_name: "",
    source_due_anchor: "",
    source_due_offset_days: null,
    history: [],
    last_action_at: "",
    last_action_by: "",
  };
}

export function LifecycleItemEditor({
  title,
  description,
  addLabel,
  emptyState,
  codePrefix,
  items,
  ownerOptions,
  onChange,
}: Props) {
  function updateItem(index: number, patch: Partial<HrAdminLifecycleWorkItem>) {
    onChange(
      items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return { ...item, ...patch };
      }),
    );
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addItem() {
    onChange([...items, createEmptyLifecycleItem(codePrefix, items)]);
  }

  return (
    <section className="record-card">
      <div className="record-card__header">
        <div className="record-card__title-block">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="record-card__actions">
          <span className="record-chip">{items.length} items</span>
          <button className="button button--secondary" onClick={addItem} type="button">
            {addLabel}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="notice">
          <strong>No lifecycle items yet.</strong>
          <span className="muted">{emptyState}</span>
        </div>
      ) : null}

      <div className="stack">
        {items.map((item, index) => {
          const hasTemplateMetadata = Boolean(item.source_template_code || item.source_template_name || item.source_step_name);
          const hasAttentionFlag = item.is_overdue || item.is_escalation_due || item.is_escalated;

          return (
            <article className="record-card" key={`${item.code}-${index}`}>
              <div className="record-card__header">
                <div className="record-card__title-block">
                  <h3>{item.label || `Item ${index + 1}`}</h3>
                  <p>{item.code}</p>
                </div>
                <div className="record-card__actions">
                  {item.done ? <span className="record-chip">Done</span> : null}
                  {item.blocking ? <span className="record-chip">Blocking</span> : <span className="record-chip">Non-blocking</span>}
                  <button className="button button--secondary" onClick={() => removeItem(index)} type="button">
                    Remove
                  </button>
                </div>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span className="muted">Code</span>
                  <input className="input-control" value={item.code} onChange={(e) => updateItem(index, { code: e.target.value })} />
                </label>
                <label className="form-field">
                  <span className="muted">Label</span>
                  <input className="input-control" value={item.label} onChange={(e) => updateItem(index, { label: e.target.value })} />
                </label>
                <label className="form-field">
                  <span className="muted">Owner</span>
                  <select className="input-control" value={item.owner} onChange={(e) => updateItem(index, { owner: e.target.value })}>
                    {ownerSelectOptions(ownerOptions)}
                  </select>
                </label>
                <label className="form-field">
                  <span className="muted">Escalation owner</span>
                  <select className="input-control" value={item.escalation_owner} onChange={(e) => updateItem(index, { escalation_owner: e.target.value })}>
                    {ownerSelectOptions(ownerOptions)}
                  </select>
                </label>
                <label className="form-field">
                  <span className="muted">Due on</span>
                  <input className="input-control" type="date" value={item.due_on || ""} onChange={(e) => updateItem(index, { due_on: e.target.value })} />
                </label>
                <label className="form-field">
                  <span className="muted">Escalate after days</span>
                  <input
                    className="input-control"
                    min={0}
                    type="number"
                    value={item.escalate_after_days ?? ""}
                    onChange={(e) =>
                      updateItem(index, {
                        escalate_after_days: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="form-field form-field--full">
                  <span className="muted">Notes</span>
                  <textarea className="input-control" rows={3} value={item.notes} onChange={(e) => updateItem(index, { notes: e.target.value })} />
                </label>
              </div>

              <div className="detail-grid">
                {[
                  ["required", "Required"],
                  ["blocking", "Blocking"],
                  ["done", "Done"],
                  ["auto_reassign_on_escalation", "Auto reassign on escalation"],
                ].map(([key, label]) => (
                  <label className="detail-row" key={key}>
                    <span className="detail-label">{label}</span>
                    <input
                      checked={Boolean(item[key as keyof HrAdminLifecycleWorkItem])}
                      onChange={(e) => updateItem(index, { [key]: e.target.checked } as Partial<HrAdminLifecycleWorkItem>)}
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>

              {hasAttentionFlag ? (
                <div className="notice notice--spaced">
                  <strong>Attention state.</strong>
                  <span className="muted">
                    {[
                      item.is_overdue ? "Overdue" : "",
                      item.is_escalation_due ? "Escalation due" : "",
                      item.is_escalated ? "Already escalated" : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    {item.escalates_on ? ` • Escalates on ${item.escalates_on}` : ""}
                  </span>
                </div>
              ) : null}

              {hasTemplateMetadata ? (
                <div className="notice notice--spaced">
                  <strong>Template-derived metadata.</strong>
                  <span className="muted">
                    {item.source_template_name || item.source_template_code || "Template item"}
                    {item.source_step_name ? ` • ${item.source_step_name}` : ""}
                    {item.source_due_anchor ? ` • anchor ${item.source_due_anchor}` : ""}
                    {item.source_due_offset_days !== null ? ` • offset ${item.source_due_offset_days}` : ""}
                    {item.source_due_offset_unit ? ` ${item.source_due_offset_unit}` : ""}
                  </span>
                </div>
              ) : null}

              {item.last_action_at || item.last_action_by ? (
                <p className="muted muted-note--spaced">
                  Last action {item.last_action_at || "not recorded"}
                  {item.last_action_by ? ` by ${item.last_action_by}` : ""}.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
