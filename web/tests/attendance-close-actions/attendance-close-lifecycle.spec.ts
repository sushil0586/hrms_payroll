import { expect, test, type Locator } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  test.setTimeout(180_000);
  workspace = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test.beforeEach(async ({ page }) => {
  const actor = workspacePersona(workspace, "hr_admin");
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: actor.username, password: actor.password },
  });
  expect(response.status()).toBe(200);
});

async function cancelDialog(dialog: Locator, trigger: Locator) {
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

test("attendance close validates, transitions, confirms locks, reopens, and retains audit evidence", async ({ page }) => {
  await page.goto("/hr-admin/attendance-close");
  const workspaceRegion = page.getByRole("region", { name: "Attendance close workspace", exact: true });
  await expect(workspaceRegion).toHaveAttribute("aria-busy", "false");

  const start = page.getByLabel("Period start", { exact: true });
  const end = page.getByLabel("Period end", { exact: true });
  await start.fill("2042-02-28");
  await end.fill("2042-02-01");
  await page.getByRole("button", { name: "Reconcile period", exact: true }).click();
  const validation = workspaceRegion.getByRole("alert");
  await expect(validation).toBeFocused();
  await expect(validation).toContainText("From date must be on or before to date.");
  await expect(validation.getByRole("button", { name: "Retry history" })).toHaveCount(0);

  await start.fill("2042-02-01");
  await end.fill("2042-02-28");
  let reconcileWrites = 0;
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.status() === 201 && response.url().endsWith("/api/hr-admin/attendance-closes")) reconcileWrites += 1;
  });
  const reconciledResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/attendance-closes"));
  await page.getByRole("form", { name: "Reconcile attendance period", exact: true }).evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  const reconciled = await reconciledResponse;
  expect(reconciled.status()).toBe(201);
  expect(reconcileWrites).toBe(1);
  const created = await reconciled.json();

  const card = page.locator("article.record-card").filter({ hasText: "2042-02-01 to 2042-02-28" });
  await expect(card).toContainText("Version 1 · draft");
  await expect(card).toContainText("0 blockers");

  const submitted = page.waitForResponse((response) => response.request().method() === "POST" && response.status() === 200 && response.url().includes(`/${created.id}/submit`));
  await card.getByRole("button", { name: "Submit", exact: true }).click();
  expect((await submitted).status()).toBe(200);
  await expect(card).toContainText("Version 1 · submitted");

  const approved = page.waitForResponse((response) => response.request().method() === "POST" && response.status() === 200 && response.url().includes(`/${created.id}/approve`));
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  expect((await approved).status()).toBe(200);
  await expect(card).toContainText("Version 1 · approved");

  const closePeriod = card.getByRole("button", { name: "Close period", exact: true });
  await closePeriod.click();
  let dialog = page.getByRole("dialog", { name: "Confirm attendance close", exact: true });
  await expect(dialog).toContainText("This locks attendance history.");
  await dialog.getByRole("button", { name: "Close Confirm attendance close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(closePeriod).toBeFocused();
  await expect(card).toContainText("Version 1 · approved");

  await closePeriod.click();
  dialog = page.getByRole("dialog", { name: "Confirm attendance close", exact: true });
  const closed = page.waitForResponse((response) => response.request().method() === "POST" && response.status() === 200 && response.url().includes(`/${created.id}/close`));
  await dialog.getByRole("button", { name: "Confirm close", exact: true }).click();
  expect((await closed).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(card).toContainText("Version 1 · closed");

  const detail = await page.evaluate(async (id) => {
    const response = await fetch(`/api/hr-admin/attendance-closes/${id}/`);
    return { status: response.status, body: await response.json() };
  }, created.id);
  expect(detail.status).toBe(200);
  expect(detail.body.status).toBe("closed");
  expect(detail.body.events.map((event: { event_type: string }) => event.event_type)).toEqual(["reconciled", "submit", "approve", "close"]);

  const reopen = card.getByRole("button", { name: "Reopen", exact: true });
  await reopen.click();
  dialog = page.getByRole("dialog", { name: "Governed attendance reopen", exact: true });
  await expect(dialog.getByLabel("Reason for reopen", { exact: true })).toBeFocused();
  await dialog.getByLabel("Reason for reopen", { exact: true }).fill("Cancelled correction reason");
  await cancelDialog(dialog, reopen);
  await expect(card).toContainText("Version 1 · closed");

  await reopen.click();
  dialog = page.getByRole("dialog", { name: "Governed attendance reopen", exact: true });
  await dialog.getByLabel("Reason for reopen", { exact: true }).fill("Synthetic governed correction");
  const reopened = page.waitForResponse((response) => response.request().method() === "POST" && response.status() === 200 && response.url().includes(`/${created.id}/reopen`));
  await dialog.getByRole("button", { name: "Confirm reopen", exact: true }).click();
  expect((await reopened).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(card).toContainText("Version 1 · reopened");
  await card.getByText("Audit trail", { exact: true }).click();
  await expect(card).toContainText("Synthetic governed correction");

  await page.reload();
  await expect(page.locator("article.record-card").filter({ hasText: "2042-02-01 to 2042-02-28" })).toContainText("Version 1 · reopened");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  for (const button of await page.locator("main .button:visible").all()) {
    const box = await button.boundingBox();
    if (box) expect(box.height, await button.innerText()).toBeGreaterThanOrEqual(44);
  }
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const accessibility = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: object, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axe.run({ include: [["main"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  expect(accessibility.violations).toEqual([]);
});
