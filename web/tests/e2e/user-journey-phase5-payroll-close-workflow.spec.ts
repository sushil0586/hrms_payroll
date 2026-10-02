import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type CloseStep = {
  path: string;
  heading: string | RegExp;
  currentStep: string;
  userQuestion: string;
  mustShow: Array<string | RegExp>;
  nextLinks: Array<{ name: string | RegExp; href: string | RegExp }>;
};

const closeSteps: CloseStep[] = [
  {
    path: "/hr-admin/payroll-readiness",
    heading: "Payroll Readiness",
    currentStep: "Readiness",
    userQuestion: "Can I open payroll inputs safely?",
    mustShow: ["Payroll cycle", "Current decision", "What to do next", "Employees in scope", "Ready", "Warnings", "Blocked"],
    nextLinks: [
      { name: "Setup", href: "/hr-admin/payroll-setup" },
      { name: "Inputs", href: "/hr-admin/payroll-inputs" },
      { name: "Review", href: "/hr-admin/payroll-review" },
      { name: "Report", href: "/hr-admin/reports/payroll-close-readiness" },
    ],
  },
  {
    path: "/hr-admin/payroll-inputs",
    heading: "Payroll Inputs",
    currentStep: "Inputs",
    userQuestion: "Are source snapshots locked and traceable?",
    mustShow: ["Input control", "Employee snapshots", "Run guardrails", "Snapshot trace", "Locked inputs"],
    nextLinks: [
      { name: /Readiness/i, href: "/hr-admin/payroll-readiness" },
      { name: /Open Calculation|Calculation/i, href: /\/hr-admin\/payroll-calculations/ },
    ],
  },
  {
    path: "/hr-admin/payroll-calculations",
    heading: "Payroll Calculations",
    currentStep: "Calculation",
    userQuestion: "Can I inspect draft payroll and calculation issues?",
    mustShow: ["Calculation queue", "Calculation attempts", "Calculation validation", "Line trace", "Latest net pay"],
    nextLinks: [
      { name: /Inputs/i, href: "/hr-admin/payroll-inputs" },
      { name: /Review|Open Review/i, href: /\/hr-admin\/payroll-review/ },
    ],
  },
  {
    path: "/hr-admin/payroll-review",
    heading: "Payroll Review",
    currentStep: "Review",
    userQuestion: "Can payroll exceptions, approval trail, and final lock be reviewed?",
    mustShow: ["Review queue", "Exception register", "Approval trail", "Final lock", "Review state"],
    nextLinks: [
      { name: /Calculations/i, href: "/hr-admin/payroll-calculations" },
      { name: /Outputs/i, href: "/hr-admin/payroll-outputs" },
    ],
  },
  {
    path: "/hr-admin/payroll-outputs",
    heading: "Payroll Outputs",
    currentStep: "Outputs",
    userQuestion: "Can published payslip and register artifacts be governed?",
    mustShow: ["Output batches", "Artifact register", "Publish state", "Finance handoff readiness"],
    nextLinks: [
      { name: /Review/i, href: "/hr-admin/payroll-review" },
      { name: /Handoff/i, href: "/hr-admin/payroll-handoff" },
    ],
  },
  {
    path: "/hr-admin/payroll-handoff",
    heading: "Payroll Handoff",
    currentStep: "Handoff",
    userQuestion: "Can finance delivery and provider evidence be audited?",
    mustShow: ["Finance handoff", "Finance artifacts", "Provider jobs", "Delivery acknowledgements"],
    nextLinks: [
      { name: /Outputs/i, href: "/hr-admin/payroll-outputs" },
      { name: /Providers/i, href: "/hr-admin/payroll-providers" },
    ],
  },
];

function main(page: Page) {
  return page.locator("main").first();
}

async function expectVisibleText(scope: Locator, pattern: string | RegExp) {
  await expect(scope.getByText(pattern).filter({ visible: true }).first(), `Expected visible text: ${String(pattern)}`).toBeVisible();
}

async function expectBusinessQuestionIsAnswered(page: Page, step: CloseStep) {
  await test.step(step.userQuestion, async () => {
    for (const text of step.mustShow) {
      await expectVisibleText(main(page), text);
    }
  });
}

async function expectPayrollJourney(page: Page, step: CloseStep) {
  const journey = main(page).getByRole("region", { name: "Payroll cycle journey" });
  await expect(journey).toBeVisible();
  await expect(journey.locator(".payroll-cycle-step").filter({ hasText: step.currentStep })).toHaveAttribute("aria-current", "page");

  for (const item of [
    ["Readiness", "/hr-admin/payroll-readiness"],
    ["Inputs", "/hr-admin/payroll-inputs"],
    ["Calculation", "/hr-admin/payroll-calculations"],
    ["Review", "/hr-admin/payroll-review"],
    ["Outputs", "/hr-admin/payroll-outputs"],
    ["Handoff", "/hr-admin/payroll-handoff"],
  ] as const) {
    await expect(journey.locator(".payroll-cycle-step").filter({ hasText: item[0] })).toHaveAttribute("href", item[1]);
  }
}

