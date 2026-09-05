import Link from "next/link";

import { documentRequirementToFormValue } from "@/app/hr-admin/document-requirements/form-values";
import { DocumentRequirementForm } from "@/app/hr-admin/document-requirements/document-requirement-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions, getHrAdminDocumentRequirements } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditDocumentRequirementPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemsResult, optionsResult] = await Promise.all([getHrAdminDocumentRequirements(), getHrAdminDocumentOptions()]);
  const item = itemsResult.data.find((entry) => entry.id === itemId) ?? itemsResult.data[0];

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/document-requirements">Back to document requirements</Link>}
        description="Adjust the organizational scope and due timing for this required document rule."
        eyebrow={itemsResult.state === "live" && optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Edit document requirement"
      />
      <DocumentRequirementForm initialValue={documentRequirementToFormValue(item)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
