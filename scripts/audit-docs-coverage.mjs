import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsRoot = path.join(root, "docs-site", "docs");
const mkdocsPath = path.join(root, "docs-site", "mkdocs.yml");
const catalogPath = path.join(root, "backend", "apps", "iam", "menu_catalog.py");
const appRoot = path.join(root, "web", "src", "app");
let hasFailures = false;

function fail(message, details = []) {
  hasFailures = true;
  console.error(`\n[docs-audit] ${message}`);
  for (const detail of details) console.error(`- ${detail}`);
  process.exitCode = 1;
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, out);
    if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
}

function parseNavFiles(mkdocs) {
  const navFiles = new Set();
  for (const line of mkdocs.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) continue;
    const value = trimmed.slice(2).trim();
    const match = value.match(/(?:^|:\s*)([^:\n]+\.md)$/);
    if (match) navFiles.add(match[1].trim());
  }
  return navFiles;
}

function parseMenuDefinitions(catalog) {
  return [
    ...catalog.matchAll(
      /MenuDefinition\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g,
    ),
  ].map((match) => ({
    workspace: match[1],
    group: match[2],
    kind: match[3],
    href: match[4],
    label: match[5],
  }));
}

const routeToDoc = new Map([
  ["/", "index.md"],
  ["/login", "troubleshooting/access.md"],
  ["/platform-admin", "platform-admin/dashboard.md"],
  ["/platform-admin/leads", "platform-admin/leads.md"],
  ["/platform-admin/tenants", "platform-admin/tenants.md"],
  ["/platform-admin/onboarding", "platform-admin/launch-readiness.md"],
  ["/platform-admin/admins", "platform-admin/admin-access.md"],
  ["/platform-admin/policy-packs", "platform-admin/setup-templates.md"],
  ["/platform-admin/permissions", "platform-admin/permissions.md"],
  ["/platform-admin/audit-logs", "platform-admin/audit-logs.md"],
  ["/tenant-admin", "tenant-admin/index.md"],
  ["/tenant-admin/users", "tenant-admin/users.md"],
  ["/tenant-admin/roles", "tenant-admin/roles.md"],
  ["/tenant-admin/plan", "tenant-admin/plan.md"],
  ["/tenant-admin/setup", "tenant-admin/setup-guide.md"],
  ["/tenant-admin/support-access", "tenant-admin/support-access.md"],
  ["/tenant-admin/trust-audit", "tenant-admin/trust-audit.md"],
  ["/tenant-admin/settings", "tenant-admin/settings.md"],
  ["/tenant-admin/security-readiness", "tenant-admin/security.md"],
  ["/hr-admin", "hr-admin/dashboard.md"],
  ["/hr-admin/launch-remediation", "hr-admin/launch-readiness.md"],
  ["/hr-admin/employees", "hr-admin/employees.md"],
  ["/hr-admin/lifecycle", "hr-admin/lifecycle.md"],
  ["/hr-admin/employee-documents", "hr-admin/documents.md"],
  ["/hr-admin/attendance-operations", "hr-admin/attendance.md"],
  ["/hr-admin/leave-balances", "hr-admin/leave.md"],
  ["/hr-admin/policies", "hr-admin/policies.md"],
  ["/hr-admin/payroll-readiness", "hr-admin/payroll/payroll-control.md"],
  ["/hr-admin/payroll-setup", "hr-admin/payroll/payroll-setup.md"],
  ["/hr-admin/salary-setup", "hr-admin/payroll/salary-setup.md"],
  ["/hr-admin/payroll-rules", "hr-admin/payroll/payroll-rules.md"],
  ["/hr-admin/payroll-statutory", "hr-admin/payroll/statutory-payroll.md"],
  ["/hr-admin/payroll-providers", "hr-admin/payroll/payroll-providers.md"],
  ["/hr-admin/payroll-adjustments", "hr-admin/payroll/adjustments-settlements.md"],
  ["/hr-admin/audit", "hr-admin/audit.md"],
  ["/hr-admin/reports", "hr-admin/reports-audit.md"],
  ["/hr-admin/organization", "hr-admin/organization.md"],
  ["/hr-admin/workflows", "hr-admin/workflows.md"],
  ["/hr-admin/notifications-admin", "hr-admin/notifications.md"],
  ["/hr-admin/import-history", "hr-admin/imports.md"],
  ["/hr-admin/saas-operations", "hr-admin/ops-health.md"],
  ["/ess", "ess/index.md"],
  ["/ess/payslips", "ess/payslips.md"],
  ["/ess/statutory-declarations", "ess/statutory-declarations.md"],
  ["/ess/notifications", "ess/notifications.md"],
  ["/ess/documents", "ess/documents.md"],
  ["/mss", "mss/index.md"],
  ["/mss/approvals", "mss/approvals.md"],
  ["/mss/notifications", "mss/notifications.md"],
  ["/finance-manager", "finance-manager/index.md"],
  ["/finance-manager#payments", "finance-manager/payment-handoff.md"],
  ["/finance-manager#compliance", "finance-manager/compliance-evidence.md"],
  ["/finance-manager#audit", "finance-manager/audit-evidence.md"],
]);

