import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";
import { DocumentSetupWorkspace } from "@/app/hr-admin/documents/document-setup-workspace";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentOptions, getHrAdminDocumentRequirements } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type SearchParamValue = string | string[] | undefined;
const value = (param: SearchParamValue) => Array.isArray(param) ? param[0] : param;

export default async function HrAdminDocumentRequirementsPage({ searchParams }: { searchParams?: Promise<Record<string, SearchParamValue>> }) {
  const params = (await searchParams) ?? {};
  const selected = value(params.selectedRequirement) ?? value(params.editRequirement) ?? "";
  const modal = value(params.requirementModal) === "create" ? "create" : value(params.editRequirement) ? "edit" : "";
  const user = await requireSessionPermission({ permissionKeys: ["documents.view", "documents.manage"], fallbackPath: "/hr-admin/documents" });
  if (!sessionHasPermission(user, "documents.view")) return <DocumentAccessNotice />;
  const [list, options] = await Promise.all([getHrAdminDocumentRequirements(), getHrAdminDocumentOptions()]);
  return <main className="shell hr-document-workbench accerio-page document-operations document-setup-page">
    <WorkspaceStandardHeader title="Document requirements" description="Define where documents are mandatory across org structure and employee context." actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/documents">Back to documents</a>} />
    <DocumentSetupWorkspace kind="requirements" initialData={{ items: list.data, options: options.data }} canManage={sessionHasPermission(user, "documents.manage")} initialSelected={selected} initialModal={modal} />
  </main>;
}
