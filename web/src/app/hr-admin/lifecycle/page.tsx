import Link from "next/link";
import { LifecycleQueue } from "@/app/hr-admin/lifecycle/lifecycle-queue";
import { ActionMenu } from "@/components/patterns/action-menu";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminExits, getHrAdminLifecycleOptions, getHrAdminLifecycleQueue, getHrAdminMovements, getHrAdminOnboardings, getHrAdminProbationReview, getHrAdminProbationReviews } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminLifecyclePage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const itemType = normalizeParam(currentParams.item_type) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const employeeId = normalizeParam(currentParams.employee_id) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";
  const primaryDateFrom = normalizeParam(currentParams.primary_date_from) ?? "";
  const primaryDateTo = normalizeParam(currentParams.primary_date_to) ?? "";
  const editRecord = normalizeParam(currentParams.editRecord) ?? "";
  const [editRecordType, editRecordId] = editRecord.split(":");

  const [queueResult, optionsResult, onboardingsResult, probationResult, movementsResult, exitsResult] = await Promise.all([
    getHrAdminLifecycleQueue({
      page,
      page_size: pageSize,
      q,
      item_type: itemType || undefined,
      status: status || undefined,
      employee_id: employeeId || undefined,
      owner: owner || undefined,
      primary_date_from: primaryDateFrom || undefined,
      primary_date_to: primaryDateTo || undefined,
    }),
    getHrAdminLifecycleOptions(),
    getHrAdminOnboardings({ page: 1, page_size: 1 }),
    getHrAdminProbationReviews({ page: 1, page_size: 1, decision: "pending" }),
    getHrAdminMovements({ page: 1, page_size: 1 }),
    getHrAdminExits({ page: 1, page_size: 1 }),
  ]);
  const editProbationResult = editRecordType === "probation" && editRecordId ? await getHrAdminProbationReview(editRecordId) : null;
  const state =
    queueResult.state === "live" &&
    optionsResult.state === "live" &&
    onboardingsResult.state === "live" &&
    probationResult.state === "live" &&
    movementsResult.state === "live" &&
    exitsResult.state === "live"
      ? "live"
      : "demo";

  const statusOptionsByType = {
    onboarding: optionsResult.data.onboarding_statuses,
    probation: optionsResult.data.probation_decisions,
    movement: optionsResult.data.lifecycle_event_statuses,
    exit: optionsResult.data.exit_statuses,
  };
  const documentBlockedCount = queueResult.data.items.filter((item) => item.document_attention_state === "blocked").length;
  const documentUpcomingCount = queueResult.data.items.filter((item) => item.document_attention_state === "warning" || item.document_attention_state === "upcoming").length;

  return (
    <main className="shell hr-lifecycle-workbench">
      <PageIntro
        eyebrow={state === "live" ? "Live lifecycle" : "Demo lifecycle"}
        title="Lifecycle"
        description="Joiners, movers, reviews, and exits in one queue."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Admin
            </Link>
            <ActionMenu
              label="Queues"
              items={[
                { href: "/hr-admin/onboardings", title: "Onboardings", description: "Track joiner setup and completion." },
                { href: "/hr-admin/probation-reviews", title: "Probation reviews", description: "Handle pending decisions and extensions." },
                { href: "/hr-admin/movements", title: "Movements", description: "Review manager and org changes." },
                { href: "/hr-admin/exits", title: "Exits", description: "Inspect separation workflow and closure." },
              ]}
            />
          </>
        }
      />
      <LifecycleQueue
        items={queueResult.data.items}
        state={state}
        employees={optionsResult.data.employees}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{
          q,
          item_type: itemType,
          status,
          employee_id: employeeId,
          owner,
          primary_date_from: primaryDateFrom,
          primary_date_to: primaryDateTo,
          page,
          page_size: pageSize,
        }}
        pagination={{
          total_count: queueResult.data.total_count,
          page: queueResult.data.page,
          page_size: queueResult.data.page_size,
          has_next: queueResult.data.has_next,
          has_previous: queueResult.data.has_previous,
        }}
        statusOptionsByType={statusOptionsByType}
        lifecycleOptions={optionsResult.data}
        editProbationReview={editProbationResult?.data ?? null}
        summary={{
          documentBlockedCount,
          documentUpcomingCount,
          onboardingCount: onboardingsResult.data.total_count,
          pendingProbationCount: probationResult.data.total_count,
        }}
      />
    </main>
  );
}
