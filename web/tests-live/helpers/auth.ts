import { expect, type Page } from "@playwright/test";

export type SeededPersona = "employee" | "manager" | "hrAdmin";

const seededUsers: Record<SeededPersona, { identifier: string; displayName: string }> = {
  employee: { identifier: "riya.sharma", displayName: "Riya Sharma" },
  manager: { identifier: "karan.mehta", displayName: "Karan Mehta" },
  hrAdmin: { identifier: "nisha.rao", displayName: "Nisha Rao" },
};

export const seededPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";

const landingUrlByPersona: Record<SeededPersona, RegExp> = {
  employee: /\/ess$/,
  manager: /\/mss\/approvals$/,
  hrAdmin: /\/hr-admin$/,
};

export async function loginAs(page: Page, persona: SeededPersona) {
  const user = seededUsers[persona];
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(user.identifier);
  await page.getByLabel("Password").fill(seededPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(landingUrlByPersona[persona]);
  await expect(page.getByText(user.displayName).first()).toBeVisible();
}

export async function expectLiveWorkspace(page: Page, label: string | RegExp) {
  await expect(page.getByText(label).first()).toBeVisible();
  await expect(page.getByText(/Demo .*mode|seeded demo data/i)).toHaveCount(0);
}
