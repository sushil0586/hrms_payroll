import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_TEST_${prefix}_${Date.now()}`;
}

function field(scope: Locator, label: string) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .first();
}

async function selectFirstNonEmptyOption(select: Locator) {
  const value = await select.evaluate((element) => {
    const fieldElement = element as HTMLSelectElement;
    return Array.from(fieldElement.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await select.selectOption(value);
  return value;
}

async function expectOptions(scope: Locator, label: string, minimum = 1) {
  const count = await field(scope, label).evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(count).toBeGreaterThanOrEqual(minimum);
}

async function submitAndCapture<T>(
  page: Page,
  path: string,
  method: "POST" | "PATCH",
  action: () => Promise<void>,
  expectedOk = true,
) {
  const wildcard = path.endsWith("/*");
  const expectedPathname = `/api/hr-admin/${wildcard ? path.slice(0, -2) : path}`.replace(/\/$/, "");
  const [response] = await Promise.all([
    page.waitForResponse((item) => {
      const pathname = new URL(item.url()).pathname.replace(/\/$/, "");
      const pathMatches = wildcard ? pathname.startsWith(`${expectedPathname}/`) : pathname === expectedPathname;
      return pathMatches && item.request().method() === method;
    }),
    action(),
  ]);
  const payload = await response.json().catch(() => null);
  expect(response.ok(), `${method} ${path} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBe(expectedOk);
  return payload as T;
}

async function createNotificationTemplateThroughBrowser(page: Page, channel = "in_app") {
  const code = uniqueCode("NOTIF_TEMPLATE");
  await gotoAuthenticated(page, "/hr-admin/notification-templates/new");
  await expectPageReady(page, "Create notification template");

  const form = page.locator("form").first();
  await field(form, "Code").fill(code);
  await field(form, "Name").fill(`Browser ${code}`);
  await field(form, "Channel").selectOption(channel);
  await field(form, "Status").selectOption("active");
  if (channel === "email") {
    await field(form, "Subject template").fill("Browser subject for {employee_name}");
  } else {
    await field(form, "Title template").fill("Browser title for {employee_name}");
  }
  await field(form, "Body template").fill("Hello {employee_name}, your request is {status}.");
  await field(form, "Metadata template JSON").fill(JSON.stringify({ action_path: "/hr-admin/notifications" }, null, 2));

  const created = await submitAndCapture<{ id: string; code: string }>(page, "notification-templates", "POST", async () => {
    await page.getByRole("button", { name: "Create template" }).click();
  });
  await expect(page).toHaveURL(/\/hr-admin\/notification-templates$/);
  await expect(page.getByText(code).first()).toBeVisible();
  return { ...created, code };
}

