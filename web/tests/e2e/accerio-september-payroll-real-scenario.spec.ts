import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type PhaseResult = {
  phase: string;
  status: "passed" | "blocked";
  steps: string[];
  notes?: string[];
};

type ScenarioEmployee = {
  key: "full_month" | "mid_month_joiner" | "lop" | "salary_revision" | "exit_settlement";
  code: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  workEmail: string;
  personalEmail: string;
  phone: string;
  status: "active" | "on_notice";
  joiningDate: string;
  probationEndDate: string;
  confirmationDate: string;
  annualCtc: number;
  monthlyGross: number;
  expectedStory: string;
};

type CreatedEmployee = ScenarioEmployee & {
  id: string;
};

type PayrollRules = {
  componentCodes: string[];
};

type ScenarioPayrollRun = {
  runId: string;
  runCode: string;
  reviewId: string;
  outputBatchId: string;
  handoffId: string;
  artifactCount: number;
  payslipCount: number;
  registerCount: number;
  publishedArtifactCount: number;
};

const phaseResults: PhaseResult[] = [];

function recordPhase(result: PhaseResult) {
  phaseResults.push(result);
  console.log(`[${result.status.toUpperCase()}] ${result.phase}`);
  for (const step of result.steps) {
    console.log(`  - ${step}`);
  }
  for (const note of result.notes ?? []) {
    console.log(`  note: ${note}`);
  }
}

function field(scope: Locator, label: string) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .first();
}

