import { API_BASE_URL, DEMO_DATA_ENABLED, PAYROLL_LIVE_RAILS_ENABLED } from "@/lib/runtime-flags";

export type LaunchConfigSeverity = "ready" | "warning" | "blocked";

export type LaunchConfigCheck = {
  ref: string;
  label: string;
  severity: LaunchConfigSeverity;
  detail: string;
};

function publicAppUrl() {
  return process.env.HRMS_PUBLIC_APP_URL ?? "";
}

function isLocalUrl(value: string | undefined) {
  return Boolean(value && /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value));
}

export function getLaunchConfigChecks(): LaunchConfigCheck[] {
  const appUrl = publicAppUrl();

  return [
    {
      ref: "web.api_base_url",
      label: "API base URL",
      severity: API_BASE_URL ? (isLocalUrl(API_BASE_URL) && process.env.NODE_ENV === "production" ? "blocked" : "ready") : "blocked",
      detail: API_BASE_URL || "Missing HRMS_API_BASE_URL.",
    },
    {
      ref: "web.demo_data",
      label: "Demo data",
      severity: DEMO_DATA_ENABLED ? "blocked" : "ready",
      detail: DEMO_DATA_ENABLED ? "Disable HRMS_ENABLE_DEMO_DATA before production launch." : "Disabled.",
    },
    {
      ref: "web.public_app_url",
      label: "Public app URL",
      severity: appUrl ? (isLocalUrl(appUrl) && process.env.NODE_ENV === "production" ? "blocked" : "ready") : "warning",
      detail: appUrl || "Set HRMS_PUBLIC_APP_URL for production links and callbacks.",
    },
    {
      ref: "payroll.live_rails",
      label: "Payroll live rails",
      severity: PAYROLL_LIVE_RAILS_ENABLED ? "warning" : "ready",
      detail: PAYROLL_LIVE_RAILS_ENABLED
        ? "Enabled. Confirm provider certification and business approval before live use."
        : "Off by default; certification and rehearsal can continue safely.",
    },
  ];
}

export function launchConfigSummary(checks = getLaunchConfigChecks()) {
  const blocked = checks.filter((item) => item.severity === "blocked").length;
  const warnings = checks.filter((item) => item.severity === "warning").length;
  return {
    blocked,
    warnings,
    ready: checks.length - blocked - warnings,
    status: blocked ? "blocked" : warnings ? "warning" : "ready" as LaunchConfigSeverity,
  };
}
