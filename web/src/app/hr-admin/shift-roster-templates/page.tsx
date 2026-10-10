import Link from "next/link";

import { ShiftRosterRolloutPanel } from "@/app/hr-admin/shift-roster-templates/shift-roster-rollout-panel";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyWorkbenchOptions, getHrAdminShiftRosterRollouts, getHrAdminShiftRosterTemplates } from "@/lib/api";
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
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(result.data.page, totalPages);
  const rolloutTotalCount = rolloutsResult.data.total_count;
  const rolloutTotalPages = rolloutsResult.data.total_pages ?? Math.max(1, Math.ceil(rolloutTotalCount / rolloutPageSize));
  const safeRolloutPage = Math.min(rolloutsResult.data.page, rolloutTotalPages);
  const publishedCount = pageItems.filter((item) => item.status === "published" || item.status === "locked").length;
  const patterns = ["fixed", "weekly_rotation", "custom_rotation", "alternating_weeks"];

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live roster template mode" : "Demo roster template mode"}
        title="Roster templates"
        description="Define reusable shift patterns once, then publish and roll them out across teams with less manual scheduling work."
        actions={
          <>
            {canManagePolicies ? <Link className="button button--primary" href="/hr-admin/shift-roster-templates/new">Create roster template</Link> : null}
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

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Templates" value={totalCount} trend="Matching roster patterns" />
          <MetricTile label="Published or locked" value={publishedCount} trend="Visible rollout-ready rows" />
          <MetricTile label="Rotations on page" value={pageItems.filter((item) => item.assignment_kind === "weekly_rotation").length} trend="Visible recurring coverage" />
        </div>
      </section>

      <section className="section queue-layout">
        <form className="workspace-data-panel queue-toolbar" method="get" aria-label="Roster template filters">
          <div className="queue-toolbar__grid">
            <label><span>Search</span><input className="input-control" name="q" type="search" defaultValue={filters.q} placeholder="Template, code, shift, description" /></label>
            <label><span>Status</span><select className="input-control" name="status" defaultValue={filters.status}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="locked">Locked</option></select></label>
            <label><span>Assignment mode</span><select className="input-control" name="kind" defaultValue={filters.kind}><option value="all">All modes</option><option value="fixed">Fixed</option><option value="weekly_rotation">Weekly rotation</option><option value="temporary_override">Temporary override</option></select></label>
            <label><span>Pattern</span><select className="input-control" name="pattern" defaultValue={filters.pattern}><option value="all">All patterns</option>{patterns.map((pattern) => <option key={pattern} value={pattern}>{pattern.replaceAll("_", " ")}</option>)}</select></label>
            <label><span>Rows</span><select className="input-control" name="page_size" defaultValue={String(pageSize)}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>
          </div>
          <div className="queue-toolbar__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--secondary" href="/hr-admin/shift-roster-templates">Clear</Link><span className="queue-summary-chip"><strong>{totalCount}</strong> matching</span></div>
        </form>
        <div className="queue-list">
          {pageItems.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title"><h2>{item.name}</h2></div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip">{item.code}</span>
                    <span className="record-chip">{item.assignment_kind.replace("_", " ")}</span>
                    <span className={`record-chip${item.status === "locked" ? " record-chip--danger" : item.status === "published" ? " record-chip--accent" : ""}`}>{item.status}</span>
                  </div>
                </div>
                <div className="record-card__actions">
                  {canManagePolicies ? <Link className="button button--secondary" href={`/hr-admin/shift-roster-templates/${item.id}/edit`}>Edit</Link> : null}
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Base shift</span>
                  <span className="detail-value">{item.shift}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{item.description || "No description added."}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Rotation summary</span>
                  <span className="detail-value">
                    {item.config_snapshot?.rotation?.entries?.map((entry) => `${entry.entry_kind === "off" ? "Off" : optionsResult.data.shifts.find((shift) => shift.id === entry.shift_id)?.name || "Shift"} (${entry.span_days}d)`).join(" -> ") || "No rotation steps configured."}
                  </span>
                </div>
              </div>
            </article>
          ))}
          {pageItems.length === 0 ? (
            <div className="payroll-setup-empty-state"><strong>No roster templates match these filters.</strong><span>Clear filters or search by template code, status, assignment mode, or pattern.</span></div>
          ) : null}
        </div>
        <PaginationBar
          firstHref={buildHref(currentParams, { page: "1", page_size: String(pageSize) })}
          hasNext={safePage < totalPages}
          hasPrevious={safePage > 1}
          lastHref={buildHref(currentParams, { page: String(totalPages), page_size: String(pageSize) })}
          nextHref={buildHref(currentParams, { page: String(safePage + 1), page_size: String(pageSize) })}
          page={safePage}
          pageSize={pageSize}
          previousHref={buildHref(currentParams, { page: String(safePage - 1), page_size: String(pageSize) })}
          totalCount={totalCount}
        />
      </section>

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
