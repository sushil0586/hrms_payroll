import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

type DocumentationRoute = {
  doc: string;
  route: string;
  heading: string | RegExp;
  requiredDocSections: string[];
  requiredUiText: string[];
  requiredActions: (string | RegExp)[];
};

const routes: DocumentationRoute[] = [
  {
    doc: "dashboard.md",
    route: "/tenant-admin",
    heading: "Account Control Center",
    requiredDocSections: ["Dashboard Map", "Top Actions", "Example: Daily Account Check", "Signoff Checklist"],
    requiredUiText: ["Tenant Status", "Items that need your attention", "Launch checklist", "Open the right workspace"],
    requiredActions: [/download audit/i, /request account change/i, /invite user/i],
  },
  {
    doc: "users.md",
    route: "/tenant-admin/users",
    heading: "Tenant User Management",
    requiredDocSections: ["Page Sections", "Controls And Actions", "Example: Invite An HR Admin", "Validation And Negative Cases"],
    requiredUiText: ["User Directory", "Invite member", "Role coverage"],
    requiredActions: [/invite member/i, /update roles/i],
  },
  {
    doc: "roles.md",
    route: "/tenant-admin/roles",
    heading: "Roles & Permissions",
    requiredDocSections: ["Page Sections", "Controls And Actions", "Example: Create A Custom Role", "Validation And Negative Cases"],
    requiredUiText: ["Access model", "Search roles", "Add role"],
    requiredActions: [/add role/i, /^edit$/i],
  },
  {
    doc: "plan.md",
    route: "/tenant-admin/plan",
    heading: "Plan & Billing",
    requiredDocSections: ["Page Sections", "Controls And Actions", "Example: Request A User Limit Increase", "Validation And Negative Cases"],
    requiredUiText: ["Commercial profile", "Current subscription", "Change requests"],
    requiredActions: [/dashboard/i],
  },
  {
    doc: "setup-guide.md",
    route: "/tenant-admin/setup",
    heading: "Tenant Setup Guide",
    requiredDocSections: ["Setup Areas", "Controls And Actions", "Example: Prepare A New Tenant For Launch", "Validation And Negative Cases"],
    requiredUiText: ["Setup areas", "Start master setup", "Dependency guardrails"],
    requiredActions: [/start master setup/i, /back to console/i],
  },
  {
    doc: "settings.md",
    route: "/tenant-admin/settings",
    heading: "Tenant Settings",
    requiredDocSections: ["Page Sections", "Controls And Actions", "Example: Review Tenant Profile Before Launch", "Validation And Negative Cases"],
    requiredUiText: ["Tenant account", "Readiness checks", "Published setup"],
    requiredActions: [/dashboard/i, /setup guide/i],
  },
  {
    doc: "security.md",
    route: "/tenant-admin/security-readiness",
    heading: "Enterprise Security Readiness",
    requiredDocSections: ["Readiness Domains", "Controls And Actions", "Example: Review Account Before Production", "Validation And Negative Cases"],
    requiredUiText: ["Security domains", "Launch posture", "Launch blockers"],
    requiredActions: [/trust audit/i, /console/i],
  },
  {
    doc: "support-access.md",
    route: "/tenant-admin/support-access",
    heading: "Support Access",
    requiredDocSections: ["Page Sections", "Controls And Actions", "Example: Request Payroll Setup Support", "Validation And Negative Cases"],
    requiredUiText: ["Scoped support grants", "What support can access", "Scope guide"],
    requiredActions: [/support audit/i],
  },
  {
    doc: "trust-audit.md",
    route: "/tenant-admin/trust-audit",
    heading: "Tenant Trust Audit",
    requiredDocSections: ["Page Sections", "Controls And Actions", "Example: Prove Support Access Was Controlled", "Validation And Negative Cases"],
    requiredUiText: ["Event groups", "Audit taxonomy", "Evidence ledger"],
    requiredActions: [/download audit/i],
  },
];

const requiredDocs = [
  "index.md",
  "dashboard.md",
  "users.md",
  "roles.md",
  "plan.md",
  "setup-guide.md",
  "settings.md",
  "security.md",
  "support-access.md",
  "trust-audit.md",
  "task-recipes.md",
];

function getRepoRoot() {
  if (existsSync(path.join(process.cwd(), "docs-site"))) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), "..");
}

const repoRoot = getRepoRoot();
const docsRoot = path.join(repoRoot, "docs-site/docs/tenant-admin");
const mkdocsPath = path.join(repoRoot, "docs-site/mkdocs.yml");

