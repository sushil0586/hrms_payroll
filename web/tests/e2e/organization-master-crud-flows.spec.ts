import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type SectionKey =
  | "legal_entities"
  | "locations"
  | "branches"
  | "business_units"
  | "departments"
  | "cost_centers"
  | "grades"
  | "designations"
  | "employment_types";

type CreatedRecord = {
  code: string;
  name: string;
  editHref: string;
  id: string;
};

type SectionConfig = {
  key: SectionKey;
  singular: string;
  listLabel: string;
  formSections: string[];
  fields: string[];
  fill: (page: Page, code: string, name: string, created: Partial<Record<SectionKey, CreatedRecord>>) => Promise<void>;
  edit: (page: Page, updatedName: string, created: Partial<Record<SectionKey, CreatedRecord>>) => Promise<void>;
  detailLabels: string[];
};

const runSuffix = Date.now().toString(36);

function codeFor(section: SectionKey, intent: "main" | "archive") {
  const prefix: Record<SectionKey, string> = {
    legal_entities: "le",
    locations: "loc",
    branches: "br",
    business_units: "bu",
    departments: "dep",
    cost_centers: "cc",
    grades: "gr",
    designations: "des",
    employment_types: "et",
  };
  return `pw-${prefix[section]}-${intent}-${runSuffix}`;
}

function prerequisiteCode(section: SectionKey, dependent: SectionKey) {
  const prefix: Record<SectionKey, string> = {
    legal_entities: "le",
    locations: "loc",
    branches: "br",
    business_units: "bu",
    departments: "dep",
    cost_centers: "cc",
    grades: "gr",
    designations: "des",
    employment_types: "et",
  };
  return `pw-${prefix[section]}-pre-${prefix[dependent]}-${runSuffix}`;
}

async function expectNativeRequired(field: Locator) {
  await expect
    .poll(async () => field.evaluate((element) => (element as HTMLInputElement | HTMLSelectElement).validity.valueMissing))
    .toBe(true);
}

