import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";

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
      <ReportExportAuditWorkspace />
    </main>
  );
}

