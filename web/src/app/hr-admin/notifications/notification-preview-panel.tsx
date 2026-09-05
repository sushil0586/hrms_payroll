"use client";

import Link from "next/link";
import { useState } from "react";

import type { HrAdminNotificationPreviewResponse, HrAdminOptionItem } from "@/lib/types";

type BuildRequestResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

type Props = {
  title: string;
  description: string;
  memberships: HrAdminOptionItem[];
  initialMembershipId?: string | null;
  initialSamplePayload?: string;
  previewEndpoint: string;
  testSendEndpoint: string;
  onBuildRequest: (input: {
    membershipId: string | null;
    samplePayload: Record<string, unknown>;
    processNow: boolean;
  }) => BuildRequestResult;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to complete notification preview.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to complete notification preview.");
}

export function NotificationPreviewPanel({
  title,
  description,
  memberships,
  initialMembershipId = null,
  initialSamplePayload = "{\n  \"employee_name\": \"Riya Sharma\",\n  \"status\": \"approved\"\n}",
  previewEndpoint,
  testSendEndpoint,
  onBuildRequest,
}: Props) {
  const [membershipId, setMembershipId] = useState(() => initialMembershipId ?? "");
  const [samplePayloadText, setSamplePayloadText] = useState(initialSamplePayload);
  const [processNow, setProcessNow] = useState(true);
  const [error, setError] = useState("");
  const [isSubmittingPreview, setIsSubmittingPreview] = useState(false);
  const [isSubmittingSend, setIsSubmittingSend] = useState(false);
  const [result, setResult] = useState<HrAdminNotificationPreviewResponse | null>(null);

  function buildPayload(processNowValue: boolean): BuildRequestResult {
    let samplePayload: Record<string, unknown> = {};
    try {
      samplePayload = samplePayloadText.trim() ? (JSON.parse(samplePayloadText) as Record<string, unknown>) : {};
    } catch {
      return { ok: false, error: "Sample payload must be valid JSON." };
    }
    return onBuildRequest({
      membershipId: membershipId || null,
      samplePayload,
      processNow: processNowValue,
    });
  }

  async function execute(endpoint: string, processNowValue: boolean) {
    setError("");
    const built = buildPayload(processNowValue);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(built.payload),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      return;
    }
    setResult(payload as HrAdminNotificationPreviewResponse);
  }

  async function handlePreview() {
    setIsSubmittingPreview(true);
    await execute(previewEndpoint, processNow);
    setIsSubmittingPreview(false);
  }

  async function handleTestSend() {
    setIsSubmittingSend(true);
    await execute(testSendEndpoint, processNow);
    setIsSubmittingSend(false);
  }

  return (
    <section className="form-shell-card">
      <div className="form-shell-card__header">
        <div>
          <h2>{title}</h2>
          <p className="section-copy">{description}</p>
        </div>
        <div className="form-shell-card__meta">
          <span className="queue-summary-chip">
            <strong>{processNow ? "Instant" : "Queued"}</strong> test mode
          </span>
          <span className="queue-summary-chip">
            <strong>{memberships.length}</strong> memberships
          </span>
        </div>
      </div>

      <div className="form-shell-card__grid">
        <div className="form-section-card form-section-card--full">
          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Test membership</span>
              <select className="input-control" value={membershipId} onChange={(event) => setMembershipId(event.target.value)}>
                <option value="">Choose a membership</option>
                {memberships.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle-field">
              <div>
                <strong>Process immediately</strong>
                <p className="section-copy">Turn this off when you want to validate queue behavior instead of immediate delivery.</p>
              </div>
              <input checked={processNow} onChange={(event) => setProcessNow(event.target.checked)} type="checkbox" />
            </label>
            <label className="form-field" style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Sample payload JSON</span>
              <textarea className="input-control" rows={7} value={samplePayloadText} onChange={(event) => setSamplePayloadText(event.target.value)} />
            </label>
          </div>
          {error ? (
            <div className="notice notice--spaced">
              <strong>Preview failed.</strong>
              <span className="muted">{error}</span>
            </div>
          ) : null}
          <div className="form-actions-bar">
            <span className="muted">Preview renders content without saving. Test send creates one real notification for the selected membership.</span>
            <div className="form-actions-bar__buttons">
              <button className="button button--secondary" disabled={isSubmittingPreview || isSubmittingSend} onClick={handlePreview} type="button">
                {isSubmittingPreview ? "Rendering..." : "Preview"}
              </button>
              <button className="button button--primary" disabled={isSubmittingPreview || isSubmittingSend} onClick={handleTestSend} type="button">
                {isSubmittingSend ? "Sending..." : "Send test"}
              </button>
            </div>
          </div>
        </div>

        {result ? (
          <div className="form-section-card form-section-card--full">
            <div className="form-section-card__header">
              <h2>Rendered output</h2>
            </div>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Channel</span>
                <span className="detail-value">{result.preview.channel}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Audience</span>
                <span className="detail-value">{result.preview.audience_type || "Template preview"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Recipient</span>
                <span className="detail-value">{result.preview.resolved_recipient.membership_name || result.preview.resolved_recipient.identifier || "Not resolved"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <span className="detail-value">{result.preview.resolved_recipient.address || "Not resolved"}</span>
              </div>
            </div>
            <div className="notice notice--spaced">
              <strong>Routing summary</strong>
              <span className="muted">{result.preview.routing_summary}</span>
            </div>
            <div className="form-grid form-grid--spaced">
              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Rendered title</span>
                <textarea className="input-control" readOnly rows={2} value={result.preview.title} />
              </label>
              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Rendered subject</span>
                <textarea className="input-control" readOnly rows={2} value={result.preview.subject} />
              </label>
              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Rendered body</span>
                <textarea className="input-control" readOnly rows={6} value={result.preview.body} />
              </label>
              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Rendered metadata</span>
                <textarea className="input-control" readOnly rows={5} value={JSON.stringify(result.preview.metadata, null, 2)} />
              </label>
            </div>

            {result.test_notification ? (
              <div className="notice notice--spaced">
                <strong>Test notification created.</strong>
                <span className="muted">
                  Status: {result.test_notification.status}.{" "}
                  <Link href={`/hr-admin/notifications/${result.test_notification.id}/review`}>Open review</Link>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
