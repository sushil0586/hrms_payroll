import type {
  AttendanceRecordOption,
  AttendanceRegularizationItem,
  EmployeeDashboard,
  LeaveTypeOption,
  LeaveRequestItem,
  ManagerTeamSummary,
  MutationResult,
  SessionUser,
} from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_HRMS_API_BASE_URL;

export type DataState = "live" | "demo";
export type AuthSession = {
  token: string;
  user: SessionUser;
  state: DataState;
};
export type EssBundle = {
  dashboard: EmployeeDashboard;
  leaveTypes: LeaveTypeOption[];
  attendanceRecords: AttendanceRecordOption[];
  leaveRequests: LeaveRequestItem[];
  regularizations: AttendanceRegularizationItem[];
  state: DataState;
};
export type MssBundle = {
  summary: ManagerTeamSummary;
  pendingLeave: LeaveRequestItem[];
  pendingRegularizations: AttendanceRegularizationItem[];
  state: DataState;
};

async function apiGet<T>(path: string, token?: string): Promise<{ data: T; state: DataState }> {
  if (!API_BASE_URL || !token) {
    return { data: getDemoData<T>(path), state: "demo" };
  }

  try {
    const result = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });
    if (!result.ok) {
      return { data: getDemoData<T>(path), state: "demo" };
    }
    return { data: (await result.json()) as T, state: "live" };
  } catch {
    return { data: getDemoData<T>(path), state: "demo" };
  }
}

async function apiPost<T>(path: string, body: Record<string, unknown>, token?: string): Promise<T> {
  if (!API_BASE_URL || !token) {
    throw new Error("Live backend is not connected for this action.");
  }

  const result = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    throw new Error((payload.detail as string) || "Request failed.");
  }
  return payload as T;
}

export async function loginWithPassword(identifier: string, password: string): Promise<AuthSession> {
  if (!API_BASE_URL) {
    return {
      token: "",
      user: getDemoSessionUser(),
      state: "demo",
    };
  }

  const result = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier, password }),
  });

  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    throw new Error(payload.detail || "Login failed.");
  }

  return {
    token: payload.token as string,
    user: payload.user as SessionUser,
    state: "live",
  };
}

