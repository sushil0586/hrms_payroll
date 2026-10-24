import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";

import { createEmptyDocumentRequirementValue } from "@/app/hr-admin/document-requirements/form-values";
import { DocumentRequirementForm } from "@/app/hr-admin/document-requirements/document-requirement-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

export default async function HrAdminNewDocumentRequirementPage() {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.manage"],
    fallbackPath: "/hr-admin/document-requirements",
  });
  if (!sessionHasPermission(sessionUser, "documents.view")) return <DocumentAccessNotice />;
  const optionsResult = await getHrAdminDocumentOptions();

  return (
    <main className="shell hr-document-workbench accerio-page document-operations document-setup-page">
      <WorkspaceStandardHeader
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/document-requirements">Back to document requirements</a>}
        description="Scope a document requirement by org structure and employment context."
        title="Create document requirement"
      />
      <DocumentRequirementForm initialValue={createEmptyDocumentRequirementValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
