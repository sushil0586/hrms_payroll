import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin generated letter flows", () => {
  test("letter workspace previews and generates stored artifacts", async ({ page }) => {
    await page.route("**/api/hr-admin/generated-letters/preview", async (route) => {
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
    await page.route("**/api/hr-admin/generated-letters", async (route) => {
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

    await page.getByRole("combobox", { name: /^Employee/ }).selectOption({ label: "Riya Sharma (EMP-0042)" });
    await page.getByRole("combobox", { name: /^Letter type/ }).selectOption("confirmation");
    await page.getByLabel("Title").fill("Riya Confirmation Letter");
    await page.getByLabel("Workflow reference").fill("WF-CONF-0042");
    await page.getByRole("button", { name: "Preview letter" }).click();

    await expect(page.getByText("Riya Sharma as Assistant Manager")).toBeVisible();
    await expect(page.getByText("Preview ready.")).toBeVisible();
    await expect(page.getByText("No missing variables were reported for this draft.")).toBeVisible();
    await page.getByRole("button", { name: "Generate letter" }).click();
    await expect(page.getByText("Letter generated.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Download generated letter" })).toHaveAttribute("href", /\/api\/hr-admin\/generated-letters\/generated-test-letter\/download/);
    await expect(page.getByText("Riya Confirmation Letter").or(page.getByText("riya-confirmation-letter-2026-06-07.txt")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("letter preview surfaces missing variable validation", async ({ page }) => {
    await page.route("**/api/hr-admin/generated-letters/preview", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 400,
        body: JSON.stringify({ template_body: ["Missing value for: end_date."] }),
      });
    });

    await gotoAuthenticated(page, "/hr-admin/generated-letters");
    await expectPageReady(page, "Generated HR letters");

    await page.getByLabel("Template body").fill("Experience certified for {{ employee_name }} until {{ end_date }}.");
    await page.getByRole("button", { name: "Preview letter" }).click();

    await expect(page.getByText("Letter action failed.")).toBeVisible();
    await expect(page.getByText("Missing value for: end_date.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("letter workspace handles network failure and invalid payload JSON without losing the draft", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/generated-letters");
    await expectPageReady(page, "Generated HR letters");

    await page.getByLabel("Payload values JSON").fill("{bad-json");
    await page.getByRole("button", { name: "Preview letter" }).click();
    await expect(page.getByText("Payload values must be valid JSON.").or(page.getByText("Expected property name")).first()).toBeVisible();

    await page.getByLabel("Payload values JSON").fill("{\n  \"reference_number\": \"HR/CONF/0042\"\n}");
    await page.route("**/api/hr-admin/generated-letters/preview", async (route) => route.abort("failed"));
    await page.getByRole("button", { name: "Preview letter" }).click();
    await expect(page.getByText("Unable to reach the server. Check your connection and try again.")).toBeVisible();
    await expect(page.getByLabel("Template body")).toHaveValue(/employee_name/);
    await expectNoHorizontalOverflow(page);
    await page.unroute("**/api/hr-admin/generated-letters/preview");
  });
});
