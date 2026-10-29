import { expect, type Page } from "@playwright/test";

type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export async function submitAndCaptureMutation<T>(
  page: Page,
  routeFragment: string,
  method: MutationMethod,
  action: () => Promise<void>,
) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => candidate.url().includes(routeFragment) && candidate.request().method() === method,
    ),
    action(),
  ]);
  const payload = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok(), payload, status: response.status() };
}

export async function expectDurableFeedback(
  page: Page,
  message: string | RegExp,
  verifyPersistedState: () => Promise<void>,
) {
  await expect(page.getByRole("status").filter({ hasText: message }).first()).toBeVisible();
  await page.reload();
  await verifyPersistedState();
}
