import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  workspacePlatformPersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";
let workspace: IsolatedQaWorkspace,
  proxy: Server,
  closed: { close_id: string; hash: string };
let fault: { path: string; status?: number; delay?: number } | undefined;
let mutations = 0;
const evidence = process.env.HRMS_CERT_EVIDENCE_DIR!;
function django(code: string) {
  return execFileSync(
    path.resolve(__dirname, "../../../.venv/bin/python"),
    ["backend/manage.py", "shell", "-c", code],
    {
      cwd: path.resolve(__dirname, "../../.."),
      env: process.env,
      encoding: "utf8",
    },
  );
}
const errors: string[] = [];
test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000);
  if (
    process.env.POSTGRES_DB !== "hrms_ess2" ||
    process.env.POSTGRES_HOST !== "127.0.0.1"
  )
    throw Error("Requires isolated loopback database");
  workspace = await provisionIsolatedQaWorkspace(info);
  closed = JSON.parse(
    django(
      `import json; from tests.ess5_browser_fixture import prepare; print(json.dumps(prepare(${JSON.stringify(workspace.manifestPath)})))`,
    )
      .trim()
      .split("\n")
      .at(-1)!,
  );
  proxy = createServer(async (req, res) => {
    try {
      const url = req.url || "/";
      const active = fault?.path === url.split("?")[0] ? fault : undefined;
      if (req.method === "PATCH") mutations++;
      if (active?.delay) await new Promise((r) => setTimeout(r, active.delay));
      if (active?.status) {
        res.writeHead(active.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ detail: "Synthetic ESS5 service failure" }));
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers))
        if (
          typeof value === "string" &&
          !["host", "connection", "content-length"].includes(key)
        )
          headers[key] = value;
      const result = await fetch(`http://127.0.0.1:8048${url}`, {
        method: req.method,
        headers,
        ...(body.length ? { body } : {}),
      });
      res.writeHead(result.status, {
        "Content-Type":
          result.headers.get("content-type") || "application/json",
      });
      res.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      res.writeHead(502);
      res.end("Synthetic proxy failure");
    }
  });
  await new Promise<void>((resolve, reject) => {
    proxy.once("error", reject);
    proxy.listen(8069, "127.0.0.1", resolve);
  });
});
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(e.message));
});
test.afterEach(async () => {
  fault = undefined;
  expect(errors).toEqual([]);
});
test.afterAll(async ({}, info) => {
  try {
    if (closed)
      django(
        `from tests.ess2_browser_fixture import verify; verify("${closed.close_id}","${closed.hash}")`,
      );
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
    await writeFile(
      path.join(evidence, `${info.project.name}-fixture-cleanup.json`),
      JSON.stringify({
        seed_ref: workspace?.seedRef,
        verified_absent: Boolean(workspace),
        finalized_snapshot_preserved: Boolean(closed),
      }),
    );
    if (proxy) await new Promise<void>((r) => proxy.close(() => r()));
  }
});
async function open(page: Page, route: string) {
  await gotoAuthenticated(page, route, workspacePersona(workspace, "employee"));
}
async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(evidence, name), fullPage: true });
}

