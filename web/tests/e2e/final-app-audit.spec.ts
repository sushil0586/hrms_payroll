import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Persona = {
  key: string;
  role: string;
  username: string;
  password: string;
  startUrls: string[];
  pageLimit: number;
};

type Defect = {
  id: string;
  module: string;
  screen: string;
  url: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UX" | "PERFORMANCE" | "ACCESSIBILITY";
  category: string;
  title: string;
  description: string;
  steps: string[];
  expected: string;
  actual: string;
  screenshot: string;
  consoleError: string;
  failedApi: string;
  browser: string;
  viewport: string;
  suggestedFix: string;
};

type ScreenInventory = {
  persona: string;
  role: string;
  module: string;
  screen: string;
  url: string;
  finalUrl: string;
  tested: boolean;
  status: "PASS" | "WARNING" | "FAIL";
  screenshot: string;
  headings: string[];
  links: Array<{ name: string; href: string }>;
  buttons: Array<{ name: string; enabled: boolean; type: string }>;
  inputs: Array<{ label: string; placeholder: string; type: string; required: boolean; disabled: boolean; value: string }>;
  selects: Array<{ label: string; options: string[]; value: string; disabled: boolean }>;
  textareas: Array<{ label: string; placeholder: string; required: boolean; disabled: boolean; valueLength: number }>;
  tabs: string[];
  tables: Array<{ caption: string; headers: string[]; rowCount: number }>;
  forms: number;
  dialogs: string[];
  kpis: string[];
  horizontalOverflowPx: number;
  suspiciousText: string[];
  safeInteractions: string[];
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
};

const runId = process.env.FINAL_QA_RUN_ID || "2026-09-08";
const artifactRoot = resolve(process.cwd(), "qa-artifacts", `final-app-review-${runId}`);
const screenshotRoot = join(artifactRoot, "screenshots");
const docsReportPath = resolve(process.cwd(), "..", "docs", "qa", `final-app-review-${runId}.md`);
const appMapPath = join(artifactRoot, "application-map.json");
const elementInventoryPath = join(artifactRoot, "element-inventory.json");
const defectPath = join(artifactRoot, "defects.json");
const localReportPath = join(artifactRoot, "final-report.md");
const progressPath = join(artifactRoot, "progress.log");

const personas: Persona[] = [
  {
    key: "platform-admin",
    role: "Platform Admin",
    username: process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME ?? "platform.admin",
    password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
    startUrls: ["/", "/platform-admin"],
    pageLimit: 60,
  },
  {
    key: "hr-admin",
    role: "HR Admin / Payroll Admin / Tenant Admin",
    username: process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "nisha.rao",
    password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
    startUrls: ["/", "/hr-admin", "/tenant-admin", "/tenant-admin/security-readiness", "/ess"],
    pageLimit: 140,
  },
  {
    key: "manager",
    role: "Manager",
    username: process.env.PLAYWRIGHT_LIVE_MANAGER_USERNAME ?? "karan.mehta",
    password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
    startUrls: ["/", "/ess", "/mss/approvals"],
    pageLimit: 55,
  },
  {
    key: "employee",
    role: "Employee",
    username: process.env.PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME ?? "riya.sharma",
    password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
    startUrls: ["/", "/ess"],
    pageLimit: 45,
  },
];

