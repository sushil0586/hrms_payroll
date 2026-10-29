import { ActionMenu } from "@/components/patterns/action-menu";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import {
  getHrAdminLifecycleOptions,
  getHrAdminLifecycleQueue,
  getHrAdminOnboardings,
  getHrAdminProbationReviews,
} from "@/lib/api";
import { LifecycleUnavailable } from "./lifecycle-unavailable";
import { LifecycleInboxWorkspace } from "./lifecycle-inbox-workspace";
type V = string | string[] | undefined;
const value = (v: V) => (Array.isArray(v) ? v[0] : v);
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, V>>;
}) {
  const p = (await searchParams) ?? {},
    page = Number(value(p.page)) || 1,
    size = [10, 25, 50, 100].includes(Number(value(p.page_size)))
      ? Number(value(p.page_size))
      : 25,
    q = value(p.q) ?? "",
    item_type = value(p.item_type) ?? "",
    status = value(p.status) ?? "",
    employee_id = value(p.employee_id) ?? "",
    owner = value(p.owner) ?? "",
    primary_date_from = value(p.primary_date_from) ?? "",
    primary_date_to = value(p.primary_date_to) ?? "";
  const [list, options, onboardings, probation] = await Promise.all([
    getHrAdminLifecycleQueue({
      page,
      page_size: size,
      q,
      item_type: item_type || undefined,
      status: status || undefined,
      employee_id: employee_id || undefined,
      owner: owner || undefined,
      primary_date_from: primary_date_from || undefined,
      primary_date_to: primary_date_to || undefined,
    }).catch(() => null),
    getHrAdminLifecycleOptions().catch(() => null),
    getHrAdminOnboardings({ page: 1, page_size: 1 }).catch(() => null),
    getHrAdminProbationReviews({
      page: 1,
      page_size: 1,
      decision: "pending",
    }).catch(() => null),
  ]);
  if (
    list?.state !== "live" ||
    options?.state !== "live" ||
    onboardings?.state !== "live" ||
    probation?.state !== "live"
  )
    return <LifecycleUnavailable />;
  const items = list.data.items;
  return (
    <main className="shell hr-lifecycle-workbench accerio-page lifecycle-phase3">
      <WorkspaceStandardHeader
        title="Lifecycle"
        description="Joiners, movers, reviews, and exits in one queue."
        actions={
          <>
            <a
              data-navigation-mode="document"
              className="button button--secondary"
              href="/hr-admin"
            >
              Admin
            </a>
            <ActionMenu
              label="Queues"
              items={[
                {
                  href: "/hr-admin/onboardings",
                  title: "Onboardings",
                  description: "Track joiner setup and completion.",
                },
                {
                  href: "/hr-admin/probation-reviews",
                  title: "Probation reviews",
                  description: "Handle pending decisions and extensions.",
                },
                {
                  href: "/hr-admin/movements",
                  title: "Movements",
                  description: "Review manager and org changes.",
                },
                {
                  href: "/hr-admin/exits",
                  title: "Exits",
                  description: "Inspect separation workflow and closure.",
                },
              ]}
            />
          </>
        }
      />
      <LifecycleInboxWorkspace
        initialData={{
          list: list.data,
          options: options.data,
          summary: {
            onboardingCount: onboardings.data.total_count,
            pendingProbationCount: probation.data.total_count,
            documentBlockedCount: items.filter(
              (x) => x.document_attention_state === "blocked",
            ).length,
            documentUpcomingCount: items.filter(
              (x) =>
                x.document_attention_state === "warning" ||
                x.document_attention_state === "upcoming",
            ).length,
          },
        }}
        initialQuery={{
          q,
          item_type,
          status,
          employee_id,
          owner,
          primary_date_from,
          primary_date_to,
          page,
          page_size: size,
        }}
      />
    </main>
  );
}
