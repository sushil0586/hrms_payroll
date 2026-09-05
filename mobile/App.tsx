import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  approveAttendanceRegularization,
  approveLeaveRequest,
  getEssDashboard,
  getMssApprovalInbox,
  getSessionUser,
  loginWithPassword,
  rejectAttendanceRegularization,
  rejectLeaveRequest,
  submitAttendanceRegularization,
  submitLeaveRequest,
  type AuthSession,
  type EssBundle,
  type MssBundle,
} from "./src/lib/api";
import { clearSession, loadSession, saveSession } from "./src/lib/session-storage";
import { palette } from "./src/lib/theme";

type TabKey = "home" | "attendance" | "leave" | "approvals" | "more";
type Notice = { tone: "info" | "error"; message: string } | null;

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [essBundle, setEssBundle] = useState<EssBundle | null>(null);
  const [mssBundle, setMssBundle] = useState<MssBundle | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    message: "Demo mode is available automatically when the backend is not connected.",
  });

  const isManager = useMemo(
    () => Boolean(mssBundle && (mssBundle.pendingLeave.length || mssBundle.pendingRegularizations.length || mssBundle.summary.team_size)),
    [mssBundle],
  );

  async function loadWorkspace(nextSession: AuthSession) {
    const [ess, mss] = await Promise.all([
      getEssDashboard(nextSession.token),
      getMssApprovalInbox(nextSession.token),
    ]);

    setSession(nextSession);
    setEssBundle(ess);
    setMssBundle(mss);
    setActiveTab("home");
    setNotice({
      tone: "info",
      message:
        ess.state === "live" && mss.state === "live"
          ? "Connected to live backend data."
          : "Signed in, but some screens are using seeded mobile preview data.",
    });
  }

  async function loadDemoWorkspace() {
    const demoSession: AuthSession = {
      token: "",
      user: {
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
      },
      state: "demo",
    };

    const [ess, mss] = await Promise.all([getEssDashboard(""), getMssApprovalInbox("")]);
    setSession(demoSession);
    setEssBundle(ess);
    setMssBundle(mss);
    setActiveTab("home");
    setNotice({
      tone: "info",
      message: "Mobile app is currently using seeded demo data.",
    });
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedSession = await loadSession();
        if (!storedSession || !storedSession.token) {
          return;
        }

        const sessionUser = await getSessionUser(storedSession.token);
        if (!sessionUser) {
          await clearSession();
          setNotice({
            tone: "info",
            message: "Your previous session expired. Please sign in again.",
          });
          return;
        }

        const restoredSession: AuthSession = {
          ...storedSession,
          user: sessionUser,
          state: "live",
        };
        const [ess, mss] = await Promise.all([
          getEssDashboard(restoredSession.token),
          getMssApprovalInbox(restoredSession.token),
        ]);

        setSession(restoredSession);
        setEssBundle(ess);
        setMssBundle(mss);
        setActiveTab("home");
        setNotice({
          tone: "info",
          message:
            ess.state === "live" && mss.state === "live"
              ? "Session restored successfully."
              : "Session restored, but some screens are using preview data.",
        });
      } catch {
        await clearSession();
        setNotice({
          tone: "error",
          message: "We could not restore the previous mobile session.",
        });
      } finally {
        setIsRestoring(false);
      }
    }

    restoreSession().catch(async () => {
      await clearSession();
      setNotice({
        tone: "error",
        message: "We could not restore the previous mobile session.",
      });
      setIsRestoring(false);
    });
  }, []);

  async function handleLogin(identifier: string, password: string) {
    setIsLoading(true);
    setNotice(null);

    try {
      const nextSession = await loginWithPassword(identifier, password);
      await loadWorkspace(nextSession);
      if (nextSession.state === "live" && nextSession.token) {
        await saveSession(nextSession);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to sign in.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleDemoMode() {
    loadDemoWorkspace().catch(() => {
      setNotice({
        tone: "error",
        message: "We could not open demo mode right now.",
      });
    });
  }

  async function refreshWorkspaceForCurrentSession(nextNotice?: Notice) {
    if (!session) {
      return;
    }
    if (session.state === "demo" || !session.token) {
      await loadDemoWorkspace();
      return;
    }
    const [ess, mss] = await Promise.all([getEssDashboard(session.token), getMssApprovalInbox(session.token)]);
    setEssBundle(ess);
    setMssBundle(mss);
    if (nextNotice) {
      setNotice(nextNotice);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refreshWorkspaceForCurrentSession({
        tone: "info",
        message: session?.state === "demo" ? "Demo workspace refreshed." : "Workspace refreshed successfully.",
      });
    } catch {
      setNotice({
        tone: "error",
        message: "Refresh failed. Pull again or use retry.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRetry() {
    if (!session) {
      return;
    }
    if (!session.token || session.state === "demo") {
      await loadDemoWorkspace();
      return;
    }
    try {
      const sessionUser = await getSessionUser(session.token);
      if (!sessionUser) {
        await clearSession();
        setSession(null);
        setEssBundle(null);
        setMssBundle(null);
        setNotice({
          tone: "error",
          message: "Retry failed because the session expired. Please sign in again.",
        });
        return;
      }
      await loadWorkspace({ ...session, user: sessionUser, state: "live" });
    } catch {
      setNotice({
        tone: "error",
        message: "Retry failed. Please try again.",
      });
    }
  }

  async function handleLeaveRequestSubmit(input: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    start_day_portion?: string;
    end_day_portion?: string;
    reason?: string;
  }) {
    if (!session?.token) {
      throw new Error("Please sign in with a live backend session to submit leave.");
    }
    await submitLeaveRequest(input, session.token);
    await refreshWorkspaceForCurrentSession({
      tone: "info",
      message: "Leave request submitted successfully.",
    });
  }

  async function handleRegularizationSubmit(input: {
    attendance_record_id: string;
    requested_status: string;
    requested_check_in_at?: string | null;
    requested_check_out_at?: string | null;
    reason?: string;
  }) {
    if (!session?.token) {
      throw new Error("Please sign in with a live backend session to submit regularization.");
    }
    await submitAttendanceRegularization(input, session.token);
    await refreshWorkspaceForCurrentSession({
      tone: "info",
      message: "Attendance regularization submitted successfully.",
    });
  }

  async function handleManagerLeaveDecision(input: {
    requestId: string;
    approve: boolean;
    comment?: string;
  }) {
    if (!session?.token) {
      throw new Error("Please sign in with a live backend session to resolve approvals.");
    }
    if (input.approve) {
      await approveLeaveRequest(input.requestId, input.comment || "", session.token);
    } else {
      await rejectLeaveRequest(input.requestId, input.comment || "", session.token);
    }
    await refreshWorkspaceForCurrentSession({
      tone: "info",
      message: `Leave request ${input.approve ? "approved" : "rejected"} successfully.`,
    });
  }

  async function handleManagerRegularizationDecision(input: {
    regularizationId: string;
    approve: boolean;
    comment?: string;
  }) {
    if (!session?.token) {
      throw new Error("Please sign in with a live backend session to resolve approvals.");
    }
    if (input.approve) {
      await approveAttendanceRegularization(input.regularizationId, input.comment || "", session.token);
    } else {
      await rejectAttendanceRegularization(input.regularizationId, input.comment || "", session.token);
    }
    await refreshWorkspaceForCurrentSession({
      tone: "info",
      message: `Attendance regularization ${input.approve ? "approved" : "rejected"} successfully.`,
    });
  }

  async function handleSignOut() {
    await clearSession();
    setSession(null);
    setEssBundle(null);
    setMssBundle(null);
    setActiveTab("home");
    setNotice({
      tone: "info",
      message: "Signed out from the mobile workspace.",
    });
  }

  if (isRestoring) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.restoreScreen}>
          <View style={styles.restoreCard}>
            <ActivityIndicator color={palette.accent} size="large" />
            <Text style={styles.sectionTitle}>Restoring session</Text>
            <Text style={styles.copy}>Checking for an existing secure mobile session and reconnecting your workspace.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !essBundle || !mssBundle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen isLoading={isLoading} notice={notice} onDemoMode={handleDemoMode} onLogin={handleLogin} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Header
          notice={notice}
          onRetry={notice?.tone === "error" ? handleRetry : undefined}
          organization={session.user.default_membership?.tenant_name || "HRMS"}
          title={session.user.display_name || session.user.first_name || session.user.username}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isRefreshing} tintColor={palette.accent} />}
        >
          {activeTab === "home" ? <HomeTab essBundle={essBundle} mssBundle={mssBundle} /> : null}
          {activeTab === "attendance" ? <AttendanceTab essBundle={essBundle} onSubmit={handleRegularizationSubmit} /> : null}
          {activeTab === "leave" ? <LeaveTab essBundle={essBundle} onSubmit={handleLeaveRequestSubmit} /> : null}
          {activeTab === "approvals" && isManager ? (
            <ApprovalsTab
              mssBundle={mssBundle}
              onLeaveDecision={handleManagerLeaveDecision}
              onRegularizationDecision={handleManagerRegularizationDecision}
            />
          ) : null}
          {activeTab === "more" ? <MoreTab onSignOut={handleSignOut} session={session} /> : null}
        </ScrollView>

        <BottomNav
          activeTab={activeTab}
          isManager={isManager}
          onChange={setActiveTab}
        />
      </View>
    </SafeAreaView>
  );
}