test("request source selection, page-local search/sort, pagination and canonical details", async ({
  page,
}, info) => {
  await open(page, "/ess/requests");
  await expect(
    page.getByRole("heading", { name: "My Requests", exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table", { name: "My requests", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(10);
  await screenshot(page, `${info.project.name}-requests-desktop.png`);
  await page.getByLabel("Search this page").fill("nonexistent-ess5");
  await expect(
    page.getByText("No requests match this page search."),
  ).toBeVisible();
  await page.getByLabel("Search this page").fill("");
  await page.getByLabel("Sort this page").selectOption("effective");
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Review request", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/ess/requests?type=attendance");
  await expect(page.getByRole("table", { name: "My requests" })).toContainText(
    "Attendance regularization",
  );
  await page
    .getByRole("link", { name: "Review request", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("status filtering, empty results, invalid parameters and refresh", async ({
  page,
}) => {
  await open(
    page,
    "/ess/requests?type=attendance&status=cancelled&page=999999999",
  );
  await expect(
    page.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("all");
  await expect(
    page.getByRole("heading", { name: "My Requests", exact: true }),
  ).toBeVisible();
  await page.goto("/ess/requests?type=leave&status=cancelled");
  await expect(
    page.getByText("No requests match the selected workflow and status."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("cancelled");
  await page.goto(
    "/ess/notifications?status=unknown&channel=unknown&priority=unknown&page=999999999",
  );
  await expect(
    page.getByRole("combobox", { name: "Delivery status", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Channel", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("table", { name: "Employee notifications" }),
  ).toBeVisible();
});
test("notification read/unread persists and delivery failure remains separate", async ({
  page,
}, info) => {
  await open(page, "/ess/notifications?q=ESS5+provider");
  await expect(
    page.getByRole("table", { name: "Employee notifications" }),
  ).not.toContainText("manager private");
  await page.getByRole("button", { name: /Review notification:/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Delivery failed.");
  await expect(
    dialog.getByRole("button", { name: /retry delivery/i }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Mark read", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Mark unread", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
    .toBe(true);
  await screenshot(page, `${info.project.name}-notification-detail.png`);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Review notification:/ }),
  ).toBeFocused();
  await page.reload();
  await expect(page.getByRole("table")).toContainText("Read");
  await page.getByRole("button", { name: /Review notification:/ }).click();
  await page.getByRole("button", { name: "Mark unread", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mark read", exact: true }),
  ).toBeVisible();
});
test("mutation retry preserves read state and duplicate activation is locked", async ({
  page,
}) => {
  await open(page, "/ess/notifications?q=ESS5+provider");
  await page.getByRole("button", { name: /Review notification:/ }).click();
  const token = (await page.context().cookies()).find(
    (c) => c.name === "hrms_access_token",
  )!.value;
  const rows = await (
    await page.request.get(
      "http://127.0.0.1:8048/api/v1/me/notifications/?q=ESS5+provider",
      { headers: { Authorization: `Token ${token}` } },
    )
  ).json();
  const path = `/api/v1/me/notifications/${rows.items[0].id}/`;
  fault = { path, status: 503 };
  await page.getByRole("button", { name: "Mark read", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("alert")
      .filter({ hasText: "Synthetic ESS5" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mark read", exact: true }),
  ).toBeEnabled();
  fault = { path, delay: 1000 };
  const before = mutations;
  const button = page.getByRole("button", { name: "Mark read", exact: true });
  await button.evaluate((el) => {
    (el as HTMLButtonElement).click();
    (el as HTMLButtonElement).click();
  });
  await expect(
    page.getByRole("button", { name: "Mark unread", exact: true }),
  ).toBeVisible();
  expect(mutations - before).toBe(1);
});
test("notification search, pagination, source navigation and empty state", async ({
  page,
}, info) => {
  await open(page, "/ess/notifications?q=ESS5+message");
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(10);
  await screenshot(page, `${info.project.name}-inbox-desktop.png`);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(2);
  await page
    .getByRole("button", { name: /Review notification:/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Open source", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/ess\/leave\?requestId=/);
  await page.goto("/ess/notifications?q=ESS5-NONEXISTENT");
  await expect(
    page.getByText("No notifications match your filters."),
  ).toBeVisible();
});
test("live read failure and fresh retry", async ({ page }) => {
  fault = { path: "/api/v1/me/leave-requests/", status: 503 };
  await open(page, "/ess/requests");
  await expect(
    page.getByRole("heading", { name: "Employee information is unavailable" }),
  ).toBeVisible();
  fault = undefined;
  await page.getByRole("button", { name: "Retry workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "My Requests", exact: true }),
  ).toBeVisible();
  fault = { path: "/api/v1/me/notifications/", status: 503 };
  await page.goto("/ess/notifications");
  await expect(
    page.getByRole("button", { name: "Retry workspace" }),
  ).toBeVisible();
  fault = undefined;
  await page.getByRole("button", { name: "Retry workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true }),
  ).toBeVisible();
});
test("settings has authorized context and no invented mutations; role rejection", async ({
  page,
}, info) => {
  await open(page, "/ess/settings");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Preferences and security", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "My Profile", exact: true }).last(),
  ).toBeVisible();
  await screenshot(page, `${info.project.name}-settings-desktop.png`);
  await page
    .getByRole("link", { name: "Password recovery", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Reset password", exact: true }),
  ).toBeVisible();
  await page.goto("/ess/settings");
  const headers = {
    Authorization: `Token ${(await page.context().cookies()).find((c) => c.name === "hrms_access_token")!.value}`,
  };
  for (const url of [
    "/api/v1/hr-admin/notification-channel-configs/",
    "/api/v1/hr-admin/employees/",
  ]) {
    const result = await page.request.get(`http://127.0.0.1:8048${url}`, {
      headers,
    });
    expect([403, 404]).toContain(result.status());
  }
  await gotoAuthenticated(
    page,
    "/ess/settings",
    workspacePlatformPersona(workspace),
  );
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toHaveCount(0);
});
test("mobile tablet keyboard dialog containment, reduced motion and navigation", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ess/notifications?q=ESS5+provider");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 568 });
    await page.getByRole("button", { name: /Review notification:/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", { name: /Close / });
    await expect(close).toBeFocused();
    for (const action of [
      close,
      dialog.getByRole("button", { name: /Mark (un)?read/ }),
    ]) {
      const box = await action.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(568);
    }
    const body = dialog.locator(".hr-admin-action-modal__body");
    const overflow = await body.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    if (overflow) {
      await body.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(
        body.getByText("Delivery failed.", { exact: false }),
      ).toBeInViewport();
    }
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("button", { name: /Mark (un)?read/ }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await screenshot(page, `${info.project.name}-notification-${width}.png`);
    await page.keyboard.press("Escape");
    await expectNoHorizontalOverflow(page);
    await page.goto("/ess/requests");
    await expectNoHorizontalOverflow(page);
    const region = page.getByRole("region", {
      name: "Request history table, scroll horizontally for details",
    });
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    await region.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await screenshot(page, `${info.project.name}-requests-${width}.png`);
    await page.goto("/ess/settings");
    await expectNoHorizontalOverflow(page);
    await page.getByText("Menu", { exact: true }).click();
    const menu = page.locator(".mobile-workspace-nav__panel");
    const settings = menu.getByRole("link", {
      name: "Settings Employee account",
      exact: true,
    });
    await settings.scrollIntoViewIfNeeded();
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(569);
    await screenshot(page, `${info.project.name}-navigation-${width}.png`);
    await settings.click();
    await expect(page.locator(".mobile-workspace-nav")).toHaveJSProperty(
      "open",
      false,
    );
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    await screenshot(page, `${info.project.name}-settings-${width}.png`);
    await page.goto("/ess/notifications?q=ESS5+provider");
  }
});

test("neighboring MSS notification read state and approvals navigation", async ({
  page,
}, info) => {
  await gotoAuthenticated(
    page,
    "/mss/notifications",
    workspacePersona(workspace, "manager"),
  );
  await expect(
    page.getByRole("heading", { name: "Manager notifications", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review notification", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Mark read", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Mark unread", exact: true }),
  ).toBeVisible();
  await screenshot(page, `${info.project.name}-mss-notification.png`);
  await page.keyboard.press("Escape");
  await page.goto("/mss/approvals");
  await expect(
    page.getByRole("heading", { name: /Manager approvals/ }),
  ).toBeVisible();
});

test("a delayed read response cannot replace another selected notification", async ({
  page,
}) => {
  await open(page, "/ess/notifications?q=ESS5+message");
  const buttons = page.getByRole("button", { name: /Review notification:/ });
  const firstTitle = await buttons.nth(0).getAttribute("aria-label");
  const secondTitle = await buttons.nth(1).getAttribute("aria-label");
  const token = (await page.context().cookies()).find(
    (c) => c.name === "hrms_access_token",
  )!.value;
  const result = await page.request.get(
    "http://127.0.0.1:8048/api/v1/me/notifications/?q=ESS5+message",
    { headers: { Authorization: `Token ${token}` } },
  );
  const rows = await result.json();
  fault = {
    path: `/api/v1/me/notifications/${rows.items[0].id}/`,
    delay: 1500,
  };
  await buttons.nth(0).click();
  const completed = page.waitForResponse(
    (r) =>
      r.url().includes(rows.items[0].id) && r.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Mark read", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Close / })
    .click();
  await buttons.nth(1).click();
  await completed;
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(
    secondTitle!.replace("Review notification: ", ""),
  );
  await expect(
    page.getByRole("button", { name: "Mark read", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("table")
      .locator("tbody tr")
      .filter({
        has: page.getByRole("button", { name: firstTitle!, exact: true }),
      }),
  ).toContainText("Read");
});

test("request controls submit real source/status filters and change page sorting", async ({
  page,
}) => {
  await open(page, "/ess/requests");
  const table = page.getByRole("table", { name: "My requests", exact: true });
  await expect(table.locator("tbody tr").first()).toContainText(
    "Synthetic history 16",
  );
  await page
    .getByRole("combobox", { name: "Sort this page", exact: true })
    .selectOption("oldest");
  await expect(table.locator("tbody tr").first()).toContainText(
    "Synthetic history 7",
  );
  await page
    .getByRole("combobox", { name: "Sort this page", exact: true })
    .selectOption("newest");
  await expect(table.locator("tbody tr").first()).toContainText(
    "Synthetic history 16",
  );
  await page
    .getByRole("combobox", { name: "Sort this page", exact: true })
    .selectOption("effective");
  await expect(table.locator("tbody tr").first()).toContainText(
    "Synthetic history 7",
  );
  await page
    .getByRole("searchbox", { name: "Search this page", exact: true })
    .fill("history 16");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Search this page", exact: true })
    .fill("");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("pending");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/status=pending/);
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody tr").first()).toContainText("pending");
  await page
    .getByRole("combobox", { name: "Request type", exact: true })
    .selectOption("attendance");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/type=attendance/);
  await expect(table).toContainText("Attendance regularization");
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Request type", exact: true }),
  ).toHaveValue("leave");
  await expect(table.locator("tbody tr")).toHaveCount(10);
});
