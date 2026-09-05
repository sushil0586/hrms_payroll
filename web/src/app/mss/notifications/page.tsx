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
          <Link className="button button--secondary" href="/mss/approvals">
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
      state={result.state}
      workspace="mss"
    />
  );
}