function Header({
  onRetry,
  title,
  organization,
  notice,
}: {
  onRetry?: () => void;
  title: string;
  organization: string;
  notice: Notice;
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>PeopleOps Mobile</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{organization}</Text>
      {notice ? (
        <View style={[styles.notice, notice.tone === "error" ? styles.noticeError : styles.noticeInfo]}>
          <Text style={styles.noticeText}>{notice.message}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function LoginScreen({
  isLoading,
  notice,
  onDemoMode,
  onLogin,
}: {
  isLoading: boolean;
  notice: Notice;
  onDemoMode: () => void;
  onLogin: (identifier: string, password: string) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.loginContainer}>
      <View style={styles.loginHero}>
        <Text style={styles.eyebrow}>ESS + MSS Mobile</Text>
        <Text style={styles.heroTitle}>Daily HR actions designed for people on the move.</Text>
        <Text style={styles.heroSubtitle}>
          Sign in to reach employee dashboards, attendance, leave, and manager approvals from one shared app.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sign in</Text>
        <Text style={styles.copy}>Use username or email to connect the mobile app with the Django backend.</Text>

        <TextInput
          autoCapitalize="none"
          onChangeText={setIdentifier}
          placeholder="username or email"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={identifier}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="password"
          placeholderTextColor={palette.muted}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {notice ? (
          <View style={[styles.notice, notice.tone === "error" ? styles.noticeError : styles.noticeInfo]}>
            <Text style={styles.noticeText}>{notice.message}</Text>
          </View>
        ) : null}

        <Pressable disabled={isLoading} onPress={() => onLogin(identifier, password)} style={[styles.button, styles.buttonPrimary]}>
          {isLoading ? <ActivityIndicator color={palette.surfaceStrong} /> : <Text style={styles.buttonPrimaryText}>Sign in</Text>}
        </Pressable>

        <Pressable onPress={onDemoMode} style={[styles.button, styles.buttonGhost]}>
          <Text style={styles.buttonGhostText}>Open demo workspace</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HomeTab({ essBundle, mssBundle }: { essBundle: EssBundle; mssBundle: MssBundle }) {
  const profile = essBundle.dashboard.profile;
  const attendance = essBundle.dashboard.attendance;
  const leave = essBundle.dashboard.leave;

  return (
    <View style={styles.sectionStack}>
      <CardGrid
        items={[
          { label: "Pending Leave", value: String(leave.pending_requests_count) },
          { label: "Regularizations", value: String(attendance.pending_regularizations_count) },
          { label: "Hours This Month", value: attendance.month_to_date.work_duration_hours },
          { label: "Team Approvals", value: String(mssBundle.summary.pending_leave_approvals_count + mssBundle.summary.pending_attendance_regularizations_count) },
        ]}
      />

      <Panel title="Today">
        <InfoRow label="Attendance status" value={attendance.today.status.replace("_", " ")} />
        <InfoRow label="Shift" value={attendance.today.shift || "Not assigned"} />
        <InfoRow label="Check-in" value={attendance.today.check_in_at ? formatDateTime(attendance.today.check_in_at) : "Not recorded"} />
      </Panel>

      <Panel title="Profile">
        <InfoRow label="Employee code" value={profile.employee_code} />
        <InfoRow label="Department" value={profile.department || "Not mapped"} />
        <InfoRow label="Designation" value={profile.designation || "Not mapped"} />
        <InfoRow label="Reporting manager" value={profile.reporting_manager || "Not mapped"} />
      </Panel>

      <Panel title="Manager pulse">
        <InfoRow label="Team size" value={String(mssBundle.summary.team_size)} />
        <InfoRow label="On leave today" value={String(mssBundle.summary.employees_on_leave_today)} />
        <InfoRow label="Attendance exceptions" value={String(mssBundle.summary.attendance_exceptions_today)} />
      </Panel>
    </View>
  );
}

function AttendanceTab({
  essBundle,
  onSubmit,
}: {
  essBundle: EssBundle;
  onSubmit: (input: {
    attendance_record_id: string;
    requested_status: string;
    requested_check_in_at?: string | null;
    requested_check_out_at?: string | null;
    reason?: string;
  }) => Promise<void>;
}) {
  const attendance = essBundle.dashboard.attendance;
  const latestRegularization = essBundle.regularizations[0];
  const canSubmit = essBundle.state === "live";
  const defaultRecord = essBundle.attendanceRecords[0];
  const [attendanceRecordId, setAttendanceRecordId] = useState(defaultRecord?.id || "");
  const [requestedStatus, setRequestedStatus] = useState("present");
  const [requestedCheckInAt, setRequestedCheckInAt] = useState<Date | null>(null);
  const [requestedCheckOutAt, setRequestedCheckOutAt] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!attendanceRecordId) {
      setError("Select an attendance day first.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        attendance_record_id: attendanceRecordId,
        requested_status: requestedStatus,
        requested_check_in_at: requestedCheckInAt ? formatDateTimeForApi(requestedCheckInAt) : null,
        requested_check_out_at: requestedCheckOutAt ? formatDateTimeForApi(requestedCheckOutAt) : null,
        reason,
      });
      setReason("");
      setRequestedCheckInAt(null);
      setRequestedCheckOutAt(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit regularization.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.sectionStack}>
      <Panel title="Attendance summary">
        <InfoRow label="Present days" value={String(attendance.month_to_date.present_days)} />
        <InfoRow label="Late days" value={String(attendance.month_to_date.late_days)} />
        <InfoRow label="Half days" value={String(attendance.month_to_date.half_days)} />
        <InfoRow label="Overtime hours" value={attendance.month_to_date.overtime_hours} />
      </Panel>

      <Panel title="Quick actions">
        <QuickAction label="Mark attendance" description="Mobile punch flow placeholder for geo-enabled tenants." />
        <QuickAction label="View attendance history" description="Future screen for calendar and day-level audit history." />
      </Panel>

      <Panel title="Request regularization">
        <Text style={styles.copy}>Choose a recent attendance day, then send a correction request to your manager.</Text>
        <Text style={styles.fieldLabel}>Attendance day</Text>
        <View style={styles.optionWrap}>
          {essBundle.attendanceRecords.map((record) => (
            <Pressable
              key={record.id}
              onPress={() => setAttendanceRecordId(record.id)}
              style={[styles.optionChip, attendanceRecordId === record.id ? styles.optionChipActive : null]}
            >
              <Text style={[styles.optionChipText, attendanceRecordId === record.id ? styles.optionChipTextActive : null]}>
                {formatDate(record.attendance_date)} • {record.status.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Requested status</Text>
        <View style={styles.optionWrap}>
          {["present", "late", "half_day", "remote"].map((status) => (
            <Pressable
              key={status}
              onPress={() => setRequestedStatus(status)}
              style={[styles.optionChip, requestedStatus === status ? styles.optionChipActive : null]}
            >
              <Text style={[styles.optionChipText, requestedStatus === status ? styles.optionChipTextActive : null]}>
                {status.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>

        <DateTimeField label="Requested check-in" onChange={setRequestedCheckInAt} value={requestedCheckInAt} />
        <DateTimeField label="Requested check-out" onChange={setRequestedCheckOutAt} value={requestedCheckOutAt} />
        <TextInput
          multiline
          onChangeText={setReason}
          placeholder="Reason"
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.textArea]}
          value={reason}
        />
        {!canSubmit ? <Text style={styles.copy}>Regularization submission is disabled in demo mode.</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable disabled={isSubmitting || !canSubmit} onPress={handleSubmit} style={[styles.button, styles.buttonPrimary, (!canSubmit || isSubmitting) ? styles.buttonDisabled : null]}>
          {isSubmitting ? <ActivityIndicator color={palette.surfaceStrong} /> : <Text style={styles.buttonPrimaryText}>Submit regularization</Text>}
        </Pressable>
      </Panel>

      <Panel title="Latest regularization">
        {latestRegularization ? (
          <>
            <InfoRow label="Date" value={formatDate(latestRegularization.attendance_date)} />
            <InfoRow label="Current status" value={latestRegularization.current_status.replace("_", " ")} />
            <InfoRow label="Requested status" value={latestRegularization.requested_status.replace("_", " ")} />
            <InfoRow label="Reason" value={latestRegularization.reason || "No reason provided"} />
          </>
        ) : (
          <Text style={styles.copy}>No regularization requests yet.</Text>
        )}
      </Panel>
    </View>
  );
}

function LeaveTab({
  essBundle,
  onSubmit,
}: {
  essBundle: EssBundle;
  onSubmit: (input: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    start_day_portion?: string;
    end_day_portion?: string;
    reason?: string;
  }) => Promise<void>;
}) {
  const defaultLeaveType = essBundle.leaveTypes[0];
  const canSubmit = essBundle.state === "live";
  const [leaveTypeId, setLeaveTypeId] = useState(defaultLeaveType?.id || "");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [dayPortion, setDayPortion] = useState("full_day");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!leaveTypeId || !startDate || !endDate) {
      setError("Select leave type and date range first.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        leave_type_id: leaveTypeId,
        start_date: formatDateForApi(startDate),
        end_date: formatDateForApi(endDate),
        start_day_portion: dayPortion,
        end_day_portion: dayPortion,
        reason,
      });
      setStartDate(null);
      setEndDate(null);
      setReason("");
      setDayPortion("full_day");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit leave request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.sectionStack}>
      <Panel title="Balances">
        {essBundle.dashboard.leave.balances.map((balance) => (
          <View key={balance.leave_type} style={styles.inlineCard}>
            <Text style={styles.inlineCardTitle}>{balance.leave_type}</Text>
            <Text style={styles.inlineCardMeta}>{balance.policy_name}</Text>
            <Text style={styles.inlineCardValue}>Available: {balance.closing_balance}</Text>
          </View>
        ))}
      </Panel>

      <Panel title="Request history">
        {essBundle.leaveRequests.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.listItemHead}>
              <Text style={styles.listItemTitle}>{item.leave_type}</Text>
              <Text style={styles.listItemStatus}>{item.status.replace("_", " ")}</Text>
            </View>
            <Text style={styles.listItemMeta}>
              {formatDate(item.start_date)} to {formatDate(item.end_date)} • {item.requested_units} units
            </Text>
            <Text style={styles.copy}>{item.reason || "No reason provided."}</Text>
          </View>
        ))}
      </Panel>

      <Panel title="Apply leave">
        <Text style={styles.copy}>Use seeded leave types now, then we can layer on policy validation and attachments next.</Text>
        <Text style={styles.fieldLabel}>Leave type</Text>
        <View style={styles.optionWrap}>
          {essBundle.leaveTypes.map((leaveType) => (
            <Pressable
              key={leaveType.id}
              onPress={() => setLeaveTypeId(leaveType.id)}
              style={[styles.optionChip, leaveTypeId === leaveType.id ? styles.optionChipActive : null]}
            >
              <Text style={[styles.optionChipText, leaveTypeId === leaveType.id ? styles.optionChipTextActive : null]}>
                {leaveType.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <DateField label="Start date" onChange={setStartDate} value={startDate} />
        <DateField label="End date" onChange={setEndDate} value={endDate} />
        <Text style={styles.fieldLabel}>Day portion</Text>
        <View style={styles.optionWrap}>
          {["full_day", "first_half", "second_half"].map((portion) => (
            <Pressable
              key={portion}
              onPress={() => setDayPortion(portion)}
              style={[styles.optionChip, dayPortion === portion ? styles.optionChipActive : null]}
            >
              <Text style={[styles.optionChipText, dayPortion === portion ? styles.optionChipTextActive : null]}>
                {portion.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          multiline
          onChangeText={setReason}
          placeholder="Reason"
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.textArea]}
          value={reason}
        />
        {!canSubmit ? <Text style={styles.copy}>Leave submission is disabled in demo mode.</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable disabled={isSubmitting || !canSubmit} onPress={handleSubmit} style={[styles.button, styles.buttonPrimary, (!canSubmit || isSubmitting) ? styles.buttonDisabled : null]}>
          {isSubmitting ? <ActivityIndicator color={palette.surfaceStrong} /> : <Text style={styles.buttonPrimaryText}>Submit leave request</Text>}
        </Pressable>
      </Panel>
    </View>
  );
}

function ApprovalsTab({
  mssBundle,
  onLeaveDecision,
  onRegularizationDecision,
}: {
  mssBundle: MssBundle;
  onLeaveDecision: (input: { requestId: string; approve: boolean; comment?: string }) => Promise<void>;
  onRegularizationDecision: (input: { regularizationId: string; approve: boolean; comment?: string }) => Promise<void>;
}) {
  const canAct = mssBundle.state === "live";

  return (
    <View style={styles.sectionStack}>
      <Panel title="Pending leave approvals">
        {mssBundle.pendingLeave.length ? (
          mssBundle.pendingLeave.map((item) => (
            <ManagerDecisionCard
              canAct={canAct}
              key={item.id}
              meta={`${item.leave_type} • ${formatDate(item.start_date)} to ${formatDate(item.end_date)}`}
              reason={item.reason || "No reason provided."}
              statusLabel={item.status.replace("_", " ")}
              title={item.employee_name || "Unknown employee"}
              onApprove={(comment) => onLeaveDecision({ requestId: item.id, approve: true, comment })}
              onReject={(comment) => onLeaveDecision({ requestId: item.id, approve: false, comment })}
            />
          ))
        ) : (
          <Text style={styles.copy}>No leave approvals are waiting right now.</Text>
        )}
      </Panel>

      <Panel title="Pending attendance approvals">
        {mssBundle.pendingRegularizations.length ? (
          mssBundle.pendingRegularizations.map((item) => (
            <ManagerDecisionCard
              canAct={canAct}
              key={item.id}
              meta={`${formatDate(item.attendance_date)} • ${item.current_status.replace("_", " ")} to ${item.requested_status.replace("_", " ")}`}
              reason={item.reason || "No reason provided."}
              statusLabel={item.status.replace("_", " ")}
              title={item.employee_name || "Unknown employee"}
              onApprove={(comment) => onRegularizationDecision({ regularizationId: item.id, approve: true, comment })}
              onReject={(comment) => onRegularizationDecision({ regularizationId: item.id, approve: false, comment })}
            />
          ))
        ) : (
          <Text style={styles.copy}>No attendance approvals are waiting right now.</Text>
        )}
      </Panel>
    </View>
  );
}

function ManagerDecisionCard({
  canAct,
  meta,
  onApprove,
  onReject,
  reason,
  statusLabel,
  title,
}: {
  canAct: boolean;
  meta: string;
  onApprove: (comment: string) => Promise<void>;
  onReject: (comment: string) => Promise<void>;
  reason: string;
  statusLabel: string;
  title: string;
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setError("");
    setIsSubmitting(action);
    try {
      if (action === "approve") {
        await onApprove(comment);
      } else {
        await onReject(comment);
      }
      setComment("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to process decision.");
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <View style={styles.listItem}>
      <View style={styles.listItemHead}>
        <Text style={styles.listItemTitle}>{title}</Text>
        <Text style={styles.listItemStatus}>{statusLabel}</Text>
      </View>
      <Text style={styles.listItemMeta}>{meta}</Text>
      <Text style={styles.copy}>{reason}</Text>
      <TextInput
        multiline
        onChangeText={setComment}
        placeholder="Manager comment (optional)"
        placeholderTextColor={palette.muted}
        style={[styles.input, styles.textArea]}
        value={comment}
      />
      {!canAct ? <Text style={styles.copy}>Approval actions are disabled in demo mode.</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionRow}>
        <Pressable
          disabled={isSubmitting !== null || !canAct}
          onPress={() => handleAction("approve")}
          style={[styles.button, styles.buttonPrimary, (isSubmitting !== null || !canAct) ? styles.buttonDisabled : null, styles.flexButton]}
        >
          {isSubmitting === "approve" ? <ActivityIndicator color={palette.surfaceStrong} /> : <Text style={styles.buttonPrimaryText}>Approve</Text>}
        </Pressable>
        <Pressable
          disabled={isSubmitting !== null || !canAct}
          onPress={() => handleAction("reject")}
          style={[styles.button, styles.buttonDanger, (isSubmitting !== null || !canAct) ? styles.buttonDisabled : null, styles.flexButton]}
        >
          {isSubmitting === "reject" ? <ActivityIndicator color={palette.surfaceStrong} /> : <Text style={styles.buttonPrimaryText}>Reject</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function MoreTab({ onSignOut, session }: { onSignOut: () => void; session: AuthSession }) {
  return (
    <View style={styles.sectionStack}>
      <Panel title="Account">
        <InfoRow label="Name" value={session.user.display_name || session.user.first_name || session.user.username} />
        <InfoRow label="Email" value={session.user.email} />
        <InfoRow label="Workspace" value={session.user.default_membership?.tenant_name || "Not mapped"} />
      </Panel>

      <Panel title="Utilities">
        <QuickAction label="Notifications" description="Future notification center for leave, attendance, and workflow updates." />
        <QuickAction label="Documents" description="Future mobile upload and document verification access." />
        <QuickAction label="Support" description="Future helpdesk or support escalation entry point." />
      </Panel>

      <Pressable onPress={onSignOut} style={[styles.button, styles.buttonGhost]}>
        <Text style={styles.buttonGhostText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function BottomNav({
  activeTab,
  isManager,
  onChange,
}: {
  activeTab: TabKey;
  isManager: boolean;
  onChange: (tab: TabKey) => void;
}) {
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "home", label: "Home" },
    { key: "attendance", label: "Attendance" },
    { key: "leave", label: "Leave" },
    ...(isManager ? [{ key: "approvals" as const, label: "Approvals" }] : []),
    { key: "more", label: "More" },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[styles.bottomNavItem, activeTab === tab.key ? styles.bottomNavItemActive : null]}
        >
          <Text style={[styles.bottomNavText, activeTab === tab.key ? styles.bottomNavTextActive : null]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function CardGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <View style={styles.metricGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.metricCard}>
          <Text style={styles.metricValue}>{item.value}</Text>
          <Text style={styles.metricLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function QuickAction({ label, description }: { label: string; description: string }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listItemTitle}>{label}</Text>
      <Text style={styles.copy}>{description}</Text>
    </View>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: Date) => void;
  value: Date | null;
}) {
  const [showPicker, setShowPicker] = useState(false);

  function handleChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== "ios") {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  }

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setShowPicker(true)} style={styles.inputLike}>
        <Text style={value ? styles.inputLikeText : styles.inputLikePlaceholder}>
          {value ? formatDateForDisplay(value) : `Select ${label.toLowerCase()}`}
        </Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "spinner" : "default"}
          mode="date"
          onChange={handleChange}
          value={value || new Date()}
        />
      ) : null}
    </View>
  );
}

function DateTimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: Date | null) => void;
  value: Date | null;
}) {
  const [showPicker, setShowPicker] = useState(false);

  function handleChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== "ios") {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  }

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setShowPicker(true)} style={styles.inputLike}>
        <Text style={value ? styles.inputLikeText : styles.inputLikePlaceholder}>
          {value ? formatDateTimeForDisplay(value) : `Select ${label.toLowerCase()}`}
        </Text>
      </Pressable>
      {value ? (
        <Pressable onPress={() => onChange(null)} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </Pressable>
      ) : null}
      {showPicker ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "spinner" : "default"}
          mode="datetime"
          onChange={handleChange}
          value={value || new Date()}
        />
      ) : null}
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateForDisplay(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDateTimeForDisplay(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDateForApi(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateTimeForApi(value: Date) {
  return value.toISOString();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  restoreScreen: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  restoreCard: {
    backgroundColor: palette.surfaceStrong,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 24,
    gap: 14,
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  loginContainer: {
    padding: 20,
    gap: 18,
    justifyContent: "center",
    flexGrow: 1,
  },
  loginHero: {
    gap: 10,
    padding: 6,
  },
  hero: {
    margin: 16,
    marginBottom: 0,
    padding: 22,
    borderRadius: 28,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 8,
  },
  eyebrow: {
    alignSelf: "flex-start",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: palette.muted,
    fontWeight: "800",
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    color: palette.text,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.muted,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
    gap: 14,
  },
  sectionStack: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    color: palette.text,
  },
  copy: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.muted,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceStrong,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: palette.text,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldBlock: {
    gap: 8,
  },
  inputLike: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceStrong,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputLikeText: {
    color: palette.text,
    fontSize: 15,
  },
  inputLikePlaceholder: {
    color: palette.muted,
    fontSize: 15,
  },
  clearButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.surfaceMuted,
  },
  clearButtonText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceStrong,
  },
  optionChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  optionChipText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  optionChipTextActive: {
    color: palette.surfaceStrong,
  },
  button: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: palette.accent,
  },
  buttonDanger: {
    backgroundColor: "#9b2c2c",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.line,
  },
  buttonPrimaryText: {
    color: palette.surfaceStrong,
    fontWeight: "800",
    fontSize: 15,
  },
  buttonGhostText: {
    color: palette.text,
    fontWeight: "800",
    fontSize: 15,
  },
  notice: {
    borderRadius: 16,
    padding: 12,
  },
  noticeInfo: {
    backgroundColor: palette.noticeInfo,
  },
  noticeError: {
    backgroundColor: palette.noticeError,
  },
  noticeText: {
    color: palette.text,
    lineHeight: 20,
    fontSize: 14,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceStrong,
  },
  retryButtonText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  errorText: {
    color: "#9b2c2c",
    fontSize: 13,
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "47%",
    minWidth: 150,
    backgroundColor: palette.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    gap: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "900",
    color: palette.text,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 13,
  },
  panelBody: {
    gap: 12,
  },
  infoRow: {
    gap: 4,
    padding: 12,
    borderRadius: 16,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: palette.line,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  inlineCard: {
    borderRadius: 16,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 4,
  },
  inlineCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.text,
  },
  inlineCardMeta: {
    fontSize: 13,
    color: palette.muted,
  },
  inlineCardValue: {
    fontSize: 14,
    color: palette.text,
  },
  listItem: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: palette.surfaceStrong,
    borderWidth: 1,
    borderColor: palette.line,
  },
  listItemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.text,
    flex: 1,
  },
  listItemStatus: {
    fontSize: 13,
    fontWeight: "800",
    color: palette.accent,
    textTransform: "capitalize",
  },
  listItemMeta: {
    fontSize: 13,
    color: palette.muted,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceStrong,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
  },
  bottomNavItemActive: {
    backgroundColor: palette.accent,
  },
  bottomNavText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.muted,
  },
  bottomNavTextActive: {
    color: palette.surfaceStrong,
  },
});