const childRouteFamilies = [
  { name: "employee child pages", match: /^\/hr-admin\/employees\//, doc: "hr-admin/employees.md" },
  { name: "organization child pages", match: /^\/hr-admin\/organization\//, doc: "hr-admin/organization.md" },
  { name: "attendance child pages", match: /^\/hr-admin\/(attendance-|employee-shift|holiday-|shift)/, doc: "hr-admin/attendance.md" },
  { name: "leave child pages", match: /^\/hr-admin\/(leave-|leave$|policy-assignments)/, doc: "hr-admin/leave.md" },
  { name: "document child pages", match: /^\/hr-admin\/(document-|employee-documents)/, doc: "hr-admin/documents.md" },
  { name: "lifecycle child pages", match: /^\/hr-admin\/(onboardings|movements|exits|probation-reviews|generated-letters)/, doc: "hr-admin/lifecycle.md" },
  { name: "notification child pages", match: /^\/hr-admin\/(notification-|notifications)/, doc: "hr-admin/notifications.md" },
  { name: "workflow child pages", match: /^\/hr-admin\/workflow-/, doc: "hr-admin/workflows.md" },
  { name: "payroll phase pages", match: /^\/hr-admin\/payroll-(inputs|calculations|review|outputs|handoff|settlements|setup|statutory|providers|adjustments|readiness|rules)/, doc: "hr-admin/payroll/index.md" },
  { name: "salary setup pages", match: /^\/hr-admin\/salary-setup/, doc: "hr-admin/payroll/salary-setup.md" },
  { name: "reports drilldowns", match: /^\/hr-admin\/reports\//, doc: "hr-admin/reports-audit.md" },
  { name: "saas ops pages", match: /^\/hr-admin\/saas-/, doc: "hr-admin/ops-health.md" },
  { name: "utility access pages", match: /^\/(forgot-password|reset-password|workspace-access|support)/, doc: "troubleshooting/access.md" },
];

const mkdocs = read(mkdocsPath);
const catalog = read(catalogPath);
const navFiles = parseNavFiles(mkdocs);
const markdownFiles = walkFiles(docsRoot, (file) => file.endsWith(".md"));
const docs = markdownFiles.map((file) => path.relative(docsRoot, file));

const missingNavTargets = [...navFiles].filter((file) => !fs.existsSync(path.join(docsRoot, file))).sort();
const orphanDocs = docs.filter((file) => !navFiles.has(file)).sort();
if (missingNavTargets.length) fail("Navigation points to missing docs.", missingNavTargets);
if (orphanDocs.length) fail("Docs exist but are not in navigation.", orphanDocs);

const menuDefinitions = parseMenuDefinitions(catalog);
const missingMenuMappings = menuDefinitions
  .filter((item) => !routeToDoc.has(item.href))
  .map((item) => `${item.workspace} ${item.kind} ${item.href} (${item.label})`);
const missingMenuDocs = menuDefinitions
  .filter((item) => routeToDoc.has(item.href) && !fs.existsSync(path.join(docsRoot, routeToDoc.get(item.href))))
  .map((item) => `${item.href} -> ${routeToDoc.get(item.href)}`);
const missingMenuNav = menuDefinitions
  .filter((item) => routeToDoc.has(item.href) && !navFiles.has(routeToDoc.get(item.href)))
  .map((item) => `${item.href} -> ${routeToDoc.get(item.href)}`);
if (missingMenuMappings.length) fail("Menu links are not mapped to docs.", missingMenuMappings);
if (missingMenuDocs.length) fail("Mapped menu docs are missing.", missingMenuDocs);
if (missingMenuNav.length) fail("Mapped menu docs are missing from nav.", missingMenuNav);

const routePages = walkFiles(appRoot, (file) => file.endsWith("page.tsx")).map((file) => {
  const route = file.replace(appRoot, "").replace(/\/page\.tsx$/, "");
  return route || "/";
});
const excludedCoverageRoutes = [/^\/docs($|\/)/];
const childCandidates = routePages.filter(
  (route) =>
    !excludedCoverageRoutes.some((pattern) => pattern.test(route)) &&
    (route.includes("[") ||
      /\/hr-admin\/.+\//.test(route) ||
      /^\/(forgot-password|reset-password|workspace-access|support)/.test(route)),
);
const uncoveredChildRoutes = childCandidates.filter((route) => {
  const family = childRouteFamilies.find((candidate) => candidate.match.test(route));
  return !family || !fs.existsSync(path.join(docsRoot, family.doc));
});
if (uncoveredChildRoutes.length) fail("Child or utility route families are not covered by docs.", uncoveredChildRoutes);

const missingImages = [];
const usedImages = new Set();
for (const file of markdownFiles) {
  const text = read(file);
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(text))) {
    const target = match[1].split("#")[0];
    if (/^https?:/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), target);
    usedImages.add(resolved);
    if (!fs.existsSync(resolved)) missingImages.push(`${path.relative(root, file)} -> ${target}`);
  }
}
if (missingImages.length) fail("Markdown image references are broken.", missingImages);

