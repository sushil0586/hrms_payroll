import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";
import { DocumentSetupWorkspace } from "@/app/hr-admin/documents/document-setup-workspace";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentCategories, getHrAdminDocumentOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type SearchParamValue = string | string[] | undefined;
const value = (param: SearchParamValue) => Array.isArray(param) ? param[0] : param;

export default async function HrAdminDocumentCategoriesPage({ searchParams }: { searchParams?: Promise<Record<string, SearchParamValue>> }) {
  const params = (await searchParams) ?? {};
  const selected = value(params.selectedCategory) ?? value(params.editCategory) ?? "";
  const modal = value(params.categoryModal) === "create" ? "create" : value(params.editCategory) ? "edit" : "";
  const user = await requireSessionPermission({ permissionKeys: ["documents.view", "documents.manage"], fallbackPath: "/hr-admin/documents" });
  if (!sessionHasPermission(user, "documents.view")) return <DocumentAccessNotice />;
  const [list, options] = await Promise.all([getHrAdminDocumentCategories(), getHrAdminDocumentOptions()]);
  return <main className="shell hr-document-workbench accerio-page document-operations document-setup-page">
    <WorkspaceStandardHeader title="Document categories" description="Maintain reusable document types, upload behavior, and verification rules." actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/documents">Back to documents</a>} />
    <DocumentSetupWorkspace kind="categories" initialData={{ items: list.data, options: options.data }} canManage={sessionHasPermission(user, "documents.manage")} initialSelected={selected} initialModal={modal} />
  </main>;
}
