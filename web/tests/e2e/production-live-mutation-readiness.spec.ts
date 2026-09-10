import { expect, type APIResponse, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type Persona = {
  username: string;
  password: string;
};

type MutationProbe = {
  label: string;
  method: "post" | "patch";
  path: string;
  data?: Record<string, unknown>;
};

const seedPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const apiBaseConfigured = Boolean(process.env.HRMS_API_BASE_URL);
const liveMutationRequested = process.env.PLAYWRIGHT_LIVE_MUTATIONS === "true";

const hrAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "nisha.rao",
  password: seedPassword,
};

const employee: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME ?? "riya.sharma",
  password: seedPassword,
};

const unauthenticatedMutationProbes: MutationProbe[] = [
  {
    label: "HR notification retry",
    method: "post",
    path: "/api/hr-admin/notifications/pw-test-notification/retry",
    data: { process_now: true },
  },
  {
    label: "HR notification bulk retry",
    method: "post",
    path: "/api/hr-admin/notifications/bulk-retry",
    data: { notification_ids: ["pw-test-notification"], process_now: true },
  },
  {
    label: "HR notification review update",
    method: "patch",
    path: "/api/hr-admin/notifications/pw-test-notification",
    data: { priority: "normal", status: "pending" },
  },
  {
    label: "notification channel config update",
    method: "patch",
    path: "/api/hr-admin/notification-channel-configs/pw-test-channel",
    data: {
      channel: "in_app",
      is_enabled: true,
      backend_key: "in_app_default",
      sender_identifier: "pw-test",
      sender_address: "",
      provider_config: {},
      delivery_policy: { max_attempts: 3, retry_backoff_minutes: 0 },
    },
  },
  {
    label: "provider launch rehearsal",
    method: "post",
    path: "/api/hr-admin/payroll-provider-launch-rehearsals/run",
    data: { rehearsal_profile_ref: "PW_TEST_provider_launch_rehearsal" },
  },
  {
    label: "tenant change request create",
    method: "post",
    path: "/api/tenant-admin/change-requests",
    data: {
      request_type: "billing_contact",
      title: "PW_TEST unauthenticated mutation probe",
      description: "This request should not be accepted without a valid session.",
      target_ref: "pw-test",
      requested_payload: { primary_email: "pw-test@example.com" },
    },
  },
  {
    label: "employee notification read state",
    method: "patch",
    path: "/api/me/notifications/pw-test-employee-notification",
    data: { read_at: "2026-09-08T10:00:00.000Z" },
  },
  {
    label: "employee payslip read receipt",
    method: "post",
    path: "/api/me/payroll-payslips/pw-test-payslip/read",
  },
];

function sensitivePayloadPatterns() {
  return [
    /secret/i,
    /access_key/i,
    /private_key/i,
    /tenant\.bank\.debit_account/i,
    /aa8b7a6f5e4d3c2b/i,
    /salary_snapshot/i,
  ];
}

async function sendProbe(page: Page, probe: MutationProbe) {
  if (probe.method === "post") {
    return page.request.post(probe.path, { data: probe.data ?? {} });
  }
  return page.request.patch(probe.path, { data: probe.data ?? {} });
}

async function expectGuardedMutationResponse(response: APIResponse, label: string) {
  expect([401, 403, 404, 500], `${label} should fail closed before disposable live execution`).toContain(response.status());
  const payload = await response.json().catch(() => ({}));
  const serializedPayload = JSON.stringify(payload);
  for (const pattern of sensitivePayloadPatterns()) {
    expect(serializedPayload, `${label} should not leak ${pattern}`).not.toMatch(pattern);
  }
  if (!apiBaseConfigured) {
    expect(serializedPayload).toContain("HRMS_API_BASE_URL");
  }
}

async function loginViaProxy(page: Page, persona: Persona) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: persona.username,
      password: persona.password,
    },
  });
  expect(response.status(), `${persona.username} should authenticate through Next proxy`).toBeLessThan(300);
}

function requiredLiveHandle(name: string) {
  const value = process.env[name];
  expect(value, `${name} is required when PLAYWRIGHT_LIVE_MUTATIONS=true`).toBeTruthy();
  return value as string;
}

