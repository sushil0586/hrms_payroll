import Link from "next/link";

import { ShiftRosterRolloutPanel } from "@/app/hr-admin/shift-roster-templates/shift-roster-rollout-panel";
import { ShiftRosterTemplatesWorkbench } from "@/app/hr-admin/shift-roster-templates/shift-roster-templates-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyWorkbenchOptions, getHrAdminShiftRosterRollouts, getHrAdminShiftRosterTemplate, getHrAdminShiftRosterTemplates } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: SearchParamValue, fallback: number) {
  const parsed = Number(normalizeParam(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function buildHref(currentParams: Record<string, SearchParamValue>, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) params.set(key, normalized);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  return `/hr-admin/shift-roster-templates${query ? `?${query}` : ""}`;
}

export default async function HrAdminShiftRosterTemplatesPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin/attendance-operations" });
  const canManagePolicies = sessionHasPermission(sessionUser, "attendance.policies.manage");
  const currentParams = (await searchParams) ?? {};
  const filters = {
    q: normalizeParam(currentParams.q) ?? "",
    status: normalizeParam(currentParams.status) ?? "all",
    kind: normalizeParam(currentParams.kind) ?? "all",
    pattern: normalizeParam(currentParams.pattern) ?? "all",
  };
  const pageSize = Math.min(numberParam(currentParams.page_size, 10), 50);
  const page = numberParam(currentParams.page, 1);
  const rolloutPageSize = Math.min(numberParam(currentParams.rollout_page_size, 6), 25);
  const rolloutPage = numberParam(currentParams.rollout_page, 1);
  const [result, optionsResult, rolloutsResult] = await Promise.all([
    getHrAdminShiftRosterTemplates({ q: filters.q, status: filters.status, kind: filters.kind, pattern: filters.pattern, page, page_size: pageSize }),
    getHrAdminPolicyWorkbenchOptions({ include: ["legal_entities", "branches", "locations", "departments", "shifts"] }),
    getHrAdminShiftRosterRollouts({ page: rolloutPage, page_size: rolloutPageSize }),
  ]);
  const pageItems = result.data.items;
  const editRosterId = normalizeParam(currentParams.editRoster) ?? "";
  const editItem = canManagePolicies && editRosterId
    ? pageItems.find((item) => item.id === editRosterId) ?? (await getHrAdminShiftRosterTemplate(editRosterId)).data
    : null;
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(result.data.page, totalPages);
  const rolloutTotalCount = rolloutsResult.data.total_count;
  const rolloutTotalPages = rolloutsResult.data.total_pages ?? Math.max(1, Math.ceil(rolloutTotalCount / rolloutPageSize));
  const safeRolloutPage = Math.min(rolloutsResult.data.page, rolloutTotalPages);
  const publishedCount = pageItems.filter((item) => item.status === "published" || item.status === "locked").length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live roster template mode" : "Demo roster template mode"}
        title="Roster templates"
        description="Define reusable shift patterns once, then publish and roll them out across teams with less manual scheduling work."
        actions={
          <>
            {canManagePolicies ? <Link className="button button--primary" href="/hr-admin/shift-roster-templates?rosterModal=create">Create roster template</Link> : null}
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">Back to attendance operations</Link>
          </>
        }
      />

      <TimeLeaveOperationsStrip
        current="shifts"
        title="Roster template rollout"
        description="Create repeatable shift patterns and roll them out safely across teams or employee selections."
        primaryMetricLabel="templates"
        primaryMetricValue={totalCount}
        secondaryMetricLabel="rollout ready"
        secondaryMetricValue={publishedCount}
      />

      <ShiftRosterTemplatesWorkbench
        canManagePolicies={canManagePolicies}
        currentParams={currentParams}
        editItem={editItem}
        items={pageItems}
        options={optionsResult.data}
        page={safePage}
        pageSize={pageSize}
        state={result.state}
        totalCount={totalCount}
        totalPages={totalPages}
      />

      {canManagePolicies ? (
        <ShiftRosterRolloutPanel
          firstRolloutHref={buildHref(currentParams, { rollout_page: "1", rollout_page_size: String(rolloutPageSize) })}
          hasNextRollout={safeRolloutPage < rolloutTotalPages}
          hasPreviousRollout={safeRolloutPage > 1}
          lastRolloutHref={buildHref(currentParams, { rollout_page: String(rolloutTotalPages), rollout_page_size: String(rolloutPageSize) })}
          nextRolloutHref={buildHref(currentParams, { rollout_page: String(safeRolloutPage + 1), rollout_page_size: String(rolloutPageSize) })}
          options={optionsResult.data}
          previousRolloutHref={buildHref(currentParams, { rollout_page: String(safeRolloutPage - 1), rollout_page_size: String(rolloutPageSize) })}
          rolloutPage={safeRolloutPage}
          rolloutPageSize={rolloutPageSize}
          rolloutTotalCount={rolloutTotalCount}
          rollouts={rolloutsResult.data.items}
          templates={pageItems}
        />
      ) : (
        <section className="section"><div className="notice"><strong>Read-only roster template view.</strong><span className="muted">Template rollout requires attendance policy management permission.</span></div></section>
      )}
    </main>
  );
}
