"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AsyncActionButton } from "@/components/patterns/async-action-button";

import { PageIntro } from "@/components/patterns/page-intro";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import type {
  PlatformOnboardingAdminContact,
  PlatformPublicLead,
  PlatformPolicyPackAdoptionResult,
  PlatformPolicyPackAdoptionPreview,
  PlatformPolicyPackUpgradeCompare,
  PlatformPolicyPackListItem,
  PlatformOnboardingEvent,
  PlatformSummary,
  PlatformTenantListItem,
  PlatformTenantOnboarding,
} from "@/lib/types";
import { PlatformLaunchWorkspace } from "./platform-launch-workspace";

type Props = {
  initialPanel: PlatformPanel;
  initialMessage?: string;
  initialEventQuery?: string;
  initialEventType?: string;
  leads: PlatformPublicLead[];
  tenants: PlatformTenantListItem[];
  selectedTenant: PlatformTenantListItem | null;
  onboarding: PlatformTenantOnboarding | null;
  policyPacks: PlatformPolicyPackListItem[];
  summary: PlatformSummary;
};

type MutationMethod = "POST" | "PATCH" | "DELETE";
type PlatformPanel = "control" | "leads" | "tenants" | "launch" | "onboarding" | "admins" | "policy-packs" | "events";
type PlatformPolicyPackItem = NonNullable<PlatformPolicyPackListItem["items"]>[number];
type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  run: () => Promise<void>;
};

const PAGE_SIZE = 8;

const platformTabs: { panel: PlatformPanel; label: string; countKey: "control" | "leads" | "tenants" | "launch" | "onboarding" | "admins" | "policyPacks" | "events" }[] = [
  { panel: "control", label: "Control", countKey: "control" },
  { panel: "leads", label: "Leads", countKey: "leads" },
  { panel: "tenants", label: "Tenants", countKey: "tenants" },
  { panel: "launch", label: "Launch Blueprint", countKey: "launch" },
  { panel: "onboarding", label: "Launch Readiness", countKey: "onboarding" },
  { panel: "admins", label: "Admin Access", countKey: "admins" },
  { panel: "policy-packs", label: "Setup Templates", countKey: "policyPacks" },
  { panel: "events", label: "Audit Logs", countKey: "events" },
];

const panelGuides: Record<PlatformPanel, { title: string; description: string; steps: string[] }> = {
  control: {
    title: "Dashboard",
    description: "Start here to see signup requests, customer setup readiness, admin access, and launch blockers.",
    steps: ["Review urgent signals", "Open the matching panel", "Resolve or record evidence"],
  },
  leads: {
    title: "Leads",
    description: "Review public signup/contact requests, qualify promising accounts, and convert approved leads into tenants.",
    steps: ["Review lead details", "Mark reviewing or qualified", "Convert to tenant"],
  },
  tenants: {
    title: "Tenants",
    description: "Search the customer registry, select a tenant, and create new customer organizations when needed.",
    steps: ["Find or create tenant", "Select tenant", "Open onboarding"],
  },
  launch: {
    title: "Launch Blueprint",
    description: "Select a guided India launch blueprint, collect required inputs, preview setup impact, and apply certified safe setup.",
    steps: ["Select blueprint", "Complete launch inputs", "Preview and safe apply"],
  },
  onboarding: {
    title: "Launch Readiness",
    description: "Move the selected customer through setup template adoption, admin access, go-live handoff, and activation.",
    steps: ["Verify tenant setup", "Confirm setup and admin access", "Complete go-live handoff"],
  },
  admins: {
    title: "Admin Access",
    description: "Create customer admin contacts and provision the first login user for the customer organization.",
    steps: ["Add primary contact", "Create login access", "Share login securely"],
  },
  "policy-packs": {
    title: "Setup Templates",
    description: "Create, publish, and apply reusable setup templates so every tenant starts from controlled configuration.",
    steps: ["Create template", "Publish template", "Apply to selected tenant"],
  },
  events: {
    title: "Audit Logs",
    description: "Review tenant onboarding events and evidence for platform actions, customer readiness, support, and activation.",
    steps: ["Search evidence", "Check actor and timestamp", "Use for signoff"],
  },
};

const panelPills: Record<PlatformPanel, string[]> = {
  control: ["Action queue", "Tenant readiness", "Launch blockers"],
  leads: ["Public signup", "Qualification", "Tenant conversion"],
  tenants: ["Customer registry", "Create tenant", "Select workspace"],
  launch: ["Blueprint selection", "Required inputs", "Safe apply"],
  onboarding: ["Setup details", "Launch readiness", "Go-live evidence"],
  admins: ["Admin contacts", "Login access", "Secure sharing"],
  "policy-packs": ["Setup templates", "Publish", "Apply"],
  events: ["Audit evidence", "Actor trail", "Timeline"],
};

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizedSearchText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function actionErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message || /failed to fetch|networkerror|load failed/i.test(message)) return fallback;
  return message;
}

function isWholeNumberAtLeast(value: string, min: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min;
}

function apiErrorMessage(payload: unknown, fallback: string) {
  const friendly = (message: string) => {
    if (/Primary tenant admin must be provisioned/i.test(message)) return "Create login access for the primary tenant admin before marking this customer ready.";
    if (/Baseline must be published/i.test(message)) return "Apply and confirm an initial setup template before marking this customer ready.";
    if (/Tenant handoff must be ready/i.test(message)) return "Complete go-live handoff before activation.";
    if (/At least one adopted policy pack is required/i.test(message)) return "Apply a published setup template to this tenant before confirming setup.";
    if (/already exists|duplicate/i.test(message)) return "This record already exists. Search the list or use a different code/email.";
    return message;
  };
  if (Array.isArray(payload) && payload.length) return friendly(String(payload[0]));
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return friendly(record.detail);
  const firstEntry = Object.values(record).find((value) => Array.isArray(value) || typeof value === "string");
  if (Array.isArray(firstEntry) && firstEntry.length) return friendly(String(firstEntry[0]));
  if (typeof firstEntry === "string") return friendly(firstEntry);
  return fallback;
}

function redactedAuditValue(key: string, value: unknown): unknown {
  if (/password|secret|token|credential|authorization|cookie|session/i.test(key)) {
    return "[redacted]";
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditPayload(item));
  }
  if (value && typeof value === "object") {
    return redactAuditPayload(value);
  }
  return value;
}

function redactAuditPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Array.isArray(value) ? value.map((item) => redactAuditPayload(item)) : value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, redactedAuditValue(key, entry)]),
  );
}

function auditEvidenceText(event: PlatformOnboardingEvent | null) {
  if (!event) return "";
  return JSON.stringify(redactAuditPayload(event.payload ?? {}), null, 2);
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value === null || value === undefined || value === "" ? "Not set" : String(value)}</span>
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  const isReady = ["active", "published", "provisioned", "completed", "handoff_ready", "baseline_published"].includes(value);
  return <span className={`record-chip${isReady ? " record-chip--accent" : ""}`}>{titleCase(value)}</span>;
}

function GateChecklistItem({
  complete,
  label,
  detail,
}: {
  complete: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className={`platform-gate-checklist__item${complete ? " is-complete" : " is-blocked"}`}>
      <span aria-hidden="true">{complete ? "Done" : "Needed"}</span>
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </li>
  );
}