function field(page: Page, label: string) {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

async function expectFields(page: Page, labels: string[]) {
  for (const label of labels) {
    await expect(field(page, label)).toBeVisible();
  }
}

async function selectByCreatedName(page: Page, label: string, record: CreatedRecord | undefined) {
  expect(record, `${label} prerequisite should exist`).toBeTruthy();
  const select = field(page, label);
  await expect(select).toBeVisible();
  await select.selectOption({ label: record!.name });
  await expect(select).not.toHaveValue("");
}

async function expectOrganizationListPage(page: Page, section: SectionConfig, code: string, name: string) {
  await gotoAuthenticated(page, `/hr-admin/organization?section=${section.key}&q=${encodeURIComponent(code)}&status=all`);
  await expectPageReady(page, "Organization setup review for the structural backbone of the HRMS.");
  await expect(page.getByRole("heading", { name: "Structure catalog" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(section.listLabel) })).toBeVisible();
  await expect(field(page, "Search")).toHaveValue(code);
  await expect(field(page, "Status")).toHaveValue("all");
  await expect(page.getByRole("link", { name: /All/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Active/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Inactive/ })).toBeVisible();
  await expect(page.locator(".employee-directory-item").filter({ hasText: code }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: `${name} detail` })).toBeVisible();
  for (const label of section.detailLabels) {
    await expect(page.locator(".detail-row").filter({ hasText: label }).first()).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

async function openEditForCode(page: Page, section: SectionConfig, code: string) {
  await gotoAuthenticated(page, `/hr-admin/organization?section=${section.key}&q=${encodeURIComponent(code)}&status=all`);
  await expectPageReady(page, "Organization setup review for the structural backbone of the HRMS.");
  const editLink = page.locator(".employee-directory-item").filter({ hasText: code }).getByRole("link", { name: "Edit" }).first();
  await expect(editLink).toBeVisible();
  const href = await editLink.getAttribute("href");
  expect(href).toBeTruthy();
  await editLink.click();
  if (!page.url().includes("/edit")) {
    await gotoAuthenticated(page, href!);
  }
  await expectPageReady(page, new RegExp(`Edit ${section.singular}`, "i"));
  return href!;
}

async function submitCreate(page: Page, section: SectionConfig) {
  await page.getByRole("button", { name: `Create ${section.singular.toLowerCase()}` }).click();
}

async function submitSave(page: Page) {
  await page.getByRole("button", { name: "Save changes" }).click();
}

async function createRecord(
  page: Page,
  section: SectionConfig,
  code: string,
  name: string,
  created: Partial<Record<SectionKey, CreatedRecord>>,
) {
  await gotoAuthenticated(page, `/hr-admin/organization/${section.key}/new`);
  await expectPageReady(page, new RegExp(`Create ${section.singular}`, "i"));
  await expect(page.getByRole("heading", { name: "Core identity" })).toBeVisible();
  for (const formSection of section.formSections) {
    await expect(page.getByRole("heading", { name: formSection })).toBeVisible();
  }
  await expectFields(page, section.fields);
  await expect(page.getByRole("button", { name: `Create ${section.singular.toLowerCase()}` })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeEnabled();

  await submitCreate(page, section);
  await expectNativeRequired(field(page, "Code"));
  await expectNativeRequired(field(page, "Name"));

  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);
  await field(page, "Active").selectOption("true");
  await section.fill(page, code, name, created);
  await expectNoHorizontalOverflow(page);
  await submitCreate(page, section);
  await expect(page).toHaveURL(new RegExp(`/hr-admin/organization\\?section=${section.key}`), { timeout: 20_000 });

  await expectOrganizationListPage(page, section, code, name);
  const editHref = await openEditForCode(page, section, code);
  const id = editHref.match(new RegExp(`/hr-admin/organization/${section.key}/([^/]+)/edit`))?.[1] ?? "";
  expect(id).not.toBe("");
  return { code, name, editHref, id };
}

async function expectDuplicateRejected(
  page: Page,
  section: SectionConfig,
  existing: CreatedRecord,
  created: Partial<Record<SectionKey, CreatedRecord>>,
) {
  await gotoAuthenticated(page, `/hr-admin/organization/${section.key}/new`);
  await expectPageReady(page, new RegExp(`Create ${section.singular}`, "i"));
  await field(page, "Code").fill(existing.code);
  await field(page, "Name").fill(`${existing.name} Duplicate`);
  await field(page, "Active").selectOption("true");
  await section.fill(page, existing.code, `${existing.name} Duplicate`, created);
  await submitCreate(page, section);
  await expect(page.getByText("Save failed.")).toBeVisible();
  await expect(page.getByText("This code is already in use.").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function editRecord(
  page: Page,
  section: SectionConfig,
  record: CreatedRecord,
  created: Partial<Record<SectionKey, CreatedRecord>>,
) {
  await openEditForCode(page, section, record.code);
  await expect(field(page, "Code")).toHaveValue(record.code);
  await expect(field(page, "Name")).toHaveValue(record.name);
  await expectFields(page, section.fields);

  const updatedName = `${record.name} Updated`;
  await field(page, "Name").fill(updatedName);
  await section.edit(page, updatedName, created);
  await submitSave(page);
  await expect(page).toHaveURL(new RegExp(`/hr-admin/organization\\?section=${section.key}`), { timeout: 20_000 });
  await expectOrganizationListPage(page, section, record.code, updatedName);
  record.name = updatedName;
}

async function deactivateRecord(page: Page, section: SectionConfig, record: CreatedRecord) {
  await openEditForCode(page, section, record.code);
  await field(page, "Active").selectOption("false");
  await expect(field(page, "Active")).toHaveValue("false");
  await submitSave(page);
  await expect(page).toHaveURL(new RegExp(`/hr-admin/organization\\?section=${section.key}`), { timeout: 20_000 });

  await gotoAuthenticated(page, `/hr-admin/organization?section=${section.key}&q=${encodeURIComponent(record.code)}&status=inactive`);
  await expectPageReady(page, "Organization setup review for the structural backbone of the HRMS.");
  await expect(page.locator(".employee-directory-item").filter({ hasText: record.code }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: `${record.name} detail` })).toBeVisible();
  await expect(page.locator(".detail-row").filter({ hasText: "Status" }).filter({ hasText: "inactive" })).toBeVisible();

  await gotoAuthenticated(page, `/hr-admin/organization?section=${section.key}&q=${encodeURIComponent(record.code)}&status=active`);
  await expectPageReady(page, "Organization setup review for the structural backbone of the HRMS.");
  await expect(page.locator(".employee-directory-item").filter({ hasText: record.code })).toHaveCount(0);
  await expect(page.getByText("No items match this review state.")).toBeVisible();
}

const sections: SectionConfig[] = [
  {
    key: "legal_entities",
    singular: "Legal Entity",
    listLabel: "Legal Entities",
    formSections: ["Legal entity details"],
    fields: ["Code", "Name", "Active", "Registered name", "Country code", "Timezone", "Primary email", "Primary phone"],
    detailLabels: ["Name", "Code", "Status", "Registered Name", "Country Code", "Timezone", "Primary Email", "Primary Phone", "Cost Centers Using This Entity"],
    async fill(page, code, name) {
      await field(page, "Registered name").fill(`${name} Pvt Ltd`);
      await field(page, "Country code").fill("IN");
      await field(page, "Timezone").fill("Asia/Kolkata");
      await field(page, "Primary email").fill(`${code}@example.com`);
      await field(page, "Primary phone").fill("+91 9876543210");
    },
    async edit(page) {
      await field(page, "Primary phone").fill("+91 9876543211");
    },
  },
  {
    key: "locations",
    singular: "Location",
    listLabel: "Locations",
    formSections: ["Location details"],
    fields: ["Code", "Name", "Active", "Address line 1", "Address line 2", "City", "State", "Postal code", "Country code"],
    detailLabels: ["Name", "Code", "Status", "Address Line 1", "Address Line 2", "City", "State", "Postal Code", "Country Code"],
    async fill(page) {
      await field(page, "Address line 1").fill("Phase 1B QA Park");
      await field(page, "Address line 2").fill("Tower A");
      await field(page, "City").fill("Bengaluru");
      await field(page, "State").fill("Karnataka");
      await field(page, "Postal code").fill("560001");
      await field(page, "Country code").fill("IN");
    },
    async edit(page) {
      await field(page, "City").fill("Pune");
      await field(page, "State").fill("Maharashtra");
    },
  },
  {
    key: "branches",
    singular: "Branch",
    listLabel: "Branches",
    formSections: ["Branch mapping"],
    fields: ["Code", "Name", "Active", "Legal entity", "Location", "Branch type"],
    detailLabels: ["Name", "Code", "Status", "Legal Entity", "Location", "Branch Type"],
    async fill(page, _code, _name, created) {
      await selectByCreatedName(page, "Legal entity", created.legal_entities);
      await selectByCreatedName(page, "Location", created.locations);
      await field(page, "Branch type").fill("Regional Office");
    },
    async edit(page) {
      await field(page, "Branch type").fill("Payroll Hub");
    },
  },
  {
    key: "business_units",
    singular: "Business Unit",
    listLabel: "Business Units",
    formSections: ["Business unit hierarchy"],
    fields: ["Code", "Name", "Active", "Parent business unit"],
    detailLabels: ["Name", "Code", "Status", "Parent Business Unit", "Linked Employees", "Child Business Units", "Departments In This Unit"],
    async fill(page) {
      await expect(field(page, "Parent business unit")).toBeVisible();
    },
    async edit(page) {
      await expect(field(page, "Parent business unit")).toBeVisible();
    },
  },
  {
    key: "departments",
    singular: "Department",
    listLabel: "Departments",
    formSections: ["Department hierarchy"],
    fields: ["Code", "Name", "Active", "Business unit", "Parent department"],
    detailLabels: ["Name", "Code", "Status", "Business Unit", "Parent Department", "Linked Employees", "Child Departments"],
    async fill(page, _code, _name, created) {
      await selectByCreatedName(page, "Business unit", created.business_units);
      await expect(field(page, "Parent department")).toBeVisible();
    },
    async edit(page) {
      await expect(field(page, "Parent department")).toBeVisible();
    },
  },
  {
    key: "cost_centers",
    singular: "Cost Center",
    listLabel: "Cost Centers",
    formSections: ["Cost center mapping"],
    fields: ["Code", "Name", "Active", "Legal entity"],
    detailLabels: ["Name", "Code", "Status", "Legal Entity", "Linked Employees"],
    async fill(page, _code, _name, created) {
      await selectByCreatedName(page, "Legal entity", created.legal_entities);
    },
    async edit(page, _updatedName, created) {
      await selectByCreatedName(page, "Legal entity", created.legal_entities);
    },
  },
  {
    key: "grades",
    singular: "Grade",
    listLabel: "Grades",
    formSections: ["Grade level"],
    fields: ["Code", "Name", "Active", "Level"],
    detailLabels: ["Name", "Code", "Status", "Level", "Linked Employees", "Designations In This Grade"],
    async fill(page) {
      await field(page, "Level").fill("0");
      await page.getByRole("button", { name: "Create grade" }).click();
      await expect(page.getByText("Save failed.")).toBeVisible();
      await expect(page.getByText("Level must be 1 or higher.").first()).toBeVisible();
      await field(page, "Level").fill("3");
    },
    async edit(page) {
      await field(page, "Level").fill("4");
    },
  },
  {
    key: "designations",
    singular: "Designation",
    listLabel: "Designations",
    formSections: ["Designation mapping"],
    fields: ["Code", "Name", "Active", "Grade"],
    detailLabels: ["Name", "Code", "Status", "Grade", "Linked Employees"],
    async fill(page, _code, _name, created) {
      await selectByCreatedName(page, "Grade", created.grades);
    },
    async edit(page, _updatedName, created) {
      await selectByCreatedName(page, "Grade", created.grades);
    },
  },
  {
    key: "employment_types",
    singular: "Employment Type",
    listLabel: "Employment Types",
    formSections: ["Employment type behavior"],
    fields: ["Code", "Name", "Active", "Description", "Payroll eligibility"],
    detailLabels: ["Name", "Code", "Status", "Description", "Payroll Eligibility", "Linked Employees"],
    async fill(page) {
      await field(page, "Description").fill("Phase 1B browser-created employment type.");
      await field(page, "Payroll eligibility").selectOption("true");
    },
    async edit(page) {
      await field(page, "Description").fill("Phase 1B updated employment type.");
      await field(page, "Payroll eligibility").selectOption("false");
    },
  },
];

function sectionConfig(key: SectionKey) {
  const section = sections.find((item) => item.key === key);
  expect(section, `${key} section config should exist`).toBeTruthy();
  return section!;
}

async function ensurePrerequisitesForSection(
  page: Page,
  section: SectionConfig,
  created: Partial<Record<SectionKey, CreatedRecord>>,
) {
  async function ensure(key: SectionKey) {
    if (created[key]) {
      return;
    }
    const prerequisite = sectionConfig(key);
    const code = prerequisiteCode(key, section.key);
    const name = `PW Prereq ${prerequisite.singular} ${section.singular} ${runSuffix}`;
    created[key] = await createRecord(page, prerequisite, code, name, created);
  }

  if (section.key === "branches") {
    await ensure("legal_entities");
    await ensure("locations");
  }
  if (section.key === "departments") {
    await ensure("business_units");
  }
  if (section.key === "cost_centers") {
    await ensure("legal_entities");
  }
  if (section.key === "designations") {
    await ensure("grades");
  }
}

async function runSectionCrud(page: Page, section: SectionConfig) {
  const created: Partial<Record<SectionKey, CreatedRecord>> = {};
  await ensurePrerequisitesForSection(page, section, created);

  const code = codeFor(section.key, "main");
  const name = `PW Test ${section.singular} ${runSuffix}`;
  created[section.key] = await createRecord(page, section, code, name, created);
  await expectDuplicateRejected(page, section, created[section.key]!, created);
  await editRecord(page, section, created[section.key]!, created);

  const archiveCode = codeFor(section.key, "archive");
  const archiveName = `PW Archive ${section.singular} ${runSuffix}`;
  const archiveRecord = await createRecord(page, section, archiveCode, archiveName, created);
  await deactivateRecord(page, section, archiveRecord);
}

test.describe("HR admin organization master CRUD", () => {
  for (const section of sections) {
    test(`${section.singular} page supports granular browser CRUD`, async ({ page }) => {
      test.setTimeout(5 * 60 * 1000);
      await runSectionCrud(page, section);
    });
  }

  test("employee structural mapping uses organization masters as dependent dropdown sources", async ({ page }) => {
    test.setTimeout(15 * 60 * 1000);
    const created: Partial<Record<SectionKey, CreatedRecord>> = {};

    for (const section of sections) {
      const code = `pw-map-${section.key.slice(0, 3)}-${runSuffix}`;
      const name = `PW Mapping ${section.singular} ${runSuffix}`;
      created[section.key] = await createRecord(page, section, code, name, created);
    }

    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await expectPageReady(page, "Create employee");
    await expect(page.getByRole("heading", { name: "Structural mapping" })).toBeVisible();

    await field(page, "Legal entity").selectOption({ label: created.legal_entities!.name });
    await expect(field(page, "Branch").locator("option", { hasText: created.branches!.name })).toHaveCount(1);
    await expect(field(page, "Cost center").locator("option", { hasText: created.cost_centers!.name })).toHaveCount(1);

    await field(page, "Branch").selectOption({ label: created.branches!.name });
    await expect(field(page, "Location")).toHaveValue(created.locations!.id);

    await field(page, "Department").selectOption({ label: created.departments!.name });
    await expect(field(page, "Business unit")).toHaveValue(created.business_units!.id);

    await field(page, "Designation").selectOption({ label: created.designations!.name });
    await expect(field(page, "Grade")).toHaveValue(created.grades!.id);

    await field(page, "Employment type").selectOption({ label: created.employment_types!.name });
    await expect(field(page, "Employment type")).toHaveValue(created.employment_types!.id);
    await expectNoHorizontalOverflow(page);
  });
});
