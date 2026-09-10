import type { HrAdminOrganizationItem, HrAdminOrganizationWriteInput } from "@/lib/types";

export const ORGANIZATION_SECTION_CONFIG = {
  legal_entities: { label: "Legal Entities", singular: "Legal Entity" },
  locations: { label: "Locations", singular: "Location" },
  branches: { label: "Branches", singular: "Branch" },
  business_units: { label: "Business Units", singular: "Business Unit" },
  departments: { label: "Departments", singular: "Department" },
  cost_centers: { label: "Cost Centers", singular: "Cost Center" },
  grades: { label: "Grades", singular: "Grade" },
  designations: { label: "Designations", singular: "Designation" },
  employment_types: { label: "Employment Types", singular: "Employment Type" },
} as const;

export type OrganizationSectionKey = keyof typeof ORGANIZATION_SECTION_CONFIG;

export function isOrganizationSectionKey(value: string): value is OrganizationSectionKey {
  return value in ORGANIZATION_SECTION_CONFIG;
}

export function createEmptyOrganizationFormValue(section: OrganizationSectionKey): HrAdminOrganizationWriteInput {
  const base: HrAdminOrganizationWriteInput = {
    code: "",
    name: "",
    is_active: true,
  };

  if (section === "employment_types") {
    base.is_payroll_eligible = true;
  }

  return base;
}

export function organizationItemToFormValue(item: HrAdminOrganizationItem): HrAdminOrganizationWriteInput {
  return {
    code: item.code,
    name: item.name,
    is_active: item.is_active,
    registered_name: item.registered_name ?? "",
    country_code: item.country_code ?? "",
    timezone: item.timezone ?? "",
    primary_email: item.primary_email ?? "",
    primary_phone: item.primary_phone ?? "",
    address_line_1: item.address_line_1 ?? "",
    address_line_2: item.address_line_2 ?? "",
    city: item.city ?? "",
    state: item.state ?? "",
    postal_code: item.postal_code ?? "",
    legal_entity_id: item.legal_entity_id ?? null,
    location_id: item.location_id ?? null,
    branch_type: item.branch_type ?? "",
    parent_id: item.parent_id ?? null,
    business_unit_id: item.business_unit_id ?? null,
    level: item.level ?? null,
    grade_id: item.grade_id ?? null,
    description: item.description ?? "",
    is_payroll_eligible: item.is_payroll_eligible ?? true,
  };
}
