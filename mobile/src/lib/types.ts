export type EmployeeProfile = {
  id: string;
  employee_code: string;
  full_name: string;
  preferred_name: string;
  work_email: string;
  personal_email: string;
  phone_number: string;
  employment_status: string;
  date_of_joining: string | null;
  department: string | null;
  designation: string | null;
  legal_entity: string | null;
  branch: string | null;
  location: string | null;
  reporting_manager: string | null;
};

export type LeaveBalance = {
  leave_type: string;
  policy_name: string;
  closing_balance: string;
  consumed_amount: string;
  reserved_amount: string;
};

export type LeaveTypeOption = {
  id: string;
  code: string;
  name: string;
  short_code: string;
  category: string;
  unit: string;
  requires_attachment: boolean;
  allow_negative_balance: boolean;
};

export type LeaveRequestItem = {
  id: string;
  leave_type: string;
  leave_type_code: string;
  policy_name: string | null;
  status: string;
  start_date: string;
  end_date: string;
  start_day_portion: string;
  end_day_portion: string;
  requested_units: string;
  approved_units: string;
  reason: string;
  manager_comment?: string;
  rejection_reason?: string;
  workflow_reference: string;
  applied_at: string | null;
  approved_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string;
  employee_id?: string;
  employee_code?: string;
  employee_name?: string;
  department?: string | null;
  designation?: string | null;
};

export type AttendanceRegularizationItem = {
  id: string;
  attendance_record_id: string;
  attendance_date: string;
  current_status: string;
  requested_status: string;
  shift: string | null;
  requested_check_in_at: string | null;
  requested_check_out_at: string | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  status: string;
  reason: string;
  manager_comment?: string;
  rejection_reason?: string;
  workflow_reference: string;
  applied_at: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at?: string;
  employee_id?: string;
  employee_code?: string;
  employee_name?: string;
  department?: string | null;
  designation?: string | null;
};

export type AttendanceRecordOption = {
  id: string;
  attendance_date: string;
  status: string;
  shift: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  is_regularized: boolean;
  is_locked: boolean;
  late_minutes: number;
};

export type LeaveSummary = {
  period_year: number;
  pending_requests_count: number;
  balances: LeaveBalance[];
  recent_requests: LeaveRequestItem[];
};

export type AttendanceSummary = {
  today: {
    date: string;
    status: string;
    shift: string | null;
    check_in_at: string | null;
    check_out_at: string | null;
  };
  month_to_date: {
    present_days: number;
    absent_days: number;
    half_days: number;
    late_days: number;
    work_duration_hours: string;
    overtime_hours: string;
  };
  pending_regularizations_count: number;
};

export type EmployeeDashboard = {
  profile: EmployeeProfile;
  leave: LeaveSummary;
  attendance: AttendanceSummary;
};

export type ManagerTeamSummary = {
  team_size: number;
  employees_on_leave_today: number;
  pending_leave_approvals_count: number;
  pending_attendance_regularizations_count: number;
  attendance_exceptions_today: number;
};

export type SessionMembership = {
  id: string;
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  employee_code: string;
  status: string;
  is_default: boolean;
};

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  must_change_password: boolean;
  default_membership: SessionMembership | null;
  memberships: SessionMembership[];
};

export type MutationResult = {
  id: string;
  status: string;
  workflow_reference: string;
};
