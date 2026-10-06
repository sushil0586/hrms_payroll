import Link from "next/link";

import { EmployeeDocumentCenter } from "@/app/ess/documents/employee-document-center";
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
    <main className="shell shell--workspace shell--ess-documents ess-experience-shell">
      <section className="workspace-control-header">
        <div className="workspace-control-header__copy">
          <span className="workspace-control-header__eyebrow">{result.state === "live" ? "Live ESS" : "Demo ESS"} / Documents</span>
          <h1>Documents</h1>
          <p>Upload the files HR needs, track review status, and replace documents when a fresh copy is requested.</p>
        </div>
        <div className="workspace-control-header__actions">
          <Link className="button button--secondary" href="/ess">Overview</Link>
          <Link className="button button--secondary" href="/ess/payslips">Payslips</Link>
          <Link className="button button--secondary" href="/ess/notifications">Inbox</Link>
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
