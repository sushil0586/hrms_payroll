import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";

import { documentCategoryToFormValue } from "@/app/hr-admin/document-categories/form-values";
import { DocumentCategoryForm } from "@/app/hr-admin/document-categories/document-category-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentCategory, getHrAdminDocumentOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditDocumentCategoryPage({ params }: PageProps) {
  const { itemId } = await params;
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.manage"],
    fallbackPath: "/hr-admin/document-categories",
  });
  if (!sessionHasPermission(sessionUser, "documents.view")) return <DocumentAccessNotice />;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminDocumentCategory(itemId), getHrAdminDocumentOptions()]);

  return (
    <main className="shell hr-document-workbench accerio-page document-operations document-setup-page">
      <WorkspaceStandardHeader
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/document-categories">Back to document categories</a>}
        description="Update behavior, validation, and upload expectations for this category."
        title="Edit document category"
      />
      <DocumentCategoryForm initialValue={documentCategoryToFormValue(itemResult.data)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