const screenshotsDir = path.join(docsRoot, "assets", "screenshots");
const screenshots = fs.existsSync(screenshotsDir) ? walkFiles(screenshotsDir, (file) => file.endsWith(".png")) : [];
const unusedScreenshots = screenshots
  .filter((file) => !usedImages.has(path.resolve(file)))
  .map((file) => path.relative(root, file))
  .sort();
if (unusedScreenshots.length) fail("Screenshots exist but are not referenced.", unusedScreenshots);

const sensitivePatterns = [
  /Ansh@/i,
  /DJANGO_EMAIL_HOST_PASSWORD/i,
  /AWS_SECRET/i,
  /SECRET_ACCESS/i,
  /K\+=/,
  /\bpassword\s*=/i,
  /\bPassword\s*=/,
  /smtp.*password/i,
  /smtp.*secret/i,
];
const sensitiveHits = [];
for (const file of [...markdownFiles, mkdocsPath]) {
  const rel = path.relative(root, file);
  read(file)
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (sensitivePatterns.some((pattern) => pattern.test(line))) {
        sensitiveHits.push(`${rel}:${index + 1}`);
      }
    });
}
if (sensitiveHits.length) fail("Possible credentials or secrets found in docs.", sensitiveHits);

const sidebarCount = menuDefinitions.filter((item) => item.kind === "sidebar").length;
const quickLinkCount = menuDefinitions.filter((item) => item.kind === "quick_link").length;
const childFamilyCounts = childRouteFamilies.map((family) => ({
  family: family.name,
  routes: routePages.filter((route) => family.match.test(route)).length,
}));

if (hasFailures) {
  process.exit(process.exitCode || 1);
}

console.log("[docs-audit] passed");
console.log(
  JSON.stringify(
    {
      docs: docs.length,
      navFiles: navFiles.size,
      menuLinks: menuDefinitions.length,
      sidebarLinks: sidebarCount,
      quickLinks: quickLinkCount,
      appRoutePages: routePages.length,
      childOrUtilityRoutes: childCandidates.length,
      screenshots: screenshots.length,
      childFamilyCounts,
    },
    null,
    2,
  ),
);
