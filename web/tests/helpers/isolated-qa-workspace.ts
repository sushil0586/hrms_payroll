import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { APIRequestContext, TestInfo } from "@playwright/test";
import type { Persona } from "./staging-auth";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, "../../..");

export type IsolatedQaWorkspace = {
  seedRef: string;
  manifestPath: string;
  tempDir: string;
  manifest: {
    tenant: { id: string; code: string };
    credentials: Record<string, { username: string; employee_id: string; employee_code: string }>;
    payroll: { calendar_id: string; period_id: string; pay_group_id: string; salary_assignment_id: string };
    leave: { policy_id: string; balance_id: string };
    attendance: { policy_id: string; shift_id: string };
    fixtures: {
      attendance_regularization_id: string;
      document_category_id: string;
      leave_request_id: string;
      payroll_run_id: string;
      platform_onboarding_id: string;
      manager_notification_id: string;
      employee_notification_id: string;
    };
    platform_admin: { username: string; platform_only: boolean };
    checks: Record<string, boolean>;
  };
};

async function runWorkspaceCommand(args: string[]) {
  return execFileAsync(path.join(repoRoot, ".venv/bin/python"), ["backend/manage.py", "manage_playwright_workspace", ...args], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 2 * 1024 * 1024,
  });
}

export async function provisionIsolatedQaWorkspace(testInfo: TestInfo): Promise<IsolatedQaWorkspace> {
  const safeTitle = testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "").slice(0, 16);
  const seedRef = `${safeTitle || "fixture"}-${testInfo.workerIndex}-${Date.now().toString(36)}`.slice(0, 32);
  const tempDir = await mkdtemp(path.join(tmpdir(), "hrms-playwright-"));
  const manifestPath = path.join(tempDir, "workspace.json");
  await runWorkspaceCommand(["--seed-ref", seedRef, "--output-file", manifestPath]);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return { seedRef, manifestPath, tempDir, manifest };
}

export async function loadIsolatedQaWorkspace(manifestPath: string, seedRef: string): Promise<IsolatedQaWorkspace> {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return { seedRef, manifestPath, tempDir: path.dirname(manifestPath), manifest };
}

export async function cleanupIsolatedQaWorkspace(workspace: IsolatedQaWorkspace | undefined) {
  if (!workspace) return;
  try {
    await runWorkspaceCommand(["--seed-ref", workspace.seedRef, "--cleanup", "--output-file", workspace.manifestPath]);
    const cleanup = JSON.parse(await readFile(workspace.manifestPath, "utf8"));
    if (!cleanup.verified_absent) throw new Error(`Workspace cleanup was not verified: ${workspace.seedRef}`);
  } finally {
    await rm(workspace.tempDir, { recursive: true, force: true });
  }
}

export function workspacePersona(workspace: IsolatedQaWorkspace, role: "hr_admin" | "hr_checker" | "manager" | "manager_b" | "employee" | "tenant_admin"): Persona {
  return { username: workspace.manifest.credentials[role].username, password: "Password@123" };
}

export function workspacePlatformPersona(workspace: IsolatedQaWorkspace): Persona {
  return { username: workspace.manifest.platform_admin.username, password: "Password@123" };
}

export async function resolveEmployeeById(
  request: APIRequestContext,
  employeeId: string,
) {
  const response = await request.get(`/api/hr-admin/employees/${employeeId}`);
  if (!response.ok()) throw new Error(`Employee ${employeeId} lookup failed (${response.status()}).`);
  const employee = await response.json();
  if (employee.id !== employeeId) throw new Error(`Employee lookup returned ${employee.id ?? "no id"}; expected ${employeeId}.`);
  return employee;
}

export async function findExactIdInPaginatedResults(
  request: APIRequestContext,
  firstUrl: string,
  expectedId: string,
) {
  let nextUrl: string | null = firstUrl;
  while (nextUrl) {
    const response = await request.get(nextUrl);
    if (!response.ok()) throw new Error(`Paginated request failed (${response.status()}): ${nextUrl}`);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload.results ?? [];
    const match = rows.find((row: { id?: string }) => row.id === expectedId);
    if (match) return match;
    nextUrl = typeof payload.next === "string" && payload.next ? payload.next : null;
  }
  throw new Error(`Object ${expectedId} was not present in paginated results.`);
}
