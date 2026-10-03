# Tenant Settings

Tenant Settings shows governed account profile values and provides a controlled way to request profile changes. It is a review and request page, not a free-form editor for sensitive tenant configuration.

![Tenant settings](../assets/screenshots/tenant-admin/settings.png)

## On This Page

- [When to use this page](#when-to-use-this-page)
- [Page sections](#page-sections)
- [Screen labels to recognize](#screen-labels-to-recognize)
- [Controls and actions](#controls-and-actions)
- [Example: review tenant profile before launch](#example-review-tenant-profile-before-launch)
- [Example: request an account profile change](#example-request-an-account-profile-change)
- [Validation and negative cases](#validation-and-negative-cases)
- [Signoff checklist](#signoff-checklist)

## When To Use This Page

- You need to review tenant name, code, domain, timezone, or account profile.
- You need to confirm which setup template or baseline applies.
- You need to request a governed profile change.
- You need to explain why a setting is not directly editable.

## Page Sections

| Section | Meaning | What to check |
| --- | --- | --- |
| Tenant profile | Core tenant identity and account values. | Tenant name, tenant code, primary domain, and timezone should be correct. |
| Setup baseline | Published setup pack or template context. | Confirms which baseline was applied during onboarding. |
| Account controls | Governed controls and readiness state. | Values may require a change request rather than direct edit. |
| Profile change request | Routes sensitive change requests through Plan and Billing governance. | Request should include reason and expected value. |

## Screen Labels To Recognize

| Screen label | Meaning |
| --- | --- |
| Tenant account | Core account identity, domain, setup profile, and account metadata. |
| Readiness checks | Account setting checks that influence launch and operational readiness. |
| Published setup | The setup pack or baseline configuration currently applied to the tenant. |

## Controls And Actions

| Control | Meaning | Expected result |
| --- | --- | --- |
| Dashboard | Returns to account posture. | User can re-check readiness. |
| Setup Guide | Opens launch setup checklist. | User can verify if settings are blocking launch. |
| Request profile change | Opens a governed change request. | Change is tracked and auditable. |

## Example: Review Tenant Profile Before Launch

1. Open **Tenant Admin > Settings**.
2. Confirm tenant display name.
3. Confirm tenant code.
4. Confirm primary domain.
5. Confirm timezone and locale.
6. Confirm setup baseline or published template.
7. If anything is wrong, use profile change request instead of editing directly.

## Example: Request An Account Profile Change

1. Open **Settings**.
2. Identify the field that needs change.
3. Choose **Request profile change**.
4. Enter the current value, requested value, and reason.
5. Submit the request.
6. Track the request from **Plan and Billing**.
7. Verify the setting after the request is applied.

## Validation And Negative Cases

| Case | Expected behavior | What to do |
| --- | --- | --- |
| Field is read-only | Sensitive settings are governed. | Submit a profile change request. |
| Domain is wrong | Login, email, or workspace matching may be affected. | Request a profile change with the correct domain. |
| Timezone is wrong | Dates, audit, payroll, and reminders may be confusing. | Request correction before launch. |
| Setup template looks wrong | Tenant may have inherited an incorrect baseline. | Review Setup Guide and contact platform/admin owner. |
| Change request action disabled | User may lack permission. | Ask a tenant admin with account-change rights. |

## Signoff Checklist

- Tenant display name and code are correct.
- Primary domain is correct.
- Timezone is correct for the customer.
- Setup baseline is understood.
- Governed changes are requested through the change workflow.
- Profile changes are auditable.

## Related Guides

- [Plan and Billing](plan.md)
- [Setup Guide](setup-guide.md)
- [Trust Audit](trust-audit.md)
