import Link from "next/link";

import { UserNotificationCenter } from "@/components/patterns/user-notification-center";
import { getMssNotifications } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MssNotificationsPage({ searchParams }: PageProps) {
  const rawParams = (await searchParams) ?? {};
  const rawPage = Number(normalizeParam(rawParams.page));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const requestedSize = Number(normalizeParam(rawParams.page_size));
  const pageSize = [10, 25, 50].includes(requestedSize) ? requestedSize : 10;
  const option = (key: string, allowed: string[]) => {
    const value = normalizeParam(rawParams[key]) ?? "";
    return allowed.includes(value) ? value : "";
  };
  const q = normalizeParam(rawParams.q) ?? "";
  const status = option("status", ["pending", "sent", "delivered", "read", "failed"]);
  const channel = option("channel", ["in_app", "email", "sms", "push", "whatsapp"]);
  const priority = option("priority", ["low", "normal", "high", "critical"]);
  const subjectType = option("subject_type", ["leave_request", "attendance_regularization", "employee_document", "employee_onboarding", "payroll_payslip"]);
  const query = { page, page_size: pageSize, q, status, channel, priority, subject_type: subjectType };
  let result = await getMssNotifications(query);
  const lastPage = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
  if (page > lastPage) result = await getMssNotifications({ ...query, page: lastPage });
  const currentParams: Record<string, string> = {
    page: String(result.data.page),
    page_size: String(pageSize),
  };
  Object.entries({ q, status, channel, priority, subject_type: subjectType }).forEach(([key, value]) => {
    if (value) currentParams[key] = value;
  });

  return (
    <UserNotificationCenter
      actions={
        <>
          <Link className="button button--primary" href="/mss/approvals">
            Approvals
          </Link>
          <Link className="button button--ghost" href="/ess/notifications">
            ESS inbox
          </Link>
        </>
      }
      apiEndpointBase="/api/manager/notifications"
      basePath="/mss/notifications"
      crossWorkspaceHref="/mss/approvals"
      crossWorkspaceLabel="Approvals"
      currentParams={currentParams}
      data={result.data}
      actionDescription="Use notifications as signals. Open the source approval or delivery detail before taking a decision."
      actionEyebrow="Manager triage"
      actionTitle="Open the source workflow before deciding"
      description="Triage team alerts, failed delivery, and approval follow-up without mixing personal ESS messages."
      filterDescription="Find team alerts by status, channel, priority, or source workflow."
      filterTitle="Alert filters"
      listDescription="Review one manager alert at a time, then open the source workflow when needed."
      listTitle="Team alert list"
      state={result.state}
      title="Manager notifications"
      workspace="mss"
      workspacePill="Manager alerts"
    />
  );
}
