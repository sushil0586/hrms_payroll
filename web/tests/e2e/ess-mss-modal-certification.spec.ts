import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectDialogStable } from "../helpers/modal-stability";
import { employee, gotoAuthenticated, manager, type Persona } from "../helpers/staging-auth";

type ModalCase = {
  dialogName: string | RegExp;
  heading: string | RegExp;
  name: string;
  persona: Persona;
  route: string;
  trigger: (page: Page) => Locator;
  verify?: (dialog: Locator) => Promise<void>;
};

async function firstUsableTrigger(locator: Locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }
    if (await candidate.isDisabled().catch(() => false)) {
      continue;
    }
    return candidate;
  }
  return null;
}

async function certifyModal(page: Page, item: ModalCase) {
  await gotoAuthenticated(page, item.route, item.persona);
  await expectPageReady(page, item.heading);

  const trigger = await firstUsableTrigger(item.trigger(page));
  if (!trigger) {
    return false;
  }

  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: item.dialogName });
  await expect(dialog, `${item.name} should open a dialog`).toBeVisible();
  await expectDialogStable(page, item.dialogName);
  if (item.verify) {
    await item.verify(dialog);
  }

  await page.keyboard.press("Escape");
  await expect(dialog, `${item.name} should close with Escape`).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  return true;
}

