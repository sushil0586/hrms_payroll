import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Locator, label: string) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .first();
}

async function expectFields(scope: Locator, labels: string[]) {
  for (const label of labels) {
    await expect(field(scope, label)).toBeVisible();
  }
}

async function expectOptions(scope: Locator, label: string, minimum = 1) {
  const count = await field(scope, label).evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(count).toBeGreaterThanOrEqual(minimum);
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

test.describe("HR admin payroll statutory flows", () => {
  test("statutory workspace exposes packs, registrations, filings, proof review, and live source trail", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory");
    await expectPageReady(page, "Payroll Statutory");

    for (const link of ["Calculations", "Handoff", "Rule catalog"]) {
      await expect(page.getByRole("link", { name: link, exact: true })).toBeVisible();
    }

    for (const metric of ["Active Packs", "Components", "Profiles", "Registrations", "Due Filings", "Declarations", "Locked", "Proofs Verified"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).or(page.locator(".metric-tile-soft").filter({ hasText: metric })).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Proof review queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Declarations and proof evidence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "TDS e-file report" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Registration coverage" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upcoming filing obligations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Statutory component catalog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Statutory setup controls" })).toBeVisible();
    const tdsReport = page.getByTestId("tds-compliance-report");
    await expect(tdsReport).toBeVisible();
    for (const text of [
      "Return profile",
      "Deductee coverage",
      "Form reference",
      "FVU profile",
      "Challan mapping",
      "Provider route",
      "PAN ready",
      "TDS component",
      "Form 24Q calendar",
      "Production filing guard",
    ]) {
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    }
    await expect(tdsReport.getByText(/Ready|Needs setup/).first()).toBeVisible();
    for (const header of ["Employee", "Year", "Status", "Tax Regime", "Declared", "Verified", "Proofs"]) {
      await expect(page.getByRole("columnheader", { name: header }).first()).toBeVisible();
    }
    await expect(page.getByText("Locked").or(page.getByText("Verified")).or(page.getByText("No statutory")).first()).toBeVisible();

    const declarationLink = page.locator("main a[href*='declarationId=']").first();
    if (await declarationLink.isVisible().catch(() => false)) {
      await declarationLink.click();
      await expect(page).toHaveURL(/declarationId=/);
      await expect(page.getByText("Proof").or(page.getByText("Submitted")).or(page.getByText("Source")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("statutory setup browser CRUD covers configuration, employee declarations, and proof actions", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory");
    await expectPageReady(page, "Payroll Statutory");

    const packForm = page.getByTestId("statutory-pack-form");
    const componentForm = page.getByTestId("statutory-component-form");
    const slabForm = page.getByTestId("statutory-slab-form");
    const registrationForm = page.getByTestId("statutory-registration-form");
    const filingForm = page.getByTestId("statutory-filing-form");
    const profileForm = page.getByTestId("statutory-profile-form");
    const declarationForm = page.getByTestId("statutory-declaration-form");
    const itemForm = page.getByTestId("statutory-declaration-item-form");

    await expectFields(packForm, [
      "Code",
      "Name",
      "Country code",
      "Jurisdiction reference",
      "Status",
      "Effective from",
      "Effective to",
      "Currency code",
      "Statutory profile reference",
      "Validation profile reference",
      "Config profile reference",
    ]);
    await expectOptions(packForm, "Status");
    const packCode = uniqueCode("STAT_PACK");
    const packResult = await submitAndCapture<{ id: string; code: string; name: string }>(page, "payroll-statutory-packs", "POST", async () => {
      await field(packForm, "Code").fill(packCode);
      await field(packForm, "Name").fill(`Browser ${packCode}`);
      await field(packForm, "Country code").fill("IN");
      await field(packForm, "Jurisdiction reference").fill("country:IN:browser");
      await field(packForm, "Status").selectOption("draft");
      await field(packForm, "Effective from").fill("2026-04-01");
      await field(packForm, "Effective to").fill("2027-03-31");
      await field(packForm, "Currency code").fill("INR");
      await field(packForm, "Statutory profile reference").fill(`payroll.statutory.${packCode}.v1`);
      await field(packForm, "Validation profile reference").fill(`payroll.statutory.validation.${packCode}.v1`);
      await field(packForm, "Config profile reference").fill("statutory.pack.browser.profile.v1");
      await packForm.getByRole("button", { name: "Create pack" }).click();
    });
    expect(packResult.ok).toBeTruthy();
    await expect(page.getByText(packCode).first()).toBeVisible();

    const duplicatePack = await submitAndCapture(page, "payroll-statutory-packs", "POST", async () => {
      await packForm.getByRole("button", { name: "New" }).click();
      await field(packForm, "Code").fill(packCode);
      await field(packForm, "Name").fill(`Duplicate ${packCode}`);
      await field(packForm, "Effective from").fill("2026-04-01");
      await packForm.getByRole("button", { name: "Create pack" }).click();
    });
    expect(duplicatePack.ok).toBeFalsy();
    await expect(page.getByText(/Save failed|code:/i).first()).toBeVisible();

    await packForm.getByRole("button", { name: new RegExp(packCode) }).first().click();
    await submitAndCapture(page, `payroll-statutory-packs/${packResult.payload.id}`, "PATCH", async () => {
      await field(packForm, "Name").fill(`Updated ${packCode}`);
      await field(packForm, "Validation profile reference").fill(`payroll.statutory.validation.${packCode}.v2`);
      await packForm.getByRole("button", { name: "Save pack" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(page.getByText(`Updated ${packCode}`).first()).toBeVisible();

    await expectFields(componentForm, [
      "Statutory pack",
      "Salary component",
      "Code",
      "Name",
      "Statutory type",
      "Contribution owner",
      "Calculation method",
      "Wage base reference",
      "Statutory treatment reference",
      "Registration reference",
      "Applicability profile reference",
      "Rounding rule reference",
      "Formula reference",
      "Status",
      "Config profile reference",
    ]);
    await expectOptions(componentForm, "Statutory pack");
    await expectOptions(componentForm, "Statutory type");
    await expectOptions(componentForm, "Contribution owner");
    await expectOptions(componentForm, "Calculation method");
    const componentCode = uniqueCode("STAT_COMP");
    const componentResult = await submitAndCapture<{ id: string; code: string; name: string }>(page, "payroll-statutory-components", "POST", async () => {
      await field(componentForm, "Statutory pack").selectOption(packResult.payload.id);
      await field(componentForm, "Salary component").selectOption("");
      await field(componentForm, "Code").fill(componentCode);
      await field(componentForm, "Name").fill(`Browser ${componentCode}`);
      await field(componentForm, "Statutory type").selectOption("provident_fund");
      await field(componentForm, "Contribution owner").selectOption("both");
      await field(componentForm, "Calculation method").selectOption("slab");
      await field(componentForm, "Wage base reference").fill("payroll.wage_base.basic.browser.v1");
      await field(componentForm, "Statutory treatment reference").fill(`payroll.statutory.treatment.${componentCode}.v1`);
      await field(componentForm, "Registration reference").fill("pf.establishment");
      await field(componentForm, "Applicability profile reference").fill("payroll.statutory.applicability.browser.v1");
      await field(componentForm, "Rounding rule reference").fill("payroll.rounding.browser.v1");
      await field(componentForm, "Status").selectOption("draft");
      await field(componentForm, "Config profile reference").fill("statutory.component.browser.profile.v1");
      await componentForm.getByRole("button", { name: "Create component" }).click();
    });
    expect(componentResult.ok).toBeTruthy();
    await expect(page.getByText(componentCode).first()).toBeVisible();

    await submitAndCapture(page, `payroll-statutory-components/${componentResult.payload.id}`, "PATCH", async () => {
      await field(componentForm, "Status").selectOption("active");
      await field(componentForm, "Rounding rule reference").fill("payroll.rounding.browser.v2");
      await componentForm.getByRole("button", { name: "Save component" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(page.getByText(/statutory component saved/i).first()).toBeVisible();

    await expectFields(slabForm, [
      "Statutory component",
      "Code",
      "Name",
      "Slab order",
      "Effective from",
      "Effective to",
      "Minimum amount",
      "Maximum amount",
      "Employee rate percent",
      "Employer rate percent",
      "Fixed employee amount",
      "Fixed employer amount",
      "Wage ceiling amount",
      "State code",
      "Applicability profile reference",
      "Status",
      "Config profile reference",
    ]);
    const slabCode = uniqueCode("STAT_SLAB");
    const slabResult = await submitAndCapture<{ id: string; code: string }>(page, "payroll-statutory-slabs", "POST", async () => {
      await field(slabForm, "Statutory component").selectOption(componentResult.payload.id);
      await field(slabForm, "Code").fill(slabCode);
      await field(slabForm, "Name").fill(`Browser ${slabCode}`);
      await field(slabForm, "Slab order").fill("20");
      await field(slabForm, "Effective from").fill("2026-04-01");
      await field(slabForm, "Effective to").fill("2027-03-31");
      await field(slabForm, "Minimum amount").fill("0");
      await field(slabForm, "Maximum amount").fill("15000");
      await field(slabForm, "Employee rate percent").fill("12");
      await field(slabForm, "Employer rate percent").fill("12");
      await field(slabForm, "Fixed employee amount").fill("0");
      await field(slabForm, "Fixed employer amount").fill("0");
      await field(slabForm, "Wage ceiling amount").fill("15000");
      await field(slabForm, "State code").fill("ka");
      await field(slabForm, "Status").selectOption("draft");
      await field(slabForm, "Config profile reference").fill("statutory.slab.browser.profile.v1");
      await slabForm.getByRole("button", { name: "Create slab" }).click();
    });
    expect(slabResult.ok).toBeTruthy();

    await submitAndCapture(page, `payroll-statutory-slabs/${slabResult.payload.id}`, "PATCH", async () => {
      await field(slabForm, "Employer rate percent").fill("13");
      await field(slabForm, "Status").selectOption("active");
      await slabForm.getByRole("button", { name: "Save slab" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(field(slabForm, "Employer rate percent")).toHaveValue("13.0000");

    await expectFields(registrationForm, [
      "Statutory pack",
      "Statutory component",
      "Legal entity",
      "Branch",
      "Location",
      "Code",
      "Name",
      "Registration type reference",
      "Registration number",
      "Employer identifier",
      "Jurisdiction reference",
      "Filing authority reference",
      "Provider reference",
      "Status",
      "Effective from",
      "Effective to",
      "Source reference",
      "Config profile reference",
    ]);
    const registrationCode = uniqueCode("STAT_REG");
    const registrationResult = await submitAndCapture<{ id: string; code: string; registration_number: string }>(page, "payroll-statutory-employer-registrations", "POST", async () => {
      await field(registrationForm, "Statutory pack").selectOption(packResult.payload.id);
      await field(registrationForm, "Statutory component").selectOption(componentResult.payload.id);
      await field(registrationForm, "Legal entity").selectOption({ index: 1 });
      await field(registrationForm, "Branch").selectOption({ index: 1 });
      await field(registrationForm, "Location").selectOption({ index: 1 });
      await field(registrationForm, "Code").fill(registrationCode);
      await field(registrationForm, "Name").fill(`Browser ${registrationCode}`);
      await field(registrationForm, "Registration type reference").fill("pf.establishment");
      await field(registrationForm, "Registration number").fill(`pf${Date.now()}`.slice(0, 16));
      await field(registrationForm, "Employer identifier").fill(`emp${Date.now()}`.slice(0, 16));
      await field(registrationForm, "Jurisdiction reference").fill("country:IN:KA");
      await field(registrationForm, "Filing authority reference").fill("epfo");
      await field(registrationForm, "Provider reference").fill("payroll.provider.browser.epfo");
      await field(registrationForm, "Status").selectOption("draft");
      await field(registrationForm, "Effective from").fill("2026-04-01");
      await field(registrationForm, "Source reference").fill("browser-reg-source");
      await field(registrationForm, "Config profile reference").fill("statutory.registration.browser.profile.v1");
      await registrationForm.getByRole("button", { name: "Create registration" }).click();
    });
    expect(registrationResult.ok).toBeTruthy();
    await expect(page.getByText(registrationCode).first()).toBeVisible();

    await submitAndCapture(page, `payroll-statutory-employer-registrations/${registrationResult.payload.id}`, "PATCH", async () => {
      await field(registrationForm, "Status").selectOption("active");
      await field(registrationForm, "Provider reference").fill("payroll.provider.browser.epfo.v2");
      await registrationForm.getByRole("button", { name: "Save registration" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());

    await expectFields(filingForm, [
      "Statutory pack",
      "Statutory component",
      "Employer registration",
      "Code",
      "Name",
      "Filing type reference",
      "Filing frequency",
      "Period start",
      "Period end",
      "Due date",
      "Grace due date",
      "Filing window start",
      "Filing window end",
      "Status",
      "Filing authority reference",
      "Provider reference",
      "Output profile reference",
      "Source reference",
      "Config profile reference",
    ]);
    const filingCode = uniqueCode("STAT_FILE");
    const filingResult = await submitAndCapture<{ id: string; code: string }>(page, "payroll-statutory-filing-calendars", "POST", async () => {
      await field(filingForm, "Statutory pack").selectOption(packResult.payload.id);
      await field(filingForm, "Statutory component").selectOption(componentResult.payload.id);
      await field(filingForm, "Employer registration").selectOption(registrationResult.payload.id);
      await field(filingForm, "Code").fill(filingCode);
      await field(filingForm, "Name").fill(`Browser ${filingCode}`);
      await field(filingForm, "Filing type reference").fill("pf.ecr");
      await field(filingForm, "Filing frequency").selectOption("monthly");
      await field(filingForm, "Period start").fill("2026-06-01");
      await field(filingForm, "Period end").fill("2026-06-30");
      await field(filingForm, "Due date").fill("2026-07-15");
      await field(filingForm, "Grace due date").fill("2026-07-20");
      await field(filingForm, "Filing window start").fill("2026-07-01");
      await field(filingForm, "Filing window end").fill("2026-07-15");
      await field(filingForm, "Status").selectOption("upcoming");
      await field(filingForm, "Output profile reference").fill("payroll.output.browser.statutory.v1");
      await field(filingForm, "Config profile reference").fill("statutory.filing.browser.profile.v1");
      await filingForm.getByRole("button", { name: "Create filing" }).click();
    });
    expect(filingResult.ok).toBeTruthy();

    await submitAndCapture(page, `payroll-statutory-filing-calendars/${filingResult.payload.id}`, "PATCH", async () => {
      await field(filingForm, "Status").selectOption("due");
      await field(filingForm, "Provider reference").fill("payroll.provider.browser.epfo.v2");
      await filingForm.getByRole("button", { name: "Save filing" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());

    await expectFields(profileForm, [
      "Employee",
      "Statutory pack",
      "Profile reference",
      "Effective from",
      "Effective to",
      "Status",
      "PAN number",
      "UAN number",
      "PF number",
      "ESI number",
      "Professional tax state",
      "LWF state",
      "Tax regime",
      "Declaration status",
      "Previous employment income",
      "Previous employment tax deducted",
      "Source reference",
      "Config profile reference",
    ]);
    await expect(profileForm.getByRole("checkbox", { name: "PF applicable" })).toBeVisible();
    await expect(profileForm.getByRole("checkbox", { name: "ESI applicable" })).toBeVisible();
    const profileRef = `payroll.profile.${Date.now()}`;
    const profileResult = await submitAndCapture<{ id: string; employee_id: string }>(page, "employee-statutory-profiles", "POST", async () => {
      await field(profileForm, "Employee").selectOption({ index: 0 });
      await field(profileForm, "Statutory pack").selectOption(packResult.payload.id);
      await field(profileForm, "Profile reference").fill(profileRef);
      await field(profileForm, "Effective from").fill("2026-04-01");
      await field(profileForm, "Effective to").fill("2027-03-31");
      await field(profileForm, "Status").selectOption("draft");
      await field(profileForm, "PAN number").fill("ABCDE1234F");
      await field(profileForm, "Professional tax state").fill("ka");
      await field(profileForm, "LWF state").fill("ka");
      await field(profileForm, "Tax regime").selectOption("new");
      await field(profileForm, "Declaration status").selectOption("not_started");
      await field(profileForm, "Previous employment income").fill("1000");
      await field(profileForm, "Previous employment tax deducted").fill("100");
      await field(profileForm, "Config profile reference").fill("statutory.profile.browser.profile.v1");
      await profileForm.getByRole("button", { name: "Create profile" }).click();
    });
    expect(profileResult.ok).toBeTruthy();

    await submitAndCapture(page, `employee-statutory-profiles/${profileResult.payload.id}`, "PATCH", async () => {
      await field(profileForm, "UAN number").fill("123456789012");
      await profileForm.getByRole("checkbox", { name: "PF applicable" }).check();
      await profileForm.getByRole("button", { name: "Save profile" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());

    await expectFields(declarationForm, [
      "Employee",
      "Employee statutory profile",
      "Statutory pack",
      "Financial year code",
      "Declaration profile reference",
      "Proof window reference",
      "Status",
      "Tax regime",
      "Declared total amount",
      "Verified total amount",
      "Rejection reason",
      "Source reference",
      "Config profile reference",
    ]);
    const declarationProfile = `payroll.declaration.${Date.now()}`;
    const declarationResult = await submitAndCapture<{ id: string }>(page, "employee-statutory-declarations", "POST", async () => {
      await field(declarationForm, "Employee statutory profile").selectOption(profileResult.payload.id);
      await field(declarationForm, "Statutory pack").selectOption(packResult.payload.id);
      await field(declarationForm, "Financial year code").fill(`FY${Date.now()}`.slice(0, 20));
      await field(declarationForm, "Declaration profile reference").fill(declarationProfile);
      await field(declarationForm, "Proof window reference").fill("proof.window.browser.v1");
      await field(declarationForm, "Status").selectOption("draft");
      await field(declarationForm, "Tax regime").selectOption("new");
      await field(declarationForm, "Declared total amount").fill("0");
      await field(declarationForm, "Verified total amount").fill("0");
      await field(declarationForm, "Config profile reference").fill("statutory.declaration.browser.profile.v1");
      await declarationForm.getByRole("button", { name: "Create declaration" }).click();
    });
    expect(declarationResult.ok).toBeTruthy();
    await expect(page.getByText(/statutory declaration saved/i).first()).toBeVisible();

    await expectFields(itemForm, [
      "Declaration",
      "Item kind",
      "Section code",
      "Component code",
      "Name",
      "Declared amount",
      "Verified amount",
      "Proof status",
      "Proof document reference",
      "Proof artifact key",
      "Source reference",
      "Config profile reference",
      "Item rejection reason",
    ]);
    const sectionCode = `SEC${Date.now()}`.slice(0, 12);
    const itemResult = await submitAndCapture<{ id: string }>(page, `employee-statutory-declarations/${declarationResult.payload.id}/items`, "POST", async () => {
      await field(itemForm, "Declaration").selectOption(declarationResult.payload.id);
      await field(itemForm, "Item kind").selectOption("investment");
      await field(itemForm, "Section code").fill(sectionCode);
      await field(itemForm, "Component code").fill(componentCode);
      await field(itemForm, "Name").fill(`Browser proof ${sectionCode}`);
      await field(itemForm, "Declared amount").fill("10000");
      await field(itemForm, "Verified amount").fill("0");
      await field(itemForm, "Proof status").selectOption("pending");
      await field(itemForm, "Config profile reference").fill("statutory.item.browser.profile.v1");
      await itemForm.getByRole("button", { name: "Create declaration item" }).click();
    });
    expect(itemResult.ok).toBeTruthy();

    await submitAndCapture(page, `employee-statutory-declaration-items/${itemResult.payload.id}`, "PATCH", async () => {
      await field(itemForm, "Proof status").selectOption("submitted");
      await field(itemForm, "Proof document reference").fill("doc-browser-proof-001");
      await field(itemForm, "Verified amount").fill("9000");
      await itemForm.getByRole("button", { name: "Save declaration item" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());

    await submitAndCapture(page, `employee-statutory-declarations/${declarationResult.payload.id}/submit`, "POST", async () => {
      await declarationForm.getByRole("button", { name: "Submit" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await submitAndCapture(page, `employee-statutory-declaration-items/${itemResult.payload.id}/verify`, "POST", async () => {
      await itemForm.getByRole("button", { name: "Verify item" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await submitAndCapture(page, `employee-statutory-declarations/${declarationResult.payload.id}/verify`, "POST", async () => {
      await declarationForm.getByRole("button", { name: "Verify" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await submitAndCapture(page, `employee-statutory-declarations/${declarationResult.payload.id}/lock`, "POST", async () => {
      await declarationForm.getByRole("button", { name: "Lock" }).click();
    }).then((result) => expect(result.ok).toBeTruthy());
    await expect(page.getByText(/lock declaration completed/i).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("statutory setup controls remain usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory");
    await expectPageReady(page, "Payroll Statutory");

    await expect(page.getByRole("heading", { name: "Statutory setup controls" })).toBeVisible();
    for (const testId of [
      "statutory-pack-form",
      "statutory-component-form",
      "statutory-slab-form",
      "statutory-registration-form",
      "statutory-filing-form",
      "statutory-profile-form",
      "statutory-declaration-form",
      "statutory-declaration-item-form",
    ]) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
    await expect(field(page.getByTestId("statutory-pack-form"), "Country code")).toBeVisible();
    await expect(field(page.getByTestId("statutory-declaration-item-form"), "Proof status")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
