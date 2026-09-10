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

export type HrAdminEmployeeListItem = {
  id: string;
  employee_code: string;
  full_name: string;
  work_email: string;
  phone_number: string;
  employment_status: string;
  date_of_joining: string | null;
  department: string | null;
  business_unit: string | null;
  legal_entity: string | null;
  cost_center: string | null;
  designation: string | null;
  grade: string | null;
  employment_type: string | null;
  branch: string | null;
  location: string | null;
  reporting_manager: string | null;
  has_access: boolean;
  membership_status: string;
  assigned_role_count: number;
  direct_reports_count: number;
};

export type HrAdminEmployeeDetail = {
  id: string;
  employee_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  preferred_name: string;
  work_email: string;
  personal_email: string;
  phone_number: string;
  employment_status: string;
  date_of_birth: string | null;
  date_of_joining: string | null;
  probation_end_date: string | null;
  confirmation_date: string | null;
  legal_entity_id: string | null;
  legal_entity: string | null;
  branch_id: string | null;
  branch: string | null;
  location_id: string | null;
  location: string | null;
  department_id: string | null;
  department: string | null;
  business_unit_id: string | null;
  business_unit: string | null;
  cost_center_id: string | null;
  cost_center: string | null;
  designation_id: string | null;
  designation: string | null;
  grade_id: string | null;
  grade: string | null;
  employment_type_id: string | null;
  employment_type: string | null;
  reporting_manager_id: string | null;
  reporting_manager: string | null;
  has_access: boolean;
  membership_status: string;
  assigned_role_count: number;
  direct_reports_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminOptionItem = {
  id: string;
  name: string;
  legal_entity_id?: string | null;
  location_id?: string | null;
  business_unit_id?: string | null;
  grade_id?: string | null;
};

export type HrAdminManagerOption = HrAdminOptionItem & {
  employee_code: string;
};

export type HrAdminEmploymentStatusOption = {
  value: string;
  label: string;
};

export type HrAdminEmployeeFormOptions = {
  employment_statuses: HrAdminEmploymentStatusOption[];
  legal_entities: HrAdminOptionItem[];
  branches: HrAdminOptionItem[];
  locations: HrAdminOptionItem[];
  departments: HrAdminOptionItem[];
  business_units: HrAdminOptionItem[];
  cost_centers: HrAdminOptionItem[];
  designations: HrAdminOptionItem[];
  grades: HrAdminOptionItem[];
  employment_types: HrAdminOptionItem[];
  managers: HrAdminManagerOption[];
};

export type HrAdminEmployeeWriteInput = {
  employee_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  preferred_name: string;
  work_email: string;
  personal_email: string;
  phone_number: string;
  employment_status: string;
  date_of_birth: string | null;
  date_of_joining: string | null;
  probation_end_date: string | null;
  confirmation_date: string | null;
  legal_entity_id: string | null;
  branch_id: string | null;
  location_id: string | null;
  department_id: string | null;
  business_unit_id: string | null;
  cost_center_id: string | null;
  designation_id: string | null;
  grade_id: string | null;
  employment_type_id: string | null;
  reporting_manager_id: string | null;
};

export type HrAdminRoleOption = {
  id: string;
  code: string;
  name: string;
};

export type HrAdminMembershipStatusOption = {
  value: string;
  label: string;
};

export type HrAdminEmployeeAccessOptions = {
  membership_statuses: HrAdminMembershipStatusOption[];
  roles: HrAdminRoleOption[];
};

export type HrAdminEmployeeAccessRole = HrAdminRoleOption & {
  is_primary: boolean;
};

export type HrAdminEmployeeAccessDetail = {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  has_access: boolean;
  membership_id: string | null;
  user_id: string | null;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone_number: string;
  is_user_active: boolean;
  must_change_password: boolean;
  membership_status: string;
  is_default_membership: boolean;
  role_ids: string[];
  roles: HrAdminEmployeeAccessRole[];
  generated_password?: string | null;
  password_was_reset?: boolean;
};

export type HrAdminEmployeeAccessWriteInput = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone_number: string;
  is_user_active: boolean;
  must_change_password: boolean;
  membership_status: string;
  is_default_membership: boolean;
  role_ids: string[];
  password: string;
};

export type HrAdminEmployeeBankAccount = {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type HrAdminEmployeeBankAccountWriteInput = {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  is_primary: boolean;
};

export type HrAdminOrganizationItem = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  country_code?: string;
  timezone?: string;
  city?: string;
  state?: string;
  legal_entity?: string;
  location?: string | null;
  branch_type?: string;
  parent?: string | null;
  business_unit?: string | null;
  level?: number | null;
  grade?: string | null;
  is_payroll_eligible?: boolean;
  registered_name?: string;
  primary_email?: string;
  primary_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  legal_entity_id?: string | null;
  location_id?: string | null;
  parent_id?: string | null;
  business_unit_id?: string | null;
  grade_id?: string | null;
  description?: string;
  linked_employees_count?: number;
  child_count?: number;
  branches_count?: number;
  departments_count?: number;
  designations_count?: number;
  cost_centers_count?: number;
};

export type HrAdminOrganizationFormOptions = {
  legal_entities: HrAdminOptionItem[];
  locations: HrAdminOptionItem[];
  business_units: HrAdminOptionItem[];
  departments: HrAdminOptionItem[];
  grades: HrAdminOptionItem[];
};

export type HrAdminOrganizationWriteInput = {
  code: string;
  name: string;
  is_active: boolean;
  registered_name?: string;
  country_code?: string;
  timezone?: string;
  primary_email?: string;
  primary_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  legal_entity_id?: string | null;
  location_id?: string | null;
  branch_type?: string;
  parent_id?: string | null;
  business_unit_id?: string | null;
  level?: number | null;
  grade_id?: string | null;
  description?: string;
  is_payroll_eligible?: boolean;
};

export type HrAdminEnumOption = {
  value: string;
  label: string;
};

export type HrAdminGovernanceFields = {
  source_kind?: string;
  source_pack_code?: string;
  source_item_key?: string;
  source_version?: number;
  delegation_mode?: string;
  managed_by_platform?: boolean;
  platform_locked_fields?: string[];
  governance_state?: string;
  governance_label?: string;
  edit_mode?: string;
  can_edit_directly?: boolean;
  can_detach_from_platform?: boolean;
  requires_platform_change?: boolean;
  is_detached_clone?: boolean;
  locked_field_count?: number;
  lineage_summary?: string;
};

export type HrAdminLeaveType = HrAdminGovernanceFields & {
  id: string;
  code: string;
  name: string;
  short_code: string;
  category: string;
  unit: string;
  color_code: string;
  description: string;
  is_active: boolean;
  requires_attachment: boolean;
  allow_negative_balance: boolean;
  is_approval_required: boolean;
};

export type HrAdminLeaveTypeWriteInput = {
  code: string;
  name: string;
  short_code: string;
  category: string;
  unit: string;
  color_code: string;
  description: string;
  is_active: boolean;
  requires_attachment: boolean;
  allow_negative_balance: boolean;
  is_approval_required: boolean;
};

export type HrAdminAttendancePolicy = HrAdminGovernanceFields & {
  id: string;
  code: string;
  name: string;
  status: string;
  attendance_unit: string;
  default_shift_id: string | null;
  default_shift: string | null;
  holiday_calendar_id: string | null;
  holiday_calendar: string | null;
  full_day_min_hours: string;
  half_day_min_hours: string;
  late_mark_after_minutes: number;
  max_late_marks_in_period: number;
  overtime_threshold_minutes: number;
  allow_manual_entry: boolean;
  allow_web_checkin: boolean;
  allow_mobile_checkin: boolean;
  allow_geofenced_checkin: boolean;
  allow_regularization: boolean;
  require_regularization_reason: boolean;
  config_snapshot: HrAdminAttendancePolicyAdvancedConfig;
};

export type HrAdminAttendancePolicyDerivationConfig = {
  enabled: boolean;
  auto_mark_holiday: boolean;
  auto_mark_weekly_off: boolean;
  missing_punch_status: "unknown" | "absent";
  late_status_mode: "present" | "late";
  derive_overtime: boolean;
};

export type HrAdminAttendancePolicyAdvancedConfig = {
  derivation: HrAdminAttendancePolicyDerivationConfig;
};

export type HrAdminAttendancePolicyPreview = {
  current_resolved_policy_id?: string | null;
  current_resolved_policy_name?: string | null;
  current_assignment_id?: string | null;
  current_assignment_priority?: number | null;
  current_assignment_scope?: string[];
  draft_policy_matches_current_resolution?: boolean;
  resolved_config: HrAdminAttendancePolicyAdvancedConfig;
  derived_status: string;
  resolved_shift_id?: string | null;
  resolved_shift_name?: string | null;
  matched_holiday_id?: string | null;
  matched_holiday_name?: string | null;
  matched_holiday_type?: string | null;
  work_duration_hours: string;
  overtime_hours: string;
  late_minutes: number;
  early_exit_minutes: number;
};

export type HrAdminAttendancePolicyWriteInput = {
  code: string;
  name: string;
  status: string;
  attendance_unit: string;
  default_shift_id: string | null;
  holiday_calendar_id: string | null;
  full_day_min_hours: string;
  half_day_min_hours: string;
  late_mark_after_minutes: number;
  max_late_marks_in_period: number;
  overtime_threshold_minutes: number;
  allow_manual_entry: boolean;
  allow_web_checkin: boolean;
  allow_mobile_checkin: boolean;
  allow_geofenced_checkin: boolean;
  allow_regularization: boolean;
  require_regularization_reason: boolean;
  config_snapshot: HrAdminAttendancePolicyAdvancedConfig;
};

export type HrAdminShift = HrAdminGovernanceFields & {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  working_hours: string;
  break_minutes: number;
  grace_in_minutes: number;
  grace_out_minutes: number;
  is_night_shift: boolean;
  is_flexible: boolean;
  weekly_off_days: string[];
  is_active: boolean;
};

export type HrAdminEmployeeShiftAssignment = {
  id: string;
  employee_id: string;
  employee: string;
  employee_code: string;
  shift_id: string;
  shift: string;
  assignment_kind: "fixed" | "weekly_rotation" | "temporary_override";
  effective_from: string;
  effective_to: string | null;
  is_primary: boolean;
  config_snapshot?: {
    rotation: {
      anchor_date: string | null;
      entries: Array<{
        position: number;
        shift_id: string;
        span_days: number;
      }>;
    };
  };
  scope_labels?: string[];
  conflict_count?: number;
  has_blocking_conflict?: boolean;
  conflict_summary?: string;
};

export type HrAdminEmployeeShiftAssignmentWriteInput = {
  employee_id: string | null;
  shift_id: string | null;
  assignment_kind: "fixed" | "weekly_rotation" | "temporary_override";
  effective_from: string;
  effective_to: string | null;
  is_primary: boolean;
  config_snapshot: {
    rotation: {
      anchor_date: string | null;
      entries: Array<{
        position: number;
        shift_id: string | null;
        span_days: number;
      }>;
    };
  };
};

export type HrAdminEmployeeShiftAssignmentConflictItem = {
  assignment_id: string;
  shift_id: string;
  shift_name: string;
  assignment_kind: string;
  effective_from: string;
  effective_to: string | null;
  is_primary: boolean;
  overlap_kind: string;
  is_exact_window: boolean;
  is_primary_conflict: boolean;
};

export type HrAdminEmployeeShiftAssignmentConflictCheck = {
  has_conflicts: boolean;
  has_blocking_conflict: boolean;
  summary: string;
  candidate_scope: string[];
  conflicts: HrAdminEmployeeShiftAssignmentConflictItem[];
};

export type HrAdminEmployeeShiftAssignmentResolution = {
  has_resolution: boolean;
  employee_id: string;
  employee_name: string;
  attendance_date: string;
  end_date?: string | null;
  shift_id: string | null;
  shift_name: string | null;
  assignment_id: string | null;
  assignment_kind?: string | null;
  scope_labels: string[];
  sequence_summary?: string | null;
  config_snapshot?: {
    rotation: {
      anchor_date: string | null;
      entries: Array<{
        position: number;
        shift_id: string;
        span_days: number;
      }>;
    };
  };
  sequence?: Array<{
    attendance_date: string;
    assignment_id: string | null;
    assignment_kind: string | null;
    shift_id: string | null;
    shift_name: string | null;
    sequence_summary: string;
  }>;
  summary: string;
};

export type HrAdminShiftRosterTemplate = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "draft" | "published" | "locked";
  shift_id: string;
  shift: string;
  assignment_kind: "fixed" | "weekly_rotation" | "temporary_override";
  config_snapshot?: {
    rotation: {
      anchor_date: string | null;
      entries: Array<{
        position: number;
        shift_id: string;
        span_days: number;
      }>;
    };
  };
};

export type HrAdminShiftRosterTemplateWriteInput = {
  code: string;
  name: string;
  description: string;
  status: "draft" | "published" | "locked";
  shift_id: string | null;
  assignment_kind: "fixed" | "weekly_rotation" | "temporary_override";
  config_snapshot: {
    rotation: {
      anchor_date: string | null;
      entries: Array<{
        position: number;
        shift_id: string | null;
        span_days: number;
      }>;
    };
  };
};

export type HrAdminShiftRosterTemplateRolloutResult = {
  rollout_id?: string | null;
  template_id: string;
  template_name: string;
  target_count: number;
  created_count: number;
  skipped_count: number;
  has_blocking_conflicts: boolean;
  summary: string;
  items: Array<{
    employee_id: string;
    employee_name: string;
    employee_code: string;
    status: string;
    reason: string;
    assignment_id: string | null;
  }>;
};

export type HrAdminShiftRosterRollout = {
  id: string;
  template_id: string;
  template_name: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
  is_primary: boolean;
  target_count: number;
  created_count: number;
  skipped_count: number;
  summary: string;
  created_at: string;
  scope_labels: string[];
};

export type HrAdminShiftWriteInput = {
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  working_hours: string;
  break_minutes: number;
  grace_in_minutes: number;
  grace_out_minutes: number;
  is_night_shift: boolean;
  is_flexible: boolean;
  weekly_off_days: string[];
  is_active: boolean;
};

export type HrAdminHoliday = {
  id?: string;
  date: string;
  name: string;
  description: string;
  holiday_type: string;
  is_optional: boolean;
};

export type HrAdminHolidayCalendar = HrAdminGovernanceFields & {
  id: string;
  code: string;
  name: string;
  legal_entity_id: string | null;
  legal_entity: string | null;
  branch_id: string | null;
  branch: string | null;
  location_id: string | null;
  location: string | null;
  year: number;
  is_active: boolean;
  holidays: HrAdminHoliday[];
};

export type HrAdminHolidayCalendarWriteInput = {
  code: string;
  name: string;
  legal_entity_id: string | null;
  branch_id: string | null;
  location_id: string | null;
  year: number | null;
  is_active: boolean;
  holidays: HrAdminHoliday[];
};

export type HrAdminAttendanceRecord = {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  attendance_date: string;
  status: string;
  source: string;
  shift_id: string | null;
  shift: string | null;
  holiday_id: string | null;
  holiday: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  work_duration_hours: string;
  overtime_hours: string;
  late_minutes: number;
  early_exit_minutes: number;
  is_regularized: boolean;
  is_locked: boolean;
  notes: string;
};

