import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";
import Link from "next/link";

import { employeeDocumentToFormValue } from "@/app/hr-admin/employee-documents/form-values";
import { EmployeeDocumentReviewForm } from "@/app/hr-admin/employee-documents/employee-document-review-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentOptions, getHrAdminEmployeeDocument } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEmployeeDocumentReviewPage({ params }: PageProps) {
  const { itemId } = await params;
  const user = await requireSessionPermission({
    permissionKeys: ["documents.verify"],
    fallbackPath: "/hr-admin/employee-documents",
  });
  if (!sessionHasPermission(user, "documents.view")) return <DocumentAccessNotice />;

  const [documentResult, optionsResult] = await Promise.all([getHrAdminEmployeeDocument(itemId), getHrAdminDocumentOptions()]);

  return (
    <main className="shell hr-document-workbench accerio-page document-operations">
      <WorkspaceStandardHeader
        title="Review employee document"
        description={documentResult.data.review_status_label}
        actions={<Link className="button button--secondary" href="/hr-admin/employee-documents">Back to employee documents</Link>}

      />
      <EmployeeDocumentReviewForm
        canDownload={sessionHasPermission(user, "documents.export")} document={documentResult.data} initialValue={employeeDocumentToFormValue(documentResult.data)} itemId={itemId} options={optionsResult.data} />
    </main>
  );
}