function GuidedChecklistItem({
  index,
  status,
  title,
  detail,
  actionHref,
  actionLabel,
}: {
  index: number;
  status: "done" | "needed" | "blocked";
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const statusLabel = status === "done" ? "Done" : status === "blocked" ? "Blocked" : "Needed";

  return (
    <li className={`platform-guided-checklist__item platform-guided-checklist__item--${status}`}>
      <span className="platform-guided-checklist__index">{index}</span>
      <div className="platform-guided-checklist__content">
        <div className="platform-guided-checklist__title-row">
          <strong>{title}</strong>
          <span>{statusLabel}</span>
        </div>
        <small>{detail}</small>
        {actionHref && actionLabel ? (
          <Link className="button button--secondary" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function ValidationNote({ children }: { children: React.ReactNode }) {
  return <small className="platform-validation-note">{children}</small>;
}

function DisabledReason({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return <small className="platform-disabled-reason">{children}</small>;
}

function policyPackItems(pack: PlatformPolicyPackListItem | null | undefined) {
  return pack?.items ?? [];
}

function defaultPolicyItemPayload(itemType: string) {
  if (itemType === "leave_type") {
    return JSON.stringify({ code: "casual-leave", name: "Casual Leave", category: "paid", unit: "day" }, null, 2);
  }
  if (itemType === "leave_policy") {
    return JSON.stringify({ code: "casual-leave-policy", name: "Casual Leave Policy", leave_type_item_key: "casual-leave-type", annual_entitlement: "12.00", allow_half_day: true }, null, 2);
  }
  if (itemType === "shift") {
    return JSON.stringify({ code: "general-shift", name: "General Shift", start_time: "09:00:00", end_time: "18:00:00", working_hours: "8.00", weekly_off_days: ["sunday"] }, null, 2);
  }
  if (itemType === "holiday_calendar") {
    return JSON.stringify({ code: "india-2026", name: "India 2026", year: 2026, holidays: [{ date: "2026-01-26", name: "Republic Day", holiday_type: "compulsory" }] }, null, 2);
  }
  if (itemType === "attendance_policy") {
    return JSON.stringify({ code: "office-attendance", name: "Office Attendance", default_shift_item_key: "general-shift", holiday_calendar_item_key: "india-2026", full_day_min_hours: "8.00", half_day_min_hours: "4.00" }, null, 2);
  }
  return "{}";
}

function payloadValue(payload: Record<string, unknown> | undefined, key: string, fallback = "") {
  const value = payload?.[key];
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function payloadBoolean(payload: Record<string, unknown> | undefined, key: string, fallback = false) {
  const value = payload?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function payloadJsonArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildGuidedPolicyItemPayload(formData: FormData, itemType: string) {
  const advancedPayload = formValue(formData, "payload");
  if (advancedPayload.trim()) {
    return JSON.parse(advancedPayload);
  }
  if (itemType === "leave_type") {
    return {
      code: formValue(formData, "payload_code"),
      name: formValue(formData, "payload_name"),
      category: formValue(formData, "payload_category") || "paid",
      unit: formValue(formData, "payload_unit") || "day",
      requires_attachment: formData.has("payload_requires_attachment"),
      allow_negative_balance: formData.has("payload_allow_negative_balance"),
      is_approval_required: formData.has("payload_is_approval_required"),
    };
  }
  if (itemType === "leave_policy") {
    return {
      code: formValue(formData, "payload_code"),
      name: formValue(formData, "payload_name"),
      leave_type_item_key: formValue(formData, "payload_leave_type_item_key"),
      annual_entitlement: formValue(formData, "payload_annual_entitlement") || "0.00",
      min_days_per_request: formValue(formData, "payload_min_days_per_request") || "0.50",
      notice_days_required: Number(formValue(formData, "payload_notice_days_required") || "0"),
      allow_half_day: formData.has("payload_allow_half_day"),
    };
  }
  if (itemType === "shift") {
    return {
      code: formValue(formData, "payload_code"),
      name: formValue(formData, "payload_name"),
      start_time: formValue(formData, "payload_start_time") || "09:00:00",
      end_time: formValue(formData, "payload_end_time") || "18:00:00",
      working_hours: formValue(formData, "payload_working_hours") || "8.00",
      weekly_off_days: payloadJsonArray(formValue(formData, "payload_weekly_off_days") || "sunday"),
    };
  }
  if (itemType === "holiday_calendar") {
    return {
      code: formValue(formData, "payload_code"),
      name: formValue(formData, "payload_name"),
      year: Number(formValue(formData, "payload_year") || new Date().getFullYear()),
      holidays: [],
    };
  }
  if (itemType === "attendance_policy") {
    return {
      code: formValue(formData, "payload_code"),
      name: formValue(formData, "payload_name"),
      default_shift_item_key: formValue(formData, "payload_default_shift_item_key"),
      holiday_calendar_item_key: formValue(formData, "payload_holiday_calendar_item_key"),
      full_day_min_hours: formValue(formData, "payload_full_day_min_hours") || "8.00",
      half_day_min_hours: formValue(formData, "payload_half_day_min_hours") || "4.00",
      allow_regularization: formData.has("payload_allow_regularization"),
      require_regularization_reason: formData.has("payload_require_regularization_reason"),
    };
  }
  return {};
}

function formDataFromNamedControls(container: HTMLElement) {
  const formData = new FormData();
  container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[name]").forEach((control) => {
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      if (control.checked) formData.append(control.name, control.value || "on");
      return;
    }
    formData.set(control.name, control.value);
  });
  return formData;
}

function GuidedPolicyItemFields({ itemType, payload }: { itemType: string; payload?: Record<string, unknown> }) {
  const code = payloadValue(payload, "code");
  const name = payloadValue(payload, "name");

  return (
    <div className="platform-guided-payload">
      <div className="platform-guided-payload__header">
        <strong>Guided payload fields</strong>
        <span className="muted">{titleCase(itemType)} setup details used during tenant adoption.</span>
      </div>
      <label className="form-field"><span className="muted">Runtime code</span><input className="input-control" name="payload_code" required defaultValue={code} placeholder="casual-leave" /></label>
      <label className="form-field"><span className="muted">Runtime name</span><input className="input-control" name="payload_name" required defaultValue={name} placeholder="Casual Leave" /></label>
      {itemType === "leave_type" ? (
        <>
          <label className="form-field"><span className="muted">Category</span><select className="input-control" name="payload_category" defaultValue={payloadValue(payload, "category", "paid")}><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="sick">Sick</option><option value="vacation">Vacation</option><option value="compensatory">Compensatory</option><option value="maternity">Maternity</option><option value="paternity">Paternity</option><option value="special">Special</option></select></label>
          <label className="form-field"><span className="muted">Unit</span><select className="input-control" name="payload_unit" defaultValue={payloadValue(payload, "unit", "day")}><option value="day">Day</option><option value="hour">Hour</option></select></label>
          <label className="form-field"><span className="muted">Requires attachment</span><input name="payload_requires_attachment" type="checkbox" defaultChecked={payloadBoolean(payload, "requires_attachment")} /></label>
          <label className="form-field"><span className="muted">Allow negative balance</span><input name="payload_allow_negative_balance" type="checkbox" defaultChecked={payloadBoolean(payload, "allow_negative_balance")} /></label>
          <label className="form-field"><span className="muted">Approval required</span><input name="payload_is_approval_required" type="checkbox" defaultChecked={payloadBoolean(payload, "is_approval_required", true)} /></label>
        </>
      ) : null}
      {itemType === "leave_policy" ? (
        <>
          <label className="form-field"><span className="muted">Leave type item key</span><input className="input-control" name="payload_leave_type_item_key" required defaultValue={payloadValue(payload, "leave_type_item_key")} placeholder="casual-leave-type" /></label>
          <label className="form-field"><span className="muted">Annual entitlement</span><input className="input-control" name="payload_annual_entitlement" defaultValue={payloadValue(payload, "annual_entitlement", "12.00")} /></label>
          <label className="form-field"><span className="muted">Minimum request days</span><input className="input-control" name="payload_min_days_per_request" defaultValue={payloadValue(payload, "min_days_per_request", "0.50")} /></label>
          <label className="form-field"><span className="muted">Notice days</span><input className="input-control" name="payload_notice_days_required" defaultValue={payloadValue(payload, "notice_days_required", "0")} min={0} type="number" /></label>
          <label className="form-field"><span className="muted">Allow half day</span><input name="payload_allow_half_day" type="checkbox" defaultChecked={payloadBoolean(payload, "allow_half_day", true)} /></label>
        </>
      ) : null}
      {itemType === "shift" ? (
        <>
          <label className="form-field"><span className="muted">Start time</span><input className="input-control" name="payload_start_time" defaultValue={payloadValue(payload, "start_time", "09:00:00")} /></label>
          <label className="form-field"><span className="muted">End time</span><input className="input-control" name="payload_end_time" defaultValue={payloadValue(payload, "end_time", "18:00:00")} /></label>
          <label className="form-field"><span className="muted">Working hours</span><input className="input-control" name="payload_working_hours" defaultValue={payloadValue(payload, "working_hours", "8.00")} /></label>
          <label className="form-field"><span className="muted">Weekly off days</span><input className="input-control" name="payload_weekly_off_days" defaultValue={payloadValue(payload, "weekly_off_days", "sunday")} /></label>
        </>
      ) : null}
      {itemType === "holiday_calendar" ? (
        <label className="form-field"><span className="muted">Year</span><input className="input-control" name="payload_year" defaultValue={payloadValue(payload, "year", String(new Date().getFullYear()))} min={2000} type="number" /></label>
      ) : null}
      {itemType === "attendance_policy" ? (
        <>
          <label className="form-field"><span className="muted">Default shift item key</span><input className="input-control" name="payload_default_shift_item_key" defaultValue={payloadValue(payload, "default_shift_item_key")} placeholder="general-shift" /></label>
          <label className="form-field"><span className="muted">Holiday calendar item key</span><input className="input-control" name="payload_holiday_calendar_item_key" defaultValue={payloadValue(payload, "holiday_calendar_item_key")} placeholder="india-2026" /></label>
          <label className="form-field"><span className="muted">Full day min hours</span><input className="input-control" name="payload_full_day_min_hours" defaultValue={payloadValue(payload, "full_day_min_hours", "8.00")} /></label>
          <label className="form-field"><span className="muted">Half day min hours</span><input className="input-control" name="payload_half_day_min_hours" defaultValue={payloadValue(payload, "half_day_min_hours", "4.00")} /></label>
          <label className="form-field"><span className="muted">Allow regularization</span><input name="payload_allow_regularization" type="checkbox" defaultChecked={payloadBoolean(payload, "allow_regularization", true)} /></label>
          <label className="form-field"><span className="muted">Require regularization reason</span><input name="payload_require_regularization_reason" type="checkbox" defaultChecked={payloadBoolean(payload, "require_regularization_reason", true)} /></label>
        </>
      ) : null}
      <details className="platform-advanced-json">
        <summary>Advanced JSON override</summary>
        <label className="form-field platform-template-item-payload">
          <span className="muted">Payload JSON</span>
          <textarea className="input-control" name="payload" defaultValue="" rows={8} placeholder={defaultPolicyItemPayload(itemType)} />
          <ValidationNote>Optional. Leave blank to use guided fields. Fill this only when the template needs fields not shown above.</ValidationNote>
        </label>
      </details>
    </div>
  );
}

function FilterSummary({
  activeFilters,
  defaultLabel,
  label,
  onReset,
  total,
  visible,
}: {
  activeFilters: string[];
  defaultLabel?: string;
  label: string;
  onReset: () => void;
  total: number;
  visible: number;
}) {
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="platform-filter-summary" aria-live="polite">
      <div>
        <strong>{visible}</strong>
        <span> of {total} {label}</span>
      </div>
      <span className="platform-filter-summary__context">
        {hasActiveFilters ? `Filtered by ${activeFilters.join(", ")}` : defaultLabel || "Showing all records"}
      </span>
      {hasActiveFilters ? (
        <button className="button button--secondary" type="button" onClick={onReset}>
          Reset filters
        </button>
      ) : null}
    </div>
  );
}

function clampPage(page: number, totalCount: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  return Math.min(Math.max(page, 1), totalPages);
}

function paginate<T>(items: T[], page: number) {
  const safePage = clampPage(page, items.length);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    items: items.slice(start, start + PAGE_SIZE),
    page: safePage,
    hasPrevious: safePage > 1,
    hasNext: safePage * PAGE_SIZE < items.length,
  };
}

function buildPanelHref(panel: PlatformPanel, selectedTenantId?: string, feedback?: string) {
  const panelPaths: Record<PlatformPanel, string> = {
    control: "/platform-admin",
    leads: "/platform-admin/leads",
    tenants: "/platform-admin/tenants",
    launch: "/platform-admin/launch",
    onboarding: "/platform-admin/onboarding",
    admins: "/platform-admin/admins",
    "policy-packs": "/platform-admin/policy-packs",
    events: "/platform-admin/audit-logs",
  };
  const params = new URLSearchParams();
  if (selectedTenantId) params.set("tenantId", selectedTenantId);
  if (feedback) params.set("feedback", feedback);
  const query = params.toString();
  return query ? `${panelPaths[panel]}?${query}` : panelPaths[panel];
}

function leadUrgency(lead: PlatformPublicLead) {
  if (lead.status === "new") return "Review now";
  if (lead.status === "qualified") return "Create tenant";
  if (lead.status === "reviewing") return "Follow up";
  return titleCase(lead.status);
}

function leadCodeSuggestion(lead: PlatformPublicLead) {
  return lead.company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "new-tenant";
}

function leadDomainSuggestion(lead: PlatformPublicLead) {
  const emailDomain = lead.work_email.split("@")[1]?.toLowerCase() ?? "";
  if (emailDomain && !emailDomain.endsWith(".example")) return emailDomain;
  return "";
}

export function PlatformAdminConsole({ initialPanel, initialMessage = "", initialEventQuery = "", initialEventType = "all", leads, tenants, selectedTenant, onboarding, policyPacks, summary }: Props) {
  const router = useRouter();
  const createTenantFirstFieldRef = useRef<HTMLInputElement>(null);
  const addContactFirstFieldRef = useRef<HTMLInputElement>(null);
  const [busyRef, setBusyRef] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [leadQuery, setLeadQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("active");
  const [tenantQuery, setTenantQuery] = useState("");
  const [policyPackQuery, setPolicyPackQuery] = useState("");
  const [eventQuery, setEventQuery] = useState(initialEventQuery);
  const [tenantStatusFilter, setTenantStatusFilter] = useState("all");
  const [tenantPlanFilter, setTenantPlanFilter] = useState("all");
  const [policyPackStatusFilter, setPolicyPackStatusFilter] = useState("all");
  const [policyPackDomainFilter, setPolicyPackDomainFilter] = useState("all");
  const [selectedPolicyPackId, setSelectedPolicyPackId] = useState("");
  const [policyPackItemType, setPolicyPackItemType] = useState("leave_type");
  const [editingPolicyPackItemId, setEditingPolicyPackItemId] = useState("");
  const [policyPackPreview, setPolicyPackPreview] = useState<PlatformPolicyPackAdoptionPreview | null>(null);
  const [policyPackAdoptionResult, setPolicyPackAdoptionResult] = useState<PlatformPolicyPackAdoptionResult | null>(null);
  const [policyPackUpgradeCompare, setPolicyPackUpgradeCompare] = useState<PlatformPolicyPackUpgradeCompare | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState(initialEventType);
  const [editingContactId, setEditingContactId] = useState("");
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<PlatformOnboardingEvent | null>(null);
  const [leadPage, setLeadPage] = useState(1);
  const [tenantPage, setTenantPage] = useState(1);
  const [policyPackPage, setPolicyPackPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);

  const tenantCounts = useMemo(() => {
    return {
      active: summary.counts.active_tenants,
      onboarding: summary.counts.onboarding_tenants,
      sandbox: summary.counts.sandbox_tenants,
      handoffReady: summary.counts.handoff_ready_tenants,
      baselinePending: summary.counts.baseline_pending_tenants,
      publishedPacks: summary.counts.published_policy_packs,
    };
  }, [summary]);

  const provisionableContacts = onboarding?.admin_contacts.filter((contact) => !contact.membership_id) ?? [];
  const primaryContact = onboarding?.admin_contacts.find((contact) => contact.is_primary) ?? onboarding?.admin_contacts[0] ?? null;
  const hasProvisionedPrimaryAdmin = Boolean(primaryContact?.membership_id);
  const primaryAdminMembershipBlocked = Boolean(primaryContact?.membership_status && ["suspended", "revoked"].includes(primaryContact.membership_status));
  const primaryAdminUserInactive = primaryContact?.user_is_active === false;
  const hasUsablePrimaryAdmin = Boolean(hasProvisionedPrimaryAdmin && !primaryAdminMembershipBlocked && !primaryAdminUserInactive);
  const primaryAdminAccessDetail = hasUsablePrimaryAdmin
    ? `${primaryContact?.email || "Primary tenant admin"} has usable tenant access.`
    : hasProvisionedPrimaryAdmin
      ? `${primaryContact?.email || "Primary tenant admin"} has login access, but the user or membership is not active.`
      : primaryContact
        ? `Create login access for ${primaryContact.email}.`
        : "Add a primary tenant admin contact before creating login access.";
  const hasBaseline = Boolean(onboarding?.baseline_published_at);
  const canMarkHandoff = Boolean(selectedTenant && hasBaseline && hasUsablePrimaryAdmin);
  const canActivateTenant = Boolean(selectedTenant && onboarding?.handoff_completed_at && hasUsablePrimaryAdmin);
  const provisionedContactCount = onboarding?.admin_contacts.filter((contact) => Boolean(contact.membership_id)).length ?? 0;
  const publishedPacks = useMemo(() => policyPacks.filter((pack) => pack.status === "published"), [policyPacks]);
  const draftPacks = useMemo(() => policyPacks.filter((pack) => pack.status === "draft"), [policyPacks]);
  const selectedPolicyPack = policyPacks.find((pack) => pack.id === selectedPolicyPackId) ?? publishedPacks[0] ?? policyPacks[0] ?? null;
  const selectedPolicyPackIsDraft = selectedPolicyPack?.status === "draft";
  const selectedPolicyPackIsPublished = selectedPolicyPack?.status === "published";
  const selectedPolicyPackItems = policyPackItems(selectedPolicyPack);
  const selectedPolicyPackItemTypes = selectedPolicyPack
    ? Array.from(new Set(selectedPolicyPackItems.map((item) => item.item_type)))
    : [];
  const publishedPackCount = initialPanel === "policy-packs" ? publishedPacks.length : tenantCounts.publishedPacks;
  const canAdoptBaseline = Boolean(selectedTenant && selectedPolicyPackIsPublished);
  const previewMatchesSelection = Boolean(
    policyPackPreview &&
    selectedTenant &&
    selectedPolicyPack &&
    policyPackPreview.tenant_id === selectedTenant.id &&
    policyPackPreview.policy_pack_id === selectedPolicyPack.id,
  );
  const upgradeCompareMatchesSelection = Boolean(
    policyPackUpgradeCompare &&
    selectedTenant &&
    selectedPolicyPack &&
    policyPackUpgradeCompare.tenant_id === selectedTenant.id &&
    policyPackUpgradeCompare.target_policy_pack_id === selectedPolicyPack.id,
  );
  const canApplyPreviewedTemplate = Boolean(canAdoptBaseline && previewMatchesSelection && policyPackPreview?.can_apply);
  const canApplyComparedUpgrade = Boolean(canAdoptBaseline && upgradeCompareMatchesSelection && policyPackUpgradeCompare?.can_upgrade);
  const selectedTemplateNextAction = !policyPacks.length
    ? { title: "Create the first setup template", detail: "Define a draft template before tenant setup can be standardized.", label: "Create below" }
    : selectedPolicyPackIsDraft && !selectedPolicyPackItems.length
      ? { title: "Add the first setup item", detail: `${selectedPolicyPack?.name ?? "The selected draft"} has no governed setup content yet.`, label: "Add item below" }
      : selectedPolicyPackIsDraft
        ? { title: "Review and publish the draft", detail: `${selectedPolicyPack?.name ?? "The selected template"} has ${selectedPolicyPackItems.length} ordered item${selectedPolicyPackItems.length === 1 ? "" : "s"}.`, label: "Publish from register" }
        : !policyPackPreview && !policyPackAdoptionResult
          ? { title: "Preview tenant impact", detail: `Review what ${selectedPolicyPack?.name ?? "the selected template"} will create for ${selectedTenant?.name ?? "the selected tenant"}.`, label: "Preview below" }
          : policyPackPreview && !policyPackPreview.can_apply
            ? { title: "Resolve preview blockers", detail: "Review conflicts and blocked dependencies before applying this template.", label: "Review impact" }
            : policyPackAdoptionResult
              ? { title: "Review adoption evidence", detail: "The confirmed result records created, updated, skipped, and failed items.", label: "Review result" }
              : { title: "Apply the previewed template", detail: "The current preview is ready and matches the selected tenant and template version.", label: "Apply below" };
  const guidedChecklist = selectedTenant && onboarding ? [
    {
      status: "done" as const,
      title: "Customer record created",
      detail: `${selectedTenant.name} exists in the tenant registry.`,
      actionHref: buildPanelHref("tenants", selectedTenant.id),
      actionLabel: "Review tenant",
    },
    {
      status: hasBaseline ? "done" as const : publishedPackCount ? "needed" as const : "blocked" as const,
      title: "Apply setup template",
      detail: hasBaseline
        ? `Initial setup was confirmed ${formatDateTime(onboarding.baseline_published_at)}.`
        : publishedPackCount
          ? "Choose a published setup template and apply it to this tenant."
          : "Publish at least one setup template before this tenant can receive initial setup.",
      actionHref: buildPanelHref("policy-packs", selectedTenant.id),
      actionLabel: hasBaseline ? "View templates" : "Apply template",
    },
    {
      status: hasUsablePrimaryAdmin ? "done" as const : primaryContact ? "needed" as const : "blocked" as const,
      title: "Create tenant admin login",
      detail: primaryAdminAccessDetail,
      actionHref: buildPanelHref("admins", selectedTenant.id),
      actionLabel: hasUsablePrimaryAdmin ? "View admin users" : primaryContact ? "Create login access" : "Add admin contact",
    },
    {
      status: onboarding.handoff_completed_at ? "done" as const : canMarkHandoff ? "needed" as const : "blocked" as const,
      title: "Complete go-live handoff",
      detail: onboarding.handoff_completed_at
        ? `Customer readiness was marked ${formatDateTime(onboarding.handoff_completed_at)}.`
        : canMarkHandoff
          ? "Setup and primary admin access are complete. Mark this customer ready."
          : "Complete setup template and tenant admin login before marking ready.",
      actionHref: buildPanelHref("onboarding", selectedTenant.id),
      actionLabel: onboarding.handoff_completed_at ? "View readiness" : "Open launch readiness",
    },
    {
      status: selectedTenant.status === "active" ? "done" as const : canActivateTenant ? "needed" as const : "blocked" as const,
      title: "Activate tenant",
      detail: selectedTenant.status === "active"
        ? "Tenant is active and available for customer use."
        : canActivateTenant
          ? "Readiness is complete. Activate the tenant when the customer is ready to begin."
          : "Mark the customer ready for tenant admin before activation.",
      actionHref: buildPanelHref("onboarding", selectedTenant.id),
      actionLabel: selectedTenant.status === "active" ? "View active tenant" : "Open launch checklist",
    },
  ] : [];
  const nextGuidedStep = guidedChecklist.find((step) => step.status !== "done") ?? guidedChecklist.at(-1) ?? null;
  const events = onboarding?.recent_events ?? [];
  const normalizedLeadQuery = leadQuery.trim().toLowerCase();
  const normalizedTenantQuery = tenantQuery.trim().toLowerCase();
  const normalizedPolicyPackQuery = policyPackQuery.trim().toLowerCase();
  const normalizedEventQuery = normalizedSearchText(eventQuery.trim());
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = normalizedLeadQuery
      ? [lead.company_name, lead.contact_name, lead.work_email, lead.intent, lead.status, lead.preferred_plan, lead.industry].join(" ").toLowerCase().includes(normalizedLeadQuery)
      : true;
    const matchesStatus =
      leadStatusFilter === "all" ||
      (leadStatusFilter === "active" && ["new", "reviewing", "qualified"].includes(lead.status)) ||
      lead.status === leadStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch = normalizedTenantQuery
      ? [tenant.name, tenant.code, tenant.primary_domain, tenant.subscription_plan, tenant.status, tenant.onboarding_status].join(" ").toLowerCase().includes(normalizedTenantQuery)
      : true;
    const matchesStatus = tenantStatusFilter === "all" || tenant.status === tenantStatusFilter || tenant.onboarding_status === tenantStatusFilter;
    const matchesPlan = tenantPlanFilter === "all" || tenant.subscription_plan === tenantPlanFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });
  const filteredPolicyPacks = policyPacks.filter((pack) => {
    const matchesSearch = normalizedPolicyPackQuery
      ? [pack.name, pack.code, pack.domain, pack.status, pack.country_code, pack.industry_tag].join(" ").toLowerCase().includes(normalizedPolicyPackQuery)
      : true;
    const matchesStatus = policyPackStatusFilter === "all" || pack.status === policyPackStatusFilter;
    const matchesDomain = policyPackDomainFilter === "all" || pack.domain === policyPackDomainFilter;
    return matchesSearch && matchesStatus && matchesDomain;
  });
  const filteredEvents = events.filter((event) => {
    const evidenceText = JSON.stringify(redactAuditPayload(event.payload ?? {}));
    const matchesSearch = normalizedEventQuery
      ? [event.event_type, event.summary, event.actor_identifier, event.created_at, evidenceText, onboarding?.tenant_code, onboarding?.tenant_name]
          .map(normalizedSearchText)
          .join(" ")
          .includes(normalizedEventQuery)
      : true;
    const matchesType = eventTypeFilter === "all" || event.event_type === eventTypeFilter;
    return matchesSearch && matchesType;
  });
  const leadPageData = paginate(filteredLeads, leadPage);
  const tenantPageData = paginate(filteredTenants, tenantPage);
  const policyPackPageData = paginate(filteredPolicyPacks, policyPackPage);
  const eventPageData = paginate(filteredEvents, eventPage);
  const leadActiveFilters = [
    normalizedLeadQuery ? `search "${leadQuery.trim()}"` : "",
    leadStatusFilter !== "active" ? `status ${leadStatusFilter === "all" ? "all leads" : titleCase(leadStatusFilter)}` : "",
  ].filter(Boolean);
  const tenantActiveFilters = [
    normalizedTenantQuery ? `search "${tenantQuery.trim()}"` : "",
    tenantStatusFilter !== "all" ? `status ${titleCase(tenantStatusFilter)}` : "",
    tenantPlanFilter !== "all" ? `plan ${titleCase(tenantPlanFilter)}` : "",
  ].filter(Boolean);
  const policyPackActiveFilters = [
    normalizedPolicyPackQuery ? `search "${policyPackQuery.trim()}"` : "",
    policyPackStatusFilter !== "all" ? `status ${titleCase(policyPackStatusFilter)}` : "",
    policyPackDomainFilter !== "all" ? `domain ${titleCase(policyPackDomainFilter)}` : "",
  ].filter(Boolean);
  const eventActiveFilters = [
    normalizedEventQuery ? `search "${eventQuery.trim()}"` : "",
    eventTypeFilter !== "all" ? `type ${titleCase(eventTypeFilter)}` : "",
  ].filter(Boolean);
  const activeLeads = leads.filter((lead) => ["new", "reviewing", "qualified"].includes(lead.status));
  const newLeads = leads.filter((lead) => lead.status === "new");
  const qualifiedLeads = leads.filter((lead) => lead.status === "qualified");
  const convertedLeads = leads.filter((lead) => lead.status === "converted");
  const eventTypes = Array.from(new Set([
    ...events.map((event) => event.event_type),
    ...(initialEventType !== "all" ? [initialEventType] : []),
  ])).sort();
  const auditActorCount = new Set(events.map((event) => event.actor_identifier || "system")).size;
  const latestAuditEvent = events[0] ?? null;
  const auditNextAction = !selectedTenant
    ? { title: "Select a tenant", detail: "Choose a tenant before reviewing its platform evidence.", label: "Open tenant register" }
    : !events.length
      ? { title: "Complete a governed tenant action", detail: "This tenant has no onboarding evidence yet. Complete setup, access, or readiness work to create an audit trail.", label: "Open tenant setup" }
      : !filteredEvents.length
        ? { title: "Broaden the evidence scope", detail: "The selected search and event type have no matches in this tenant's recent evidence.", label: "Reset filters" }
        : { title: "Review the latest evidence", detail: `${titleCase(latestAuditEvent?.event_type ?? "event")} was recorded ${formatDateTime(latestAuditEvent?.created_at ?? null)}.`, label: "Review below" };
  const staleOnboardingTenants = initialPanel === "tenants"
    ? tenants.filter((tenant) => !["active", "handoff_ready"].includes(tenant.onboarding_status)).slice(0, 5)
    : summary.stale_onboarding_tenants;
  const leadQueue = initialPanel === "leads"
    ? [...newLeads, ...qualifiedLeads, ...activeLeads.filter((lead) => !["new", "qualified"].includes(lead.status))].slice(0, 5)
    : summary.lead_queue;
  const controlRisks = [
    {
      label: "New public leads",
      value: summary.counts.new_leads,
      action: "Review and qualify inbound requests.",
      href: buildPanelHref("leads", selectedTenant?.id),
    },
    {
      label: "Tenants not active",
      value: tenantCounts.onboarding,
      action: "Move prepared tenants through setup confirmation, admin access, readiness, and activation.",
      href: buildPanelHref("tenants", selectedTenant?.id),
    },
    {
      label: "Published setup templates",
      value: tenantCounts.publishedPacks,
      action: tenantCounts.publishedPacks ? "Apply setup templates for onboarding tenants." : "Publish at least one setup template before marking a customer ready.",
      href: buildPanelHref("policy-packs", selectedTenant?.id),
    },
  ];
  const tabCounts = {
    control: summary.counts.active_leads + tenantCounts.onboarding,
    leads: summary.counts.active_leads,
    tenants: summary.counts.tenants,
    launch: selectedTenant && onboarding ? 1 : 0,
    onboarding: selectedTenant && onboarding ? 2 : 0,
    admins: onboarding?.admin_contacts.length ?? 0,
    policyPacks: summary.counts.policy_packs,
    events: events.length,
  };
  const activeGuide = panelGuides[initialPanel];
  const pageTitle = initialPanel === "control" ? "Platform Admin Dashboard" : activeGuide.title;
  const pageDescription =
    initialPanel === "control"
      ? "A simple control center for public leads, tenant readiness, setup templates, admin access, and activation blockers."
      : activeGuide.description;

  useEffect(() => {
    if (showCreateTenantModal) {
      createTenantFirstFieldRef.current?.focus();
    }
    if (showAddContactModal) {
      addContactFirstFieldRef.current?.focus();
    }
  }, [showAddContactModal, showCreateTenantModal]);



  async function mutate<T>(path: string, method: MutationMethod, body: Record<string, unknown>, successMessage: string): Promise<T> {
    setBusyRef(path);
    setError("");
    setMessage("");
    setGeneratedPassword("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(apiErrorMessage(payload, "Platform action failed."));
      }
      setMessage(successMessage);
      router.refresh();
      return payload as T;
    } finally {
      setBusyRef("");
    }
  }

  async function handleTenantCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFieldErrors: Record<string, string> = {};
    if (!formValue(formData, "code")) nextFieldErrors.createTenantCode = "Tenant code is required.";
    if (!formValue(formData, "name")) nextFieldErrors.createTenantName = "Tenant name is required.";
    const primaryEmail = formValue(formData, "primary_email");
    if (primaryEmail && !emailLooksValid(primaryEmail)) nextFieldErrors.createTenantEmail = "Primary email must be a valid email address.";
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted platform tenant fields before continuing.");
      setMessage("");
      createTenantFirstFieldRef.current?.focus();
      return;
    }
    setFieldErrors({});
    try {
      const payload = await mutate<PlatformTenantListItem>(
        "/api/platform/tenants",
        "POST",
        {
          code: formValue(formData, "code"),
          name: formValue(formData, "name"),
          legal_name: formValue(formData, "legal_name"),
          primary_domain: formValue(formData, "primary_domain"),
          primary_email: formValue(formData, "primary_email"),
          primary_phone: formValue(formData, "primary_phone"),
          timezone: formValue(formData, "timezone") || "Asia/Kolkata",
          country_code: formValue(formData, "country_code") || "IN",
          subscription_plan: formValue(formData, "subscription_plan") || "starter",
          seed_pack: formValue(formData, "seed_pack") || "standard_office",
          is_sandbox: formData.has("is_sandbox"),
        },
        "Tenant created.",
      );
      setShowCreateTenantModal(false);
      router.push(buildPanelHref("onboarding", payload.id, "tenant-created"));
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the tenant register before retrying; your entered values remain in this dialog."));
    }
  }

  async function handleLeadStatus(leadId: string, status: string) {
    try {
      await mutate(`/api/platform/leads/${leadId}`, "PATCH", { status }, `Lead marked ${titleCase(status)}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Lead update failed.");
    }
  }

  function requestLeadStatus(lead: PlatformPublicLead, status: string) {
    if (status !== "closed") {
      void handleLeadStatus(lead.id, status);
      return;
    }
    setConfirmAction({
      title: "Close this lead?",
      description: `${lead.company_name} will leave the active lead queue. You can still find it later by showing closed leads.`,
      confirmLabel: "Close lead",
      tone: "danger",
      run: () => handleLeadStatus(lead.id, status),
    });
  }

  async function handleLeadConvert(event: React.FormEvent<HTMLFormElement>, leadId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!formValue(formData, "code")) {
      setFieldErrors({ [`leadConvertCode:${leadId}`]: "Tenant code is required before converting a lead." });
      setError("Fix the highlighted lead conversion fields before continuing.");
      setMessage("");
      return;
    }
    setFieldErrors({});
    try {
      const payload = await mutate<{ tenant?: PlatformTenantListItem }>(
        `/api/platform/leads/${leadId}/convert`,
        "POST",
        {
          code: formValue(formData, "code"),
          primary_domain: formValue(formData, "primary_domain"),
          subscription_plan: formValue(formData, "subscription_plan") || "growth",
          seed_pack: formValue(formData, "seed_pack") || "standard_office",
          is_sandbox: formData.has("is_sandbox"),
          owner_mode: formValue(formData, "owner_mode") || "combined_platform_admin",
          setup_style: formValue(formData, "setup_style") || "platform_assisted",
          data_setup_style: formValue(formData, "data_setup_style") || "manual",
          policy_control_style: formValue(formData, "policy_control_style") || "mixed",
          admin_job_title: formValue(formData, "admin_job_title"),
          notes: formValue(formData, "notes"),
        },
        "Lead converted to tenant.",
      );
      if (payload.tenant?.id) {
        router.push(buildPanelHref("admins", payload.tenant.id));
      }
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the tenant register and this lead before retrying; your entered values remain here."));
    }
  }

  async function handleTenantPatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(event.currentTarget);
    const nextFieldErrors: Record<string, string> = {};
    if (!formValue(formData, "name")) nextFieldErrors.tenantSetupName = "Tenant name is required.";
    const primaryEmail = formValue(formData, "primary_email");
    if (primaryEmail && !emailLooksValid(primaryEmail)) nextFieldErrors.tenantSetupEmail = "Primary email must be a valid email address.";
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted tenant setup fields before continuing.");
      setMessage("");
      return;
    }
    setFieldErrors({});
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}`,
        "PATCH",
        {
          name: formValue(formData, "name"),
          legal_name: formValue(formData, "legal_name"),
          status: formValue(formData, "status"),
          subscription_plan: formValue(formData, "subscription_plan"),
          seed_pack: formValue(formData, "seed_pack"),
          primary_email: formValue(formData, "primary_email"),
          primary_phone: formValue(formData, "primary_phone"),
          timezone: formValue(formData, "timezone"),
          country_code: formValue(formData, "country_code"),
          primary_domain: formValue(formData, "primary_domain"),
          is_sandbox: formData.has("is_sandbox"),
        },
        "Tenant updated.",
      );
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the tenant record before retrying; your entered values remain here."));
    }
  }

  async function handleOnboardingPatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(event.currentTarget);
    const nextFieldErrors: Record<string, string> = {};
    if (!formValue(formData, "country_context")) nextFieldErrors.onboardingCountry = "Country context is required.";
    if (!formValue(formData, "industry_context")) nextFieldErrors.onboardingIndustry = "Industry context is required.";
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted onboarding metadata fields before continuing.");
      setMessage("");
      return;
    }
    setFieldErrors({});
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}/onboarding`,
        "PATCH",
        {
          owner_mode: formValue(formData, "owner_mode"),
          setup_style: formValue(formData, "setup_style"),
          data_setup_style: formValue(formData, "data_setup_style"),
          policy_control_style: formValue(formData, "policy_control_style"),
          country_context: formValue(formData, "country_context"),
          industry_context: formValue(formData, "industry_context"),
          notes: formValue(formData, "notes"),
          internal_handoff_notes: formValue(formData, "internal_handoff_notes"),
          customer_handoff_notes: formValue(formData, "customer_handoff_notes"),
        },
        "Onboarding metadata updated.",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Onboarding update failed.");
    }
  }

  async function handleContactCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextFieldErrors: Record<string, string> = {};
    if (!formValue(formData, "full_name")) nextFieldErrors.addContactName = "Admin contact full name is required.";
    const email = formValue(formData, "email");
    if (!email) nextFieldErrors.addContactEmail = "Admin contact email is required.";
    else if (!emailLooksValid(email)) nextFieldErrors.addContactEmail = "Admin contact email must be valid.";
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted admin contact fields before continuing.");
      setMessage("");
      addContactFirstFieldRef.current?.focus();
      return;
    }
    setFieldErrors({});
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}/admin-contacts`,
        "POST",
        {
          full_name: formValue(formData, "full_name"),
          email: formValue(formData, "email"),
          phone_number: formValue(formData, "phone_number"),
          job_title: formValue(formData, "job_title"),
          is_primary: formData.has("is_primary"),
          notes: formValue(formData, "notes"),
        },
        "Admin contact added.",
      );
      setShowAddContactModal(false);
      form.reset();
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the admin contact list before retrying; your entered values remain in this dialog."));
    }
  }

  async function handleContactPatch(event: React.FormEvent<HTMLFormElement>, contactId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFieldErrors: Record<string, string> = {};
    if (!formValue(formData, "full_name")) nextFieldErrors[`editContactName:${contactId}`] = "Admin contact full name is required.";
    const email = formValue(formData, "email");
    if (!email) nextFieldErrors[`editContactEmail:${contactId}`] = "Admin contact email is required.";
    else if (!emailLooksValid(email)) nextFieldErrors[`editContactEmail:${contactId}`] = "Admin contact email must be valid.";
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted admin contact fields before continuing.");
      setMessage("");
      return;
    }
    setFieldErrors({});
    try {
      await mutate(
        `/api/platform/admin-contacts/${contactId}`,
        "PATCH",
        {
          full_name: formValue(formData, "full_name"),
          email: formValue(formData, "email"),
          phone_number: formValue(formData, "phone_number"),
          job_title: formValue(formData, "job_title"),
          is_primary: formData.has("is_primary"),
          notes: formValue(formData, "notes"),
        },
        "Admin contact updated.",
      );
      setEditingContactId("");
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check this contact before retrying; your entered values remain here."));
    }
  }

  async function handleProvision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const contactId = formValue(formData, "contact_id");
    const nextFieldErrors: Record<string, string> = {};
    if (!contactId) nextFieldErrors.provisionContact = "Contact is required.";
    if (!formValue(formData, "username")) nextFieldErrors.provisionUsername = "Username is required.";
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted tenant admin login fields before continuing.");
      setMessage("");
      return;
    }
    setFieldErrors({});
    try {
      const payload = await mutate<{ generated_password?: string }>(
        `/api/platform/admin-contacts/${contactId}/provision-user`,
        "POST",
        {
          username: formValue(formData, "username"),
          role_code: formValue(formData, "role_code") || "hr-admin",
          role_name: formValue(formData, "role_name"),
          password: formValue(formData, "password"),
          must_change_password: formData.has("must_change_password"),
          is_user_active: formData.has("is_user_active"),
          membership_status: formValue(formData, "membership_status") || "active",
        },
        "First admin provisioned.",
      );
      if (payload.generated_password) {
        setGeneratedPassword(payload.generated_password);
      }
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the contact access status before retrying. A confirmed response is required before any generated password can be shown."));
    }
  }

  async function handlePolicyPackCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextFieldErrors: Record<string, string> = {};
    if (!formValue(formData, "code")) nextFieldErrors.policyPackCode = "Template code is required.";
    if (!formValue(formData, "name")) nextFieldErrors.policyPackName = "Template name is required.";
    if (!isWholeNumberAtLeast(formValue(formData, "version") || "1", 1)) nextFieldErrors.policyPackVersion = "Template version must be a whole number greater than or equal to 1.";
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted setup template fields before continuing.");
      setMessage("");
      return;
    }
    setFieldErrors({});
    try {
      await mutate(
        "/api/platform-policy-packs",
        "POST",
        {
          code: formValue(formData, "code"),
          name: formValue(formData, "name"),
          domain: formValue(formData, "domain") || "leave",
          country_code: formValue(formData, "country_code"),
          industry_tag: formValue(formData, "industry_tag"),
          description: formValue(formData, "description"),
          status: formValue(formData, "status") || "draft",
          version: Number(formValue(formData, "version") || "1"),
          is_active: formData.has("is_active"),
        },
        "Policy pack created.",
      );
      form.reset();
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the template register before retrying; the form values remain available."));
    }
  }

  async function handlePolicyPackItemCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const packId = formValue(formData, "item_policy_pack_id");
    if (!packId) return;
    let payload: unknown;
    const itemType = formValue(formData, "item_type") || "leave_type";
    try {
      payload = buildGuidedPolicyItemPayload(formData, itemType);
    } catch {
      setError("Item payload must be valid JSON.");
      return;
    }
    const dependencyKeys = formValue(formData, "dependency_keys")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      await mutate(
        `/api/platform-policy-packs/${packId}/items`,
        "POST",
        {
          item_type: formValue(formData, "item_type") || "leave_type",
          item_key: formValue(formData, "item_key"),
          name: formValue(formData, "name"),
          payload,
          dependency_keys: dependencyKeys,
          sort_order: Number(formValue(formData, "sort_order") || "0"),
          is_required: formData.has("is_required"),
        },
        "Setup template item added.",
      );
      form.reset();
      setPolicyPackItemType("leave_type");
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the selected draft before retrying; the item values remain available."));
    }
  }

  async function handlePolicyPackItemPatch(formData: FormData, packId: string, itemId: string) {
    let payload: unknown;
    const itemType = formValue(formData, "item_type") || "leave_type";
    try {
      payload = buildGuidedPolicyItemPayload(formData, itemType);
    } catch {
      setError("Item payload must be valid JSON.");
      return;
    }
    const dependencyKeys = formValue(formData, "dependency_keys")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      await mutate(
        `/api/platform-policy-packs/${packId}/items/${itemId}`,
        "PATCH",
        {
          item_type: formValue(formData, "item_type") || "leave_type",
          item_key: formValue(formData, "item_key"),
          name: formValue(formData, "name"),
          payload,
          dependency_keys: dependencyKeys,
          sort_order: Number(formValue(formData, "sort_order") || "0"),
          is_required: formData.has("is_required"),
        },
        "Setup template item updated.",
      );
      setSelectedPolicyPackId(packId);
      setEditingPolicyPackItemId("");
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the selected draft item before retrying."));
    }
  }

  function handlePolicyPackItemPatchClick(event: React.MouseEvent<HTMLButtonElement>, packId: string, itemId: string) {
    const container = event.currentTarget.closest("[data-policy-pack-item-edit]") as HTMLElement | null;
    if (!container) return;
    void handlePolicyPackItemPatch(formDataFromNamedControls(container), packId, itemId);
  }

  async function handlePolicyPackItemDelete(packId: string, itemId: string) {
    try {
      await mutate(`/api/platform-policy-packs/${packId}/items/${itemId}`, "DELETE", {}, "Setup template item deleted.");
      if (editingPolicyPackItemId === itemId) {
        setEditingPolicyPackItemId("");
      }
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check whether the draft item still exists before retrying."));
    }
  }

  function requestDeletePolicyPackItem(pack: PlatformPolicyPackListItem, item: PlatformPolicyPackItem) {
    setConfirmAction({
      title: "Delete setup template item?",
      description: `${item.name || titleCase(item.item_key)} will be removed from draft template ${pack.name}. This cannot be undone after confirming.`,
      confirmLabel: "Delete item",
      tone: "danger",
      run: () => handlePolicyPackItemDelete(pack.id, item.id),
    });
  }

  async function handlePublishPack(packId: string, options?: { allowHeaderOnly?: boolean }) {
    try {
      await mutate(
        `/api/platform-policy-packs/${packId}/publish`,
        "POST",
        options?.allowHeaderOnly ? { allow_header_only: true } : {},
        "Policy pack published.",
      );
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the template status before retrying publish."));
    }
  }

  function requestPublishPack(pack: PlatformPolicyPackListItem) {
    const isHeaderOnly = pack.item_count === 0;
    setConfirmAction({
      title: isHeaderOnly ? "Publish header-only setup template?" : "Publish setup template?",
      description: isHeaderOnly
        ? `${pack.name} has no setup items. It can still be published as an evidence-only baseline, but applying it will not create tenant leave, attendance, shift, or calendar records.`
        : `${pack.name} will become available for tenant setup with ${pack.item_count} setup item${pack.item_count === 1 ? "" : "s"}. Publish only after the template has been reviewed.`,
      confirmLabel: isHeaderOnly ? "Publish header-only" : "Publish template",
      tone: isHeaderOnly ? "danger" : "default",
      run: () => handlePublishPack(pack.id, { allowHeaderOnly: isHeaderOnly }),
    });
  }

  async function handleClonePolicyPackVersion(packId: string) {
    try {
      const payload = await mutate<PlatformPolicyPackListItem>(
        `/api/platform-policy-packs/${packId}/clone-version`,
        "POST",
        {},
        "New draft template version created.",
      );
      setSelectedPolicyPackId(payload.id);
      setEditingPolicyPackItemId("");
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the template lineage for a new draft version before retrying."));
    }
  }

  function requestClonePolicyPackVersion(pack: PlatformPolicyPackListItem) {
    setConfirmAction({
      title: "Create a new draft version?",
      description: `${pack.name} v${pack.version} will be copied into a new draft version with the same items and delegation rules. Existing published/adopted tenants stay linked to v${pack.version}.`,
      confirmLabel: "Create version",
      run: () => handleClonePolicyPackVersion(pack.id),
    });
  }

  async function handleAdoptionPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(event.currentTarget);
    const packId = formValue(formData, "policy_pack_id");
    if (!packId) return;
    try {
      const payload = await mutate<PlatformPolicyPackAdoptionPreview>(
        `/api/platform-policy-packs/${packId}/adoption-preview`,
        "POST",
        {
          tenant_id: selectedTenant.id,
          adoption_mode: formValue(formData, "adoption_mode") || "clone_to_tenant_records",
        },
        "Setup template impact preview completed.",
      );
      setPolicyPackPreview(payload);
      setPolicyPackAdoptionResult(null);
      setPolicyPackUpgradeCompare(null);
    } catch (nextError) {
      setPolicyPackPreview(null);
      setError(actionErrorMessage(nextError, "The impact preview could not be confirmed. No template was applied; run preview again when the connection is stable."));
    }
  }

  async function handleUpgradeCompare(form: HTMLFormElement) {
    if (!selectedTenant) return;
    const formData = new FormData(form);
    const packId = formValue(formData, "policy_pack_id");
    if (!packId) return;
    try {
      const payload = await mutate<PlatformPolicyPackUpgradeCompare>(
        `/api/platform-policy-packs/${packId}/upgrade-compare`,
        "POST",
        { tenant_id: selectedTenant.id },
        "Tenant setup template version compared.",
      );
      setPolicyPackUpgradeCompare(payload);
      setPolicyPackPreview(null);
      setPolicyPackAdoptionResult(null);
    } catch (nextError) {
      setPolicyPackUpgradeCompare(null);
      setError(actionErrorMessage(nextError, "The version comparison could not be confirmed. No upgrade was applied."));
    }
  }

  async function handleUpgradeApply(form: HTMLFormElement) {
    if (!selectedTenant) return;
    const formData = new FormData(form);
    const packId = formValue(formData, "policy_pack_id");
    if (!packId) return;
    try {
      const payload = await mutate<PlatformPolicyPackAdoptionResult>(
        `/api/platform-policy-packs/${packId}/upgrade-apply`,
        "POST",
        {
          tenant_id: selectedTenant.id,
          notes: formValue(formData, "notes"),
        },
        "Setup template upgrade applied.",
      );
      setPolicyPackPreview(null);
      setPolicyPackUpgradeCompare(null);
      setPolicyPackAdoptionResult(payload);
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check the tenant adoption evidence and runtime records before retrying the upgrade."));
    }
  }

  async function handleAdoptPack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAdoptPack(event.currentTarget);
  }

  async function runAdoptPack(form: HTMLFormElement) {
    if (!selectedTenant) return;
    const formData = new FormData(form);
    const packId = formValue(formData, "policy_pack_id");
    if (!packId) return;
    try {
      const payload = await mutate<PlatformPolicyPackAdoptionResult>(
        `/api/platform-policy-packs/${packId}/adopt-for-tenant`,
        "POST",
        {
          tenant_id: selectedTenant.id,
          adoption_mode: formValue(formData, "adoption_mode") || "clone_to_tenant_records",
          notes: formValue(formData, "notes"),
        },
        "Policy pack adopted for tenant.",
      );
      setPolicyPackPreview(null);
      setPolicyPackAdoptionResult(payload);
      setPolicyPackUpgradeCompare(null);
    } catch (nextError) {
      setError(actionErrorMessage(nextError, "The response was interrupted. Check tenant adoption evidence and runtime records before retrying apply."));
    }
  }

  async function handleTenantAction(action: "mark-baseline-published" | "mark-handoff-ready" | "activate") {
    if (!selectedTenant) return;
    try {
      await mutate(
        `/api/platform/tenants/${selectedTenant.id}/onboarding/${action}`,
        "POST",
        {},
        titleCase(action),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Tenant state action failed.");
    }
  }

  function requestTenantAction(action: "mark-baseline-published" | "mark-handoff-ready" | "activate") {
    if (!selectedTenant) return;
    const copy = {
      "mark-baseline-published": {
        title: "Confirm initial setup?",
        description: `This records that ${selectedTenant.name} has received the initial setup/template baseline. Continue only after the setup is reviewed.`,
        confirmLabel: "Confirm setup",
      },
      "mark-handoff-ready": {
        title: "Mark customer ready?",
        description: `This records the go-live handoff point for ${selectedTenant.name}. Tenant admin access should already be created.`,
        confirmLabel: "Mark ready",
      },
      activate: {
        title: "Activate tenant?",
        description: `${selectedTenant.name} will become active for customer use. This should only happen after readiness and admin access are complete.`,
        confirmLabel: "Activate tenant",
      },
    }[action];
    setConfirmAction({
      ...copy,
      tone: action === "activate" ? "danger" : "default",
      run: () => handleTenantAction(action),
    });
  }

  return (
    <main aria-busy={Boolean(busyRef)} className={`shell platform-admin-shell platform-admin-shell--${initialPanel} accerio-page`}>
      <PageIntro appearance="accerio"
        eyebrow="Live platform operations"
        title={pageTitle}
        description={pageDescription}
        className="page-header-surface page-header-surface--compact"
        actions={
          <>
            {initialPanel !== "control" ? (
              <Link className="button button--secondary" href="/platform-admin">
                Dashboard
              </Link>
            ) : null}
            {initialPanel !== "tenants" ? (
              <Link className="button button--secondary" href={buildPanelHref("tenants", selectedTenant?.id)}>
                Tenants
              </Link>
            ) : null}
            {selectedTenant && initialPanel !== "onboarding" ? (
              <Link className="button button--primary" href={`/platform-admin/onboarding?tenantId=${selectedTenant.id}`}>
                Open selected tenant
              </Link>
            ) : null}
          </>
        }
        pills={panelPills[initialPanel]}
        showPills
      />
      {busyRef ? (
        <div className="form-status platform-admin-mutation-status" role="status" aria-live="polite" aria-atomic="true">
          <span className="async-action-button__spinner" aria-hidden="true" />
          <span>Saving the platform change. Controls will return when the server confirms it.</span>
        </div>
      ) : null}

      {["control", "leads", "tenants"].includes(initialPanel) ? (
        <section className="section platform-phase2-summary">
          <div
            aria-label={initialPanel === "control" ? "Platform operations summary" : initialPanel === "leads" ? "Lead queue summary" : "Tenant register summary"}
            className="tenant-access-summary-strip"
            role="group"
          >
            {initialPanel === "control" ? (
              <>
                <article><span>Open actions</span><strong>{tabCounts.control}</strong><small>Lead and tenant gates</small></article>
                <article><span>Active tenants</span><strong>{tenantCounts.active}</strong><small>{summary.counts.tenants} total tenants</small></article>
                <article><span>Onboarding</span><strong>{tenantCounts.onboarding}</strong><small>Not active yet</small></article>
                <article><span>Active leads</span><strong>{summary.counts.active_leads}</strong><small>{summary.counts.new_leads} new requests</small></article>
              </>
            ) : initialPanel === "leads" ? (
              <>
                <article><span>Active</span><strong>{activeLeads.length}</strong><small>Current review queue</small></article>
                <article><span>New</span><strong>{newLeads.length}</strong><small>Awaiting first review</small></article>
                <article><span>Qualified</span><strong>{qualifiedLeads.length}</strong><small>Ready for approval</small></article>
                <article><span>Converted</span><strong>{convertedLeads.length}</strong><small>Tenant evidence recorded</small></article>
              </>
            ) : (
              <>
                <article><span>Total tenants</span><strong>{summary.counts.tenants}</strong><small>Customer register</small></article>
                <article><span>Active</span><strong>{tenantCounts.active}</strong><small>Customer access enabled</small></article>
                <article><span>Onboarding</span><strong>{tenantCounts.onboarding}</strong><small>Lifecycle work remains</small></article>
                <article><span>Sandbox</span><strong>{tenantCounts.sandbox}</strong><small>Trial or test posture</small></article>
              </>
            )}
          </div>
        </section>
      ) : null}

      {initialPanel === "events" ? (
        <>
          <section className="section platform-phase2-summary">
            <div aria-label="Audit evidence summary" className="tenant-access-summary-strip" role="group">
              <article><span>Selected tenant</span><strong>{selectedTenant?.code ?? "None"}</strong><small>{selectedTenant?.name ?? "Choose a tenant"}</small></article>
              <article><span>Recent events</span><strong>{events.length}</strong><small>Loaded tenant evidence</small></article>
              <article><span>Event types</span><strong>{eventTypes.length}</strong><small>Distinct recorded actions</small></article>
              <article><span>Actors</span><strong>{auditActorCount}</strong><small>People and system actors</small></article>
            </div>
          </section>
          <section className="section">
            <div className="tenant-next-action-card">
              <div><span className="workspace-card__eyebrow">Next required action</span><h2>{auditNextAction.title}</h2><p className="tenant-section-copy">{auditNextAction.detail}</p></div>
              {!selectedTenant ? <Link className="button button--primary" href="/platform-admin/tenants">{auditNextAction.label}</Link> : !events.length ? <Link className="button button--primary" href={buildPanelHref("onboarding", selectedTenant.id)}>{auditNextAction.label}</Link> : !filteredEvents.length ? <button className="button button--secondary" type="button" onClick={() => { setEventQuery(""); setEventTypeFilter("all"); setEventPage(1); router.replace(buildPanelHref("events", selectedTenant.id)); }}>{auditNextAction.label}</button> : <span className="record-chip record-chip--accent">{auditNextAction.label}</span>}
            </div>
          </section>
        </>
      ) : null}

      {(message || error || generatedPassword) ? (
        <section className="section">
          <div
            aria-live={error ? "assertive" : "polite"}
            className={`notice platform-feedback${error ? " platform-feedback--error" : " platform-feedback--success"}`}
            role={error ? "alert" : "status"}
          >
            {message ? <strong>{message}</strong> : null}
            {error ? <strong>{error}</strong> : null}
            {generatedPassword ? <span className="muted">Generated password: {generatedPassword}</span> : null}
          </div>
        </section>
      ) : null}

      {["audit", "governance", "permissions"].includes(initialPanel) ? (
        <section className="section">
          <div className="tabbar" role="tablist" aria-label="Platform admin sections">
            {platformTabs.map((item) => (
              <Link
                aria-selected={initialPanel === item.panel}
                className={`tab ${initialPanel === item.panel ? "tab--active" : ""}`}
                href={buildPanelHref(item.panel, selectedTenant?.id)}
                key={item.panel}
                role="tab"
              >
                {item.label}
                <span>{tabCounts[item.countKey]}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {["audit", "governance", "permissions"].includes(initialPanel) ? <section className="section">
        <div className="platform-panel-guide" data-testid="platform-admin-panel-guide">
          <div>
            <span className="eyebrow">Selected workspace</span>
            <h2>{activeGuide.title}</h2>
            <p>{activeGuide.description}</p>
          </div>
          <ol aria-label={`${activeGuide.title} workflow`}>
            {activeGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section> : null}

      {initialPanel === "control" ? (
      <>
        <section className="section platform-control-center" data-testid="platform-admin-control-center">
          <article className="record-card platform-control-card platform-control-card--primary">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Mission queue</h2>
                <span className="record-chip">{leadQueue.length} priority leads</span>
              </div>
              <p className="section-copy">Inbound signup and contact requests that need platform operator action before tenant creation.</p>
            </div>
            <div className="tenant-support-access-list">
              {leadQueue.map((lead) => (
                <div className="platform-dashboard-row platform-dashboard-row--lead" key={lead.id}>
                  <div className="platform-dashboard-row__main">
                    <strong>{lead.company_name}</strong>
                    <span>{lead.contact_name} - {lead.work_email}</span>
                    <span>{lead.employee_count ? `${lead.employee_count} employees` : "Employee count not set"} - {lead.preferred_plan || "Plan not set"}</span>
                  </div>
                  <StatusChip value={lead.status} />
                  <span className="platform-state-pill">{leadUrgency(lead)}</span>
                  <Link className="button button--secondary" href={buildPanelHref("leads", selectedTenant?.id)}>Open queue</Link>
                </div>
              ))}
              {!leadQueue.length ? (
                <div className="notice notice--success">
                  <strong>No active public leads need review.</strong>
                  <span className="muted">New public signup and contact requests will land here.</span>
                </div>
              ) : null}
            </div>
          </article>

          <article className="record-card platform-control-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Tenant pipeline</h2>
                <span className="record-chip">{tenantCounts.onboarding} in motion</span>
              </div>
              <p className="section-copy">Launch posture across created, prepared, setup-confirmed, ready, sandbox, and active tenants.</p>
            </div>
            <div className="detail-grid">
              <DetailRow label="Active" value={tenantCounts.active} />
              <DetailRow label="Not active" value={tenantCounts.onboarding} />
              <DetailRow label="Setup pending" value={tenantCounts.baselinePending} />
              <DetailRow label="Go-live handoff ready" value={tenantCounts.handoffReady} />
              <DetailRow label="Sandbox" value={tenantCounts.sandbox} />
              <DetailRow label="Published packs" value={tenantCounts.publishedPacks} />
            </div>
            <div className="form-actions-bar">
              <span className="muted">Use tenant details to complete setup confirmation, tenant admin access, readiness, and activation.</span>
              <Link className="button button--primary" href={buildPanelHref("tenants", selectedTenant?.id)}>Open tenants</Link>
            </div>
          </article>
        </section>

        <section className="section platform-control-grid">
          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Risk radar</h2>
                <span className="record-chip">{controlRisks.filter((item) => Number(item.value) > 0).length} signals</span>
              </div>
              <p className="section-copy">Each signal explains the next action instead of just showing a number.</p>
            </div>
            <div className="tenant-support-access-list">
              {controlRisks.map((risk) => (
                <div className="platform-dashboard-row" key={risk.label}>
                  <div className="platform-dashboard-row__main">
                    <strong>{risk.label}</strong>
                    <span>{risk.action}</span>
                  </div>
                  <span className="platform-count-pill">{risk.value}</span>
                  <Link className="button button--secondary" href={risk.href}>Resolve</Link>
                </div>
              ))}
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Activation blockers</h2>
                <span className="record-chip">{staleOnboardingTenants.length} shown</span>
              </div>
              <p className="section-copy">Tenants that still need platform action before they become customer-ready.</p>
            </div>
            <div className="tenant-support-access-list">
              {staleOnboardingTenants.map((tenant) => (
                <div className="platform-dashboard-row" key={tenant.id}>
                  <div className="platform-dashboard-row__main">
                    <strong>{tenant.name}</strong>
                    <span>{tenant.code} - {tenant.primary_domain || "No domain"}</span>
                  </div>
                  <StatusChip value={tenant.onboarding_status} />
                  <Link className="button button--secondary" href={buildPanelHref("onboarding", tenant.id)}>Review</Link>
                </div>
              ))}
              {!staleOnboardingTenants.length ? (
                <div className="notice notice--success">
                  <strong>No tenant activation blockers in this view.</strong>
                  <span className="muted">Created and prepared tenants will appear here.</span>
                </div>
              ) : null}
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Command shortcuts</h2>
              </div>
              <p className="section-copy">Fast paths for the platform operator’s common decisions.</p>
            </div>
            <div className="platform-command-grid">
              <Link className="button button--primary" href={buildPanelHref("leads", selectedTenant?.id)}>Review leads</Link>
              <Link className="button button--secondary" href={buildPanelHref("tenants", selectedTenant?.id)}>Create tenant</Link>
              <Link className="button button--secondary" href={buildPanelHref("launch", selectedTenant?.id)}>Launch blueprint</Link>
              <Link className="button button--secondary" href={buildPanelHref("admins", selectedTenant?.id)}>Create admin access</Link>
              <Link className="button button--secondary" href={buildPanelHref("policy-packs", selectedTenant?.id)}>Setup templates</Link>
              <Link className="button button--secondary" href="/hr-admin/saas-operations">Ops health</Link>
              <Link className="button button--secondary" href="/hr-admin/saas-resilience">Resilience</Link>
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Evidence trail</h2>
              </div>
              <p className="section-copy">Operator proof for tenant setup, setup templates, support posture, and launch checks.</p>
            </div>
            <div className="detail-grid">
              <DetailRow label="Tenant events" value={events.length} />
              <DetailRow label="Setup templates" value={summary.counts.policy_packs} />
              <DetailRow label="Active leads" value={summary.counts.active_leads} />
              <DetailRow label="Selected tenant" value={selectedTenant?.code || "Not selected"} />
            </div>
            <div className="form-actions-bar">
              <span className="muted">Open events or SaaS operations when evidence is needed for signoff.</span>
              <Link className="button button--secondary" href={buildPanelHref("events", selectedTenant?.id)}>Open events</Link>
            </div>
          </article>
        </section>
      </>
      ) : null}

      {initialPanel === "leads" ? (
      <section className="section" data-testid="platform-admin-leads-panel">
        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Public signup and contact leads</h2>
              <span className="record-chip">{filteredLeads.length} visible</span>
            </div>
            <p className="section-copy">Review public requests, qualify them, then create tenants through the protected onboarding workflow.</p>
          </div>
          <label className="queue-toolbar__search">
            <span>Search</span>
            <input
              className="input-control"
              name="lead_search"
              onChange={(event) => {
                setLeadQuery(event.target.value);
                setLeadPage(1);
              }}
              placeholder="Company, contact, email, plan, status"
              value={leadQuery}
            />
          </label>
          <div className="platform-list-filters" aria-label="Lead filters">
            <label className="form-field">
              <span className="muted">Lead status</span>
              <select
                className="input-control"
                name="lead_status_filter"
                onChange={(event) => {
                  setLeadStatusFilter(event.target.value);
                  setLeadPage(1);
                }}
                value={leadStatusFilter}
              >
                <option value="active">Active leads</option>
                <option value="all">All leads</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>
          <FilterSummary
            activeFilters={leadActiveFilters}
            defaultLabel="Default view: active leads"
            label="leads"
            onReset={() => {
              setLeadQuery("");
              setLeadStatusFilter("active");
              setLeadPage(1);
            }}
            total={leads.length}
            visible={filteredLeads.length}
          />
          <p className="platform-local-filter-note">These controls narrow the loaded queue immediately. They reset when you leave or reload this page.</p>
          <div className="tenant-support-access-list">
            {leadPageData.items.map((lead) => (
              <div className="tenant-support-access-row tenant-support-access-row--stacked platform-lead-card" key={lead.id}>
                <div className="platform-lead-card__summary">
                  <div className="platform-lead-card__identity">
                    <strong>{lead.company_name}</strong>
                    <span>{lead.contact_name} - {lead.work_email}</span>
                    <span>{lead.phone_number || "No phone"}</span>
                  </div>
                  <div className="platform-lead-card__chips">
                    <StatusChip value={lead.status} />
                    <span className="record-chip">{titleCase(lead.intent)}</span>
                    <span className="record-chip">{formatDateTime(lead.created_at)}</span>
                  </div>
                  <div className="platform-lead-card__meta">
                    <span>{lead.employee_count ? `${lead.employee_count} employees` : "Employee count not set"}</span>
                    <span>{lead.preferred_plan || "Plan not set"}</span>
                    <span>{lead.industry || "Industry not set"}</span>
                  </div>
                  {lead.message ? <p className="platform-lead-card__message">{lead.message}</p> : null}
                  <div className="button-row platform-lead-card__actions">
                    <button className="button button--secondary" disabled={Boolean(busyRef) || lead.status === "reviewing"} type="button" onClick={() => requestLeadStatus(lead, "reviewing")}>Reviewing</button>
                    <button className="button button--secondary" disabled={Boolean(busyRef) || lead.status === "qualified"} type="button" onClick={() => requestLeadStatus(lead, "qualified")}>Qualified</button>
                    <button className="button button--danger" disabled={Boolean(busyRef) || lead.status === "closed" || Boolean(lead.converted_tenant_id)} type="button" onClick={() => requestLeadStatus(lead, "closed")}>Close</button>
                  </div>
                </div>
                {lead.converted_tenant_id ? (
                  <div className="notice notice--compact notice--success platform-lead-card__converted">
                    <strong>Converted tenant is ready for tenant admin access.</strong>
                    <Link className="button button--secondary" href={buildPanelHref("admins", lead.converted_tenant_id)}>
                      Open admin setup
                    </Link>
                  </div>
                ) : (
                  <form className="platform-lead-convert-form" noValidate onSubmit={(event) => handleLeadConvert(event, lead.id)}>
                    <div className="record-card__title">
                      <h3>Convert to tenant</h3>
                      <span className="record-chip">Approval controlled</span>
                    </div>
                    <div className="notice notice--compact platform-validation-strip platform-lead-convert-form__notice">
                      <strong>Before converting</strong>
                      <span className="muted">Confirm commercial approval, choose a unique tenant code, and keep sandbox on for trials.</span>
                    </div>
                    <div className="form-grid platform-lead-convert-form__grid">
                      <label className="form-field"><span className="muted">Tenant code</span><input aria-invalid={Boolean(fieldErrors[`leadConvertCode:${lead.id}`])} className="input-control" name="code" required defaultValue={leadCodeSuggestion(lead)} /><ValidationNote>Required and must be unique. Use lowercase letters, numbers, or hyphens.</ValidationNote>{fieldErrors[`leadConvertCode:${lead.id}`] ? <span className="field-error-text" role="alert">{fieldErrors[`leadConvertCode:${lead.id}`]}</span> : null}</label>
                      <label className="form-field"><span className="muted">Primary domain</span><input className="input-control" name="primary_domain" defaultValue={leadDomainSuggestion(lead)} placeholder="customer.example.com" /><ValidationNote>Optional during trial; add the real customer domain before production activation.</ValidationNote></label>
                      <label className="form-field"><span className="muted">Plan</span><select className="input-control" name="subscription_plan" defaultValue={lead.preferred_plan === "business" ? "enterprise" : lead.preferred_plan || "growth"}><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>
                      <label className="form-field"><span className="muted">Seed pack</span><select className="input-control" name="seed_pack" defaultValue="standard_office"><option value="standard_office">Standard Office</option><option value="shift_based">Shift Based Operations</option><option value="retail_field">Retail or Field Workforce</option><option value="professional_services">Professional Services</option></select></label>
                      <label className="form-field"><span className="muted">Owner mode</span><select className="input-control" name="owner_mode" defaultValue="combined_platform_admin"><option value="combined_platform_admin">Combined Platform Admin</option><option value="split_platform_roles">Split Platform Roles</option></select></label>
                      <label className="form-field"><span className="muted">Setup style</span><select className="input-control" name="setup_style" defaultValue="platform_assisted"><option value="platform_assisted">Platform Assisted</option><option value="shared">Shared</option><option value="customer_led">Customer Led</option></select></label>
                      <label className="form-field"><span className="muted">Data setup</span><select className="input-control" name="data_setup_style" defaultValue="manual"><option value="manual">Manual</option><option value="import_led">Import Led</option><option value="seeded_demo">Seeded Demo</option></select></label>
                      <label className="form-field"><span className="muted">Policy control</span><select className="input-control" name="policy_control_style" defaultValue="mixed"><option value="mostly_locked">Mostly Locked</option><option value="mostly_delegated">Mostly Delegated</option><option value="mixed">Mixed</option></select></label>
                      <label className="form-field"><span className="muted">Admin title</span><input className="input-control" name="admin_job_title" placeholder="Head of People" /></label>
                      <label className="form-field"><span className="muted">Sandbox</span><input name="is_sandbox" type="checkbox" defaultChecked /></label>
                      <label className="form-field platform-lead-convert-form__notes"><span className="muted">Conversion notes</span><textarea className="input-control" name="notes" placeholder="Commercial approval, pilot scope, or onboarding context." /></label>
                    </div>
                    <div className="form-actions-bar platform-lead-convert-form__actions">
                      <span className="muted">Creates tenant, primary admin contact, checklist evidence, and conversion audit.</span>
                      <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">
                        {busyRef === `/api/platform/leads/${lead.id}/convert` ? "Converting..." : "Convert lead"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
            {!filteredLeads.length ? (
              <div className="notice">
                <strong>No public leads match this view.</strong>
                <span className="muted">Public signup and contact submissions will appear here for platform review.</span>
              </div>
            ) : null}
          </div>
          <PaginationBar
            hasNext={leadPageData.hasNext}
            hasPrevious={leadPageData.hasPrevious}
            onFirst={() => setLeadPage(1)}
            onLast={() => setLeadPage(Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE)))}
            onNext={() => setLeadPage((current) => clampPage(current + 1, filteredLeads.length))}
            onPrevious={() => setLeadPage((current) => clampPage(current - 1, filteredLeads.length))}
            page={leadPageData.page}
            pageSize={PAGE_SIZE}
            totalCount={filteredLeads.length}
          />
          <div className="notice notice--compact">
            <strong>Approval remains controlled.</strong>
            <span className="muted">Use the Tenants tab to create the tenant only after the lead is qualified and commercials are approved.</span>
          </div>
        </article>
      </section>
      ) : null}

      {initialPanel === "tenants" ? (
      <section className="section employee-master-layout" data-testid="platform-admin-tenants-panel">
        <article className="queue-toolbar">
          <div className="queue-toolbar__header">
            <div>
              <h2>Tenant pipeline</h2>
              <p className="section-copy">Customer tenants, onboarding state, domain posture, and activation status.</p>
            </div>
            <span className="queue-summary-chip"><strong>{tenantCounts.sandbox}</strong> sandbox tenants</span>
          </div>
          <label className="queue-toolbar__search">
            <span>Search</span>
            <input
              className="input-control"
              name="tenant_search"
              onChange={(event) => {
                setTenantQuery(event.target.value);
                setTenantPage(1);
              }}
              placeholder="Tenant, domain, plan, status"
              value={tenantQuery}
            />
          </label>
          <div className="platform-list-filters" aria-label="Tenant filters">
            <label className="form-field">
              <span className="muted">Status</span>
              <select
                className="input-control"
                name="tenant_status_filter"
                onChange={(event) => {
                  setTenantStatusFilter(event.target.value);
                  setTenantPage(1);
                }}
                value={tenantStatusFilter}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="created">Created</option>
                <option value="prepared">Prepared</option>
                <option value="baseline_published">Initial setup confirmed</option>
                <option value="handoff_ready">Go-live handoff ready</option>
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Plan</span>
              <select
                className="input-control"
                name="tenant_plan_filter"
                onChange={(event) => {
                  setTenantPlanFilter(event.target.value);
                  setTenantPage(1);
                }}
                value={tenantPlanFilter}
              >
                <option value="all">All plans</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
          </div>

          <FilterSummary
            activeFilters={tenantActiveFilters}
            label="tenants"
            onReset={() => {
              setTenantQuery("");
              setTenantStatusFilter("all");
              setTenantPlanFilter("all");
              setTenantPage(1);
            }}
            total={tenants.length}
            visible={filteredTenants.length}
          />
          <p className="platform-local-filter-note">These controls narrow the loaded tenant register immediately. They reset when you leave or reload this page.</p>
          <div className="employee-directory-list">
            {tenantPageData.items.map((tenant) => (
              <div className={`employee-directory-item${selectedTenant?.id === tenant.id ? " employee-directory-item--active" : ""}`} key={tenant.id}>
                <Link href={buildPanelHref("onboarding", tenant.id)}>
                  <div className="employee-directory-item__header">
                    <div>
                      <strong>{tenant.name}</strong>
                      <p className="section-copy">{tenant.code}</p>
                    </div>
                    <StatusChip value={tenant.onboarding_status} />
                  </div>
                  <div className="employee-directory-item__meta">
                    <span>{tenant.primary_domain || "No domain"}</span>
                    <span>{titleCase(tenant.subscription_plan)}</span>
                    <span>{tenant.is_sandbox ? "Sandbox" : "Live-ready"}</span>
                  </div>
                </Link>
              </div>
            ))}
            {!filteredTenants.length ? (
              <div className="notice">
                <strong>{tenants.length ? "No tenants match this view." : "No tenants yet."}</strong>
                <span className="muted">{tenants.length ? "Reset the filters to return to the complete register." : "Create the first tenant when the customer context is ready."}</span>
              </div>
            ) : null}
          </div>
          <PaginationBar
            hasNext={tenantPageData.hasNext}
            hasPrevious={tenantPageData.hasPrevious}
            onFirst={() => setTenantPage(1)}
            onLast={() => setTenantPage(Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE)))}
            onNext={() => setTenantPage((current) => clampPage(current + 1, filteredTenants.length))}
            onPrevious={() => setTenantPage((current) => clampPage(current - 1, filteredTenants.length))}
            page={tenantPageData.page}
            pageSize={PAGE_SIZE}
            totalCount={filteredTenants.length}
          />
        </article>

        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Create tenant</h2>
              <span className="record-chip">Modal flow</span>
            </div>
            <p className="section-copy">Start a new customer onboarding record only when the commercial and implementation context is ready.</p>
          </div>
          <div className="detail-grid">
            <DetailRow label="Required" value="Code and name" />
            <DetailRow label="Recommended" value="Domain, email, phone" />
            <DetailRow label="Default mode" value="Sandbox" />
            <DetailRow label="After create" value="Onboarding gates" />
          </div>
          <div className="form-actions-bar">
            <span className="muted">The tenant form opens in a focused dialog with validation notes.</span>
            <button className="button button--primary" type="button" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setShowCreateTenantModal(true); }}>
              Create tenant
            </button>
          </div>
        </article>
      </section>
      ) : null}

      {initialPanel === "launch" && !(selectedTenant && onboarding) ? (
        <PlatformLaunchWorkspace onboarding={onboarding} selectedTenant={selectedTenant} />
      ) : null}

      {selectedTenant && onboarding ? (
        <>
          {initialPanel === "launch" ? (
            <PlatformLaunchWorkspace onboarding={onboarding} selectedTenant={selectedTenant} />
          ) : null}

          {initialPanel === "onboarding" ? (
          <section className="section platform-phase3-summary" data-testid="platform-onboarding-summary">
            <div aria-label="Launch readiness summary" className="tenant-access-summary-strip" role="group">
              <article><span>Tenant</span><strong>{selectedTenant.code}</strong><small>{titleCase(selectedTenant.status)}</small></article>
              <article><span>Initial setup</span><strong>{hasBaseline ? "Confirmed" : "Required"}</strong><small>{hasBaseline ? formatDateTime(onboarding.baseline_published_at) : "Apply a published template"}</small></article>
              <article><span>Admin access</span><strong>{hasUsablePrimaryAdmin ? "Ready" : "Required"}</strong><small>{primaryContact?.email || "Primary contact missing"}</small></article>
              <article><span>Handoff</span><strong>{onboarding.handoff_completed_at ? "Complete" : "Pending"}</strong><small>{selectedTenant.status === "active" ? "Tenant active" : "Activation gated"}</small></article>
            </div>
            {nextGuidedStep ? (
              <div className="platform-next-action" role="status">
                <div><span className="eyebrow">Next required action</span><strong>{nextGuidedStep.title}</strong><span>{nextGuidedStep.detail}</span></div>
                <Link className="button button--primary" href={nextGuidedStep.actionHref}>{nextGuidedStep.actionLabel}</Link>
              </div>
            ) : null}
          </section>
          ) : null}

          {initialPanel === "onboarding" ? (
          <section className="section support-session-grid platform-onboarding-overview-grid" data-testid="platform-admin-onboarding-panel">
            <article className="record-card platform-tenant-profile-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>{selectedTenant.name}</h2>
                  <StatusChip value={selectedTenant.status} />
                </div>
                <p className="section-copy">{selectedTenant.code}</p>
              </div>
              <div className="detail-grid">
                <DetailRow label="Onboarding Status" value={selectedTenant.onboarding_status} />
                <DetailRow label="Primary Domain" value={selectedTenant.primary_domain} />
                <DetailRow label="Plan" value={selectedTenant.subscription_plan} />
                <DetailRow label="Seed Pack" value={selectedTenant.seed_pack} />
                <DetailRow label="Country" value={selectedTenant.country_code} />
                <DetailRow label="Timezone" value={selectedTenant.timezone} />
              </div>
            </article>

            <article className="record-card platform-launch-readiness-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Launch readiness</h2>
                  <StatusChip value={onboarding.tenant_onboarding_status} />
                </div>
                <p className="section-copy">Follow these steps in order to make the customer ready for launch.</p>
              </div>
              <ol className="platform-guided-checklist" aria-label="Guided tenant launch checklist">
                {guidedChecklist.map((step, index) => (
                  <GuidedChecklistItem
                    actionHref={step.actionHref}
                    actionLabel={step.actionLabel}
                    detail={step.detail}
                    index={index + 1}
                    key={step.title}
                    status={step.status}
                    title={step.title}
                  />
                ))}
              </ol>
              <div className="platform-gate-divider" />
              <p className="section-copy">Readiness gates and timestamps</p>
              <ol className="platform-gate-checklist" aria-label="Activation gate validation checklist">
                <GateChecklistItem
                  complete={hasBaseline}
                  label="Initial setup confirmed"
                  detail={hasBaseline ? `Confirmed ${formatDateTime(onboarding.baseline_published_at)}` : "Apply a published setup template, then confirm setup."}
                />
                <GateChecklistItem
                  complete={hasUsablePrimaryAdmin}
                  label="Primary tenant admin has login access"
                  detail={primaryAdminAccessDetail}
                />
                <GateChecklistItem
                  complete={Boolean(onboarding.handoff_completed_at)}
                  label="Go-live handoff ready"
                  detail={onboarding.handoff_completed_at ? `Marked ${formatDateTime(onboarding.handoff_completed_at)}` : "Available after setup confirmation and primary admin access are complete."}
                />
              </ol>
              <div className="platform-readiness-actions" aria-label="Readiness actions">
                <div className="form-actions-bar">
                  <span className="muted">Setup confirmed at: {formatDateTime(onboarding.baseline_published_at)}</span>
                  <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => requestTenantAction("mark-baseline-published")}>Confirm setup</button>
                </div>
                <div className="form-actions-bar">
                  <span className="muted">Go-live handoff at: {formatDateTime(onboarding.handoff_completed_at)}</span>
                  <div className="platform-action-with-reason">
                    <button className="button button--secondary" disabled={Boolean(busyRef) || !canMarkHandoff} type="button" onClick={() => requestTenantAction("mark-handoff-ready")}>Mark ready</button>
                    <DisabledReason show={!canMarkHandoff}>
                      Needs confirmed initial setup and active primary admin login access.
                    </DisabledReason>
                  </div>
                </div>
                <div className="form-actions-bar">
                  <span className="muted">Primary admin: {primaryContact?.email || "Not set"}</span>
                  <div className="platform-action-with-reason">
                    <button className="button button--primary" disabled={Boolean(busyRef) || !canActivateTenant} type="button" onClick={() => requestTenantAction("activate")}>Activate tenant</button>
                    <DisabledReason show={!canActivateTenant}>
                      Needs go-live handoff and active primary admin login access.
                    </DisabledReason>
                  </div>
                </div>
              </div>
              {!hasBaseline ? (
                <div className="notice notice--compact platform-gate-next-step">
                  <strong>Initial setup must be confirmed first.</strong>
                  <span className="muted">Apply a published setup template, then confirm setup for this tenant.</span>
                  <Link className="button button--secondary" href={buildPanelHref("policy-packs", selectedTenant.id)}>Open setup templates</Link>
                </div>
              ) : null}
              {hasBaseline && !hasUsablePrimaryAdmin ? (
                <div className="notice notice--compact platform-gate-next-step">
                  <strong>Primary tenant admin needs usable login access before this customer can be marked ready.</strong>
                  <span className="muted">{primaryAdminAccessDetail}</span>
                  <Link className="button button--secondary" href={buildPanelHref("admins", selectedTenant.id)}>Open admin access</Link>
                </div>
              ) : null}
            </article>
          </section>
          ) : null}

          {initialPanel === "onboarding" ? (
          <section className="section support-session-grid platform-onboarding-forms-grid">
            <article className="record-card platform-onboarding-form-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Edit tenant setup</h2>
                </div>
                <p className="section-copy">Update tenant account fields and primary domain.</p>
              </div>
              <form className="form-grid platform-tenant-setup-form" noValidate onSubmit={handleTenantPatch}>
                <div className="notice notice--compact platform-validation-strip">
                  <strong>Tenant setup validation</strong>
                  <span className="muted">Save setup changes before confirming setup or marking the customer ready so the audit trail has the final customer context.</span>
                </div>
                <label className="form-field"><span className="muted">Name</span><input aria-invalid={Boolean(fieldErrors.tenantSetupName)} className="input-control" name="name" required defaultValue={selectedTenant.name} /><ValidationNote>Required. This appears in platform lists and customer setup screens.</ValidationNote>{fieldErrors.tenantSetupName ? <span className="field-error-text" role="alert">{fieldErrors.tenantSetupName}</span> : null}</label>
                <label className="form-field"><span className="muted">Legal name</span><input className="input-control" name="legal_name" defaultValue={selectedTenant.legal_name} /></label>
                <label className="form-field"><span className="muted">Status</span><select className="input-control" name="status" defaultValue={selectedTenant.status}><option value="draft">Draft</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
                <label className="form-field"><span className="muted">Plan</span><select className="input-control" name="subscription_plan" defaultValue={selectedTenant.subscription_plan}><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>
                <label className="form-field"><span className="muted">Seed pack</span><select className="input-control" name="seed_pack" defaultValue={selectedTenant.seed_pack}><option value="standard_office">Standard Office</option><option value="shift_based">Shift Based Operations</option><option value="retail_field">Retail or Field Workforce</option><option value="professional_services">Professional Services</option></select></label>
                <label className="form-field"><span className="muted">Primary email</span><input aria-invalid={Boolean(fieldErrors.tenantSetupEmail)} className="input-control" name="primary_email" type="email" defaultValue={selectedTenant.primary_email} />{fieldErrors.tenantSetupEmail ? <span className="field-error-text" role="alert">{fieldErrors.tenantSetupEmail}</span> : null}</label>
                <label className="form-field"><span className="muted">Primary phone</span><input className="input-control" name="primary_phone" defaultValue={selectedTenant.primary_phone} /></label>
                <label className="form-field"><span className="muted">Primary domain</span><input className="input-control" name="primary_domain" defaultValue={selectedTenant.primary_domain} /></label>
                <label className="form-field"><span className="muted">Timezone</span><input className="input-control" name="timezone" defaultValue={selectedTenant.timezone} /></label>
                <label className="form-field"><span className="muted">Country</span><input className="input-control" name="country_code" defaultValue={selectedTenant.country_code} maxLength={2} /></label>
                <label className="form-field platform-checkbox-field"><span className="muted">Sandbox</span><input name="is_sandbox" type="checkbox" defaultChecked={selectedTenant.is_sandbox} /></label>
                <div className="form-actions-bar">
                  <span className="muted">Tenant changes write onboarding event evidence.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Save tenant</button>
                </div>
              </form>
            </article>

            <article className="record-card platform-onboarding-form-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Add template item</h2>
                  <span className="record-chip">Content builder</span>
                </div>
                <p className="section-copy">Add cloneable setup artifacts to a template before publishing or applying it to tenants.</p>
              </div>
              <form className="form-grid platform-template-item-form" onSubmit={handlePolicyPackItemCreate}>
                <div className="notice notice--compact platform-validation-strip">
                  <strong>Item authoring</strong>
                  <span className="muted">Use valid JSON payloads. Dependencies should reference earlier item keys in the same template.</span>
                </div>
                <label className="form-field">
                  <span className="muted">Template</span>
                  <select className="input-control" name="item_policy_pack_id" required defaultValue={draftPacks[0]?.id ?? ""}>
                    <option value="">Select draft template</option>
                    {draftPacks.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} - {pack.code}</option>)}
                  </select>
                  <ValidationNote>Choose the draft template that should own this setup item. Published templates are locked.</ValidationNote>
                </label>
                <label className="form-field">
                  <span className="muted">Item type</span>
                  <select className="input-control" name="item_type" value={policyPackItemType} onChange={(event) => setPolicyPackItemType(event.target.value)}>
                    <option value="leave_type">Leave Type</option>
                    <option value="leave_policy">Leave Policy</option>
                    <option value="shift">Shift</option>
                    <option value="holiday_calendar">Holiday Calendar</option>
                    <option value="attendance_policy">Attendance Policy</option>
                  </select>
                </label>
                <label className="form-field">
                  <span className="muted">Item key</span>
                  <input className="input-control" name="item_key" required placeholder="casual-leave-type" />
                  <ValidationNote>Required and unique inside the selected template.</ValidationNote>
                </label>
                <label className="form-field">
                  <span className="muted">Name</span>
                  <input className="input-control" name="name" placeholder="Casual Leave" />
                </label>
                <label className="form-field">
                  <span className="muted">Sort order</span>
                  <input className="input-control" name="sort_order" defaultValue="10" min={0} type="number" />
                </label>
                <label className="form-field">
                  <span className="muted">Dependency keys</span>
                  <input className="input-control" name="dependency_keys" placeholder="casual-leave-type, general-shift" />
                  <ValidationNote>Comma-separated keys. Leave blank if this item stands alone.</ValidationNote>
                </label>
                <GuidedPolicyItemFields itemType={policyPackItemType} />
                <label className="form-field platform-checkbox-field"><span className="muted">Required</span><input name="is_required" type="checkbox" defaultChecked /></label>
                <div className="form-actions-bar">
                  <span className="muted">After adding items, publish the template and use the adoption preview before applying.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef) || !draftPacks.length} type="submit">Add item</button>
                </div>
              </form>
            </article>

            <article className="record-card platform-onboarding-form-card platform-onboarding-form-card--metadata">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Onboarding metadata</h2>
                </div>
                <p className="section-copy">Implementation model, setup style, data approach, and policy control posture.</p>
              </div>
              <form className="form-grid platform-onboarding-metadata-form" noValidate onSubmit={handleOnboardingPatch}>
                <div className="notice notice--compact platform-validation-strip">
                  <strong>Onboarding validation</strong>
                  <span className="muted">Choose who owns setup, how data enters the tenant, and whether policies are locked or delegated before the customer is marked ready.</span>
                </div>
                <label className="form-field"><span className="muted">Owner mode</span><select className="input-control" name="owner_mode" defaultValue={onboarding.owner_mode}><option value="combined_platform_admin">Combined Platform Admin</option><option value="split_platform_roles">Split Platform Roles</option></select></label>
                <label className="form-field"><span className="muted">Setup style</span><select className="input-control" name="setup_style" defaultValue={onboarding.setup_style}><option value="platform_assisted">Platform Assisted</option><option value="shared">Shared</option><option value="customer_led">Customer Led</option></select></label>
                <label className="form-field"><span className="muted">Data setup</span><select className="input-control" name="data_setup_style" defaultValue={onboarding.data_setup_style}><option value="manual">Manual</option><option value="import_led">Import Led</option><option value="seeded_demo">Seeded Demo</option></select></label>
                <label className="form-field"><span className="muted">Policy control</span><select className="input-control" name="policy_control_style" defaultValue={onboarding.policy_control_style}><option value="mostly_locked">Mostly Locked</option><option value="mostly_delegated">Mostly Delegated</option><option value="mixed">Mixed</option></select></label>
                <label className="form-field"><span className="muted">Country context</span><input aria-invalid={Boolean(fieldErrors.onboardingCountry)} className="input-control" name="country_context" defaultValue={onboarding.country_context} maxLength={2} />{fieldErrors.onboardingCountry ? <span className="field-error-text" role="alert">{fieldErrors.onboardingCountry}</span> : null}</label>
                <label className="form-field"><span className="muted">Industry</span><input aria-invalid={Boolean(fieldErrors.onboardingIndustry)} className="input-control" name="industry_context" defaultValue={onboarding.industry_context} />{fieldErrors.onboardingIndustry ? <span className="field-error-text" role="alert">{fieldErrors.onboardingIndustry}</span> : null}</label>
                <label className="form-field platform-form-field--tall"><span className="muted">Notes</span><textarea className="input-control" name="notes" defaultValue={onboarding.notes} /></label>
                <label className="form-field platform-form-field--tall"><span className="muted">Internal readiness notes</span><textarea className="input-control" name="internal_handoff_notes" defaultValue={onboarding.internal_handoff_notes} /></label>
                <label className="form-field platform-form-field--tall"><span className="muted">Customer readiness notes</span><textarea className="input-control" name="customer_handoff_notes" defaultValue={onboarding.customer_handoff_notes} /></label>
                <div className="form-actions-bar">
                  <span className="muted">Prepared tenants move out of created state.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Save onboarding</button>
                </div>
              </form>
            </article>
          </section>
          ) : null}

          {initialPanel === "admins" ? (
          <section className="section platform-phase3-summary" data-testid="platform-admin-access-summary">
            <div aria-label="Admin access summary" className="tenant-access-summary-strip" role="group">
              <article><span>Tenant</span><strong>{selectedTenant.code}</strong><small>{titleCase(selectedTenant.subscription_plan)}</small></article>
              <article><span>Contacts</span><strong>{onboarding.admin_contacts.length}</strong><small>{primaryContact ? "Primary contact assigned" : "Primary contact required"}</small></article>
              <article><span>Logins</span><strong>{provisionedContactCount}</strong><small>{provisionableContacts.length} ready to provision</small></article>
              <article><span>Primary access</span><strong>{hasUsablePrimaryAdmin ? "Usable" : "Required"}</strong><small>{hasUsablePrimaryAdmin ? "Readiness gate passed" : "Handoff remains gated"}</small></article>
            </div>
            <div className="platform-next-action" role="status">
              <div>
                <span className="eyebrow">Next required action</span>
                <strong>{hasUsablePrimaryAdmin ? "Review tenant readiness" : primaryContact ? "Create primary admin login" : "Add primary admin contact"}</strong>
                <span>{hasUsablePrimaryAdmin ? "Primary access is usable. Continue the governed readiness workflow." : primaryAdminAccessDetail}</span>
              </div>
              {hasUsablePrimaryAdmin ? (
                <Link className="button button--primary" href={buildPanelHref("onboarding", selectedTenant.id)}>Open readiness</Link>
              ) : (
                <button className="button button--primary" type="button" onClick={(triggerEvent) => { if (!primaryContact) { focusActionTrigger(triggerEvent); setShowAddContactModal(true); } else { document.querySelector<HTMLElement>("[name='contact_id']")?.focus(); } }}>
                  {primaryContact ? "Create login access" : "Add contact"}
                </button>
              )}
            </div>
          </section>
          ) : null}

          {initialPanel === "admins" ? (
          <section className="section support-session-grid platform-admin-users-grid" data-testid="platform-admin-admins-panel">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Admin contacts</h2>
                  <span className="record-chip">{onboarding.admin_contacts.length} contacts</span>
                </div>
                <p className="section-copy">Primary customer admin contact and login access state.</p>
              </div>
              <div className="tenant-support-access-list">
                {onboarding.admin_contacts.map((contact: PlatformOnboardingAdminContact) => (
                  <div className="tenant-support-access-row tenant-support-access-row--stacked" key={contact.id}>
                    {editingContactId === contact.id ? (
                      <form className="form-grid platform-contact-edit-form" noValidate onSubmit={(event) => handleContactPatch(event, contact.id)}>
                        <div className="notice notice--compact platform-validation-strip">
                          <strong>Edit contact validation</strong>
                          <span className="muted">This updates onboarding contact details. It does not reset the provisioned user password or role.</span>
                        </div>
                        <label className="form-field"><span className="muted">Full name</span><input aria-invalid={Boolean(fieldErrors[`editContactName:${contact.id}`])} className="input-control" name="full_name" required defaultValue={contact.full_name} /><ValidationNote>Required. Use the current customer-side admin owner.</ValidationNote>{fieldErrors[`editContactName:${contact.id}`] ? <span className="field-error-text" role="alert">{fieldErrors[`editContactName:${contact.id}`]}</span> : null}</label>
                        <label className="form-field"><span className="muted">Email</span><input aria-invalid={Boolean(fieldErrors[`editContactEmail:${contact.id}`])} className="input-control" name="email" required type="email" defaultValue={contact.email} /><ValidationNote>Required. For provisioned contacts, coordinate any login identity changes separately.</ValidationNote>{fieldErrors[`editContactEmail:${contact.id}`] ? <span className="field-error-text" role="alert">{fieldErrors[`editContactEmail:${contact.id}`]}</span> : null}</label>
                        <label className="form-field"><span className="muted">Phone</span><input className="input-control" name="phone_number" defaultValue={contact.phone_number} /></label>
                        <label className="form-field"><span className="muted">Job title</span><input className="input-control" name="job_title" defaultValue={contact.job_title} /></label>
                        <label className="form-field"><span className="muted">Primary</span><input name="is_primary" type="checkbox" defaultChecked={contact.is_primary} /></label>
                        <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" defaultValue={contact.notes} /></label>
                        <div className="form-actions-bar">
                          <span className="muted">Saving writes an admin contact update event.</span>
                          <div className="button-row">
                            <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setEditingContactId("")}>Cancel</button>
                            <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Save contact</button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <strong>{contact.full_name}</strong>
                          <span>{contact.email}</span>
                          <span>{contact.job_title || "Job title not set"} - {contact.phone_number || "Phone not set"}</span>
                        </div>
                        <StatusChip value={contact.provisioning_status} />
                        <span className="record-chip">{contact.is_primary ? "Primary" : "Secondary"}</span>
                        <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setEditingContactId(contact.id)}>Edit</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
                <div className="form-actions-bar">
                  <span className="muted">Add or edit contacts before creating the first tenant admin login.</span>
                  <button className="button button--primary" type="button" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setShowAddContactModal(true); }}>Add contact</button>
                </div>
            </article>

            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Create tenant admin login</h2>
                  <span className="record-chip">{provisionableContacts.length} ready</span>
                </div>
                <p className="section-copy">Create the tenant-scoped login and membership from a contact.</p>
              </div>
              <form className="form-grid platform-admin-provision-form" noValidate onSubmit={handleProvision}>
                {!provisionableContacts.length ? (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>No contacts are ready for login access.</strong>
                    <span className="muted">Add a primary contact first, or select a tenant whose primary contact does not already have login access.</span>
                  </div>
                ) : (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>Before creating login access</strong>
                    <span className="muted">Select the primary contact, choose the tenant role, and enter a password only if you do not want the system to generate one.</span>
                  </div>
                )}
                <label className="form-field"><span className="muted">Contact</span><select aria-invalid={Boolean(fieldErrors.provisionContact)} className="input-control" name="contact_id" defaultValue={primaryContact?.membership_id ? provisionableContacts[0]?.id ?? "" : primaryContact?.id ?? ""} required><option value="">Select contact</option>{provisionableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name} - {contact.email}</option>)}</select>{fieldErrors.provisionContact ? <span className="field-error-text" role="alert">{fieldErrors.provisionContact}</span> : null}</label>
                <label className="form-field"><span className="muted">Username</span><input aria-invalid={Boolean(fieldErrors.provisionUsername)} className="input-control" name="username" required placeholder="tenant01.admin" /><ValidationNote>Required and must be unique across logins.</ValidationNote>{fieldErrors.provisionUsername ? <span className="field-error-text" role="alert">{fieldErrors.provisionUsername}</span> : null}</label>
                <label className="form-field"><span className="muted">Role</span><select className="input-control" name="role_code" defaultValue="hr-admin"><option value="hr-admin">HR Admin</option><option value="tenant-admin">Tenant Admin</option></select></label>
                <label className="form-field"><span className="muted">Role name</span><input className="input-control" name="role_name" placeholder="HR Admin" /></label>
                <label className="form-field"><span className="muted">Password</span><input className="input-control" name="password" type="password" placeholder="Leave blank to generate" /></label>
                <label className="form-field"><span className="muted">Membership</span><select className="input-control" name="membership_status" defaultValue="active"><option value="active">Active</option><option value="invited">Invited</option></select></label>
                <label className="form-field"><span className="muted">Must change password</span><input name="must_change_password" type="checkbox" defaultChecked /></label>
                <label className="form-field"><span className="muted">User active</span><input name="is_user_active" type="checkbox" defaultChecked /></label>
                <div className="form-actions-bar">
                  <span className="muted">Creating login access completes the primary tenant-admin checklist item.</span>
                  <div className="platform-action-with-reason">
                    <button className="button button--primary" disabled={Boolean(busyRef) || !provisionableContacts.length} type="submit">Create login access</button>
                    <DisabledReason show={!provisionableContacts.length}>
                      Add a primary contact or select a tenant with an unprovisioned contact.
                    </DisabledReason>
                  </div>
                </div>
              </form>
            </article>
          </section>
          ) : null}

          {initialPanel === "policy-packs" ? (
          <section className="section platform-phase3-summary" data-testid="platform-policy-pack-summary">
            <div aria-label="Setup template summary" className="tenant-access-summary-strip" role="group">
              <article><span>Templates</span><strong>{policyPacks.length}</strong><small>Platform-owned versions</small></article>
              <article><span>Drafts</span><strong>{draftPacks.length}</strong><small>Editable before publish</small></article>
              <article><span>Published</span><strong>{publishedPacks.length}</strong><small>Available for adoption</small></article>
              <article><span>Selected tenant</span><strong>{selectedTenant.code}</strong><small>{selectedPolicyPack ? `${selectedPolicyPack.name} · ${titleCase(selectedPolicyPack.status)}` : "Choose a template"}</small></article>
            </div>
            <div className="platform-next-action" role="status">
              <div><span className="eyebrow">Next required action</span><strong>{selectedTemplateNextAction.title}</strong><span>{selectedTemplateNextAction.detail}</span></div>
              <a className="button button--primary" href="#platform-template-workspace">{selectedTemplateNextAction.label}</a>
            </div>
          </section>
          ) : null}

          {initialPanel === "policy-packs" ? (
          <section className="section support-session-grid platform-setup-workspace" data-testid="platform-admin-policy-packs-panel" id="platform-template-workspace">
            <article className="record-card platform-setup-list-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Setup templates</h2>
                  <span className="record-chip">{policyPacks.length} packs</span>
                </div>
                <p className="section-copy">Platform-owned setup templates available for tenant onboarding.</p>
              </div>
              <label className="queue-toolbar__search">
                <span>Search</span>
                <input
                  className="input-control"
                  name="policy_pack_search"
                  onChange={(event) => {
                    setPolicyPackQuery(event.target.value);
                    setPolicyPackPage(1);
                  }}
                  placeholder="Pack, code, domain, status"
                  value={policyPackQuery}
                />
              </label>
              <div className="platform-list-filters" aria-label="Setup template filters">
                <label className="form-field">
                  <span className="muted">Status</span>
                  <select
                    className="input-control"
                    name="policy_pack_status_filter"
                    onChange={(event) => {
                      setPolicyPackStatusFilter(event.target.value);
                      setPolicyPackPage(1);
                    }}
                    value={policyPackStatusFilter}
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="form-field">
                  <span className="muted">Domain</span>
                  <select
                    className="input-control"
                    name="policy_pack_domain_filter"
                    onChange={(event) => {
                      setPolicyPackDomainFilter(event.target.value);
                      setPolicyPackPage(1);
                    }}
                    value={policyPackDomainFilter}
                  >
                    <option value="all">All domains</option>
                    <option value="leave">Leave</option>
                    <option value="attendance">Attendance</option>
                    <option value="workflow">Workflow</option>
                    <option value="document">Document</option>
                  </select>
                </label>
              </div>
              <FilterSummary
                activeFilters={policyPackActiveFilters}
                label="setup templates"
                onReset={() => {
                  setPolicyPackQuery("");
                  setPolicyPackStatusFilter("all");
                  setPolicyPackDomainFilter("all");
                  setPolicyPackPage(1);
                }}
                total={policyPacks.length}
                visible={filteredPolicyPacks.length}
              />
              <div className="tenant-support-access-list">
                {policyPackPageData.items.map((pack) => (
                  <div className="tenant-support-access-row platform-template-row" key={pack.id}>
                    <div className="platform-template-row__summary">
                      <strong>{pack.name}</strong>
                      <span>{pack.code} - {titleCase(pack.domain)} - v{pack.version}</span>
                      <span>{pack.item_count ? `${pack.item_count} setup items` : "No setup items configured yet"} - {pack.adoption_count} tenant adoptions</span>
                      {pack.source_pack_code ? (
                        <span>Derived from {pack.source_pack_code} v{pack.source_pack_version ?? 1}</span>
                      ) : null}
                    </div>
                    <div className="platform-template-row__status">
                      <StatusChip value={pack.status} />
                      <span className="record-chip">{pack.item_count ? "Content ready" : "Header only"}</span>
                    </div>
                    <div className="platform-template-row-actions">
                      <div className="platform-action-with-reason">
                        <button className="button button--secondary" disabled={Boolean(busyRef) || pack.status === "published"} type="button" onClick={() => requestPublishPack(pack)}>Publish</button>
                        <DisabledReason show={pack.status === "published"}>
                          Already published.
                        </DisabledReason>
                      </div>
                      <div className="platform-action-with-reason">
                        <button className="button button--secondary" disabled={Boolean(busyRef) || pack.status !== "published"} type="button" onClick={() => requestClonePolicyPackVersion(pack)}>New version</button>
                        <DisabledReason show={pack.status !== "published"}>
                          Publish before versioning.
                        </DisabledReason>
                      </div>
                    </div>
                  </div>
                ))}
                {!filteredPolicyPacks.length ? (
                  <div className="notice">
                    <strong>No setup templates match this view.</strong>
                    <span className="muted">Create a template or clear the search.</span>
                  </div>
                ) : null}
              </div>
              <PaginationBar
                hasNext={policyPackPageData.hasNext}
                hasPrevious={policyPackPageData.hasPrevious}
                onFirst={() => setPolicyPackPage(1)}
                onLast={() => setPolicyPackPage(Math.max(1, Math.ceil(filteredPolicyPacks.length / PAGE_SIZE)))}
                onNext={() => setPolicyPackPage((current) => clampPage(current + 1, filteredPolicyPacks.length))}
                onPrevious={() => setPolicyPackPage((current) => clampPage(current - 1, filteredPolicyPacks.length))}
                page={policyPackPageData.page}
                pageSize={PAGE_SIZE}
                totalCount={filteredPolicyPacks.length}
              />
              <form className="form-grid platform-template-create-form" noValidate onSubmit={handlePolicyPackCreate}>
                <div className="notice notice--compact platform-validation-strip">
                  <strong>Template validation</strong>
                  <span className="muted">Create as draft while the setup is still changing. Only published templates can be applied to tenants.</span>
                </div>
                <label className="form-field"><span className="muted">Code</span><input aria-invalid={Boolean(fieldErrors.policyPackCode)} className="input-control" name="code" required placeholder="qa-setup-template" /><ValidationNote>Required and unique. Use a stable code because it appears in setup evidence.</ValidationNote>{fieldErrors.policyPackCode ? <span className="field-error-text" role="alert">{fieldErrors.policyPackCode}</span> : null}</label>
                <label className="form-field"><span className="muted">Name</span><input aria-invalid={Boolean(fieldErrors.policyPackName)} className="input-control" name="name" required placeholder="QA Setup Template" /><ValidationNote>Required. Use a name operators can recognize during tenant onboarding.</ValidationNote>{fieldErrors.policyPackName ? <span className="field-error-text" role="alert">{fieldErrors.policyPackName}</span> : null}</label>
                <label className="form-field"><span className="muted">Domain</span><select className="input-control" name="domain" defaultValue="leave"><option value="leave">Leave</option><option value="attendance">Attendance</option><option value="workflow">Workflow</option><option value="document">Document</option></select></label>
                <label className="form-field"><span className="muted">Status</span><select className="input-control" name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
                <label className="form-field"><span className="muted">Version</span><input aria-invalid={Boolean(fieldErrors.policyPackVersion)} className="input-control" name="version" defaultValue="1" min={1} type="number" />{fieldErrors.policyPackVersion ? <span className="field-error-text" role="alert">{fieldErrors.policyPackVersion}</span> : null}</label>
                <label className="form-field"><span className="muted">Country</span><input className="input-control" name="country_code" defaultValue="IN" maxLength={2} /></label>
                <label className="form-field"><span className="muted">Industry</span><input className="input-control" name="industry_tag" placeholder="technology" /></label>
                <label className="form-field platform-form-field--wide"><span className="muted">Description</span><textarea className="input-control" name="description" /></label>
                <label className="form-field platform-checkbox-field"><span className="muted">Active</span><input name="is_active" type="checkbox" defaultChecked /></label>
                <div className="form-actions-bar">
                  <span className="muted">Add items while the template is draft, then review and publish it for tenant adoption.</span>
                  <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Create template</button>
                </div>
              </form>
            </article>

            <article className="record-card platform-setup-apply-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Apply setup template</h2>
                  <span className="record-chip">{publishedPacks.length} published</span>
                </div>
                <p className="section-copy">Apply a published platform setup template to the selected tenant.</p>
              </div>
              <form className="form-grid platform-setup-adoption-form" onSubmit={handleAdoptionPreview}>
                {!canAdoptBaseline ? (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>Setup template cannot be applied yet.</strong>
                    <span className="muted">{selectedTenant ? "Publish at least one setup template before applying it." : "Select a tenant before applying a setup template."}</span>
                  </div>
                ) : (
                  <div className="notice notice--compact platform-validation-strip">
                    <strong>Before adoption</strong>
                    <span className="muted">Select a published template for the chosen tenant. Applying it creates setup evidence used by the readiness check.</span>
                  </div>
                )}
                <label className="form-field"><span className="muted">Template</span><select className="input-control" name="policy_pack_id" required value={selectedPolicyPack?.id ?? ""} onChange={(event) => { setSelectedPolicyPackId(event.target.value); setEditingPolicyPackItemId(""); setPolicyPackPreview(null); setPolicyPackAdoptionResult(null); setPolicyPackUpgradeCompare(null); }}><option value="">Select template</option>{policyPacks.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} - {pack.code} - {titleCase(pack.status)}</option>)}</select><ValidationNote>Draft templates can be edited here. Only published templates can be applied to tenants.</ValidationNote></label>
                <label className="form-field"><span className="muted">Apply mode</span><select className="input-control" name="adoption_mode" defaultValue="clone_to_tenant_records" onChange={() => { setPolicyPackPreview(null); setPolicyPackAdoptionResult(null); setPolicyPackUpgradeCompare(null); }}><option value="clone_to_tenant_records">Copy To Tenant Records</option><option value="baseline_plus_tenant_overrides">Template Plus Tenant Overrides</option><option value="baseline_only">Template Only</option></select></label>
                {selectedPolicyPack ? (
                  <div className="platform-template-preview">
                    <div className="record-card__title">
                      <h3>Adoption preview</h3>
                      <span className="record-chip">{selectedPolicyPack.item_count} items</span>
                    </div>
                    <p className="section-copy">
                      {selectedPolicyPack.item_count
                        ? selectedPolicyPackIsDraft
                          ? "Draft mode lets you edit or delete setup items before publishing this template for tenant adoption."
                          : "Copy mode will create tenant-owned runtime records from these template items and retain traceability links."
                        : "This template currently records baseline evidence only because no setup items are configured."}
                    </p>
                    <div className="platform-template-preview__chips">
                      {selectedPolicyPackItemTypes.length ? selectedPolicyPackItemTypes.map((itemType) => (
                        <span className="record-chip" key={itemType}>{titleCase(itemType)}</span>
                      )) : <span className="record-chip">No item types</span>}
                    </div>
                    {selectedPolicyPackItems.length ? (
                      <div className="platform-template-preview__items">
                        {selectedPolicyPackItems.slice(0, 6).map((item) => (
                          <div className={`platform-template-preview__item ${editingPolicyPackItemId === item.id ? "platform-template-preview__item--editing" : ""}`} key={item.id}>
                            {editingPolicyPackItemId === item.id && selectedPolicyPackIsDraft ? (
                              <div className="form-grid platform-template-preview__edit-form" data-policy-pack-item-edit>
                                <label className="form-field">
                                  <span className="muted">Item type</span>
                                  <input name="item_type" type="hidden" value={item.item_type} />
                                  <input className="input-control" readOnly value={titleCase(item.item_type)} />
                                  <ValidationNote>Delete and recreate the item if its type must change.</ValidationNote>
                                </label>
                                <label className="form-field"><span className="muted">Item key</span><input className="input-control" name="item_key" required defaultValue={item.item_key} /></label>
                                <label className="form-field"><span className="muted">Name</span><input className="input-control" name="name" defaultValue={item.name} /></label>
                                <label className="form-field"><span className="muted">Sort order</span><input className="input-control" name="sort_order" defaultValue={item.sort_order} min={0} type="number" /></label>
                                <label className="form-field"><span className="muted">Dependency keys</span><input className="input-control" name="dependency_keys" defaultValue={item.dependency_keys.join(", ")} /></label>
                                <GuidedPolicyItemFields itemType={item.item_type} payload={item.payload} />
                                <label className="form-field"><span className="muted">Required</span><input name="is_required" type="checkbox" defaultChecked={item.is_required} /></label>
                                <div className="form-actions-bar">
                                  <span className="muted">Saving keeps the item inside this draft template.</span>
                                  <div className="button-row">
                                    <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => setEditingPolicyPackItemId("")}>Cancel</button>
                                    <button className="button button--primary" disabled={Boolean(busyRef)} type="button" onClick={(event) => handlePolicyPackItemPatchClick(event, selectedPolicyPack.id, item.id)}>Save item</button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <strong>{item.name || titleCase(item.item_key)}</strong>
                                  <span>{titleCase(item.item_type)} - {item.item_key}</span>
                                  {item.dependency_keys.length ? (
                                    <span>Depends on {item.dependency_keys.join(", ")}</span>
                                  ) : null}
                                </div>
                                <div className="platform-template-preview__actions">
                                  <span className="record-chip">{item.is_required ? "Required" : "Optional"}</span>
                                  <button className="button button--secondary" disabled={Boolean(busyRef) || !selectedPolicyPackIsDraft} type="button" onClick={() => setEditingPolicyPackItemId(item.id)}>Edit</button>
                                  <button className="button button--danger" disabled={Boolean(busyRef) || !selectedPolicyPackIsDraft} type="button" onClick={() => requestDeletePolicyPackItem(selectedPolicyPack, item)}>Delete</button>
                                  <DisabledReason show={!selectedPolicyPackIsDraft}>
                                    Published templates are locked. Create a new version before editing items.
                                  </DisabledReason>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {selectedPolicyPackItems.length > 6 ? (
                          <div className="notice notice--compact">
                            <strong>{selectedPolicyPackItems.length - 6} more items are included.</strong>
                            <span className="muted">The adoption service will process the full ordered template.</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="notice notice--compact">
                      <strong>Safe adoption behavior</strong>
                      <span className="muted">The selected mode, tenant, template version, actor, and created records are written to onboarding evidence.</span>
                    </div>
                  </div>
                ) : null}
                {policyPackPreview ? (
                  <div className={`platform-adoption-preview ${policyPackPreview.can_apply ? "platform-adoption-preview--ready" : "platform-adoption-preview--blocked"}`} aria-live="polite">
                    <div className="record-card__title">
                      <h3>Impact preview</h3>
                      <span className="record-chip">{policyPackPreview.can_apply ? "Ready" : "Needs review"}</span>
                    </div>
                    <div className="platform-adoption-preview__counts">
                      <span><strong>{policyPackPreview.counts.create}</strong> create</span>
                      <span><strong>{policyPackPreview.counts.evidence_only}</strong> evidence only</span>
                      <span><strong>{policyPackPreview.counts.conflict}</strong> conflicts</span>
                      <span><strong>{policyPackPreview.counts.blocked}</strong> blocked</span>
                    </div>
                    <div className="platform-adoption-preview__items">
                      {policyPackPreview.items.map((item) => (
                        <div className="platform-adoption-preview__item" key={`${item.item_key}-${item.action}`}>
                          <div>
                            <strong>{item.name || titleCase(item.item_key)}</strong>
                            <span>{titleCase(item.item_type)} - {item.target_model || "No runtime record"} {item.target_key ? `- ${item.target_key}` : ""}</span>
                            <span>{item.message}</span>
                          </div>
                          <span className={`record-chip record-chip--${item.severity === "success" ? "success" : item.severity === "warning" ? "warning" : item.severity === "error" ? "danger" : "neutral"}`}>
                            {titleCase(item.action)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {policyPackUpgradeCompare && upgradeCompareMatchesSelection ? (
                  <div className={`platform-adoption-preview ${policyPackUpgradeCompare.can_upgrade ? "platform-adoption-preview--ready" : "platform-adoption-preview--blocked"}`} aria-live="polite">
                    <div className="record-card__title">
                      <h3>Version comparison</h3>
                      <span className="record-chip">{policyPackUpgradeCompare.can_upgrade ? "Upgradeable" : "Manual review"}</span>
                    </div>
                    <p className="section-copy">
                      {policyPackUpgradeCompare.has_current_adoption
                        ? `Tenant is on ${policyPackUpgradeCompare.current_policy_pack_code} v${policyPackUpgradeCompare.current_policy_pack_version}; target is ${policyPackUpgradeCompare.target_policy_pack_code} v${policyPackUpgradeCompare.target_policy_pack_version}.`
                        : "This tenant has not adopted a template in this lineage yet. The target version will be treated as a first adoption."}
                    </p>
                    <div className="platform-adoption-preview__counts">
                      <span><strong>{policyPackUpgradeCompare.counts.add}</strong> add</span>
                      <span><strong>{policyPackUpgradeCompare.counts.change}</strong> change</span>
                      <span><strong>{policyPackUpgradeCompare.counts.remove}</strong> remove</span>
                      <span><strong>{policyPackUpgradeCompare.counts.detached}</strong> detached</span>
                      <span><strong>{policyPackUpgradeCompare.counts.unchanged}</strong> unchanged</span>
                    </div>
                    <div className="platform-adoption-preview__items">
                      {policyPackUpgradeCompare.items.map((item) => (
                        <div className="platform-adoption-preview__item" key={`${item.item_key}-${item.action}`}>
                          <div>
                            <strong>{item.name || titleCase(item.item_key)}</strong>
                            <span>{titleCase(item.item_type)} - {item.item_key}</span>
                            <span>{item.message}</span>
                          </div>
                          <span className={`record-chip record-chip--${item.severity === "success" ? "success" : item.severity === "warning" ? "warning" : item.severity === "error" ? "danger" : "neutral"}`}>
                            {titleCase(item.action)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {policyPackAdoptionResult ? (
                  <div className="platform-adoption-preview platform-adoption-preview--ready" aria-live="polite">
                    <div className="record-card__title">
                      <h3>Apply result</h3>
                      <span className="record-chip record-chip--success">Evidence saved</span>
                    </div>
                    <div className="platform-adoption-preview__counts">
                      <span><strong>{policyPackAdoptionResult.result_summary.counts.created}</strong> created</span>
                      <span><strong>{policyPackAdoptionResult.result_summary.counts.updated ?? 0}</strong> updated</span>
                      <span><strong>{policyPackAdoptionResult.result_summary.counts.evidence_only}</strong> evidence only</span>
                      <span><strong>{policyPackAdoptionResult.result_summary.counts.skipped}</strong> skipped</span>
                      <span><strong>{policyPackAdoptionResult.result_summary.counts.failed}</strong> failed</span>
                    </div>
                    <div className="platform-adoption-preview__items">
                      {policyPackAdoptionResult.result_summary.items.map((item) => (
                        <div className="platform-adoption-preview__item" key={`${item.item_key}-${item.action}-${item.target_record_id}`}>
                          <div>
                            <strong>{item.name || titleCase(item.item_key)}</strong>
                            <span>{titleCase(item.item_type)} - {item.target_model || "No runtime record"} {item.target_record_id ? `- ${item.target_record_id}` : ""}</span>
                            <span>{item.message}</span>
                          </div>
                          <span className={`record-chip record-chip--${item.severity === "success" ? "success" : item.severity === "warning" ? "warning" : item.severity === "error" ? "danger" : "neutral"}`}>
                            {titleCase(item.action)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <label className="form-field platform-form-field--wide platform-form-field--tall"><span className="muted">Notes</span><textarea className="input-control" name="notes" placeholder="Initial platform setup for onboarding." /></label>
                <div className="form-actions-bar platform-adoption-actions">
                  <span className="muted">Preview impact first. Applying writes setup evidence and onboarding history.</span>
                  <div className="platform-action-with-reason">
                    <div className="button-row">
                      <button className="button button--secondary" disabled={Boolean(busyRef) || !canAdoptBaseline} type="button" onClick={(event) => { const form = event.currentTarget.form; if (form) void handleUpgradeCompare(form); }}>Compare version</button>
                      <button className="button button--secondary" disabled={Boolean(busyRef) || !canApplyComparedUpgrade} type="button" onClick={(event) => { const form = event.currentTarget.form; if (form) void handleUpgradeApply(form); }}>Apply upgrade</button>
                      <button className="button button--secondary" disabled={Boolean(busyRef) || !canAdoptBaseline} type="submit">Preview impact</button>
                      <button className="button button--primary" disabled={Boolean(busyRef) || !canApplyPreviewedTemplate} type="button" onClick={(event) => { const form = event.currentTarget.form; if (form) void runAdoptPack(form); }}>Apply template</button>
                    </div>
                    <DisabledReason show={!canAdoptBaseline || (!canApplyPreviewedTemplate && !canApplyComparedUpgrade)}>
                      {!canAdoptBaseline
                        ? "Select a tenant and choose a published setup template."
                        : "Use Compare version before applying an upgrade, or run a clean impact preview before first-time template adoption."}
                    </DisabledReason>
                  </div>
                </div>
              </form>

              <div className="detail-grid">
                {onboarding.checklist_items.map((item) => (
                  <DetailRow key={item.id} label={item.label} value={item.status} />
                ))}
              </div>
            </article>
          </section>
          ) : null}

          {initialPanel === "events" ? (
          <section className="section" data-testid="platform-admin-events-panel">
            <article className="record-card">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>Onboarding events</h2>
                  <span className="record-chip">{onboarding.recent_events.length} recent</span>
                </div>
                <p className="section-copy">Latest platform-side evidence for the selected tenant.</p>
              </div>
              <form className="platform-audit-filters" method="get">
                {selectedTenant ? <input name="tenantId" type="hidden" value={selectedTenant.id} /> : null}
                <label className="queue-toolbar__search">
                  <span>Search</span>
                  <input className="input-control" name="q" onChange={(event) => { setEventQuery(event.target.value); setEventPage(1); }} placeholder="Event, actor, summary" value={eventQuery} />
                </label>
                <div className="platform-list-filters" aria-label="Event filters">
                  <label className="form-field">
                    <span className="muted">Event type</span>
                    <select className="input-control" name="eventType" onChange={(event) => { setEventTypeFilter(event.target.value); setEventPage(1); }} value={eventTypeFilter}>
                      <option value="all">All event types</option>
                      {eventTypes.map((eventType) => <option key={eventType} value={eventType}>{titleCase(eventType)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="button-row"><button className="button button--primary" type="submit">Apply evidence scope</button><Link className="button button--secondary" href={buildPanelHref("events", selectedTenant?.id)}>Reset</Link></div>
              </form>
              <FilterSummary
                activeFilters={eventActiveFilters}
                label="audit events"
                onReset={() => {
                  setEventQuery("");
                  setEventTypeFilter("all");
                  setEventPage(1);
                  router.replace(buildPanelHref("events", selectedTenant?.id));
                }}
                total={events.length}
                visible={filteredEvents.length}
              />
              <div className="tenant-support-access-list">
                {eventPageData.items.map((event) => (
                  <div className="tenant-support-access-row" key={event.id}>
                    <div>
                      <strong>{titleCase(event.event_type)}</strong>
                      <span>{event.summary || "Event recorded."}</span>
                    </div>
                    <span className="record-chip">{event.actor_identifier || "system"}</span>
                    <span className="record-chip">{formatDateTime(event.created_at)}</span>
                    <button
                      aria-label={`View evidence for ${titleCase(event.event_type)}`}
                      className="button button--secondary button--compact"
                      type="button"
                      onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setSelectedAuditEvent(event); }}
                    >
                      View evidence
                    </button>
                  </div>
                ))}
                {!filteredEvents.length ? (
                  <div className="notice">
                    <strong>No onboarding events match this view.</strong>
                    <span className="muted">Clear the search or select a tenant with recorded events.</span>
                  </div>
                ) : null}
              </div>
              <PaginationBar
                hasNext={eventPageData.hasNext}
                hasPrevious={eventPageData.hasPrevious}
                onFirst={() => setEventPage(1)}
                onLast={() => setEventPage(Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE)))}
                onNext={() => setEventPage((current) => clampPage(current + 1, filteredEvents.length))}
                onPrevious={() => setEventPage((current) => clampPage(current - 1, filteredEvents.length))}
                page={eventPageData.page}
                pageSize={PAGE_SIZE}
                totalCount={filteredEvents.length}
              />
            </article>
          </section>
          ) : null}
        </>
      ) : null}
      {selectedAuditEvent ? (
        <HrAdminActionModal closeHref="/platform-admin" labelledBy="platform-audit-evidence-title" title={titleCase(selectedAuditEvent.event_type)} onClose={() => setSelectedAuditEvent(null)} busy={Boolean(busyRef)} className="tenant-modal tenant-modal--audit">


<p className="tenant-modal__validation" id="platform-audit-evidence-description">
              {selectedAuditEvent.summary || "Event recorded."}
            </p>

<div className="detail-grid platform-audit-evidence__meta">
              <DetailRow label="Tenant" value={onboarding ? `${onboarding.tenant_name} (${onboarding.tenant_code})` : "Not selected"} />
              <DetailRow label="Actor" value={selectedAuditEvent.actor_identifier || "system"} />
              <DetailRow label="Timestamp" value={formatDateTime(selectedAuditEvent.created_at)} />
              <DetailRow label="Event ID" value={selectedAuditEvent.id} />
            </div>

<div className="platform-audit-evidence__payload">
              <div>
                <strong>Payload</strong>
                <span className="muted">Sensitive credential-like fields are redacted before display.</span>
              </div>
              <pre aria-label="Audit evidence payload">{auditEvidenceText(selectedAuditEvent)}</pre>
            </div>

</HrAdminActionModal>
      ) : null}
      {showCreateTenantModal ? (
        <HrAdminActionModal closeHref="/platform-admin" labelledBy="create-platform-tenant-title" title="Create platform tenant" onClose={() => setShowCreateTenantModal(false)} busy={Boolean(busyRef)} className="tenant-modal">


<form className="form-grid tenant-membership-form-grid--dialog" noValidate onSubmit={handleTenantCreate}>
              <div className="notice notice--compact platform-validation-strip form-field--full" id="create-platform-tenant-description">
                <strong>Before creating</strong>
                <span className="muted">Code and name are mandatory. Email, phone, and domain can be completed later, but activation still needs tenant admin login access and readiness signoff.</span>
              </div>
              <label className="form-field"><span className="muted">Code</span><input aria-invalid={Boolean(fieldErrors.createTenantCode)} aria-label="Code" className="input-control" name="code" ref={createTenantFirstFieldRef} required placeholder="qa-pa-tenant-01" /><ValidationNote>Required and unique. This becomes the tenant identifier in audit evidence.</ValidationNote>{fieldErrors.createTenantCode ? <span className="field-error-text" role="alert">{fieldErrors.createTenantCode}</span> : null}</label>
              <label className="form-field"><span className="muted">Name</span><input aria-invalid={Boolean(fieldErrors.createTenantName)} aria-label="Name" className="input-control" name="name" required placeholder="QA Platform Tenant 01" /><ValidationNote>Required. Use the customer-facing organization name.</ValidationNote>{fieldErrors.createTenantName ? <span className="field-error-text" role="alert">{fieldErrors.createTenantName}</span> : null}</label>
              <label className="form-field"><span className="muted">Legal name</span><input aria-label="Legal name" className="input-control" name="legal_name" placeholder="QA Platform Tenant Pvt Ltd" /></label>
              <label className="form-field"><span className="muted">Primary domain</span><input aria-label="Primary domain" className="input-control" name="primary_domain" placeholder="qa-pa-tenant-01.example.test" /><ValidationNote>Optional for setup; should be final before live customer activation.</ValidationNote></label>
              <label className="form-field"><span className="muted">Primary email</span><input aria-invalid={Boolean(fieldErrors.createTenantEmail)} aria-label="Primary email" className="input-control" name="primary_email" type="email" placeholder="ops@example.test" /><ValidationNote>Use a monitored customer or implementation mailbox.</ValidationNote>{fieldErrors.createTenantEmail ? <span className="field-error-text" role="alert">{fieldErrors.createTenantEmail}</span> : null}</label>
              <label className="form-field"><span className="muted">Primary phone</span><input aria-label="Primary phone" className="input-control" name="primary_phone" placeholder="+91 90000 00001" /></label>
              <label className="form-field"><span className="muted">Plan</span><select aria-label="Plan" className="input-control" name="subscription_plan" defaultValue="starter"><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>
              <label className="form-field"><span className="muted">Seed pack</span><select aria-label="Seed pack" className="input-control" name="seed_pack" defaultValue="standard_office"><option value="standard_office">Standard Office</option><option value="shift_based">Shift Based Operations</option><option value="retail_field">Retail or Field Workforce</option><option value="professional_services">Professional Services</option></select></label>
              <label className="form-field"><span className="muted">Timezone</span><input aria-label="Timezone" className="input-control" name="timezone" defaultValue="Asia/Kolkata" /></label>
              <label className="form-field"><span className="muted">Country</span><input aria-label="Country" className="input-control" name="country_code" defaultValue="IN" maxLength={2} /></label>
              <label className="form-field"><span className="muted">Sandbox</span><input aria-label="Sandbox" name="is_sandbox" type="checkbox" defaultChecked /></label>
              <div className="tenant-modal__actions form-field--full">
                <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => window.dispatchEvent(new Event("hr-admin-modal:request-close"))}>Cancel</button>
                <AsyncActionButton className="button button--primary button--pending-stable" disabled={Boolean(busyRef)} pending={busyRef === "/api/platform/tenants"} pendingLabel="Creating tenant" type="submit">
                  Create tenant
                </AsyncActionButton>
              </div>
            </form>

</HrAdminActionModal>
      ) : null}
      {showAddContactModal && selectedTenant ? (
        <HrAdminActionModal closeHref="/platform-admin" labelledBy="add-platform-admin-contact-title" title="Add platform admin contact" onClose={() => setShowAddContactModal(false)} busy={Boolean(busyRef)} className="tenant-modal">


<form className="form-grid tenant-membership-form-grid--dialog" noValidate onSubmit={handleContactCreate}>
              <div className="notice notice--compact platform-validation-strip form-field--full" id="add-platform-admin-contact-description">
                <strong>Contact validation</strong>
                <span className="muted">A primary contact is required before the customer can be marked ready. Make sure the email belongs to the real tenant admin.</span>
              </div>
              <label className="form-field"><span className="muted">Full name</span><input aria-invalid={Boolean(fieldErrors.addContactName)} className="input-control" name="full_name" ref={addContactFirstFieldRef} required placeholder="Ava Patel" /><ValidationNote>Required. This person becomes the customer-side owner for onboarding.</ValidationNote>{fieldErrors.addContactName ? <span className="field-error-text" role="alert">{fieldErrors.addContactName}</span> : null}</label>
              <label className="form-field"><span className="muted">Email</span><input aria-invalid={Boolean(fieldErrors.addContactEmail)} className="input-control" name="email" required type="email" placeholder="ava.patel@example.test" /><ValidationNote>Required and used for the provisioned login identity.</ValidationNote>{fieldErrors.addContactEmail ? <span className="field-error-text" role="alert">{fieldErrors.addContactEmail}</span> : null}</label>
              <label className="form-field"><span className="muted">Phone</span><input className="input-control" name="phone_number" placeholder="+91 90000 00002" /></label>
              <label className="form-field"><span className="muted">Job title</span><input className="input-control" name="job_title" placeholder="Head of People" /></label>
              <label className="form-field"><span className="muted">Primary</span><input name="is_primary" type="checkbox" defaultChecked /></label>
              <label className="form-field"><span className="muted">Notes</span><textarea className="input-control" name="notes" /></label>
              <div className="tenant-modal__actions form-field--full">
                <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => window.dispatchEvent(new Event("hr-admin-modal:request-close"))}>Cancel</button>
                <button className="button button--primary" disabled={Boolean(busyRef)} type="submit">Add contact</button>
              </div>
            </form>

</HrAdminActionModal>
      ) : null}
      {confirmAction ? (
        <HrAdminActionModal closeHref="/platform-admin" labelledBy="platform-confirm-action-title" title={confirmAction.title} onClose={() => setConfirmAction(null)} busy={Boolean(busyRef)} className="tenant-modal tenant-modal--small">


<div className="tenant-modal__validation" id="platform-confirm-action-description">
              <strong>{confirmAction.tone === "danger" ? "This changes customer state." : "Review before continuing."}</strong>
              <span>{confirmAction.description}</span>
            </div>

<div className="tenant-modal__actions">
              <button className="button button--secondary" disabled={Boolean(busyRef)} type="button" onClick={() => window.dispatchEvent(new Event("hr-admin-modal:request-close"))}>Cancel</button>
              <button
                className={`button ${confirmAction.tone === "danger" ? "button--danger" : "button--primary"}`}
                disabled={Boolean(busyRef)}
                type="button"
                onClick={async () => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  await action.run();
                }}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>

</HrAdminActionModal>
      ) : null}
    </main>
  );
}
