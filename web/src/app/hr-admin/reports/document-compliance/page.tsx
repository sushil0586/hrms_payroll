import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ComplianceEvidenceStrip } from "@/app/hr-admin/compliance-evidence-strip";
import { getHrAdminEmployeeDocuments } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { DocumentComplianceReportWorkspace } from "./document-compliance-report-workspace";

export default async function DocumentComplianceReportPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const result = await getHrAdminEmployeeDocuments({ page: 1, page_size: 500 });
  const documents = result.data.items;
  const pendingVerificationCount = documents.filter((item) => item.verification_status === "pending").length;
  const expiryRiskCount = documents.filter((item) => item.is_expired || item.is_expiring_soon).length;
  const reuploadCount = documents.filter((item) => item.reupload_requested).length;

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

      <ComplianceEvidenceStrip
        current="documents"
        eyebrow="Document evidence"
        title="Employee document compliance"
        description="Track verification state, expiry exposure, re-upload risk, and document evidence across the employee file."
        metrics={[
          { label: "documents", value: documents.length, tone: "neutral" },
          { label: "pending", value: pendingVerificationCount, tone: pendingVerificationCount ? "warning" : "ready" },
          { label: "expiry risk", value: expiryRiskCount, tone: expiryRiskCount ? "blocked" : "ready" },
          { label: "re-upload", value: reuploadCount, tone: reuploadCount ? "warning" : "ready" },
        ]}
      />

      <DocumentComplianceReportWorkspace documents={documents} />
    </main>
  );
}