async function expectSuccessfulLiveMutation(response: APIResponse, label: string) {
  const payload = await response.json().catch(() => ({}));
  expect(response.status(), `${label} failed: ${JSON.stringify(payload)}`).toBeLessThan(300);
}

async function expectSuccessfulOrConsumedRetry(response: APIResponse, label: string) {
  if (response.status() < 300) {
    return;
  }
  const payload = await response.json().catch(() => ({}));
  expect(
    { status: response.status(), detail: String(payload.detail ?? "") },
    `${label} failed: ${JSON.stringify(payload)}`,
  ).toEqual({
    status: 400,
    detail: "Retry limit reached for this notification channel configuration.",
  });
}

test.describe("Production live/disposable mutation readiness", () => {
  test("mutation proxy routes fail closed without backend URL or browser session", async ({ page }) => {
    await page.context().clearCookies();

    for (const probe of unauthenticatedMutationProbes) {
      const response = await sendProbe(page, probe);
      await expectGuardedMutationResponse(response, probe.label);
    }
  });

  test("mutation-capable screens expose controls without silently mutating demo data", async ({ page }) => {
    test.setTimeout(90_000);

    if (apiBaseConfigured) {
      await loginViaProxy(page, hrAdmin);
    }

    await gotoAuthenticated(page, "/hr-admin/notifications?retry_state=retry_ready");
    await expectPageReady(page, "Notification queue");
    await expect(page.getByRole("button", { name: /Retry selected/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save review" }).first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");
    await expect(page.getByRole("button", { name: "Run rehearsal" })).toBeVisible();

    await gotoAuthenticated(page, "/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    await expect(page.getByRole("button", { name: /Submit request|Request access|Invite member/ }).first()).toBeVisible();

    await page.request.post("/api/auth/logout");
    if (apiBaseConfigured) {
      await loginViaProxy(page, employee);
    }
    await gotoAuthenticated(page, "/ess/payslips");
    await expectPageReady(page, "Payslips");
    await expect(page.getByRole("button", { name: /Mark as read|Read acknowledged/ }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("explicit live disposable handles can execute mutation proxies in staging", async ({ page }) => {
    if (!liveMutationRequested) {
      expect(liveMutationRequested).toBe(false);
      return;
    }

    expect(apiBaseConfigured, "HRMS_API_BASE_URL is required for live disposable mutation execution").toBe(true);
    const retryNotificationId = requiredLiveHandle("PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID");
    const employeeNotificationId = requiredLiveHandle("PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID");
    const payslipId = requiredLiveHandle("PLAYWRIGHT_LIVE_PAYSLIP_ID");

    await loginViaProxy(page, hrAdmin);
    await expectSuccessfulLiveMutation(
      await page.request.patch(`/api/hr-admin/notifications/${retryNotificationId}`, {
        data: { priority: "normal", status: "failed" },
      }),
      "HR notification disposable update",
    );
    await expectSuccessfulOrConsumedRetry(
      await page.request.post(`/api/hr-admin/notifications/${retryNotificationId}/retry`, {
        data: { process_now: true },
      }),
      "HR notification disposable retry",
    );
    await expectSuccessfulLiveMutation(
      await page.request.post("/api/tenant-admin/change-requests", {
        data: {
          request_type: "billing_contact",
          title: `PW_TEST live mutation ${Date.now()}`,
          description: "Disposable Playwright mutation-readiness request.",
          target_ref: "pw-test-live-mutation",
          requested_payload: { primary_email: "pw-test@example.com" },
        },
      }),
      "tenant-admin disposable change request",
    );

    await page.request.post("/api/auth/logout");
    await loginViaProxy(page, employee);
    await expectSuccessfulLiveMutation(
      await page.request.patch(`/api/me/notifications/${employeeNotificationId}`, {
        data: { read_at: new Date().toISOString() },
      }),
      "employee notification read-state update",
    );
    await expectSuccessfulLiveMutation(
      await page.request.post(`/api/me/payroll-payslips/${payslipId}/read`),
      "employee payslip read receipt",
    );
  });
});
