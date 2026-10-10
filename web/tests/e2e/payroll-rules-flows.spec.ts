import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Locator, label: string) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .first();
}

async function expectFields(scope: Locator, labels: string[]) {
  for (const label of labels) {
    await expect(field(scope, label)).toBeVisible();
  }
}

async function openRuleActionTab(page: Page, name: RegExp | string) {
  await page.getByRole("navigation", { name: "Payroll rule action groups" }).getByRole("button", { name }).click();
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

test.describe("HR admin payroll rule engine flows", () => {
  test("rule workspace exposes formulas, locked snapshot options, and live rule detail", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-rules");
    await expectPageReady(page, "Payroll Rules");

    for (const link of ["Salary Setup", "Payroll Setup", "Calculations", "Add rule"]) {
      await expect(page.getByRole("link", { name: link, exact: true })).toBeVisible();
    }

    for (const metric of ["Rules", "Active versions", "Previews", "Locked snapshots"]) {
      await expect(page.locator(".metric-tile-soft").filter({ hasText: metric })).toBeVisible();
    }

    const tabs = page.getByLabel("Payroll rule sections");
    await expect(tabs.getByRole("link", { name: /Overview/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Rule engine summary" })).toBeVisible();

    await tabs.getByRole("link", { name: /Rules/ }).click();
    await expect(page).toHaveURL(/tab=rules/);
    await expect(page.getByRole("heading", { name: "Rule catalog" })).toBeVisible();
    await expect(page.getByLabel("rules pagination")).toBeVisible();
    for (const header of ["Rule", "Type", "Active", "Versions", "Previews", "Tags"]) {
      await expect(page.getByRole("columnheader", { name: header }).first()).toBeVisible();
    }

    await tabs.getByRole("link", { name: /Versions/ }).click();
    await expect(page).toHaveURL(/tab=versions/);
    await expect(page.getByRole("region", { name: "Rule version review" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByText("Rule versions").first()).toBeVisible();
    await expect(page.getByLabel("versions pagination").or(page.locator(".pagination-bar").filter({ hasText: /Page|Showing/ })).first()).toBeVisible();
    await expect(page.getByText("Expression trace").first().or(page.getByRole("heading", { name: "No rule selected" }))).toBeVisible();
    await expect(page.getByText("Selected for detail").first()).toBeVisible();

    const versionInspect = page.getByRole("link", { name: "Inspect" }).first();
    if ((await versionInspect.count()) > 0) {
      await versionInspect.click();
      await expect(page).toHaveURL(/versionId=/);
      await expect(page.getByText("Safe expression").first()).toBeVisible();
    }

    const ruleLink = page.locator("main a[href*='ruleId=']").first();
    if ((await ruleLink.count()) > 0) {
      await ruleLink.click();
      await expect(page).toHaveURL(/ruleId=/);
      await expect(page.getByText("Safe expression").or(page.getByText("No evaluation trace")).first()).toBeVisible();
    }

    await tabs.getByRole("link", { name: /Trace/ }).click();
    await expect(page).toHaveURL(/tab=trace/);
    await expect(page.getByRole("region", { name: "Rule trace review" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Locked snapshot options" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent evaluations" })).toBeVisible();
    await expect(page.getByLabel("evaluations pagination").or(page.getByText("No traces yet"))).toBeVisible();
    await expect(page.getByRole("heading", { name: /Select a trace|.+/ }).first()).toBeVisible();

    const traceInspect = page.getByRole("link", { name: "Inspect" }).first();
    if ((await traceInspect.count()) > 0) {
      await traceInspect.click();
      await expect(page).toHaveURL(/evaluationId=/);
      await expect(page.getByRole("complementary", { name: "Evaluation trace detail" })).toContainText("Expression");
    }

    await tabs.getByRole("link", { name: /Setup Actions/ }).click();
    await expect(page).toHaveURL(/tab=actions/);
    await expect(page.getByRole("heading", { name: "Payroll rule controls" })).toBeVisible();
    await expect(page.getByTestId("payroll-rule-definition-form")).toBeVisible();
    await openRuleActionTab(page, /Versions/);
    await expect(page.getByTestId("payroll-rule-version-form")).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test("payroll rule setup actions create definitions and versions from browser", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-rules?tab=actions");
    await expectPageReady(page, "Payroll Rules");

    const definitionForm = page.getByTestId("payroll-rule-definition-form");
    const versionForm = page.getByTestId("payroll-rule-version-form");
    const ruleCode = uniqueCode("RULE");

    await expectFields(definitionForm, ["Code", "Name", "Rule type", "Description", "Tags JSON", "Config profile reference"]);
    await openRuleActionTab(page, /Versions/);
    await expectFields(versionForm, [
      "Rule",
      "Version",
      "Status",
      "Expression language",
      "Expression",
      "Effective from",
      "Effective to",
      "Rounding rule reference",
      "Input schema JSON",
      "Output schema JSON",
      "Config snapshot JSON",
    ]);

    await openRuleActionTab(page, /Definitions/);
    await definitionForm.getByRole("button", { name: "New" }).click();
    const rule = await submitAndCapture<{ id: string; code: string }>(page, "payroll-rule-definitions", "POST", async () => {
      await field(definitionForm, "Code").fill(ruleCode);
      await field(definitionForm, "Name").fill(`Browser ${ruleCode}`);
      await field(definitionForm, "Rule type").selectOption("formula");
      await field(definitionForm, "Description").fill("Browser-created payroll rule for Phase 6C.3 certification.");
      await field(definitionForm, "Tags JSON").fill(JSON.stringify(["browser", "phase6c3"]));
      await field(definitionForm, "Config profile reference").fill("tenant.payroll.rule.phase6c3.v1");
      await definitionForm.getByRole("button", { name: "Create rule" }).click();
    });
    await expect(page.getByText(ruleCode).first()).toBeVisible();

    await openRuleActionTab(page, /Versions/);
    await versionForm.getByRole("button", { name: "New" }).click();
    await submitAndCapture(page, "payroll-rule-versions", "POST", async () => {
      await field(versionForm, "Rule").selectOption(rule.id);
      await field(versionForm, "Version").fill("1");
      await field(versionForm, "Status").selectOption("active");
      await field(versionForm, "Expression language").selectOption("safe_expr_v1");
      await field(versionForm, "Expression").fill("salary.annual_ctc / 12");
      await field(versionForm, "Effective from").fill("2026-01-01");
      await field(versionForm, "Effective to").fill("");
      await field(versionForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
      await field(versionForm, "Input schema JSON").fill(JSON.stringify({ required_paths: ["salary.annual_ctc"] }));
      await field(versionForm, "Output schema JSON").fill(JSON.stringify({ result_path: "components.phase6c3_basic" }));
      await field(versionForm, "Config snapshot JSON").fill(JSON.stringify({
        component_code: "PHASE6C3_BASIC",
        component_name: "Phase 6C3 Basic",
        component_type: "earning",
        calculation_order: 10,
        output_path: "components.phase6c3_basic",
        profile_ref: "tenant.payroll.rule.version.phase6c3.v1",
      }));
      await versionForm.getByRole("button", { name: "Create version" }).click();
    });
    await expect(page.getByText("payroll rule version saved.").first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/payroll-rules?tab=versions&ruleId=${rule.id}`);
    await expect(page.getByText(ruleCode).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
