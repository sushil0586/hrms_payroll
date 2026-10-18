import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";

import { expect, test, type Page, type Route } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, personaForRoute } from "../helpers/staging-auth";

type PortalCase = { destination: string; label: string; source: string };

const portals: PortalCase[] = [
  { source: "/hr-admin", destination: "/hr-admin/employees", label: "Employees" },
  { source: "/ess", destination: "/ess/attendance", label: "Attendance" },
  { source: "/tenant-admin", destination: "/tenant-admin/users", label: "Users" },
  { source: "/platform-admin", destination: "/platform-admin/tenants", label: "Tenants" },
];

function isPrefetch(route: Route) {
  const headers = route.request().headers();
  return headers["next-router-prefetch"] === "1" || headers.purpose === "prefetch";
}

async function delayRoute(route: Route, delayMs: number) {
  if (isPrefetch(route)) {
    await route.abort();
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await route.continue();
}

async function prepareDelayedDestination(page: Page, destination: string, delayMs: number) {
  const pathPattern = new RegExp(`${destination.replaceAll("/", "\\/")}(?:\\?|$)`);
  await page.route(pathPattern, (route) => delayRoute(route, delayMs));
}

async function availablePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a local test port.");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(url: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

test.describe("Shared workspace navigation feedback", () => {
  for (const portal of portals) {
    test(`${portal.label} navigation reports localized pending state`, async ({ page }, testInfo) => {
      await prepareDelayedDestination(page, portal.destination, 750);
      await gotoAuthenticated(page, portal.source, personaForRoute(portal.source));
      const navigation = page.locator(".app-sidebar__nav");
      const link = navigation.locator(`a[href="${portal.destination}"]`).first();
      if (!(await link.isVisible())) {
        await link.locator("xpath=ancestor::details[1]/summary").click();
      }
      await expect(link).toBeVisible();

      const startedAt = Date.now();
      await link.click();
      const status = page.getByTestId("workspace-navigation-status");
      await expect(status).toBeVisible({ timeout: 500 });
      const feedbackMs = Date.now() - startedAt;
      expect(feedbackMs).toBeLessThan(500);
      await expect(status).toContainText(`Loading ${portal.label}`);
      await expect(navigation).toHaveAttribute("aria-busy", "true");
      await testInfo.attach("navigation-feedback.json", {
        body: Buffer.from(JSON.stringify({ ...portal, delayMs: 750, feedbackMs }, null, 2)),
        contentType: "application/json",
      });
      console.info(`workspace-navigation portal=${portal.source} delay_ms=750 indicator_ms=${feedbackMs}`);

      await expect(page).toHaveURL(new RegExp(`${portal.destination.replaceAll("/", "\\/")}(?:\\?|$)`));
      await expect(status).toHaveCount(0);
      await expect(page.locator(".app-content--workspace main h1")).toBeFocused();
    });
  }

  test("MSS navigation completes against a disposable small queue", async ({ page }, testInfo) => {
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await prepareDelayedDestination(page, "/mss/notifications", 750);
      await gotoAuthenticated(page, "/mss", workspacePersona(workspace, "manager"));
      const navigation = page.locator(".app-sidebar__nav");
      const link = navigation.locator('a[href="/mss/notifications"]');
      const startedAt = Date.now();
      await link.click();
      const status = page.getByTestId("workspace-navigation-status");
      await expect(status).toContainText("Loading Notifications", { timeout: 500 });
      const feedbackMs = Date.now() - startedAt;
      await expect(navigation).toHaveAttribute("aria-busy", "true");
      await expect(page).toHaveURL(/\/mss\/notifications$/);
      await expect(status).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Manager notifications" })).toBeFocused();
      await testInfo.attach("mss-disposable-navigation.json", {
        body: Buffer.from(JSON.stringify({ employeeCount: 4, feedbackMs, seedRef: workspace.seedRef }, null, 2)),
        contentType: "application/json",
      });
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("MSS navigation remains responsive with the realistic large approval queue", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/mss/approvals", personaForRoute("/mss/approvals"));
    await expect(page.getByRole("region", { name: "Manager approval metrics" })).toContainText("900");
    const startedAt = Date.now();
    await page.locator('.app-sidebar__nav a[href="/mss/notifications"]').click();
    const status = page.getByTestId("workspace-navigation-status");
    await expect(status).toContainText("Loading Notifications", { timeout: 500 });
    const feedbackMs = Date.now() - startedAt;
    await expect(page).toHaveURL(/\/mss\/notifications$/);
    await expect(page.getByRole("heading", { name: "Manager notifications" })).toBeFocused();
    const completionMs = Date.now() - startedAt;
    await expect(status).toHaveCount(0);
    await testInfo.attach("mss-large-navigation.json", {
      body: Buffer.from(JSON.stringify({ approvalCount: 900, completionMs, feedbackMs }, null, 2)),
      contentType: "application/json",
    });
    console.info(`mss-large-navigation approvals=900 indicator_ms=${feedbackMs} completion_ms=${completionMs}`);
  });

  test("mobile navigation remains compact during a two-second route transition", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepareDelayedDestination(page, "/ess/attendance", 2_000);
    await gotoAuthenticated(page, "/ess", personaForRoute("/ess"));
    const menu = page.locator("details.mobile-workspace-nav");
    await menu.locator("summary").click();
    const navigation = menu.locator(".mobile-workspace-nav__panel");
    const attendanceLink = navigation.locator('a[href="/ess/attendance"]');
    await attendanceLink.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("workspace-navigation-status")).toBeVisible({ timeout: 500 });
    await expect(page.locator(".workspace-navigation-status__spinner")).toHaveCSS("animation-name", "none");
    await expect(navigation).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((element) => element.clientWidth));
    await expect(page).toHaveURL(/\/ess\/attendance/);
    await expect(page.locator(".app-content--workspace main h1")).toBeFocused();
  });

  test("rapid route changes commit only the latest destination and clear feedback", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin", personaForRoute("/hr-admin"));
    const navigation = page.locator(".app-sidebar__nav");
    const routes = [
      { href: "/hr-admin/employees", delay: 2_000 },
      { href: "/hr-admin/lifecycle", delay: 750 },
      { href: "/hr-admin/employee-documents", delay: 300 },
    ];
    for (const item of routes) await prepareDelayedDestination(page, item.href, item.delay);

    for (const item of routes) {
      const link = navigation.locator(`a[href="${item.href}"]`).first();
      if (!(await link.isVisible())) await link.locator("xpath=ancestor::details[1]/summary").click();
      await link.click();
    }

    await expect(page.getByTestId("workspace-navigation-status")).toContainText("Loading Documents");
    await expect(page).toHaveURL(/\/hr-admin\/employee-documents$/);
    await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);
    await expect(page.locator(".app-content--workspace main h1")).toBeFocused();
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/hr-admin\/employee-documents$/);
  });

  test("cancelled navigation clears pending feedback and keeps the current page actionable", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", personaForRoute("/ess"));
    await prepareDelayedDestination(page, "/ess/attendance", 2_000);
    await prepareDelayedDestination(page, "/ess/leave", 300);
    await page.locator('.app-sidebar__nav a[href="/ess/attendance"]').click();
    await expect(page.getByTestId("workspace-navigation-status")).toBeVisible({ timeout: 500 });
    await page.locator('.app-sidebar__nav a[href="/ess/leave"]').click();
    await expect(page.getByTestId("workspace-navigation-status")).toContainText("Loading Leave");
    await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);
    await expect(page).toHaveURL(/\/ess\/leave$/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeFocused();
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/ess\/leave$/);
  });

  test("directory filters and pagination retain content with latest-query-wins behavior", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", personaForRoute("/hr-admin/employees"));
    const directory = page.locator(".queue-toolbar").filter({ has: page.getByRole("heading", { name: "Employee directory" }) });
    const search = directory.getByLabel("Search", { exact: true });
    const apply = directory.locator("form").first().getByRole("button", { name: "Apply" });
    const rows = directory.locator(".employee-directory-table tbody tr");
    const retainedEmployee = await rows.first().locator("strong").first().innerText();
    const delays = new Map([["L2-A", 2_000], ["L2-B", 750], ["L2-C", 300]]);
    let resolveOldest: () => void = () => undefined;
    const oldestCompleted = new Promise<void>((resolve) => { resolveOldest = resolve; });
    await page.route(/\/hr-admin\/employees\?.*/, async (route) => {
      if (isPrefetch(route)) return route.abort();
      const query = new URL(route.request().url()).searchParams.get("q");
      const delay = delays.get(query ?? "") ?? 0;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      await route.continue();
      if (query === "L2-A") resolveOldest();
    });

    for (const query of ["L2-A", "L2-B", "L2-C"]) {
      await search.fill(query);
      await apply.click();
      await expect(page.getByTestId("workspace-navigation-status")).toContainText("Loading Apply");
      await expect(directory).toHaveAttribute("aria-busy", "true");
      await expect(rows.first()).toContainText(retainedEmployee);
    }
    await expect(page).toHaveURL(/q=L2-C/);
    await oldestCompleted;
    await expect(page).toHaveURL(/q=L2-C/);
    await expect(page.getByText("No employees in this view.")).toBeVisible();
    await expect(page.locator(".app-content--workspace main h1")).not.toBeFocused();

    await page.goBack();
    await expect(page).toHaveURL(/\/hr-admin\/employees\?page_size=5$/);
    await expect(rows.first()).toContainText(retainedEmployee);
    await page.goForward();
    await expect(page).toHaveURL(/q=L2-C/);
    await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/q=L2-C/);
    await expect(page.getByText("No employees in this view.")).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", personaForRoute("/hr-admin/employees"));
    const next = page.getByRole("link", { name: "Next" });
    await page.route(/\/hr-admin\/employees\?.*page=2.*/, (route) => delayRoute(route, 2_000));
    const startedAt = Date.now();
    await next.click();
    await expect(page.getByTestId("workspace-navigation-status")).toContainText("Loading Next", { timeout: 500 });
    const feedbackMs = Date.now() - startedAt;
    expect(feedbackMs).toBeLessThan(500);
    console.info(`workspace-pagination delay_ms=2000 indicator_ms=${feedbackMs}`);
    await expect(page).toHaveURL(/page=2/);
  });

  test("imperative attendance filters use localized pending feedback and latest-query wins", async ({ page }, testInfo) => {
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      const persona = workspacePersona(workspace, "hr_admin");
      await gotoAuthenticated(page, "/hr-admin/attendance-records", persona);
      const recordsToolbar = page.getByRole("region", { name: "Attendance records toolbar" });
      const recordsSearch = recordsToolbar.getByLabel("Search", { exact: true });
      const recordsApply = recordsToolbar.getByRole("button", { name: "Apply filters" });
      const delays = new Map([["L6C-A", 2_000], ["L6C-B", 750], ["L6C-C", 300]]);
      await page.route(/\/hr-admin\/attendance-records\?.*/, async (route) => {
        if (isPrefetch(route)) return route.abort();
        const query = new URL(route.request().url()).searchParams.get("q") ?? "";
        const delay = delays.get(query) ?? 0;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        await route.continue();
      });

      const startedAt = Date.now();
      for (const query of delays.keys()) {
        await recordsSearch.fill(query);
        await recordsApply.click();
        await expect(page.getByTestId("workspace-navigation-status")).toContainText("Loading attendance filters", { timeout: 500 });
        await expect(recordsToolbar).toHaveAttribute("aria-busy", "true");
      }
      const feedbackMs = Date.now() - startedAt;
      await expect(page).toHaveURL(/q=L6C-C/);
      await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);
      await page.waitForTimeout(2_000);
      await expect(page).toHaveURL(/q=L6C-C/);

      await gotoAuthenticated(page, "/hr-admin/attendance-regularizations", persona);
      const regularizationToolbar = page.locator(".attendance-queue-toolbar");
      await page.route(/\/hr-admin\/attendance-regularizations\?.*/, (route) => delayRoute(route, 750));
      await regularizationToolbar.getByLabel("Search", { exact: true }).fill("L6C-regularization");
      await regularizationToolbar.getByRole("button", { name: "Apply filters" }).click();
      await expect(page.getByTestId("workspace-navigation-status")).toContainText("Loading regularization page 1", { timeout: 500 });
      await expect(regularizationToolbar).toHaveAttribute("aria-busy", "true");
      await expect(page).toHaveURL(/q=L6C-regularization/);
      await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);

      await testInfo.attach("attendance-imperative-navigation.json", {
        body: Buffer.from(JSON.stringify({ delaysMs: [...delays.values(), 750], feedbackWithinMs: feedbackMs, latestQuery: "L6C-C", seedRef: workspace.seedRef }, null, 2)),
        contentType: "application/json",
      });
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("Tenant Admin route error clears pending feedback and Retry succeeds", async ({ page }) => {
    test.slow();
    await gotoAuthenticated(page, "/tenant-admin", personaForRoute("/tenant-admin"));
    const backendOrigin = new URL(process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8001/api/v1").origin;
    let failTenantConsole = false;
    const proxy = createServer(async (request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (failTenantConsole && requestUrl.pathname === "/api/v1/tenant-admin/console/") {
        await new Promise((resolve) => setTimeout(resolve, 750));
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ detail: "Injected Tenant Admin console failure." }));
        return;
      }
      try {
        const body: Buffer[] = [];
        for await (const chunk of request) body.push(Buffer.from(chunk));
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value && !["connection", "content-length", "host"].includes(key)) headers.set(key, Array.isArray(value) ? value.join(",") : value);
        });
        const upstream = await fetch(`${backendOrigin}${requestUrl.pathname}${requestUrl.search}`, {
          body: ["GET", "HEAD"].includes(request.method ?? "GET") ? undefined : Buffer.concat(body),
          headers,
          method: request.method,
        });
        response.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
        response.end(Buffer.from(await upstream.arrayBuffer()));
      } catch (error) {
        response.writeHead(502, { "content-type": "application/json" });
        response.end(JSON.stringify({ detail: String(error) }));
      }
    });
    await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
    const proxyAddress = proxy.address();
    if (!proxyAddress || typeof proxyAddress === "string") throw new Error("Fault proxy did not expose a TCP port.");
    const nextPort = await availablePort();
    const output: string[] = [];
    const nextProcess = spawn("pnpm", ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", String(nextPort)], {
      cwd: path.resolve(__dirname, "../.."),
      env: {
        ...process.env,
        HRMS_API_BASE_URL: `http://127.0.0.1:${proxyAddress.port}/api/v1`,
        HRMS_ENABLE_DEMO_DATA: "false",
        NEXT_DIST_DIR: ".next/l2a-fault",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    nextProcess.stdout?.on("data", (chunk) => output.push(String(chunk)));
    nextProcess.stderr?.on("data", (chunk) => output.push(String(chunk)));

    try {
      const isolatedBaseUrl = `http://127.0.0.1:${nextPort}`;
      await waitForServer(isolatedBaseUrl);
      await page.goto(`${isolatedBaseUrl}/tenant-admin`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /Tenant Administration|Account Control Center/i }).first()).toBeVisible();
      failTenantConsole = true;
      await page.locator('.app-sidebar__nav a[href="/tenant-admin/users"]').click();
      await expect(page.getByTestId("workspace-navigation-status")).toBeVisible({ timeout: 500 });
      await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Tenant admin could not load the current workspace" })).toBeVisible();
      await expect(page.getByRole("alert").filter({ hasText: "Live workspace load failed" })).toBeVisible();
      failTenantConsole = false;
      await page.getByRole("button", { name: "Retry workspace" }).click();
      await expect(page.getByRole("heading", { name: "Tenant User Management" })).toBeVisible();
      await expect(page).toHaveURL(/\/tenant-admin\/users$/);
      await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);
    } finally {
      nextProcess.kill("SIGTERM");
      await new Promise<void>((resolve) => proxy.close(() => resolve()));
      await test.info().attach("tenant-fault-next.log", {
        body: Buffer.from(output.join("").slice(-20_000)),
        contentType: "text/plain",
      });
    }
  });
});
