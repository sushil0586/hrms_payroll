import Link from "next/link";

import { EmployeeDocumentUploadForm } from "@/app/hr-admin/employee-documents/employee-document-upload-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDocumentOptions, getHrAdminEmployees } from "@/lib/api";

export default async function HrAdminNewEmployeeDocumentPage() {
  const [optionsResult, employeesResult] = await Promise.all([
    getHrAdminDocumentOptions(),
    getHrAdminEmployees(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" && employeesResult.state === "live" ? "Live upload mode" : "Demo upload mode"}
        title="Upload employee document"
        description="Create a clean document artifact record with employee context, category mapping, and review-ready metadata."
        actions={<Link className="button button--secondary" href="/hr-admin/employee-documents">Back to employee documents</Link>}
        pills={["Artifact-backed storage", "HR admin intake", "Review-ready metadata"]}
      />

      <EmployeeDocumentUploadForm employees={employeesResult.data} options={optionsResult.data} />
    </main>
  );
}
