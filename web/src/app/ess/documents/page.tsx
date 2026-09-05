import Link from "next/link";

import { EmployeeDocumentCenter } from "@/app/ess/documents/employee-document-center";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getEssDocumentCenter } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EssDocumentsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "10") || 10, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const verificationStatus = normalizeParam(currentParams.verification_status) ?? "";
  const categoryId = normalizeParam(currentParams.category_id) ?? "";
  const expiryFilter = normalizeParam(currentParams.expiry_filter) ?? "";

  const result = await getEssDocumentCenter({
    page,
    page_size: pageSize,
    q,
    verification_status: verificationStatus || undefined,
    category_id: categoryId || undefined,
    expiry_filter: expiryFilter || undefined,
  });

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live document center" : "Demo document center"}
        title="Documents"
        description="Upload required files, review status, and track re-upload requests without leaving self service."
        actions={<Link className="button button--secondary" href="/ess">Back to overview</Link>}
        pills={["Requirement guided", "Self upload enabled", "Review history visible"]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Required documents" value={result.data.summary.required_document_count} trend="Mapped to your employee profile" />
          <MetricTile label="Missing now" value={result.data.summary.missing_required_document_count} trend="Needs action from you" />
          <MetricTile label="Expiring soon" value={result.data.summary.expiring_documents} trend="Review before the deadline" />
          <MetricTile label="Expired" value={result.data.summary.expired_documents} trend="Requires immediate attention" />
        </div>
      </section>

      <EmployeeDocumentCenter
        currentFilters={{
          q,
          verification_status: verificationStatus,
          category_id: categoryId,
          expiry_filter: expiryFilter,
          page,
          page_size: pageSize,
        }}
        data={result.data}
      />
    </main>
  );
}
