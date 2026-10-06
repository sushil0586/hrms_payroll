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
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "10") || 10, 1), 100);
  const result = await getMssNotifications({
    page,
    page_size: pageSize,
    q: normalizeParam(currentParams.q) ?? "",
    status: normalizeParam(currentParams.status) ?? "",
    channel: normalizeParam(currentParams.channel) ?? "",
    priority: normalizeParam(currentParams.priority) ?? "",
    subject_type: normalizeParam(currentParams.subject_type) ?? "",
  });

  return (
    <UserNotificationCenter
      actions={
        <>
          <Link className="button button--primary" href="/mss/approvals">
            Approvals
          </Link>
          <Link className="button button--secondary" href="/mss/approvals?queue=history">
            Decision history
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
