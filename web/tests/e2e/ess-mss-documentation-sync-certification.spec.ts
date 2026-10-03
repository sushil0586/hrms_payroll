import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { employee, gotoAuthenticated, manager } from "../helpers/staging-auth";

type DocumentationRoute = {
  docRoot: "ess" | "mss";
  doc: string;
  route: string;
  heading: string | RegExp;
  persona: typeof employee;
  requiredDocSections: string[];
  requiredUiText: string[];
  requiredActions: (string | RegExp)[];
  dialogAction?: {
    action: string | RegExp;
    expectedText: string | RegExp;
  };
};

const essRoutes: DocumentationRoute[] = [
  {
    docRoot: "ess",
    doc: "index.md",
    route: "/ess",
    heading: "My workspace",
    persona: employee,
    requiredDocSections: ["ESS Quick Navigation", "Screen Labels To Recognize", "Employee Checklist", "Browser Certification Coverage"],
    requiredUiText: ["Today's actions", "What do you want to do?", "My profile", "Today", "Leave balances"],
    requiredActions: [/apply leave/i, /regularize attendance/i, /inbox/i],
  },
  {
    docRoot: "ess",
    doc: "leave.md",
    route: "/ess/leave",
    heading: "Leave",
    persona: employee,
    requiredDocSections: ["Leave Quick Navigation", "Screen Labels To Recognize", "Modal behavior", "Evidence behavior"],
    requiredUiText: ["Balances", "Leave requests"],
    requiredActions: [/apply leave/i, /overview/i],
    dialogAction: {
      action: /apply leave/i,
      expectedText: /Leave request summary|Policy guidance|Final validation/i,
    },
  },
  {
    docRoot: "ess",
    doc: "attendance.md",
    route: "/ess/attendance",
    heading: "Attendance",
    persona: employee,
    requiredDocSections: ["Attendance Quick Navigation", "Screen Labels To Recognize", "Modal behavior", "Validation behavior"],
    requiredUiText: ["Today", "Monthly summary", "Correction queue", "Regularizations"],
    requiredActions: [/regularize attendance/i, /overview/i],
    dialogAction: {
      action: /regularize attendance/i,
      expectedText: /Attendance regularization summary|Correction summary|Manager approval/i,
    },
  },
  {
    docRoot: "ess",
    doc: "payslips.md",
    route: "/ess/payslips",
    heading: "Payslips",
    persona: employee,
    requiredDocSections: ["Payslip Quick Navigation", "Screen Labels To Recognize", "Positive and negative scenarios", "Related Pages"],
    requiredUiText: ["Published payslips", "Payslip checklist"],
    requiredActions: [/apply/i, /overview/i, /inbox/i],
  },
  {
    docRoot: "ess",
    doc: "documents.md",
    route: "/ess/documents",
    heading: "Documents",
    persona: employee,
    requiredDocSections: ["Document Quick Navigation", "Screen Labels To Recognize", "Upload Checklist", "Positive and negative scenarios"],
    requiredUiText: ["Required documents", "Before sending a file", "Document history"],
    requiredActions: [/upload document/i, /apply filters/i, /clear filters/i],
  },
  {
    docRoot: "ess",
    doc: "statutory-declarations.md",
    route: "/ess/statutory-declarations",
    heading: "Statutory Declarations",
    persona: employee,
    requiredDocSections: ["Tax Quick Navigation", "Screen Labels To Recognize", "India Field Guide", "Positive and Negative Scenarios"],
    requiredUiText: ["Tax years", "Tax declaration checklist", "Current declaration", "Tax profile", "Proof register"],
    requiredActions: [/update declaration|start declaration/i, /add proof/i, /submit declaration/i],
    dialogAction: {
      action: /update declaration|start declaration/i,
      expectedText: /Update declaration|Start declaration|Tax regime/i,
    },
  },
  {
    docRoot: "ess",
    doc: "notifications.md",
    route: "/ess/notifications",
    heading: "Notifications",
    persona: employee,
    requiredDocSections: ["Notification Quick Navigation", "Screen Labels To Recognize", "Triage order", "Positive and negative scenarios"],
    requiredUiText: ["Inbox filters", "Inbox list", "Notification detail"],
    requiredActions: [/apply filters/i, /clear filters/i, /overview/i],
  },
];

