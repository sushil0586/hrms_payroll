"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminNotificationChannelAuthoringHint,
  HrAdminNotificationChannelConfiguration,
  HrAdminNotificationChannelConfigurationWriteInput,
  HrAdminNotificationDeliveryBackend,
  HrAdminNotificationDeliveryPolicyField,
  HrAdminNotificationProviderConfigField,
  HrAdminNotificationOptions,
} from "@/lib/types";

type Props = {
  options: HrAdminNotificationOptions;
};

type SaveState = {
  error: string;
  success: string;
  isSubmitting: boolean;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save notification delivery settings.";
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return `${key}: ${String(value[0])}`;
    if (typeof value === "string") return `${key}: ${value}`;
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save notification delivery settings.");
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function getPolicyFieldValue(
  formValue: HrAdminNotificationChannelConfigurationWriteInput,
  field: HrAdminNotificationDeliveryPolicyField,
) {
  try {
    const policy = parseJsonObject(formValue.delivery_policy);
    const rawValue = policy[field.key];
    if (typeof rawValue === "number" || typeof rawValue === "string") {
      return String(rawValue);
    }
  } catch {
    return "";
  }
  return String(field.default_value);
}

function getProviderFieldValue(
  formValue: HrAdminNotificationChannelConfigurationWriteInput,
  field: HrAdminNotificationProviderConfigField,
) {
  try {
    const providerConfig = parseJsonObject(formValue.provider_config);
    const rawValue = providerConfig[field.key];
    if (typeof rawValue === "number" || typeof rawValue === "string") {
      return String(rawValue);
    }
  } catch {
    return "";
  }
  return String(field.default_value);
}

function toFormValue(item: HrAdminNotificationChannelConfiguration): HrAdminNotificationChannelConfigurationWriteInput {
  return {
    channel: item.channel,
    is_enabled: item.is_enabled,
    backend_key: item.backend_key,
    sender_identifier: item.sender_identifier,
    sender_address: item.sender_address,
    provider_config: JSON.stringify(item.provider_config ?? {}, null, 2),
    delivery_policy: JSON.stringify(item.delivery_policy ?? {}, null, 2),
  };
}

export function NotificationDeliveryManager({ options }: Props) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<Record<string, HrAdminNotificationChannelConfigurationWriteInput>>(
    Object.fromEntries(options.channel_configurations.map((item) => [item.id, toFormValue(item)])),
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>(
    Object.fromEntries(
      options.channel_configurations.map((item) => [
        item.id,
        { error: "", success: "", isSubmitting: false },
      ]),
    ),
  );

  const channelLabels = useMemo(
    () => Object.fromEntries(options.notification_channels.map((item) => [item.value, item.label])),
    [options.notification_channels],
  );

  const backendLabels = useMemo(
    () => Object.fromEntries(options.notification_delivery_backends.map((item) => [item.value, item.label])),
    [options.notification_delivery_backends],
  );

  const channelHints = useMemo(
    () => Object.fromEntries(options.notification_delivery_authoring.channel_hints.map((item) => [item.channel, item])),
    [options.notification_delivery_authoring.channel_hints],
  );

  function update(itemId: string, key: keyof HrAdminNotificationChannelConfigurationWriteInput, value: string | boolean) {
    setFormValues((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        [key]: value,
      },
    }));
    setSaveStates((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        error: "",
        success: "",
      },
    }));
  }

  function updateDeliveryPolicyField(itemId: string, field: HrAdminNotificationDeliveryPolicyField, value: string) {
    const currentValue = formValues[itemId];
    let policy: Record<string, unknown> = {};
    try {
      policy = parseJsonObject(currentValue.delivery_policy);
    } catch {
      policy = {};
    }

    const nextPolicy = { ...policy };
    if (!value.trim()) {
      delete nextPolicy[field.key];
    } else if (field.input_type === "number") {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        nextPolicy[field.key] = numericValue;
      }
    } else {
      nextPolicy[field.key] = value;
    }

    update(itemId, "delivery_policy", JSON.stringify(nextPolicy, null, 2));
  }

  function updateProviderConfigField(itemId: string, field: HrAdminNotificationProviderConfigField, value: string) {
    const currentValue = formValues[itemId];
    let providerConfig: Record<string, unknown> = {};
    try {
      providerConfig = parseJsonObject(currentValue.provider_config);
    } catch {
      providerConfig = {};
    }

    const nextProviderConfig = { ...providerConfig };
    if (!value.trim()) {
      delete nextProviderConfig[field.key];
    } else if (field.input_type === "number") {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        nextProviderConfig[field.key] = numericValue;
      }
    } else {
      nextProviderConfig[field.key] = value;
    }

    update(itemId, "provider_config", JSON.stringify(nextProviderConfig, null, 2));
  }

  async function save(item: HrAdminNotificationChannelConfiguration) {
    const currentValue = formValues[item.id];
    const nextState = { error: "", success: "", isSubmitting: true };
    setSaveStates((current) => ({ ...current, [item.id]: nextState }));

    let providerConfig: Record<string, unknown> = {};
    let deliveryPolicy: Record<string, unknown> = {};
    try {
      providerConfig = parseJsonObject(currentValue.provider_config);
    } catch {
      setSaveStates((current) => ({
        ...current,
        [item.id]: { error: "Provider config must be valid JSON.", success: "", isSubmitting: false },
      }));
      return;
    }
    try {
      deliveryPolicy = parseJsonObject(currentValue.delivery_policy);
    } catch {
      setSaveStates((current) => ({
        ...current,
        [item.id]: { error: "Delivery policy must be valid JSON.", success: "", isSubmitting: false },
      }));
      return;
    }

    const response = await fetch(`/api/hr-admin/notification-channel-configs/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: currentValue.channel,
        is_enabled: currentValue.is_enabled,
        backend_key: currentValue.backend_key,
        sender_identifier: currentValue.sender_identifier,
        sender_address: currentValue.sender_address,
        provider_config: providerConfig,
        delivery_policy: deliveryPolicy,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaveStates((current) => ({
        ...current,
        [item.id]: { error: getErrorMessage(payload), success: "", isSubmitting: false },
      }));
      return;
    }

    setFormValues((current) => ({
      ...current,
      [item.id]: toFormValue(payload as HrAdminNotificationChannelConfiguration),
    }));
    setSaveStates((current) => ({
      ...current,
      [item.id]: { error: "", success: "Delivery settings saved.", isSubmitting: false },
    }));
    router.refresh();
  }

  return (
    <section className="section form-layout-modern">
      {options.channel_configurations.map((item) => {
        const state = saveStates[item.id];
        const value = formValues[item.id];
        const availableBackends = options.notification_delivery_backends.filter((backend) => backend.supported_channels.includes(item.channel));
        const currentBackend = value.backend_key;
        const providerFields = options.notification_delivery_authoring.provider_fields.filter((field) => field.backend_key === currentBackend);
        const channelHint: HrAdminNotificationChannelAuthoringHint | undefined = channelHints[item.channel];
        const senderIdentifierLabel = channelHint?.sender_identifier_label ?? "Sender identifier";
        const senderIdentifierPlaceholder = channelHint?.sender_identifier_placeholder ?? "nexora-hrms";
        const senderAddressLabel = channelHint?.sender_address_label ?? (item.channel === "email" ? "From email" : "Sender address");
        const senderAddressPlaceholder = channelHint?.sender_address_placeholder ?? (item.channel === "email" ? "notifications@example.local" : "Optional sender address");
        const providerConfigExample = channelHint?.provider_config_example ?? {};
        const providerConfigExampleText = JSON.stringify(providerConfigExample, null, 2);
        const backoffValue = Number(getPolicyFieldValue(value, options.notification_delivery_authoring.policy_fields.find((field) => field.key === "retry_backoff_minutes") ?? {
          key: "retry_backoff_minutes",
          label: "Retry backoff minutes",
          description: "",
          input_type: "number",
          default_value: 0,
        }));
        const maxAttemptsValue = Number(getPolicyFieldValue(value, options.notification_delivery_authoring.policy_fields.find((field) => field.key === "max_attempts") ?? {
          key: "max_attempts",
          label: "Max attempts",
          description: "",
          input_type: "number",
          default_value: 3,
        }));

        return (
          <section className="form-shell-card" key={item.id}>
            <div className="form-shell-card__header">
              <div>
                <h2>{channelLabels[item.channel] ?? formatLabel(item.channel)}</h2>
                <p className="section-copy">
                  Configure the current delivery backend, sender identity, and advanced provider metadata for this channel.
                </p>
              </div>
              <div className="form-shell-card__meta">
                <span className="queue-summary-chip">
                  <strong>{value.is_enabled ? "Enabled" : "Disabled"}</strong> delivery
                </span>
                <span className="queue-summary-chip">
                  <strong>{backendLabels[value.backend_key] ?? formatLabel(value.backend_key)}</strong> backend
                </span>
              </div>
            </div>

            <div className="form-shell-card__grid">
              <FormSection title="Core routing" description="Choose the backend currently responsible for this channel and whether delivery should be active.">
                <div className="form-grid">
                  <label className="form-field">
                    <span className="muted">Backend</span>
                    <select className="input-control" value={value.backend_key} onChange={(event) => update(item.id, "backend_key", event.target.value)}>
                      {availableBackends.map((backend: HrAdminNotificationDeliveryBackend) => (
                        <option key={backend.value} value={backend.value}>
                          {backend.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span className="muted">Delivery state</span>
                    <select
                      className="input-control"
                      value={value.is_enabled ? "enabled" : "disabled"}
                      onChange={(event) => update(item.id, "is_enabled", event.target.value === "enabled")}
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                </div>
              </FormSection>

              <FormSection title="Sender identity" description="These values are reusable defaults that providers can consume later without changing the API shape.">
                <div className="form-grid">
                  <label className="form-field">
                    <span className="muted">{senderIdentifierLabel}</span>
                    <input
                      className="input-control"
                      value={value.sender_identifier}
                      onChange={(event) => update(item.id, "sender_identifier", event.target.value)}
                      placeholder={senderIdentifierPlaceholder}
                    />
                  </label>
                  <label className="form-field">
                    <span className="muted">{senderAddressLabel}</span>
                    <input
                      className="input-control"
                      value={value.sender_address}
                      onChange={(event) => update(item.id, "sender_address", event.target.value)}
                      placeholder={senderAddressPlaceholder}
                    />
                  </label>
                </div>
              </FormSection>

              <FormSection
                title="Provider routing"
                description="Backend-specific settings stay guided here so each delivery provider can evolve without changing the main configuration workflow."
              >
                {providerFields.length ? (
                  <div className="form-grid">
                    {providerFields.map((field) => (
                      <label className="form-field" key={`${currentBackend}-${field.key}`}>
                        <span className="muted">{field.label}</span>
                        <input
                          className="input-control"
                          max={field.max_value}
                          min={field.min_value}
                          placeholder={field.placeholder}
                          type={field.input_type}
                          value={getProviderFieldValue(value, field)}
                          onChange={(event) => updateProviderConfigField(item.id, field, event.target.value)}
                        />
                        <span className="field-help-text">{field.description}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="notice notice--spaced">
                    <strong>No guided provider fields yet.</strong>
                    <span className="muted">
                      This backend currently relies on sender identity and the advanced JSON block only.
                    </span>
                  </div>
                )}
              </FormSection>

              <FormSection
                title="Retry policy"
                description="Guide retry behavior with backend-owned defaults so queue actions, retry limits, and backoff stay consistent."
              >
                <div className="form-grid">
                  {options.notification_delivery_authoring.policy_fields.map((field) => (
                    <label className="form-field" key={field.key}>
                      <span className="muted">{field.label}</span>
                      <input
                        className="input-control"
                        max={field.max_value}
                        min={field.min_value}
                        type={field.input_type}
                        value={getPolicyFieldValue(value, field)}
                        onChange={(event) => updateDeliveryPolicyField(item.id, field, event.target.value)}
                      />
                      <span className="field-help-text">{field.description}</span>
                    </label>
                  ))}
                </div>
                <div className="notice notice--spaced">
                  <strong>Current retry behavior.</strong>
                  <span className="muted">
                    {maxAttemptsValue <= 1
                      ? "This channel will stop after the first failed delivery attempt."
                      : `This channel can retry up to ${maxAttemptsValue} delivery attempts per notification.`}{" "}
                    {backoffValue > 0
                      ? `Queued retries will wait ${backoffValue} minute${backoffValue === 1 ? "" : "s"} before being picked up again.`
                      : "Immediate retries can be processed without any queued backoff delay."}
                  </span>
                </div>
              </FormSection>

              <FormSection
                fullWidth
                title="Advanced delivery configuration"
                description="Keep provider-specific values and escape-hatch policy keys in JSON so future integrations can expand without a schema rewrite."
              >
                <div className="notice notice--spaced">
                  <strong>Provider config example.</strong>
                  <span className="muted">
                    Seed channel-specific metadata here when a real provider needs extra routing values later.
                  </span>
                </div>
                <div className="form-grid">
                  <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <span className="muted">Provider config JSON</span>
                    <textarea
                      className="input-control"
                      rows={6}
                      value={value.provider_config}
                      onChange={(event) => update(item.id, "provider_config", event.target.value)}
                      placeholder={providerConfigExampleText}
                    />
                  </label>
                  <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <span className="muted">Delivery policy JSON</span>
                    <textarea
                      className="input-control"
                      rows={5}
                      value={value.delivery_policy}
                      onChange={(event) => update(item.id, "delivery_policy", event.target.value)}
                    />
                    <span className="field-help-text">
                      Guided retry fields above update this JSON automatically. Keep extra policy keys here only when the backend begins supporting them.
                    </span>
                  </label>
                </div>
              </FormSection>
            </div>

            {state.error ? (
              <div className="notice notice--spaced">
                <strong>Save failed.</strong>
                <span className="muted">{state.error}</span>
              </div>
            ) : null}
            {state.success ? (
              <div className="notice notice--spaced">
                <strong>Saved.</strong>
                <span className="muted">{state.success}</span>
              </div>
            ) : null}

            <div className="form-shell-card__actions form-shell-card__actions--start">
              <span className="muted">Channel config stays tenant-scoped and feeds the notification queue processor.</span>
              <button className="button button--primary" disabled={state.isSubmitting} onClick={() => save(item)} type="button">
                {state.isSubmitting ? "Saving..." : "Save delivery settings"}
              </button>
            </div>
          </section>
        );
      })}
    </section>
  );
}
