"use client";

import { useMemo } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { NotificationPreviewPanel } from "@/app/hr-admin/notifications/notification-preview-panel";
import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminNotificationOptions, HrAdminNotificationTemplateWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminNotificationTemplateWriteInput;
  mode: "create" | "edit";
  options: HrAdminNotificationOptions;
  itemId?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save notification template.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save notification template.");
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

export function NotificationTemplateForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const channelHints = useMemo(
    () => Object.fromEntries(options.notification_catalog_authoring.template_channel_hints.map((item) => [item.channel, item])),
    [options.notification_catalog_authoring.template_channel_hints],
  );
  const channelHint = channelHints[formValue.channel];

  function update<Key extends keyof HrAdminNotificationTemplateWriteInput>(
    key: Key,
    value: HrAdminNotificationTemplateWriteInput[Key],
  ) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function getMetadataFieldValue(fieldKey: string, defaultValue: string | number) {
    try {
      const metadata = parseJsonObject(formValue.metadata_template);
      const rawValue = metadata[fieldKey];
      if (typeof rawValue === "string" || typeof rawValue === "number") {
        return String(rawValue);
      }
    } catch {
      return "";
    }
    return String(defaultValue);
  }

  function updateMetadataField(fieldKey: string, value: string, inputType: "number" | "text") {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = parseJsonObject(formValue.metadata_template);
    } catch {
      metadata = {};
    }

    const nextMetadata = { ...metadata };
    if (!value.trim()) {
      delete nextMetadata[fieldKey];
    } else if (inputType === "number") {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        nextMetadata[fieldKey] = numericValue;
      }
    } else {
      nextMetadata[fieldKey] = value;
    }
    update("metadata_template", JSON.stringify(nextMetadata, null, 2));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    let metadataTemplate: Record<string, unknown> = {};
    try {
      metadataTemplate = parseJsonObject(formValue.metadata_template);
    } catch {
      setError("Metadata template must be valid JSON.");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(
      mode === "create" ? "/api/hr-admin/notification-templates" : `/api/hr-admin/notification-templates/${itemId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValue, metadata_template: metadataTemplate }),
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }

    router.push("/hr-admin/notification-templates");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create notification template" : "Edit notification template"}</h2>
            <p className="section-copy">
              Define reusable content for a notification channel, including the display fields and metadata structure used by delivery flows.
            </p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip">
              <strong>{formValue.channel}</strong> channel
            </span>
            <span className="queue-summary-chip">
              <strong>{formValue.status}</strong> status
            </span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection title="Template identity" description="Keep the template easy to recognize by code, name, channel, and current status.">
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
                <span className="muted">Channel</span>
                <select className="input-control" value={formValue.channel} onChange={(e) => update("channel", e.target.value)}>
                  {options.notification_channels.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Status</span>
                <select className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value)}>
                  {options.notification_template_statuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </FormSection>

          <FormSection title="Message framing" description="Subject and title fields help shape delivery across channels that support richer message surfaces.">
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Subject template</span>
                <input
                  className="input-control"
                  disabled={channelHint ? !channelHint.subject_supported : false}
                  placeholder={channelHint?.subject_supported ? "Approval update for {{ employee_name }}" : "This channel usually does not use a subject"}
                  value={formValue.subject_template}
                  onChange={(e) => update("subject_template", e.target.value)}
                />
                <span className="field-help-text">
                  {channelHint?.subject_supported
                    ? "Use short variables-friendly phrasing for channels that render an email-style subject."
                    : "Keep this blank unless your tenant wants an extra display field for this channel."}
                </span>
              </label>
              <label className="form-field">
                <span className="muted">Title template</span>
                <input
                  className="input-control"
                  disabled={channelHint ? !channelHint.title_supported : false}
                  placeholder={channelHint?.title_supported ? "Request status updated" : "This channel usually does not use a title"}
                  value={formValue.title_template}
                  onChange={(e) => update("title_template", e.target.value)}
                />
                <span className="field-help-text">
                  {channelHint?.title_supported
                    ? "Titles work well for in-app and push-style surfaces where a compact heading improves scanability."
                    : "Keep this blank unless you intentionally want an extra title field on this channel."}
                </span>
              </label>
            </div>
            {channelHint ? (
              <div className="notice notice--spaced">
                <strong>Channel authoring guide.</strong>
                <span className="muted">
                  Sample variables: {channelHint.sample_variables.map((item) => `{{ ${item} }}`).join(", ")}.
                </span>
              </div>
            ) : null}
          </FormSection>

          <FormSection
            fullWidth
            title="Body and metadata"
            description="Keep the message body and metadata JSON readable so templates stay maintainable as the notification system expands."
          >
            <div className="form-grid">
              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Body template</span>
                <textarea
                  className="input-control"
                  placeholder={channelHint?.body_placeholder}
                  rows={6}
                  value={formValue.body_template}
                  onChange={(e) => update("body_template", e.target.value)}
                />
              </label>
              {channelHint?.metadata_fields.map((field) => (
                <label className="form-field" key={`${formValue.channel}-${field.key}`}>
                  <span className="muted">{field.label}</span>
                  <input
                    className="input-control"
                    max={field.max_value}
                    min={field.min_value}
                    placeholder={field.placeholder}
                    type={field.input_type}
                    value={getMetadataFieldValue(field.key, field.default_value)}
                    onChange={(e) => updateMetadataField(field.key, e.target.value, field.input_type)}
                  />
                  <span className="field-help-text">{field.description}</span>
                </label>
              ))}
              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Metadata template JSON</span>
                <textarea
                  className="input-control"
                  rows={5}
                  value={formValue.metadata_template}
                  onChange={(e) => update("metadata_template", e.target.value)}
                />
                <span className="field-help-text">
                  Guided metadata fields above update this JSON automatically. Keep extra channel-specific keys here only when needed.
                </span>
              </label>
            </div>
            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>System seeded</strong>
                  <p className="section-copy">Flag whether this template belongs to the seeded platform baseline rather than tenant-authored content.</p>
                </div>
                <input checked={formValue.is_system_seeded} onChange={(e) => update("is_system_seeded", e.target.checked)} type="checkbox" />
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
          <span className="muted">Changes return directly to the template catalog and stay ready for event routing.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : mode === "create" ? "Create template" : "Save changes"}
            </button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">
              Cancel
            </button>
          </div>
        </div>
      </section>

      <NotificationPreviewPanel
        description="Render this template with sample payload values and send one controlled test notification before saving or activating it."
        memberships={options.memberships}
        previewEndpoint="/api/hr-admin/notification-templates/preview"
        testSendEndpoint="/api/hr-admin/notification-templates/test-send"
        title="Preview and test"
        onBuildRequest={({ membershipId, processNow, samplePayload }) => {
          let metadataTemplate: Record<string, unknown> = {};
          try {
            metadataTemplate = parseJsonObject(formValue.metadata_template);
          } catch {
            return { ok: false, error: "Metadata template must be valid JSON before preview or test send." };
          }
          return {
            ok: true,
            payload: {
              channel: formValue.channel,
              subject_template: formValue.subject_template,
              title_template: formValue.title_template,
              body_template: formValue.body_template,
              metadata_template: metadataTemplate,
              sample_payload: samplePayload,
              membership_id: membershipId,
              process_now: processNow,
            },
          };
        }}
      />
    </form>
  );
}
