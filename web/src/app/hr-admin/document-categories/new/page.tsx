import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";

import { createEmptyDocumentCategoryValue } from "@/app/hr-admin/document-categories/form-values";
import { DocumentCategoryForm } from "@/app/hr-admin/document-categories/document-category-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

export default async function HrAdminNewDocumentCategoryPage() {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.manage"],
    fallbackPath: "/hr-admin/document-categories",
  });
  if (!sessionHasPermission(sessionUser, "documents.view")) return <DocumentAccessNotice />;
  const optionsResult = await getHrAdminDocumentOptions();

  return (
    <main className="shell hr-document-workbench accerio-page document-operations document-setup-page">
      <WorkspaceStandardHeader
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/document-categories">Back to document categories</a>}
        description="Set up a reusable document type with upload, verification, and expiry behavior."
        title="Create document category"
      />
      <DocumentCategoryForm initialValue={createEmptyDocumentCategoryValue(optionsResult.data.document_category_types[0]?.value)} mode="create" options={optionsResult.data} />
    </main>
  );
}
