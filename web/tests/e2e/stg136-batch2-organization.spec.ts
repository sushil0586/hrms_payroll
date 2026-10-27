import { appendFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type Item = { id: string; code: string; name: string; is_active: boolean; [key: string]: unknown };

const suffix = process.env.STG136_BATCH2_RUN_REF ?? Date.now().toString(36);
const evidencePath = process.env.STG136_BATCH2_EVIDENCE_PATH;
const created: Record<string, Item> = {};

function record(scenarioId: string, evidence: Record<string, unknown>) {
  if (!evidencePath) return;
  appendFileSync(evidencePath, `${JSON.stringify({ scenario_id: scenarioId, recorded_at: new Date().toISOString(), ...evidence })}\n`, { mode: 0o600 });
}

function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: false }).first();
}

async function api(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const base = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8020/api/v1";
  const response = await page.request.fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Token ${token}`, ...(data === undefined ? {} : { "content-type": "application/json" }) },
    data,
  });
  return { response, payload: await response.json().catch(() => ({})) };
}

async function create(page: Page, section: string, singular: string, code: string, name: string, extra: Record<string, string> = {}) {
  await gotoAuthenticated(page, `/hr-admin/organization/${section}/new`, hrAdmin);
  await expectPageReady(page, new RegExp(`Create ${singular}`, "i"));
  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);
  for (const [label, value] of Object.entries(extra)) {
    const control = field(page, label);
    if (await control.evaluate((element) => element.tagName === "SELECT")) await control.selectOption({ label: value });
    else await control.fill(value);
  }
  const responsePromise = page.waitForResponse((response) => response.url().includes(`/api/hr-admin/organization/${section}`) && response.request().method() === "POST");
  await page.getByRole("button", { name: `Create ${singular.toLowerCase()}` }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  await expect(page).toHaveURL(new RegExp(`section=${section}`));
  const snapshot = await api(page, "/hr-admin/organization/");
  expect(snapshot.response.status()).toBe(200);
  const item = (snapshot.payload[section] as Item[]).find((candidate) => candidate.code === code);
  expect(item, `Created ${section} item ${code} was not returned by the independent API snapshot.`).toBeTruthy();
  created[code] = item!;
  return item!;
}

async function detail(page: Page, section: string, id: string) {
  const result = await api(page, `/hr-admin/organization/${section}/${id}/`);
  expect(result.response.status()).toBe(200);
  return result.payload as Item;
}

test.describe.serial("STG-136 Batch 2 real organization certification", () => {
  test.setTimeout(180_000);

  test("STG-E2E-0201 creates and edits a legal entity", async ({ page }) => {
    const code = `stg2-le-${suffix}`;
    const item = await create(page, "legal_entities", "Legal Entity", code, `STG2 Legal Entity ${suffix}`, {
      "Registered name": `STG2 Legal Entity ${suffix} Pvt Ltd`, "Country code": "IN", Timezone: "Asia/Kolkata",
    });
    await gotoAuthenticated(page, `/hr-admin/organization/legal_entities/${item.id}/edit`, hrAdmin);
    await field(page, "Name").fill(`STG2 Legal Entity Updated ${suffix}`);
    const responsePromise = page.waitForResponse((response) => response.url().includes(`/api/hr-admin/organization/legal_entities/${item.id}`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await responsePromise).status()).toBe(200);
    const persisted = await detail(page, "legal_entities", item.id);
    expect(persisted.name).toBe(`STG2 Legal Entity Updated ${suffix}`);
    item.name = persisted.name;
    record("STG-E2E-0201", { resources: [{ type: "legal_entity", id: item.id, code }], api: "created_and_updated" });
  });

  test("STG-E2E-0202 creates a location and branch with legal-entity ownership", async ({ page }) => {
    const location = await create(page, "locations", "Location", `stg2-loc-${suffix}`, `STG2 Location ${suffix}`, { City: "Pune", State: "Maharashtra", "Country code": "IN" });
    const legalEntity = created[`stg2-le-${suffix}`];
    const branch = await create(page, "branches", "Branch", `stg2-br-${suffix}`, `STG2 Branch ${suffix}`, {
      "Legal entity": legalEntity.name, Location: location.name, "Branch type": "Regional Office",
    });
    const persisted = await detail(page, "branches", branch.id);
    expect(persisted.legal_entity_id).toBe(legalEntity.id);
    expect(persisted.location_id).toBe(location.id);
    record("STG-E2E-0202", { resources: [{ type: "location", id: location.id }, { type: "branch", id: branch.id }], ownership: persisted.legal_entity_id });
  });

  test("STG-E2E-0203 creates business unit and department in dependency order", async ({ page }) => {
    const unit = await create(page, "business_units", "Business Unit", `stg2-bu-${suffix}`, `STG2 Business Unit ${suffix}`);
    const department = await create(page, "departments", "Department", `stg2-dep-${suffix}`, `STG2 Department ${suffix}`, { "Business unit": unit.name });
    expect((await detail(page, "departments", department.id)).business_unit_id).toBe(unit.id);
    record("STG-E2E-0203", { resources: [{ type: "business_unit", id: unit.id }, { type: "department", id: department.id }] });
  });

  test("STG-E2E-0204 creates payroll-relevant organization masters", async ({ page }) => {
    const legalEntity = created[`stg2-le-${suffix}`];
    const costCenter = await create(page, "cost_centers", "Cost Center", `stg2-cc-${suffix}`, `STG2 Cost Center ${suffix}`, { "Legal entity": legalEntity.name });
    const grade = await create(page, "grades", "Grade", `stg2-gr-${suffix}`, `STG2 Grade ${suffix}`, { Level: "4" });
    const designation = await create(page, "designations", "Designation", `stg2-des-${suffix}`, `STG2 Designation ${suffix}`, { Grade: grade.name });
    const employmentType = await create(page, "employment_types", "Employment Type", `stg2-et-${suffix}`, `STG2 Employment Type ${suffix}`, { Description: "Synthetic payroll-eligible worker", "Payroll eligibility": "Payroll eligible" });
    expect((await detail(page, "cost_centers", costCenter.id)).legal_entity_id).toBe(legalEntity.id);
    expect((await detail(page, "designations", designation.id)).grade_id).toBe(grade.id);
    expect((await detail(page, "employment_types", employmentType.id)).is_payroll_eligible).toBe(true);
    record("STG-E2E-0204", { resources: [costCenter.id, grade.id, designation.id, employmentType.id] });
  });

  test("STG-E2E-0205 rejects duplicate organization codes", async ({ page }) => {
    const code = `stg2-dep-${suffix}`;
    const unit = created[`stg2-bu-${suffix}`];
    await gotoAuthenticated(page, "/hr-admin/organization/departments/new", hrAdmin);
    await field(page, "Code").fill(code.toUpperCase());
    await field(page, "Name").fill("Duplicate Department");
    await field(page, "Business unit").selectOption({ label: unit.name });
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/hr-admin/organization/departments") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create department" }).click();
    expect((await responsePromise).status()).toBe(400);
    await expect(page.getByText("This code is already in use.").first()).toBeVisible();
    expect((await api(page, `/hr-admin/organization/`)).payload.departments.filter((item: Item) => item.code.toLowerCase() === code).length).toBe(1);
    record("STG-E2E-0205", { duplicate_code: code, result: "rejected_without_duplicate" });
  });

  test("STG-E2E-0206 rejects an indirect hierarchy cycle", async ({ page }) => {
    const parent = await create(page, "business_units", "Business Unit", `stg2-parent-${suffix}`, `STG2 Parent ${suffix}`);
    const child = await create(page, "business_units", "Business Unit", `stg2-child-${suffix}`, `STG2 Child ${suffix}`, { "Parent business unit": parent.name });
    await gotoAuthenticated(page, `/hr-admin/organization/business_units/${parent.id}/edit`, hrAdmin);
    await field(page, "Parent business unit").selectOption({ label: child.name });
    const responsePromise = page.waitForResponse((response) => response.url().includes(`/api/hr-admin/organization/business_units/${parent.id}`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await responsePromise).status()).toBe(400);
    await expect(page.getByText(/hierarchy cycle/).first()).toBeVisible();
    expect((await detail(page, "business_units", parent.id)).parent_id).toBeNull();
    record("STG-E2E-0206", { parent_id: parent.id, child_id: child.id, result: "cycle_rejected" });
  });

  test("STG-E2E-0207 rejects cross-tenant and unauthorized references", async ({ page }) => {
    const foreignId = process.env.STG136_BATCH2_FOREIGN_LEGAL_ENTITY_ID;
    expect(foreignId).toBeTruthy();
    await gotoAuthenticated(page, "/hr-admin/organization/branches/new", hrAdmin);
    await expect(field(page, "Legal entity").locator(`option[value='${foreignId}']`)).toHaveCount(0);
    const denied = await api(page, "/hr-admin/organization/branches/", "POST", { code: `stg2-cross-${suffix}`, name: "Cross Tenant Branch", legal_entity_id: foreignId, is_active: true });
    expect(denied.response.status()).toBe(400);
    expect(JSON.stringify(denied.payload)).toContain("Invalid selection");
    await gotoAuthenticated(page, "/ess", employee);
    const unauthorized = await api(page, "/hr-admin/organization/legal_entities/", "POST", { code: `stg2-unauth-${suffix}`, name: "Unauthorized", is_active: true });
    expect(unauthorized.response.status()).toBe(403);
    record("STG-E2E-0207", { foreign_legal_entity_id: foreignId, cross_tenant_status: 400, unauthorized_status: 403 });
  });

  test("STG-E2E-0208 archives unused data and protects referenced history", async ({ page }) => {
    const unused = await create(page, "locations", "Location", `stg2-archive-${suffix}`, `STG2 Archive Location ${suffix}`, { City: "Pune", State: "Maharashtra", "Country code": "IN" });
    await gotoAuthenticated(page, `/hr-admin/organization/locations/${unused.id}/edit`, hrAdmin);
    await field(page, "Active").selectOption("false");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/section=locations/);
    expect((await detail(page, "locations", unused.id)).is_active).toBe(false);

    const protectedEntityId = process.env.STG136_BATCH2_REFERENCED_LEGAL_ENTITY_ID;
    expect(protectedEntityId).toBeTruthy();
    await gotoAuthenticated(page, `/hr-admin/organization/legal_entities/${protectedEntityId}/edit`, hrAdmin);
    await field(page, "Active").selectOption("false");
    const responsePromise = page.waitForResponse((response) => response.url().includes(`/api/hr-admin/organization/legal_entities/${protectedEntityId}`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await responsePromise).status()).toBe(400);
    await expect(page.getByText(/Cannot deactivate.*linked employees/).first()).toBeVisible();
    expect((await detail(page, "legal_entities", protectedEntityId!)).is_active).toBe(true);
    record("STG-E2E-0208", { archived_location_id: unused.id, protected_legal_entity_id: protectedEntityId, result: "history_protected" });
  });
});
