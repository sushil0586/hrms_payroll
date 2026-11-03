import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";

const repo = path.resolve(__dirname, "../../..");
const evidenceRoot = process.env.QA_DOCUMENT_EVIDENCE_ROOT ?? path.join(repo, "docs/qa/evidence/document-lifecycle-phase7-2026-11-03");
let fixture: IsolatedQaWorkspace;
let context: { category: string; base: string; employee: string };

function fixtureScript(cleanup = false) {
  execFileSync(path.join(repo, ".venv/bin/python"), ["backend/manage.py", "shell", "-c", "exec(open('web/tests/document-makeover/phase7-fixtures.py').read())"], {
    cwd: repo,
    env: { ...process.env, QA_PHASE7_MANIFEST: fixture.manifestPath, QA_PHASE7_EVIDENCE: evidenceRoot, QA_PHASE7_CLEANUP: cleanup ? "1" : "" },
  });
}

test.beforeAll(async ({}, testInfo) => {
  fixture = await provisionIsolatedQaWorkspace(testInfo);
  mkdirSync(evidenceRoot, { recursive: true });
  fixtureScript();
  context = JSON.parse(readFileSync(path.join(fixture.tempDir, "phase7-context.json"), "utf8"));
});
test.afterAll(async () => {
  if (!fixture) return;
  try { fixtureScript(true); } finally { await cleanupIsolatedQaWorkspace(fixture); }
});

