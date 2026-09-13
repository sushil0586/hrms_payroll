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

export const platformAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME ?? "platform.admin",
  password: seedPassword,
};

export const payrollFinanceManager: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_PAYROLL_FINANCE_USERNAME ?? "payroll.finance",
  password: seedPassword,
};

export const supportAgent: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_SUPPORT_AGENT_USERNAME ?? "support.agent",
  password: seedPassword,
};

export function personaForRoute(path: string): Persona {
  if (path.startsWith("/platform-admin")) {
    return platformAdmin;
  }
  if (path.startsWith("/ess")) {
    return employee;
  }
  if (path.startsWith("/mss")) {
    return manager;
  }
  return hrAdmin;
}

async function gotoWithRetry(page: Page, targetPath: string) {
  const attempts = 2;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(targetPath, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      return;
    } catch (error) {
      if (attempt === attempts || !String(error).includes("ERR_NETWORK_IO_SUSPENDED")) {
        throw error;
      }
      await page.waitForTimeout(1_000);
    }
  }
}

async function authenticateWithApiSession(page: Page, persona: Persona) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: persona.username,
      password: persona.password,
    },
  });
  await expect(response.ok()).toBeTruthy();
}

export async function loginIfRequired(page: Page, persona: Persona, targetPath: string) {
  await gotoWithRetry(page, targetPath);
  const currentUrl = new URL(page.url());
  const targetUrl = new URL(targetPath, currentUrl.origin);
  if (!currentUrl.pathname.includes("/login") && currentUrl.pathname === targetUrl.pathname) {
    return;
  }

  if (!currentUrl.pathname.includes("/login")) {
    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await gotoWithRetry(page, targetPath);
  }

  await authenticateWithApiSession(page, persona);
  await gotoWithRetry(page, targetPath);
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
