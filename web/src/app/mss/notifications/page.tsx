import { getMssNotifications } from "@/lib/api";

import { MssNotificationsWorkspace, type MssNotificationQuery } from "./notifications-workspace";

type Params = Record<string, string | string[] | undefined>;

export default async function MssNotificationsPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const params = (await searchParams) ?? {};
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const positive = (key: string, fallback: number) => { const value = Number(first(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const requestedSize = positive("page_size", 10);
  const query: MssNotificationQuery = { page: positive("page", 1), page_size: [10, 25, 50].includes(requestedSize) ? requestedSize : 10, q: first("q") || "", status: first("status") || "", channel: first("channel") || "", priority: first("priority") || "", subject_type: first("subject_type") || "" };
  let result = await getMssNotifications(query);
  const lastPage = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
  if (query.page > lastPage) { query.page = lastPage; result = await getMssNotifications(query); }
  return <MssNotificationsWorkspace initialData={result.data} initialQuery={query} state={result.state === "live" ? "live" : "demo"} />;
}
