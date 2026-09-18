# Platform Admin Discovery Inventory and Certification Map

Date: 2026-09-18  
Role tested: Platform Admin  
Discovery method: running app routes, Platform Admin navigation, visible UI controls, API-backed browser workflows, and Playwright Chromium certification.

## Scope

This inventory treats the running Platform Admin application as the source of truth and maps each discovered module to routes, actions, dependencies, expected permission posture, and current certification status.

## Route Inventory

| Module | Screen | Route | Primary UI Surface | Test Status |
| --- | --- | --- | --- | --- |
| Dashboard | Platform Admin Dashboard / Control Center | `/platform-admin` | Metrics, mission queue, tenant pipeline, risk radar, activation blockers, shortcuts, evidence trail | Certified by `platform-admin-tabs-pagination-certification.spec.ts`; visual/responsive by `platform-admin-visual-accessibility-certification.spec.ts` |
| Leads | Signup requests | `/platform-admin/leads` | Lead queue, search, status filter, row status actions, lead-to-tenant conversion form | Certified by `platform-admin-tabs-pagination-certification.spec.ts`, `public-signup-to-tenant-provisioning.spec.ts`, `platform-admin-negative-security-certification.spec.ts` |
| Tenants | Customer registry | `/platform-admin/tenants` | Tenant list, search, status/plan filters, pagination, create tenant modal, tenant row navigation | Certified by tabs/pagination, CRUD/state transition, negative/security, public signup provisioning |
| Launch Readiness | Tenant launch checklist | `/platform-admin/onboarding?tenantId=...` | Guided gates, confirm setup, mark ready, activate tenant, edit tenant setup, add setup item, onboarding metadata | Certified by tabs/pagination, audit evidence, CRUD/state transition, setup-template lifecycle |
| Tenant Admin Users | Admin access | `/platform-admin/admins?tenantId=...` | Admin contacts, add/edit contact, provision tenant admin login, generated password evidence, disabled reasons | Certified by tabs/pagination, audit evidence, public signup provisioning, production onboarding proof |
| Setup Templates | Default setup / policy packs | `/platform-admin/policy-packs?tenantId=...` | Template list, filters, create template, publish, clone version, apply template, preview, compare, upgrade, item edit/delete locks | Certified by setup-template lifecycle/guardrail spec and backend tenant onboarding API tests |
| Permissions/RBAC | Permission Catalog | `/platform-admin/permissions` | Permission metrics, search/filter, edit permission dialog, tenant assignable/platform-only governance | Certified by permission catalog spec including visibility, filter, edit validation, save, persistence, restore |
| Audit Logs | Action evidence | `/platform-admin/audit-logs?tenantId=...` | Event search, event type filter, pagination, onboarding/action evidence rows | Certified by tabs/pagination and audit evidence certification |

## Detailed Module Inventory

