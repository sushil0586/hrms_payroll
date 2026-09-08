import { expect, type Page } from "@playwright/test";

export type Persona = {
  username: string;
  password: string;
};

const seedPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";

export const hrAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "nisha.rao",
  password: seedPassword,
};

export const manager: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_MANAGER_USERNAME ?? "karan.mehta",
  password: seedPassword,
};

export const employee: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME ?? "riya.sharma",
  password: seedPassword,
};

export function personaForRoute(path: string): Persona {
  if (path.startsWith("/ess")) {
    return employee;
  }
  if (path.startsWith("/mss")) {
    return manager;
  }
  return hrAdmin;
}

export async function loginIfRequired(page: Page, persona: Persona, targetPath: string) {
  await page.goto(targetPath);
  const currentUrl = new URL(page.url());
  const targetUrl = new URL(targetPath, currentUrl.origin);
  if (!currentUrl.pathname.includes("/login") && currentUrl.pathname === targetUrl.pathname) {
    return;
  }

  if (!currentUrl.pathname.includes("/login")) {
    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await page.goto(targetPath);
  }

  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ess$/, { timeout: 15_000 });
  await page.goto(targetPath);
}

export async function gotoAuthenticated(page: Page, path: string, persona = personaForRoute(path)) {
  if (path.startsWith("/ess") || path.startsWith("/mss")) {
    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
  }
  await loginIfRequired(page, persona, path);
}

export async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

export async function expectFirstLinkHref(page: Page, name: string | RegExp, href: RegExp) {
  const link = page.getByRole("link", { name }).first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", href);
}