async function login(page: any, persona: "employee" | "hr_admin" | "manager" = "employee") {
  const user = workspacePersona(fixture, persona);
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username or email", { exact: true }).fill(user.username);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  const loginResponse = page.waitForResponse((response: any) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect.poll(async () => (await page.context().cookies()).some((cookie: any) => cookie.name === "hrms_access_token")).toBeTruthy();
  const workspacePath = persona === "hr_admin" ? "/hr-admin" : persona === "manager" ? "/mss" : "/ess";
  await expect(page).toHaveURL(new RegExp(`${workspacePath}(?:[/?]|$)`));
}
async function open(page: any, url: string) {
  expect((await page.goto(url, { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
  const hydrated = page.locator("[data-hydrated]");
  if (await hydrated.count()) await expect(hydrated.last()).toHaveAttribute("data-hydrated", "true");
}
async function uploadReplacement(page: any, title: string) {
  await open(page, "/ess/documents");
  const row = page.getByRole("table", { name: "Required documents", exact: true }).getByRole("row").filter({ hasText: "QA Governed Identity" });
  await row.getByRole("button", { name: "Replace", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("File", { exact: true }).setInputFiles({ name: `${title}.txt`, mimeType: "text/plain", buffer: Buffer.from(`${title} synthetic bytes\n`) });
  const response = page.waitForResponse((item: any) => item.url().endsWith("/api/me/employee-documents") && item.request().method() === "POST");
  await dialog.getByRole("button", { name: "Submit for review", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  return result.json();
}
async function documents(page: any) {
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/hr-admin/employee-documents?page_size=100", { credentials: "same-origin" });
    return { status: response.status, body: await response.json() };
  });
  expect(result.status).toBe(200);
  return result.body.items;
}

test("replacement withdrawal is governed, idempotent and preserves approved authority", async ({ page }, testInfo) => {
  await login(page);
  const candidate = await uploadReplacement(page, `Phase 7 withdraw ${testInfo.project.name}`);
  await login(page, "hr_admin");
  let rows = await documents(page);
  expect(rows.find((item: any) => item.id === context.base)).toMatchObject({ status: "active", verification_status: "verified" });
  expect(rows.find((item: any) => item.id === candidate.id)).toMatchObject({ status: "pending_replacement", previous_document_id: context.base });

  await login(page);
  await open(page, `/ess/documents?q=${encodeURIComponent(candidate.title)}`);
  const historyRow = page.getByRole("table", { name: "Document history", exact: true }).getByRole("row").filter({ hasText: candidate.title });
  await historyRow.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Withdraw replacement", exact: true }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation).toContainText("approved document remains active");
  const withdrawal = page.waitForResponse((item: any) => item.url().endsWith(`/${candidate.id}/withdraw`) && item.request().method() === "POST");
  await confirmation.getByRole("button", { name: "Withdraw replacement", exact: true }).click();
  expect((await withdrawal).status()).toBe(200);
  await expect(page.locator(".action-toast")).toContainText("Replacement withdrawn");

  const replay = await page.evaluate(async (id: string) => (await fetch(`/api/me/employee-documents/${id}/withdraw`, { method: "POST", credentials: "same-origin" })).status, candidate.id);
  expect(replay).toBe(200);
  await login(page, "manager");
  expect(await page.evaluate(async (id: string) => (await fetch(`/api/me/employee-documents/${id}/withdraw`, { method: "POST", credentials: "same-origin" })).status, candidate.id)).toBe(404);
  await login(page, "hr_admin");
  rows = await documents(page);
  expect(rows.find((item: any) => item.id === candidate.id).status).toBe("withdrawn");
  expect(rows.find((item: any) => item.id === context.base).status).toBe("active");
  appendFileSync(path.join(evidenceRoot, "lifecycle-proof.jsonl"), JSON.stringify({ browser: testInfo.project.name, action: "withdraw", candidate: candidate.id, approved: context.base, cross_employee: 404 }) + "\n");
});

test("HR comparison, rejection reason and approval promotion follow the lifecycle contract", async ({ page }, testInfo) => {
  await login(page);
  const rejected = await uploadReplacement(page, `Phase 7 reject ${testInfo.project.name}`);
  await login(page, "hr_admin");
  await open(page, `/hr-admin/employee-documents?q=${encodeURIComponent(rejected.title)}`);
  await page.getByRole("row").filter({ hasText: rejected.title }).getByRole("button", { name: "Inspect", exact: true }).click();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Compare with approved version v1");
  await expect(dialog.getByRole("link", { name: "Download approved version", exact: true })).toBeVisible();
  await dialog.getByLabel("Verification status", { exact: true }).selectOption("rejected");
  await dialog.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Review was not saved");
  await expect(dialog.getByText("A rejection reason is required.", { exact: true })).toBeVisible();
  await dialog.getByLabel("Rejection reason or review note", { exact: true }).fill("Synthetic evidence is unreadable.");
  await dialog.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await login(page);
  const approved = await uploadReplacement(page, `Phase 7 approve ${testInfo.project.name}`);
  await open(page, "/ess/documents");
  const requirement = page.getByRole("table", { name: "Required documents", exact: true }).getByRole("row").filter({ hasText: "QA Governed Identity" });
  await expect(requirement.getByRole("button", { name: "Under review", exact: true })).toBeDisabled();
  const duplicateStatus = await page.evaluate(async ({ category, base }: { category: string; base: string }) => {
    const body = new FormData();
    body.set("category_id", category);
    body.set("replace_document_id", base);
    body.set("title", "Duplicate candidate");
    body.set("file", new File(["duplicate"], "duplicate.txt", { type: "text/plain" }));
    return (await fetch("/api/me/employee-documents", { method: "POST", body, credentials: "same-origin" })).status;
  }, { category: context.category, base: context.base });
  expect(duplicateStatus).toBe(400);

  await login(page, "hr_admin");
  await open(page, `/hr-admin/employee-documents?q=${encodeURIComponent(approved.title)}`);
  await page.getByRole("row").filter({ hasText: approved.title }).getByRole("button", { name: "Inspect", exact: true }).click();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Verification status", { exact: true }).selectOption("verified");
  await dialog.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const rows = await documents(page);
  expect(rows.find((item: any) => item.id === context.base).status).toBe("replaced");
  expect(rows.find((item: any) => item.id === approved.id)).toMatchObject({ status: "active", verification_status: "verified" });
  expect(rows.find((item: any) => item.id === rejected.id)).toMatchObject({ status: "archived", verification_status: "rejected" });
  appendFileSync(path.join(evidenceRoot, "lifecycle-proof.jsonl"), JSON.stringify({ browser: testInfo.project.name, action: "review", rejected: rejected.id, approved: approved.id, duplicate_status: duplicateStatus }) + "\n");
});

test("document lifecycle dialogs remain contained and keyboard reachable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await open(page, "/ess/documents");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const row = page.getByRole("table", { name: "Required documents", exact: true }).getByRole("row").filter({ hasText: "QA Governed Identity" });
  await row.getByRole("button", { name: "Replace", exact: true }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeInViewport();
  expect(await dialog.evaluate((node: HTMLElement) => node.scrollWidth <= node.clientWidth)).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Replace", exact: true })).toBeFocused();
});
