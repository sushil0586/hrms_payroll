import { expect, test, type Page } from "@playwright/test";
import { createServer, type Server, type ServerResponse } from "node:http";

const masterCards = [
  { section: "legal_entities", label: "Legal Entities", add: "Add legal entity" },
  { section: "locations", label: "Locations", add: "Add location" },
  { section: "branches", label: "Branches", add: "Add branch" },
  { section: "business_units", label: "Business Units", add: "Add business unit" },
  { section: "departments", label: "Departments", add: "Add department" },
  { section: "cost_centers", label: "Cost Centers", add: "Add cost center" },
  { section: "grades", label: "Grades", add: "Add grade" },
  { section: "designations", label: "Designations", add: "Add designation" },
  { section: "employment_types", label: "Employment Types", add: "Add employment type" },
];

const mockItems = {
  legal_entities: [
    { id: "legal-entity-1", code: "LE-NORTH", name: "Northstar Foods India", is_active: true, country_code: "IN", timezone: "Asia/Kolkata" },
  ],
  locations: [
    { id: "location-1", code: "LOC-MUM", name: "Mumbai Office", is_active: true, city: "Mumbai", state: "Maharashtra", country_code: "IN" },
  ],
  branches: [
    { id: "branch-1", code: "BR-MUM", name: "Mumbai Branch", is_active: true, legal_entity: "Northstar Foods India", location: "Mumbai Office", branch_type: "Head Office" },
  ],
  business_units: [
    { id: "business-unit-1", code: "BU-OPS", name: "Operations", is_active: true },
  ],
  departments: [
    { id: "department-1", code: "DEP-PEOPLE", name: "People Operations", is_active: true, business_unit: "Operations", business_unit_id: "business-unit-1" },
  ],
  cost_centers: [
    { id: "cost-center-1", code: "CC-OPS", name: "Operations Cost Center", is_active: true, legal_entity: "Northstar Foods India" },
  ],
  grades: [
    { id: "grade-1", code: "GR-L1", name: "Level 1", is_active: true, level: 1 },
  ],
  designations: [
    { id: "designation-1", code: "DES-HR", name: "HR Executive", is_active: true, grade: "Level 1", grade_id: "grade-1" },
  ],
  employment_types: [
    { id: "employment-type-1", code: "ET-FT", name: "Full Time", is_active: true, is_payroll_eligible: true, description: "Payroll eligible" },
  ],
};

