import Link from "next/link";

import { documentCategoryToFormValue } from "@/app/hr-admin/document-categories/form-values";
import { DocumentCategoryForm } from "@/app/hr-admin/document-categories/document-category-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentCategory, getHrAdminDocumentOptions } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditDocumentCategoryPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([getHrAdminDocumentCategory(itemId), getHrAdminDocumentOptions()]);

  return (
    <main className="shell">
      <PageIntro
        actions={<Link className="button button--secondary" href="/hr-admin/document-categories">Back to document categories</Link>}
        description="Update behavior, validation, and upload expectations for this category."
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Edit document category"
      />
      <DocumentCategoryForm initialValue={documentCategoryToFormValue(itemResult.data)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
