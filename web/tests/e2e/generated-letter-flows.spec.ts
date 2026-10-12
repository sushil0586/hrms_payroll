import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function field(page: Page, label: string | RegExp) {
  return page.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function clickButton(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name }).first();
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
}

async function expectGeneratedLetterWorkspaceReady(page: Page) {
  await expect(page.locator(".document-letter-workspace[data-hydrated='true']")).toBeVisible();
}

test.describe("HR admin generated letter flows", () => {
  test.describe.configure({ timeout: 90_000 });

  test("letter workspace previews and generates stored artifacts", async ({ page }) => {
    await page.route(/\/api\/hr-admin\/generated-letters\/preview\/?$/, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          rendered_text:
            "Dear Riya,\n\nThis confirms Riya Sharma as Assistant Manager at Northstar Foods Pvt Ltd effective 2026-06-07.\n\nRegards,\nPeople Operations",
          missing_variables: [],
          used_variables: ["employee_name", "designation", "legal_entity", "issue_date"],
          payload: { context: { employee_code: "EMP-0042" } },
        }),
      });
    });
    await page.route(/\/api\/hr-admin\/generated-letters\/?$/, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 201,
        body: JSON.stringify({
          id: "generated-test-letter",
          employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
          employee_code: "EMP-0042",
          employee_name: "Riya Sharma",
          artifact_id: "artifact-generated-test-letter",
          letter_type: "confirmation",
          title: "Riya Confirmation Letter",
          template_code: "confirmation-standard",
          status: "active",
          issue_date: "2026-06-07",
          file_name: "riya-confirmation-letter-2026-06-07.txt",
          file_url: "/api/v1/hr-admin/generated-letters/generated-test-letter/download/",
          file_path: "/secure/docs/riya-confirmation-letter-2026-06-07.txt",
          workflow_reference: "WF-CONF-0042",
          payload_snapshot: { generated_by_identifier: "EMP-0001" },
          rendered_text:
            "Dear Riya,\n\nThis confirms Riya Sharma as Assistant Manager at Northstar Foods Pvt Ltd effective 2026-06-07.\n\nRegards,\nPeople Operations",
          created_at: "2026-06-07T11:30:00+05:30",
          updated_at: "2026-06-07T11:30:00+05:30",
        }),
      });
    });

    await gotoAuthenticated(page, "/hr-admin/generated-letters");
    await expectPageReady(page, "Generated HR letters");
    await expectGeneratedLetterWorkspaceReady(page);

    await field(page, "Employee").selectOption({ label: "Riya Sharma (EMP-0042)" });
    await field(page, "Letter type").selectOption("confirmation");
    await field(page, "Title").fill("Riya Confirmation Letter");
    await field(page, "Workflow reference").fill("WF-CONF-0042");
    await clickButton(page, "Preview letter");

    await expect(page.getByText("Riya Sharma as Assistant Manager")).toBeVisible();
    await expect(page.getByText("Preview ready.")).toBeVisible();
    await expect(page.getByText("No missing variables were reported for this draft.")).toBeVisible();
    await clickButton(page, "Generate letter");
    await expect(page.getByText("Letter generated.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Download generated letter" })).toHaveAttribute("href", /\/api\/hr-admin\/generated-letters\/generated-test-letter\/download/);
    await expect(page.getByText("Riya Confirmation Letter").or(page.getByText("riya-confirmation-letter-2026-06-07.txt")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("letter preview surfaces missing variable validation", async ({ page }) => {
    await page.route(/\/api\/hr-admin\/generated-letters\/preview\/?$/, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 400,
        body: JSON.stringify({ template_body: ["Missing value for: end_date."] }),
      });
    });

    await gotoAuthenticated(page, "/hr-admin/generated-letters");
    await expectPageReady(page, "Generated HR letters");
    await expectGeneratedLetterWorkspaceReady(page);

    await field(page, "Template body").fill("Experience certified for {{ employee_name }} until {{ end_date }}.");
    await clickButton(page, "Preview letter");

    await expect(page.getByText("Letter action failed.")).toBeVisible();
    await expect(page.getByText("Missing value for: end_date.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("letter workspace handles network failure and invalid payload JSON without losing the draft", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/generated-letters");
    await expectPageReady(page, "Generated HR letters");
    await expectGeneratedLetterWorkspaceReady(page);

    await field(page, "Payload values JSON").fill("{bad-json");
    await clickButton(page, "Preview letter");
    await expect(page.getByText("Payload values must be valid JSON.").or(page.getByText("Expected property name")).first()).toBeVisible();

    await field(page, "Payload values JSON").fill("{\n  \"reference_number\": \"HR/CONF/0042\"\n}");
    await page.route(/\/api\/hr-admin\/generated-letters\/preview\/?$/, async (route) => route.abort("failed"));
    await clickButton(page, "Preview letter");
    await expect(page.getByText("Unable to reach the server. Check your connection and try again.")).toBeVisible();
    await expect(field(page, "Template body")).toHaveValue(/employee_name/);
    await expectNoHorizontalOverflow(page);
    await page.unroute(/\/api\/hr-admin\/generated-letters\/preview\/?$/);
  });
});
