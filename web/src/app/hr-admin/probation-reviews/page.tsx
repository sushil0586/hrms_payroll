import Link from "next/link";

import { ProbationReviewQueue } from "@/app/hr-admin/probation-reviews/probation-review-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminProbationReviews } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminProbationReviewsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const decision = normalizeParam(currentParams.decision) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminProbationReviews({
      page,
      page_size: pageSize,
      q,
      decision: decision || undefined,
      owner: owner || undefined,
    }),
    getHrAdminLifecycleOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Probation reviews with clearer decisions and safer extension handling."
        description="Watch review dates, confirmation outcomes, owner allocation, and extension blockers from one focused review queue."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/probation-reviews/new">Create probation review</Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</Link>
          </>
        }
        pills={[
          "Extension pre-checks in queue",
          "Bulk owner and decision actions",
          "Shareable filter state",
        ]}
      />
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Probation reviews" value={result.data.total_count} trend="Decision queue" />
          <MetricTile label="Rows on current page" value={result.data.items.length} trend={`Page ${result.data.page}`} />
          <MetricTile label="Decision states" value={optionsResult.data.probation_decisions.length} trend="Decision model" />
          <MetricTile label="Assignable owners" value={optionsResult.data.lifecycle_owners.length} trend="Shared ownership pool" />
        </div>
      </section>
      <ProbationReviewQueue
        items={result.data.items}
        state={result.state}
        probationDecisionOptions={optionsResult.data.probation_decisions}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{ q, decision, owner, page, page_size: pageSize }}
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
