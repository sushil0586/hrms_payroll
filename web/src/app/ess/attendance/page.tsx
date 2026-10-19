import "./attendance.css";
import { AttendanceWorkspace } from "./attendance-workspace";
import { getEssAttendanceMonth, getEssRegularizations, getEssRegularizationDetail } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

type Params = Record<string, string | string[] | undefined>;
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] : input;
const positive = (input: string | undefined, fallback: number) => /^\d+$/.test(input ?? "") && Number.isSafeInteger(Number(input)) && Number(input) > 0 ? Number(input) : fallback;

export default async function EssAttendancePage({ searchParams }: { searchParams?: Promise<Params> }) {
  await requireWorkspaceAccess({ workspace: "ess" });
  const params = await searchParams ?? {};
  const requestedMonth = value(params.month) ?? "";
  const invalidMonth = Boolean(requestedMonth && (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) || requestedMonth.startsWith("0000-")));
  const month = invalidMonth ? "" : requestedMonth;
  const status = ["all", "pending", "approved", "rejected"].includes(value(params.status) ?? "all") ? value(params.status) : "all";
  const requestedPageSize = positive(value(params.page_size), 10);
  const pageSize = [5, 10, 20, 31].includes(requestedPageSize) ? requestedPageSize : 10;
  const [records, history] = await Promise.all([
    getEssAttendanceMonth({ month, page: positive(value(params.page), 1), page_size: pageSize }),
    getEssRegularizations({ status, page: positive(value(params.reg_page), 1), page_size: 5 }),
  ]);
  const regId = value(params.regId);
  const linkedRequest = regId && /^[0-9a-f-]{36}$/i.test(regId) ? (await getEssRegularizationDetail(regId)).data : null;
  return <AttendanceWorkspace invalidMonth={invalidMonth} linkedRequest={linkedRequest} attendance={records.data} regularizations={history.data} currentParams={{ ...params, status }} isDemo={records.state === "demo" || history.state === "demo"} />;
}
