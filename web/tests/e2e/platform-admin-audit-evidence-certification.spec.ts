import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type OnboardingEvent = {
  id: string;
  event_type: string;
  summary: string;
  actor_identifier: string;
  created_at: string;
  payload: Record<string, unknown>;
};

type OnboardingPayload = {
  tenant_code: string;
  tenant_name: string;
  tenant_status: string;
  tenant_onboarding_status: string;
  baseline_published_at: string | null;
  handoff_completed_at: string | null;
  admin_contacts: Array<{ id: string; full_name: string; email: string; phone_number: string; job_title: string; notes: string; provisioning_status: string; membership_id: string | null; is_primary: boolean }>;
  checklist_items: Array<{ code: string; status: string; completed_by_identifier: string }>;
  recent_events: OnboardingEvent[];
};

type TenantListItem = {
  id: string;
  code: string;
};

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
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

function notice(page: Page): Locator {
  return page.locator(".notice").first();
}

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

async function openPlatformTab(page: Page, name: "Tenants" | "Launch Readiness" | "Admin Access" | "Setup Templates" | "Audit Logs") {
  await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("tab", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-selected", "true");
}

async function onboardingPayload(page: Page, tenantId: string): Promise<OnboardingPayload> {
  const response = await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function tenantIdByCode(page: Page, tenantCode: string) {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as TenantListItem[];
  const tenant = tenants.find((item) => item.code === tenantCode);
  expect(tenant, `tenant ${tenantCode}`).toBeTruthy();
  return tenant?.id ?? "";
}

function expectEvent(payload: OnboardingPayload, eventType: string, summaryPattern?: RegExp) {
  const event = payload.recent_events.find((item) => item.event_type === eventType);
  expect(event, `${eventType} event`).toBeTruthy();
  expect(event?.actor_identifier).toBe("platform.admin");
  expect(event?.created_at).toBeTruthy();
  if (summaryPattern) {
    expect(event?.summary).toMatch(summaryPattern);
  }
  return event as OnboardingEvent;
}

function expectChecklist(payload: OnboardingPayload, code: string) {
  const item = payload.checklist_items.find((checklistItem) => checklistItem.code === code);
  expect(item, `${code} checklist item`).toBeTruthy();
  expect(item?.status).toBe("completed");
  expect(item?.completed_by_identifier).toBe("platform.admin");
}

function expectNoSensitiveData(value: unknown) {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  expect(text).not.toContain("password@123");
  expect(text).not.toContain("generated_password");
  expect(text).not.toContain("authorization");
  expect(text).not.toContain("secret_access_key");
  expect(text).not.toContain("smtp_password");
}

async function openEventEvidence(page: Page, eventType: string) {
  const eventsCard = card(page, "Onboarding events");
  await namedControl(eventsCard, "event_search").fill(eventType);
  const row = eventsCard.locator(".tenant-support-access-row").filter({ hasText: titleCase(eventType) }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: new RegExp(`View evidence for ${titleCase(eventType)}`) }).click();
  const dialog = page.getByRole("dialog", { name: titleCase(eventType) });
  await expect(dialog).toBeVisible();
  return dialog;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function selectOptionContaining(select: Locator, text: string) {
  const option = select.locator("option").filter({ hasText: text }).first();
  await expect(option, `option containing ${text}`).toHaveCount(1, { timeout: 10_000 });
  const value = await option.getAttribute("value");
  expect(value, `option containing ${text}`).toBeTruthy();
  await select.selectOption(value ?? "");
}

test.describe("Platform admin audit evidence certification", () => {
  test("each platform onboarding mutation leaves tenant-specific evidence visible after refresh", async ({ page }) => {
    test.setTimeout(300_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-audit-${runRef}`;
    const tenantName = `QA Audit Tenant ${runRef}`;
    const packCode = `qa-audit-pack-${runRef}`;
    const packName = `QA Audit Pack ${runRef}`;
    const adminName = "QA Audit Admin";
    const adminEmail = `qa.audit.${runRef}@example.test`;
    const mutationMatrix: Array<{ mutation: string; eventType: string; payloadChecks: Record<string, unknown> }> = [];

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");

    await openPlatformTab(page, "Setup Templates");
    const policyPackCard = card(page, "Setup templates");
    await namedControl(policyPackCard, "code").fill(packCode);
    await namedControl(policyPackCard, "name").fill(packName);
    await namedControl(policyPackCard, "domain").selectOption("leave");
    await namedControl(policyPackCard, "status").selectOption("draft");
    await namedControl(policyPackCard, "country_code").fill("IN");
    await namedControl(policyPackCard, "industry_tag").fill("qa");
    await namedControl(policyPackCard, "description").fill("Audit evidence certification pack.");
    await policyPackCard.getByRole("button", { name: "Create template" }).click();
    await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();
    await page.reload();
    await namedControl(policyPackCard, "policy_pack_search").fill(packCode);
    await page.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "Publish" }).click();
    const publishDialog = page.getByRole("dialog", { name: "Publish header-only setup template?" });
    await expect(publishDialog.getByText(/evidence-only baseline/i)).toBeVisible();
    await publishDialog.getByRole("button", { name: "Publish header-only" }).click();
    await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();

    await openPlatformTab(page, "Tenants");
    const createTenantCard = await openCreateTenantDialog(page);
    await namedControl(createTenantCard, "code").fill(tenantCode);
    await namedControl(createTenantCard, "name").fill(tenantName);
    await namedControl(createTenantCard, "legal_name").fill(`${tenantName} Pvt Ltd`);
    await namedControl(createTenantCard, "primary_domain").fill(`${tenantCode}.example.test`);
    await namedControl(createTenantCard, "primary_email").fill(`ops.${tenantCode}@example.test`);
    await namedControl(createTenantCard, "subscription_plan").selectOption("growth");
    await namedControl(createTenantCard, "seed_pack").selectOption("standard_office");
    await namedControl(createTenantCard, "country_code").fill("IN");
    await createTenantCard.getByRole("button", { name: "Create tenant" }).click();
    await expect(notice(page).getByText("Tenant created.", { exact: true })).toBeVisible();

    const tenantId = await tenantIdByCode(page, tenantCode);
    expect(tenantId).toBeTruthy();
    await page.goto(`/platform-admin/onboarding?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    let evidence = await onboardingPayload(page, tenantId ?? "");
    expect(evidence.tenant_code).toBe(tenantCode);
    let auditEvent = expectEvent(evidence, "tenant_created", new RegExp(tenantCode));
    expect(auditEvent.payload.tenant_id).toBe(tenantId);
    expect(auditEvent.payload.primary_domain).toBe(`${tenantCode}.example.test`);
    mutationMatrix.push({ mutation: "Tenant create", eventType: "tenant_created", payloadChecks: { tenant_id: tenantId, primary_domain: `${tenantCode}.example.test` } });
    expectChecklist(evidence, "tenant_created");
    expectChecklist(evidence, "domain_mapped");

    const onboardingCard = card(page, "Onboarding metadata");
    await namedControl(onboardingCard, "owner_mode").selectOption("combined_platform_admin");
    await namedControl(onboardingCard, "setup_style").selectOption("platform_assisted");
    await namedControl(onboardingCard, "data_setup_style").selectOption("manual");
    await namedControl(onboardingCard, "policy_control_style").selectOption("mixed");
    await namedControl(onboardingCard, "notes").fill(`Audit notes for ${tenantCode}`);
    await onboardingCard.getByRole("button", { name: "Save onboarding" }).click();
    await expect(notice(page).getByText("Onboarding metadata updated.", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    auditEvent = expectEvent(evidence, "tenant_prepared", new RegExp(tenantCode));
    expect(auditEvent.payload.fields).toEqual(expect.arrayContaining(["notes", "owner_mode", "setup_style"]));
    mutationMatrix.push({ mutation: "Tenant onboarding edit", eventType: "tenant_prepared", payloadChecks: { field_notes: "notes", field_owner: "owner_mode", field_setup: "setup_style" } });

    await openPlatformTab(page, "Admin Access");
    const contactsCard = await openAddContactDialog(page);
    await namedControl(contactsCard, "full_name").fill(adminName);
    await namedControl(contactsCard, "email").fill(adminEmail);
    await namedControl(contactsCard, "phone_number").fill("+91 92222 22001");
    await namedControl(contactsCard, "job_title").fill("Head of People");
    await namedControl(contactsCard, "is_primary").setChecked(true);
    await contactsCard.getByRole("button", { name: "Add contact" }).click();
    await expect(notice(page).getByText("Admin contact added.", { exact: true })).toBeVisible();
    await page.reload();
    evidence = await onboardingPayload(page, tenantId ?? "");
    auditEvent = expectEvent(evidence, "admin_contact_added", new RegExp(adminEmail));
    expect(auditEvent.payload.contact_id).toBeTruthy();
    expect(auditEvent.payload.is_primary).toBe(true);
    const contactId = String(auditEvent.payload.contact_id ?? "");
    mutationMatrix.push({ mutation: "Admin contact create", eventType: "admin_contact_added", payloadChecks: { contact_id: contactId, is_primary: true } });
    expect(evidence.admin_contacts.some((contact) => contact.email === adminEmail && contact.is_primary)).toBeTruthy();

    await openPlatformTab(page, "Admin Access");
    const adminContactsCard = card(page, "Admin contacts");
    await adminContactsCard.locator(".tenant-support-access-row").filter({ hasText: adminEmail }).getByRole("button", { name: "Edit" }).click();
    const editContactForm = adminContactsCard.locator(".platform-contact-edit-form");
    await expect(editContactForm.getByText("Edit contact validation")).toBeVisible();
    await namedControl(editContactForm, "job_title").fill("People Operations Lead");
    await namedControl(editContactForm, "notes").fill(`Edited contact note for ${tenantCode}.`);
    await editContactForm.getByRole("button", { name: "Save contact" }).click();
    await expect(notice(page).getByText("Admin contact updated.", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    auditEvent = expectEvent(evidence, "admin_contact_updated", new RegExp(adminEmail));
    expect(auditEvent.payload.contact_id).toBe(contactId);
    expect(auditEvent.payload.fields).toEqual(expect.arrayContaining(["job_title", "notes"]));
    mutationMatrix.push({ mutation: "Admin contact edit", eventType: "admin_contact_updated", payloadChecks: { contact_id: contactId, field_job_title: "job_title", field_notes: "notes" } });
    expect(evidence.admin_contacts.some((contact) => contact.email === adminEmail && contact.job_title === "People Operations Lead" && contact.notes.includes(tenantCode))).toBeTruthy();

    await openPlatformTab(page, "Admin Access");
    const provisionCard = card(page, "Create tenant admin login");
    await namedControl(provisionCard, "contact_id").selectOption({ label: `${adminName} - ${adminEmail}` });
    await namedControl(provisionCard, "username").fill(`qa.audit.${runRef}`);
    await namedControl(provisionCard, "role_code").selectOption("tenant-admin");
    await namedControl(provisionCard, "role_name").fill("Tenant Admin");
    await namedControl(provisionCard, "password").fill(process.env.PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD ?? "Password@123");
    await namedControl(provisionCard, "must_change_password").setChecked(false);
    await provisionCard.getByRole("button", { name: "Create login access" }).click();
    await expect(notice(page).getByText("First admin provisioned.", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    auditEvent = expectEvent(evidence, "first_admin_provisioned", new RegExp(adminEmail));
    expect(auditEvent.payload.contact_id).toBe(contactId);
    expect(auditEvent.payload.role_code).toBe("tenant-admin");
    expectNoSensitiveData(auditEvent.payload);
    mutationMatrix.push({ mutation: "Tenant admin login provisioning", eventType: "first_admin_provisioned", payloadChecks: { contact_id: contactId, role_code: "tenant-admin", sensitive_data_absent: true } });
    expectChecklist(evidence, "first_admin_provisioned");
    expect(evidence.admin_contacts.some((contact) => contact.email === adminEmail && contact.provisioning_status === "provisioned" && contact.membership_id)).toBeTruthy();

    await openPlatformTab(page, "Setup Templates");
    const adoptCard = card(page, "Apply setup template");
    await selectOptionContaining(namedControl(adoptCard, "policy_pack_id"), packCode);
    await namedControl(adoptCard, "adoption_mode").selectOption("clone_to_tenant_records");
    await namedControl(adoptCard, "notes").fill(`Audit adoption for ${tenantCode}.`);
    await adoptCard.getByRole("button", { name: "Preview impact" }).click();
    await expect(adoptCard.getByText("Impact preview")).toBeVisible();
    await expect(adoptCard.getByText("0 create")).toBeVisible();
    await adoptCard.getByRole("button", { name: "Apply template" }).click();
    await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    auditEvent = expectEvent(evidence, "baseline_published", new RegExp(packCode));
    expect(auditEvent.payload.policy_pack_code).toBe(packCode);
    expect(auditEvent.payload.domain).toBe("leave");
    expect(auditEvent.payload.result_summary).toMatchObject({
      tenant_code: tenantCode,
      policy_pack_code: packCode,
      adoption_mode: "clone_to_tenant_records",
      counts: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0, evidence_only: 0 },
    });
    mutationMatrix.push({ mutation: "Setup template adoption", eventType: "baseline_published", payloadChecks: { policy_pack_code: packCode, adoption_mode: "clone_to_tenant_records", created: 0, updated: 0, skipped: 0 } });
    expectChecklist(evidence, "baseline_published");
    expect(evidence.baseline_published_at).toBeTruthy();

    const eventCountBeforeNoOp = evidence.recent_events.length;
    const noOpUpgrade = await page.request.post(`/api/platform-policy-packs/${auditEvent.payload.policy_pack_id}/upgrade-apply/`, {
      data: { tenant_id: tenantId, notes: "QA no-op audit evidence guard." },
    });
    expect(noOpUpgrade.status()).toBe(400);
    const afterNoOp = await onboardingPayload(page, tenantId ?? "");
    expect(afterNoOp.recent_events.length).toBe(eventCountBeforeNoOp);

    await openPlatformTab(page, "Launch Readiness");
    await card(page, "Launch readiness").getByRole("button", { name: "Mark ready" }).click();
    await page.getByRole("dialog", { name: "Mark customer ready?" }).getByRole("button", { name: "Mark ready" }).click();
    await expect(notice(page).getByText("Mark Handoff Ready", { exact: true })).toBeVisible();
    const repeatHandoff = await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/mark-handoff-ready/`, { data: {} });
    expect(repeatHandoff.ok()).toBeTruthy();
    await card(page, "Launch readiness").getByRole("button", { name: "Activate tenant" }).click();
    await page.getByRole("dialog", { name: "Activate tenant?" }).getByRole("button", { name: "Activate tenant" }).click();
    await expect(notice(page).getByText("Activate", { exact: true })).toBeVisible();
    const repeatActivation = await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/activate/`, { data: {} });
    expect(repeatActivation.status()).toBe(400);
    evidence = await onboardingPayload(page, tenantId ?? "");
    auditEvent = expectEvent(evidence, "handoff_marked_ready", new RegExp(tenantCode));
    expect(auditEvent.payload.primary_contact_id).toBe(contactId);
    mutationMatrix.push({ mutation: "Go-live handoff", eventType: "handoff_marked_ready", payloadChecks: { primary_contact_id: contactId } });
    auditEvent = expectEvent(evidence, "tenant_activated", new RegExp(tenantCode));
    expect(auditEvent.payload.tenant_id).toBe(tenantId);
    expect(auditEvent.payload.tenant_code).toBe(tenantCode);
    expect(auditEvent.payload.tenant_status).toBe("active");
    expect(auditEvent.payload.tenant_onboarding_status).toBe("active");
    expect(auditEvent.payload.activated_by_identifier).toBe("platform.admin");
    mutationMatrix.push({ mutation: "Tenant activation", eventType: "tenant_activated", payloadChecks: { tenant_id: tenantId, tenant_code: tenantCode, tenant_status: "active", tenant_onboarding_status: "active" } });
    expectChecklist(evidence, "handoff_completed");
    expect(evidence.tenant_status).toBe("active");
    expect(evidence.tenant_onboarding_status).toBe("active");
    expect(evidence.handoff_completed_at).toBeTruthy();

    await page.reload();
    await openPlatformTab(page, "Audit Logs");
    const eventsCard = card(page, "Onboarding events");
    for (const { eventType, payloadChecks } of mutationMatrix) {
      await namedControl(eventsCard, "event_search").fill(eventType);
      await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: titleCase(eventType) }).first()).toBeVisible();
      const dialog = await openEventEvidence(page, eventType);
      await expect(dialog).toContainText("platform.admin");
      await expect(dialog).toContainText(tenantCode);
      const payloadText = await dialog.getByLabel("Audit evidence payload").textContent();
      expectNoSensitiveData(payloadText);
      for (const expectedValue of Object.values(payloadChecks)) {
        if (expectedValue && typeof expectedValue !== "boolean") {
          await expect(dialog).toContainText(String(expectedValue));
        }
      }
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toBeHidden();
    }

    await namedControl(eventsCard, "event_search").fill(contactId);
    await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: "Admin Contact" })).toHaveCount(2);
    await namedControl(eventsCard, "event_search").fill("");
    await namedControl(eventsCard, "event_type_filter").selectOption("baseline_published");
    await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: "Baseline Published" })).toHaveCount(1);
    await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: "Tenant Activated" })).toHaveCount(0);
    await namedControl(eventsCard, "event_search").fill("no-such-audit-evidence-row");
    await expect(eventsCard.getByText("No onboarding events match this view.")).toBeVisible();
    await eventsCard.getByRole("button", { name: "Reset filters" }).click();
    await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: "Tenant Activated" })).toBeVisible();

    await openPlatformTab(page, "Tenants");
    await namedControl(card(page, "Tenant pipeline"), "tenant_search").fill(tenantCode);
    await expect(card(page, "Tenant pipeline").locator(".employee-directory-item").filter({ hasText: tenantName })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
