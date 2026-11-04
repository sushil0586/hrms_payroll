import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const webRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(webRoot, "..");
const outputPath = resolve(
  repositoryRoot,
  process.env.HRMS_LEAVE_UI_AUDIT_OUTPUT ?? "docs/qa/evidence/leave-ui-consistency-audit.json",
);

const modules = [
  { id: "leave-types", roots: ["hr-admin/leave-types"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "leave-policies", roots: ["hr-admin/leave-policies"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "policy-assignments", roots: ["hr-admin/leave-policy-assignments"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "leave-balances", roots: ["hr-admin/leave-balances"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "hr-leave-requests", roots: ["hr-admin/leave-requests"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "leave-year", roots: ["hr-admin/leave-year"], requires: ["header", "loading", "table", "feedback"] },
  { id: "ess-leave", roots: ["ess/leave"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "ess-documents", roots: ["ess/documents"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "mss-approvals", roots: ["mss/approvals"], requires: ["header", "filters", "loading", "table", "feedback", "detail"] },
  { id: "leave-balance-report", roots: ["hr-admin/reports/leave-balance"], requires: ["header", "filters", "table", "feedback"] },
  { id: "leave-collision-report", roots: ["hr-admin/reports/leave-attendance-collisions"], requires: ["header", "filters", "table"] },
];

function filesUnder(directory) {
  if (!statSafe(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

function statSafe(path) {
  try { return statSync(path); } catch { return undefined; }
}

const signals = {
  header: /PageIntro|WorkspaceStandardHeader|workspace-page-header|page-header|<h1\b/,
  filters: /WorkspaceFilterForm|workspace-filter-form|aria-label=["'][^"']*[Ff]ilter/,
  loading: /aria-busy|isPending|pending=|Loading|loading|spinner/,
  table: /WorkspaceDataTable|WorkspaceTableScrollRegion|<table\b/,
  feedback: /ActionToast|ActionFeedbackReceipt|role=["'](?:alert|status)["']|notice--(?:success|warning|danger)/,
  detail: /HrAdminActionModal|aria-modal=|role=["']dialog["']|complementary|<aside\b/,
};

const appRoot = join(webRoot, "src", "app");
const results = modules.map((module) => {
  const files = module.roots.flatMap((root) => filesUnder(join(appRoot, root)));
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  const controls = Object.fromEntries(module.requires.map((control) => [control, signals[control].test(source)]));
  const missing = Object.entries(controls).filter(([, present]) => !present).map(([control]) => control);
  return {
    module: module.id,
    files: files.map((file) => relative(repositoryRoot, file)),
    requiredControls: module.requires,
    controls,
    missing,
    staticVerdict: missing.length ? "REVIEW" : "READY_FOR_BROWSER_CERTIFICATION",
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  contract: {
    note: "Static readiness is not certification. A module reaches 95% only after browser, API, PostgreSQL, audit, RBAC, accessibility, responsive, and cleanup evidence passes.",
    modules: results.length,
  },
  summary: {
    readyForBrowserCertification: results.filter((item) => !item.missing.length).length,
    review: results.filter((item) => item.missing.length).length,
  },
  results,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Leave UI consistency audit wrote ${relative(repositoryRoot, outputPath)}.`);
for (const item of results) console.log(`${item.module}: ${item.staticVerdict}${item.missing.length ? ` (${item.missing.join(", ")})` : ""}`);
if (report.summary.review) process.exitCode = 1;
