import type {
  HrAdminEmployeeAccessDetail,
  HrAdminEmployeeAccessWriteInput,
} from "@/lib/types";

export function employeeAccessDetailToFormValue(
  detail: HrAdminEmployeeAccessDetail,
): HrAdminEmployeeAccessWriteInput {
  return {
    username: detail.username,
    email: detail.email,
    first_name: detail.first_name,
    last_name: detail.last_name,
    display_name: detail.display_name,
    phone_number: detail.phone_number,
    is_user_active: detail.is_user_active,
    must_change_password: detail.must_change_password,
    membership_status: detail.membership_status,
    is_default_membership: detail.is_default_membership,
    role_ids: detail.role_ids,
    password: "",
  };
}