async function expectPageLinksAreHealthy(page: Page, step: CloseStep) {
  for (const link of step.nextLinks) {
    const target = main(page).getByRole("link", { name: link.name }).first();
    await expect(target, `${step.path} should expose ${String(link.name)}`).toBeVisible();
    await expect(target).toHaveAttribute("href", link.href);
  }

  const brokenVisibleLinks = await page.locator("main a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => href === "#" || href.includes("undefined") || href.includes("null") || href.includes("["))
      .slice(0, 10),
  );
  expect(brokenVisibleLinks, `${step.path} should not expose placeholder links`).toEqual([]);
}

async function expectCompactPayrollTypography(page: Page, step: CloseStep) {
  const pageTitle = page.getByRole("heading", { level: 1, name: step.heading }).first();
  const titleSize = await pageTitle.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(titleSize, `${step.path} title should use compact HR Admin scale`).toBeLessThanOrEqual(28);

  const clippedText = await page.locator(
    [
      "main h1",
      "main h2",
      "main h3",
      "main .button",
      "main button",
      "main .status-pill",
      "main .metric-tile-soft",
      "main .payroll-cycle-step",
      "main th",
      "main td",
    ].join(","),
  ).evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .filter((element) => element.scrollWidth > element.clientWidth + 3)
      .map((element) => (element.textContent ?? element.tagName).trim().replace(/\s+/g, " ").slice(0, 80))
      .slice(0, 10),
  );
  expect(clippedText, `${step.path} should not clip headings, chips, buttons, or grid text`).toEqual([]);
}

async function openLinkTarget(page: Page, link: Locator, expectedUrl: RegExp) {
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href ?? "", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(expectedUrl);
}

test.describe.serial("User journey phase 5: payroll close workflow", () => {
  test("HR and finance users can follow the full payroll close without confusing pages", async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const step of closeSteps) {
      await test.step(`Review ${step.path}`, async () => {
        await gotoAuthenticated(page, step.path, hrAdmin);
        await expectPageReady(page, step.heading);
        await expectPayrollJourney(page, step);
        await expectBusinessQuestionIsAnswered(page, step);
        await expectPageLinksAreHealthy(page, step);
        await expectCompactPayrollTypography(page, step);
        await expectNoAppError(page);
        await expectNoHorizontalOverflow(page);
      });
    }
  });

  test("payroll close drilldowns keep context while moving between phases", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await gotoAuthenticated(page, "/hr-admin/payroll-readiness?tab=employees", hrAdmin);
    await expectPageReady(page, "Payroll Readiness");
    await expect(main(page).getByRole("heading", { name: "Payroll source review" })).toBeVisible();
    await openLinkTarget(page, main(page).getByRole("link", { name: /^Warning\b/ }), /status=warning/);
    await expect(page).toHaveURL(/\/hr-admin\/payroll-readiness\?.*tab=employees/);
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    const firstLine = main(page).locator("a[href*='lineId=']").first();
    if (await firstLine.isVisible().catch(() => false)) {
      await openLinkTarget(page, firstLine, /\/hr-admin\/payroll-calculations\?.*lineId=/);
      await expect(main(page).getByText(/Line trace|Source hash|Formula/i).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/payroll-review", hrAdmin);
    await expectPageReady(page, "Payroll Review");
    const openTrace = main(page).getByRole("link", { name: "Open trace" }).first();
    if (await openTrace.isVisible().catch(() => false)) {
      await expect(openTrace).toHaveAttribute("href", /\/hr-admin\/payroll-calculations\?runId=.*calculationId=/);
    }
    const exception = main(page).locator("a[href*='exceptionId=']").first();
    if (await exception.isVisible().catch(() => false)) {
      await openLinkTarget(page, exception, /\/hr-admin\/payroll-review\?.*exceptionId=/);
      await expect(main(page).getByText(/Exception detail|Exception actions|No exception selected/i).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    const artifact = main(page).locator("a[href*='artifactId=']").first();
    if (await artifact.isVisible().catch(() => false)) {
      await openLinkTarget(page, artifact, /\/hr-admin\/payroll-outputs\?.*artifactId=/);
      await expect(main(page).getByText(/Artifact detail|Download file|No artifact selected/i).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });
});
