import type { HrAdminEmployeeDetail, HrAdminEmployeeWriteInput } from "@/lib/types";

export function employeeDetailToFormValue(detail: HrAdminEmployeeDetail): HrAdminEmployeeWriteInput {
  return {
    employee_code: detail.employee_code,
    first_name: detail.first_name,
    middle_name: detail.middle_name,
    last_name: detail.last_name,
    preferred_name: detail.preferred_name,
    work_email: detail.work_email,
    personal_email: detail.personal_email,
    phone_number: detail.phone_number,
    employment_status: detail.employment_status,
    date_of_birth: detail.date_of_birth,
    date_of_joining: detail.date_of_joining,
    probation_end_date: detail.probation_end_date,
    confirmation_date: detail.confirmation_date,
    legal_entity_id: detail.legal_entity_id,
    branch_id: detail.branch_id,
    location_id: detail.location_id,
    department_id: detail.department_id,
    business_unit_id: detail.business_unit_id,
    cost_center_id: detail.cost_center_id,
    designation_id: detail.designation_id,
    grade_id: detail.grade_id,
    employment_type_id: detail.employment_type_id,
    reporting_manager_id: detail.reporting_manager_id,
  };
}

export function createEmptyEmployeeFormValue(defaultStatus: string): HrAdminEmployeeWriteInput {
  return {
    employee_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    preferred_name: "",
    work_email: "",
    personal_email: "",
    phone_number: "",
    employment_status: defaultStatus,
    date_of_birth: null,
    date_of_joining: null,
    probation_end_date: null,
    confirmation_date: null,
    legal_entity_id: null,
    branch_id: null,
    location_id: null,
    department_id: null,
    business_unit_id: null,
    cost_center_id: null,
    designation_id: null,
    grade_id: null,
    employment_type_id: null,
    reporting_manager_id: null,
  };
}
