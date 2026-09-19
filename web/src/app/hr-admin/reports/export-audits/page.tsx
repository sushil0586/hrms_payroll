import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { ComplianceEvidenceStrip } from "@/app/hr-admin/compliance-evidence-strip";

import { ReportExportAuditWorkspace } from "./report-export-audit-workspace";

export default function ReportExportAuditsPage() {
  return (
    <main className="shell">
      <PageIntro
        eyebrow="Compliance evidence"
        title="Export Audit History"
        description="Trace report downloads, manifest requests, filters, checksums, and source evidence."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/reports/compliance">
              Compliance hub
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
          </>
        }
        pills={["CSV", "Manifest", "Checksum"]}
        showPills
      />
      <ComplianceEvidenceStrip
        current="reports"
        eyebrow="Export evidence"
        title="Download and manifest audit"
        description="Trace report downloads, export filters, manifest requests, checksums, source evidence, and audit-friendly report access."
        metrics={[
          { label: "CSV", value: "Ready", tone: "ready" },
          { label: "Manifest", value: "Ready", tone: "ready" },
          { label: "Checksum", value: "Ready", tone: "ready" },
          { label: "Evidence", value: "Trace", tone: "neutral" },
        ]}
      />
      <ReportExportAuditWorkspace />
    </main>
  );
}