test.describe("HR admin notification setup CRUD", () => {
  test("notification template creates, previews, sends test notification, updates, archives, and rejects duplicate code", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/notification-templates/new");
    await expectPageReady(page, "Create notification template");

    const form = page.locator("form").first();
    for (const label of ["Code", "Name", "Channel", "Status", "Subject template", "Title template", "Body template", "Metadata template JSON"]) {
      await expect(field(form, label)).toBeVisible();
    }
    await expect(field(form, "Subject template")).toBeDisabled();
    await expect(field(form, "Title template")).toBeEnabled();
    await expectOptions(form, "Channel", 3);
    await expectOptions(form, "Status", 3);
    await expect(page.locator("label").filter({ hasText: "System seeded" }).getByRole("checkbox")).toBeVisible();

    await page.getByRole("button", { name: "Create template" }).click();
    await expect(field(form, "Code")).toBeFocused();

    const code = uniqueCode("NOTIF_TEMPLATE");
    await field(form, "Code").fill(code);
    await field(form, "Name").fill(`Browser ${code}`);
    await field(form, "Channel").selectOption("email");
    await expect(field(form, "Subject template")).toBeEnabled();
    await expect(field(form, "Title template")).toBeDisabled();
    await field(form, "Status").selectOption("active");
    await field(form, "Subject template").fill("Payroll update for {employee_name}");
    await field(form, "Body template").fill("Hello {employee_name}, your request is {status}.");
    await field(form, "Metadata template JSON").fill("{");
    await page.getByRole("button", { name: "Create template" }).click();
    await expect(page.getByText("Metadata template must be valid JSON.")).toBeVisible();

    await field(form, "Reply-to label").fill("HR Helpdesk");
    await field(form, "Metadata template JSON").fill(JSON.stringify({ reply_to_label: "HR Helpdesk", source: "playwright" }, null, 2));
    await page.locator("label").filter({ hasText: "System seeded" }).getByRole("checkbox").uncheck();

    await field(form, "Sample payload JSON").fill(JSON.stringify({ employee_name: "Asha", status: "approved" }, null, 2));
    await submitAndCapture(page, "notification-templates/preview", "POST", async () => {
      await page.getByRole("button", { name: "Preview" }).click();
    });
    await expect(page.getByRole("heading", { name: "Rendered output" })).toBeVisible();
    await expect(field(form, "Rendered body")).toHaveValue(/Hello Asha, your request is approved/);

    await selectFirstNonEmptyOption(field(form, "Test membership"));
    await submitAndCapture(page, "notification-templates/test-send", "POST", async () => {
      await page.getByRole("button", { name: "Send test" }).click();
    });
    await expect(page.getByText("Test notification created.")).toBeVisible();

    const created = await submitAndCapture<{ id: string; code: string }>(page, "notification-templates", "POST", async () => {
      await page.getByRole("button", { name: "Create template" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/notification-templates$/);
    await expect(page.getByText(code).first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/notification-templates/${created.id}/edit`);
    await expectPageReady(page, "Edit notification template");
    const editForm = page.locator("form").first();
    await expect(field(editForm, "Code")).toHaveValue(code);
    await field(editForm, "Name").fill(`Updated ${code}`);
    await field(editForm, "Status").selectOption("archived");
    await field(editForm, "Body template").fill("Updated body for {employee_name}.");
    await submitAndCapture(page, `notification-templates/${created.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/notification-templates$/);
    await expect(page.getByText(`Updated ${code}`).first()).toBeVisible();
    const updatedTemplateCard = page.locator("article").filter({ hasText: `Updated ${code}` }).first();
    await expect(updatedTemplateCard.getByText("archived").first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/notification-templates/new");
    await expectPageReady(page, "Create notification template");
    const duplicateForm = page.locator("form").first();
    await field(duplicateForm, "Code").fill(code);
    await field(duplicateForm, "Name").fill(`Duplicate ${code}`);
    await field(duplicateForm, "Channel").selectOption("email");
    await field(duplicateForm, "Status").selectOption("active");
    await field(duplicateForm, "Subject template").fill("Duplicate subject");
    await field(duplicateForm, "Body template").fill("Duplicate body");
    await field(duplicateForm, "Metadata template JSON").fill("{}");
    await submitAndCapture(page, "notification-templates", "POST", async () => {
      await page.getByRole("button", { name: "Create template" }).click();
    }, false);
    await expect(page.getByText("code: A notification template with this code and channel already exists.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("notification event creates with template routing, previews, sends test notification, updates, deactivates, and rejects duplicate code", async ({ page }) => {
    const template = await createNotificationTemplateThroughBrowser(page, "in_app");
    await gotoAuthenticated(page, "/hr-admin/notification-events/new");
    await expectPageReady(page, "Create notification event");

    const form = page.locator("form").first();
    for (const label of ["Code", "Name", "Module", "Trigger key", "Audience type", "Channel", "Template", "Priority", "Delay minutes", "Role", "Membership", "Recipient snapshot JSON"]) {
      await expect(field(form, label)).toBeVisible();
    }
    await expectOptions(form, "Module", 3);
    await expectOptions(form, "Audience type", 4);
    await expectOptions(form, "Channel", 3);
    await expectOptions(form, "Priority", 3);

    const code = uniqueCode("NOTIF_EVENT");
    await field(form, "Code").fill(code);
    await field(form, "Name").fill(`Browser ${code}`);
    await field(form, "Module").selectOption("leave");
    await field(form, "Trigger key").fill(`playwright.notification.${Date.now()}`);
    await field(form, "Audience type").selectOption("membership");
    await field(form, "Channel").selectOption("in_app");
    await field(form, "Template").selectOption(template.id);
    await field(form, "Priority").selectOption("high");
    await field(form, "Delay minutes").fill("5");
    await selectFirstNonEmptyOption(field(form, "Membership"));
    await field(form, "Routing key").fill("explicit_membership");
    await field(form, "Recipient snapshot JSON").fill("{");
    await page.getByRole("button", { name: "Create notification event" }).click();
    await expect(page.getByText("Recipient snapshot must be valid JSON.")).toBeVisible();

    await field(form, "Recipient snapshot JSON").fill(JSON.stringify({ routing: "explicit_membership", source: "playwright" }, null, 2));
    await page.locator("label").filter({ hasText: "Active" }).getByRole("checkbox").uncheck();

    await field(form, "Sample payload JSON").fill(JSON.stringify({ employee_name: "Asha", status: "approved" }, null, 2));
    await submitAndCapture(page, "notification-events/preview", "POST", async () => {
      await page.getByRole("button", { name: "Preview" }).click();
    });
    await expect(page.getByRole("heading", { name: "Rendered output" })).toBeVisible();
    await expect(page.getByText("Routing summary")).toBeVisible();

    await selectFirstNonEmptyOption(field(form, "Test membership"));
    await submitAndCapture(page, "notification-events/test-send", "POST", async () => {
      await page.getByRole("button", { name: "Send test" }).click();
    });
    await expect(page.getByText("Test notification created.")).toBeVisible();

    const created = await submitAndCapture<{ id: string }>(page, "notification-events", "POST", async () => {
      await page.getByRole("button", { name: "Create notification event" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/notification-events$/);
    await expect(page.getByText(code).first()).toBeVisible();
    const createdEventCard = page.locator("article").filter({ hasText: code }).first();
    await expect(createdEventCard.getByText("inactive")).toBeVisible();
    await expect(createdEventCard.getByText("5 min")).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/notification-events/${created.id}/edit`);
    await expectPageReady(page, "Edit notification event");
    const editForm = page.locator("form").first();
    await expect(field(editForm, "Code")).toHaveValue(code);
    await field(editForm, "Name").fill(`Updated ${code}`);
    await field(editForm, "Priority").selectOption("critical");
    await field(editForm, "Delay minutes").fill("7");
    await page.locator("label").filter({ hasText: "Active" }).getByRole("checkbox").check();
    await submitAndCapture(page, `notification-events/${created.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/notification-events$/);
    await expect(page.getByText(`Updated ${code}`).first()).toBeVisible();
    const updatedEventCard = page.locator("article").filter({ hasText: `Updated ${code}` }).first();
    await expect(updatedEventCard.getByText("critical").first()).toBeVisible();
    await expect(updatedEventCard.getByText("7 min").first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/notification-events/new");
    await expectPageReady(page, "Create notification event");
    const duplicateForm = page.locator("form").first();
    await field(duplicateForm, "Code").fill(code);
    await field(duplicateForm, "Name").fill(`Duplicate ${code}`);
    await field(duplicateForm, "Module").selectOption("leave");
    await field(duplicateForm, "Trigger key").fill("playwright.duplicate");
    await field(duplicateForm, "Audience type").selectOption("membership");
    await field(duplicateForm, "Channel").selectOption("in_app");
    await field(duplicateForm, "Template").selectOption(template.id);
    await selectFirstNonEmptyOption(field(duplicateForm, "Membership"));
    await field(duplicateForm, "Recipient snapshot JSON").fill("{}");
    await submitAndCapture(page, "notification-events", "POST", async () => {
      await page.getByRole("button", { name: "Create notification event" }).click();
    }, false);
    await expect(page.getByText("code: A notification event with this code already exists.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("notification delivery channel configuration validates JSON and saves routing changes", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/notification-delivery");
    await expectPageReady(page, "Notification delivery");

    const channelCard = page.locator(".form-shell-card").filter({ hasText: "In-App" }).first();
    await expect(channelCard).toBeVisible();
    for (const label of ["Backend", "Delivery state", "Workspace sender key", "Sender address", "Max attempts", "Retry backoff minutes", "Provider config JSON", "Delivery policy JSON"]) {
      await expect(field(channelCard, label)).toBeVisible();
    }
    await expectOptions(channelCard, "Backend");

    await field(channelCard, "Provider config JSON").fill("{");
    await channelCard.getByRole("button", { name: "Save delivery settings" }).click();
    await expect(channelCard.getByText("Provider config must be valid JSON.")).toBeVisible();

    const sender = `playwright-${Date.now()}`;
    await field(channelCard, "Delivery state").selectOption("enabled");
    await field(channelCard, "Workspace sender key").fill(sender);
    await field(channelCard, "Sender address").fill("");
    await field(channelCard, "Max attempts").fill("4");
    await field(channelCard, "Retry backoff minutes").fill("2");
    await field(channelCard, "Provider config JSON").fill(JSON.stringify({ log_label: "playwright" }, null, 2));
    await field(channelCard, "Delivery policy JSON").fill(JSON.stringify({ max_attempts: 4, retry_backoff_minutes: 2 }, null, 2));

    await submitAndCapture(page, "notification-channel-configs/*", "PATCH", async () => {
      await channelCard.getByRole("button", { name: "Save delivery settings" }).click();
    });
    await expect(channelCard.getByText("Delivery settings saved.")).toBeVisible();
    await expect(channelCard.getByText(/retry up to 4 delivery attempts/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
