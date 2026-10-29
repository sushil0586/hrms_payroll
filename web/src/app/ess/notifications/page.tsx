import { getEssNotifications } from "@/lib/api";

import { NotificationsWorkspace, type NotificationQuery } from "./notifications-workspace";

type Params = Record<string, string | string[] | undefined>;

export default async function NotificationsPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const params = (await searchParams) ?? {};
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const number = (key: string, fallback: number) => { const value = Number(first(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const requestedSize = number("page_size", 10);
  const query: NotificationQuery = { page: number("page", 1), page_size: [10, 25, 50, 100].includes(requestedSize) ? requestedSize : 10, q: first("q") || "", status: first("status") || "", channel: first("channel") || "", priority: first("priority") || "", subject_type: first("subject_type") || "" };
  let result = await getEssNotifications(query);
  const last = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
  if (query.page > last) { query.page = last; result = await getEssNotifications(query); }
  return <NotificationsWorkspace initialData={result.data} initialQuery={query} />;
}
