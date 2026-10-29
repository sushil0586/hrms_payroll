import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const appRoot = join(root, "src", "app");
const repositoryRoot = resolve(root, "..");
const failures = [];

function filesUnder(directory, suffixes) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return filesUnder(path, suffixes);
    return suffixes.some((suffix) => path.endsWith(suffix)) ? [path] : [];
  });
}

function openingTags(source, componentName) {
  const tags = [];
  const marker = `<${componentName}`;
  let start = source.indexOf(marker);
  while (start !== -1) {
    let braceDepth = 0;
    let quote = "";
    let escaped = false;
    let index = start + marker.length;
    for (; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = "";
        continue;
      }
      if (character === '"' || character === "'" || character === "`") quote = character;
      else if (character === "{") braceDepth += 1;
      else if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
      else if (character === ">" && braceDepth === 0) break;
    }
    tags.push(source.slice(start, index + 1));
    start = source.indexOf(marker, index + 1);
  }
  return tags;
}

const appSources = filesUnder(appRoot, [".tsx", ".ts"]);
const routeCount = appSources.filter((path) => path.endsWith("/page.tsx")).length;
let filterCount = 0;
let scopedFilterCount = 0;

for (const path of appSources) {
  const source = readFileSync(path, "utf8");
  const filterTags = openingTags(source, "WorkspaceFilterForm");
  filterCount += filterTags.length;
  for (const tag of filterTags) {
    if (!tag.includes("onSubmit=")) continue;
    if (!/updateMode=(?:"scoped"|\{[^}]*"scoped"[^}]*\})/.test(tag)) {
      failures.push(`${relative(root, path)}: an intercepted WorkspaceFilterForm must declare updateMode=\"scoped\"`);
    } else {
      scopedFilterCount += 1;
    }
  }

  if (/artifact_id\s*[?&]{1,2}[\s\S]{0,180}<AsyncDownloadButton/.test(source)) {
    failures.push(`${relative(root, path)}: download visibility relies on artifact_id instead of confirmed file availability`);
  }
  if (/artifact_id\s*[?&]{1,2}[\s\S]{0,240}\/download/.test(source)) {
    failures.push(`${relative(root, path)}: a download route is exposed from artifact_id instead of confirmed file availability`);
  }
}

const patternsCss = readFileSync(join(root, "src", "styles", "workspace-patterns.css"), "utf8");
if (!patternsCss.includes(".workspace-filter-form > .workspace-filter-fields > .workspace-filter-bar")) {
  failures.push("src/styles/workspace-patterns.css: nested filter bars must span the complete filter form");
}

const employeeDocuments = readFileSync(join(appRoot, "ess", "documents", "employee-document-center.tsx"), "utf8");
if (!employeeDocuments.includes(">View</button>") || /Document history[\s\S]*?>Review<\/button>/.test(employeeDocuments)) {
  failures.push("src/app/ess/documents/employee-document-center.tsx: employee document details must use View, not Review");
}

const apiViewsPath = join(repositoryRoot, "backend", "apps", "common", "api_views.py");
const apiViews = readFileSync(apiViewsPath, "utf8");
const directStoredFileOpens = apiViews.match(/\.stored_file\.open\(["']rb["']\)/g) ?? [];
if (directStoredFileOpens.length !== 1 || !apiViews.includes("def _stored_artifact_download_response")) {
  failures.push("backend/apps/common/api_views.py: stored artifacts must open through _stored_artifact_download_response");
}

if (failures.length) {
  console.error(`Workspace consistency audit failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Workspace consistency audit passed: ${routeCount} routes, ${filterCount} shared filter forms, ${scopedFilterCount} intercepted scoped forms, and centralized stored-file handling.`);