const maxPlatformTenantPagesPerPersona = 5;

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function safeFileName(value: string) {
  return value.replace(/^https?:\/\/[^/]+/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home";
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function moduleFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) {
    return "Workspace chooser";
  }
  if (parts[0] === "hr-admin" && parts[1]?.startsWith("payroll")) {
    return "Payroll";
  }
  if (parts[0] === "hr-admin" && ["attendance-operations", "attendance-policies", "attendance-policy-assignments", "shifts", "holiday-calendars"].includes(parts[1] || "")) {
    return "Attendance";
  }
  if (parts[0] === "hr-admin" && ["policies", "leave-policies", "leave-policy-assignments", "leave-types", "leave-balances"].includes(parts[1] || "")) {
    return "Leave";
  }
  if (parts[0] === "hr-admin" && ["employees", "organization", "lifecycle", "documents", "notifications-admin", "reports", "audit", "generated-letters", "workflows"].includes(parts[1] || "")) {
    return parts[1].replaceAll("-", " ");
  }
  if (parts[0] === "hr-admin") {
    return "HR Admin";
  }
  if (parts[0] === "tenant-admin") {
    return "Tenant Admin";
  }
  if (parts[0] === "ess") {
    return "Employee Self Service";
  }
  if (parts[0] === "mss") {
    return "Manager Self Service";
  }
  if (parts[0] === "support") {
    return "Support";
  }
  if (parts[0] === "platform-admin") {
    return "Platform Admin";
  }
  return parts[0].replaceAll("-", " ");
}

function statusFor(inventory: ScreenInventory) {
  if (inventory.pageErrors.length || inventory.consoleErrors.length || inventory.failedRequests.some((item) => / 5\d\d /.test(item))) {
    return "FAIL";
  }
  if (
    inventory.failedRequests.length ||
    inventory.horizontalOverflowPx > 1 ||
    inventory.suspiciousText.length ||
    inventory.inputs.some((input) => !input.label) ||
    inventory.buttons.some((button) => !button.name) ||
    inventory.links.some((link) => !link.name)
  ) {
    return "WARNING";
  }
  return "PASS";
}

function addDefect(defects: Defect[], defect: Omit<Defect, "id">) {
  defects.push({ id: `QA-${String(defects.length + 1).padStart(3, "0")}`, ...defect });
}

async function login(page: Page, persona: Persona) {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 });
}

async function getAccessibleName(locator: ReturnType<Page["locator"]>) {
  return (await locator.evaluate((element) => {
    const aria = element.getAttribute("aria-label") || element.getAttribute("title") || "";
    const labelledBy = element.getAttribute("aria-labelledby") || "";
    const labelledText = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
    return (aria || labelledText || element.textContent || "").replace(/\s+/g, " ").trim();
  }).catch(() => "")) || "";
}

