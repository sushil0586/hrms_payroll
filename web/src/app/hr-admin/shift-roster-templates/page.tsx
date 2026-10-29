import Link from "next/link";

import { ShiftRosterTemplatesWorkspace } from "@/app/hr-admin/shift-roster-templates/shift-roster-templates-workspace";
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
  const pageSize = Math.min(numberParam(currentParams.page_size, 10), 100);
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
  const initialModal = editRosterId ? { mode: "edit" as const, id: editRosterId } : normalizeParam(currentParams.rosterModal) === "create" ? { mode: "create" as const, id: "" } : { mode: "" as const, id: "" };
  const initialEditItem = canManagePolicies && editRosterId ? pageItems.find((item) => item.id === editRosterId) ?? (await getHrAdminShiftRosterTemplate(editRosterId)).data : null;
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(result.data.page, totalPages);
  const rolloutTotalCount = rolloutsResult.data.total_count;
  const rolloutTotalPages = rolloutsResult.data.total_pages ?? Math.max(1, Math.ceil(rolloutTotalCount / rolloutPageSize));
  const safeRolloutPage = Math.min(rolloutsResult.data.page, rolloutTotalPages);
  const publishedCount = pageItems.filter((item) => item.status === "published" || item.status === "locked").length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
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

      <details className="workspace-context-disclosure"><summary>Attendance navigation and summary</summary><TimeLeaveOperationsStrip
        current="shifts"
        title="Roster template rollout"
        description="Create repeatable shift patterns and roll them out safely across teams or employee selections."
        primaryMetricLabel="templates"
        primaryMetricValue={totalCount}
        secondaryMetricLabel="rollout ready"
        secondaryMetricValue={publishedCount}
      /></details>

      <ShiftRosterTemplatesWorkspace
        canManagePolicies={canManagePolicies}
        initialData={{ ...result.data, page: safePage, page_size: pageSize, state: result.state === "live" ? "live" : "demo" }}
        initialQuery={{ ...filters, page: safePage, page_size: pageSize }}
        initialModal={initialModal}
        initialEditItem={initialEditItem}
        initialRolloutData={{ ...rolloutsResult.data, page: safeRolloutPage, page_size: rolloutPageSize }}
        initialRolloutQuery={{ page: safeRolloutPage, page_size: rolloutPageSize }}
        options={optionsResult.data}
      />

      {!canManagePolicies ? (
        <section className="section"><div className="notice"><strong>Read-only roster template view.</strong><span className="muted">Template rollout requires attendance policy management permission.</span></div></section>
      ) : null}
    </main>
  );
}
