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
    <main className="shell shell--workspace shell--ess-documents">
      <PageIntro
        eyebrow={result.state === "live" ? "Live document center" : "Demo document center"}
        title="Documents"
        description="Upload the files HR needs, track review status, and replace documents when a fresh copy is requested."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/ess">
              Overview
            </Link>
            <Link className="button button--secondary" href="/ess/payslips">
              Payslips
            </Link>
            <Link className="button button--secondary" href="/ess/notifications">
              Inbox
            </Link>
          </>
        }
        pills={["Personal documents", "Self upload", "HR review tracked"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern">
          <MetricTile className="metric-tile-soft" label="Required documents" value={result.data.summary.required_document_count} trend="Mapped to your profile" />
          <MetricTile className="metric-tile-soft" label="Missing now" value={result.data.summary.missing_required_document_count} trend="Needs your upload" />
          <MetricTile className="metric-tile-soft" label="Expiring soon" value={result.data.summary.expiring_documents} trend="Review before deadline" />
          <MetricTile className="metric-tile-soft" label="Expired" value={result.data.summary.expired_documents} trend="Replace immediately" />
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