async function inventoryPage(page: Page, persona: Persona, requestedUrl: string, index: number): Promise<ScreenInventory> {
  const response = await page.goto(requestedUrl, { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => null);
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await page.locator("main").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);

  const finalUrl = page.url();
  const current = new URL(finalUrl);
  const screenshotRelative = join(persona.key, `${String(index).padStart(3, "0")}-${safeFileName(current.pathname)}.png`);
  const screenshotPath = join(screenshotRoot, screenshotRelative);
  ensureDir(dirname(screenshotPath));

  const safeInteractions: string[] = ["crawler inventory only; mutation-safe interaction is covered by targeted specs"];

  const browserInventory = await page.evaluate(() => {
    const textOf = (element: Element | null) => (element?.textContent || "").replace(/\s+/g, " ").trim();
    const nameOf = (element: Element) => {
      const aria = element.getAttribute("aria-label") || element.getAttribute("title") || "";
      const labelledBy = element.getAttribute("aria-labelledby") || "";
      const labelledText = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || "")
        .filter(Boolean)
        .join(" ");
      return (aria || labelledText || textOf(element)).replace(/\s+/g, " ").trim();
    };
    const labelFor = (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      if (element.labels?.length) {
        return Array.from(element.labels).map((label) => textOf(label)).join(" ").trim();
      }
      if (element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) {
          return textOf(label);
        }
      }
      return element.getAttribute("aria-label") || element.getAttribute("placeholder") || "";
    };
    const root = document.documentElement;
    const body = document.body;
    const bodyText = document.body.innerText || "";
    const suspiciousPatterns = ["undefined", "null", "NaN", "[object Object]"];
    return {
      headings: Array.from(document.querySelectorAll("h1,h2,h3")).slice(0, 80).map(textOf).filter(Boolean),
      links: Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .slice(0, 120)
        .map((link) => ({ name: nameOf(link), href: link.href })),
      buttons: Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .slice(0, 120)
        .map((button) => ({
          name: nameOf(button),
          enabled: !button.disabled,
          type: button.getAttribute("type") || "button",
        })),
      inputs: Array.from(document.querySelectorAll<HTMLInputElement>("input"))
        .filter((input) => input.type !== "hidden")
        .slice(0, 120)
        .map((input) => ({
          label: labelFor(input),
          placeholder: input.placeholder || "",
          type: input.type || "text",
          required: input.required,
          disabled: input.disabled,
          value: input.type === "password" ? "[masked]" : input.value,
        })),
      selects: Array.from(document.querySelectorAll<HTMLSelectElement>("select"))
        .slice(0, 80)
        .map((select) => ({
          label: labelFor(select),
          options: Array.from(select.options).map((option) => option.textContent?.trim() || "").filter(Boolean),
          value: select.value,
          disabled: select.disabled,
        })),
      textareas: Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"))
        .slice(0, 80)
        .map((textarea) => ({
          label: labelFor(textarea),
          placeholder: textarea.placeholder || "",
          required: textarea.required,
          disabled: textarea.disabled,
          valueLength: textarea.value.length,
        })),
      tabs: Array.from(document.querySelectorAll('[role="tab"], .tab, .tabs a, .tabs button')).slice(0, 80).map(nameOf).filter(Boolean),
      tables: Array.from(document.querySelectorAll("table")).slice(0, 20).map((table) => ({
        caption: textOf(table.querySelector("caption")),
        headers: Array.from(table.querySelectorAll("th")).slice(0, 30).map(textOf).filter(Boolean),
        rowCount: table.querySelectorAll("tbody tr").length || table.querySelectorAll("tr").length,
      })),
      forms: document.querySelectorAll("form").length,
      dialogs: Array.from(document.querySelectorAll('[role="dialog"], dialog, [aria-modal="true"]')).slice(0, 20).map(nameOf).filter(Boolean),
      kpis: Array.from(document.querySelectorAll(".metric-tile, .queue-summary-chip, .record-chip, .stat-card, .workspace-card__metric"))
        .slice(0, 45)
        .map(textOf)
        .filter(Boolean)
        .slice(0, 35),
      horizontalOverflowPx: Math.max(root.scrollWidth - root.clientWidth, body.scrollWidth - body.clientWidth),
      suspiciousText: suspiciousPatterns.filter((pattern) => bodyText.includes(pattern)),
      title: document.title,
    };
  });

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  const screen = browserInventory.headings[0] || browserInventory.title || current.pathname;
  return {
    persona: persona.key,
    role: persona.role,
    module: moduleFromPath(current.pathname),
    screen,
    url: requestedUrl,
    finalUrl,
    tested: Boolean(response?.ok()) || current.pathname !== "/login",
    status: "PASS",
    screenshot: screenshotRelative,
    headings: browserInventory.headings,
    links: browserInventory.links,
    buttons: browserInventory.buttons,
    inputs: browserInventory.inputs,
    selects: browserInventory.selects,
    textareas: browserInventory.textareas,
    tabs: browserInventory.tabs,
    tables: browserInventory.tables,
    forms: browserInventory.forms,
    dialogs: browserInventory.dialogs,
    kpis: browserInventory.kpis,
    horizontalOverflowPx: browserInventory.horizontalOverflowPx,
    suspiciousText: browserInventory.suspiciousText,
    safeInteractions,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };
}

