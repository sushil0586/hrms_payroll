import Link from "next/link";

import { employeeDocumentToFormValue } from "@/app/hr-admin/employee-documents/form-values";
import { EmployeeDocumentReviewForm } from "@/app/hr-admin/employee-documents/employee-document-review-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions, getHrAdminEmployeeDocument } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEmployeeDocumentReviewPage({ params }: PageProps) {
  const { itemId } = await params;
  const [documentResult, optionsResult] = await Promise.all([getHrAdminEmployeeDocument(itemId), getHrAdminDocumentOptions()]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={documentResult.state === "live" && optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Review employee document"
        description="Verify, reject, or update the metadata for this employee document record."
        actions={<Link className="button button--secondary" href="/hr-admin/employee-documents">Back to employee documents</Link>}
        pills={[documentResult.data.category_name, documentResult.data.verification_status, documentResult.data.status]}
      />
      <EmployeeDocumentReviewForm document={documentResult.data} initialValue={employeeDocumentToFormValue(documentResult.data)} itemId={itemId} options={optionsResult.data} />
    </main>
  );
}