export async function getSessionUser(token?: string): Promise<SessionUser | null> {
  if (!API_BASE_URL || !token) {
    return null;
  }

  try {
    const result = await fetch(`${API_BASE_URL}/auth/session/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });
    if (!result.ok) {
      return null;
    }
    return (await result.json()) as SessionUser;
  } catch {
    return null;
  }
}

export async function getEssDashboard(token?: string): Promise<EssBundle> {
  const [dashboard, leaveTypes, attendanceRecords, leaveRequests, regularizations] = await Promise.all([
    apiGet<EmployeeDashboard>("/me/dashboard/", token),
    apiGet<LeaveTypeOption[]>("/me/leave-types/", token),
    apiGet<AttendanceRecordOption[]>("/me/attendance-records/", token),
    apiGet<LeaveRequestItem[]>("/me/leave-requests/", token),
    apiGet<AttendanceRegularizationItem[]>("/me/attendance-regularizations/", token),
  ]);

  return {
    dashboard: dashboard.data,
    leaveTypes: leaveTypes.data,
    attendanceRecords: attendanceRecords.data,
    leaveRequests: leaveRequests.data,
    regularizations: regularizations.data,
    state:
      dashboard.state === "live" &&
      leaveTypes.state === "live" &&
      attendanceRecords.state === "live" &&
      leaveRequests.state === "live" &&
      regularizations.state === "live"
        ? "live"
        : "demo",
  };
}

export async function getMssApprovalInbox(token?: string): Promise<MssBundle> {
  const [summary, pendingLeave, pendingRegularizations] = await Promise.all([
    apiGet<ManagerTeamSummary>("/manager/team-summary/", token),
    apiGet<LeaveRequestItem[]>("/manager/leave-requests/pending/", token),
    apiGet<AttendanceRegularizationItem[]>("/manager/attendance-regularizations/pending/", token),
  ]);

  return {
    summary: summary.data,
    pendingLeave: pendingLeave.data,
    pendingRegularizations: pendingRegularizations.data,
    state: summary.state === "live" && pendingLeave.state === "live" && pendingRegularizations.state === "live" ? "live" : "demo",
  };
}

export async function submitLeaveRequest(
  input: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    start_day_portion?: string;
    end_day_portion?: string;
    reason?: string;
  },
  token?: string,
): Promise<MutationResult> {
  return apiPost<MutationResult>("/me/leave-requests/", input, token);
}

export async function submitAttendanceRegularization(
  input: {
    attendance_record_id: string;
    requested_status: string;
    requested_check_in_at?: string | null;
    requested_check_out_at?: string | null;
    reason?: string;
  },
  token?: string,
): Promise<MutationResult> {
  return apiPost<MutationResult>("/me/attendance-regularizations/", input, token);
}

export async function approveLeaveRequest(requestId: string, comment = "", token?: string): Promise<MutationResult> {
  return apiPost<MutationResult>(`/manager/leave-requests/${requestId}/approve/`, { comment }, token);
}

export async function rejectLeaveRequest(requestId: string, comment = "", token?: string): Promise<MutationResult> {
  return apiPost<MutationResult>(`/manager/leave-requests/${requestId}/reject/`, { comment }, token);
}

export async function approveAttendanceRegularization(regularizationId: string, comment = "", token?: string): Promise<MutationResult> {
  return apiPost<MutationResult>(`/manager/attendance-regularizations/${regularizationId}/approve/`, { comment }, token);
}

export async function rejectAttendanceRegularization(regularizationId: string, comment = "", token?: string): Promise<MutationResult> {
  return apiPost<MutationResult>(`/manager/attendance-regularizations/${regularizationId}/reject/`, { comment }, token);
}

function getDemoSessionUser(): SessionUser {
  return {
    id: "demo-user",
    username: "riya.sharma",
    email: "riya.sharma@northstar.example",
    display_name: "Riya Sharma",
    first_name: "Riya",
    last_name: "Sharma",
    must_change_password: false,
    default_membership: {
      id: "membership-demo",
      tenant_id: "tenant-demo",
      tenant_code: "northstar-foods",
      tenant_name: "Northstar Foods Pvt Ltd",
      employee_code: "EMP-0042",
      status: "active",
      is_default: true,
    },
    memberships: [],
  };
}

function getDemoData<T>(path: string): T {
  const demoDashboard: EmployeeDashboard = {
    profile: {
      id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      full_name: "Riya Sharma",
      preferred_name: "Riya",
      work_email: "riya.sharma@northstar.example",
      personal_email: "riya.personal@example.com",
      phone_number: "+91-9876543210",
      employment_status: "active",
      date_of_joining: "2024-04-15",
      department: "People Operations",
      designation: "Assistant Manager",
      legal_entity: "Northstar Foods Pvt Ltd",
      branch: "Bengaluru HO",
      location: "Bengaluru",
      reporting_manager: "Karan Mehta",
    },
    leave: {
      period_year: 2026,
      pending_requests_count: 1,
      balances: [
        { leave_type: "Casual Leave", policy_name: "CL Standard", closing_balance: "5.50", consumed_amount: "2.00", reserved_amount: "1.00" },
        { leave_type: "Sick Leave", policy_name: "SL Standard", closing_balance: "6.00", consumed_amount: "1.00", reserved_amount: "0.00" },
        { leave_type: "Earned Leave", policy_name: "EL Standard", closing_balance: "12.00", consumed_amount: "3.00", reserved_amount: "0.00" },
      ],
      recent_requests: [],
    },
    attendance: {
      today: {
        date: "2026-06-06",
        status: "present",
        shift: "General Shift",
        check_in_at: "2026-06-06T09:12:00+05:30",
        check_out_at: null,
      },
      month_to_date: {
        present_days: 5,
        absent_days: 0,
        half_days: 1,
        late_days: 1,
        work_duration_hours: "42.50",
        overtime_hours: "1.50",
      },
      pending_regularizations_count: 1,
    },
  };

  const demoLeaveRequests: LeaveRequestItem[] = [
    {
      id: "2016f1cf-6870-4e52-b604-b2082d4f10aa",
      leave_type: "Casual Leave",
      leave_type_code: "casual-leave",
      policy_name: "CL Standard",
      status: "pending",
      start_date: "2026-06-21",
      end_date: "2026-06-22",
      start_day_portion: "full_day",
      end_day_portion: "full_day",
      requested_units: "2.00",
      approved_units: "0.00",
      reason: "Family event out of town.",
      manager_comment: "",
      rejection_reason: "",
      workflow_reference: "wf-leave-001",
      applied_at: "2026-06-05T18:15:00+05:30",
      approved_at: null,
      cancelled_at: null,
      created_at: "2026-06-05T18:15:00+05:30",
      updated_at: "2026-06-05T18:15:00+05:30",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      department: "People Operations",
      designation: "Assistant Manager",
    },
    {
      id: "915a1e75-0f84-45f2-bd19-7e2090eb70e4",
      leave_type: "Sick Leave",
      leave_type_code: "sick-leave",
      policy_name: "SL Standard",
      status: "approved",
      start_date: "2026-05-27",
      end_date: "2026-05-27",
      start_day_portion: "first_half",
      end_day_portion: "second_half",
      requested_units: "1.00",
      approved_units: "1.00",
      reason: "Doctor appointment.",
      manager_comment: "Take care.",
      rejection_reason: "",
      workflow_reference: "wf-leave-0008",
      applied_at: "2026-05-26T16:45:00+05:30",
      approved_at: "2026-05-26T18:00:00+05:30",
      cancelled_at: null,
      created_at: "2026-05-26T16:45:00+05:30",
      updated_at: "2026-05-26T18:00:00+05:30",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      department: "People Operations",
      designation: "Assistant Manager",
    },
  ];

  const demoRegularizations: AttendanceRegularizationItem[] = [
    {
      id: "c89f5554-d7f9-4e56-ac5e-c8dfa0c8787c",
      attendance_record_id: "att-001",
      attendance_date: "2026-06-03",
      current_status: "late",
      requested_status: "present",
      shift: "General Shift",
      requested_check_in_at: "2026-06-03T09:05:00+05:30",
      requested_check_out_at: "2026-06-03T18:30:00+05:30",
      actual_check_in_at: "2026-06-03T10:14:00+05:30",
      actual_check_out_at: "2026-06-03T18:30:00+05:30",
      status: "pending",
      reason: "Biometric device was offline during morning entry.",
      manager_comment: "",
      rejection_reason: "",
      workflow_reference: "wf-att-1001",
      applied_at: "2026-06-03T18:45:00+05:30",
      resolved_at: null,
      created_at: "2026-06-03T18:45:00+05:30",
      updated_at: "2026-06-03T18:45:00+05:30",
      employee_id: "42f9eac1-4dc6-476f-8cd4-923e1e90f001",
      employee_code: "EMP-0042",
      employee_name: "Riya Sharma",
      department: "People Operations",
      designation: "Assistant Manager",
    },
  ];

  const demoManagerSummary: ManagerTeamSummary = {
    team_size: 8,
    employees_on_leave_today: 1,
    pending_leave_approvals_count: 2,
    pending_attendance_regularizations_count: 3,
    attendance_exceptions_today: 2,
  };

  const demoLeaveTypes: LeaveTypeOption[] = [
    {
      id: "lt-cl",
      code: "casual-leave",
      name: "Casual Leave",
      short_code: "CL",
      category: "paid",
      unit: "day",
      requires_attachment: false,
      allow_negative_balance: false,
    },
    {
      id: "lt-sl",
      code: "sick-leave",
      name: "Sick Leave",
      short_code: "SL",
      category: "sick",
      unit: "day",
      requires_attachment: false,
      allow_negative_balance: false,
    },
    {
      id: "lt-el",
      code: "earned-leave",
      name: "Earned Leave",
      short_code: "EL",
      category: "vacation",
      unit: "day",
      requires_attachment: false,
      allow_negative_balance: false,
    },
  ];

  const demoAttendanceRecords: AttendanceRecordOption[] = [
    {
      id: "att-001",
      attendance_date: "2026-06-03",
      status: "late",
      shift: "General Shift",
      check_in_at: "2026-06-03T10:14:00+05:30",
      check_out_at: "2026-06-03T18:30:00+05:30",
      is_regularized: false,
      is_locked: false,
      late_minutes: 74,
    },
    {
      id: "att-002",
      attendance_date: "2026-06-04",
      status: "present",
      shift: "General Shift",
      check_in_at: "2026-06-04T09:06:00+05:30",
      check_out_at: "2026-06-04T18:18:00+05:30",
      is_regularized: false,
      is_locked: false,
      late_minutes: 0,
    },
  ];

  switch (path) {
    case "/me/dashboard/":
      return demoDashboard as T;
    case "/me/leave-types/":
      return demoLeaveTypes as T;
    case "/me/attendance-records/":
      return demoAttendanceRecords as T;
    case "/me/leave-requests/":
      return demoLeaveRequests as T;
    case "/me/attendance-regularizations/":
      return demoRegularizations as T;
    case "/manager/team-summary/":
      return demoManagerSummary as T;
    case "/manager/leave-requests/pending/":
      return demoLeaveRequests.filter((item) => item.status === "pending") as T;
    case "/manager/attendance-regularizations/pending/":
      return demoRegularizations.filter((item) => item.status === "pending") as T;
    default:
      return [] as T;
  }
}
