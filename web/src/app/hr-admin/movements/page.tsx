import Link from "next/link";

import { MovementQueue } from "@/app/hr-admin/movements/movement-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminMovements } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminMovementsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const movementType = normalizeParam(currentParams.movement_type) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminMovements({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      movement_type: movementType || undefined,
      owner: owner || undefined,
    }),
    getHrAdminLifecycleOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Movement operations for transfers, promotions, and reporting changes."
        description="Track structural people changes with clearer status, movement type, destination ownership, and effective-date context."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/movements/new">Create movement</Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</Link>
          </>
        }
        pills={[
          "Bulk owner and status actions",
          "Movement-type filtering",
          "Shareable queue state",
        ]}
      />
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Movement records" value={result.data.total_count} trend="People movement queue" />
          <MetricTile label="Rows on current page" value={result.data.items.length} trend={`Page ${result.data.page}`} />
          <MetricTile label="Movement types" value={optionsResult.data.movement_types.length} trend="Change taxonomy" />
          <MetricTile label="Lifecycle states" value={optionsResult.data.lifecycle_event_statuses.length} trend="Workflow states" />
        </div>
      </section>
      <MovementQueue
        items={result.data.items}
        state={result.state}
        lifecycleStatusOptions={optionsResult.data.lifecycle_event_statuses}
        movementTypeOptions={optionsResult.data.movement_types}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{ q, status, movement_type: movementType, owner, page, page_size: pageSize }}
        pagination={{
          total_count: result.data.total_count,
          page: result.data.page,
          page_size: result.data.page_size,
          has_next: result.data.has_next,
          has_previous: result.data.has_previous,
        }}
      />
    </main>
  );
}
