"use client";

import { useMemo } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { NotificationPreviewPanel } from "@/app/hr-admin/notifications/notification-preview-panel";
import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminNotificationEventDefinitionWriteInput, HrAdminNotificationOptions } from "@/lib/types";

type Props = {
  initialValue: HrAdminNotificationEventDefinitionWriteInput;
  mode: "create" | "edit";
  options: HrAdminNotificationOptions;
  itemId?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save notification event.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save notification event.");
}

function parseJsonObject(value: string) {
  if (!value.trim()) {
    return {};
  }
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function selectOptions(items: Array<{ id: string; name: string }>) {
  return [
    <option key="blank" value="">
      Select an option
    </option>,
    ...items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    )),
  ];
}

export function NotificationEventForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const moduleHints = useMemo(
    () => Object.fromEntries(options.notification_catalog_authoring.event_module_hints.map((item) => [item.module, item])),
    [options.notification_catalog_authoring.event_module_hints],
  );
  const audienceHints = useMemo(
    () => Object.fromEntries(options.notification_catalog_authoring.audience_hints.map((item) => [item.audience_type, item])),
    [options.notification_catalog_authoring.audience_hints],
  );
  const currentModuleHint = moduleHints[formValue.module];
  const currentAudienceHint = audienceHints[formValue.audience_type];
  const availableTemplates = options.templates.filter((item) => item.channel === formValue.channel);

  function update<Key extends keyof HrAdminNotificationEventDefinitionWriteInput>(
    key: Key,
    value: HrAdminNotificationEventDefinitionWriteInput[Key],
  ) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateChannel(nextChannel: string) {
    setFormValue((current) => {
      const currentTemplate = options.templates.find((item) => item.id === current.template_id);
      const shouldClearTemplate = currentTemplate ? currentTemplate.channel !== nextChannel : false;
      return {
        ...current,
        channel: nextChannel,
        template_id: shouldClearTemplate ? null : current.template_id,
      };
    });
  }

  function getRecipientSnapshotFieldValue(fieldKey: string, defaultValue: string | number) {
    try {
      const snapshot = parseJsonObject(formValue.recipient_snapshot);
      const rawValue = snapshot[fieldKey];
      if (typeof rawValue === "string" || typeof rawValue === "number") {
        return String(rawValue);
      }
    } catch {
      return "";
    }
    return String(defaultValue);
  }

  function updateRecipientSnapshotField(fieldKey: string, value: string, inputType: "number" | "text") {
    let snapshot: Record<string, unknown> = {};
    try {
      snapshot = parseJsonObject(formValue.recipient_snapshot);
    } catch {
      snapshot = {};
    }

    const nextSnapshot = { ...snapshot };
    if (!value.trim()) {
      delete nextSnapshot[fieldKey];
    } else if (inputType === "number") {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        nextSnapshot[fieldKey] = numericValue;
      }
    } else {
      nextSnapshot[fieldKey] = value;
    }

    update("recipient_snapshot", JSON.stringify(nextSnapshot, null, 2));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    let recipientSnapshot: Record<string, unknown> = {};
    try {
      recipientSnapshot = parseJsonObject(formValue.recipient_snapshot);
    } catch {
      setError("Recipient snapshot must be valid JSON.");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(
      mode === "create" ? "/api/hr-admin/notification-events" : `/api/hr-admin/notification-events/${itemId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValue, recipient_snapshot: recipientSnapshot }),
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }

    router.push("/hr-admin/notification-events");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create notification event" : "Edit notification event"}</h2>
            <p className="section-copy">
              Define the trigger, audience, routing target, and delivery behavior that turn operational events into notifications.
            </p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip">
              <strong>{formValue.channel}</strong> channel
            </span>
            <span className="queue-summary-chip">
              <strong>{formValue.priority}</strong> priority
            </span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection title="Trigger definition" description="Capture the identity and workflow context for the event being routed.">
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Code</span>
                <input className="input-control" required value={formValue.code} onChange={(e) => update("code", e.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Name</span>
                <input className="input-control" required value={formValue.name} onChange={(e) => update("name", e.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Module</span>
                <select
                  className="input-control"
                  value={formValue.module}
                  onChange={(e) => {
                    const nextModule = e.target.value;
                    update("module", nextModule);
                  }}
                >
                  {options.workflow_modules.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Trigger key</span>
                <input className="input-control" required value={formValue.trigger_key} onChange={(e) => update("trigger_key", e.target.value)} />
              </label>
            </div>
            {currentModuleHint ? (
              <div className="notice notice--spaced">
                <strong>Trigger examples for {currentModuleHint.module}.</strong>
                <span className="muted">
                  Suggested defaults: {currentModuleHint.default_channel} channel, {currentModuleHint.default_audience_type} audience.
                </span>
                <div className="form-actions-bar__buttons notice--spaced">
                  {currentModuleHint.trigger_examples.map((example) => (
                    <button
                      className="button button--secondary"
                      key={example.key}
                      onClick={() => {
                        update("trigger_key", example.key);
                        updateChannel(currentModuleHint.default_channel);
                        update("audience_type", currentModuleHint.default_audience_type);
                      }}
                      type="button"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </FormSection>

          <FormSection title="Audience and delivery" description="Choose who receives the event and how the message is delivered.">
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Audience type</span>
                <select className="input-control" value={formValue.audience_type} onChange={(e) => update("audience_type", e.target.value)}>
                  {options.notification_audience_types.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Channel</span>
                <select className="input-control" value={formValue.channel} onChange={(e) => updateChannel(e.target.value)}>
                  {options.notification_channels.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Template</span>
                <select className="input-control" value={formValue.template_id ?? ""} onChange={(e) => update("template_id", e.target.value || null)}>
                  {selectOptions(availableTemplates.map((item) => ({ id: item.id, name: `${item.name} (${item.status})` })))}
                </select>
                <span className="field-help-text">
                  Only templates matching the selected delivery channel are shown here.
                </span>
              </label>
              <label className="form-field">
                <span className="muted">Priority</span>
                <select className="input-control" value={formValue.priority} onChange={(e) => update("priority", e.target.value)}>
                  {options.notification_priorities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Delay minutes</span>
                <input
                  className="input-control"
                  min={0}
                  type="number"
                  value={formValue.delivery_delay_minutes}
                  onChange={(e) => update("delivery_delay_minutes", Number(e.target.value) || 0)}
                />
              </label>
            </div>
            {currentAudienceHint ? (
              <div className="notice notice--spaced">
                <strong>{currentAudienceHint.label} routing.</strong>
                <span className="muted">{currentAudienceHint.description}</span>
              </div>
            ) : null}
          </FormSection>

          <FormSection title="Scoped routing" description="Optional role or membership targeting keeps delivery explicit when audience rules need extra narrowing.">
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Role</span>
                <select className="input-control" value={formValue.role_id ?? ""} onChange={(e) => update("role_id", e.target.value || null)}>
                  {selectOptions(options.roles)}
                </select>
                <span className="field-help-text">
                  {currentAudienceHint?.role_supported
                    ? "This audience type supports role-based targeting."
                    : "Role targeting is usually not required for this audience type."}
                </span>
              </label>
              <label className="form-field">
                <span className="muted">Membership</span>
                <select className="input-control" value={formValue.membership_id ?? ""} onChange={(e) => update("membership_id", e.target.value || null)}>
                  {selectOptions(options.memberships)}
                </select>
                <span className="field-help-text">
                  {currentAudienceHint?.membership_supported
                    ? "This audience type can point to one explicit tenant membership."
                    : "Membership targeting is usually not required for this audience type."}
                </span>
              </label>
            </div>
          </FormSection>

          <FormSection
            fullWidth
            title="Recipient snapshot and status"
            description="The JSON snapshot can hold additional delivery context, while the active toggle controls whether this event should currently route."
          >
            <div className="form-grid">
              {currentAudienceHint?.recipient_snapshot_fields.map((field) => (
                <label className="form-field" key={`${formValue.audience_type}-${field.key}`}>
                  <span className="muted">{field.label}</span>
                  <input
                    className="input-control"
                    max={field.max_value}
                    min={field.min_value}
                    placeholder={field.placeholder}
                    type={field.input_type}
                    value={getRecipientSnapshotFieldValue(field.key, field.default_value)}
                    onChange={(e) => updateRecipientSnapshotField(field.key, e.target.value, field.input_type)}
                  />
                  <span className="field-help-text">{field.description}</span>
                </label>
              ))}
              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Recipient snapshot JSON</span>
                <textarea
                  className="input-control"
                  rows={5}
                  value={formValue.recipient_snapshot}
                  onChange={(e) => update("recipient_snapshot", e.target.value)}
                />
                <span className="field-help-text">
                  Guided routing fields above update this JSON automatically. Example:{" "}
                  {JSON.stringify(currentAudienceHint?.recipient_snapshot_example ?? {}, null, 0)}
                </span>
              </label>
            </div>
            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Active</strong>
                  <p className="section-copy">Only active notification events participate in trigger-driven delivery.</p>
                </div>
                <input checked={formValue.is_active} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" />
              </label>
            </div>
          </FormSection>
        </div>

        {error ? (
          <div className="notice">
            <strong>Save failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">Changes flow straight back into the event catalog and notification control center.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create notification event" : "Save changes"}
            </button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">
              Cancel
            </button>
          </div>
        </div>
      </section>

      <NotificationPreviewPanel
        description="Validate trigger content, audience routing, and actual delivery behavior against one test membership before relying on the live event catalog."
        initialMembershipId={formValue.membership_id}
        memberships={options.memberships}
        previewEndpoint="/api/hr-admin/notification-events/preview"
        testSendEndpoint="/api/hr-admin/notification-events/test-send"
        title="Preview and test"
        onBuildRequest={({ membershipId, processNow, samplePayload }) => {
          let recipientSnapshot: Record<string, unknown> = {};
          try {
            recipientSnapshot = parseJsonObject(formValue.recipient_snapshot);
          } catch {
            return { ok: false, error: "Recipient snapshot must be valid JSON before preview or test send." };
          }
          return {
            ok: true,
            payload: {
              code: formValue.code,
              name: formValue.name,
              module: formValue.module,
              trigger_key: formValue.trigger_key,
              audience_type: formValue.audience_type,
              channel: formValue.channel,
              template_id: formValue.template_id,
              role_id: formValue.role_id,
              membership_id: membershipId || formValue.membership_id,
              priority: formValue.priority,
              delivery_delay_minutes: formValue.delivery_delay_minutes,
              recipient_snapshot: recipientSnapshot,
              sample_payload: samplePayload,
              subject_type: "notification_event_preview",
              subject_identifier: formValue.trigger_key || "event-preview",
              process_now: processNow,
            },
          };
        }}
      />
    </form>
  );
}
