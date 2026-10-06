import Link from "next/link";

import { employeeDocumentToFormValue } from "@/app/hr-admin/employee-documents/form-values";
import { EmployeeDocumentReviewForm } from "@/app/hr-admin/employee-documents/employee-document-review-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions, getHrAdminEmployeeDocument } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

type PageProps = { params: Promise<{ itemId: string }> };

function humanizeStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function HrAdminEmployeeDocumentReviewPage({ params }: PageProps) {
  const { itemId } = await params;
  await requireSessionPermission({
    permissionKeys: ["documents.verify"],
    fallbackPath: "/hr-admin/employee-documents",
  });
  const [documentResult, optionsResult] = await Promise.all([getHrAdminEmployeeDocument(itemId), getHrAdminDocumentOptions()]);

  return (
    <main className="shell hr-document-workbench">
      <PageIntro
        eyebrow={documentResult.state === "live" && optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
        title="Review employee document"
        description={documentResult.data.review_status_label}
        actions={<Link className="button button--secondary" href="/hr-admin/employee-documents">Back to employee documents</Link>}
        pills={[
          documentResult.data.category_name,
          humanizeStatus(documentResult.data.verification_status),
          `Owner: ${documentResult.data.review_owner_label}`,
        ]}
      />
      <EmployeeDocumentReviewForm document={documentResult.data} initialValue={employeeDocumentToFormValue(documentResult.data)} itemId={itemId} options={optionsResult.data} />
    </main>
  );
}
