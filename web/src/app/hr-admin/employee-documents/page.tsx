import Link from "next/link";

import { EmployeeDocumentQueue } from "@/app/hr-admin/employee-documents/employee-document-queue";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions, getHrAdminEmployeeDocuments } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminEmployeeDocumentsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const verificationStatus = normalizeParam(currentParams.verification_status) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const categoryId = normalizeParam(currentParams.category_id) ?? "";
  const expiryFilter = normalizeParam(currentParams.expiry_filter) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminEmployeeDocuments({
      page,
      page_size: pageSize,
      q,
      verification_status: verificationStatus || undefined,
      status: status || undefined,
      category_id: categoryId || undefined,
      expiry_filter: expiryFilter || undefined,
    }),
    getHrAdminDocumentOptions(),
  ]);
  const expiringOnPage = result.data.items.filter((item) => item.is_expiring_soon).length;
  const expiredOnPage = result.data.items.filter((item) => item.is_expired).length;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Employee document review with faster filtering and cleaner triage."
        description="Review uploads, verification status, expiry coverage, and reviewer context from a queue that is built for operational throughput."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/employee-documents/new">Upload document</Link>
            <Link className="button button--secondary" href="/hr-admin/documents">Open document control center</Link>
            <Link className="button button--ghost" href="/hr-admin/reports">Open reports</Link>
          </>
        }
        pills={[
          "Server-side filters and pagination",
          "URL-driven review state",
          "Demo and live mode parity",
        ]}
      />
      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Documents in queue" value={result.data.total_count} trend="Reviewable records" />
          <MetricTile label="Categories configured" value={optionsResult.data.categories.length} trend="Compliance structure" />
          <MetricTile label="Expiring on page" value={expiringOnPage} trend="Within the next 30 days" />
          <MetricTile label="Expired on page" value={expiredOnPage} trend={`Page ${result.data.page}`} />
        </div>
      </section>
      <EmployeeDocumentQueue
        items={result.data.items}
        verificationStatusOptions={optionsResult.data.verification_statuses}
        recordStatusOptions={optionsResult.data.employee_document_statuses}
        categories={optionsResult.data.categories}
        currentFilters={{
          q,
          verification_status: verificationStatus,
          status,
          category_id: categoryId,
          expiry_filter: expiryFilter,
          page,
          page_size: pageSize,
        }}
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
