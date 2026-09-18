import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
  name: string;
};

type AdminContact = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  is_primary: boolean;
  provisioning_status: string;
  user_id: string | null;
  user_is_active: boolean | null;
  membership_id: string | null;
  membership_status: string;
  notes: string;
};

type OnboardingPayload = {
  tenant_code: string;
  tenant_name: string;
  baseline_published_at: string | null;
  handoff_completed_at: string | null;
  admin_contacts: AdminContact[];
  checklist_items: Array<{ code: string; status: string; completed_by_identifier: string }>;
  recent_events: Array<{ event_type: string; summary: string; actor_identifier: string; created_at: string; payload: Record<string, unknown> }>;
};

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

function notice(page: Page): Locator {
  return page.locator(".platform-feedback, .notice").first();
}

async function safeWait(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function safeReload(page: Page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await safeWait(page);
}

async function gotoPlatform(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await safeWait(page);
  await expectPageReady(page, heading);
}

async function tenantByCode(page: Page, tenantCode: string): Promise<TenantListItem> {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as TenantListItem[];
  const tenant = tenants.find((item) => item.code === tenantCode);
  expect(tenant, `tenant ${tenantCode}`).toBeTruthy();
  return tenant as TenantListItem;
}

async function onboardingPayload(page: Page, tenantId: string): Promise<OnboardingPayload> {
  const response = await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function expectEvent(payload: OnboardingPayload, eventType: string, summaryPattern?: RegExp) {
  const event = payload.recent_events.find((item) => item.event_type === eventType);
  expect(event, `${eventType} event`).toBeTruthy();
  expect(event?.actor_identifier).toBe("platform.admin");
  expect(event?.created_at).toBeTruthy();
  if (summaryPattern) expect(event?.summary).toMatch(summaryPattern);
}

async function openCreateTenantDialog(page: Page): Promise<Locator> {
  await card(page, "Create tenant").getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openAddContactDialog(page: Page): Promise<Locator> {
  await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Add platform admin contact" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function createTenantThroughBrowser(page: Page, tenantCode: string, tenantName: string): Promise<TenantListItem> {
  await gotoPlatform(page, "/platform-admin/tenants", "Tenants");
  const dialog = await openCreateTenantDialog(page);
  await namedControl(dialog, "code").fill(tenantCode);
  await namedControl(dialog, "name").fill(tenantName);
  await namedControl(dialog, "legal_name").fill(`${tenantName} Private Limited`);
  await namedControl(dialog, "primary_domain").fill(`${tenantCode}.example.test`);
  await namedControl(dialog, "primary_email").fill(`ops.${tenantCode}@example.test`);
  await namedControl(dialog, "primary_phone").fill("+91 95555 01001");
  await namedControl(dialog, "subscription_plan").selectOption("growth");
  await namedControl(dialog, "seed_pack").selectOption("standard_office");
  await namedControl(dialog, "timezone").fill("Asia/Kolkata");
  await namedControl(dialog, "country_code").fill("IN");
  await namedControl(dialog, "is_sandbox").setChecked(true);
  await dialog.getByRole("button", { name: "Create tenant" }).click();
  await expect(notice(page).getByText("Tenant created.", { exact: true })).toBeVisible();
  return tenantByCode(page, tenantCode);
}

async function createAndPublishHeaderTemplate(page: Page, packCode: string, packName: string) {
  await gotoPlatform(page, "/platform-admin/policy-packs", "Setup Templates");
  const setupCard = card(page, "Setup templates");
  await namedControl(setupCard, "code").fill(packCode);
  await namedControl(setupCard, "name").fill(packName);
  await namedControl(setupCard, "domain").selectOption("leave");
  await namedControl(setupCard, "status").selectOption("draft");
  await namedControl(setupCard, "version").fill("1");
  await namedControl(setupCard, "country_code").fill("IN");
  await namedControl(setupCard, "industry_tag").fill("qa");
  await namedControl(setupCard, "description").fill("Admin Access certification baseline.");
  await setupCard.getByRole("button", { name: "Create template" }).click();
  await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();

  await safeReload(page);
  await namedControl(setupCard, "policy_pack_search").fill(packCode);
  await setupCard.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "Publish" }).click();
  const headerOnlyDialog = page.getByRole("dialog", { name: "Publish header-only setup template?" });
  await expect(headerOnlyDialog.getByText(/evidence-only baseline/i)).toBeVisible();
  await headerOnlyDialog.getByRole("button", { name: "Publish header-only" }).click();
  await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();
}

async function applyTemplateAndConfirmSetup(page: Page, tenantId: string, packCode: string, packName: string, tenantCode: string) {
  await gotoPlatform(page, `/platform-admin/policy-packs?tenantId=${tenantId}`, "Setup Templates");
  const adoptCard = card(page, "Apply setup template");
  await namedControl(adoptCard, "policy_pack_id").selectOption({ label: `${packName} - ${packCode} - Published` });
  await namedControl(adoptCard, "adoption_mode").selectOption("clone_to_tenant_records");
  await namedControl(adoptCard, "notes").fill(`Admin Access baseline for ${tenantCode}.`);
  await adoptCard.getByRole("button", { name: "Preview impact" }).click();
  await expect(adoptCard.getByText("Impact preview")).toBeVisible();
  await adoptCard.getByRole("button", { name: "Apply template" }).click();
  await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();

  await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenantId}`, "Launch Readiness");
  const readiness = card(page, "Launch readiness");
  await readiness.getByRole("button", { name: "Confirm setup" }).click();
  await page.getByRole("dialog", { name: "Confirm initial setup?" }).getByRole("button", { name: "Confirm setup" }).click();
  await expect(notice(page).getByText("Mark Baseline Published", { exact: true })).toBeVisible();
}

async function addContactThroughBrowser(page: Page, input: {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  notes: string;
  primary?: boolean;
}) {
  await gotoPlatform(page, `/platform-admin/admins?tenantId=${input.tenantId}`, "Admin Access");
  const dialog = await openAddContactDialog(page);
  await namedControl(dialog, "full_name").fill(input.name);
  await namedControl(dialog, "email").fill(`  ${input.email.toUpperCase()}  `);
  await namedControl(dialog, "phone_number").fill(input.phone);
  await namedControl(dialog, "job_title").fill(input.jobTitle);
  await namedControl(dialog, "is_primary").setChecked(input.primary ?? true);
  await namedControl(dialog, "notes").fill(input.notes);
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(notice(page).getByText("Admin contact added.", { exact: true })).toBeVisible();
}

async function provisionLoginThroughBrowser(page: Page, input: {
  contactLabel: string;
  username: string;
  roleCode: "hr-admin" | "tenant-admin";
  roleName: string;
  password?: string;
  membership?: "active" | "invited";
  mustChangePassword?: boolean;
  userActive?: boolean;
}) {
  const provisionCard = card(page, "Create tenant admin login");
  await namedControl(provisionCard, "contact_id").selectOption({ label: input.contactLabel });
  await namedControl(provisionCard, "username").fill(input.username);
  await namedControl(provisionCard, "role_code").selectOption(input.roleCode);
  await namedControl(provisionCard, "role_name").fill(input.roleName);
  if (input.password !== undefined) await namedControl(provisionCard, "password").fill(input.password);
  await namedControl(provisionCard, "membership_status").selectOption(input.membership ?? "active");
  await namedControl(provisionCard, "must_change_password").setChecked(input.mustChangePassword ?? true);
  await namedControl(provisionCard, "is_user_active").setChecked(input.userActive ?? true);
  await provisionCard.getByRole("button", { name: "Create login access" }).click();
}

test.describe("Platform Admin Admin Access certification", () => {
  test("certifies contact CRUD, login provisioning, readiness dependency, audit evidence, tenant isolation, and responsive UX", async ({ page }) => {
    test.setTimeout(540_000);
    const runRef = uniqueRunRef();
    const tenantACode = `qa-admin-a-${runRef}`;
    const tenantBCode = `qa-admin-b-${runRef}`;
    const tenantAName = `QA Admin Access Tenant A ${runRef}`;
    const tenantBName = `QA Admin Access Tenant B ${runRef}`;
    const packCode = `qa-admin-pack-${runRef}`;
    const packName = `QA Admin Pack ${runRef}`;
    const adminAEmail = `qa.admin.primary.${runRef}@example.test`;
    const secondaryAEmail = `qa.admin.secondary.${runRef}@example.test`;
    const adminBEmail = `qa.admin.inactive.${runRef}@example.test`;
    const adminAUsername = `qa.admin.${runRef}`;
    const adminBUsername = `qa.admin.inactive.${runRef}`;
    const adminPassword = process.env.PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD ?? "Password@123";

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "";
      if (!request.url().includes("_rsc") && !failure.includes("ERR_ABORTED")) {
        failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
      }
    });

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    await createAndPublishHeaderTemplate(page, packCode, packName);
    const tenantA = await createTenantThroughBrowser(page, tenantACode, tenantAName);
    const tenantB = await createTenantThroughBrowser(page, tenantBCode, tenantBName);
    await applyTemplateAndConfirmSetup(page, tenantA.id, packCode, packName, tenantACode);
    await applyTemplateAndConfirmSetup(page, tenantB.id, packCode, packName, tenantBCode);

    await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantA.id}`, "Admin Access");
    const dialog = await openAddContactDialog(page);
    await expect(dialog.locator('[name="full_name"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    const invalidDialog = await openAddContactDialog(page);
    await invalidDialog.getByRole("button", { name: "Add contact" }).click();
    await expect(namedControl(invalidDialog, "full_name")).toBeFocused();
    await namedControl(invalidDialog, "full_name").fill("Invalid Email Admin");
    await namedControl(invalidDialog, "email").fill("not-an-email");
    await invalidDialog.getByRole("button", { name: "Add contact" }).click();
    await expect(namedControl(invalidDialog, "email")).toBeFocused();
    await invalidDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(invalidDialog).toBeHidden();

    await addContactThroughBrowser(page, {
      tenantId: tenantA.id,
      name: "QA Primary Admin",
      email: adminAEmail,
      phone: "+91 95555 01002",
      jobTitle: "Head of People",
      notes: `Primary admin for ${tenantACode}`,
    });
    await safeReload(page);
    let payloadA = await onboardingPayload(page, tenantA.id);
    let primaryA = payloadA.admin_contacts.find((contact) => contact.email === adminAEmail);
    expect(primaryA).toMatchObject({
      full_name: "QA Primary Admin",
      email: adminAEmail,
      is_primary: true,
      provisioning_status: "planned",
      membership_id: null,
    });
    expectEvent(payloadA, "admin_contact_added", new RegExp(adminAEmail));

    await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenantA.id}`, "Launch Readiness");
    await expect(card(page, "Launch readiness").getByText(/Primary tenant admin needs usable login access/i)).toBeVisible();
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Mark ready" })).toBeDisabled();
    const blockedHandoff = await page.request.post(`/api/platform/tenants/${tenantA.id}/onboarding/mark-handoff-ready`);
    expect(blockedHandoff.status()).toBe(400);
    expect(JSON.stringify(await blockedHandoff.json())).toContain("Primary tenant admin must be provisioned");

    await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantA.id}`, "Admin Access");
    const contactsCard = card(page, "Admin contacts");
    await contactsCard.locator(".tenant-support-access-row").filter({ hasText: adminAEmail }).getByRole("button", { name: "Edit" }).click();
    const editForm = contactsCard.locator(".platform-contact-edit-form");
    await expect(editForm.getByText("Edit contact validation")).toBeVisible();
    await namedControl(editForm, "full_name").fill("QA Primary Admin Updated");
    await namedControl(editForm, "phone_number").fill("+91 95555 01099");
    await namedControl(editForm, "job_title").fill("People Operations Lead");
    await namedControl(editForm, "notes").fill(`Edited primary admin for ${tenantACode}`);
    await editForm.getByRole("button", { name: "Save contact" }).click();
    await expect(notice(page).getByText("Admin contact updated.", { exact: true })).toBeVisible();
    await safeReload(page);
    payloadA = await onboardingPayload(page, tenantA.id);
    primaryA = payloadA.admin_contacts.find((contact) => contact.email === adminAEmail);
    expect(primaryA).toMatchObject({
      full_name: "QA Primary Admin Updated",
      phone_number: "+91 95555 01099",
      job_title: "People Operations Lead",
    });
    expect(primaryA?.notes).toContain(tenantACode);
    expectEvent(payloadA, "admin_contact_updated", new RegExp(adminAEmail));

    await addContactThroughBrowser(page, {
      tenantId: tenantA.id,
      name: "QA Secondary Admin",
      email: secondaryAEmail,
      phone: "+91 95555 01003",
      jobTitle: "HR Operations",
      notes: `Secondary admin for ${tenantACode}`,
      primary: false,
    });
    await safeReload(page);
    await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantA.id}`, "Admin Access");
    const provisionCard = card(page, "Create tenant admin login");
    await provisionCard.getByRole("button", { name: "Create login access" }).click();
    await expect(namedControl(provisionCard, "username")).toBeFocused();

    await provisionLoginThroughBrowser(page, {
      contactLabel: `QA Primary Admin Updated - ${adminAEmail}`,
      username: `  ${adminAUsername}  `,
      roleCode: "tenant-admin",
      roleName: "Tenant Admin",
      password: adminPassword,
      membership: "active",
      mustChangePassword: false,
      userActive: true,
    });
    await expect(notice(page).getByText("First admin provisioned.", { exact: true })).toBeVisible();
    await safeReload(page);
    payloadA = await onboardingPayload(page, tenantA.id);
    primaryA = payloadA.admin_contacts.find((contact) => contact.email === adminAEmail);
    expect(primaryA?.membership_id).toBeTruthy();
    expect(primaryA?.user_id).toBeTruthy();
    expect(primaryA?.user_is_active).toBe(true);
    expect(primaryA?.membership_status).toBe("active");
    expect(primaryA?.provisioning_status).toBe("provisioned");
    expect(payloadA.checklist_items.find((item) => item.code === "first_admin_provisioned")?.status).toBe("completed");
    expectEvent(payloadA, "first_admin_provisioned", new RegExp(adminAEmail));
    await expect(card(page, "Admin contacts").locator(".tenant-support-access-row").filter({ hasText: adminAEmail }).getByText(/Provisioned/i)).toBeVisible();
    await expect(namedControl(card(page, "Create tenant admin login"), "contact_id").locator("option", { hasText: adminAEmail })).toHaveCount(0);

    const repeatProvision = await page.request.post(`/api/platform/admin-contacts/${primaryA?.id}/provision-user`, {
      data: {
        username: `${adminAUsername}.repeat`,
        role_code: "tenant-admin",
        role_name: "Tenant Admin",
        password: adminPassword,
        membership_status: "active",
      },
    });
    expect(repeatProvision.status()).toBe(400);
    expect(JSON.stringify(await repeatProvision.json()).toLowerCase()).toContain("already been provisioned");

    await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantA.id}`, "Admin Access");
    await provisionLoginThroughBrowser(page, {
      contactLabel: `QA Secondary Admin - ${secondaryAEmail}`,
      username: adminAUsername.toUpperCase(),
      roleCode: "hr-admin",
      roleName: "HR Admin",
      password: adminPassword,
      membership: "active",
      mustChangePassword: true,
      userActive: true,
    });
    await expect(notice(page).getByText(/already exists|user with this username/i)).toBeVisible();
    const afterDuplicate = await onboardingPayload(page, tenantA.id);
    expect(afterDuplicate.admin_contacts.find((contact) => contact.email === secondaryAEmail)?.membership_id).toBeNull();

    await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenantA.id}`, "Launch Readiness");
    await expect(card(page, "Launch readiness").getByText(/has usable tenant access/i).first()).toBeVisible();
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Mark ready" })).toBeEnabled();

    await addContactThroughBrowser(page, {
      tenantId: tenantB.id,
      name: "QA Inactive Admin",
      email: adminBEmail,
      phone: "+91 95555 01004",
      jobTitle: "Tenant Owner",
      notes: `Inactive admin for ${tenantBCode}`,
    });
    await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantB.id}`, "Admin Access");
    await provisionLoginThroughBrowser(page, {
      contactLabel: `QA Inactive Admin - ${adminBEmail}`,
      username: adminBUsername,
      roleCode: "tenant-admin",
      roleName: "Tenant Admin",
      password: adminPassword,
      membership: "invited",
      mustChangePassword: true,
      userActive: false,
    });
    await expect(notice(page).getByText("First admin provisioned.", { exact: true })).toBeVisible();
    await safeReload(page);
    const payloadB = await onboardingPayload(page, tenantB.id);
    const inactiveB = payloadB.admin_contacts.find((contact) => contact.email === adminBEmail);
    expect(inactiveB?.membership_status).toBe("invited");
    expect(inactiveB?.user_is_active).toBe(false);
    expect(inactiveB?.provisioning_status).toBe("invited");

    await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenantB.id}`, "Launch Readiness");
    await expect(card(page, "Launch readiness").getByText(/has login access, but the user or membership is not active/i).first()).toBeVisible();
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Mark ready" })).toBeDisabled();
    const inactiveHandoff = await page.request.post(`/api/platform/tenants/${tenantB.id}/onboarding/mark-handoff-ready`);
    expect(inactiveHandoff.status()).toBe(400);
    expect(JSON.stringify(await inactiveHandoff.json())).toContain("Primary tenant admin login must be active");

    await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantA.id}`, "Admin Access");
    await expect(card(page, "Admin contacts").getByText(adminAEmail)).toBeVisible();
    await expect(card(page, "Admin contacts").getByText(adminBEmail)).toHaveCount(0);
    await page.goBack();
    await safeWait(page);
    await expectPageReady(page, "Launch Readiness");
    await expect(card(page, "Launch readiness").getByText(adminBEmail).first()).toBeVisible();
    await page.goForward();
    await safeWait(page);
    await expectPageReady(page, "Admin Access");
    await expect(card(page, "Admin contacts").getByText(adminAEmail)).toBeVisible();
    await expect(card(page, "Admin contacts").getByText(adminBEmail)).toHaveCount(0);

    await gotoPlatform(page, `/platform-admin/audit-logs?tenantId=${tenantA.id}`, "Audit Logs");
    const eventsCard = card(page, "Onboarding events");
    for (const eventType of ["admin_contact_added", "admin_contact_updated", "first_admin_provisioned"]) {
      await namedControl(eventsCard, "event_search").fill(eventType);
      await expect(eventsCard.locator(".tenant-support-access-row").first()).toContainText(eventType.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));
    }
    await expect(eventsCard.getByText(adminBEmail)).toHaveCount(0);

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1180, height: 820 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantA.id}`, "Admin Access");
      await expect(card(page, "Admin contacts")).toBeVisible();
      await expect(card(page, "Create tenant admin login")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    expect(
      consoleErrors
        .filter((entry) => !entry.includes("favicon"))
        .filter((entry) => !/Failed to load resource: the server responded with a status of 400/i.test(entry))
        .join("\n"),
    ).toBe("");
    expect(failedRequests.join("\n")).toBe("");
  });
});
