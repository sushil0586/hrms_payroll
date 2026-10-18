import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

test("RG3B policy-blocked workflow authority controls fail closed in browser and API", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const hrAdmin = workspacePersona(workspace, "hr_admin");
  const code = `rg3b-${workspace.seedRef}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 55);

  try {
    await gotoAuthenticated(page, "/hr-admin/workflow-templates/new", hrAdmin);
    await expectPageReady(page, "Create workflow template");

    const mode = page.getByLabel("Mode");
    await expect(mode).toHaveValue("sequential");
    await expect(mode.locator("option")).toHaveCount(1);
    await expect(page.getByLabel("Escalate after hours")).toBeDisabled();
    await expect(page.getByRole("checkbox", { name: "Allow delegate" })).toBeDisabled();
    await expect(page.getByRole("checkbox", { name: "Allow delegate" })).not.toBeChecked();

    const basePayload = {
      code,
      name: "RG3B unsupported authority probe",
      module: "leave",
      trigger_key: `${code}.leave`,
      status: "active",
      steps: [{
        name: "Manager approval",
        mode: "sequential",
        actor_type: "manager",
        allow_delegate: false,
        escalate_after_hours: 0,
      }],
    };
    const probes = [
      { label: "parallel", step: { mode: "parallel" }, expected: /parallel approval/i },
      { label: "delegation", step: { allow_delegate: true }, expected: /delegation is unavailable/i },
      { label: "escalation", step: { escalate_after_hours: 1 }, expected: /escalation is unavailable/i },
    ];
    const outcomes: Array<{ label: string; status: number; body: string; validSameCodeStatus: number }> = [];

    for (const probe of probes) {
      const probeCode = `${code}-${probe.label}`.slice(0, 60);
      const response = await requestWithBrowserSession(page, "/api/hr-admin/workflow-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          code: probeCode,
          steps: [{ ...basePayload.steps[0], ...probe.step }],
        }),
      });
      expect(response.status).toBe(400);
      expect(response.body).toMatch(probe.expected);
      const validSameCode = await requestWithBrowserSession(page, "/api/hr-admin/workflow-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, code: probeCode }),
      });
      expect(validSameCode.status).toBe(201);
      outcomes.push({ label: probe.label, status: response.status, body: response.body, validSameCodeStatus: validSameCode.status });
    }

    await gotoAuthenticated(page, "/hr-admin/saas-control-plane", hrAdmin);
    await expectPageReady(page, "SaaS Control Plane");
    const beforePlan = await page.getByLabel("Plan").inputValue();
    const downgradeResponse = await requestWithBrowserSession(page, "/api/hr-admin/saas-control-plane", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_plan: "starter" }),
    });
    expect(downgradeResponse.status).toBe(400);
    expect(downgradeResponse.body).toMatch(/downgrade is unavailable/i);
    await page.reload({ waitUntil: "domcontentloaded" });
    const afterPlan = await page.getByLabel("Plan").inputValue();
    expect(afterPlan).toBe(beforePlan);

    await testInfo.attach("rg3b-workflow-safe-restrictions.json", {
      body: Buffer.from(JSON.stringify({ code, outcomes, unsupportedPersisted: false, downgrade: { status: downgradeResponse.status, beforePlan, afterPlan } }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
