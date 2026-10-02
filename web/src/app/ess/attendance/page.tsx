import { AttendanceWorkspace } from "@/app/ess/attendance/attendance-workspace";
import { getEssDashboard, getEssRequestOptions } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EssAttendancePage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const status = normalizeParam(currentParams.status) ?? "all";
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const [{ dashboard, regularizations, state }, requestOptions] = await Promise.all([
    getEssDashboard({ regularization_status: status, regularization_page: page }),
    getEssRequestOptions(),
  ]);
  const workspaceState = state === "live" ? "live" : "demo";

  return (
    <AttendanceWorkspace
      attendanceRecords={requestOptions.attendanceRecords}
      currentParams={currentParams}
      dashboard={dashboard}
      isDemo={state === "demo" || requestOptions.state === "demo"}
      regularizations={regularizations}
      state={workspaceState}
    />
  );
}
