import { createServer, type Server } from "node:http";
import { request as proxyRequest } from "node:http";

import { expect, test, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

const proxyPort = Number(process.env.WAVE15_PROXY_PORT ?? 8065);
const backendPort = Number(process.env.WAVE15_BACKEND_PORT ?? 8066);

type FaultMode = "normal" | "delay" | "fail";
let mode: FaultMode = "normal";
let matchPrefix = "";
let matchedRequests = 0;
let proxy: Server;

function isTarget(path: string) {
  return Boolean(matchPrefix) && path.startsWith(matchPrefix);
}

test.beforeAll(async () => {
  proxy = createServer((request, response) => {
    const path = request.url ?? "/";
    if (path.startsWith("/__wave15/control")) {
      const control = new URL(path, `http://127.0.0.1:${proxyPort}`);
      mode = (control.searchParams.get("mode") as FaultMode) ?? "normal";
      matchPrefix = control.searchParams.get("prefix") ?? "";
      matchedRequests = 0;
      response.writeHead(204).end();
      return;
    }
    if (path === "/__wave15/stats") {
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ matchedRequests }));
      return;
    }

    const forward = () => {
      const upstream = proxyRequest({
        hostname: "127.0.0.1",
        port: backendPort,
        path,
        method: request.method,
        headers: request.headers,
      }, (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });
      request.pipe(upstream);
      upstream.on("error", () => response.writeHead(502, { "content-type": "application/json" }).end('{"detail":"Proxy upstream unavailable."}'));
    };

    if (isTarget(path)) {
      matchedRequests += 1;
      if (mode === "fail") {
        response.writeHead(503, { "content-type": "application/json" }).end('{"detail":"Controlled Wave 15 read failure."}');
        return;
      }
      if (mode === "delay") {
        setTimeout(forward, 1200);
        return;
      }
    }
    forward();
  });
  await new Promise<void>((resolve) => proxy.listen(proxyPort, "127.0.0.1", resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => proxy.close((error) => error ? reject(error) : resolve()));
});

async function control(nextMode: FaultMode, prefix: string) {
  const response = await fetch(`http://127.0.0.1:${proxyPort}/__wave15/control?mode=${nextMode}&prefix=${encodeURIComponent(prefix)}`);
  expect(response.status).toBe(204);
}

async function stats() {
  return (await (await fetch(`http://127.0.0.1:${proxyPort}/__wave15/stats`)).json()) as { matchedRequests: number };
}

async function assertFailureAndRecovery(page: Page, path: string, prefix: string, title: string) {
  await control("fail", prefix);
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "This workspace could not be loaded" })).toBeVisible();
  await expect(page.locator(".notice[role='alert']")).toContainText("Live workspace load failed.");
  await expect(page.getByText(/success/i)).toHaveCount(0);
  await control("normal", prefix);
  await page.getByRole("button", { name: "Retry workspace" }).click();
  await expectPageReady(page, title);
}

test("CRUD-01352 CRUD-01358 CRUD-04872 CRUD-04873 CRUD-04875 CRUD-04876 assignment read loading failure and recovery", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    await gotoAuthenticated(page, "/hr-admin/policy-assignments", workspacePersona(workspace, "hr_admin"));
    await control("delay", "/api/v1/hr-admin/attendance-policy-assignments/");
    await page.getByRole("link", { name: "Open attendance assignments" }).click();
    await expect(page.getByLabel("Loading attendance workspace")).toBeVisible();
    await expectPageReady(page, "Attendance assignments");
    expect((await stats()).matchedRequests).toBe(1);

    await assertFailureAndRecovery(
      page,
      "/hr-admin/attendance-policy-assignments",
      "/api/v1/hr-admin/attendance-policy-assignments/",
      "Attendance assignments",
    );
  } finally {
    await control("normal", "");
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("CRUD-00217 CRUD-04197 CRUD-04198 shift assignment read loading failure and recovery", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    await gotoAuthenticated(page, "/hr-admin/attendance-operations", workspacePersona(workspace, "hr_admin"));
    await control("delay", "/api/v1/hr-admin/employee-shift-assignments/");
    await page.getByRole("link", { name: "Shift assignments", exact: true }).first().click();
    await expect(page.getByLabel("Loading attendance workspace")).toBeVisible();
    await expectPageReady(page, "Shift assignments");
    expect((await stats()).matchedRequests).toBe(1);
    await assertFailureAndRecovery(page, "/hr-admin/employee-shift-assignments", "/api/v1/hr-admin/employee-shift-assignments/", "Shift assignments");
  } finally {
    await control("normal", "");
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("CRUD-01569 CRUD-01582 CRUD-05004 CRUD-05005 CRUD-05010 CRUD-05011 roster read states and recovery", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    await gotoAuthenticated(page, "/hr-admin/attendance-operations", workspacePersona(workspace, "hr_admin"));
    await control("delay", "/api/v1/hr-admin/shift-roster-");
    await page.locator("a[href='/hr-admin/shift-roster-templates']").first().click();
    await expect(page.getByLabel("Loading attendance workspace")).toBeVisible();
    await expectPageReady(page, "Roster templates");
    await expect(page.getByRole("status")).toContainText("No roster rollout history yet.");
    expect((await stats()).matchedRequests).toBe(2);
    await assertFailureAndRecovery(page, "/hr-admin/shift-roster-templates", "/api/v1/hr-admin/shift-roster-", "Roster templates");
  } finally {
    await control("normal", "");
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