async function optionCount(select: Locator) {
  return select.evaluate((element) =>
    Array.from((element as HTMLSelectElement).options).filter((option) => option.value).length,
  );
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 30_000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function selectOptionByText(select: Locator, text: string | RegExp) {
  const value = await select.evaluate((element, pattern) => {
    const source = String(pattern);
    const isRegex = source.startsWith("/") && source.lastIndexOf("/") > 0;
    const matcher = isRegex
      ? new RegExp(source.slice(1, source.lastIndexOf("/")))
      : null;
    const options = Array.from((element as HTMLSelectElement).options);
    const option = options.find((item) => {
      const label = item.textContent?.trim() ?? "";
      return matcher ? matcher.test(label) : label.includes(source);
    });
    return option?.value ?? "";
  }, String(text));
  expect(value).toBeTruthy();
  await select.selectOption(value);
  return value;
}

async function baselineCounts(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/employees/new", hrAdmin);
  await assertPageShell(page, "Create employee");
  const employeeMain = page.locator("main");
  const structuralCounts = {
    legalEntities: await optionCount(field(employeeMain, "Legal entity")),
    branches: await optionCount(field(employeeMain, "Branch")),
    locations: await optionCount(field(employeeMain, "Location")),
    businessUnits: await optionCount(field(employeeMain, "Business unit")),
    departments: await optionCount(field(employeeMain, "Department")),
    costCenters: await optionCount(field(employeeMain, "Cost center")),
    designations: await optionCount(field(employeeMain, "Designation")),
    grades: await optionCount(field(employeeMain, "Grade")),
    employmentTypes: await optionCount(field(employeeMain, "Employment type")),
    managers: await optionCount(field(employeeMain, "Reporting manager")),
  };

  await gotoAuthenticated(page, "/hr-admin/payroll-setup", hrAdmin);
  await assertPageShell(page, "Payroll Setup");
  const payrollSetup = page.locator("main");
  const payrollCounts = {
    calendars: await optionCount(field(payrollSetup.getByTestId("payroll-period-form"), "Calendar")),
    periods: await optionCount(field(payrollSetup.getByTestId("pay-group-form"), "Calendar")),
    payGroups: await optionCount(field(payrollSetup.getByTestId("pay-group-assignment-form"), "Pay group")),
    assignmentEmployees: await optionCount(field(payrollSetup.getByTestId("pay-group-assignment-form"), "Employee")),
  };

  await gotoAuthenticated(page, "/hr-admin/salary-setup", hrAdmin);
  await assertPageShell(page, "Salary Setup");
  const salarySetup = page.locator("main");
  const salaryCounts = {
    structures: await optionCount(field(salarySetup.getByTestId("salary-version-form"), "Structure")),
    versions: await optionCount(field(salarySetup.getByTestId("salary-assignment-form"), "Structure version")),
    salaryEmployees: await optionCount(field(salarySetup.getByTestId("salary-assignment-form"), "Employee")),
  };

  await gotoAuthenticated(page, "/hr-admin/payroll-statutory", hrAdmin);
  await assertPageShell(page, "Payroll Statutory");

  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  await assertPageShell(page, "Payroll Inputs");
  const inputs = page.locator("main");
  const inputCounts = {
    runPeriods: await optionCount(field(inputs.getByTestId("payroll-run-form"), "Period")),
    runStatuses: await optionCount(field(inputs.getByTestId("payroll-run-form"), "Status")),
    snapshotEmployees: await optionCount(field(inputs.getByTestId("payroll-input-snapshot-form"), "Employee")),
  };

  const allCounts = { ...structuralCounts, ...payrollCounts, ...salaryCounts, ...inputCounts };
  const blockingMissing = Object.entries(allCounts).filter(([, count]) => count <= 0);
  return { structuralCounts, payrollCounts, salaryCounts, inputCounts, blockingMissing };
}

async function createOrganizationPrerequisites(page: Page, suffix: string) {
  const legalEntityCode = `LE-ACC-${suffix}`;
  const locationCode = `LOC-BLR-${suffix}`;
  const branchCode = `BR-BLR-${suffix}`;
  const businessUnitCode = `BU-PEOPLE-${suffix}`;
  const departmentCode = `DEP-OPS-${suffix}`;
  const employmentTypeCode = `ET-FT-${suffix}`;
  const created = {
    legalEntityCode,
    legalEntityName: `Accerio India ${suffix}`,
    locationCode,
    locationName: `Bengaluru HO ${suffix}`,
    branchCode,
    branchName: `Bengaluru Branch ${suffix}`,
    businessUnitCode,
    businessUnitName: `People Operations ${suffix}`,
    departmentCode,
    departmentName: `People Operations ${suffix}`,
    employmentTypeCode,
    employmentTypeName: `Full Time ${suffix}`,
  };

  await gotoAuthenticated(page, "/hr-admin/organization/legal_entities/new", hrAdmin);
  await assertPageShell(page, /Create Legal Entity/i);
  await field(page.locator("main"), "Code").fill(created.legalEntityCode);
  await field(page.locator("main"), "Name").fill(created.legalEntityName);
  await field(page.locator("main"), "Active").selectOption("true");
  await field(page.locator("main"), "Registered name").fill(`${created.legalEntityName} Pvt Ltd`);
  await field(page.locator("main"), "Country code").fill("IN");
  await field(page.locator("main"), "Timezone").fill("Asia/Kolkata");
  await field(page.locator("main"), "Primary email").fill("sushil@accerio.in");
  await field(page.locator("main"), "Primary phone").fill("+91 9876543210");
  await page.getByRole("button", { name: "Create legal entity" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=legal_entities/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/locations/new", hrAdmin);
  await assertPageShell(page, /Create Location/i);
  await field(page.locator("main"), "Code").fill(created.locationCode);
  await field(page.locator("main"), "Name").fill(created.locationName);
  await field(page.locator("main"), "Active").selectOption("true");
  await field(page.locator("main"), "Address line 1").fill("Accerio Bengaluru Office");
  await field(page.locator("main"), "Address line 2").fill("Payroll readiness floor");
  await field(page.locator("main"), "City").fill("Bengaluru");
  await field(page.locator("main"), "State").fill("Karnataka");
  await field(page.locator("main"), "Postal code").fill("560001");
  await field(page.locator("main"), "Country code").fill("IN");
  await page.getByRole("button", { name: "Create location" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=locations/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/branches/new", hrAdmin);
  await assertPageShell(page, /Create Branch/i);
  await field(page.locator("main"), "Code").fill(created.branchCode);
  await field(page.locator("main"), "Name").fill(created.branchName);
  await field(page.locator("main"), "Active").selectOption("true");
  await selectOptionByText(field(page.locator("main"), "Legal entity"), created.legalEntityName);
  await selectOptionByText(field(page.locator("main"), "Location"), created.locationName);
  await field(page.locator("main"), "Branch type").fill("Head Office");
  await page.getByRole("button", { name: "Create branch" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=branches/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/business_units/new", hrAdmin);
  await assertPageShell(page, /Create Business Unit/i);
  await field(page.locator("main"), "Code").fill(created.businessUnitCode);
  await field(page.locator("main"), "Name").fill(created.businessUnitName);
  await field(page.locator("main"), "Active").selectOption("true");
  await page.getByRole("button", { name: "Create business unit" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=business_units/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/departments/new", hrAdmin);
  await assertPageShell(page, /Create Department/i);
  await field(page.locator("main"), "Code").fill(created.departmentCode);
  await field(page.locator("main"), "Name").fill(created.departmentName);
  await field(page.locator("main"), "Active").selectOption("true");
  await selectOptionByText(field(page.locator("main"), "Business unit"), created.businessUnitName);
  await page.getByRole("button", { name: "Create department" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=departments/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/employment_types/new", hrAdmin);
  await assertPageShell(page, /Create Employment Type/i);
  await field(page.locator("main"), "Code").fill(created.employmentTypeCode);
  await field(page.locator("main"), "Name").fill(created.employmentTypeName);
  await field(page.locator("main"), "Active").selectOption("true");
  await field(page.locator("main"), "Description").fill("Full-time regular employment for Accerio payroll testing.");
  await field(page.locator("main"), "Payroll eligibility").selectOption("true");
  await page.getByRole("button", { name: "Create employment type" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=employment_types/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/cost_centers/new", hrAdmin);
  await assertPageShell(page, /Create Cost Center/i);
  await field(page.locator("main"), "Code").fill(`CC-IN-${suffix}`);
  await field(page.locator("main"), "Name").fill(`India Payroll Cost Center ${suffix}`);
  await field(page.locator("main"), "Active").selectOption("true");
  await selectOptionByText(field(page.locator("main"), "Legal entity"), created.legalEntityName);
  await page.getByRole("button", { name: "Create cost center" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=cost_centers/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/grades/new", hrAdmin);
  await assertPageShell(page, /Create Grade/i);
  await field(page.locator("main"), "Code").fill(`GR-L3-${suffix}`);
  await field(page.locator("main"), "Name").fill(`Level 3 ${suffix}`);
  await field(page.locator("main"), "Active").selectOption("true");
  await field(page.locator("main"), "Level").fill("3");
  await page.getByRole("button", { name: "Create grade" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=grades/, { timeout: 30_000 });

  await gotoAuthenticated(page, "/hr-admin/organization/designations/new", hrAdmin);
  await assertPageShell(page, /Create Designation/i);
  await field(page.locator("main"), "Code").fill(`DES-HR-${suffix}`);
  await field(page.locator("main"), "Name").fill(`People Operations Specialist ${suffix}`);
  await field(page.locator("main"), "Active").selectOption("true");
  await selectOptionByText(field(page.locator("main"), "Grade"), `Level 3 ${suffix}`);
  await page.getByRole("button", { name: "Create designation" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=designations/, { timeout: 30_000 });

  return {
    ...created,
    costCenterName: `India Payroll Cost Center ${suffix}`,
    gradeName: `Level 3 ${suffix}`,
    designationName: `People Operations Specialist ${suffix}`,
  };
}

async function createPayrollAndSalaryPrerequisites(page: Page, suffix: string) {
  await gotoAuthenticated(page, "/hr-admin/payroll-setup", hrAdmin);
  await assertPageShell(page, "Payroll Setup");
  const calendarForm = page.getByTestId("payroll-calendar-form");
  const periodForm = page.getByTestId("payroll-period-form");
  const payGroupForm = page.getByTestId("pay-group-form");

  const calendarCode = `CAL-SEP26-${suffix}`;
  const calendar = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/payroll-calendars$/,
    "POST",
    async () => {
      await field(calendarForm, "Code").fill(calendarCode);
      await field(calendarForm, "Name").fill(`Accerio Monthly ${suffix}`);
      await field(calendarForm, "Frequency").selectOption("monthly");
      await field(calendarForm, "Timezone").fill("Asia/Kolkata");
      await field(calendarForm, "Currency code").fill("INR");
      await field(calendarForm, "Period start day").fill("1");
      await field(calendarForm, "Config profile reference").fill(`accerio.payroll.calendar.${suffix}.v1`);
      await calendarForm.getByRole("checkbox", { name: "Active calendar" }).check();
      await calendarForm.getByRole("button", { name: "Create calendar" }).click();
    },
  );
  expect(calendar.ok).toBeTruthy();

  const periodCode = `SEP-2026-${suffix}`;
  const period = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/payroll-periods$/,
    "POST",
    async () => {
      await field(periodForm, "Calendar").selectOption(calendar.payload.id);
      await field(periodForm, "Code").fill(periodCode);
      await field(periodForm, "Name").fill(`September 2026 ${suffix}`);
      await field(periodForm, "Start date").fill("2026-09-01");
      await field(periodForm, "End date").fill("2026-09-30");
      await field(periodForm, "Pay date").fill("2026-09-30");
      await field(periodForm, "Status").selectOption("open");
      await field(periodForm, "Config profile reference").fill(`accerio.payroll.period.${suffix}.v1`);
      await periodForm.getByRole("button", { name: "Create period" }).click();
    },
  );
  expect(period.ok).toBeTruthy();

  const payGroupCode = `PG-IN-${suffix}`;
  const payGroup = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/pay-groups$/,
    "POST",
    async () => {
      await field(payGroupForm, "Calendar").selectOption(calendar.payload.id);
      await field(payGroupForm, "Code").fill(payGroupCode);
      await field(payGroupForm, "Name").fill(`India Monthly Payroll ${suffix}`);
      await field(payGroupForm, "Status").selectOption("active");
      await field(payGroupForm, "Default currency code").fill("INR");
      await field(payGroupForm, "Config profile reference").fill(`accerio.payroll.paygroup.${suffix}.v1`);
      await payGroupForm.getByRole("button", { name: "Create pay group" }).click();
    },
  );
  expect(payGroup.ok).toBeTruthy();

  await gotoAuthenticated(page, "/hr-admin/salary-setup", hrAdmin);
  await assertPageShell(page, "Salary Setup");
  const structureForm = page.getByTestId("salary-structure-form");
  const versionForm = page.getByTestId("salary-version-form");

  const structureCode = `SAL-IN-${suffix}`;
  const structure = await submitAndCapture<{ id: string; name: string }>(
    page,
    /\/api\/hr-admin\/salary-structures$/,
    "POST",
    async () => {
      await field(structureForm, "Code").fill(structureCode);
      await field(structureForm, "Name").fill(`Accerio India Salary ${suffix}`);
      await field(structureForm, "Pay group").selectOption(payGroup.payload.id);
      await field(structureForm, "Currency code").fill("INR");
      await field(structureForm, "Status").selectOption("active");
      await field(structureForm, "Description").fill("September 2026 real scenario salary structure.");
      await field(structureForm, "Config profile reference").fill(`accerio.salary.structure.${suffix}.v1`);
      await structureForm.getByRole("button", { name: "Create structure" }).click();
    },
  );
  expect(structure.ok).toBeTruthy();

  const version = await submitAndCapture<{ id: string; version: number }>(
    page,
    /\/api\/hr-admin\/salary-structure-versions$/,
    "POST",
    async () => {
      await field(versionForm, "Structure").selectOption(structure.payload.id);
      await field(versionForm, "Version").fill("1");
      await field(versionForm, "Effective from").fill("2026-09-01");
      await field(versionForm, "Effective to").fill("");
      await field(versionForm, "Annual CTC").fill("1200000");
      await field(versionForm, "Currency code").fill("INR");
      await field(versionForm, "Status").selectOption("active");
      await field(versionForm, "Config profile reference").fill(`accerio.salary.version.${suffix}.v1`);
      await versionForm.getByRole("button", { name: "Create version" }).click();
    },
  );
  expect(version.ok).toBeTruthy();

  return {
    calendarId: calendar.payload.id,
    calendarCode,
    periodId: period.payload.id,
    periodCode,
    payGroupId: payGroup.payload.id,
    payGroupCode,
    salaryStructureId: structure.payload.id,
    salaryStructureName: `Accerio India Salary ${suffix}`,
    salaryVersionId: version.payload.id,
  };
}

async function selectedOptionText(select: Locator) {
  return select.evaluate((element) => {
    const item = (element as HTMLSelectElement).selectedOptions.item(0);
    return item?.textContent?.trim() ?? "";
  });
}

async function selectFirstNonEmptyOption(select: Locator) {
  const value = await select.evaluate((element) => {
    const options = Array.from((element as HTMLSelectElement).options);
    return options.find((option) => option.value)?.value ?? "";
  });
  expect(value).toBeTruthy();
  await select.selectOption(value);
  return value;
}

async function assertPageShell(page: Page, heading: string | RegExp) {
  await expectPageReady(page, heading);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: /HR Admin navigation/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

function scenarioEmployees(suffix: string): ScenarioEmployee[] {
  const normalized = suffix.toLowerCase();
  return [
    {
      key: "full_month",
      code: `ACC-SEP-${suffix}-F01`,
      firstName: "Aarav",
      lastName: "Fullmonth",
      preferredName: "Aarav Full Month",
      workEmail: `aarav.full.${normalized}@accerio.test`,
      personalEmail: `aarav.full.${normalized}@example.test`,
      phone: "+91 90000 10001",
      status: "active",
      joiningDate: "2025-04-01",
      probationEndDate: "2025-09-30",
      confirmationDate: "2025-10-01",
      annualCtc: 1200000,
      monthlyGross: 100000,
      expectedStory: "Full September salary with no LOP.",
    },
    {
      key: "mid_month_joiner",
      code: `ACC-SEP-${suffix}-J02`,
      firstName: "Isha",
      lastName: "Joiner",
      preferredName: "Isha Joiner",
      workEmail: `isha.joiner.${normalized}@accerio.test`,
      personalEmail: `isha.joiner.${normalized}@example.test`,
      phone: "+91 90000 10002",
      status: "active",
      joiningDate: "2026-09-10",
      probationEndDate: "2027-03-10",
      confirmationDate: "2027-03-11",
      annualCtc: 900000,
      monthlyGross: 75000,
      expectedStory: "Mid-month joining, payable from 10 Sep 2026.",
    },
    {
      key: "lop",
      code: `ACC-SEP-${suffix}-L03`,
      firstName: "Kabir",
      lastName: "Lop",
      preferredName: "Kabir LOP",
      workEmail: `kabir.lop.${normalized}@accerio.test`,
      personalEmail: `kabir.lop.${normalized}@example.test`,
      phone: "+91 90000 10003",
      status: "active",
      joiningDate: "2024-11-01",
      probationEndDate: "2025-05-01",
      confirmationDate: "2025-05-02",
      annualCtc: 960000,
      monthlyGross: 80000,
      expectedStory: "Full-month employee with three LOP days.",
    },
    {
      key: "salary_revision",
      code: `ACC-SEP-${suffix}-R04`,
      firstName: "Meera",
      lastName: "Revision",
      preferredName: "Meera Revision",
      workEmail: `meera.revision.${normalized}@accerio.test`,
      personalEmail: `meera.revision.${normalized}@example.test`,
      phone: "+91 90000 10004",
      status: "active",
      joiningDate: "2024-05-01",
      probationEndDate: "2024-11-01",
      confirmationDate: "2024-11-02",
      annualCtc: 1500000,
      monthlyGross: 125000,
      expectedStory: "Mid-month salary revision effective 15 Sep 2026, represented in payroll snapshot.",
    },
    {
      key: "exit_settlement",
      code: `ACC-SEP-${suffix}-E05`,
      firstName: "Rohan",
      lastName: "Exit",
      preferredName: "Rohan Exit",
      workEmail: `rohan.exit.${normalized}@accerio.test`,
      personalEmail: `rohan.exit.${normalized}@example.test`,
      phone: "+91 90000 10005",
      status: "on_notice",
      joiningDate: "2023-09-01",
      probationEndDate: "2024-03-01",
      confirmationDate: "2024-03-02",
      annualCtc: 840000,
      monthlyGross: 70000,
      expectedStory: "Exit and final settlement case with last working day 25 Sep 2026.",
    },
  ];
}

async function createScenarioEmployee(
  page: Page,
  employee: ScenarioEmployee,
  org: Awaited<ReturnType<typeof createOrganizationPrerequisites>>,
) {
  await gotoAuthenticated(page, "/hr-admin/employees/new", hrAdmin);
  await assertPageShell(page, "Create employee");
  const main = page.locator("main");

  await field(main, "Employee code").fill(employee.code);
  await field(main, "Employment status").selectOption(employee.status);
  await field(main, "First name").fill(employee.firstName);
  await field(main, "Last name").fill(employee.lastName);
  await field(main, "Preferred name").fill(employee.preferredName);
  await field(main, "Work email").fill(employee.workEmail);
  await field(main, "Personal email").fill(employee.personalEmail);
  await field(main, "Phone number").fill(employee.phone);
  await field(main, "Date of birth").fill("1995-01-15");
  await field(main, "Date of joining").fill(employee.joiningDate);
  await field(main, "Probation end date").fill(employee.probationEndDate);
  await field(main, "Confirmation date").fill(employee.confirmationDate);

  await selectOptionByText(field(main, "Legal entity"), org.legalEntityName);
  await selectOptionByText(field(main, "Branch"), org.branchName);
  await expect(field(main, "Location")).not.toHaveValue("");
  await selectOptionByText(field(main, "Department"), org.departmentName);
  await expect(field(main, "Business unit")).not.toHaveValue("");
  await selectOptionByText(field(main, "Cost center"), org.costCenterName);
  await selectOptionByText(field(main, "Designation"), org.designationName);
  await expect(field(main, "Grade")).not.toHaveValue("");
  await selectOptionByText(field(main, "Employment type"), org.employmentTypeName);
  await selectFirstNonEmptyOption(field(main, "Reporting manager"));

  const createResult = await submitAndCapture<{ id: string; employee_code: string }>(
    page,
    /\/api\/hr-admin\/employees$/,
    "POST",
    async () => {
      await page.getByRole("button", { name: "Create employee" }).click();
    },
  );
  expect(createResult.ok).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${createResult.payload.id}`), { timeout: 30_000 });
  await expect(page.getByText(employee.code).first()).toBeVisible();
  return { ...employee, id: createResult.payload.id };
}

async function addPrimaryBankAccount(page: Page, employee: CreatedEmployee) {
  await gotoAuthenticated(page, `/hr-admin/employees/${employee.id}/bank-accounts`, hrAdmin);
  await assertPageShell(page, /Bank accounts/i);
  const main = page.locator("main");
  await field(main, "Account holder name").fill(`${employee.firstName} ${employee.lastName}`);
  await field(main, "Bank name").fill("HDFC Bank");
  await field(main, "Account number").fill(`50100${employee.code.replace(/\D/g, "").slice(-8).padStart(8, "0")}`);
  await field(main, "IFSC code").fill("HDFC0001234");
  await field(main, "Branch name").fill("Bengaluru");
  const result = await submitAndCapture<{ id: string }>(
    page,
    new RegExp(`/api/hr-admin/employees/${employee.id}/bank-accounts$`),
    "POST",
    async () => {
      await page.getByRole("button", { name: "Create account" }).click();
    },
  );
  expect(result.ok).toBeTruthy();
  await expect(page.getByText("Employee bank account saved.")).toBeVisible({ timeout: 30_000 });
}

async function assignPayrollAndSalary(
  page: Page,
  employee: CreatedEmployee,
  payroll: Awaited<ReturnType<typeof createPayrollAndSalaryPrerequisites>>,
) {
  await gotoAuthenticated(page, "/hr-admin/payroll-setup", hrAdmin);
  await assertPageShell(page, "Payroll Setup");
  const payGroupAssignmentForm = page.getByTestId("pay-group-assignment-form");
  const payGroupAssignment = await submitAndCapture<{ id: string }>(
    page,
    /\/api\/hr-admin\/pay-group-assignments$/,
    "POST",
    async () => {
      await field(payGroupAssignmentForm, "Pay group").selectOption(payroll.payGroupId);
      await selectOptionByText(field(payGroupAssignmentForm, "Employee"), employee.code);
      await field(payGroupAssignmentForm, "Effective from").fill("2026-09-01");
      await field(payGroupAssignmentForm, "Effective to").fill("");
      await field(payGroupAssignmentForm, "Status").selectOption("active");
      await field(payGroupAssignmentForm, "Config profile reference").fill(`accerio.paygroup.assignment.${employee.key}.v1`);
      await payGroupAssignmentForm.getByRole("button", { name: "Create assignment" }).click();
    },
  );
  expect(payGroupAssignment.ok).toBeTruthy();

  await gotoAuthenticated(page, "/hr-admin/salary-setup", hrAdmin);
  await assertPageShell(page, "Salary Setup");
  const salaryAssignmentForm = page.getByTestId("salary-assignment-form");
  const salaryAssignment = await submitAndCapture<{ id: string }>(
    page,
    /\/api\/hr-admin\/employee-salary-assignments$/,
    "POST",
    async () => {
      await selectOptionByText(field(salaryAssignmentForm, "Employee"), employee.code);
      await field(salaryAssignmentForm, "Structure version").selectOption(payroll.salaryVersionId);
      await field(salaryAssignmentForm, "Effective from").fill(employee.key === "mid_month_joiner" ? "2026-09-10" : "2026-09-01");
      await field(salaryAssignmentForm, "Effective to").fill("");
      await field(salaryAssignmentForm, "Status").selectOption("active");
      await field(salaryAssignmentForm, "Annual CTC override").fill(String(employee.annualCtc));
      await field(salaryAssignmentForm, "Assignment reason").fill(employee.expectedStory);
      await field(salaryAssignmentForm, "Config profile reference").fill(`accerio.salary.assignment.${employee.key}.v1`);
      await salaryAssignmentForm.getByRole("button", { name: "Create assignment" }).click();
    },
  );
  expect(salaryAssignment.ok).toBeTruthy();
}

async function createPayrollRuleVersion(
  page: Page,
  definitionForm: Locator,
  versionForm: Locator,
  rule: {
    code: string;
    name: string;
    description: string;
    expression: string;
    requiredPaths: string[];
    outputPath: string;
    componentCode: string;
    componentName: string;
    componentType: "earning" | "deduction" | "tax";
    calculationOrder: number;
    profileRef: string;
    extraConfig?: Record<string, unknown>;
  },
) {
  await definitionForm.getByRole("button", { name: "New" }).click();
  const definition = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/payroll-rule-definitions$/,
    "POST",
    async () => {
      await field(definitionForm, "Code").fill(rule.code);
      await field(definitionForm, "Name").fill(rule.name);
      await field(definitionForm, "Rule type").selectOption("formula");
      await field(definitionForm, "Description").fill(rule.description);
      await field(definitionForm, "Tags JSON").fill(JSON.stringify(["browser", "accerio", "september_2026"]));
      await field(definitionForm, "Config profile reference").fill(rule.profileRef);
      await definitionForm.getByRole("button", { name: "Create rule" }).click();
    },
  );
  expect(definition.ok).toBeTruthy();
  await expect(page.getByText(rule.code).first()).toBeVisible();

  await versionForm.getByRole("button", { name: "New" }).click();
  const version = await submitAndCapture<{ id: string; status: string }>(
    page,
    /\/api\/hr-admin\/payroll-rule-versions$/,
    "POST",
    async () => {
      await field(versionForm, "Rule").selectOption(definition.payload.id);
      await field(versionForm, "Version").fill("1");
      await field(versionForm, "Status").selectOption("active");
      await field(versionForm, "Expression").fill(rule.expression);
      await field(versionForm, "Effective from").fill("2026-09-01");
      await field(versionForm, "Effective to").fill("2026-09-30");
      await field(versionForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
      await field(versionForm, "Input schema JSON").fill(JSON.stringify({ required_paths: rule.requiredPaths }));
      await field(versionForm, "Output schema JSON").fill(JSON.stringify({ result_path: rule.outputPath }));
      await field(versionForm, "Config snapshot JSON").fill(JSON.stringify({
        component_code: rule.componentCode,
        component_name: rule.componentName,
        component_type: rule.componentType,
        line_type: rule.componentType,
        calculation_order: rule.calculationOrder,
        output_path: rule.outputPath,
        profile_ref: rule.profileRef,
        ...rule.extraConfig,
      }));
      await versionForm.getByRole("button", { name: "Create version" }).click();
    },
  );
  expect(version.ok).toBeTruthy();
  await expect(page.getByText("payroll rule version saved.").first()).toBeVisible();
}

async function createScenarioPayrollRules(page: Page, suffix: string): Promise<PayrollRules> {
  await gotoAuthenticated(page, "/hr-admin/payroll-rules", hrAdmin);
  await assertPageShell(page, "Payroll Rules");
  const definitionForm = page.getByTestId("payroll-rule-definition-form");
  const versionForm = page.getByTestId("payroll-rule-version-form");
  const compact = suffix.replace(/[^A-Z0-9]/gi, "").slice(-8);
  const rules = [
    {
      code: `ACC_GROSS_${compact}`,
      name: `Accerio earned gross ${compact}`,
      description: "Scenario earned gross line from employee payroll snapshot.",
      expression: "round_decimal(salary.earned_gross, 2)",
      requiredPaths: ["salary.earned_gross"],
      outputPath: `components.acc_gross_${compact.toLowerCase()}`,
      componentCode: `ACC_GROSS_${compact}`,
      componentName: "Earned Gross",
      componentType: "earning" as const,
      calculationOrder: 10,
      profileRef: `accerio.payroll.rule.gross.${compact}.v1`,
    },
    {
      code: `ACC_HRA_${compact}`,
      name: `Accerio HRA ${compact}`,
      description: "HRA at configured scenario rate on basic salary.",
      expression: "round_decimal(salary.basic_monthly * salary.hra_rate, 2)",
      requiredPaths: ["salary.basic_monthly", "salary.hra_rate"],
      outputPath: `components.acc_hra_${compact.toLowerCase()}`,
      componentCode: `ACC_HRA_${compact}`,
      componentName: "House Rent Allowance",
      componentType: "earning" as const,
      calculationOrder: 20,
      profileRef: `accerio.payroll.rule.hra.${compact}.v1`,
    },
    {
      code: `ACC_LOP_${compact}`,
      name: `Accerio LOP ${compact}`,
      description: "Loss of pay deduction using snapshot daily rate and LOP days.",
      expression: "round_decimal(salary.daily_rate * attendance.lop_days, 2)",
      requiredPaths: ["salary.daily_rate", "attendance.lop_days"],
      outputPath: `components.acc_lop_${compact.toLowerCase()}`,
      componentCode: `ACC_LOP_${compact}`,
      componentName: "Loss Of Pay",
      componentType: "deduction" as const,
      calculationOrder: 30,
      profileRef: `accerio.payroll.rule.lop.${compact}.v1`,
    },
    {
      code: `ACC_SETTLE_${compact}`,
      name: `Accerio settlement ${compact}`,
      description: "Exit settlement earning from final settlement snapshot.",
      expression: "round_decimal(salary.settlement_earning, 2)",
      requiredPaths: ["salary.settlement_earning"],
      outputPath: `components.acc_settle_${compact.toLowerCase()}`,
      componentCode: `ACC_SETTLE_${compact}`,
      componentName: "Final Settlement Earning",
      componentType: "earning" as const,
      calculationOrder: 40,
      profileRef: `accerio.payroll.rule.settlement.${compact}.v1`,
    },
    {
      code: `ACC_TDS_${compact}`,
      name: `Accerio TDS ${compact}`,
      description: "Scenario tax deduction at ten percent of taxable income.",
      expression: "round_decimal(salary.taxable_income * 0.1, 2)",
      requiredPaths: ["salary.taxable_income"],
      outputPath: `components.acc_tds_${compact.toLowerCase()}`,
      componentCode: `ACC_TDS_${compact}`,
      componentName: "TDS",
      componentType: "tax" as const,
      calculationOrder: 50,
      profileRef: `accerio.payroll.rule.tds.${compact}.v1`,
      extraConfig: {
        statutory_type: "tds",
        statutory_treatment_ref: `accerio.tds.${compact}.v1`,
      },
    },
  ];

  for (const rule of rules) {
    await createPayrollRuleVersion(page, definitionForm, versionForm, rule);
  }

  return { componentCodes: rules.map((rule) => rule.componentCode) };
}

function payrollSnapshot(employee: CreatedEmployee, org: Awaited<ReturnType<typeof createOrganizationPrerequisites>>) {
  const workingDays = 30;
  const scenarioConfig = {
    full_month: {
      payableDays: 30,
      lopDays: 0,
      earnedGross: employee.monthlyGross,
      taxableIncome: employee.monthlyGross,
      settlementEarning: 0,
      notes: "Full-month payroll with no unpaid absence.",
    },
    mid_month_joiner: {
      payableDays: 21,
      lopDays: 0,
      earnedGross: Math.round((employee.monthlyGross / workingDays) * 21),
      taxableIncome: Math.round((employee.monthlyGross / workingDays) * 21),
      settlementEarning: 0,
      notes: "Prorated salary from 10 Sep 2026 joining.",
    },
    lop: {
      payableDays: 27,
      lopDays: 3,
      earnedGross: employee.monthlyGross,
      taxableIncome: employee.monthlyGross,
      settlementEarning: 0,
      notes: "Full-month salary with three unpaid days deducted separately.",
    },
    salary_revision: {
      payableDays: 30,
      lopDays: 0,
      earnedGross: 118000,
      taxableIncome: 118000,
      settlementEarning: 0,
      notes: "Blended September earning after 15 Sep salary revision.",
    },
    exit_settlement: {
      payableDays: 25,
      lopDays: 0,
      earnedGross: Math.round((employee.monthlyGross / workingDays) * 25),
      taxableIncome: Math.round((employee.monthlyGross / workingDays) * 25) + 10000,
      settlementEarning: 10000,
      notes: "Final payroll up to 25 Sep with settlement earning.",
    },
  }[employee.key];

  return {
    employee: {
      source: "browser",
      scenario: employee.key,
      employee_code: employee.code,
      employee_name: `${employee.firstName} ${employee.lastName}`,
      employment_status: employee.status,
      joining_date: employee.joiningDate,
      exit_date: employee.key === "exit_settlement" ? "2026-09-25" : null,
    },
    organization: {
      source: "browser",
      legal_entity: org.legalEntityName,
      branch: org.branchName,
      location: org.locationName,
      business_unit: org.businessUnitName,
      department: org.departmentName,
      cost_center: org.costCenterName,
      designation: org.designationName,
    },
    salary: {
      source: "browser",
      annual_ctc: employee.annualCtc,
      monthly_gross: employee.monthlyGross,
      earned_gross: scenarioConfig.earnedGross,
      basic_monthly: Math.round(scenarioConfig.earnedGross * 0.4),
      hra_rate: 0.4,
      daily_rate: Math.round(employee.monthlyGross / workingDays),
      taxable_income: scenarioConfig.taxableIncome,
      settlement_earning: scenarioConfig.settlementEarning,
      currency_code: "INR",
      revision_effective_date: employee.key === "salary_revision" ? "2026-09-15" : null,
      old_monthly_gross: employee.key === "salary_revision" ? 110000 : null,
      new_monthly_gross: employee.key === "salary_revision" ? 125000 : null,
    },
    attendance: {
      working_days: workingDays,
      present_days: scenarioConfig.payableDays,
      payable_days: scenarioConfig.payableDays,
      lop_days: scenarioConfig.lopDays,
    },
    validation: {
      blockers: [],
      warnings: [],
      scenario_note: scenarioConfig.notes,
    },
  };
}

async function createPayrollRunAndSnapshots(
  page: Page,
  suffix: string,
  org: Awaited<ReturnType<typeof createOrganizationPrerequisites>>,
  payroll: Awaited<ReturnType<typeof createPayrollAndSalaryPrerequisites>>,
  employees: CreatedEmployee[],
) {
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  await assertPageShell(page, "Payroll Inputs");
  const runForm = page.getByTestId("payroll-run-form");
  const snapshotForm = page.getByTestId("payroll-input-snapshot-form");
  const lockForm = page.getByTestId("payroll-input-lock-form");
  const runCode = `ACC-SEP-RUN-${suffix}`;

  await runForm.getByRole("button", { name: "New" }).click();
  const run = await submitAndCapture<{ id: string; code: string; name: string }>(
    page,
    /\/api\/hr-admin\/payroll-runs$/,
    "POST",
    async () => {
      await field(runForm, "Period").selectOption(payroll.periodId);
      await field(runForm, "Pay group").selectOption(payroll.payGroupId);
      await field(runForm, "Code").fill(runCode);
      await field(runForm, "Name").fill(`Accerio September 2026 ${suffix}`);
      await field(runForm, "Status").selectOption("collecting_inputs");
      await field(runForm, "Input profile ref").fill(`accerio.payroll.input.${suffix}.v1`);
      await field(runForm, "Snapshot schema ref").fill(`accerio.payroll.snapshot.${suffix}.v1`);
      await field(runForm, "Config profile reference").fill(`accerio.payroll.run.${suffix}.v1`);
      await runForm.getByRole("button", { name: "Create run" }).click();
    },
  );
  expect(run.ok).toBeTruthy();
  await expect(page.getByText(runCode).first()).toBeVisible();

  const snapshotIds: string[] = [];
  for (const employee of employees) {
    const snapshot = payrollSnapshot(employee, org);
    await snapshotForm.getByRole("button", { name: "New" }).click();
    const response = await submitAndCapture<{ id: string; employee_name: string; snapshot_status: string }>(
      page,
      /\/api\/hr-admin\/payroll-input-snapshots$/,
      "POST",
      async () => {
        await field(snapshotForm, "Payroll run").selectOption(run.payload.id);
        await selectOptionByText(field(snapshotForm, "Employee"), employee.code);
        await field(snapshotForm, "Snapshot status").selectOption("ready");
        await field(snapshotForm, "Input profile ref").fill(`accerio.payroll.input.${employee.key}.${suffix}.v1`);
        await field(snapshotForm, "Config profile reference").fill(`accerio.payroll.snapshot.${employee.key}.${suffix}.v1`);
        await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify(snapshot.employee));
        await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify(snapshot.organization));
        await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify(snapshot.salary));
        await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify(snapshot.attendance));
        await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify(snapshot.validation));
        await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
      },
    );
    expect(response.ok).toBeTruthy();
    snapshotIds.push(response.payload.id);
    await expect(page.getByText("payroll input snapshot saved.").first()).toBeVisible();
  }

  await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${run.payload.id}`, hrAdmin);
  await assertPageShell(page, "Payroll Inputs");
  const lock = await submitAndCapture<{ detail: string; locked_count: number }>(
    page,
    new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/lock-inputs$`),
    "POST",
    async () => {
      await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
    },
  );
  expect(lock.ok).toBeTruthy();
  expect(lock.payload.locked_count).toBeGreaterThanOrEqual(employees.length);
  await expect(page.getByText("Payroll input snapshots locked for calculation.").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  return { runId: run.payload.id, runCode, snapshotIds, lockedCount: lock.payload.locked_count };
}

async function closePayrollRun(page: Page, runId: string, suffix: string): Promise<ScenarioPayrollRun> {
  await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${runId}`, hrAdmin);
  await assertPageShell(page, "Payroll Calculations");
  const calculationPanel = page.getByLabel("Calculation controls");
  const calculation = await submitAndCapture<{ calculation: { id: string; status: string; line_count: number }; detail?: string }>(
    page,
    new RegExp(`/api/hr-admin/payroll-runs/${runId}/calculate-draft$`),
    "POST",
    async () => {
      await calculationPanel.getByLabel("Calculation profile ref").fill(`accerio.payroll.calc.${suffix}.v1`);
      await calculationPanel.getByRole("button", { name: "Calculate draft" }).click();
    },
  );
  expect(calculation.ok).toBeTruthy();
  expect(calculation.payload.calculation.line_count).toBeGreaterThanOrEqual(5);
  await expect(page.getByRole("status").first()).toContainText(/Draft payroll calculation completed/);
  await expectNoHorizontalOverflow(page);

  const review = await submitAndCapture<{ review: { id: string; status: string; exception_count: number }; detail?: string }>(
    page,
    new RegExp(`/api/hr-admin/payroll-runs/${runId}/open-review$`),
    "POST",
    async () => {
      await calculationPanel.getByLabel("Review profile ref").fill(`accerio.payroll.review.${suffix}.v1`);
      await calculationPanel.getByRole("button", { name: "Open review" }).click();
    },
  );
  expect(review.ok).toBeTruthy();
  await expect(page.getByRole("status").first()).toContainText(/Payroll review opened/);

  await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}`, hrAdmin);
  await assertPageShell(page, "Payroll Review");
  const reviewPanel = page.getByLabel("Review controls");
  const submitted = await submitAndCapture<{ review: { status: string }; detail?: string }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/submit$`),
    "POST",
    async () => {
      await reviewPanel.getByRole("button", { name: "Submit review" }).click();
    },
  );
  expect(submitted.ok).toBeTruthy();
  await expect(page.getByRole("status").first()).toContainText(/submitted for approval/);

  const approved = await submitAndCapture<{ review: { status: string }; detail?: string }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/approve$`),
    "POST",
    async () => {
      await reviewPanel.getByLabel("Approval profile ref").fill(`accerio.payroll.approval.${suffix}.v1`);
      const comment = reviewPanel.getByLabel("Approval comment");
      if (await comment.isVisible().catch(() => false)) {
        await comment.fill("Approved for Accerio September scenario payroll certification.");
      }
      await reviewPanel.getByRole("button", { name: "Approve review" }).click();
    },
  );
  expect(approved.ok).toBeTruthy();
  await expect(page.getByRole("status").first()).toContainText(/Payroll review approved/);

  const locked = await submitAndCapture<{ review: { status: string }; detail?: string }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/lock$`),
    "POST",
    async () => {
      await reviewPanel.getByRole("button", { name: "Final lock" }).click();
    },
  );
  expect(locked.ok).toBeTruthy();
  await expect(page.getByRole("status").first()).toContainText(/Payroll run final locked/);

  const outputs = await submitAndCapture<{
    output_batch: { id: string; status: string; artifact_count: number; payslip_count: number; register_count: number };
    artifacts: Array<{ id: string; kind: string; status: string; employee_code: string | null }>;
    detail?: string;
  }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/generate-outputs$`),
    "POST",
    async () => {
      await reviewPanel.getByLabel("Output profile ref").fill(`accerio.payroll.outputs.${suffix}.v1`);
      await reviewPanel.getByRole("button", { name: "Generate outputs" }).click();
    },
  );
  expect(outputs.ok).toBeTruthy();
  expect(outputs.payload.output_batch.payslip_count).toBeGreaterThanOrEqual(5);
  expect(outputs.payload.output_batch.register_count).toBeGreaterThanOrEqual(1);
  await expect(page.getByRole("status").first()).toContainText(/Payroll outputs generated/);

  await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${outputs.payload.output_batch.id}`, hrAdmin);
  await assertPageShell(page, "Payroll Outputs");
  const outputPanel = page.getByLabel("Output controls");
  const published = await submitAndCapture<{
    output_batch: { id: string; status: string; published_artifact_count: number };
    detail?: string;
  }>(
    page,
    new RegExp(`/api/hr-admin/payroll-output-batches/${outputs.payload.output_batch.id}/publish$`),
    "POST",
    async () => {
      await outputPanel.getByRole("button", { name: "Publish outputs" }).click();
    },
  );
  expect(published.ok).toBeTruthy();
  expect(published.payload.output_batch.status).toBe("published");
  await expect(page.getByRole("status").first()).toContainText(/Payroll outputs published/);
  await expectNoHorizontalOverflow(page);

  const handoff = await submitAndCapture<{ handoff: { id: string; status: string }; detail?: string }>(
    page,
    new RegExp(`/api/hr-admin/payroll-output-batches/${outputs.payload.output_batch.id}/generate-finance-handoff$`),
    "POST",
    async () => {
      await outputPanel.getByLabel("Handoff profile ref").fill(`accerio.payroll.handoff.${suffix}.v1`);
      await outputPanel.getByRole("button", { name: "Generate handoff" }).click();
    },
  );
  expect(handoff.ok).toBeTruthy();
  await expect(page.getByRole("status").first()).toContainText(/Payroll finance handoff generated/);

  await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoff.payload.handoff.id}`, hrAdmin);
  await assertPageShell(page, "Payroll Handoff");
  const handoffPanel = page.getByLabel("Handoff controls");
  const transmitButton = handoffPanel.getByRole("button", { name: "Transmit handoff" });
  if (await transmitButton.isEnabled()) {
    const transmit = await submitAndCapture<{ handoff: { id: string; status: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/transmit$`),
      "POST",
      async () => {
        await transmitButton.click();
      },
    );
    expect(transmit.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll finance handoff transmitted/);
  } else {
    await expect(transmitButton).toBeDisabled();
  }

  const refreshedHandoffPanel = page.getByLabel("Handoff controls");
  const acknowledgeButton = refreshedHandoffPanel.getByRole("button", { name: "Acknowledge handoff" });
  if (await acknowledgeButton.isEnabled()) {
    const ack = await submitAndCapture<{ handoff: { id: string; status: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/acknowledge$`),
      "POST",
      async () => {
        await refreshedHandoffPanel.getByLabel("Acknowledgement profile ref").fill(`accerio.payroll.ack.${suffix}.v1`);
        await acknowledgeButton.click();
      },
    );
    expect(ack.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/acknowledgement recorded/);
  } else {
    await expect(acknowledgeButton).toBeDisabled();
  }

  const auditButton = refreshedHandoffPanel.getByRole("button", { name: "Generate audit pack" });
  if (await auditButton.isEnabled()) {
    const audit = await submitAndCapture<{ handoff: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/generate-audit-pack$`),
      "POST",
      async () => {
        await refreshedHandoffPanel.getByLabel("Audit pack profile ref").fill(`accerio.payroll.audit.${suffix}.v1`);
        await auditButton.click();
      },
    );
    expect(audit.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/audit pack generated/);
  } else {
    await expect(auditButton).toBeDisabled();
  }
  await expectNoHorizontalOverflow(page);

  return {
    runId,
    runCode: "",
    reviewId: review.payload.review.id,
    outputBatchId: outputs.payload.output_batch.id,
    handoffId: handoff.payload.handoff.id,
    artifactCount: outputs.payload.output_batch.artifact_count,
    payslipCount: outputs.payload.output_batch.payslip_count,
    registerCount: outputs.payload.output_batch.register_count,
    publishedArtifactCount: published.payload.output_batch.published_artifact_count,
  };
}

async function validatePayrollOutputs(page: Page, runCode: string, closeResult: ScenarioPayrollRun, employees: CreatedEmployee[]) {
  await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${closeResult.outputBatchId}`, hrAdmin);
  await assertPageShell(page, "Payroll Outputs");
  await expect(page.getByText(runCode).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Artifact register" })).toBeVisible();
  const publishedPayslipLink = page
    .locator(".payroll-output-artifact-table tbody tr")
    .filter({ hasText: "Payslip" })
    .filter({ hasText: "Published" })
    .locator("a")
    .first();
  await expect(publishedPayslipLink).toBeVisible();
  await publishedPayslipLink.click();
  await assertPageShell(page, "Payroll Outputs");
  await expect(page.getByRole("link", { name: /Download file|Download/i }).first()).toHaveAttribute("href", /\/api\/hr-admin\/payroll-output-artifacts\/.+\/download/);

  await gotoAuthenticated(page, `/hr-admin/reports/payroll-register?q=${encodeURIComponent(runCode)}`, hrAdmin);
  await assertPageShell(page, "Payroll Register Report");
  const payrollRegister = page.getByTestId("payroll-register-report");
  await expect(payrollRegister.getByText(runCode).first()).toBeVisible();
  await expect(payrollRegister.getByRole("link", { name: /Open/i }).first()).toHaveAttribute("href", /\/hr-admin\/payroll-outputs\?batchId=.+artifactId=/);

  await gotoAuthenticated(page, `/hr-admin/reports/bank-advice?q=${encodeURIComponent(runCode)}`, hrAdmin);
  await assertPageShell(page, "Bank Advice Report");
  await expect(page.getByTestId("bank-advice-report").getByText(runCode).first()).toBeVisible();

  await gotoAuthenticated(page, `/hr-admin/reports/payslip-publication?q=${encodeURIComponent(runCode)}`, hrAdmin);
  await assertPageShell(page, "Payslip Publication Report");
  const payslipReport = page.getByTestId("payslip-publication-report");
  await expect(payslipReport.getByText(runCode).first()).toBeVisible();
  await expect(payslipReport.getByText(employees[0].code).first()).toBeVisible();

  const registerExport = await page.request.get(`/api/hr-admin/reports/payroll-register?q=${encodeURIComponent(runCode)}&format=manifest`);
  expect(registerExport.status()).toBe(200);
  expect(registerExport.headers()["x-hrms-report-key"]).toBe("payroll-register");
  const bankExport = await page.request.get(`/api/hr-admin/reports/bank-advice?q=${encodeURIComponent(runCode)}&format=manifest`);
  expect(bankExport.status()).toBe(200);
  expect(bankExport.headers()["x-hrms-report-key"]).toBe("bank-advice");
}

test.describe("Accerio September payroll real scenario certification", () => {
  test.afterAll(() => {
    console.log("Accerio September payroll phase summary");
    for (const result of phaseResults) {
      console.log(`${result.status.toUpperCase()} - ${result.phase}`);
      result.steps.forEach((step) => console.log(`  - ${step}`));
      result.notes?.forEach((note) => console.log(`  note: ${note}`));
    }
  });

  test("runs phased Accerio September payroll certification through browser", async ({ page }) => {
    test.setTimeout(1_200_000);

    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await assertPageShell(page, /People Operations Control Center|HR admin could not load/i);
    await expect(page.getByText("HR Admin").first()).toBeVisible();

    const initialBaseline = await baselineCounts(page);

    recordPhase({
      phase: "Phase 1 - Accerio HR/payroll browser prerequisites",
      status: initialBaseline.blockingMissing.length ? "blocked" : "passed",
      steps: [
        "Logged in to stage HR Admin through browser session.",
        "Verified HR Admin shell, Employees, Payroll Setup, Salary Setup, Payroll Statutory, and Payroll Inputs pages.",
        `Employee master options: ${JSON.stringify(initialBaseline.structuralCounts)}.`,
        `Payroll setup options: ${JSON.stringify(initialBaseline.payrollCounts)}.`,
        `Salary setup options: ${JSON.stringify(initialBaseline.salaryCounts)}.`,
        `Payroll input options: ${JSON.stringify(initialBaseline.inputCounts)}.`,
      ],
      notes: initialBaseline.blockingMissing.map(([key]) => `${key} has no selectable option and must be created before payroll scenario execution.`),
    });

    const suffix = Date.now().toString(36).toUpperCase();
    const org = await createOrganizationPrerequisites(page, suffix);
    const payroll = await createPayrollAndSalaryPrerequisites(page, suffix);
    recordPhase({
      phase: "Phase 2 - Accerio prerequisite masters",
      status: "passed",
      steps: [
        `Created/reused organization masters: ${org.legalEntityName}, ${org.branchName}, ${org.departmentName}, ${org.costCenterName}, ${org.designationName}, ${org.employmentTypeName}.`,
        `Created payroll calendar ${payroll.calendarCode}, September period ${payroll.periodCode}, pay group ${payroll.payGroupCode}.`,
        `Created salary structure ${payroll.salaryStructureName} with active version.`,
      ],
    });

    const postSetupBaseline = await baselineCounts(page);
    recordPhase({
      phase: "Phase 2A - Post-setup readiness baseline",
      status: postSetupBaseline.blockingMissing.length ? "blocked" : "passed",
      steps: [
        `Employee master options after setup: ${JSON.stringify(postSetupBaseline.structuralCounts)}.`,
        `Payroll setup options after setup: ${JSON.stringify(postSetupBaseline.payrollCounts)}.`,
        `Salary setup options after setup: ${JSON.stringify(postSetupBaseline.salaryCounts)}.`,
        `Payroll input options after setup: ${JSON.stringify(postSetupBaseline.inputCounts)}.`,
      ],
      notes: postSetupBaseline.blockingMissing.map(([key]) => `${key} is still missing after Phase 2 setup.`),
    });
    expect(postSetupBaseline.blockingMissing).toEqual([]);

    await gotoAuthenticated(page, "/hr-admin/employees/new", hrAdmin);
    await field(page.locator("main"), "Legal entity").selectOption({ index: 1 });
    const selectedLegalEntity = await selectedOptionText(field(page.locator("main"), "Legal entity"));
    recordPhase({
      phase: "Phase 1A - Structural compatibility sample",
      status: "passed",
      steps: [
        `Selected legal entity sample: ${selectedLegalEntity}.`,
        "Confirmed structural selectors can be operated from the browser before employee creation.",
      ],
    });

    const scenarios = scenarioEmployees(suffix);
    const createdEmployees: CreatedEmployee[] = [];
    for (const scenario of scenarios) {
      createdEmployees.push(await createScenarioEmployee(page, scenario, org));
    }
    recordPhase({
      phase: "Phase 3 - Five Accerio scenario employees",
      status: "passed",
      steps: createdEmployees.map((employee) => `${employee.code}: ${employee.expectedStory}`),
    });

    for (const employee of createdEmployees) {
      await addPrimaryBankAccount(page, employee);
      await assignPayrollAndSalary(page, employee, payroll);
    }
    recordPhase({
      phase: "Phase 4 - Employee payroll readiness attachments",
      status: "passed",
      steps: [
        "Added primary bank account for each of the five employees.",
        `Assigned all five employees to pay group ${payroll.payGroupCode}.`,
        `Assigned all five employees to salary structure ${payroll.salaryStructureName} with scenario-specific annual CTC overrides.`,
      ],
    });

    const rules = await createScenarioPayrollRules(page, suffix);
    const run = await createPayrollRunAndSnapshots(page, suffix, org, payroll, createdEmployees);
    recordPhase({
      phase: "Phase 5 - September payroll inputs and lock",
      status: "passed",
      steps: [
        `Created active scenario payroll rules: ${rules.componentCodes.join(", ")}.`,
        `Created payroll run ${run.runCode} for September 2026 and pay group ${payroll.payGroupCode}.`,
        `Created five ready payroll input snapshots for: ${createdEmployees.map((employee) => employee.code).join(", ")}.`,
        `Locked ${run.lockedCount} payroll input snapshots for calculation.`,
      ],
    });

    const closed = await closePayrollRun(page, run.runId, suffix);
    closed.runCode = run.runCode;
    recordPhase({
      phase: "Phase 6 - September payroll close and finance handoff",
      status: "passed",
      steps: [
        `Calculated draft payroll for run ${run.runCode}.`,
        `Opened, submitted, approved, and final-locked review ${closed.reviewId}.`,
        `Generated and published output batch ${closed.outputBatchId}.`,
        `Generated finance handoff ${closed.handoffId}; transmit, acknowledgement, and audit controls were exercised when enabled.`,
        `Output counts: ${closed.artifactCount} artifacts, ${closed.payslipCount} payslips, ${closed.registerCount} register(s), ${closed.publishedArtifactCount} published artifacts.`,
      ],
    });

    await validatePayrollOutputs(page, run.runCode, closed, createdEmployees);
    recordPhase({
      phase: "Phase 7 - Reports and output evidence validation",
      status: "passed",
      steps: [
        `Verified Payroll Outputs page for run ${run.runCode}.`,
        "Verified payroll register report, bank advice report, and payslip publication report with filtered run evidence.",
        "Verified payroll register and bank advice manifest export APIs return governed report headers.",
      ],
      notes: [
        "ESS payslip login was not exercised because these five scenario employees were created as HR/payroll records only; employee self-service access can be added as a separate phase if desired.",
      ],
    });
  });
});
