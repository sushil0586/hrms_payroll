import Link from "next/link";

import { createEmptyDocumentRequirementValue } from "@/app/hr-admin/document-requirements/form-values";
import { DocumentRequirementForm } from "@/app/hr-admin/document-requirements/document-requirement-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions } from "@/lib/api";

export default async function HrAdminNewDocumentRequirementPage() {
  const optionsResult = await getHrAdminDocumentOptions();

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/document-requirements">Back to document requirements</Link>}
        description="Scope a document requirement by org structure and employment context."
        eyebrow={optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Create document requirement"
      />
      <DocumentRequirementForm initialValue={createEmptyDocumentRequirementValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
