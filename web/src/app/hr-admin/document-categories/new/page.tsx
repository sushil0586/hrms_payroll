import Link from "next/link";

import { createEmptyDocumentCategoryValue } from "@/app/hr-admin/document-categories/form-values";
import { DocumentCategoryForm } from "@/app/hr-admin/document-categories/document-category-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions } from "@/lib/api";

export default async function HrAdminNewDocumentCategoryPage() {
  const optionsResult = await getHrAdminDocumentOptions();

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/document-categories">Back to document categories</Link>}
        description="Set up a reusable document type with upload, verification, and expiry behavior."
        eyebrow={optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Create document category"
      />
      <DocumentCategoryForm initialValue={createEmptyDocumentCategoryValue(optionsResult.data.document_category_types[0]?.value)} mode="create" options={optionsResult.data} />
    </main>
  );
}