function readDoc(doc: string) {
  return readFileSync(path.join(docsRoot, doc), "utf8");
}

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function markdownLinks(markdown: string) {
  const links: string[] = [];
  const regex = /\]\((?!https?:|mailto:|#)([^)]+)\)/g;
  let match = regex.exec(markdown);
  while (match) {
    links.push(match[1]);
    match = regex.exec(markdown);
  }
  return links;
}

function expectLocalMarkdownLinksResolve(doc: string, markdown: string) {
  for (const rawLink of markdownLinks(markdown)) {
    const [target] = rawLink.split("#");
    if (!target || target.startsWith("../assets/")) {
      continue;
    }
    const resolved = path.resolve(path.dirname(path.join(docsRoot, doc)), target);
    expect(existsSync(resolved), `${doc} has a broken markdown link: ${rawLink}`).toBeTruthy();
  }
}

function expectScreenshotsResolve(doc: string, markdown: string) {
  const regex = /!\[[^\]]*]\(([^)]+)\)/g;
  let match = regex.exec(markdown);
  while (match) {
    const resolved = path.resolve(path.dirname(path.join(docsRoot, doc)), match[1]);
    expect(existsSync(resolved), `${doc} references a missing screenshot: ${match[1]}`).toBeTruthy();
    match = regex.exec(markdown);
  }
}

async function expectRouteText(page: Page, text: string) {
  await expect(page.getByRole("main").getByText(text, { exact: true }).first(), `Missing route text: ${text}`).toBeVisible();
}

async function expectActionVisible(page: Page, action: string | RegExp) {
  const control = page.getByRole("main").locator("a, button").filter({ hasText: action }).first();
  await expect(control, `Expected action to be visible: ${String(action)}`).toBeVisible();
  await expect(control, `Expected action to be usable: ${String(action)}`).toBeEnabled();
}

test.describe("Tenant Admin documentation sync certification", () => {
  test("tenant-admin documentation is complete, navigable, and linked in mkdocs", async () => {
    const mkdocs = readFileSync(mkdocsPath, "utf8");

    for (const doc of requiredDocs) {
      const fullPath = path.join(docsRoot, doc);
      expect(existsSync(fullPath), `${doc} should exist`).toBeTruthy();
      expect(mkdocs, `${doc} should be present in docs navigation`).toContain(`tenant-admin/${doc}`);

      const markdown = readDoc(doc);
      expect(markdown, `${doc} should provide an on-page table of contents`).toContain("## On This Page");
      expect(markdown, `${doc} should avoid unfinished placeholders`).not.toMatch(/\b(TODO|TBD|FIXME)\b/i);
      expect(markdown, `${doc} should avoid leaking runtime placeholders`).not.toMatch(/\b(undefined|null|NaN)\b/);
      expectLocalMarkdownLinksResolve(doc, markdown);
      expectScreenshotsResolve(doc, markdown);

      if (doc !== "index.md" && doc !== "task-recipes.md") {
        expect(markdown, `${doc} should include signoff criteria`).toContain("## Signoff Checklist");
      }
    }

    for (const route of routes) {
      const markdown = readDoc(route.doc);
      for (const section of route.requiredDocSections) {
        expect(markdown, `${route.doc} should document ${section}`).toContain(`## ${section}`);
      }
      for (const text of route.requiredUiText) {
        expect(markdown, `${route.doc} should mention key UI concept ${text}`).toContain(text);
      }
    }
  });

  test("documented tenant-admin pages render with matching content and actions", async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of routes) {
      await gotoAuthenticated(page, route.route, tenantAdmin);
      await suppressBrowserTestNoise(page);
      await expect(page.getByRole("main"), `${route.route} should expose a main landmark`).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: route.heading }), `${route.route} should expose documented heading`).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign out" }), `${route.route} should expose logout`).toBeVisible();

      for (const text of route.requiredUiText) {
        await expectRouteText(page, text);
      }
      for (const action of route.requiredActions) {
        await expectActionVisible(page, action);
      }

      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
      await expectVisibleLinksAreReal(page, route.route);
      await auditVisibleControls(page, route.route, 96);
      await testInfo.attach(`tenant-admin-doc-sync-${slug(route.route)}`, {
        body: await page.screenshot({ fullPage: true, animations: "disabled" }),
        contentType: "image/png",
      });
    }
  });
});
