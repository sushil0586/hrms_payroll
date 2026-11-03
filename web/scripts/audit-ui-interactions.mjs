import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const webRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(webRoot, "..");
const outputPath = resolve(
  repositoryRoot,
  process.env.HRMS_UI_AUDIT_OUTPUT ?? "docs/qa/evidence/whole-app-interaction-audit-2026-11-02.json",
);

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

function occurrences(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function familyFor(path) {
  const relativePath = relative(join(webRoot, "src", "app"), path);
  if (relativePath.startsWith("ess/")) return "ESS";
  if (relativePath.startsWith("mss/")) return "MSS";
  if (relativePath.startsWith("hr-admin/reports/")) return "HR Admin reports";
  if (relativePath.startsWith("hr-admin/")) return "HR Admin";
  if (relativePath.startsWith("tenant-admin/")) return "Tenant Admin";
  if (relativePath.startsWith("platform-admin/")) return "Platform Admin";
  if (relativePath.startsWith("finance-manager/")) return "Finance Manager";
  if (relativePath.startsWith("support/")) return "Support";
  if (path.includes(`${join("src", "components")}/`)) return "Shared components";
  return "Public and authentication";
}

const appRoot = join(webRoot, "src", "app");
const componentRoot = join(webRoot, "src", "components");
const sources = [
  ...filesUnder(appRoot).filter((path) => !path.includes(`${join("src", "app", "api")}/`)),
  ...filesUnder(componentRoot),
].map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));

const routeCount = filesUnder(appRoot).filter((path) => path.endsWith(`${join("page.tsx")}`)).length;
const records = sources.map(({ path, source }) => {
  const tableCount = occurrences(source, /<table\b|<WorkspaceDataTable\b/g);
  const mutationCount = occurrences(source, /method:\s*["'`](?:POST|PUT|PATCH|DELETE)["'`]/g);
  const actionToastCount = occurrences(source, /<ActionToast\b/g);
  const findings = [];

  if (tableCount && !/aria-busy|isPending|pending=|Loading|loading/.test(source)) {
    findings.push("table-loading-review");
  }
  if (mutationCount && !/ActionToast|ActionFeedbackReceipt|notice--success|record-chip--success|role=["']status["']/.test(source)) {
    findings.push("mutation-feedback-review");
  }
  if (actionToastCount && /setTimeout\([\s\S]{0,160}?(?:3500|3_500)/.test(source)) {
    findings.push("toast-duration-3500ms");
  }
  if (/window\.location\.(?:assign|replace|reload)|router\.refresh\(\)/.test(source)) {
    findings.push("document-navigation-review");
  }
  if (/onSubmit=\{\(event\) => event\.preventDefault\(\)\}/.test(source)) {
    findings.push("filter-submit-noop");
  }
  if (/<button[^>]*disabled=/.test(source)) {
    findings.push("disabled-control-cursor-review");
  }

  return {
    file: relative(repositoryRoot, path),
    family: familyFor(path),
    signals: {
      actionToasts: actionToastCount,
      filters: occurrences(source, /<WorkspaceFilterForm\b/g),
      modals: occurrences(source, /<HrAdminActionModal\b|aria-modal=|role=["']dialog["']/g),
      mutations: mutationCount,
      pagers: occurrences(source, /<PaginationBar\b/g),
      tables: tableCount,
    },
    findings,
  };
});

const families = Object.values(
  records.reduce((result, record) => {
    const current = result[record.family] ?? {
      family: record.family,
      files: 0,
      findingCount: 0,
      findingFiles: 0,
      signals: { actionToasts: 0, filters: 0, modals: 0, mutations: 0, pagers: 0, tables: 0 },
    };
    current.files += 1;
    current.findingCount += record.findings.length;
    if (record.findings.length) current.findingFiles += 1;
    for (const [key, value] of Object.entries(record.signals)) current.signals[key] += value;
    result[record.family] = current;
    return result;
  }, {}),
).sort((left, right) => right.findingCount - left.findingCount || left.family.localeCompare(right.family));

const findingCounts = records.flatMap((record) => record.findings).reduce((result, finding) => {
  result[finding] = (result[finding] ?? 0) + 1;
  return result;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  scope: {
    routes: routeCount,
    uiSourceFiles: records.length,
  },
  findingCounts,
  families,
  candidates: records.filter((record) => record.findings.length),
  note: "Static findings are review candidates. Browser and persistence evidence are required before a route is failed or certified.",
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`UI interaction audit wrote ${relative(repositoryRoot, outputPath)}.`);
console.log(`Reviewed ${report.scope.routes} routes and ${report.scope.uiSourceFiles} UI source files.`);
for (const [finding, count] of Object.entries(findingCounts).sort()) console.log(`${finding}: ${count}`);
