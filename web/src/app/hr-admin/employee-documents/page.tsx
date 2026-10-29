import Link from "next/link";

import { EmployeeDocumentWorkspace } from "@/app/hr-admin/employee-documents/employee-document-workspace";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";
import { getHrAdminDocumentCategories, getHrAdminDocumentOptions, getHrAdminEmployeeDocument, getHrAdminEmployeeDocuments, getHrAdminEmployees } from "@/lib/api";
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
  if (!sessionHasPermission(sessionUser, "documents.view")) return <DocumentAccessNotice />;
  const canManageDocuments = sessionHasPermission(sessionUser, "documents.manage");
  const canVerifyDocuments = sessionHasPermission(sessionUser, "documents.verify");
  const canExportDocuments = sessionHasPermission(sessionUser, "documents.export");
  const currentParams = (await searchParams) ?? {};
  const requestedPage = Number(normalizeParam(currentParams.page) || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedSize = Number(normalizeParam(currentParams.page_size) || "25");
  const pageSize = Number.isSafeInteger(requestedSize) && requestedSize > 0 ? Math.min(requestedSize, 100) : 25;
  const q = normalizeParam(currentParams.q) ?? "";
  const verificationStatus = normalizeParam(currentParams.verification_status) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const categoryId = normalizeParam(currentParams.category_id) ?? "";
  const expiryFilter = normalizeParam(currentParams.expiry_filter) ?? "";
  const reviewDocumentId = normalizeParam(currentParams.reviewDocument) ?? "";
  const uploadDocument = normalizeParam(currentParams.uploadDocument) === "create" ? "create" : "";
  const canUploadDocuments = canManageDocuments && sessionHasPermission(sessionUser, "employees.view");

  let [result, optionsResult] = await Promise.all([
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
  const lastPage = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
  if (result.data.page > lastPage) result = await getHrAdminEmployeeDocuments({ page: lastPage, page_size: pageSize, q, verification_status: verificationStatus || undefined, status: status || undefined, category_id: categoryId || undefined, expiry_filter: expiryFilter || undefined });
  const [reviewDocumentResult, employeesResult, uploadCategoriesResult] = await Promise.all([
    canVerifyDocuments && reviewDocumentId ? getHrAdminEmployeeDocument(reviewDocumentId) : null,
    canUploadDocuments && uploadDocument ? getHrAdminEmployees() : null,
    canUploadDocuments && uploadDocument ? getHrAdminDocumentCategories() : null,
  ]);

  return (
    <main className="shell hr-document-workbench accerio-page document-operations">
      <WorkspaceStandardHeader
        title="Employee document review"
        description="Triage uploads, verification outcomes, expiry risk, and reminder follow-up."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/documents">Documents</Link>
            <Link className="button button--ghost" href="/hr-admin/reports">Open reports</Link>
          </>
        }

      />
      <EmployeeDocumentWorkspace
        initialData={{
          ...result.data,
          options: optionsResult.data,
          reviewDocument: reviewDocumentResult?.data ?? null,
          employees: employeesResult?.data ?? null,
          uploadCategories: uploadCategoriesResult?.data ?? null,
        }}
        initialQuery={{
          q,
          verification_status: verificationStatus,
          status,
          category_id: categoryId,
          expiry_filter: expiryFilter,
          page: result.data.page,
          page_size: pageSize,
          reviewDocument: reviewDocumentId,
          uploadDocument,
        }}
        canExportDocuments={canExportDocuments}
        canManageDocuments={canManageDocuments}
        canVerifyDocuments={canVerifyDocuments}
        canUploadDocuments={canUploadDocuments}
      />
    </main>
  );
}
