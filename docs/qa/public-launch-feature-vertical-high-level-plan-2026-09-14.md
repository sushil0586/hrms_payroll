# Public Launch Feature Vertical High-Level Plan

Date: 2026-09-14  
Product: HRMS Payroll SaaS  
Purpose: identify the remaining feature verticals needed to move from controlled pilot-ready to public launch-ready.

## Current Position

The app is strong for a controlled pilot. Core HR, payroll, SaaS control plane, role access, reporting, export audit, control centers, and staging certification have meaningful browser coverage.

Public launch needs the remaining work to focus on repeatable customer onboarding, commercial operations, provider integrations, advanced compliance, and supportable day-2 operations. Infrastructure is tracked separately; this plan covers product/application features that can be implemented and tested in the app.

## Launch Feature Pillars

| Pillar | Goal | Launch Value | Current Direction |
| --- | --- | --- | --- |
| Public acquisition and signup | Visitors can understand the product, request access, and enter a guided sales/onboarding queue. | Converts public traffic into qualified tenants. | Complete public signup/contact flow and platform-admin approval/provisioning. |
| Tenant onboarding and first setup | New tenant can be provisioned and guided through company setup without engineering help. | Makes SaaS onboarding repeatable. | Build first-run setup checklist, guided organization setup, and admin readiness gates. |
| Role control centers | Every user lands on a dashboard that tells them what to do next. | Improves usability and reduces support load. | Continue refining platform, tenant, HR, finance, manager, employee, and support control centers. |
| Payroll compliance | HR/payroll teams can produce compliance-ready reports and e-filing packages. | Critical for payroll trust. | Deepen TDS, PF, ESIC, PT, challan, return, reconciliation, and Form 16 coverage. |
| Provider integrations | Email/SMS/storage/e-filing/accounting/bank rails are configurable and certifiable. | Enables real business execution. | Add provider setup, sandbox certification, retry, callback, and audit evidence. |
| Commercial SaaS operations | Platform can manage plans, subscriptions, limits, usage, billing requests, and tenant lifecycle. | Makes the product sellable and operable. | Connect billing/subscription lifecycle and plan enforcement end to end. |
| Data onboarding | Customers can import employees, salary structures, and organization masters safely. | Reduces onboarding friction for real tenants. | Add bulk import workbench with validation, preview, partial failure handling, and audit. |
| Support and audit | Support can help tenants safely, with scoped access and evidence. | Builds customer trust and operational control. | Expand support diagnostics, tenant trust audit, incident/SLA follow-up, and export packs. |
| Notification and communication | Users get reliable, provider-backed communication. | Makes workflows usable outside the app. | Wire email/SMS/WhatsApp provider options behind configurable credentials. |
| Mobile/PWA readiness | ESS/MSS works well on mobile browsers and can evolve into app/PWA. | Important for employees and managers. | Certify mobile responsive flows first; defer native app parity until web launch is stable. |

## Recommended Feature Order

1. Public signup to tenant provisioning.
2. Guided tenant setup and first-run readiness.
3. Bulk import and data validation workbench.
4. Compliance report and e-filing package expansion.
5. Provider integration certification center.
6. Billing, subscription, plan limits, and invoices.
7. Support/audit day-2 operations.
8. Mobile/PWA browser readiness.
9. Optional HRMS expansion modules: recruitment, performance, expenses, loans, assets, helpdesk, advanced timesheets.

## What Can Be Deferred After Public Launch

These are useful but should not block the first public release unless the target customer explicitly needs them:

- Full ATS/recruitment suite.
- Performance management.
- Employee expense management.
- Loans and advances.
- Asset management.
- Advanced project timesheets.
- Native mobile apps.
- Marketplace integrations.
- Custom report builder and BI connectors.

## Public Launch Confidence Targets

| Stage | Confidence Target | Meaning |
| --- | ---: | --- |
| Current pilot baseline | 92-95% app-code, 98% controlled pilot | Known tenant can run controlled payroll with accepted limitations. |
| After signup/provisioning and setup wizard | 86-89% public launch | New tenants can start without engineering hand-holding. |
| After bulk import and compliance package | 89-92% public launch | Real customer data and statutory expectations are covered. |
| After provider and commercial rails | 92-95% public launch | Product is sellable, supportable, and operationally controlled. |

