import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeDocuments } from "@/lib/api";

import { DocumentComplianceReportWorkspace } from "./document-compliance-report-workspace";

export default async function DocumentComplianceReportPage() {
  const result = await getHrAdminEmployeeDocuments({ page: 1, page_size: 500 });

  return (
    <main className="shell">
      <PageIntro
        eyebrow={result.state === "live" ? "Live HR core report" : "Demo HR core report"}
        title="Document Compliance Report"
        description="Verification state, expiry exposure, re-upload risk, and document evidence across the employee file."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
            <Link className="button button--secondary" href="/hr-admin/employee-documents">
              Document queue
            </Link>
            <Link className="button button--primary" href="/hr-admin/employee-documents/new">
              Upload document
            </Link>
          </>
        }
        pills={["Verification", "Expiry", "Audit manifest"]}
        showPills
      />

      <DocumentComplianceReportWorkspace documents={result.data.items} />
    </main>
  );
}