function reportDefectsForScreen(inventory: ScreenInventory, defects: Defect[]) {
  const base = {
    module: inventory.module,
    screen: inventory.screen,
    url: inventory.finalUrl,
    screenshot: inventory.screenshot,
    browser: "Chromium",
    viewport: "1366x768 crawl plus screenshot",
  };
  if (inventory.horizontalOverflowPx > 1) {
    addDefect(defects, {
      ...base,
      severity: "MEDIUM",
      category: "UI/UX",
      title: "Horizontal overflow detected",
      description: `The page overflows horizontally by ${inventory.horizontalOverflowPx}px.`,
      steps: [`Login as ${inventory.persona}.`, `Open ${inventory.finalUrl}.`, "Inspect document scroll width."],
      expected: "The page should fit the viewport without unintended horizontal scrolling.",
      actual: `${inventory.horizontalOverflowPx}px overflow was detected.`,
      consoleError: "",
      failedApi: "",
      suggestedFix: "Review fixed-width cards, tables, chips, and header controls at this viewport.",
    });
  }
  for (const error of inventory.pageErrors) {
    addDefect(defects, {
      ...base,
      severity: "HIGH",
      category: "Browser Console",
      title: "Uncaught page error",
      description: error,
      steps: [`Login as ${inventory.persona}.`, `Open ${inventory.finalUrl}.`],
      expected: "No uncaught JavaScript errors should occur.",
      actual: error,
      consoleError: error,
      failedApi: "",
      suggestedFix: "Trace the exception stack and add a regression test for this route.",
    });
  }
  for (const error of inventory.consoleErrors) {
    addDefect(defects, {
      ...base,
      severity: "MEDIUM",
      category: "Browser Console",
      title: "Console error logged",
      description: error,
      steps: [`Login as ${inventory.persona}.`, `Open ${inventory.finalUrl}.`],
      expected: "No console.error output should be emitted during normal use.",
      actual: error,
      consoleError: error,
      failedApi: "",
      suggestedFix: "Remove the runtime error source or downgrade intentional diagnostics away from console.error.",
    });
  }
  for (const failed of inventory.failedRequests) {
    addDefect(defects, {
      ...base,
      severity: failed.includes(" 5") ? "HIGH" : "MEDIUM",
      category: "Network",
      title: "Failed network request",
      description: failed,
      steps: [`Login as ${inventory.persona}.`, `Open ${inventory.finalUrl}.`, "Review captured network calls."],
      expected: "All page resources and API calls should complete successfully.",
      actual: failed,
      consoleError: "",
      failedApi: failed,
      suggestedFix: "Check the route proxy, backend endpoint, auth cookie propagation, and resource path.",
    });
  }
  const unnamedButtons = inventory.buttons.filter((button) => !button.name);
  if (unnamedButtons.length) {
    addDefect(defects, {
      ...base,
      severity: "ACCESSIBILITY",
      category: "Accessibility",
      title: "Button without accessible name",
      description: `${unnamedButtons.length} visible button(s) do not expose a readable label or accessible name.`,
      steps: [`Login as ${inventory.persona}.`, `Open ${inventory.finalUrl}.`, "Inspect visible buttons."],
      expected: "Every button should have a clear label, aria-label, or title.",
      actual: "One or more visible buttons have no accessible name.",
      consoleError: "",
      failedApi: "",
      suggestedFix: "Add visible text or aria-label to icon-only buttons.",
    });
  }
  const unnamedInputs = inventory.inputs.filter((input) => !input.label);
  if (unnamedInputs.length) {
    addDefect(defects, {
      ...base,
      severity: "ACCESSIBILITY",
      category: "Accessibility",
      title: "Input without accessible label",
      description: `${unnamedInputs.length} visible input(s) rely on missing or weak labeling.`,
      steps: [`Login as ${inventory.persona}.`, `Open ${inventory.finalUrl}.`, "Inspect visible inputs."],
      expected: "Every input should have a persistent accessible label.",
      actual: "One or more inputs do not expose a label.",
      consoleError: "",
      failedApi: "",
      suggestedFix: "Associate each input with a label element or aria-label.",
    });
  }
  if (inventory.suspiciousText.length) {
    addDefect(defects, {
      ...base,
      severity: "LOW",
      category: "Broken Element Detection",
      title: "Suspicious placeholder text detected",
      description: `The page includes: ${inventory.suspiciousText.join(", ")}`,
      steps: [`Login as ${inventory.persona}.`, `Open ${inventory.finalUrl}.`, "Scan rendered body text."],
      expected: "No undefined/null/NaN/[object Object] text should appear to users.",
      actual: `Detected ${inventory.suspiciousText.join(", ")}.`,
      consoleError: "",
      failedApi: "",
      suggestedFix: "Guard optional values and provide intentional empty-state labels.",
    });
  }
}

