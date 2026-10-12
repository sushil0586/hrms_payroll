import Link from "next/link";

import { EmployeeDocumentQueue } from "@/app/hr-admin/employee-documents/employee-document-queue";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions, getHrAdminEmployeeDocument, getHrAdminEmployeeDocuments } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminEmployeeDocumentsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.view", "documents.manage", "documents.verify", "documents.export"],
    fallbackPath: "/hr-admin",
  });
  const canManageDocuments = sessionHasPermission(sessionUser, "documents.manage");
  const canVerifyDocuments = sessionHasPermission(sessionUser, "documents.verify");
  const canExportDocuments = sessionHasPermission(sessionUser, "documents.export");
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const verificationStatus = normalizeParam(currentParams.verification_status) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const categoryId = normalizeParam(currentParams.category_id) ?? "";
  const expiryFilter = normalizeParam(currentParams.expiry_filter) ?? "";
  const reviewSaved = normalizeParam(currentParams.review_saved) === "1";
  const reviewDocumentId = normalizeParam(currentParams.reviewDocument) ?? "";

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
  const reviewDocumentResult = canVerifyDocuments && reviewDocumentId ? await getHrAdminEmployeeDocument(reviewDocumentId) : null;

  return (
    <main className="shell hr-document-workbench">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Employee document review"
        description="Triage uploads, verification outcomes, expiry risk, and reminder follow-up."
        actions={
          <>
            {canManageDocuments ? <Link className="button button--primary" href="/hr-admin/employee-documents/new">Upload document</Link> : null}
            <Link className="button button--secondary" href="/hr-admin/documents">Open document control center</Link>
            <Link className="button button--ghost" href="/hr-admin/reports">Open reports</Link>
          </>
        }
        pills={[
          "Filtered queue",
          "Expiry tracking",
          "Review actions",
        ]}
      />
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
        canExportDocuments={canExportDocuments}
        canManageDocuments={canManageDocuments}
        canVerifyDocuments={canVerifyDocuments}
        documentOptions={optionsResult.data}
        reviewDocument={reviewDocumentResult?.data ?? null}
        initialActionNotice={reviewSaved ? "Document review updated." : ""}
        initialActionNoticeTitle="Review action complete."
        summary={{
          categoriesConfigured: optionsResult.data.categories.length,
          expiredOnPage,
          expiringOnPage,
        }}
      />
    </main>
  );
}
