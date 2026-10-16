import { expect, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./assertions";

export const mssLeaveReviewDialogName = /Review leave approval|Leave approval review/i;
export const mssAttendanceReviewDialogName = /Review attendance approval|Attendance approval review/i;

export function getDialog(page: Page, label: string | RegExp) {
  return page.getByRole("dialog", { name: label });
}

export function getDialogWithText(page: Page, text: string | RegExp) {
  return page.getByRole("dialog").filter({ hasText: text }).first();
}

export async function expectDialogLocatorStable(page: Page, dialog: Locator, label: string | RegExp) {
  await expect(dialog).toBeVisible();
  const issues = await dialog.evaluate((element) => {
    const controlLabel = (control: Element) => {
      const ariaLabel = control.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel;
      const label = control.closest("label")?.textContent?.trim().replace(/\s+/g, " ");
      if (label) return label.slice(0, 80);
      const text = control.textContent?.trim().replace(/\s+/g, " ");
      if (text) return text.slice(0, 80);
      return control.tagName.toLowerCase();
    };
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const dialogRect = element.getBoundingClientRect();
    const scrollContainer = element.querySelector(".mss-approval-modal__body, .hr-admin-action-modal__body") ?? element;
    const scrollContainerRect = scrollContainer.getBoundingClientRect();
    const scrollStyle = window.getComputedStyle(scrollContainer);
    const controls = Array.from(
      element.querySelectorAll("button, a.button, input:not([type='hidden']), select, textarea"),
    ).filter((control) => {
      if (control instanceof HTMLInputElement && control.type === "file") {
        return false;
      }
      const rect = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      const centerElement = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return rect.width > 0
        && rect.height > 0
        && style.display !== "none"
        && style.visibility !== "hidden"
        && rect.bottom > scrollContainerRect.top
        && rect.top < scrollContainerRect.bottom
        && Boolean(centerElement && (centerElement === control || control.contains(centerElement)));
    });
    const problems: string[] = [];

    if (dialogRect.left < -1 || dialogRect.right > viewportWidth + 1) {
      problems.push(`dialog extends beyond viewport width (${Math.round(dialogRect.left)}-${Math.round(dialogRect.right)} / ${viewportWidth})`);
    }
    const dialogCenterX = dialogRect.left + dialogRect.width / 2;
    const viewportCenterX = viewportWidth / 2;
    if (Math.abs(dialogCenterX - viewportCenterX) > 24) {
      problems.push(`dialog is not centered horizontally (${Math.round(dialogCenterX)} / ${Math.round(viewportCenterX)})`);
    }
    if (dialogRect.top < -1 || dialogRect.bottom > viewportHeight + 1) {
      problems.push(`dialog extends beyond viewport height (${Math.round(dialogRect.top)}-${Math.round(dialogRect.bottom)} / ${viewportHeight})`);
    }
    if (scrollStyle.overflowY === "visible" && scrollContainer.scrollHeight > scrollContainer.clientHeight + 2) {
      problems.push("dialog content can overflow without an internal scroll container");
    }

    for (let firstIndex = 0; firstIndex < controls.length; firstIndex += 1) {
      const first = controls[firstIndex].getBoundingClientRect();
      const firstArea = first.width * first.height;
      for (let secondIndex = firstIndex + 1; secondIndex < controls.length; secondIndex += 1) {
        const second = controls[secondIndex].getBoundingClientRect();
        const secondArea = second.width * second.height;
        const overlapWidth = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
        const overlapHeight = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
        const overlapArea = overlapWidth * overlapHeight;
        const threshold = Math.min(firstArea, secondArea) * 0.18;
        if (overlapArea > 24 && overlapArea > threshold) {
          const firstLabel = controlLabel(controls[firstIndex]);
          const secondLabel = controlLabel(controls[secondIndex]);
          problems.push(`visible modal controls overlap (${firstLabel} / ${secondLabel})`);
        }
      }
    }

    return [...new Set(problems)];
  });
  expect(issues, `${String(label)} should be viewport-safe and free of visible control overlap`).toEqual([]);
  await expectNoHorizontalOverflow(page);
}

export async function expectDialogStable(page: Page, label: string | RegExp) {
  await expectDialogLocatorStable(page, getDialog(page, label), label);
}