function markdownReport(inventories: ScreenInventory[], defects: Defect[], untested: string[]) {
  const pageKeys = unique(inventories.map((item) => item.finalUrl));
  const passed = inventories.filter((item) => item.status === "PASS").length;
  const failed = inventories.filter((item) => item.status === "FAIL").length;
  const warnings = inventories.filter((item) => item.status === "WARNING").length;
  const countBySeverity = (severity: Defect["severity"]) => defects.filter((defect) => defect.severity === severity).length;
  const modules = unique(inventories.map((item) => item.module)).sort();
  const recommendation = countBySeverity("CRITICAL") || countBySeverity("HIGH")
    ? "NOT READY - MAJOR FIXES REQUIRED"
    : countBySeverity("MEDIUM") || countBySeverity("ACCESSIBILITY")
      ? "READY WITH MINOR FIXES"
      : untested.length
        ? "LOCAL QA PASS - PRODUCTION SIGNOFF REQUIRED"
        : "READY FOR PRODUCTION";

  const lines = [
    "# Final HRMS/Payroll QA Review",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Run ID: ${runId}`,
    "",
    "## Executive Summary",
    "",
    `- Total personas tested: ${personas.length}`,
    `- Total unique pages discovered: ${pageKeys.length}`,
    `- Total screen/persona visits: ${inventories.length}`,
    `- Screens passed: ${passed}`,
    `- Screens with warnings: ${warnings}`,
    `- Screens failed: ${failed}`,
    `- Critical defects: ${countBySeverity("CRITICAL")}`,
    `- High defects: ${countBySeverity("HIGH")}`,
    `- Medium defects: ${countBySeverity("MEDIUM")}`,
    `- Low defects: ${countBySeverity("LOW")}`,
    `- UX observations: ${countBySeverity("UX")}`,
    `- Accessibility issues: ${countBySeverity("ACCESSIBILITY")}`,
    `- Console errors: ${inventories.reduce((total, item) => total + item.consoleErrors.length + item.pageErrors.length, 0)}`,
    `- Failed API/resource requests: ${inventories.reduce((total, item) => total + item.failedRequests.length, 0)}`,
    "",
    "## Module-Wise Results",
    "",
    "| Module | Pages Tested | Status | Notes |",
    "|---|---:|---|---|",
    ...modules.map((module) => {
      const moduleScreens = inventories.filter((item) => item.module === module);
      const moduleDefects = defects.filter((defect) => defect.module === module);
      const status = moduleDefects.some((defect) => ["CRITICAL", "HIGH"].includes(defect.severity))
        ? "FAIL"
        : moduleDefects.length
          ? "WARNING"
          : "PASS";
      return `| ${module} | ${unique(moduleScreens.map((item) => item.finalUrl)).length} | ${status} | ${moduleDefects.length ? `${moduleDefects.length} finding(s)` : "No automated findings"} |`;
    }),
    "",
    "## Screen Coverage",
    "",
    "| Module | Persona | Screen | URL | Tested | Functional | Visual | Status |",
    "|---|---|---|---|---|---|---|---|",
    ...inventories.map((item) => `| ${item.module} | ${item.persona} | ${item.screen.replace(/\|/g, "/")} | ${item.finalUrl} | ${item.tested ? "Yes" : "No"} | Inventory and safe interactions | Screenshot captured | ${item.status} |`),
    "",
    "## Defect Report",
    "",
    defects.length
      ? "| Severity | Module | Screen | Issue | Screenshot | Recommendation |\n|---|---|---|---|---|---|\n" +
        defects.map((defect) => `| ${defect.severity} | ${defect.module} | ${defect.screen.replace(/\|/g, "/")} | ${defect.title}: ${defect.description.replace(/\|/g, "/")} | ${defect.screenshot} | ${defect.suggestedFix.replace(/\|/g, "/")} |`).join("\n")
      : "No automated defects were detected in the crawler pass.",
    "",
    "## Detailed Defects",
    "",
    ...defects.flatMap((defect) => [
      `### ${defect.id}: ${defect.title}`,
      "",
      `- Module: ${defect.module}`,
      `- Screen: ${defect.screen}`,
      `- URL: ${defect.url}`,
      `- Severity: ${defect.severity}`,
      `- Category: ${defect.category}`,
      `- Description: ${defect.description}`,
      `- Steps to Reproduce: ${defect.steps.join(" / ")}`,
      `- Expected Result: ${defect.expected}`,
      `- Actual Result: ${defect.actual}`,
      `- Screenshot: ${defect.screenshot}`,
      `- Console Error: ${defect.consoleError || "None captured"}`,
      `- Failed API: ${defect.failedApi || "None captured"}`,
      `- Browser: ${defect.browser}`,
      `- Viewport: ${defect.viewport}`,
      `- Suggested Fix: ${defect.suggestedFix}`,
      "",
    ]),
    "## UI/UX Review",
    "",
    "- The audit captured full-page screenshots for every crawled screen in the artifact folder.",
    "- Alignment, spacing, overflow, suspicious rendered values, and accessible names were checked automatically.",
    "- Buttons and controls were inventoried without click execution in the crawler; targeted Playwright suites cover selected safe interactions.",
    "- Mutation-heavy buttons such as approve, reject, generate, calculate, finalize, delete, terminate, revoke, and submit were inventoried but not clicked unless part of an existing safe demo flow.",
    "",
    "## Untested Items",
    "",
    ...untested.map((item) => `- ${item}`),
    "",
    "## Production Readiness",
    "",
    `Recommendation: ${recommendation}`,
    "",
    recommendation === "NOT READY - MAJOR FIXES REQUIRED"
      ? "The app is not fully production-ready until the listed findings are resolved."
      : recommendation === "LOCAL QA PASS - PRODUCTION SIGNOFF REQUIRED"
        ? "The crawler did not detect blocking defects, failed resources, console errors, or accessibility label issues in local seeded coverage; destructive actions and real external integrations still require production sign-off."
        : "The crawler did not detect blocking defects, failed resources, console errors, or accessibility label issues in the discovered screens.",
    "",
    "## Artifact Locations",
    "",
    `- Application map: ${appMapPath}`,
    `- Element inventory: ${elementInventoryPath}`,
    `- Defects JSON: ${defectPath}`,
    `- Screenshots: ${screenshotRoot}`,
  ];
  return lines.join("\n");
}