const essModalCases: ModalCase[] = [
  {
    dialogName: "Apply leave",
    heading: "Leave",
    name: "ESS leave apply",
    persona: employee,
    route: "/ess/leave",
    trigger: (page) => page.getByRole("button", { name: "Apply leave" }),
    verify: async (dialog) => {
      await expect(dialog.getByLabel("Leave type")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Submit leave" })).toBeVisible();
    },
  },
  {
    dialogName: "Leave request detail",
    heading: "Leave",
    name: "ESS leave detail",
    persona: employee,
    route: "/ess/leave",
    trigger: (page) => page.locator("button.leave-request-card"),
    verify: async (dialog) => {
      await expect(dialog.getByRole("heading", { name: "Timeline" })).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Request details" })).toBeVisible();
    },
  },
  {
    dialogName: "Regularize attendance",
    heading: "Attendance",
    name: "ESS attendance regularization",
    persona: employee,
    route: "/ess/attendance",
    trigger: (page) => page.getByRole("button", { name: "Regularize attendance" }),
    verify: async (dialog) => {
      await expect(dialog.getByLabel(/Attendance record/i)).toBeVisible();
      await expect(dialog.getByRole("button", { name: /Submit (correction|regularization)/ })).toBeVisible();
    },
  },
  {
    dialogName: "Regularization detail",
    heading: "Attendance",
    name: "ESS attendance detail",
    persona: employee,
    route: "/ess/attendance",
    trigger: (page) => page.locator("button.leave-request-card"),
    verify: async (dialog) => {
      await expect(dialog.getByRole("heading", { name: "Timeline" })).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Correction details" })).toBeVisible();
    },
  },
  {
    dialogName: /Payslip detail/i,
    heading: "Payslips",
    name: "ESS payslip detail",
    persona: employee,
    route: "/ess/payslips",
    trigger: (page) => page.getByRole("button", { name: "Review payslip" }),
    verify: async (dialog) => {
      await expect(dialog.getByText("Payment summary")).toBeVisible();
      await expect(dialog.getByText("Access trail")).toBeVisible();
    },
  },
  {
    dialogName: /Start declaration|Update declaration/,
    heading: "Statutory Declarations",
    name: "ESS tax declaration setup",
    persona: employee,
    route: "/ess/statutory-declarations",
    trigger: (page) => page.getByRole("button", { name: /Start declaration|Update declaration|View setup/ }),
    verify: async (dialog) => {
      await expect(dialog.getByLabel("Financial year")).toBeVisible();
      await expect(dialog.getByLabel("Tax regime")).toBeVisible();
    },
  },
  {
    dialogName: "Add proof",
    heading: "Statutory Declarations",
    name: "ESS tax proof upload",
    persona: employee,
    route: "/ess/statutory-declarations",
    trigger: (page) => page.getByRole("button", { name: "Add proof" }),
    verify: async (dialog) => {
      await expect(dialog.getByLabel("Section")).toBeVisible();
      await expect(dialog.getByLabel("Amount")).toBeVisible();
    },
  },
  {
    dialogName: "Proof detail",
    heading: "Statutory Declarations",
    name: "ESS tax proof detail",
    persona: employee,
    route: "/ess/statutory-declarations",
    trigger: (page) => page.getByText("View details"),
    verify: async (dialog) => {
      await expect(dialog.getByText("Section")).toBeVisible();
      await expect(dialog.getByText("Proof status")).toBeVisible();
    },
  },
  {
    dialogName: "Upload document",
    heading: "Documents",
    name: "ESS document upload",
    persona: employee,
    route: "/ess/documents",
    trigger: (page) => page.getByRole("button", { name: "Upload document" }),
    verify: async (dialog) => {
      await expect(dialog.getByLabel("File")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Submit for review" })).toBeVisible();
    },
  },
  {
    dialogName: "Required document detail",
    heading: "Documents",
    name: "ESS required document detail",
    persona: employee,
    route: "/ess/documents",
    trigger: (page) => page.getByRole("button", { name: "View" }),
    verify: async (dialog) => {
      await expect(dialog.getByText("Current state")).toBeVisible();
      await expect(dialog.getByText("Current file")).toBeVisible();
    },
  },
  {
    dialogName: "Document detail",
    heading: "Documents",
    name: "ESS document history detail",
    persona: employee,
    route: "/ess/documents",
    trigger: (page) => page.getByRole("button", { name: "Review" }),
    verify: async (dialog) => {
      await expect(dialog.getByText("Review status")).toBeVisible();
      await expect(dialog.getByText("Audit trail")).toBeVisible();
    },
  },
  {
    dialogName: /Notification detail/i,
    heading: "Notifications",
    name: "ESS notification detail",
    persona: employee,
    route: "/ess/notifications",
    trigger: (page) => page.getByRole("button", { name: "Review notification" }),
    verify: async (dialog) => {
      await expect(dialog.getByText("Message", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Delivery", { exact: true })).toBeVisible();
    },
  },
];

const mssModalCases: ModalCase[] = [
  {
    dialogName: "Leave approval review",
    heading: "Manager approvals",
    name: "MSS leave approval review",
    persona: manager,
    route: "/mss/approvals?queue=leave",
    trigger: (page) => page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }),
    verify: async (dialog) => {
      await expect(dialog.getByText("Decision note")).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Approval track" })).toBeVisible();
    },
  },
  {
    dialogName: "Attendance approval review",
    heading: "Manager approvals",
    name: "MSS attendance approval review",
    persona: manager,
    route: "/mss/approvals?queue=attendance",
    trigger: (page) => page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }),
    verify: async (dialog) => {
      await expect(dialog.getByText("Decision note")).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Approval track" })).toBeVisible();
    },
  },
  {
    dialogName: /Notification detail/i,
    heading: "Manager notifications",
    name: "MSS notification detail",
    persona: manager,
    route: "/mss/notifications",
    trigger: (page) => page.getByRole("button", { name: "Review notification" }),
    verify: async (dialog) => {
      await expect(dialog.getByText("Message", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Delivery", { exact: true })).toBeVisible();
    },
  },
];

test.describe("ESS and MSS modal certification", () => {
  test("certifies every available ESS modal on desktop and mobile", async ({ page }) => {
    test.setTimeout(300_000);
    const certified: string[] = [];

    for (const viewport of [
      { width: 1440, height: 960 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const item of essModalCases) {
        if (await certifyModal(page, item)) {
          certified.push(`${item.name} ${viewport.width}`);
        }
      }
    }

    expect(certified.length, "At least core ESS dialogs should be available for modal certification.").toBeGreaterThanOrEqual(6);
  });

  test("certifies every available MSS modal on desktop and mobile", async ({ page }) => {
    test.setTimeout(240_000);
    const certified: string[] = [];

    for (const viewport of [
      { width: 1440, height: 960 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const item of mssModalCases) {
        if (await certifyModal(page, item)) {
          certified.push(`${item.name} ${viewport.width}`);
        }
      }
    }

    expect(certified.length, "At least one MSS dialog should be available for modal certification.").toBeGreaterThanOrEqual(1);
  });
});
