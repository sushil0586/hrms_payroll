import Link from "next/link";

import { OnboardingQueue } from "@/app/hr-admin/onboardings/onboarding-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminOnboardings } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminOnboardingsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminOnboardings({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      owner: owner || undefined,
    }),
    getHrAdminLifecycleOptions(),
  ]);
  const documentBlockedCount = result.data.items.filter((item) => item.missing_required_document_count > 0).length;
  const futureDueDocumentCount = result.data.items.reduce((total, item) => total + item.future_due_document_count, 0);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Onboarding operations with readiness, ownership, and checklist visibility."
        description="Track preboarding, actual joining, checklist completion, and owner load in a queue that is built for fast HR coordination."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/onboardings/new">Create onboarding</Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</Link>
          </>
        }
        pills={[
          "Checklist-aware completion rules",
          "Bulk owner and status actions",
          "URL-driven queue state",
        ]}
      />
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Onboarding records" value={result.data.total_count} trend="Joiner queue" />
          <MetricTile label="Rows on current page" value={result.data.items.length} trend={`Page ${result.data.page}`} />
          <MetricTile label="Document blockers" value={documentBlockedCount} trend="Missing due requirements" />
          <MetricTile label="Future due docs" value={futureDueDocumentCount} trend="Upcoming onboarding requirements" />
        </div>
      </section>
      <OnboardingQueue
        items={result.data.items}
        state={result.state}
        onboardingStatusOptions={optionsResult.data.onboarding_statuses}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{ q, status, owner, page, page_size: pageSize }}
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