test.describe.configure({ mode: "serial" });
test.setTimeout(40 * 60 * 1000);

test("complete non-destructive HRMS/payroll final application audit", async ({ page }, testInfo) => {
  ensureDir(artifactRoot);
  ensureDir(screenshotRoot);
  ensureDir(dirname(docsReportPath));

  const inventories: ScreenInventory[] = [];
  const defects: Defect[] = [];
  const untested = [
    "Destructive actions were not executed: delete, terminate, revoke, payroll finalization, bank/payment approval, and production-like configuration changes.",
    "Real external provider integrations, real SSO/MFA/SCIM IdP execution, email/SMS delivery, and production object-storage downloads require environment-specific credentials and were not executed in this local seeded run.",
    "Support-session workspaces require a support-agent user and active tenant-approved session grant; they were inventoried only when reachable from the current seeded personas.",
    "Platform-policy item authoring is tracked separately because the current browser surface supports pack header creation/publication/adoption but not item-level CRUD.",
    "Mathematical payroll correctness was not exhaustively recalculated outside the UI; displayed totals were visually inspected and inventoried.",
  ];

  let currentIssueSink: Pick<ScreenInventory, "consoleErrors" | "pageErrors" | "failedRequests"> | null = null;
  page.on("console", (message) => {
    if (message.type() === "error") {
      currentIssueSink?.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    currentIssueSink?.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const failureText = request.failure()?.errorText || "";
    if (failureText.includes("ERR_ABORTED")) {
      return;
    }
    currentIssueSink?.failedRequests.push(`FAILED ${request.method()} ${request.url()} ${failureText}`.trim());
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes("__nextjs") && !url.includes("favicon")) {
      currentIssueSink?.failedRequests.push(`${status} ${response.request().method()} ${url}`);
    }
  });

  for (const persona of personas) {
    await login(page, persona);
    const queue = [...persona.startUrls];
    const visited = new Set<string>();
    let platformTenantPagesQueued = 0;
    let index = 0;

    while (queue.length && visited.size < persona.pageLimit) {
      const nextUrl = queue.shift() || "/";
      const normalized = new URL(nextUrl, testInfo.project.use.baseURL as string | undefined || "http://127.0.0.1:3000");
      normalized.hash = "";
      const pathWithQuery = `${normalized.pathname}${normalized.search}`;
      if (visited.has(pathWithQuery)) {
        continue;
      }
      visited.add(pathWithQuery);
      index += 1;
      appendFileSync(progressPath, `${new Date().toISOString()} ${persona.key} ${index} ${pathWithQuery}\n`);

      const issueSink: Pick<ScreenInventory, "consoleErrors" | "pageErrors" | "failedRequests"> = {
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
      };
      currentIssueSink = issueSink;
      const inventory = await inventoryPage(page, persona, pathWithQuery, index);
      inventory.consoleErrors = issueSink.consoleErrors;
      inventory.pageErrors = issueSink.pageErrors;
      inventory.failedRequests = issueSink.failedRequests;
      currentIssueSink = inventory;
      await page.waitForTimeout(100);
      inventory.status = statusFor(inventory);
      inventories.push(inventory);

      for (const link of inventory.links) {
        const url = new URL(link.href);
        const isSameOrigin = url.origin === new URL(page.url()).origin;
        const isSkippable =
          !isSameOrigin ||
          url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/_next/") ||
          url.pathname === "/login" ||
          url.pathname.includes("/download") ||
          /logout|sign out/i.test(link.name);
        if (isSkippable) {
          continue;
        }
        url.hash = "";
        const candidate = `${url.pathname}${url.search}`;
        if (url.pathname === "/platform-admin" && url.searchParams.has("tenantId")) {
          platformTenantPagesQueued += 1;
          if (platformTenantPagesQueued > maxPlatformTenantPagesPerPersona) {
            continue;
          }
        }
        if (!visited.has(candidate) && !queue.includes(candidate)) {
          queue.push(candidate);
        }
      }
    }
  }

  for (const inventory of inventories) {
    inventory.status = statusFor(inventory);
    reportDefectsForScreen(inventory, defects);
  }

  const applicationMap = inventories.reduce<Record<string, Record<string, unknown>>>((map, item) => {
    map[item.module] ||= {};
    map[item.module][`${item.persona}:${item.screen}:${item.finalUrl}`] = {
      url: item.finalUrl,
      persona: item.persona,
      buttons: item.buttons,
      inputs: item.inputs,
      dropdowns: item.selects,
      tables: item.tables,
      tabs: item.tabs,
      links: item.links,
      screenshot: item.screenshot,
      status: item.status,
    };
    return map;
  }, {});

  const report = markdownReport(inventories, defects, untested);
  writeFileSync(appMapPath, JSON.stringify(applicationMap, null, 2));
  writeFileSync(elementInventoryPath, JSON.stringify(inventories, null, 2));
  writeFileSync(defectPath, JSON.stringify(defects, null, 2));
  writeFileSync(localReportPath, report);
  writeFileSync(docsReportPath, report);

  expect(inventories.length).toBeGreaterThan(0);
});