const mssRoutes: DocumentationRoute[] = [
  {
    docRoot: "mss",
    doc: "index.md",
    route: "/mss",
    heading: "Manager dashboard",
    persona: manager,
    requiredDocSections: ["MSS Quick Navigation", "Screen Labels To Recognize", "Manager Checklist", "Manager decision principles"],
    requiredUiText: ["What to review next", "Coverage context", "Your ESS"],
    requiredActions: [/leave approvals/i, /attendance approvals/i, /inbox/i],
  },
  {
    docRoot: "mss",
    doc: "approvals.md",
    route: "/mss/approvals",
    heading: "Manager approvals",
    persona: manager,
    requiredDocSections: ["Approval Quick Navigation", "Screen Labels To Recognize", "Decision Quality Checklist", "Focused Review Dialog"],
    requiredUiText: ["Approval views"],
    requiredActions: [/leave/i, /attendance/i, /history/i],
  },
  {
    docRoot: "mss",
    doc: "notifications.md",
    route: "/mss/notifications",
    heading: "Manager notifications",
    persona: manager,
    requiredDocSections: ["Manager Notification Quick Navigation", "Screen Labels To Recognize", "Source workflow guidance", "Positive and negative scenarios"],
    requiredUiText: ["Alert filters", "Team alert list", "Selected alert"],
    requiredActions: [/apply filters/i, /clear filters/i, /approvals/i, /decision history/i],
  },
];

const requiredDocs = {
  ess: ["index.md", "task-recipes.md", "leave.md", "attendance.md", "payslips.md", "documents.md", "statutory-declarations.md", "notifications.md"],
  mss: ["index.md", "task-recipes.md", "approvals.md", "notifications.md"],
};

function getRepoRoot() {
  if (existsSync(path.join(process.cwd(), "docs-site"))) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), "..");
}

const repoRoot = getRepoRoot();
const docsSiteRoot = path.join(repoRoot, "docs-site");
const mkdocsPath = path.join(docsSiteRoot, "mkdocs.yml");

function docsRoot(docRoot: "ess" | "mss") {
  return path.join(docsSiteRoot, "docs", docRoot);
}

function readDoc(docRoot: "ess" | "mss", doc: string) {
  return readFileSync(path.join(docsRoot(docRoot), doc), "utf8");
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

function expectLocalMarkdownLinksResolve(docRoot: "ess" | "mss", doc: string, markdown: string) {
  for (const rawLink of markdownLinks(markdown)) {
    const [target] = rawLink.split("#");
    if (!target || target.startsWith("../assets/")) {
      continue;
    }
    const resolved = path.resolve(path.dirname(path.join(docsRoot(docRoot), doc)), target);
    expect(existsSync(resolved), `${docRoot}/${doc} has a broken markdown link: ${rawLink}`).toBeTruthy();
  }
}

function expectScreenshotsResolve(docRoot: "ess" | "mss", doc: string, markdown: string) {
  const regex = /!\[[^\]]*]\(([^)]+)\)/g;
  let match = regex.exec(markdown);
  while (match) {
    const resolved = path.resolve(path.dirname(path.join(docsRoot(docRoot), doc)), match[1]);
    expect(existsSync(resolved), `${docRoot}/${doc} references a missing screenshot: ${match[1]}`).toBeTruthy();
    match = regex.exec(markdown);
  }
}

async function expectRouteText(page: Page, text: string) {
  await expect(page.getByRole("main").getByText(text, { exact: true }).first(), `Missing route text: ${text}`).toBeVisible();
}