| Module | Actions / Controls Discovered | Dependencies | Expected Permissions | Current Certification |
| --- | --- | --- | --- | --- |
| Dashboard | Open leads, create tenant, create admin access, setup templates, ops health, resilience, resolve risk cards, review stale tenants, open evidence | Summary API, tenant queue, lead queue, stale onboarding list | Platform Admin only | Page load, navigation, shortcuts, responsive/no-overflow covered |
| Leads | Search, status filter, Reviewing, Qualified, Close, convert lead to tenant, conversion notes, seed pack, owner/setup/data/policy styles, sandbox flag | Public lead API, tenant create API, onboarding metadata API | Platform Admin only; non-platform roles denied | Positive and negative browser coverage exists; close confirmation covered indirectly by action controls |
| Tenants | Search, status filter, plan filter, pagination, create tenant modal, browser validation, duplicate code denial, row open tenant workflow | Tenant API, onboarding record creation | Platform Admin only; tenant data must not appear across tenants | Create, validation, duplicate, pagination, filters, direct URL covered |
| Launch Readiness | Guided checklist links, confirm setup, mark ready, activate, disabled reasons, edit tenant setup, add template item, onboarding metadata save | Tenant selected; adopted setup template for setup confirmation; primary admin for handoff/activation | Platform Admin only; gate APIs fail closed | Gate disabled states, direct API denial, state transitions, audit evidence covered |
| Tenant Admin Users | Add contact modal, edit contact inline, provision login, role selection, password/must-change, membership status, primary contact requirement | Selected tenant; admin contact before login; unique username | Platform Admin only; creates tenant-scoped membership | Add/contact modal validation and provisioning flows covered; generated credential behavior covered in onboarding specs |
| Setup Templates | Search/filter/pagination, create draft, guided item authoring, advanced JSON override, duplicate item guard, missing dependency guard, publish, header-only confirmation, clone v2, edit draft item, delete draft item, published locks, preview adoption, apply, compare, upgrade | Tenant for adoption; published template for apply/compare; draft template for item mutations; runtime models for clone-to-tenant records | Platform Admin only; immutable published templates | Lifecycle and guardrail browser tests passed; backend API tests passed |
| Permissions/RBAC | Search, assignable filter, risk filter, edit dialog, immutable key, required label validation, save metadata, refresh persistence, restore original | Permission catalog DB sync/fallback; platform permission API | Platform Admin only; platform-only permissions not tenant assignable | Visibility/filter/edit/persistence certified in Chromium |
| Audit Logs | Search, event type filter, pagination, event row evidence | Selected tenant onboarding events | Platform Admin only; scoped by selected tenant | Search/filter/pagination certified; evidence generated by tenant/setup/admin flows |

## Existing Playwright Coverage Map

| Spec | Coverage |
| --- | --- |
| `platform-admin-tabs-pagination-certification.spec.ts` | Main tab routes, controls, filters, pagination, dialogs, responsive screenshots |
| `platform-admin-negative-security-certification.spec.ts` | Wrong-role denial, unauthenticated denial, invalid fields, duplicates, early activation gate failures |
| `platform-admin-crud-state-transition-certification.spec.ts` | Tenant CRUD/state transitions |
| `platform-admin-audit-evidence-certification.spec.ts` | Audit evidence across tenant/admin/setup actions |
| `platform-admin-setup-templates-lifecycle-certification.spec.ts` | Setup template lifecycle, versioning, adoption, upgrade, validation guardrails, published locks |
| `platform-admin-permission-catalog-certification.spec.ts` | Permission catalog visibility, search/filter, protected permissions, edit/save/persistence/restore |
| `platform-admin-visual-accessibility-certification.spec.ts` | Desktop/mobile rendering, route headings, no horizontal overflow |
| `public-signup-to-tenant-provisioning.spec.ts` | Public lead to tenant/admin provisioning path |
| `production-platform-admin-onboarding-flows.spec.ts` | Multi-tenant onboarding proof through browser |
| `pilot-credential-matrix-certification.spec.ts` and security isolation specs | Cross-role access boundaries |

## Coverage Gaps Remaining

| Gap | Severity | Recommendation |
| --- | --- | --- |
| Full staging run for every Platform Admin spec after deployment | High | Run all Platform Admin specs against staging with live deployed build and DB migrations applied |
| Tenant isolation with two selected tenants inside Platform Admin UI | High | Add focused browser test verifying tenant A events/admin contacts/templates do not appear under tenant B |
| Audit log deep content assertions for every mutation type | Medium | Extend audit evidence spec to assert exact event payload excerpts for lead convert, template clone, upgrade apply, permission edit |
| Keyboard-only workflow for every modal/dialog | Medium | Add keyboard navigation test for create tenant, add contact, confirm action, permission edit |
| Download/export/import behavior | Low currently | No Platform Admin import/export action found in current screens; retest if such controls are added |

## Current Status

Platform Admin has meaningful browser certification across all discovered primary modules. The strongest coverage is now in tenant onboarding, setup templates, permissions/RBAC, state gates, and negative access controls. Remaining work is staging-wide regression, deeper tenant isolation assertions, and audit payload depth.
