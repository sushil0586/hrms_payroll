# Platform Admin Task Recipes

Use these recipes when you know the operator job but are not sure which screen owns it.

## Review a new signup lead

1. Open **Platform Admin > Leads**.
2. Search by company, contact, email, or domain.
3. Open the lead details.
4. Confirm the request is legitimate.
5. Mark the lead **Reviewing** while commercial checks are in progress.
6. Mark it **Qualified** only after approval.
7. Close the lead if it should not move forward.

## Convert a qualified lead into a tenant

1. Open **Leads**.
2. Find a lead with status **Qualified**.
3. Review company name, email, phone, employee count, plan, and domain.
4. Confirm tenant code is unique and lowercase.
5. Confirm primary domain is correct.
6. Choose plan, seed pack, owner mode, setup style, data setup, and policy control.
7. Add conversion notes.
8. Click **Convert lead**.
9. Open the created tenant from **Tenants**.

## Create a tenant manually

1. Open **Tenants**.
2. Search first to avoid duplicate customer records.
3. Click **Create tenant**.
4. Enter tenant code, display name, primary domain, plan, status, and sandbox choice.
5. Save the tenant.
6. Select the tenant and open **Launch Readiness**.

## Provision the primary tenant admin

1. Open **Admin Access** for the selected tenant.
2. Add the primary admin contact if missing.
3. Confirm the email address is correct.
4. Click **Create login access**.
5. Copy the generated password only through the approved secure channel.
6. Confirm the contact shows provisioned membership.
7. Ask the customer admin to sign in and change/reset credentials as required.

## Apply a setup template

1. Open **Setup Templates**.
2. Select the tenant.
3. Choose a published template.
4. Preview adoption before applying.
5. Confirm the mode, such as copy to tenant records or upgrade existing records.
6. Apply the template.
7. Check **Launch Readiness** to confirm baseline setup is complete.

## Publish a setup template

1. Open **Setup Templates**.
2. Search for the draft pack.
3. Review the configured items.
4. Add or correct setup items.
5. Publish only when the template is ready for customer adoption.
6. Create a new version instead of editing a published baseline unexpectedly.

## Complete go-live handoff

1. Open **Launch Readiness**.
2. Confirm customer record exists.
3. Confirm setup template is applied.
4. Confirm primary admin login is usable.
5. Complete go-live handoff.
6. Activate the tenant only when all readiness gates are satisfied.

## Review platform permissions

1. Open **Permissions**.
2. Search by permission key, module, role, or label.
3. Filter by tenant-assignable or platform-only permissions.
4. Review high and critical risk items carefully.
5. Confirm default roles are appropriate.
6. Avoid exposing platform-only permissions to tenant roles.

## Investigate an operator action

1. Open **Audit Logs**.
2. Select the tenant if needed.
3. Filter by event type or search by actor, tenant, payload, or action text.
4. Open the event evidence.
5. Confirm actor, timestamp, event type, and payload.
6. Use the evidence for signoff or support investigation.