async function expectActionVisible(page: Page, action: string | RegExp) {
  const control = page.getByRole("main").locator("a, button").filter({ hasText: action }).first();
  await expect(control, `Expected action to be visible: ${String(action)}`).toBeVisible();
}

async function expectDialogCanOpenAndClose(page: Page, route: DocumentationRoute) {
  if (!route.dialogAction) {
    return;
  }
  const control = page.getByRole("main").locator("a, button").filter({ hasText: route.dialogAction.action }).first();
  if (!(await control.isVisible().catch(() => false)) || !(await control.isEnabled().catch(() => false))) {
    return;
  }
  await control.click();
  await expect(page.getByText(route.dialogAction.expectedText).first(), `${route.route} dialog should show expected content`).toBeVisible();
  const close = page.getByRole("button", { name: /close|cancel/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
}

test.describe("ESS and MSS documentation sync certification", () => {
  test("employee and manager documentation is complete, navigable, and linked in mkdocs", async () => {
    const mkdocs = readFileSync(mkdocsPath, "utf8");

    for (const [docRoot, docs] of Object.entries(requiredDocs) as ["ess" | "mss", string[]][]) {
      for (const doc of docs) {
        const fullPath = path.join(docsRoot(docRoot), doc);
        expect(existsSync(fullPath), `${docRoot}/${doc} should exist`).toBeTruthy();
        expect(mkdocs, `${docRoot}/${doc} should be present in docs navigation`).toContain(`${docRoot}/${doc}`);

        const markdown = readDoc(docRoot, doc);
        expect(markdown, `${docRoot}/${doc} should provide an on-page table of contents`).toContain("## On This Page");
        expect(markdown, `${docRoot}/${doc} should avoid unfinished placeholders`).not.toMatch(/\b(TODO|TBD|FIXME)\b/i);
        expect(markdown, `${docRoot}/${doc} should avoid leaking runtime placeholders`).not.toMatch(/\b(undefined|null|NaN)\b/);
        expectLocalMarkdownLinksResolve(docRoot, doc, markdown);
        expectScreenshotsResolve(docRoot, doc, markdown);

        if (doc !== "task-recipes.md") {
          expect(markdown, `${docRoot}/${doc} should document recognizable screen labels`).toContain("## Screen Labels To Recognize");
        }
      }
    }

    for (const route of [...essRoutes, ...mssRoutes]) {
      const markdown = readDoc(route.docRoot, route.doc);
      for (const section of route.requiredDocSections) {
        expect(markdown, `${route.docRoot}/${route.doc} should document ${section}`).toContain(`## ${section}`);
      }
      for (const text of route.requiredUiText) {
        expect(markdown, `${route.docRoot}/${route.doc} should mention key UI concept ${text}`).toContain(text);
      }
    }
  });

  test("documented employee and manager pages render with matching content and actions", async ({ page }, testInfo) => {
    test.setTimeout(420_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of [...essRoutes, ...mssRoutes]) {
      await gotoAuthenticated(page, route.route, route.persona);
      await suppressBrowserTestNoise(page);
      await expect(page.getByRole("main"), `${route.route} should expose a main landmark`).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: route.heading }), `${route.route} should expose documented heading`).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign out" }).first(), `${route.route} should expose logout`).toBeVisible();

      for (const text of route.requiredUiText) {
        await expectRouteText(page, text);
      }
      for (const action of route.requiredActions) {
        await expectActionVisible(page, action);
      }

      await expectDialogCanOpenAndClose(page, route);
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
      await expectVisibleLinksAreReal(page, route.route);
      await auditVisibleControls(page, route.route, 96);
      await testInfo.attach(`ess-mss-doc-sync-${slug(route.route)}`, {
        body: await page.screenshot({ fullPage: true, animations: "disabled" }),
        contentType: "image/png",
      });
    }
  });
});
