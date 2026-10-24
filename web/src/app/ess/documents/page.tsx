import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import EssError from "@/app/ess/error";

import { EmployeeDocumentCenter } from "@/app/ess/documents/employee-document-center";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
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
  const requestedPage = Number(normalizeParam(currentParams.page) || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedSize = Number(normalizeParam(currentParams.page_size) || "10");
  const pageSize = [5, 10, 25].includes(requestedSize) ? requestedSize : 10;
  const q = normalizeParam(currentParams.q) ?? "";
  const rawStatus = normalizeParam(currentParams.verification_status) ?? "";
  const verificationStatus = ["pending", "verified", "rejected", "expired"].includes(rawStatus) ? rawStatus : "";
  const rawCategory = normalizeParam(currentParams.category_id) ?? "";
  const categoryId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCategory) ? rawCategory : "";
  const rawExpiry = normalizeParam(currentParams.expiry_filter) ?? "";
  const expiryFilter = ["expired", "expiring", "missing_expiry"].includes(rawExpiry) ? rawExpiry : "";
  const filters = { page, page_size: pageSize, q, verification_status: verificationStatus || undefined, category_id: categoryId || undefined, expiry_filter: expiryFilter || undefined };
  let result: Awaited<ReturnType<typeof getEssDocumentCenter>>;
  try {
    result = await getEssDocumentCenter(filters);
    if (result.data.total_count > 0 && result.data.page > Math.ceil(result.data.total_count / result.data.page_size)) {
      result = await getEssDocumentCenter({ ...filters, page: Math.ceil(result.data.total_count / result.data.page_size) });
    }
  } catch (error) {
    // Preserve Next authentication redirects; expected read failures use the shared employee feedback view.
    unstable_rethrow(error);
    return <EssError />;
  }

  return (
    <main className="shell shell--workspace shell--ess-documents ess-experience-shell ess-compact accerio-page">
      <WorkspaceStandardHeader eyebrow="Employee self service" title="Documents" description="Check requirements, submit permitted files and follow HR review." actions={<Link prefetch={false} className="button button--secondary" href="/ess/payslips">Published payslips</Link>} />

      <EmployeeDocumentCenter uploadReceipt={(() => {
        const id = normalizeParam(currentParams.uploaded_document) ?? "";
        const status = normalizeParam(currentParams.upload_result);
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && (status === "pending" || status === "verified") ? { id, status } : undefined;
      })()} key={JSON.stringify([q, verificationStatus, categoryId, expiryFilter, result.data.page, pageSize])}
        currentFilters={{
          q,
          verification_status: verificationStatus,
          category_id: categoryId,
          expiry_filter: expiryFilter,
          page: result.data.page,
          page_size: pageSize,
        }}
        data={result.data}
      />
    </main>
  );
}
