import Link from "next/link";

import { ExitQueue } from "@/app/hr-admin/exits/exit-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminExits, getHrAdminLifecycleOptions } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminExitsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const rehireEligible = normalizeParam(currentParams.rehire_eligible) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminExits({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      rehire_eligible: rehireEligible || undefined,
    }),
    getHrAdminLifecycleOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/exits/new">Create exit</Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</Link>
          </>
        }
        description="Manage resignations, notice periods, clearance, and final exit readiness."
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        pills={[
          `${result.data.total_count} exits`,
          `${result.data.items.filter((item) => item.status === "active").length} active on this page`,
        ]}
        title="Exit operations"
      />
      <section className="section">
        <div className="metrics-grid">
          <MetricTile label="Queue size" trend="Current filtered result" value={result.data.total_count} />
          <MetricTile label="Page items" trend="Visible right now" value={result.data.items.length} />
          <MetricTile
            label="Rehire eligible"
            trend="Visible on this page"
            value={result.data.items.filter((item) => item.rehire_eligible).length}
          />
        </div>
      </section>
      <ExitQueue
        items={result.data.items}
        exitStatusOptions={optionsResult.data.exit_statuses}
        currentFilters={{ q, status, rehire_eligible: rehireEligible, page, page_size: pageSize }}
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