function jsonResponse(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function createMockApiServer() {
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:8999");
    const pathname = url.pathname;

    if (pathname === "/api/v1/auth/session/") {
      jsonResponse(response, 200, {
        id: "session-user",
        username: "hr.admin",
        email: "hr.admin@example.test",
        first_name: "HR",
        last_name: "Admin",
        display_name: "HR Admin",
        workspace_access: {
          platform_admin: false,
          tenant_admin: false,
          hr_admin: true,
          ess: true,
          mss: true,
        },
        default_membership: {
          id: "membership-1",
          tenant_id: "tenant-1",
          tenant_code: "accerio-india",
          tenant_name: "Accerio India",
          role_codes: ["hr-admin"],
        },
        effective_permissions: [
          "employees.view",
          "employees.create",
          "employees.edit",
          "employees.import",
          "employees.access.manage",
          "organization.view",
          "organization.manage",
          "documents.view",
          "leave.view",
          "attendance.view",
          "lifecycle.view",
          "payroll.inputs.view",
          "payroll.review",
          "payroll.outputs.view",
          "finance.handoff.view",
          "finance.handoff.create",
          "statutory.setup.view",
          "statutory.declarations.view",
          "statutory.filing.view",
          "reports.catalog.view",
        ],
      });
      return;
    }

    if (pathname === "/api/v1/hr-admin/organization/") {
      jsonResponse(response, 200, {
        summary: {
          legal_entities_count: mockItems.legal_entities.length,
          locations_count: mockItems.locations.length,
          branches_count: mockItems.branches.length,
          business_units_count: mockItems.business_units.length,
          departments_count: mockItems.departments.length,
          cost_centers_count: mockItems.cost_centers.length,
          grades_count: mockItems.grades.length,
          designations_count: mockItems.designations.length,
          employment_types_count: mockItems.employment_types.length,
        },
        ...mockItems,
      });
      return;
    }

    if (pathname === "/api/v1/hr-admin/organization/options/") {
      jsonResponse(response, 200, {
        legal_entities: mockItems.legal_entities.map(({ id, name }) => ({ id, name })),
        locations: mockItems.locations.map(({ id, name }) => ({ id, name })),
        business_units: mockItems.business_units.map(({ id, name }) => ({ id, name })),
        departments: mockItems.departments.map(({ id, name }) => ({ id, name })),
        grades: mockItems.grades.map(({ id, name }) => ({ id, name })),
      });
      return;
    }

    const organizationMatch = pathname.match(/^\/api\/v1\/hr-admin\/organization\/([^/]+)\/([^/]+)\/$/);
    if (organizationMatch) {
      const [, section, itemId] = organizationMatch;
      const items = mockItems[section as keyof typeof mockItems] ?? [];
      jsonResponse(response, 200, items.find((item) => item.id === itemId) ?? items[0] ?? {});
      return;
    }

    jsonResponse(response, 404, { detail: "Mock endpoint not found." });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
}

test.describe("HR Admin organization masters", () => {
  test.describe.configure({ mode: "serial" });

  let mockApiServer: Server;

  test.beforeAll(async () => {
    mockApiServer = createMockApiServer();
    await new Promise<void>((resolve) => mockApiServer.listen(8999, "127.0.0.1", resolve));
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      mockApiServer.close((error) => (error ? reject(error) : resolve()));
    });
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "hrms_access_token",
        value: "playwright-token",
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  });

  test("shows a friendly master-data library with working manage and add routes", async ({ page }) => {
    await page.goto("/hr-admin/organization");

    await expect(page.getByRole("heading", { name: "Organization masters", exact: true })).toBeVisible();
    await expect(page.getByText("Master data library")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Maintain every organization master from one place" })).toBeVisible();

    for (const master of masterCards) {
      const card = page.locator(".organization-master-card", { has: page.getByRole("heading", { name: master.label }) });
      await expect(card).toBeVisible();
      await expect(card.getByRole("link", { name: "Manage" })).toHaveAttribute("href", new RegExp(`section=${master.section}`));
      await expect(card.getByRole("link", { name: master.add })).toHaveAttribute("href", `/hr-admin/organization/${master.section}/new`);
    }

    await page.locator(".organization-master-card", { has: page.getByRole("heading", { name: "Employment Types" }) }).getByRole("link", { name: "Manage" }).click();
    await expect(page).toHaveURL(/section=employment_types/);
    await expect(page.locator(".filter-chip-link--active", { hasText: "Employment Types" })).toBeVisible();

    await page.locator(".organization-master-card", { has: page.getByRole("heading", { name: "Departments" }) }).getByRole("link", { name: "Add department" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/organization\/departments\/new$/);
    await expect(page.getByRole("heading", { name: "Create department", exact: true })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test("submits the guided setup in dependency order without relying on CSV", async ({ page }) => {
    const requests: Array<{ section: string; body: Record<string, unknown> }> = [];
    const idsBySection = new Map<string, string>();

    await page.route("**/api/hr-admin/organization/*", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      const section = route.request().url().split("/api/hr-admin/organization/")[1]?.split(/[/?#]/)[0] ?? "";
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const id = `created-${section}`;
      idsBySection.set(section, id);
      requests.push({ section, body });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id,
          code: body.code,
          name: body.name,
          is_active: body.is_active,
        }),
      });
    });

    await page.goto("/hr-admin/organization");
    await expect(page.getByText("Guided setup")).toBeVisible();

    await page.locator('input[value="BU-OPS"]').fill("BU-ACCERIO-OPS");
    await page.locator('input[value="DEP-PEOPLE"]').fill("DEP-ACCERIO-PEOPLE");
    await page.locator('input[value="ET-FT"]').fill("ET-ACCERIO-FT");
    await page.getByRole("button", { name: "Save organization setup" }).click();

    await expect.poll(() => requests.length).toBe(6);
    expect(requests.map((request) => request.section)).toEqual([
      "legal_entities",
      "locations",
      "branches",
      "business_units",
      "departments",
      "employment_types",
    ]);
    expect(requests[0].body).toMatchObject({
      code: "LE-ACCERIO-IN",
      name: "Accerio India",
      country_code: "IN",
      timezone: "Asia/Kolkata",
      is_active: true,
    });
    expect(requests[2].body).toMatchObject({
      code: "BR-INDORE",
      legal_entity_id: idsBySection.get("legal_entities"),
      location_id: idsBySection.get("locations"),
      is_active: true,
    });
    expect(requests[4].body).toMatchObject({
      code: "DEP-ACCERIO-PEOPLE",
      business_unit_id: idsBySection.get("business_units"),
      is_active: true,
    });
    expect(requests[5].body).toMatchObject({
      code: "ET-ACCERIO-FT",
      is_payroll_eligible: true,
      is_active: true,
    });

    await expect(page.getByText("Organization setup saved. Refreshing the catalog and launch readiness.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("supports single-record creation from an add form", async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];

    await page.route("**/api/hr-admin/organization/departments", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      const body = route.request().postDataJSON() as Record<string, unknown>;
      requests.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "department-created",
          ...body,
        }),
      });
    });

    await page.goto("/hr-admin/organization/departments/new");
    await expect(page.getByRole("heading", { name: "Create department", exact: true })).toBeVisible();

    await page.getByLabel("Code").fill("DEP-FIN");
    await page.getByLabel("Name").fill("Finance");
    await page.getByLabel("Business unit").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Create department" }).click();

    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toMatchObject({
      code: "DEP-FIN",
      name: "Finance",
      is_active: true,
    });
    expect(requests[0].business_unit_id).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/organization\?section=departments/);
  });
});
