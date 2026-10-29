import { expect, test, type Page } from "@playwright/test";

import { documentNavigationCount, expectLocalUpdateShell, expectNoDocumentNavigation, markLocalUpdateShell } from "../helpers/local-update-contract";

test.describe.configure({ timeout: 75_000 });

async function open(page: Page, route: string, heading: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("main[data-hydrated='true']")).toBeVisible();
}

test("notifications combine every filter, reconcile read state, and retain failed drafts locally", async ({ page }) => {
  await open(page, "/ess/notifications", "Notifications");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/notifications")).json();
  const item = { ...base.items[0], id: "phase1b-notification", title: "Phase 1B filtered notification", read_at: null, status: "delivered", channel: "email", priority: "high", subject_type: "payroll_payslip" };
  await page.route("**/api/me/notifications?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: [item], total_count: 1, page: 1, page_size: 25, has_next: false, has_previous: false }) }));
  const form = page.getByRole("form", { name: "Filters" }).last();
  await form.getByLabel("Search notifications").fill("Phase 1B");
  await form.getByLabel("Delivery status").selectOption("delivered");
  await form.getByLabel("Category").selectOption("payroll_payslip");
  await form.getByLabel("Channel").selectOption("email");
  await form.getByLabel("Priority").selectOption("high");
  await form.getByLabel("Rows per page").selectOption("25");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=Phase/);
  await expect(page).toHaveURL(/status=delivered/);
  await expect(page).toHaveURL(/subject_type=payroll_payslip/);
  await expect(page.getByRole("table", { name: "Employee notifications" })).toContainText(item.title);
  await page.route("**/api/me/notifications/phase1b-notification", async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...item, read_at: body.read_at }) });
  });
  await page.getByRole("button", { name: `Review notification: ${item.title}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Mark read" }).click();
  await expect(dialog.getByRole("button", { name: "Mark unread" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("row").filter({ hasText: item.title })).toContainText("Read");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);

  await page.unroute("**/api/me/notifications?**");
  const confirmed = page.url();
  await page.route("**/api/me/notifications?**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Inbox read failed." }) }));
  const currentForm = page.getByRole("form", { name: "Filters" }).last();
  await currentForm.getByLabel("Search notifications").fill("retained notification draft");
  await currentForm.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Inbox read failed.");
  expect(page.url()).toBe(confirmed);
  await expect(page.getByRole("form", { name: "Filters" }).last().getByLabel("Search notifications")).toHaveValue("retained notification draft");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("payslip filters, selection, Back, and read receipt stay inside the workspace", async ({ page }) => {
  await open(page, "/ess/payslips", "Payslips");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/payroll-payslips")).json();
  const second = { ...base.items[0], id: "phase1b-payslip", title: "Phase 1B payslip", period_name: "September 2026", access_summary: { ...base.items[0].access_summary, is_read_acknowledged: false, read_acknowledgement_count: 0 } };
  await page.route("**/api/me/payroll-payslips?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: [base.items[0], second], total_count: 2, page: 1, page_size: 5, has_next: false, has_previous: false, summary: { ...base.summary, available_years: [2026] } }) }));
  const form = page.getByRole("form", { name: "Filters" }).last();
  await form.getByLabel("Search payslips").fill("Phase 1B");
  await form.getByLabel("Year").selectOption("2026");
  await form.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/q=Phase/);
  const row = page.getByRole("row").filter({ hasText: second.title });
  await row.getByRole("link", { name: "Select payslip" }).click();
  await expect(page).toHaveURL(/payslipId=phase1b-payslip/);
  await page.route("**/api/me/payroll-payslips/phase1b-payslip/read", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...second, access_summary: { ...second.access_summary, is_read_acknowledged: true, read_acknowledgement_count: 1 } }) }));
  await row.getByRole("button", { name: "Review payslip" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Mark as read" }).click();
  await expect(dialog.getByRole("button", { name: "Read acknowledged" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(row).toContainText("Read");
  await page.goBack({ waitUntil: "commit" });
  await expect(page).not.toHaveURL(/payslipId=phase1b-payslip/);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("request type, status, pagination, Back, and failed reads remain local", async ({ page }) => {
  await open(page, "/ess/requests", "My Requests");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/request-history?type=attendance&status=all&page=1")).json();
  const rejected = { ...base.items[0], id: "phase1b-request", status: "rejected", rejection_reason: "Phase 1B evidence rejected." };
  await page.route("**/api/me/request-history?**", (route) => { const query = new URL(route.request().url()).searchParams; const requestedPage = Number(query.get("page") || 1); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: [{ ...rejected, id: requestedPage === 1 ? rejected.id : "phase1b-request-page-2" }], total_count: 11, page: requestedPage, has_next: requestedPage === 1, has_previous: requestedPage > 1 }) }); });
  const form = page.getByRole("form", { name: "Filters" });
  await form.getByLabel("Request type").selectOption("attendance");
  await form.getByLabel("Status").selectOption("rejected");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/type=attendance/);
  await expect(page.getByRole("table", { name: "My requests" })).toContainText("rejected");
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.goBack({ waitUntil: "commit" });
  await expect(page).not.toHaveURL(/page=2/);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
  await page.unroute("**/api/me/request-history?**");
  const confirmed = page.url();
  await page.route("**/api/me/request-history?**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Request history failed." }) }));
  const currentForm = page.getByRole("form", { name: "Filters" }).last();
  await currentForm.getByLabel("Status").selectOption("approved");
  await currentForm.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Request history failed.");
  expect(page.url()).toBe(confirmed);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("profile sections, Back restoration, and profile save are local", async ({ page }) => {
  await open(page, "/ess/profile", "My Profile");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  await page.getByRole("link", { name: "Contact information" }).click();
  await expect(page).toHaveURL(/section=contact/);
  await page.route("**/api/ess/profile", async (route) => { const body = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "phase1b-profile", employee_code: "EMP-0042", full_name: "Riya Sharma", preferred_name: body.preferred_name, work_email: "riya@example.com", personal_email: body.personal_email, phone_number: body.phone_number, employment_status: "active", date_of_joining: "2024-01-01", department: "People", designation: "Manager", legal_entity: "Accerio", branch: "Bengaluru", location: "Bengaluru", reporting_manager: "Manager" }) }); });
  const form = page.locator("form.form-layout-modern");
  await form.getByLabel("Preferred name").fill("Phase 1B preferred name");
  await form.getByLabel("Personal email").fill("phase1b@example.com");
  await form.getByLabel("Phone number").fill("9876543210");
  await form.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile contact details updated.");
  await page.getByRole("link", { name: "Personal details" }).click();
  await expect(page.getByText("Phase 1B preferred name", { exact: true })).toBeVisible();
  await page.goBack({ waitUntil: "commit" });
  await expect(page).toHaveURL(/section=contact/);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("statutory filters retain confirmed state and declaration actions reconcile locally", async ({ page }) => {
  await open(page, "/ess/statutory-declarations", "Statutory Declarations");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/statutory-declarations")).json();
  let updated = false;
  let submitted = false;
  const draft = { ...base.items[0], id: "phase1b-declaration", status: "draft", status_label: "Draft", locked_at: null, tax_regime: "old", tax_regime_label: "Old Regime" };
  const alternateRegime = base.options.tax_regimes.find((option: { value: string }) => option.value === "new") ?? base.options.tax_regimes.find((option: { value: string }) => option.value !== draft.tax_regime) ?? base.options.tax_regimes[0];
  await page.route("**/api/me/statutory-declarations?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: [{ ...draft, status: submitted ? "submitted" : "draft", status_label: submitted ? "Submitted" : "Draft", tax_regime: updated ? alternateRegime.value : "old", tax_regime_label: updated ? alternateRegime.label : "Old Regime" }], total_count: 1, page: 1, page_size: 5, summary: { ...base.summary, available_financial_years: [draft.financial_year_code] } }) }));
  const form = page.getByRole("form", { name: "Filters" });
  await form.getByLabel("Search declarations").fill("Phase 1B");
  await form.getByLabel("Status").selectOption("draft");
  await form.getByLabel("Financial year").selectOption(draft.financial_year_code);
  await form.getByLabel("Rows per page").selectOption("5");
  await form.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=draft/);
  await page.route("**/api/me/statutory-declarations/phase1b-declaration", (route) => { updated = true; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...draft, tax_regime: alternateRegime.value, tax_regime_label: alternateRegime.label }) }); });
  await page.getByRole("button", { name: "Update declaration" }).click();
  const updateDialog = page.getByRole("dialog", { name: "Update declaration" });
  await updateDialog.getByLabel("Tax regime").selectOption(alternateRegime.value);
  await updateDialog.getByRole("button", { name: "Update declaration", exact: true }).click();
  await expect(updateDialog).toHaveCount(0);
  await expect(page.getByText(alternateRegime.label, { exact: true }).first()).toBeVisible();
  await page.route("**/api/me/statutory-declarations/phase1b-declaration/submit", (route) => { submitted = true; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...draft, status: "submitted", status_label: "Submitted" }) }); });
  await page.getByRole("button", { name: "Submit declaration" }).click();
  const submitDialog = page.getByRole("dialog", { name: "Submit declaration" });
  await submitDialog.getByRole("button", { name: "Submit declaration", exact: true }).click();
  await expect(submitDialog).toHaveCount(0);
  await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("statutory proof upload updates the proof register without replacing the shell", async ({ page }) => {
  await open(page, "/ess/statutory-declarations", "Statutory Declarations");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/statutory-declarations")).json();
  let uploaded = false;
  const draft = { ...base.items[0], id: "phase1b-upload-declaration", status: "draft", status_label: "Draft", locked_at: null };
  const proof = { ...draft.items[0], id: "phase1b-proof", declaration_id: draft.id, name: "Phase 1B uploaded proof", proof_status: "submitted", proof_status_label: "Submitted", declared_amount: "12500.00", verified_amount: "0.00" };
  await page.route("**/api/me/statutory-declarations?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: [{ ...draft, items: uploaded ? [...draft.items, proof] : draft.items, item_count: draft.item_count + (uploaded ? 1 : 0) }], total_count: 1, page: 1, page_size: 10 }) }));
  const filter = page.getByRole("form", { name: "Filters" });
  await filter.getByRole("button", { name: "Apply" }).click();
  await page.route("**/api/me/statutory-declarations/phase1b-upload-declaration/proof-upload", (route) => { uploaded = true; return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(proof) }); });
  await page.getByRole("button", { name: "Add proof" }).click();
  const dialog = page.getByRole("dialog", { name: "Add proof" });
  await dialog.getByLabel("Item name").fill(proof.name);
  await dialog.getByLabel("Amount").fill("12500");
  await dialog.getByLabel("Proof file").setInputFiles({ name: "phase1b-proof.pdf", mimeType: "application/pdf", buffer: Buffer.from("Phase 1B proof") });
  await dialog.getByRole("button", { name: "Upload proof" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Declared proof items" })).toContainText(proof.name);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});
