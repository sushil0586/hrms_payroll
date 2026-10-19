import Link from "next/link";
import { getEssRequestHistory } from "@/lib/api";
import { RequestHistory } from "./request-history";
import {
  WorkspaceStandardHeader,
  WorkspaceStandardPanel,
} from "@/components/patterns/workspace-standard";
import { PaginationBar } from "@/components/patterns/pagination-bar";

type Params = Record<string, string | string[] | undefined>;
export default async function RequestsPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const params = (await searchParams) ?? {};
  const first = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key];
  const type = first("type") === "attendance" ? "attendance" : "leave";
  const statuses =
    type === "leave"
      ? [
          "pending",
          "partially_approved",
          "approved",
          "rejected",
          "withdrawn",
          "cancelled",
        ]
      : ["pending", "approved", "rejected"];
  const status = statuses.includes(first("status") ?? "")
    ? first("status")!
    : "all";
  const rawPage = Number(first("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  let result = await getEssRequestHistory({ type, status, page });
  const lastPage = Math.max(
    1,
    Math.ceil(result.data.total_count / result.data.page_size),
  );
  if (page > lastPage)
    result = await getEssRequestHistory({ type, status, page: lastPage });
  const data = result.data;
  const href = (page: number) =>
    `/ess/requests?type=${type}&status=${status}&page=${page}`;
  return (
    <main className="shell shell--workspace ess-compact">
      <WorkspaceStandardHeader
        eyebrow="Employee services"
        title="My Requests"
        description="Track your requests. Open Leave or Attendance to review details, approval history and available actions."
        actions={
          <Link
            prefetch={false}
            className="button button--secondary"
            href="/ess/notifications"
          >
            Notifications
          </Link>
        }
      />
      <WorkspaceStandardPanel
        title="Request history"
        description="Choose a request type to track its current status. Cancellation requests appear with your Leave requests."
      >
        <form method="get" className="workspace-filter-bar">
          <label className="form-field">
            Request type
            <select className="input-control" name="type" defaultValue={type}>
              <option value="leave">Leave</option>
              <option value="attendance">Attendance regularization</option>
            </select>
          </label>
          <label className="form-field">
            Status
            <select
              className="input-control"
              name="status"
              defaultValue={status}
            >
              <option value="all">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button className="button button--primary" type="submit">
            Apply filters
          </button>
          <Link
            prefetch={false}
            className="button button--ghost"
            href="/ess/requests"
          >
            Clear filters
          </Link>
        </form>
        <RequestHistory
          key={`${type}-${status}-${data.page}`}
          items={data.items}
          type={type}
        />
        <PaginationBar
          navigationMode="document"
          firstHref={href(1)}
          lastHref={href(lastPage)}
          nextHref={href(data.page + 1)}
          previousHref={href(Math.max(1, data.page - 1))}
          page={data.page}
          pageSize={data.page_size}
          totalCount={data.total_count}
          hasNext={data.has_next}
          hasPrevious={data.has_previous}
        />
      </WorkspaceStandardPanel>
      <WorkspaceStandardPanel
        title="Documents and other services"
        description="Upload required documents or replace a file in Documents. Other request services are not available here."
      >
        <Link
          prefetch={false}
          className="button button--secondary"
          href="/ess/documents"
        >
          Open Documents
        </Link>
      </WorkspaceStandardPanel>
    </main>
  );
}
