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
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  is_downloadable: boolean;
  retention_policy_ref: string;
  download_url: string | null;
  output_profile_ref: string;
  totals_snapshot: Record<string, unknown>;
  line_snapshot: Record<string, unknown>[];
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

export type HrAdminPayrollFinanceHandoffSetupResponse = {
  summary: {
    published_output_batch_count: number;
    handoff_count: number;
    generated_handoff_count: number;
    transmitted_handoff_count: number;
    accepted_handoff_count: number;
    finance_artifact_count: number;
    latest_net_pay: string;
  };
  output_batches: HrAdminPayrollOutputBatch[];
  handoffs: HrAdminPayrollFinanceHandoff[];
  artifacts: HrAdminPayrollOutputArtifact[];
  options: {
    handoff_statuses: HrAdminEnumOption[];
    output_artifact_kinds: HrAdminEnumOption[];
    output_artifact_statuses: HrAdminEnumOption[];
  };
};

export type HrAdminOrganizationSnapshot = {
  summary: {
    legal_entities_count: number;
    locations_count: number;
    branches_count: number;
    business_units_count: number;
    departments_count: number;
    grades_count: number;
    designations_count: number;
    employment_types_count: number;
  };
  legal_entities: HrAdminOrganizationItem[];
  locations: HrAdminOrganizationItem[];
  branches: HrAdminOrganizationItem[];
  business_units: HrAdminOrganizationItem[];
  departments: HrAdminOrganizationItem[];
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