export type HrAdminAttendanceRecordListResponse = {
  items: HrAdminAttendanceRecord[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminAttendanceRecordWriteInput = {
  status: string;
  source: string;
  shift_id: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  work_duration_hours: string;
  overtime_hours: string;
  late_minutes: number;
  early_exit_minutes: number;
  is_regularized: boolean;
  is_locked: boolean;
  notes: string;
};

export type HrAdminAttendanceRecordBulkActionInput = {
  action: "lock" | "unlock" | "set_status" | "mark_regularized" | "clear_regularized";
  record_ids: string[];
  status?: string;
};

export type HrAdminAttendanceOperationOptions = {
  attendance_statuses: HrAdminEnumOption[];
  attendance_sources: HrAdminEnumOption[];
  regularization_statuses: HrAdminEnumOption[];
  legal_entities: HrAdminOptionItem[];
  branches: HrAdminOptionItem[];
  locations: HrAdminOptionItem[];
  employees: HrAdminOptionItem[];
  shifts: HrAdminOptionItem[];
  holiday_calendars: HrAdminOptionItem[];
};

export type HrAdminLeaveApprovalRoute =
  | "manager_only"
  | "manager_then_second_level"
  | "manager_then_hr"
  | "manager_second_level_hr";

export type HrAdminLeavePolicyApprovalConfig = {
  default_route: HrAdminLeaveApprovalRoute;
  escalation_route: HrAdminLeaveApprovalRoute | null;
  escalate_when_units_gte: string | null;
  second_level_owner_employee_id: string | null;
  hr_owner_employee_id: string | null;
};

export type HrAdminLeavePolicyEvidenceConfig = {
  attachment_required: boolean;
  attachment_label: string;
  required_when_units_gte: string | null;
  medical_certificate_when_units_gte: string | null;
  approval_route_when_evidence_required: HrAdminLeaveApprovalRoute | null;
};

export type HrAdminLeavePolicyEntitlementConfig = {
  grant_mode: "upfront" | "scheduled";
  proration_mode: "none" | "by_join_month";
  policy_year_start_month: number;
  policy_year_start_day: number;
  carry_forward_mode: "none" | "limited";
  carry_forward_cap: string | null;
  encashment_allowed: boolean;
  encashment_cap: string | null;
  probation_accrual_mode: "accrue" | "defer";
};

export type HrAdminLeavePolicyOperationsConfig = {
  reviewer_employee_id: string | null;
  approval_required_for_encashment: boolean;
  approval_required_for_debit_adjustment: boolean;
  credit_adjustment_requires_approval_over_units: string | null;
  debit_adjustment_requires_approval_over_units: string | null;
  encashment_requires_approval_over_units: string | null;
};

export type HrAdminLeavePolicyLifecycleConfig = {
  allow_employee_withdraw_pending: boolean;
  withdraw_notice_hours_before_start: string | null;
  withdraw_requires_attachment: boolean;
  withdraw_attachment_label: string;
  allow_employee_cancel_approved: boolean;
  cancel_approved_requires_reapproval: boolean;
  cancel_approval_route: HrAdminLeaveApprovalRoute | null;
  cancel_notice_hours_before_start: string | null;
  cancel_requires_attachment: boolean;
  cancel_attachment_label: string;
};

export type HrAdminLeavePolicyHolidayGovernanceConfig = {
  enabled: boolean;
  allowed_holiday_types: string[];
  require_matching_holiday_dates: boolean;
  max_paid_units_per_period: string | null;
  count_pending_requests_towards_cap: boolean;
  paid_cap_exhaustion_action: "block";
};

export type HrAdminLeavePolicyAdvancedConfig = {
  version: number;
  approval: HrAdminLeavePolicyApprovalConfig;
  evidence: HrAdminLeavePolicyEvidenceConfig;
  entitlement: HrAdminLeavePolicyEntitlementConfig;
  operations: HrAdminLeavePolicyOperationsConfig;
  lifecycle: HrAdminLeavePolicyLifecycleConfig;
  holiday_governance: HrAdminLeavePolicyHolidayGovernanceConfig;
};

export type HrAdminLeavePolicyEntitlementPreview = {
  policy_period_year: number;
  policy_year_start: string;
  policy_year_end: string;
  prorated_entitlement: string;
  projected_accrued_amount: string;
  projected_carry_forward_amount: string;
};

export type HrAdminLeavePolicyPreviewStep = {
  step_order: number;
  name: string;
  actor_type: string;
  actor_identifier: string;
  actor_name: string;
};

export type HrAdminLeavePolicyPreview = {
  approval_route: string;
  required_attachment_label?: string | null;
  required_attachment_reason?: string | null;
  current_resolved_policy_id?: string | null;
  current_resolved_policy_name?: string | null;
  current_assignment_id?: string | null;
  current_assignment_priority?: number | null;
  current_assignment_scope?: string[];
  draft_policy_matches_current_resolution?: boolean;
  steps: HrAdminLeavePolicyPreviewStep[];
  resolved_config: HrAdminLeavePolicyAdvancedConfig;
  entitlement_preview: HrAdminLeavePolicyEntitlementPreview;
};

export type HrAdminLeavePolicy = HrAdminGovernanceFields & {
  id: string;
  leave_type_id: string;
  leave_type: string;
  code: string;
  name: string;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  accrual_frequency: string;
  annual_entitlement: string;
  max_carry_forward: string;
  max_consecutive_days: string | null;
  min_days_per_request: string;
  notice_days_required: number;
  allow_half_day: boolean;
  allow_backdated_application: boolean;
  allow_weekend_holiday_overlap: boolean;
  sandwich_rule_enabled: boolean;
  is_probation_eligible: boolean;
  gender_restriction: string;
  marital_status_restriction: string;
  minimum_service_days: number;
  config_snapshot: HrAdminLeavePolicyAdvancedConfig;
};

export type HrAdminLeavePolicyWriteInput = {
  leave_type_id: string | null;
  code: string;
  name: string;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  accrual_frequency: string;
  annual_entitlement: string;
  max_carry_forward: string;
  max_consecutive_days: string | null;
  min_days_per_request: string;
  notice_days_required: number;
  allow_half_day: boolean;
  allow_backdated_application: boolean;
  allow_weekend_holiday_overlap: boolean;
  sandwich_rule_enabled: boolean;
  is_probation_eligible: boolean;
  gender_restriction: string;
  marital_status_restriction: string;
  minimum_service_days: number;
  config_snapshot: HrAdminLeavePolicyAdvancedConfig;
};

export type HrAdminScopedAssignment = {
  id: string;
  policy_id: string;
  policy_name: string;
  leave_type_id?: string | null;
  leave_type_name?: string | null;
  legal_entity_id: string | null;
  legal_entity: string | null;
  branch_id: string | null;
  branch: string | null;
  location_id?: string | null;
  location?: string | null;
  department_id: string | null;
  department: string | null;
  grade_id: string | null;
  grade: string | null;
  employment_type_id: string | null;
  employment_type: string | null;
  employee_id: string | null;
  employee: string | null;
  priority: number;
  is_active: boolean;
  scope_labels?: string[];
  conflict_count?: number;
  has_blocking_conflict?: boolean;
  conflict_summary?: string;
};

export type HrAdminLeavePolicyAssignmentWriteInput = {
  leave_policy_id: string | null;
  legal_entity_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  grade_id: string | null;
  employment_type_id: string | null;
  employee_id: string | null;
  priority: number;
  is_active: boolean;
};

export type HrAdminLeavePolicyAssignmentConflictItem = {
  assignment_id: string;
  policy_id: string;
  policy_name: string;
  leave_type_id: string;
  leave_type_name: string;
  priority: number;
  scope_labels: string[];
  overlap_kind: string;
  priority_effect: string;
  is_exact_scope: boolean;
  is_same_priority: boolean;
};

export type HrAdminLeavePolicyAssignmentConflictCheck = {
  has_conflicts: boolean;
  has_blocking_conflict: boolean;
  summary: string;
  candidate_scope: string[];
  conflicts: HrAdminLeavePolicyAssignmentConflictItem[];
};

export type HrAdminLeavePolicyAssignmentResolution = {
  has_resolution: boolean;
  employee_id: string;
  employee_name: string;
  leave_type_id: string;
  leave_type_name: string;
  policy_id: string | null;
  policy_name: string | null;
  assignment_id: string | null;
  priority: number | null;
  scope_labels: string[];
  summary: string;
};

export type HrAdminAttendancePolicyAssignmentWriteInput = {
  attendance_policy_id: string | null;
  legal_entity_id: string | null;
  branch_id: string | null;
  location_id: string | null;
  department_id: string | null;
  grade_id: string | null;
  employment_type_id: string | null;
  employee_id: string | null;
  priority: number;
  is_active: boolean;
};

export type HrAdminAttendancePolicyAssignmentConflictItem = {
  assignment_id: string;
  policy_id: string;
  policy_name: string;
  priority: number;
  scope_labels: string[];
  overlap_kind: string;
  priority_effect: string;
  is_exact_scope: boolean;
  is_same_priority: boolean;
};

export type HrAdminAttendancePolicyAssignmentConflictCheck = {
  has_conflicts: boolean;
  has_blocking_conflict: boolean;
  summary: string;
  candidate_scope: string[];
  conflicts: HrAdminAttendancePolicyAssignmentConflictItem[];
};

export type HrAdminAttendancePolicyAssignmentResolution = {
  has_resolution: boolean;
  employee_id: string;
  employee_name: string;
  policy_id: string | null;
  policy_name: string | null;
  assignment_id: string | null;
  priority: number | null;
  scope_labels: string[];
  summary: string;
};

export type HrAdminPolicyOptions = {
  leave_categories: HrAdminEnumOption[];
  leave_units: HrAdminEnumOption[];
  accrual_frequencies: HrAdminEnumOption[];
  leave_policy_statuses: HrAdminEnumOption[];
  attendance_statuses: HrAdminEnumOption[];
  attendance_units: HrAdminEnumOption[];
  attendance_policy_statuses: HrAdminEnumOption[];
  leave_types: HrAdminOptionItem[];
  leave_policies: HrAdminOptionItem[];
  attendance_policies: HrAdminOptionItem[];
  legal_entities: HrAdminOptionItem[];
  branches: HrAdminOptionItem[];
  locations: HrAdminOptionItem[];
  departments: HrAdminOptionItem[];
  grades: HrAdminOptionItem[];
  employment_types: HrAdminOptionItem[];
  employees: HrAdminOptionItem[];
  shifts: HrAdminOptionItem[];
  holiday_calendars: HrAdminOptionItem[];
};

export type HrAdminWorkflowStep = {
  id: string;
  step_order: number;
  name: string;
  mode: string;
  actor_type: string;
  role_id: string | null;
  role: string | null;
  membership_id: string | null;
  membership: string | null;
  permission_key: string;
  scope_type: string;
  auto_approve_after_hours: number;
  escalate_after_hours: number;
  allow_delegate: boolean;
  allow_send_back: boolean;
  allow_comment: boolean;
  rule_snapshot: Record<string, unknown>;
};

export type HrAdminWorkflowTemplate = {
  id: string;
  code: string;
  name: string;
  module: string;
  trigger_key: string;
  description: string;
  status: string;
  version: number;
  is_system_seeded: boolean;
  effective_from: string | null;
  effective_to: string | null;
  condition_snapshot: Record<string, unknown>;
  steps: HrAdminWorkflowStep[];
};

export type HrAdminWorkflowStepWriteInput = {
  step_order: number;
  name: string;
  mode: string;
  actor_type: string;
  role_id: string | null;
  membership_id: string | null;
  permission_key: string;
  scope_type: string;
  auto_approve_after_hours: number;
  escalate_after_hours: number;
  allow_delegate: boolean;
  allow_send_back: boolean;
  allow_comment: boolean;
  rule_snapshot: Record<string, unknown>;
};

export type HrAdminWorkflowRuleOption = {
  value: string;
  label: string;
};

export type HrAdminWorkflowLifecycleTriggerPreset = {
  key: string;
  label: string;
  match_terms: string[];
  allowed_due_anchors: HrAdminWorkflowRuleOption[];
};

export type HrAdminWorkflowLifecycleRuleOptions = {
  supported_rule_snapshot_fields: string[];
  due_offset_units: HrAdminWorkflowRuleOption[];
  non_working_weekdays: HrAdminWorkflowRuleOption[];
  common_due_anchors: HrAdminWorkflowRuleOption[];
  trigger_presets: HrAdminWorkflowLifecycleTriggerPreset[];
};

export type HrAdminWorkflowTemplateWriteInput = {
  code: string;
  name: string;
  module: string;
  trigger_key: string;
  description: string;
  status: string;
  version: number;
  is_system_seeded: boolean;
  effective_from: string | null;
  effective_to: string | null;
  condition_snapshot: string;
  steps: HrAdminWorkflowStepWriteInput[];
};

export type HrAdminWorkflowTemplateAssignment = {
  id: string;
  template_id: string;
  template_name: string;
  module: string;
  trigger_key: string;
  legal_entity_id: string | null;
  legal_entity: string | null;
  branch_id: string | null;
  branch: string | null;
  department_id: string | null;
  department: string | null;
  business_unit_id: string | null;
  business_unit: string | null;
  grade_id: string | null;
  grade: string | null;
  priority: number;
  is_active: boolean;
};

export type HrAdminWorkflowTemplateAssignmentWriteInput = {
  template_id: string | null;
  legal_entity_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  business_unit_id: string | null;
  grade_id: string | null;
  priority: number;
  is_active: boolean;
};

export type HrAdminWorkflowTraceAssignment = {
  id: string;
  actor_type: string;
  actor_identifier: string;
  actor_label: string;
  role_id: string | null;
  role: string | null;
  membership_id: string | null;
  membership: string | null;
  is_delegated: boolean;
  delegated_from_identifier: string;
  responded_at: string | null;
};

export type HrAdminWorkflowTraceStep = {
  id: string;
  step_order: number;
  name: string;
  mode: string;
  status: string;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  resolved_action: string;
  resolution_comment: string;
  is_overdue: boolean;
  assignments: HrAdminWorkflowTraceAssignment[];
};

export type HrAdminWorkflowTraceEvent = {
  id: string;
  occurred_at: string | null;
  action: string;
  actor_identifier: string;
  title: string;
  detail: string;
  from_status: string;
  to_status: string;
  step_order: number | null;
  step_name: string;
};

export type HrAdminWorkflowTrace = {
  id: string;
  module: string;
  trigger_key: string;
  subject_type: string;
  subject_identifier: string;
  subject_label: string;
  employee_id: string | null;
  employee_code: string;
  employee_name: string;
  status: string;
  current_step_order: number;
  current_step_name: string;
  current_actor_summary: string;
  template_id: string | null;
  template_name: string;
  initiated_by_identifier: string;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  total_steps: number;
  completed_steps: number;
  pending_steps: number;
  overdue_steps: number;
  assignment_count: number;
  timeline_event_count: number;
  steps: HrAdminWorkflowTraceStep[];
  timeline: HrAdminWorkflowTraceEvent[];
};

export type HrAdminWorkflowTraceListResponse = {
  items: HrAdminWorkflowTrace[];
  total_count: number;
  page: number;
  page_size: number;
  status_counts: Record<string, number>;
};

export type HrAdminWorkflowOptions = {
  workflow_modules: HrAdminEnumOption[];
  workflow_statuses: HrAdminEnumOption[];
  workflow_step_modes: HrAdminEnumOption[];
  workflow_actor_types: HrAdminEnumOption[];
  workflow_scope_types: HrAdminEnumOption[];
  roles: HrAdminRoleOption[];
  memberships: HrAdminOptionItem[];
  legal_entities: HrAdminOptionItem[];
  branches: HrAdminOptionItem[];
  departments: HrAdminOptionItem[];
  business_units: HrAdminOptionItem[];
  grades: HrAdminOptionItem[];
  templates: HrAdminOptionItem[];
  lifecycle_rule_options: HrAdminWorkflowLifecycleRuleOptions;
};

export type HrAdminDocumentCategory = {
  id: string;
  code: string;
  name: string;
  category_type: string;
  description: string;
  is_active: boolean;
  is_system_seeded: boolean;
  requires_expiry_date: boolean;
  requires_verification: boolean;
  allow_employee_upload: boolean;
  allow_multiple_files: boolean;
  visibility_rules: Record<string, unknown>;
};

export type HrAdminDocumentCategoryWriteInput = {
  code: string;
  name: string;
  category_type: string;
  description: string;
  is_active: boolean;
  is_system_seeded: boolean;
  requires_expiry_date: boolean;
  requires_verification: boolean;
  allow_employee_upload: boolean;
  allow_multiple_files: boolean;
  visibility_rules: string;
};

export type HrAdminDocumentRequirementRule = {
  id: string;
  category_id: string;
  category_name: string;
  legal_entity_id: string | null;
  legal_entity: string | null;
  branch_id: string | null;
  branch: string | null;
  department_id: string | null;
  department: string | null;
  grade_id: string | null;
  grade: string | null;
  employment_type_id: string | null;
  employment_type: string | null;
  is_mandatory: boolean;
  required_within_days_of_joining: number;
  priority: number;
  is_active: boolean;
};

export type HrAdminDocumentRequirementRuleWriteInput = {
  category_id: string | null;
  legal_entity_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  grade_id: string | null;
  employment_type_id: string | null;
  is_mandatory: boolean;
  required_within_days_of_joining: number;
  priority: number;
  is_active: boolean;
};

export type HrAdminEmployeeDocument = {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  category_id: string;
  category_name: string;
  artifact_id: string | null;
  previous_document_id: string | null;
  replaced_by_document_id: string | null;
  version_number: number;
  title: string;
  file_name: string;
  file_url: string;
  file_path: string;
  mime_type: string;
  file_size_bytes: number;
  status: string;
  verification_status: string;
  document_number: string;
  issued_on: string | null;
  expires_on: string | null;
  expiry_state: string;
  expiry_label: string;
  days_until_expiry: number | null;
  is_expired: boolean;
  is_expiring_soon: boolean;
  uploaded_by_identifier: string;
  verified_by_identifier: string;
  verified_at: string | null;
  rejection_reason: string;
  reupload_requested: boolean;
  reupload_requested_at: string | null;
  reupload_requested_by_identifier: string;
  version_history: Array<{
    id: string;
    version_number: number;
    title: string;
    status: string;
    verification_status: string;
    file_name: string;
    created_at: string;
  }>;
  review_history: Array<{
    id: string;
    previous_status: string;
    new_status: string;
    actor_identifier: string;
    comment: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type HrAdminEmployeeDocumentListResponse = {
  items: HrAdminEmployeeDocument[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminEmployeeDocumentWriteInput = {
  title: string;
  status: string;
  verification_status: string;
  document_number: string;
  issued_on: string | null;
  expires_on: string | null;
  rejection_reason: string;
  reupload_requested: boolean;
};

export type HrAdminGeneratedLetter = {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  artifact_id: string | null;
  letter_type: string;
  title: string;
  template_code: string;
  status: string;
  issue_date: string | null;
  file_name: string;
  file_url: string;
  file_path: string;
  workflow_reference: string;
  payload_snapshot: Record<string, unknown>;
  rendered_text: string;
  created_at: string;
  updated_at: string;
};

export type HrAdminGeneratedLetterListResponse = {
  items: HrAdminGeneratedLetter[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminGeneratedLetterDraft = {
  employee_id: string;
  letter_type: string;
  title: string;
  template_code: string;
  issue_date: string;
  workflow_reference: string;
  template_body: string;
  payload_values: Record<string, unknown>;
};

export type HrAdminGeneratedLetterPreview = {
  rendered_text: string;
  missing_variables: string[];
  used_variables: string[];
  payload: Record<string, unknown>;
};

export type HrAdminDocumentOptions = {
  document_category_types: HrAdminEnumOption[];
  verification_statuses: HrAdminEnumOption[];
  employee_document_statuses: HrAdminEnumOption[];
  letter_types: HrAdminEnumOption[];
  max_upload_size_bytes: number;
  categories: HrAdminOptionItem[];
  legal_entities: HrAdminOptionItem[];
  branches: HrAdminOptionItem[];
  departments: HrAdminOptionItem[];
  grades: HrAdminOptionItem[];
  employment_types: HrAdminOptionItem[];
};

export type HrAdminLifecycleEmployeeOption = {
  id: string;
  name: string;
  employee_code: string;
};

export type HrAdminLifecycleOwnerOption = {
  value: string;
  label: string;
};

export type HrAdminLifecycleQueueItem = {
  id: string;
  item_type: string;
  item_label: string;
  detail_href: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  status: string;
  status_label: string;
  primary_date: string | null;
  primary_date_label: string;
  secondary_date: string | null;
  secondary_date_label: string;
  owner_value: string;
  owner_label: string;
  workflow_reference: string;
  summary: string;
  bulk_status_warning: string;
  document_attention_state: string;
  document_attention_summary: string;
  missing_required_document_count: number;
  future_due_document_count: number;
  expired_document_count: number;
  expiring_document_count: number;
  attention_state: string;
  attention_rank: number;
  attention_item_count: number;
  attention_summary: string;
  attention_due_on: string | null;
  next_due_on: string | null;
  next_escalation_on: string | null;
  created_at: string;
};

export type HrAdminLifecycleQueueListResponse = {
  items: HrAdminLifecycleQueueItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminLifecycleWorkItem = {
  code: string;
  label: string;
  done: boolean;
  required: boolean;
  blocking: boolean;
  owner: string;
  owner_label: string;
  owner_source_type: string;
  escalation_owner: string;
  auto_reassign_on_escalation: boolean;
  due_on: string;
  escalate_after_days: number | null;
  escalates_on: string;
  is_overdue: boolean;
  is_escalation_due: boolean;
  is_escalated: boolean;
  escalated_at: string;
  notes: string;
  due_date_source: string;
  source_due_offset_unit: string;
  source_non_working_weekdays: string[];
  source_template_code: string;
  source_template_name: string;
  source_template_version: number | null;
  source_step_id: string;
  source_step_order: number | null;
  source_step_name: string;
  source_due_anchor: string;
  source_due_offset_days: number | null;
  history: Array<Record<string, unknown>>;
  last_action_at: string;
  last_action_by: string;
};

export type HrAdminLifecycleClearanceSnapshot = {
  items: HrAdminLifecycleWorkItem[];
  workflow_template_code: string;
  notes: string;
};

export type HrAdminOnboarding = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  status: string;
  expected_joining_date: string | null;
  actual_joining_date: string | null;
  onboarding_template_code: string;
  owner_value: string;
  assigned_owner_identifier: string;
  workflow_reference: string;
  checklist_snapshot: HrAdminLifecycleWorkItem[];
  notes: string;
  preboarding_started_at: string | null;
  completed_at: string | null;
  is_rehire_journey: boolean;
  checklist_total_count: number;
  checklist_completed_count: number;
  checklist_open_count: number;
  checklist_overdue_count: number;
  checklist_escalation_due_count: number;
  attention_state: string;
  attention_rank: number;
  attention_item_count: number;
  attention_summary: string;
  attention_due_on: string | null;
  next_due_on: string | null;
  next_escalation_on: string | null;
  required_document_count: number;
  missing_required_document_count: number;
  future_due_document_count: number;
  missing_required_document_names: string[];
};

export type HrAdminOnboardingListResponse = {
  items: HrAdminOnboarding[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminLifecycleOwnerBulkActionInput = {
  record_type: "onboarding" | "probation" | "movement";
  record_ids: string[];
  owner_value: string;
};

export type HrAdminLifecycleStatusBulkActionInput = {
  record_type: "onboarding" | "probation" | "movement";
  record_ids: string[];
  status_value: string;
};

export type HrAdminOnboardingWriteInput = {
  employee_id: string | null;
  status: string;
  expected_joining_date: string | null;
  actual_joining_date: string | null;
  onboarding_template_code: string;
  owner_value: string;
  assigned_owner_identifier: string;
  workflow_reference: string;
  checklist_snapshot: string;
  notes: string;
};

export type HrAdminProbationReview = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  review_date: string;
  probation_end_date: string | null;
  decision: string;
  extension_end_date: string | null;
  owner_value: string;
  reviewer_identifier: string;
  workflow_reference: string;
  remarks: string;
};

export type HrAdminProbationReviewListResponse = {
  items: HrAdminProbationReview[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminProbationReviewWriteInput = {
  employee_id: string | null;
  review_date: string | null;
  probation_end_date: string | null;
  decision: string;
  extension_end_date: string | null;
  owner_value: string;
  reviewer_identifier: string;
  workflow_reference: string;
  remarks: string;
};

export type HrAdminMovement = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  movement_type: string;
  status: string;
  effective_date: string;
  reason: string;
  workflow_reference: string;
  current_snapshot: Record<string, unknown>;
  from_legal_entity_id: string | null;
  from_legal_entity: string | null;
  to_legal_entity_id: string | null;
  to_legal_entity: string | null;
  from_branch_id: string | null;
  from_branch: string | null;
  to_branch_id: string | null;
  to_branch: string | null;
  from_location_id: string | null;
  from_location: string | null;
  to_location_id: string | null;
  to_location: string | null;
  from_department_id: string | null;
  from_department: string | null;
  to_department_id: string | null;
  to_department: string | null;
  from_business_unit_id: string | null;
  from_business_unit: string | null;
  to_business_unit_id: string | null;
  to_business_unit: string | null;
  from_designation_id: string | null;
  from_designation: string | null;
  to_designation_id: string | null;
  to_designation: string | null;
  from_grade_id: string | null;
  from_grade: string | null;
  to_grade_id: string | null;
  to_grade: string | null;
  from_employment_type_id: string | null;
  from_employment_type: string | null;
  to_employment_type_id: string | null;
  to_employment_type: string | null;
  from_manager_id: string | null;
  from_manager: string | null;
  owner_value: string;
  to_manager_id: string | null;
  to_manager: string | null;
};

export type HrAdminMovementListResponse = {
  items: HrAdminMovement[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminMovementWriteInput = {
  employee_id: string | null;
  movement_type: string;
  status: string;
  effective_date: string | null;
  reason: string;
  workflow_reference: string;
  current_snapshot: string;
  from_legal_entity_id: string | null;
  to_legal_entity_id: string | null;
  from_branch_id: string | null;
  to_branch_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  from_department_id: string | null;
  to_department_id: string | null;
  from_business_unit_id: string | null;
  to_business_unit_id: string | null;
  from_designation_id: string | null;
  to_designation_id: string | null;
  from_grade_id: string | null;
  to_grade_id: string | null;
  from_employment_type_id: string | null;
  to_employment_type_id: string | null;
  from_manager_id: string | null;
  owner_value: string;
  to_manager_id: string | null;
};

export type HrAdminExit = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  status: string;
  resignation_date: string | null;
  notice_start_date: string | null;
  notice_end_date: string | null;
  proposed_last_working_date: string | null;
  approved_last_working_date: string | null;
  actual_exit_date: string | null;
  exit_reason: string;
  exit_reason_detail: string;
  is_regrettable: boolean;
  rehire_eligible: boolean;
  workflow_reference: string;
  clearance_status_snapshot: HrAdminLifecycleClearanceSnapshot;
  handover_notes: string;
  clearance_total_count: number;
  clearance_completed_count: number;
  clearance_open_count: number;
  clearance_overdue_count: number;
  clearance_escalation_due_count: number;
  attention_state: string;
  attention_rank: number;
  attention_item_count: number;
  attention_summary: string;
  attention_due_on: string | null;
  next_due_on: string | null;
  next_escalation_on: string | null;
};

export type HrAdminExitListResponse = {
  items: HrAdminExit[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminExitWriteInput = {
  employee_id: string | null;
  status: string;
  resignation_date: string | null;
  notice_start_date: string | null;
  notice_end_date: string | null;
  proposed_last_working_date: string | null;
  approved_last_working_date: string | null;
  actual_exit_date: string | null;
  exit_reason: string;
  exit_reason_detail: string;
  is_regrettable: boolean;
  rehire_eligible: boolean;
  workflow_reference: string;
  clearance_status_snapshot: string;
  handover_notes: string;
};

export type HrAdminLifecycleOptions = {
  onboarding_statuses: HrAdminEnumOption[];
  probation_decisions: HrAdminEnumOption[];
  movement_types: HrAdminEnumOption[];
  lifecycle_event_statuses: HrAdminEnumOption[];
  exit_statuses: HrAdminEnumOption[];
  employees: HrAdminLifecycleEmployeeOption[];
  legal_entities: HrAdminOptionItem[];
  branches: HrAdminOptionItem[];
  locations: HrAdminOptionItem[];
  departments: HrAdminOptionItem[];
  business_units: HrAdminOptionItem[];
  designations: HrAdminOptionItem[];
  grades: HrAdminOptionItem[];
  employment_types: HrAdminOptionItem[];
  managers: HrAdminLifecycleEmployeeOption[];
  lifecycle_owners: HrAdminLifecycleOwnerOption[];
};

export type HrAdminNotificationTemplate = {
  id: string;
  code: string;
  name: string;
  channel: string;
  status: string;
  subject_template: string;
  title_template: string;
  body_template: string;
  metadata_template: Record<string, unknown>;
  is_system_seeded: boolean;
};

export type HrAdminNotificationTemplateOption = {
  id: string;
  name: string;
  channel: string;
  status: string;
};

export type HrAdminNotificationTemplateWriteInput = {
  code: string;
  name: string;
  channel: string;
  status: string;
  subject_template: string;
  title_template: string;
  body_template: string;
  metadata_template: string;
  is_system_seeded: boolean;
};

export type HrAdminNotificationEventDefinition = {
  id: string;
  code: string;
  name: string;
  module: string;
  trigger_key: string;
  audience_type: string;
  channel: string;
  template_id: string | null;
  template_name: string | null;
  role_id: string | null;
  role_name: string | null;
  membership_id: string | null;
  membership_name: string | null;
  is_active: boolean;
  priority: string;
  delivery_delay_minutes: number;
  recipient_snapshot: Record<string, unknown>;
};

export type HrAdminNotificationEventDefinitionWriteInput = {
  code: string;
  name: string;
  module: string;
  trigger_key: string;
  audience_type: string;
  channel: string;
  template_id: string | null;
  role_id: string | null;
  membership_id: string | null;
  is_active: boolean;
  priority: string;
  delivery_delay_minutes: number;
  recipient_snapshot: string;
};

export type HrAdminNotification = {
  id: string;
  event_definition_id: string | null;
  event_definition_name: string | null;
  channel: string;
  audience_type: string;
  subject_type: string;
  subject_identifier: string;
  recipient_membership_id: string | null;
  recipient_membership_name: string | null;
  recipient_role_id: string | null;
  recipient_role_name: string | null;
  recipient_identifier: string;
  recipient_address: string;
  title: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  attempt_count: number;
  max_attempts: number;
  retry_backoff_minutes: number;
  retry_limit_reached: boolean;
  can_retry: boolean;
  delivery_logs: Array<{
    id: string;
    channel: string;
    status: string;
    provider_name: string;
    provider_reference: string;
    error_message: string;
    response_payload: Record<string, unknown>;
    created_at: string;
  }>;
  payload: Record<string, unknown>;
  created_at: string;
};

export type HrAdminNotificationPreviewResolvedRecipient = {
  membership_id: string | null;
  membership_name: string | null;
  identifier: string;
  address: string;
};

export type HrAdminNotificationPreview = {
  channel: string;
  audience_type?: string;
  title: string;
  subject: string;
  body: string;
  metadata: Record<string, unknown>;
  payload: Record<string, unknown>;
  routing_summary: string;
  resolved_recipient: HrAdminNotificationPreviewResolvedRecipient;
};

export type HrAdminNotificationPreviewResponse = {
  preview: HrAdminNotificationPreview;
  test_notification: HrAdminNotification | null;
};

export type HrAdminNotificationDiagnosticsOverview = {
  total_templates: number;
  active_templates: number;
  total_events: number;
  active_events: number;
  live_notifications: number;
  failed_notifications: number;
  preview_test_notifications: number;
};

export type HrAdminNotificationDiagnosticAlert = {
  level: "high" | "medium" | "info";
  title: string;
  description: string;
  href: string;
};

export type HrAdminNotificationDiagnosticRecommendation = {
  category: string;
  title: string;
  description: string;
  href: string;
};

export type HrAdminNotificationChannelDiagnostic = {
  channel: string;
  label: string;
  is_enabled: boolean;
  backend_key: string;
  sender_identifier: string;
  sender_address: string;
  live_notification_count: number;
  pending_notification_count: number;
  delivered_notification_count: number;
  read_notification_count: number;
  failed_notification_count: number;
  retry_ready_count: number;
  retry_capped_count: number;
  latest_notification_at: string | null;
  latest_failure_at: string | null;
  latest_failure_message: string;
  provider_names: string[];
};

export type HrAdminNotificationTemplateDiagnostic = {
  template_id: string;
  template_name: string;
  template_code: string;
  channel: string;
  status: string;
  linked_event_count: number;
  active_event_count: number;
  live_notification_count: number;
  failed_notification_count: number;
  last_notification_at: string | null;
};

export type HrAdminNotificationEventDiagnostic = {
  event_id: string;
  event_name: string;
  event_code: string;
  module: string;
  channel: string;
  audience_type: string;
  is_active: boolean;
  template_name: string | null;
  live_notification_count: number;
  failed_notification_count: number;
  test_notification_count: number;
  last_notification_at: string | null;
};

export type HrAdminNotificationDiagnostics = {
  overview: HrAdminNotificationDiagnosticsOverview;
  alerts: HrAdminNotificationDiagnosticAlert[];
  recommendations: HrAdminNotificationDiagnosticRecommendation[];
  channel_diagnostics: HrAdminNotificationChannelDiagnostic[];
  template_diagnostics: HrAdminNotificationTemplateDiagnostic[];
  event_diagnostics: HrAdminNotificationEventDiagnostic[];
  recent_test_notifications: HrAdminNotification[];
};

export type HrAdminNotificationDeliveryBackend = {
  value: string;
  label: string;
  supported_channels: string[];
};

export type HrAdminNotificationDeliveryPolicyField = {
  key: string;
  label: string;
  description: string;
  input_type: "number" | "text";
  default_value: number | string;
  min_value?: number;
  max_value?: number;
  placeholder?: string;
};

export type HrAdminNotificationProviderConfigField = {
  backend_key: string;
  key: string;
  label: string;
  description: string;
  input_type: "number" | "text";
  default_value: number | string;
  min_value?: number;
  max_value?: number;
  placeholder?: string;
};

export type HrAdminNotificationAuthoringField = {
  key: string;
  label: string;
  description: string;
  input_type: "number" | "text";
  default_value: number | string;
  min_value?: number;
  max_value?: number;
  placeholder?: string;
};

export type HrAdminNotificationTemplateChannelHint = {
  channel: string;
  subject_supported: boolean;
  title_supported: boolean;
  body_placeholder: string;
  sample_variables: string[];
  metadata_fields: HrAdminNotificationAuthoringField[];
};

export type HrAdminNotificationEventTriggerExample = {
  key: string;
  label: string;
  description: string;
};

export type HrAdminNotificationEventModuleHint = {
  module: string;
  default_channel: string;
  default_audience_type: string;
  trigger_examples: HrAdminNotificationEventTriggerExample[];
};

export type HrAdminNotificationAudienceHint = {
  audience_type: string;
  label: string;
  description: string;
  role_supported: boolean;
  membership_supported: boolean;
  recipient_snapshot_example: Record<string, unknown>;
  recipient_snapshot_fields: HrAdminNotificationAuthoringField[];
};

export type HrAdminNotificationCatalogAuthoringMetadata = {
  template_channel_hints: HrAdminNotificationTemplateChannelHint[];
  event_module_hints: HrAdminNotificationEventModuleHint[];
  audience_hints: HrAdminNotificationAudienceHint[];
};

export type HrAdminNotificationChannelAuthoringHint = {
  channel: string;
  sender_identifier_label: string;
  sender_identifier_placeholder: string;
  sender_address_label: string;
  sender_address_placeholder: string;
  provider_config_example: Record<string, unknown>;
};

export type HrAdminNotificationDeliveryAuthoringMetadata = {
  policy_fields: HrAdminNotificationDeliveryPolicyField[];
  provider_fields: HrAdminNotificationProviderConfigField[];
  channel_hints: HrAdminNotificationChannelAuthoringHint[];
};

export type HrAdminNotificationChannelConfiguration = {
  id: string;
  channel: string;
  is_enabled: boolean;
  backend_key: string;
  sender_identifier: string;
  sender_address: string;
  provider_config: Record<string, unknown>;
  delivery_policy: Record<string, unknown>;
};

export type HrAdminNotificationChannelConfigurationWriteInput = {
  channel: string;
  is_enabled: boolean;
  backend_key: string;
  sender_identifier: string;
  sender_address: string;
  provider_config: string;
  delivery_policy: string;
};

export type HrAdminNotificationListResponse = {
  items: HrAdminNotification[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminNotificationWriteInput = {
  status: string;
  recipient_address: string;
  title: string;
  subject: string;
  body: string;
  priority: string;
  scheduled_for: string | null;
  read_at: string | null;
};

export type HrAdminNotificationOptions = {
  notification_channels: HrAdminEnumOption[];
  notification_delivery_backends: HrAdminNotificationDeliveryBackend[];
  notification_delivery_authoring: HrAdminNotificationDeliveryAuthoringMetadata;
  notification_catalog_authoring: HrAdminNotificationCatalogAuthoringMetadata;
  notification_audience_types: HrAdminEnumOption[];
  notification_template_statuses: HrAdminEnumOption[];
  notification_priorities: HrAdminEnumOption[];
  notification_statuses: HrAdminEnumOption[];
  notification_retry_states: HrAdminEnumOption[];
  notification_subject_types: HrAdminEnumOption[];
  workflow_modules: HrAdminEnumOption[];
  templates: HrAdminNotificationTemplateOption[];
  roles: HrAdminRoleOption[];
  memberships: HrAdminOptionItem[];
  channel_configurations: HrAdminNotificationChannelConfiguration[];
};

export type HrAdminDashboardBreakdownItem = {
  label: string;
  value: number;
};

export type HrAdminLaunchAuditGate = {
  ref: string;
  label: string;
  severity: "blocker" | "warning";
  status: "passed" | "blocked" | "warning";
  passed: boolean;
  value: string | number | boolean | null;
  action: string;
  evidence_ref: string;
  owner_role_ref: string;
  action_href: string;
  action_label: string;
  sla_days: number;
  remediation_state: "open" | "closed";
};

export type HrAdminLaunchAuditModule = {
  module_ref: string;
  label: string;
  status: "ready" | "warning" | "blocked";
  gate_count: number;
  passed_gate_count: number;
  blocker_count: number;
  warning_count: number;
  gates: HrAdminLaunchAuditGate[];
  owner_role_ref: string;
  action_href: string;
  action_label: string;
  sla_days: number;
};

export type HrAdminLaunchAuditAction = {
  ref: string;
  label: string;
  module_ref: string;
  module_label: string;
  severity: "blocker" | "warning";
  status: "blocked" | "warning";
  owner_role_ref: string;
  action_href: string;
  action_label: string;
  sla_days: number;
  value: string | number | boolean | null;
  evidence_ref: string;
};

export type HrAdminLaunchRemediationAssignment = {
  id: string;
  gate_ref: string;
  module_ref: string;
  module_label: string;
  label: string;
  severity: "blocker" | "warning";
  status: "open" | "closed" | "ignored";
  owner_role_ref: string;
  assigned_to_identifier: string;
  action_href: string;
  action_label: string;
  sla_days: number;
  current_value: string;
  evidence_ref: string;
  first_seen_at: string;
  last_seen_at: string;
  due_at: string | null;
  due_source_ref: string;
  due_state: "overdue" | "due_soon" | "scheduled" | "unscheduled" | "open" | "closed" | "ignored";
  days_until_due: number | null;
  is_overdue: boolean;
  is_due_soon: boolean;
  acknowledged_at: string | null;
  acknowledged_by_identifier: string;
  reminder_sent_at: string | null;
  reminder_count: number;
  escalated_at: string | null;
  escalated_by_identifier: string;
  escalation_owner_role_ref: string;
  ignored_at: string | null;
  ignored_by_identifier: string;
  resolved_at: string | null;
  resolution_note: string;
  action_history: Array<Record<string, unknown>>;
  source_hash: string;
};

export type HrAdminLaunchRemediationListResponse = {
  summary: {
    open_count: number;
    closed_count: number;
    ignored_count: number;
    blocker_count: number;
    warning_count: number;
    overdue_count: number;
    due_soon_count: number;
    unscheduled_count: number;
    escalated_count: number;
    owner_count: number;
    module_count: number;
  };
  filters: {
    status: string;
    severity: string;
    owner_role_ref: string;
    module_ref: string;
    due_state: string;
    q: string;
  };
  options: {
    statuses: string[];
    severities: string[];
    due_states: string[];
    owners: string[];
    modules: Array<{
      module_ref: string;
      module_label: string;
    }>;
  };
  items: HrAdminLaunchRemediationAssignment[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type HrAdminSaasCommercialEntitlement = {
  entitlement_ref: string;
  label: string;
  enabled: boolean;
};

export type HrAdminSaasCommercialUsageLimit = {
  meter_ref: string;
  label: string;
  current_value: number;
  limit_value: number;
  remaining_value: number | null;
  status: "ok" | "near_limit" | "exceeded" | "unlimited";
};

export type HrAdminSaasCommercialEnforcementScope = {
  scope_ref: string;
  label: string;
  enabled: boolean;
  entitlements: string[];
  blocking_usage_limits: string[];
  path_prefixes: string[];
  methods: string[];
  missing_entitlements: string[];
  exceeded_usage_limits: string[];
  blocking_reasons: string[];
  allowed: boolean;
};

export type HrAdminSaasUsageMeterSnapshot = {
  id: string;
  profile_ref: string;
  profile_source: string;
  plan_ref: string;
  subscription_status: string;
  meter_ref: string;
  label: string;
  current_value: number;
  limit_value: number;
  remaining_value: number | null;
  status: string;
  source_ref: string;
  actor_identifier: string;
  recorded_at: string;
  source_hash: string;
};

export type HrAdminSaasCommercialAuditEvent = {
  id: string;
  event_type: string;
  actor_identifier: string;
  source_ref: string;
  profile_ref: string;
  profile_source: string;
  plan_ref: string;
  subscription_status: string;
  occurred_at: string;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  usage_snapshot: HrAdminSaasCommercialUsageLimit[];
  enforcement_snapshot: {
    enabled: boolean;
    scope_count: number;
    blocking_scope_count: number;
    scopes: HrAdminSaasCommercialEnforcementScope[];
  };
  event_snapshot: Record<string, unknown>;
  source_hash: string;
};

export type HrAdminSaasCommercialControl = {
  profile_ref: string;
  profile_source: string;
  profile_name: string;
  version: number;
  tenant: {
    id: string;
    code: string;
    name: string;
    status: string;
    subscription_plan: string;
  };
  subscription: {
    status: string;
    billing_provider_ref: string;
    billing_account_ref: string;
    current_period_end: string;
    active_statuses: string[];
    status_options: string[];
  };
  plan: {
    plan_ref: string;
    edition: string;
    configured: boolean;
  };
  available_plans: Array<{
    plan_ref: string;
    edition: string;
    label: string;
  }>;
  summary: {
    entitlement_count: number;
    enabled_entitlement_count: number;
    required_entitlement_count: number;
    missing_required_entitlement_count: number;
    usage_meter_count: number;
    exceeded_usage_limit_count: number;
    near_usage_limit_count: number;
    can_launch: boolean;
  };
  entitlements: HrAdminSaasCommercialEntitlement[];
  usage_limits: HrAdminSaasCommercialUsageLimit[];
  required_entitlements: string[];
  missing_required_entitlements: string[];
  exceeded_usage_limits: string[];
  blocking_usage_limits: string[];
  enforcement: {
    enabled: boolean;
    scope_count: number;
    blocking_scope_count: number;
    scopes: HrAdminSaasCommercialEnforcementScope[];
  };
  recent_usage_snapshots: HrAdminSaasUsageMeterSnapshot[];
  recent_audit_events: HrAdminSaasCommercialAuditEvent[];
};

export type TenantAdminConsole = {
  tenant: {
    id: string;
    code: string;
    name: string;
    legal_name: string;
    status: string;
    subscription_plan: string;
    country_code: string;
    timezone: string;
    is_sandbox: boolean;
    go_live_at: string | null;
    onboarding_status: string;
  };
  summary: {
    status: "ready" | "warning" | "blocked";
    blocked_check_count: number;
    warning_check_count: number;
    active_membership_count: number;
    role_count: number;
    published_configuration_count: number;
    commercial_can_launch: boolean;
  };
  commercial_control: HrAdminSaasCommercialControl;
  seat_usage: HrAdminSaasCommercialUsageLimit;
  membership_status_counts: Record<string, number>;
  role_coverage: Array<{
    role_ref: string;
    label: string;
    active_membership_count: number;
    is_system_role: boolean;
  }>;
  configuration_health: {
    tenant_configuration_count: number;
    published_count: number;
    draft_count: number;
    archived_count: number;
    system_definition_count: number;
    recent_configurations: Array<{
      key: string;
      name: string;
      category: string;
      status: string;
      version: number;
      updated_at: string;
    }>;
  };
  governance_checks: Array<{
    ref: string;
    label: string;
    status: "ready" | "warning" | "blocked";
    value: string | number | boolean;
  }>;
  membership_management: {
    status_options: Array<{
      value: string;
      label: string;
    }>;
    role_options: Array<{
      id: string;
      code: string;
      name: string;
      is_system_role: boolean;
    }>;
    recent_memberships: Array<{
      id: string;
      user_id: string;
      username: string;
      email: string;
      display_name: string;
      first_name: string;
      last_name: string;
      phone_number: string;
      is_user_active: boolean;
      membership_status: string;
      is_default_membership: boolean;
      employee_code: string;
      role_ids: string[];
      roles: Array<{
        id: string;
        code: string;
        name: string;
        is_primary: boolean;
        is_system_role: boolean;
      }>;
      created_at: string;
      updated_at: string;
    }>;
    available_actions: Array<{
      value: string;
      label: string;
    }>;
  };
  change_request_management: {
    enabled: boolean;
    profile_source: string;
    request_type_options: Array<{
      value: string;
      label: string;
      description: string;
      target_ref_required: boolean;
      allowed_payload_fields: string[];
    }>;
    status_options: Array<{
      value: string;
      label: string;
    }>;
    action_options: Array<{
      value: string;
      label: string;
    }>;
    recent_requests: Array<{
      id: string;
      request_type: string;
      status: string;
      title: string;
      description: string;
      target_ref: string;
      requested_by_identifier: string;
      decided_by_identifier: string;
      applied_by_identifier: string;
      requested_payload: Record<string, unknown>;
      current_snapshot: Record<string, unknown>;
      decision_note: string;
      action_history: Array<Record<string, unknown>>;
      requested_at: string;
      decided_at: string | null;
      applied_at: string | null;
      source_ref: string;
      source_hash: string;
    }>;
  };
  support_access_management: {
    enabled: boolean;
    profile_source: string;
    max_duration_minutes: number;
    scope_options: Array<{
      value: string;
      label: string;
      description: string;
    }>;
    status_options: Array<{
      value: string;
      label: string;
    }>;
    action_options: Array<{
      value: string;
      label: string;
    }>;
    recent_grants: Array<{
      id: string;
      status: string;
      support_agent_identifier: string;
      reason: string;
      scope_refs: string[];
      requested_duration_minutes: number;
      approved_duration_minutes: number;
      requested_by_identifier: string;
      approved_by_identifier: string;
      revoked_by_identifier: string;
      started_by_identifier: string;
      ended_by_identifier: string;
      requested_at: string;
      approved_at: string | null;
      access_starts_at: string | null;
      access_expires_at: string | null;
      started_at: string | null;
      ended_at: string | null;
      revoked_at: string | null;
      decision_note: string;
      session_ref: string;
      action_history: Array<Record<string, unknown>>;
      request_snapshot: Record<string, unknown>;
      source_ref: string;
      source_hash: string;
    }>;
  };
  recent_usage_snapshots: HrAdminSaasUsageMeterSnapshot[];
  recent_audit_events: HrAdminSaasCommercialAuditEvent[];
};

export type TenantAdminTrustAuditEvent = HrAdminSaasCommercialAuditEvent & {
  event_group_refs: string[];
  support_session_ref: string;
};

export type TenantAdminTrustAuditReview = {
  profile_ref: string;
  profile_source: string;
  generated_at: string;
  tenant: {
    id: string;
    code: string;
    name: string;
    status: string;
    subscription_plan: string;
    timezone: string;
  };
  summary: {
    status: "ready" | "warning" | "blocked";
    total_event_count: number;
    visible_event_count: number;
    event_type_count: number;
    source_ref_count: number;
    support_session_count: number;
    configured_group_count: number;
    page: number;
    page_size: number;
  };
  filters: {
    event_group: string;
    event_type: string;
    actor: string;
    source_ref: string;
    support_session_ref: string;
    date_from: string;
    date_to: string;
  };
  options: {
    event_groups: Array<{
      group_ref: string;
      label: string;
      event_types: string[];
    }>;
    event_types: string[];
    source_refs: string[];
    support_session_refs: string[];
  };
  events: TenantAdminTrustAuditEvent[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type TenantAdminEnterpriseSecurityReadiness = {
  profile_ref: string;
  security_profile_ref: string;
  profile_source: string;
  generated_at: string;
  tenant: {
    id: string;
    code: string;
    name: string;
    status: string;
    subscription_plan: string;
    timezone: string;
  };
  summary: {
    status: "ready" | "warning" | "blocked";
    check_count: number;
    passed_check_count: number;
    blocker_count: number;
    warning_count: number;
    mfa_ready: boolean;
    sso_ready: boolean;
    scim_ready: boolean;
    session_ready: boolean;
    audit_ready: boolean;
    data_protection_ready: boolean;
    launch_blocker_refs: string[];
  };
  mfa: {
    required: boolean;
    enforced: boolean;
    allowed_methods: string[];
    exempt_role_refs: string[];
    minimum_method_count: number;
    evidence_ref: string;
    owner_role_ref: string;
  };
  sso: {
    required: boolean;
    enabled: boolean;
    provider_ref: string;
    protocol: string;
    allowed_protocols: string[];
    metadata_ref: string;
    last_tested_at: string | null;
    test_interval_days: number;
    certificate_rotation_due_at: string | null;
    certificate_warning_days: number;
  };
  scim: {
    required: boolean;
    enabled: boolean;
    provider_ref: string;
    last_sync_at: string | null;
    sync_interval_hours: number;
    error_count: number;
    max_error_count: number;
    deprovisioning_enabled: boolean;
  };
  session: {
    idle_timeout_minutes: number;
    max_idle_timeout_minutes: number;
    absolute_timeout_hours: number;
    max_absolute_timeout_hours: number;
    device_trust_required: boolean;
    device_trust_enabled: boolean;
  };
  audit: {
    retention_days: number;
    minimum_retention_days: number;
    customer_export_enabled: boolean;
    immutable_export_ref: string;
  };
  data_protection: {
    encryption_at_rest: boolean;
    encryption_in_transit: boolean;
    customer_managed_key_ref: string;
    data_residency_ref: string;
  };
  checks: Array<{
    ref: string;
    label: string;
    status: "ready" | "warning" | "blocked";
    severity: "warning" | "blocker";
    passed: boolean;
    value: unknown;
    detail: string;
    action_label: string;
    action_href: string;
    owner_role_ref: string;
  }>;
};

export type TenantAdminMembershipMutationResult = {
  membership: TenantAdminConsole["membership_management"]["recent_memberships"][number];
  generated_password: string;
  password_was_set: boolean;
  console: TenantAdminConsole;
};

export type TenantAdminChangeRequestMutationResult = {
  change_request: TenantAdminConsole["change_request_management"]["recent_requests"][number];
  console: TenantAdminConsole;
};

export type TenantAdminSupportAccessGrantMutationResult = {
  support_access_grant: TenantAdminConsole["support_access_management"]["recent_grants"][number];
  console: TenantAdminConsole;
};

export type SupportSessionTenantConsole = {
  support_session: {
    allowed: boolean;
    detail: string;
    code: string;
    tenant_code: string;
    actor_identifier: string;
    required_scope_ref: string;
    request_path: string;
    method: string;
    grant: TenantAdminConsole["support_access_management"]["recent_grants"][number] | null;
    scope_refs: string[];
    session_ref: string;
    access_expires_at: string | null;
  };
  tenant: {
    id: string;
    code: string;
    name: string;
  };
  granted_sections: string[];
  account: {
    summary: TenantAdminConsole["summary"];
    commercial_control: {
      profile_ref: string;
      profile_source: string;
      subscription: HrAdminSaasCommercialControl["subscription"];
      plan: HrAdminSaasCommercialControl["plan"];
      summary: HrAdminSaasCommercialControl["summary"];
    };
    seat_usage: TenantAdminConsole["seat_usage"];
    role_coverage: TenantAdminConsole["role_coverage"];
    governance_checks: TenantAdminConsole["governance_checks"];
  } | null;
  configuration_health: TenantAdminConsole["configuration_health"] | null;
  commercial_evidence: {
    recent_usage_snapshots: TenantAdminConsole["recent_usage_snapshots"];
    recent_audit_events: TenantAdminConsole["recent_audit_events"];
  } | null;
  payroll_support: {
    readiness_ref: string;
    payroll_route_refs: string[];
  } | null;
};

export type SupportSessionDomainSnapshot = {
  support_session: SupportSessionTenantConsole["support_session"];
  tenant: SupportSessionTenantConsole["tenant"];
  domain: {
    domain_ref: string;
    label: string;
    description: string;
    scope_ref: string;
    profile_source: string;
  };
  available_domains: Array<{
    domain_ref: string;
    label: string;
    description: string;
    scope_ref: string;
    profile_source: string;
  }>;
  snapshot: Record<string, unknown>;
};

export type HrAdminSaasResilienceReadiness = {
  profile_ref: string;
  resilience_profile_ref: string;
  profile_source: string;
  generated_at: string;
  tenant: {
    id: string;
    code: string;
    name: string;
    status: string;
    subscription_plan: string;
    timezone: string;
  };
  summary: {
    status: "ready" | "warning" | "blocked";
    check_count: number;
    passed_check_count: number;
    blocker_count: number;
    warning_count: number;
    backup_ready: boolean;
    restore_ready: boolean;
    retention_ready: boolean;
  };
  backup: {
    enabled: boolean;
    required: boolean;
    frequency_hours: number;
    grace_hours: number;
    recovery_point_objective_minutes: number;
    last_successful_backup_at: string | null;
    last_backup_status: string;
    encryption_required: boolean;
    encryption_enabled: boolean;
    offsite_required: boolean;
    offsite_copy_enabled: boolean;
    runbook_ref: string;
  };
  restore: {
    required: boolean;
    restore_test_interval_days: number;
    grace_days: number;
    last_restore_test_at: string | null;
    last_restore_test_status: string;
    runbook_ref: string;
  };
  retention: {
    default_retention_days: number;
    minimum_default_retention_days: number;
    payroll_retention_days: number;
    minimum_payroll_retention_days: number;
    audit_retention_days: number;
    minimum_audit_retention_days: number;
    support_session_retention_days: number;
    minimum_support_session_retention_days: number;
    deletion_policy_ref: string;
    legal_hold_policy_ref: string;
  };
  evidence: {
    storage_policy_ref: string;
    backup_job_ref: string;
    restore_test_ref: string;
    retention_policy_ref: string;
    last_evidence_at: string | null;
  };
  checks: Array<{
    ref: string;
    label: string;
    status: "ready" | "warning" | "blocked";
    severity: "blocker" | "warning";
    passed: boolean;
    value: string | number | boolean | Record<string, string> | null;
    detail: string;
    action_label: string;
    action_href: string;
  }>;
};

export type HrAdminSaasSlaOperations = {
  profile_ref: string;
  sla_profile_ref: string;
  profile_source: string;
  generated_at: string;
  tenant: {
    id: string;
    code: string;
    name: string;
    status: string;
    subscription_plan: string;
    timezone: string;
  };
  summary: {
    status: "ready" | "warning" | "blocked";
    signal_count: number;
    blocked_signal_count: number;
    warning_signal_count: number;
    incident_count: number;
    open_incident_count: number;
    breached_incident_count: number;
    at_risk_incident_count: number;
    failed_notification_count: number;
    stale_provider_job_count: number;
    expired_support_grant_count: number;
    overdue_remediation_count: number;
  };
  incident_targets: Record<string, { response_minutes: number; resolution_minutes: number; owner_role_ref: string }>;
  impact_options: Record<string, { label: string }>;
  operational_thresholds: Record<string, { max_count: number; severity: string; owner_role_ref: string; href: string }>;
  status_counts: Record<string, number>;
  severity_counts: Record<string, number>;
  impact_counts: Record<string, number>;
  health_signals: Array<{
    ref: string;
    label: string;
    status: "ready" | "warning" | "blocked";
    value: string | number | boolean | null;
    detail: string;
    href: string;
    owner_role_ref: string;
  }>;
  incidents: Array<{
    id: string;
    incident_ref: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    impact_refs: string[];
    impact_labels: string[];
    owner_role_ref: string;
    detected_at: string;
    acknowledged_at: string | null;
    mitigated_at: string | null;
    resolved_at: string | null;
    target_response_minutes: number;
    target_resolution_minutes: number;
    response_due_at: string;
    resolution_due_at: string;
    response_state: "met" | "breached" | "at_risk" | "open";
    resolution_state: "met" | "breached" | "at_risk" | "open";
    breached: boolean;
    at_risk: boolean;
    action_history: Array<Record<string, string>>;
    incident_snapshot: Record<string, string | number | boolean>;
    source_ref: string;
    source_hash: string;
    created_at: string;
    updated_at: string;
  }>;
};

export type HrAdminSaasOperationalHealth = {
  profile_ref: string;
  generated_at: string;
  tenant: {
    id: string;
    code: string;
    name: string;
    status: string;
    subscription_plan: string;
    timezone: string;
  };
  summary: {
    status: "ready" | "warning" | "blocked";
    signal_count: number;
    blocked_signal_count: number;
    warning_signal_count: number;
    ready_signal_count: number;
    open_remediation_count: number;
    overdue_remediation_count: number;
    failed_notification_count: number;
    pending_notification_count: number;
    resilience_status: "ready" | "warning" | "blocked";
    resilience_blocker_count: number;
    resilience_warning_count: number;
    sla_status: "ready" | "warning" | "blocked";
    sla_open_incident_count: number;
    sla_breached_incident_count: number;
    queued_provider_job_count: number;
    running_provider_job_count: number;
    stale_provider_job_count: number;
    dead_lettered_provider_job_count: number;
    dead_lettered_provider_retry_event_count: number;
    active_support_session_count: number;
    expired_support_grant_count: number;
    pending_change_request_count: number;
    commercial_event_count: number;
    usage_snapshot_count: number;
  };
  signals: Array<{
    ref: string;
    label: string;
    status: "ready" | "warning" | "blocked";
    value: string | number | boolean | null;
    detail: string;
    href: string;
    owner_role_ref: string;
  }>;
  launch_audit: {
    audit_profile_ref: string;
    status: "ready" | "warning" | "blocked";
    blocker_count: number;
    warning_count: number;
    release_blocker_refs: string[];
    release_warning_refs: string[];
  };
  commercial_control: {
    profile_ref: string;
    profile_source: string;
    summary: HrAdminSaasCommercialControl["summary"];
    subscription: HrAdminSaasCommercialControl["subscription"];
    plan: HrAdminSaasCommercialControl["plan"];
    exceeded_usage_limits: string[];
  };
  resilience_readiness: {
    profile_ref: string;
    resilience_profile_ref: string;
    profile_source: string;
    summary: HrAdminSaasResilienceReadiness["summary"];
    backup: HrAdminSaasResilienceReadiness["backup"];
    restore: HrAdminSaasResilienceReadiness["restore"];
    retention: HrAdminSaasResilienceReadiness["retention"];
  };
  sla_operations: {
    profile_ref: string;
    sla_profile_ref: string;
    profile_source: string;
    summary: HrAdminSaasSlaOperations["summary"];
    health_signals: HrAdminSaasSlaOperations["health_signals"];
    incidents: HrAdminSaasSlaOperations["incidents"];
  };
  notification_delivery: {
    pending_count: number;
    failed_count: number;
    sent_today_count: number;
    latest_activity_at: string;
  };
  provider_queue: {
    job_status_counts: Record<string, number>;
    retry_status_counts: Record<string, number>;
    stale_job_count: number;
    dead_lettered_job_count: number;
    dead_lettered_retry_event_count: number;
  };
  support_access: {
    active_session_count: number;
    expired_runtime_grant_count: number;
    status_counts: Record<string, number>;
    recent_grants: TenantAdminConsole["support_access_management"]["recent_grants"];
  };
  tenant_change_requests: {
    pending_count: number;
    status_counts: Record<string, number>;
  };
  recent_commercial_events: HrAdminSaasCommercialAuditEvent[];
  recent_usage_snapshots: HrAdminSaasUsageMeterSnapshot[];
};

export type HrAdminLaunchAudit = {
  audit_profile_ref: string;
  audit_profile_source: string;
  status: "ready" | "warning" | "blocked";
  module_count: number;
  gate_count: number;
  passed_gate_count: number;
  blocker_count: number;
  warning_count: number;
  release_blocker_refs: string[];
  release_warning_refs: string[];
  release_actions: HrAdminLaunchAuditAction[];
  remediation_assignments: HrAdminLaunchRemediationAssignment[];
  remediation_assignment_summary: {
    open_count: number;
    opened_count: number;
    updated_count: number;
    closed_count: number;
  };
  evidence_refs: string[];
  modules: HrAdminLaunchAuditModule[];
};

export type HrAdminDashboard = {
  overview: {
    total_employees: number;
    active_employees: number;
    active_memberships: number;
    configured_departments: number;
    active_branches: number;
    pending_approvals: number;
  };
  workforce: {
    employment_status_breakdown: HrAdminDashboardBreakdownItem[];
    department_headcount: HrAdminDashboardBreakdownItem[];
    joiners_this_month: number;
    exits_this_month: number;
    managers_with_reports: number;
    employees_without_manager: number;
  };
  operations: {
    pending_leave_requests: number;
    pending_regularizations: number;
    pending_onboardings: number;
    pending_probation_reviews: number;
    open_exits: number;
  };
  documents: {
    pending_verification: number;
    rejected_documents: number;
    expiring_in_30_days: number;
    mandatory_requirement_rules: number;
    active_document_categories: number;
  };
  governance: {
    active_leave_policies: number;
    active_attendance_policies: number;
    workflow_templates: number;
    active_notification_templates: number;
    active_notification_events: number;
  };
  delivery: {
    pending_notifications: number;
    sent_today: number;
    failed_notifications: number;
    documents_expiring_30_days: number;
    latest_activity_at: string;
  };
  launch_audit: HrAdminLaunchAudit;
};

export type HrAdminPayrollReadinessPeriod = {
  start: string;
  end: string;
  label: string;
  days: number;
  working_days: number;
};

export type HrAdminPayrollReadinessConfiguration = {
  profile_key: string;
  profile_name: string;
  version: number;
  source: string;
  resolved_profile: Record<string, unknown>;
};

export type HrAdminPayrollReadinessSummary = {
  total_employees: number;
  ready: number;
  warnings: number;
  blocked: number;
  joiners: number;
  exits: number;
  pending_leave_requests: number;
  pending_attendance_regularizations: number;
  missing_primary_bank_accounts: number;
};

export type HrAdminPayrollReadinessItem = {
  id: string;
  employee_code: string;
  employee_name: string;
  work_email: string;
  readiness_status: "ready" | "warning" | "blocked" | string;
  employment_status: string;
  date_of_joining: string | null;
  exit_date: string | null;
  legal_entity: string | null;
  branch: string | null;
  location: string | null;
  department: string | null;
  business_unit: string | null;
  cost_center: string | null;
  designation: string | null;
  grade: string | null;
  employment_type: string | null;
  period_days: number;
  working_days: number;
  attendance_record_days: number;
  pending_leave_requests: number;
  pending_attendance_regularizations: number;
  unknown_attendance_records: number;
  has_primary_bank_account: boolean;
  blockers: string[];
  warnings: string[];
  source_counts: Record<string, number>;
};

export type HrAdminPayrollReadinessListResponse = {
  period: HrAdminPayrollReadinessPeriod;
  configuration: HrAdminPayrollReadinessConfiguration;
  summary: HrAdminPayrollReadinessSummary;
  items: HrAdminPayrollReadinessItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  status_counts: Record<string, number>;
};

export type HrAdminPayrollCalendar = {
  id: string;
  code: string;
  name: string;
  frequency: string;
  frequency_label: string;
  timezone: string;
  currency_code: string;
  period_start_day: number;
  is_active: boolean;
  config_snapshot: Record<string, unknown>;
  active_pay_group_count: number;
  open_period_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollPeriod = {
  id: string;
  calendar_id: string;
  calendar_name: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: string;
  status_label: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayGroup = {
  id: string;
  calendar_id: string;
  calendar_name: string;
  code: string;
  name: string;
  status: string;
  status_label: string;
  default_currency_code: string;
  legal_entity_id: string | null;
  legal_entity: string | null;
  branch_id: string | null;
  branch: string | null;
  location_id: string | null;
  location: string | null;
  department_id: string | null;
  department: string | null;
  employment_type_id: string | null;
  employment_type: string | null;
  config_snapshot: Record<string, unknown>;
  assignment_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayGroupAssignment = {
  id: string;
  pay_group_id: string;
  pay_group_name: string;
  pay_group_code: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  effective_from: string;
  effective_to: string | null;
  status: string;
  status_label: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollSetupResponse = {
  summary: {
    calendar_count: number;
    active_calendar_count: number;
    open_period_count: number;
    active_pay_group_count: number;
    assigned_employee_count: number;
    unassigned_employee_count: number;
  };
  calendars: HrAdminPayrollCalendar[];
  periods: HrAdminPayrollPeriod[];
  pay_groups: HrAdminPayGroup[];
  assignments: HrAdminPayGroupAssignment[];
  options: {
    payroll_frequencies: HrAdminEnumOption[];
    payroll_period_statuses: HrAdminEnumOption[];
    pay_group_statuses: HrAdminEnumOption[];
    legal_entities: HrAdminOptionItem[];
    branches: HrAdminOptionItem[];
    locations: HrAdminOptionItem[];
    departments: HrAdminOptionItem[];
    employment_types: HrAdminOptionItem[];
    employees: HrAdminManagerOption[];
  };
};

export type HrAdminSalaryComponent = {
  id: string;
  code: string;
  name: string;
  component_type: string;
  component_type_label: string;
  value_type: string;
  value_type_label: string;
  formula_ref: string;
  applicability_rule_ref: string;
  rounding_rule_ref: string;
  accounting_mapping_ref: string;
  statutory_treatment_ref: string;
  is_taxable: boolean;
  is_proratable: boolean;
  payslip_visibility: string;
  status: string;
  status_label: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminSalaryStructure = {
  id: string;
  code: string;
  name: string;
  pay_group_id: string | null;
  pay_group_name: string | null;
  currency_code: string;
  status: string;
  status_label: string;
  description: string;
  config_snapshot: Record<string, unknown>;
  version_count: number;
  assignment_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminSalaryStructureVersion = {
  id: string;
  structure_id: string;
  structure_name: string;
  version: number;
  effective_from: string;
  effective_to: string | null;
  status: string;
  status_label: string;
  annual_ctc: string;
  currency_code: string;
  config_snapshot: Record<string, unknown>;
  component_count: number;
  assignment_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminSalaryStructureComponent = {
  id: string;
  structure_version_id: string;
  structure_name: string;
  component_id: string;
  component_code: string;
  component_name: string;
  component_type: string;
  value_type: string;
  display_order: number;
  amount: string | null;
  percentage: string | null;
  formula_ref: string;
  calculation_rule_ref: string;
  is_active: boolean;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminEmployeeSalaryAssignment = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  structure_version_id: string;
  structure_name: string;
  structure_version: number;
  effective_from: string;
  effective_to: string | null;
  status: string;
  status_label: string;
  annual_ctc: string;
  annual_ctc_override: string | null;
  assignment_reason: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminSalarySetupResponse = {
  summary: {
    component_count: number;
    active_component_count: number;
    structure_count: number;
    active_structure_count: number;
    active_version_count: number;
    assigned_employee_count: number;
  };
  components: HrAdminSalaryComponent[];
  structures: HrAdminSalaryStructure[];
  versions: HrAdminSalaryStructureVersion[];
  structure_components: HrAdminSalaryStructureComponent[];
  assignments: HrAdminEmployeeSalaryAssignment[];
  options: {
    component_types: HrAdminEnumOption[];
    component_value_types: HrAdminEnumOption[];
    config_statuses: HrAdminEnumOption[];
    pay_groups: HrAdminOptionItem[];
    employees: HrAdminManagerOption[];
  };
};

export type HrAdminPayrollRun = {
  id: string;
  period_id: string;
  period_name: string;
  pay_group_id: string | null;
  pay_group_name: string | null;
  code: string;
  name: string;
  status: string;
  status_label: string;
  input_profile_ref: string;
  snapshot_schema_ref: string;
  locked_at: string | null;
  locked_by_name: string | null;
  final_locked_at: string | null;
  final_locked_by_name: string | null;
  config_snapshot: Record<string, unknown>;
  snapshot_count: number;
  ready_count: number;
  warning_count: number;
  blocked_count: number;
  locked_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollInputSnapshot = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  pay_group_assignment_id: string | null;
  pay_group_name: string | null;
  salary_assignment_id: string | null;
  salary_structure_name: string | null;
  salary_structure_version: number | null;
  snapshot_status: string;
  snapshot_status_label: string;
  period_start: string;
  period_end: string;
  source_collected_at: string;
  locked_at: string | null;
  input_profile_ref: string;
  employee_snapshot: Record<string, unknown>;
  organization_snapshot: Record<string, unknown>;
  salary_snapshot: Record<string, unknown>;
  attendance_snapshot: Record<string, unknown>;
  leave_snapshot: Record<string, unknown>;
  lifecycle_snapshot: Record<string, unknown>;
  document_snapshot: Record<string, unknown>;
  banking_snapshot: Record<string, unknown>;
  validation_snapshot: Record<string, unknown>;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  blockers: string[];
  warnings: string[];
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollInputSnapshotSetupResponse = {
  summary: {
    run_count: number;
    collecting_run_count: number;
    inputs_locked_run_count: number;
    snapshot_count: number;
    locked_snapshot_count: number;
    blocked_snapshot_count: number;
  };
  runs: HrAdminPayrollRun[];
  snapshots: HrAdminPayrollInputSnapshot[];
  options: {
    payroll_run_statuses: HrAdminEnumOption[];
    payroll_input_snapshot_statuses: HrAdminEnumOption[];
    periods: HrAdminOptionItem[];
    pay_groups: HrAdminOptionItem[];
    employees: HrAdminManagerOption[];
  };
};

export type HrAdminPayrollAdjustment = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  input_snapshot_id: string | null;
  salary_component_id: string | null;
  kind: string;
  kind_label: string;
  status: string;
  status_label: string;
  direction: string;
  direction_label: string;
  component_code: string;
  component_name: string;
  amount: string;
  currency_code: string;
  effective_date: string;
  source_period_start: string | null;
  source_period_end: string | null;
  adjustment_profile_ref: string;
  approval_profile_ref: string;
  source_ref: string;
  reason: string;
  submitted_at: string | null;
  submitted_by_name: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  rejected_at: string | null;
  rejected_by_name: string | null;
  applied_at: string | null;
  applied_by_name: string | null;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollAdjustmentSetupResponse = {
  summary: {
    run_count: number;
    adjustment_count: number;
    draft_count: number;
    submitted_count: number;
    approved_count: number;
    applied_count: number;
    total_amount: string;
  };
  runs: HrAdminPayrollRun[];
  snapshots: HrAdminPayrollInputSnapshot[];
  adjustments: HrAdminPayrollAdjustment[];
  options: {
    adjustment_kinds: HrAdminEnumOption[];
    adjustment_statuses: HrAdminEnumOption[];
    adjustment_directions: HrAdminEnumOption[];
    salary_components: Array<{ id: string; code: string; name: string; component_type: string }>;
    employees: HrAdminManagerOption[];
  };
};

export type HrAdminPayrollSettlementLine = {
  id: string;
  settlement_id: string;
  salary_component_id: string | null;
  line_kind: string;
  line_kind_label: string;
  direction: string;
  direction_label: string;
  component_code: string;
  component_name: string;
  amount: string;
  currency_code: string;
  calculation_order: number;
  source_ref: string;
  source_hash: string;
  trace_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollSettlement = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  exit_record_id: string | null;
  input_snapshot_id: string | null;
  status: string;
  status_label: string;
  settlement_profile_ref: string;
  approval_profile_ref: string;
  calculation_profile_ref: string;
  source_ref: string;
  reason: string;
  settlement_date: string;
  last_working_date: string | null;
  currency_code: string;
  totals_snapshot: Record<string, unknown>;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  submitted_at: string | null;
  submitted_by_name: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  rejected_at: string | null;
  rejected_by_name: string | null;
  applied_at: string | null;
  applied_by_name: string | null;
  line_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollSettlementSetupResponse = {
  summary: {
    run_count: number;
    settlement_count: number;
    draft_count: number;
    submitted_count: number;
    approved_count: number;
    applied_count: number;
    line_count: number;
  };
  runs: HrAdminPayrollRun[];
  snapshots: HrAdminPayrollInputSnapshot[];
  settlements: HrAdminPayrollSettlement[];
  lines: HrAdminPayrollSettlementLine[];
  options: {
    settlement_statuses: HrAdminEnumOption[];
    settlement_line_kinds: HrAdminEnumOption[];
    settlement_directions: HrAdminEnumOption[];
    salary_components: Array<{ id: string; code: string; name: string; component_type: string }>;
    employees: HrAdminManagerOption[];
    exit_records: Array<{
      id: string;
      employee_id: string;
      employee_code: string;
      employee_name: string;
      status: string;
      last_working_date: string | null;
    }>;
  };
};

export type HrAdminPayrollRuleDefinition = {
  id: string;
  code: string;
  name: string;
  rule_type: string;
  rule_type_label: string;
  description: string;
  tags: string[];
  config_snapshot: Record<string, unknown>;
  version_count: number;
  active_version_count: number;
  evaluation_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollRuleVersion = {
  id: string;
  rule_id: string;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  version: number;
  status: string;
  status_label: string;
  expression_language: string;
  expression_language_label: string;
  expression: string;
  effective_from: string;
  effective_to: string | null;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  rounding_rule_ref: string;
  config_snapshot: Record<string, unknown>;
  evaluation_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollRuleEvaluation = {
  id: string;
  rule_version_id: string;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  input_snapshot_id: string | null;
  employee_code: string | null;
  employee_name: string | null;
  expression: string;
  context_snapshot: Record<string, unknown>;
  result_snapshot: Record<string, unknown>;
  trace_snapshot: Record<string, unknown>;
  evaluated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollRulesSetupResponse = {
  summary: {
    rule_count: number;
    active_version_count: number;
    draft_version_count: number;
    formula_rule_count: number;
    evaluation_count: number;
    locked_snapshot_count: number;
  };
  rules: HrAdminPayrollRuleDefinition[];
  versions: HrAdminPayrollRuleVersion[];
  evaluations: HrAdminPayrollRuleEvaluation[];
  options: {
    rule_types: HrAdminEnumOption[];
    rule_version_statuses: HrAdminEnumOption[];
    expression_languages: HrAdminEnumOption[];
    input_snapshots: Array<{
      id: string;
      employee_code: string;
      employee_name: string;
      payroll_run_name: string;
      source_hash: string;
    }>;
  };
};

export type HrAdminPayrollStatutoryPack = {
  id: string;
  code: string;
  name: string;
  country_code: string;
  jurisdiction_ref: string;
  status: string;
  status_label: string;
  effective_from: string;
  effective_to: string | null;
  currency_code: string;
  statutory_profile_ref: string;
  validation_profile_ref: string;
  config_snapshot: Record<string, unknown>;
  component_count: number;
  active_component_count: number;
  employee_profile_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollStatutoryComponent = {
  id: string;
  statutory_pack_id: string;
  statutory_pack_name: string;
  salary_component_id: string | null;
  salary_component_name: string | null;
  code: string;
  name: string;
  statutory_type: string;
  statutory_type_label: string;
  contribution_owner: string;
  contribution_owner_label: string;
  calculation_method: string;
  calculation_method_label: string;
  wage_base_ref: string;
  statutory_treatment_ref: string;
  registration_ref: string;
  applicability_profile_ref: string;
  rounding_rule_ref: string;
  formula_ref: string;
  status: string;
  status_label: string;
  config_snapshot: Record<string, unknown>;
  slab_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollStatutorySlab = {
  id: string;
  statutory_component_id: string;
  statutory_component_name: string;
  statutory_type: string;
  code: string;
  name: string;
  slab_order: number;
  effective_from: string;
  effective_to: string | null;
  min_amount: string;
  max_amount: string | null;
  employee_rate_percent: string;
  employer_rate_percent: string;
  fixed_employee_amount: string;
  fixed_employer_amount: string;
  wage_ceiling_amount: string | null;
  state_code: string;
  applicability_profile_ref: string;
  status: string;
  status_label: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollStatutoryEmployerRegistration = {
  id: string;
  statutory_pack_id: string;
  statutory_pack_name: string;
  statutory_component_id: string | null;
  statutory_component_name: string | null;
  statutory_type: string;
  legal_entity_id: string | null;
  legal_entity_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  location_id: string | null;
  location_name: string | null;
  code: string;
  name: string;
  registration_type_ref: string;
  registration_number: string;
  employer_identifier: string;
  jurisdiction_ref: string;
  filing_authority_ref: string;
  provider_ref: string;
  status: string;
  status_label: string;
  effective_from: string;
  effective_to: string | null;
  source_ref: string;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  filing_calendar_count: number;
  open_filing_calendar_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollStatutoryFilingCalendar = {
  id: string;
  statutory_pack_id: string;
  statutory_pack_name: string;
  statutory_component_id: string | null;
  statutory_component_name: string | null;
  statutory_type: string;
  employer_registration_id: string | null;
  employer_registration_name: string | null;
  employer_registration_number: string;
  code: string;
  name: string;
  filing_type_ref: string;
  filing_frequency: string;
  filing_frequency_label: string;
  period_start: string;
  period_end: string;
  due_date: string;
  grace_due_date: string | null;
  filing_window_start: string | null;
  filing_window_end: string | null;
  status: string;
  status_label: string;
  filing_authority_ref: string;
  provider_ref: string;
  output_profile_ref: string;
  source_ref: string;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  days_until_due: number | null;
  is_due: boolean;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
};

export type HrAdminEmployeeStatutoryProfile = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  statutory_pack_id: string | null;
  statutory_pack_name: string | null;
  profile_ref: string;
  effective_from: string;
  effective_to: string | null;
  status: string;
  status_label: string;
  pan_number: string;
  uan_number: string;
  pf_number: string;
  esi_number: string;
  pf_applicable: boolean;
  esi_applicable: boolean;
  professional_tax_state: string;
  lwf_state: string;
  tax_regime: string;
  tax_regime_label: string;
  declaration_status: string;
  declaration_status_label: string;
  previous_employment_income: string;
  previous_employment_tax_deducted: string;
  source_ref: string;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminEmployeeStatutoryDeclarationItem = {
  id: string;
  declaration_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  financial_year_code: string;
  item_kind: string;
  item_kind_label: string;
  section_code: string;
  component_code: string;
  name: string;
  declared_amount: string;
  verified_amount: string;
  proof_status: string;
  proof_status_label: string;
  proof_document_ref: string;
  proof_artifact_key: string;
  proof_submitted_at: string | null;
  verified_at: string | null;
  verified_by_name: string | null;
  rejected_at: string | null;
  rejected_by_name: string | null;
  rejection_reason: string;
  source_ref: string;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminEmployeeStatutoryDeclaration = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  employee_statutory_profile_id: string;
  statutory_pack_id: string | null;
  statutory_pack_name: string | null;
  financial_year_code: string;
  declaration_profile_ref: string;
  proof_window_ref: string;
  status: string;
  status_label: string;
  tax_regime: string;
  tax_regime_label: string;
  declared_total_amount: string;
  verified_total_amount: string;
  submitted_at: string | null;
  submitted_by_name: string | null;
  verified_at: string | null;
  verified_by_name: string | null;
  rejected_at: string | null;
  rejected_by_name: string | null;
  locked_at: string | null;
  locked_by_name: string | null;
  rejection_reason: string;
  source_ref: string;
  source_hash: string;
  config_snapshot: Record<string, unknown>;
  item_count: number;
  submitted_item_count: number;
  verified_item_count: number;
  rejected_item_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollStatutorySetupResponse = {
  summary: {
    pack_count: number;
    active_pack_count: number;
    statutory_component_count: number;
    active_statutory_component_count: number;
    slab_count: number;
    employee_profile_count: number;
    active_employee_profile_count: number;
    pf_applicable_employee_count: number;
    esi_applicable_employee_count: number;
    declared_tax_profile_count: number;
    declaration_count: number;
    submitted_declaration_count: number;
    verified_declaration_count: number;
    locked_declaration_count: number;
    declaration_item_count: number;
    verified_declaration_item_count: number;
    employer_registration_count: number;
    active_employer_registration_count: number;
    filing_calendar_count: number;
    due_filing_calendar_count: number;
    overdue_filing_calendar_count: number;
    acknowledged_filing_calendar_count: number;
  };
  packs: HrAdminPayrollStatutoryPack[];
  statutory_components: HrAdminPayrollStatutoryComponent[];
  slabs: HrAdminPayrollStatutorySlab[];
  employer_registrations: HrAdminPayrollStatutoryEmployerRegistration[];
  filing_calendars: HrAdminPayrollStatutoryFilingCalendar[];
  employee_profiles: HrAdminEmployeeStatutoryProfile[];
  declarations: HrAdminEmployeeStatutoryDeclaration[];
  declaration_items: HrAdminEmployeeStatutoryDeclarationItem[];
  options: {
    config_statuses: HrAdminEnumOption[];
    statutory_component_types: HrAdminEnumOption[];
    contribution_owners: HrAdminEnumOption[];
    calculation_methods: HrAdminEnumOption[];
    payroll_frequencies: HrAdminEnumOption[];
    tax_regimes: HrAdminEnumOption[];
    declaration_statuses: HrAdminEnumOption[];
    statutory_declaration_statuses: HrAdminEnumOption[];
    statutory_declaration_item_kinds: HrAdminEnumOption[];
    statutory_proof_statuses: HrAdminEnumOption[];
    statutory_filing_statuses: HrAdminEnumOption[];
    salary_components: Array<{ id: string; code: string; name: string; component_type: string }>;
    employees: HrAdminManagerOption[];
    legal_entities: HrAdminOptionItem[];
    branches: HrAdminOptionItem[];
    locations: HrAdminOptionItem[];
  };
};

export type HrAdminPayrollRunCalculation = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  payroll_run_status: string;
  period_name: string;
  pay_group_name: string | null;
  attempt_number: number;
  status: string;
  status_label: string;
  calculation_profile_ref: string;
  calculated_at: string | null;
  calculated_by_name: string | null;
  rule_selection_snapshot: Record<string, unknown>;
  totals_snapshot: Record<string, unknown>;
  error_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  line_count: number;
  error_line_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollCalculationLine = {
  id: string;
  calculation_id: string;
  payroll_run_id: string;
  input_snapshot_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  rule_version_id: string | null;
  rule_code: string;
  rule_name: string;
  rule_version: number | null;
  adjustment_id: string | null;
  line_source: string;
  line_source_label: string;
  component_code: string;
  component_name: string;
  line_type: string;
  calculation_order: number;
  amount: string;
  currency_code: string;
  status: string;
  status_label: string;
  expression: string;
  source_hash: string;
  context_snapshot: Record<string, unknown>;
  result_snapshot: Record<string, unknown>;
  trace_snapshot: Record<string, unknown>;
  error_message: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollValidationIssue = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  calculation_id: string | null;
  input_snapshot_id: string | null;
  employee_id: string | null;
  employee_code: string;
  employee_name: string;
  calculation_line_id: string | null;
  severity: string;
  severity_label: string;
  category: string;
  category_label: string;
  status: string;
  status_label: string;
  issue_code: string;
  title: string;
  detail: string;
  source_ref: string;
  validation_profile_ref: string;
  source_hash: string;
  context_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollCalculationSetupResponse = {
  summary: {
    run_count: number;
    calculable_run_count: number;
    calculation_count: number;
    completed_calculation_count: number;
    failed_calculation_count: number;
    line_count: number;
    error_line_count: number;
    validation_issue_count: number;
    open_validation_issue_count: number;
    validation_warning_count: number;
    validation_blocker_count: number;
    latest_net_pay: string;
  };
  runs: HrAdminPayrollRun[];
  calculations: HrAdminPayrollRunCalculation[];
  lines: HrAdminPayrollCalculationLine[];
  validation_issues: HrAdminPayrollValidationIssue[];
  options: {
    payroll_run_statuses: HrAdminEnumOption[];
    calculation_statuses: HrAdminEnumOption[];
    line_statuses: HrAdminEnumOption[];
    line_sources: HrAdminEnumOption[];
    validation_severities: HrAdminEnumOption[];
    validation_categories: HrAdminEnumOption[];
    validation_statuses: HrAdminEnumOption[];
    active_rule_versions: Array<{
      id: string;
      rule_code: string;
      rule_name: string;
      rule_type: string;
      version: number;
      effective_from: string;
      effective_to: string | null;
      calculation_order: number | null;
    }>;
  };
};

export type HrAdminPayrollRunReview = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  payroll_run_status: string;
  calculation_id: string;
  calculation_attempt_number: number;
  status: string;
  status_label: string;
  review_profile_ref: string;
  opened_at: string;
  opened_by_name: string | null;
  submitted_at: string | null;
  submitted_by_name: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  locked_at: string | null;
  locked_by_name: string | null;
  totals_snapshot: Record<string, unknown>;
  exception_summary_snapshot: Record<string, unknown>;
  approval_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  exception_count: number;
  approval_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollRunException = {
  id: string;
  review_id: string;
  payroll_run_id: string;
  calculation_line_id: string | null;
  input_snapshot_id: string | null;
  employee_id: string | null;
  employee_code: string | null;
  employee_name: string | null;
  component_code: string | null;
  category: string;
  severity: string;
  severity_label: string;
  status: string;
  status_label: string;
  title: string;
  detail: string;
  decision_reason: string;
  decided_at: string | null;
  decided_by_name: string | null;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollRunApproval = {
  id: string;
  review_id: string;
  payroll_run_id: string;
  approver_name: string | null;
  status: string;
  status_label: string;
  comment: string;
  decided_at: string | null;
  approval_profile_ref: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollReviewSetupResponse = {
  summary: {
    run_count: number;
    review_count: number;
    open_review_count: number;
    approved_review_count: number;
    locked_review_count: number;
    exception_count: number;
    open_exception_count: number;
    open_blocker_count: number;
    approval_count: number;
    latest_net_pay: string;
  };
  runs: HrAdminPayrollRun[];
  calculations: HrAdminPayrollRunCalculation[];
  reviews: HrAdminPayrollRunReview[];
  exceptions: HrAdminPayrollRunException[];
  approvals: HrAdminPayrollRunApproval[];
  lines: HrAdminPayrollCalculationLine[];
  options: {
    payroll_run_statuses: HrAdminEnumOption[];
    review_statuses: HrAdminEnumOption[];
    exception_statuses: HrAdminEnumOption[];
    exception_severities: HrAdminEnumOption[];
    approval_statuses: HrAdminEnumOption[];
  };
};

export type HrAdminPayrollOutputBatch = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  review_id: string;
  review_status: string;
  status: string;
  status_label: string;
  output_profile_ref: string;
  generated_at: string | null;
  generated_by_name: string | null;
  published_at: string | null;
  published_by_name: string | null;
  totals_snapshot: Record<string, unknown>;
  artifact_summary_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  artifact_count: number;
  payslip_count: number;
  register_count: number;
  published_artifact_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollOutputArtifact = {
  id: string;
  output_batch_id: string;
  payroll_run_id: string;
  review_id: string;
  employee_id: string | null;
  employee_code: string | null;
  employee_name: string | null;
  input_snapshot_id: string | null;
  kind: string;
  kind_label: string;
  status: string;
  status_label: string;
  artifact_key: string;
  title: string;
  file_name: string;
  content_type: string;
  storage_provider_ref: string;
  storage_key: string;
  storage_object_version: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  is_downloadable: boolean;
  download_strategy_ref: string;
  supports_signed_url: boolean;
  signed_url_expires_in_seconds: number;
  retention_policy_ref: string;
  download_url: string | null;
  signed_download_url: string | null;
  signed_download_expires_at: string | null;
  output_profile_ref: string;
  totals_snapshot: Record<string, unknown>;
  line_snapshot: Record<string, unknown>[];
  access_summary: {
    published_event_count: number;
    notification_count: number;
    signed_url_issued_count: number;
    download_count: number;
    read_acknowledgement_count: number;
    revoked_event_count: number;
    active_signed_grant_count: number;
    revoked_signed_grant_count: number;
    expired_signed_grant_count: number;
    latest_downloaded_at: string | null;
    first_read_at: string | null;
    latest_notification_at: string | null;
    latest_signed_grant_expires_at: string | null;
    latest_revoked_at: string | null;
    is_read_acknowledged: boolean;
  };
  access_events: {
    id: string;
    event_type: string;
    status: string;
    event_profile_ref: string;
    source_channel_ref: string;
    actor_identifier: string;
    notification_id: string | null;
    signed_access_grant_id: string | null;
    request_identifier: string;
    storage_provider_ref: string;
    storage_object_version: string;
    download_strategy_ref: string;
    checksum_sha256: string;
    read_at: string | null;
    created_at: string;
    metadata_snapshot: Record<string, unknown>;
  }[];
  source_hash: string;
  published_at: string | null;
  published_by_name: string | null;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollOutputSetupResponse = {
  summary: {
    run_count: number;
    locked_review_count: number;
    output_batch_count: number;
    generated_batch_count: number;
    published_batch_count: number;
    artifact_count: number;
    payslip_count: number;
    register_count: number;
    published_artifact_count: number;
    latest_net_pay: string;
  };
  runs: HrAdminPayrollRun[];
  reviews: HrAdminPayrollRunReview[];
  output_batches: HrAdminPayrollOutputBatch[];
  artifacts: HrAdminPayrollOutputArtifact[];
  options: {
    output_batch_statuses: HrAdminEnumOption[];
    output_artifact_kinds: HrAdminEnumOption[];
    output_artifact_statuses: HrAdminEnumOption[];
  };
};

export type HrAdminPayrollFinanceHandoff = {
  id: string;
  output_batch_id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  review_id: string;
  status: string;
  status_label: string;
  handoff_profile_ref: string;
  bank_file_profile_ref: string;
  accounting_export_profile_ref: string;
  statutory_pack_ref: string;
  generated_at: string | null;
  generated_by_name: string | null;
  transmitted_at: string | null;
  transmitted_by_name: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  totals_snapshot: Record<string, unknown>;
  handoff_summary_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  artifact_count: number;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderDelivery = {
  id: string;
  handoff_id: string;
  output_artifact_id: string;
  output_artifact_title: string;
  output_batch_id: string;
  payroll_run_id: string;
  review_id: string;
  artifact_kind: string;
  artifact_kind_label: string;
  status: string;
  status_label: string;
  provider_ref: string;
  channel_ref: string;
  external_reference: string;
  retry_policy_ref: string;
  attempt_count: number;
  submitted_at: string | null;
  submitted_by_name: string | null;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  reconciled_at: string | null;
  reconciled_by_name: string | null;
  failure_code: string;
  failure_reason: string;
  payload_checksum_sha256: string;
  request_snapshot: Record<string, unknown>;
  response_snapshot: Record<string, unknown>;
  reconciliation_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderCallbackEvent = {
  id: string;
  provider_delivery_id: string;
  handoff_id: string;
  output_artifact_id: string;
  output_artifact_title: string;
  provider_ref: string;
  external_reference: string;
  external_event_id: string;
  idempotency_key: string;
  callback_profile_ref: string;
  callback_verification_ref: string;
  status: string;
  status_label: string;
  provider_status: string;
  provider_status_label: string;
  payload_checksum_sha256: string;
  signature: string;
  verification_snapshot: Record<string, unknown>;
  payload_snapshot: Record<string, unknown>;
  processing_snapshot: Record<string, unknown>;
  received_at: string | null;
  processed_at: string | null;
  failure_code: string;
  failure_reason: string;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderRetryEvent = {
  id: string;
  provider_delivery_id: string;
  handoff_id: string;
  output_artifact_id: string;
  output_artifact_title: string;
  status: string;
  status_label: string;
  retry_policy_ref: string;
  failure_taxonomy_ref: string;
  failure_category_ref: string;
  retry_reason: string;
  attempt_number: number;
  scheduled_for: string | null;
  executed_at: string | null;
  requested_by_name: string | null;
  executed_by_name: string | null;
  decision_snapshot: Record<string, unknown>;
  request_snapshot: Record<string, unknown>;
  response_snapshot: Record<string, unknown>;
  failure_code: string;
  failure_reason: string;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderJob = {
  id: string;
  job_kind: string;
  job_kind_label: string;
  status: string;
  status_label: string;
  queue_policy_ref: string;
  worker_profile_ref: string;
  idempotency_key: string;
  provider_ref: string;
  provider_delivery_id: string | null;
  provider_connection_id: string | null;
  retry_event_id: string | null;
  callback_event_id: string | null;
  certification_run_id: string | null;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  scheduled_for: string | null;
  leased_at: string | null;
  leased_until: string | null;
  lease_owner_ref: string;
  heartbeat_at: string | null;
  heartbeat_count: number;
  recovery_count: number;
  last_recovered_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  requested_by_name: string | null;
  executed_by_name: string | null;
  request_snapshot: Record<string, unknown>;
  lease_snapshot: Record<string, unknown>;
  response_snapshot: Record<string, unknown>;
  failure_code: string;
  failure_reason: string;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollFinanceHandoffSetupResponse = {
  summary: {
    published_output_batch_count: number;
    handoff_count: number;
    generated_handoff_count: number;
    transmitted_handoff_count: number;
    accepted_handoff_count: number;
    submitted_delivery_count: number;
    reconciled_delivery_count: number;
    failed_delivery_count: number;
    rejected_delivery_count: number;
    finance_artifact_count: number;
    statutory_filing_artifact_count?: number;
    statutory_filing_count?: number;
    provider_callback_event_count?: number;
    processed_provider_callback_event_count?: number;
    rejected_provider_callback_event_count?: number;
    provider_retry_event_count?: number;
    scheduled_provider_retry_event_count?: number;
    executed_provider_retry_event_count?: number;
    dead_lettered_provider_retry_event_count?: number;
    provider_job_count?: number;
    queued_provider_job_count?: number;
    running_provider_job_count?: number;
    completed_provider_job_count?: number;
    dead_lettered_provider_job_count?: number;
    recovered_provider_job_count?: number;
    heartbeat_provider_job_count?: number;
    stale_provider_job_count?: number;
    provider_audit_pack_count?: number;
    latest_net_pay: string;
  };
  output_batches: HrAdminPayrollOutputBatch[];
  handoffs: HrAdminPayrollFinanceHandoff[];
  artifacts: HrAdminPayrollOutputArtifact[];
  deliveries: HrAdminPayrollProviderDelivery[];
  callback_events: HrAdminPayrollProviderCallbackEvent[];
  retry_events: HrAdminPayrollProviderRetryEvent[];
  provider_jobs: HrAdminPayrollProviderJob[];
  options: {
    handoff_statuses: HrAdminEnumOption[];
    output_artifact_kinds: HrAdminEnumOption[];
    output_artifact_statuses: HrAdminEnumOption[];
    provider_delivery_statuses: HrAdminEnumOption[];
    provider_callback_event_statuses: HrAdminEnumOption[];
    provider_retry_event_statuses: HrAdminEnumOption[];
    provider_job_kinds?: HrAdminEnumOption[];
    provider_job_statuses?: HrAdminEnumOption[];
  };
};

export type HrAdminPayrollProviderConnection = {
  id: string;
  provider_ref: string;
  provider_name: string;
  provider_kind: string;
  provider_kind_label: string;
  environment_ref: string;
  status: string;
  status_label: string;
  adapter_ref: string;
  sandbox_adapter_ref: string;
  channel_ref: string;
  credential_ref: string;
  credential_profile_ref: string;
  credential_required: boolean;
  callback_profile_ref: string;
  callback_verification_ref: string;
  retry_policy_ref: string;
  certification_status: string;
  certification_status_label: string;
  certification_profile_ref: string;
  certified_at: string | null;
  certified_by_name: string | null;
  last_tested_at: string | null;
  last_tested_by_name: string | null;
  readiness_snapshot: Record<string, unknown>;
  certification_snapshot: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderCertificationRun = {
  id: string;
  provider_connection_id: string;
  provider_ref: string;
  provider_kind: string;
  provider_kind_label: string;
  environment_ref: string;
  run_profile_ref: string;
  certification_profile_ref: string;
  scenario_profile_ref: string;
  status: string;
  status_label: string;
  scenario_count: number;
  passed_count: number;
  failed_count: number;
  blocker_count: number;
  started_at: string | null;
  completed_at: string | null;
  requested_by_name: string | null;
  executed_by_name: string | null;
  request_snapshot: Record<string, unknown>;
  response_snapshot: Record<string, unknown>;
  evidence_snapshot: Record<string, unknown>;
  error_snapshot: Record<string, unknown>;
  source_hash: string;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderSchemaMappingPack = {
  id: string;
  provider_connection_id: string | null;
  provider_ref: string;
  provider_kind: string;
  provider_kind_label: string;
  environment_ref: string;
  artifact_kind: string;
  artifact_kind_label: string;
  mapping_profile_ref: string;
  version: number;
  status: string;
  status_label: string;
  source_schema_ref: string;
  target_schema_ref: string;
  transform_profile_ref: string;
  validation_profile_ref: string;
  enforcement_mode: string;
  transform_rules: Record<string, unknown>[];
  validation_rules: Record<string, unknown>[];
  sample_request_snapshot: Record<string, unknown>;
  sample_output_snapshot: Record<string, unknown>;
  evidence_snapshot: Record<string, unknown>;
  source_hash: string;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderSchemaMappingSimulation = {
  id: string;
  mapping_pack_id: string;
  baseline_mapping_pack_id: string | null;
  provider_connection_id: string | null;
  provider_ref: string;
  provider_kind: string;
  provider_kind_label: string;
  environment_ref: string;
  artifact_kind: string;
  artifact_kind_label: string;
  mapping_profile_ref: string;
  mapping_pack_version: number;
  baseline_mapping_pack_version: number;
  simulation_profile_ref: string;
  comparison_profile_ref: string;
  status: string;
  status_label: string;
  comparison_status: string;
  gate_count: number;
  passed_gate_count: number;
  blocker_count: number;
  changed_path_count: number;
  added_path_count: number;
  removed_path_count: number;
  request_snapshot: Record<string, unknown>;
  provider_payload_snapshot: Record<string, unknown>;
  baseline_payload_snapshot: Record<string, unknown>;
  gate_snapshot: Record<string, unknown>[];
  blocking_gate_refs: string[];
  comparison_snapshot: Record<string, unknown>;
  evidence_snapshot: Record<string, unknown>;
  source_hash: string;
  simulated_by_name: string | null;
  simulated_at: string;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderAdapterRegistryEntry = {
  adapter_ref: string;
  source_ref: string;
  loader_ref: string;
  status: string;
  required_by_connection: boolean;
  blocking_gate_refs: string[];
  capabilities: Record<string, unknown>;
};

export type HrAdminPayrollProviderAdapterRegistry = {
  registry_profile_ref: string;
  adapter_count: number;
  ready_adapter_count: number;
  blocked_adapter_count: number;
  configured_adapter_count: number;
  builtin_adapter_count: number;
  production_pack_adapter_count: number;
  required_adapter_count: number;
  blocked_adapter_refs: string[];
  adapters: HrAdminPayrollProviderAdapterRegistryEntry[];
};

export type HrAdminPayrollProviderClientRegistryEntry = {
  client_ref: string;
  source_ref: string;
  loader_ref: string;
  status: string;
  required_by_connection: boolean;
  blocking_gate_refs: string[];
  capabilities: Record<string, unknown>;
};

export type HrAdminPayrollProviderClientRegistry = {
  registry_profile_ref: string;
  client_count: number;
  ready_client_count: number;
  blocked_client_count: number;
  configured_client_count: number;
  builtin_client_count: number;
  fixture_client_count: number;
  required_client_count: number;
  blocked_client_refs: string[];
  clients: HrAdminPayrollProviderClientRegistryEntry[];
};

export type HrAdminPayrollProviderPackageRegistryEntry = {
  package_ref: string;
  source_ref: string;
  status: string;
  required_by_connection: boolean;
  blocking_gate_refs: string[];
  manifest: Record<string, unknown>;
  capabilities: Record<string, unknown>;
};

export type HrAdminPayrollProviderPackageRegistry = {
  registry_profile_ref: string;
  package_count: number;
  ready_package_count: number;
  blocked_package_count: number;
  configured_package_count: number;
  builtin_package_count: number;
  fixture_package_count: number;
  required_package_count: number;
  blocked_package_refs: string[];
  packages: HrAdminPayrollProviderPackageRegistryEntry[];
};

export type HrAdminPayrollStoragePolicyRegistryEntry = {
  storage_policy_ref: string;
  source_ref: string;
  status: string;
  required_by_package: boolean;
  blocking_gate_refs: string[];
  policy: Record<string, unknown>;
  control_verification: Record<string, unknown>;
  capabilities: Record<string, unknown>;
};

export type HrAdminPayrollStoragePolicyRegistry = {
  registry_profile_ref: string;
  storage_policy_count: number;
  ready_storage_policy_count: number;
  blocked_storage_policy_count: number;
  configured_storage_policy_count: number;
  builtin_storage_policy_count: number;
  required_storage_policy_count: number;
  blocked_storage_policy_refs: string[];
  policies: HrAdminPayrollStoragePolicyRegistryEntry[];
};

export type HrAdminPayrollProviderLaunchRehearsal = {
  id: string;
  rehearsal_profile_ref: string;
  audit_pack_ref: string;
  generated_by_ref: string;
  status: string;
  status_label: string;
  can_launch: boolean;
  ready_lane_count: number;
  blocked_lane_count: number;
  launch_blocker_count: number;
  release_blocker_refs: string[];
  audit_pack_snapshot: Record<string, unknown>;
  evidence_checksum_sha256: string;
  generated_at: string;
  generated_by_name: string | null;
  source_hash: string;
  created_at: string;
  updated_at: string;
};

export type HrAdminPayrollProviderConnectionSetupResponse = {
  summary: {
    connection_count: number;
    active_connection_count: number;
    certified_connection_count: number;
    sandbox_ready_connection_count: number;
    blocked_connection_count: number;
    credential_required_count: number;
    active_allowed_count: number;
    certification_run_count: number;
    passed_certification_run_count: number;
    failed_certification_run_count: number;
    schema_mapping_pack_count?: number;
    active_schema_mapping_pack_count?: number;
    draft_schema_mapping_pack_count?: number;
    archived_schema_mapping_pack_count?: number;
    strict_schema_mapping_pack_count?: number;
    schema_mapping_simulation_count?: number;
    passed_schema_mapping_simulation_count?: number;
    blocked_schema_mapping_simulation_count?: number;
    changed_schema_mapping_simulation_count?: number;
    adapter_registry_count?: number;
    ready_adapter_registry_count?: number;
    blocked_adapter_registry_count?: number;
    configured_adapter_registry_count?: number;
    production_pack_adapter_registry_count?: number;
    client_registry_count?: number;
    ready_client_registry_count?: number;
    blocked_client_registry_count?: number;
    configured_client_registry_count?: number;
    fixture_client_registry_count?: number;
    package_registry_count?: number;
    ready_package_registry_count?: number;
    blocked_package_registry_count?: number;
    configured_package_registry_count?: number;
    fixture_package_registry_count?: number;
    storage_policy_registry_count?: number;
    ready_storage_policy_registry_count?: number;
    blocked_storage_policy_registry_count?: number;
    configured_storage_policy_registry_count?: number;
    required_storage_policy_registry_count?: number;
    launch_rehearsal_status?: string;
    launch_rehearsal_ready_lane_count?: number;
    launch_rehearsal_blocked_lane_count?: number;
    launch_rehearsal_blocker_count?: number;
    launch_rehearsal_run_count?: number;
    ready_launch_rehearsal_run_count?: number;
    blocked_launch_rehearsal_run_count?: number;
    latest_launch_rehearsal_status?: string;
    latest_launch_rehearsal_checksum?: string;
    bank_connection_count: number;
    accounting_connection_count: number;
    statutory_connection_count: number;
  };
  connections: HrAdminPayrollProviderConnection[];
  certification_runs: HrAdminPayrollProviderCertificationRun[];
  schema_mapping_packs: HrAdminPayrollProviderSchemaMappingPack[];
  schema_mapping_simulations: HrAdminPayrollProviderSchemaMappingSimulation[];
  launch_rehearsals: HrAdminPayrollProviderLaunchRehearsal[];
  adapter_registry?: HrAdminPayrollProviderAdapterRegistry;
  client_registry?: HrAdminPayrollProviderClientRegistry;
  package_registry?: HrAdminPayrollProviderPackageRegistry;
  storage_policy_registry?: HrAdminPayrollStoragePolicyRegistry;
  launch_rehearsal?: Record<string, unknown>;
  options: {
    provider_kinds: HrAdminEnumOption[];
    connection_statuses: HrAdminEnumOption[];
    certification_statuses: HrAdminEnumOption[];
    certification_run_statuses: HrAdminEnumOption[];
    schema_mapping_pack_statuses?: HrAdminEnumOption[];
    launch_rehearsal_statuses?: HrAdminEnumOption[];
  };
};

export type HrAdminPayrollProviderLaunchRehearsalActionResult = {
  launch_rehearsal_run: HrAdminPayrollProviderLaunchRehearsal;
  setup: HrAdminPayrollProviderConnectionSetupResponse;
  detail: string;
};

export type HrAdminOrganizationSnapshot = {
  summary: {
    legal_entities_count: number;
    locations_count: number;
    branches_count: number;
    business_units_count: number;
    departments_count: number;
    cost_centers_count: number;
    grades_count: number;
    designations_count: number;
    employment_types_count: number;
  };
  legal_entities: HrAdminOrganizationItem[];
  locations: HrAdminOrganizationItem[];
  branches: HrAdminOrganizationItem[];
  business_units: HrAdminOrganizationItem[];
  departments: HrAdminOrganizationItem[];
  cost_centers: HrAdminOrganizationItem[];
  grades: HrAdminOrganizationItem[];
  designations: HrAdminOrganizationItem[];
  employment_types: HrAdminOrganizationItem[];
};

export type LeaveBalance = {
  leave_type: string;
  policy_name: string;
  closing_balance: string;
  consumed_amount: string;
  reserved_amount: string;
  period_year?: number;
  accrued_amount?: string;
  carry_forward_amount?: string;
  encashed_amount?: string;
  adjustment_amount?: string;
};

export type EssLeaveTypeOption = {
  id: string;
  code: string;
  name: string;
  short_code: string;
  category: string;
  unit: string;
  requires_attachment: boolean;
  allow_negative_balance: boolean;
};

export type EssAttendanceRecordOption = {
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

export type HrAdminLeaveBalance = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  leave_policy_id: string;
  leave_policy_name: string;
  leave_type_id: string;
  leave_type_name: string;
  period_year: number;
  opening_balance: string;
  accrued_amount: string;
  carry_forward_amount: string;
  consumed_amount: string;
  reserved_amount: string;
  encashed_amount: string;
  adjustment_amount: string;
  closing_balance: string;
};

export type HrAdminLeaveBalanceTransaction = {
  id: string;
  leave_balance_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  leave_policy_id: string;
  leave_policy_name: string;
  status: "pending" | "applied" | "rejected";
  action: "credit_adjustment" | "debit_adjustment" | "encashment";
  units: string;
  effective_date: string;
  reason: string;
  performed_by_id: string | null;
  performed_by_name: string | null;
  reviewed_by_id: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string;
  approval_reason: string | null;
  reviewer_employee_id: string | null;
  reviewer_employee_name: string | null;
  can_current_actor_review: boolean;
  closing_balance_before: string;
  closing_balance_after: string;
  created_at: string;
};

export type HrAdminLeaveBalanceActionInput = {
  employee_id: string | null;
  leave_policy_id: string | null;
  action: "credit_adjustment" | "debit_adjustment" | "encashment";
  units: string;
  effective_date: string | null;
  reason: string;
};

export type HrAdminLeaveBalanceActionResult = {
  balance: HrAdminLeaveBalance;
  transaction: HrAdminLeaveBalanceTransaction;
  applied: boolean;
  requires_review: boolean;
  message: string;
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

export type PaginatedListResponse<T> = {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type PagedStatusCounts = {
  all: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  withdrawn?: number;
  cancelled?: number;
  partially_approved?: number;
};

export type LeaveRequestItem = {
  id: string;
  request_action?: string;
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
  attachment_reference?: string;
  approval_route?: string;
  required_attachment_label?: string | null;
  manager_comment?: string;
  rejection_reason?: string;
  workflow_reference: string;
  applied_at: string | null;
  approved_at?: string | null;
  cancelled_at?: string | null;
  can_withdraw?: boolean;
  withdraw_block_reason?: string | null;
  withdraw_requires_attachment?: boolean;
  withdraw_attachment_label?: string | null;
  can_cancel?: boolean;
  cancel_block_reason?: string | null;
  cancel_requires_attachment?: boolean;
  cancel_attachment_label?: string | null;
  cancel_requires_reapproval?: boolean;
  cancel_approval_route?: HrAdminLeaveApprovalRoute | null;
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

export type HrAdminAttendanceRegularizationListResponse = {
  items: AttendanceRegularizationItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type EssLeaveRequestListResponse = PaginatedListResponse<LeaveRequestItem> & {
  status_counts: PagedStatusCounts;
};

export type EssAttendanceRegularizationListResponse = PaginatedListResponse<AttendanceRegularizationItem> & {
  status_counts: PagedStatusCounts;
};

export type EssDocumentRequirementItem = {
  category_id: string;
  category_code: string;
  category_name: string;
  rule_id: string;
  required_within_days_of_joining: number;
  due_on: string;
  is_future_due: boolean;
  is_compliant: boolean;
  allow_employee_upload: boolean;
  requires_verification: boolean;
  requires_expiry_date: boolean;
  current_document_id: string | null;
  current_document_title: string;
  current_verification_status: string;
  current_expires_on: string | null;
  current_expiry_state: string;
  current_expiry_label: string;
  current_days_until_expiry: number | null;
  current_is_expired: boolean;
  current_is_expiring_soon: boolean;
  current_rejection_reason: string;
  current_uploaded_at: string | null;
};

export type EssDocumentSummary = {
  required_document_count: number;
  missing_required_document_count: number;
  future_due_document_count: number;
  missing_required_document_names: string[];
  future_due_document_names: string[];
  total_documents: number;
  pending_documents: number;
  verified_documents: number;
  rejected_documents: number;
  expiring_documents: number;
  expired_documents: number;
};

export type EssDocumentCenterResponse = PaginatedListResponse<HrAdminEmployeeDocument> & {
  summary: EssDocumentSummary;
  requirement_items: EssDocumentRequirementItem[];
  verification_statuses: HrAdminEnumOption[];
  categories: HrAdminOptionItem[];
  uploadable_categories: HrAdminOptionItem[];
  max_upload_size_bytes: number;
};

export type EssStatutoryDeclarationItem = Omit<
  HrAdminEmployeeStatutoryDeclarationItem,
  "employee_id" | "employee_name" | "employee_code" | "verified_by_name" | "rejected_by_name"
>;

export type EssStatutoryDeclaration = Omit<
  HrAdminEmployeeStatutoryDeclaration,
  "employee_id" | "employee_name" | "employee_code" | "submitted_by_name" | "verified_by_name" | "rejected_by_name" | "locked_by_name"
> & {
  items: EssStatutoryDeclarationItem[];
};

export type EssStatutoryDeclarationListResponse = PaginatedListResponse<EssStatutoryDeclaration> & {
  summary: {
    declaration_count: number;
    draft_declaration_count: number;
    submitted_declaration_count: number;
    verified_declaration_count: number;
    locked_declaration_count: number;
    declaration_item_count: number;
    submitted_item_count: number;
    verified_item_count: number;
    rejected_item_count: number;
    declared_total_amount: string;
    verified_total_amount: string;
    available_financial_years: string[];
  };
  profile: HrAdminEmployeeStatutoryProfile | null;
  options: {
    statutory_declaration_statuses: HrAdminEnumOption[];
    statutory_declaration_item_kinds: HrAdminEnumOption[];
    statutory_proof_statuses: HrAdminEnumOption[];
    tax_regimes: HrAdminEnumOption[];
    proof_upload_categories: HrAdminOptionItem[];
  };
};

export type EssPayrollPayslip = {
  id: string;
  payroll_run_id: string;
  payroll_run_name: string;
  period_name: string;
  period_start_date: string | null;
  period_end_date: string | null;
  pay_date: string | null;
  title: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  storage_provider_ref: string;
  storage_object_version: string;
  download_strategy_ref: string;
  supports_signed_url: boolean;
  signed_url_expires_in_seconds: number;
  retention_policy_ref: string;
  download_url: string | null;
  signed_download_url: string | null;
  signed_download_expires_at: string | null;
  totals_snapshot: Record<string, unknown>;
  line_snapshot: Record<string, unknown>[];
  access_summary: {
    published_event_count: number;
    notification_count: number;
    signed_url_issued_count: number;
    download_count: number;
    read_acknowledgement_count: number;
    revoked_event_count: number;
    active_signed_grant_count: number;
    revoked_signed_grant_count: number;
    expired_signed_grant_count: number;
    latest_downloaded_at: string | null;
    first_read_at: string | null;
    latest_notification_at: string | null;
    latest_signed_grant_expires_at: string | null;
    latest_revoked_at: string | null;
    is_read_acknowledged: boolean;
  };
  access_events: {
    id: string;
    event_type: string;
    status: string;
    event_profile_ref: string;
    source_channel_ref: string;
    actor_identifier: string;
    notification_id: string | null;
    signed_access_grant_id: string | null;
    request_identifier: string;
    storage_provider_ref: string;
    storage_object_version: string;
    download_strategy_ref: string;
    checksum_sha256: string;
    read_at: string | null;
    created_at: string;
    metadata_snapshot: Record<string, unknown>;
  }[];
  source_hash: string;
  published_at: string | null;
  published_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type EssPayrollPayslipListResponse = PaginatedListResponse<EssPayrollPayslip> & {
  summary: {
    published_payslip_count: number;
    downloadable_payslip_count: number;
    latest_net_pay: string;
    latest_pay_date: string | null;
    latest_period_name: string;
    available_years: number[];
  };
};

export type ManagerLeaveApprovalListResponse = PaginatedListResponse<LeaveRequestItem>;

export type ManagerAttendanceApprovalListResponse = PaginatedListResponse<AttendanceRegularizationItem>;

export type SessionMembership = {
  id: string;
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  employee_code: string;
  status: string;
  is_default: boolean;
  role_codes: string[];
};

export type SessionWorkspaceAccess = {
  ess: boolean;
  mss: boolean;
  hr_admin: boolean;
  tenant_admin: boolean;
  platform_admin: boolean;
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
  workspace_access: SessionWorkspaceAccess;
};

export type PlatformTenantListItem = {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  status: string;
  onboarding_status: string;
  subscription_plan: string;
  seed_pack: string;
  primary_email: string;
  primary_phone: string;
  timezone: string;
  country_code: string;
  is_sandbox: boolean;
  go_live_at: string | null;
  primary_domain: string;
  created_at: string;
  updated_at: string;
};

export type PlatformOnboardingChecklistItem = {
  id: string;
  code: string;
  label: string;
  status: string;
  completed_at: string | null;
  completed_by_identifier: string;
  notes: string;
  sort_order: number;
};

export type PlatformOnboardingAdminContact = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  is_primary: boolean;
  provisioning_status: string;
  user_id: string | null;
  membership_id: string | null;
  invited_at: string | null;
  first_login_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type PlatformOnboardingEvent = {
  id: string;
  event_type: string;
  summary: string;
  payload: Record<string, unknown>;
  actor_identifier: string;
  created_at: string;
};

export type PlatformTenantOnboarding = {
  id: string;
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  tenant_status: string;
  tenant_onboarding_status: string;
  owner_mode: string;
  setup_style: string;
  data_setup_style: string;
  policy_control_style: string;
  country_context: string;
  industry_context: string;
  notes: string;
  internal_handoff_notes: string;
  customer_handoff_notes: string;
  first_login_verified_at: string | null;
  baseline_published_at: string | null;
  handoff_completed_at: string | null;
  admin_contacts: PlatformOnboardingAdminContact[];
  checklist_items: PlatformOnboardingChecklistItem[];
  recent_events: PlatformOnboardingEvent[];
};

export type PlatformPolicyPackListItem = {
  id: string;
  code: string;
  name: string;
  domain: string;
  country_code: string;
  industry_tag: string;
  description: string;
  status: string;
  version: number;
  is_active: boolean;
  published_at: string | null;
  published_by_identifier: string;
  item_count: number;
  adoption_count: number;
};
