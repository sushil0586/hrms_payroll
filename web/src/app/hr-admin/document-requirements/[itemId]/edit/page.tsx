import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";
import { notFound } from "next/navigation";

import { documentRequirementToFormValue } from "@/app/hr-admin/document-requirements/form-values";
import { DocumentRequirementForm } from "@/app/hr-admin/document-requirements/document-requirement-form";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentOptions, getHrAdminDocumentRequirements } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditDocumentRequirementPage({ params }: PageProps) {
  const { itemId } = await params;
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.manage"],
    fallbackPath: "/hr-admin/document-requirements",
  });
  if (!sessionHasPermission(sessionUser, "documents.view")) return <DocumentAccessNotice />;
  const [itemsResult, optionsResult] = await Promise.all([getHrAdminDocumentRequirements(), getHrAdminDocumentOptions()]);
  const item = itemsResult.data.find((entry) => entry.id === itemId);

  if (!item) notFound();

  return (
    <main className="shell hr-document-workbench accerio-page document-operations document-setup-page">
      <WorkspaceStandardHeader
        actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/document-requirements">Back to document requirements</a>}
        description="Adjust the organizational scope and due timing for this required document rule."
        title="Edit document requirement"
      />
      <DocumentRequirementForm initialValue={documentRequirementToFormValue(item)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
