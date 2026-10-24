import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminEmployeeDocuments } from "@/lib/api";
import { completeReport } from "@/lib/complete-report";
import { requireWorkspaceAccess, sessionHasPermission } from "@/lib/workspace-access";
import { DocumentComplianceReportWorkspace } from "./document-compliance-report-workspace";
export default async function DocumentComplianceReportPage({searchParams}: {searchParams: Promise<Record<string,string|string[]|undefined>>}) {
  const user = await requireWorkspaceAccess({roleCodes:["hr-admin"]});
  if (!sessionHasPermission(user,"documents.view")) return <DocumentAccessNotice />;
  const result = await completeReport(getHrAdminEmployeeDocuments);
  const params = await searchParams;
  const initialFilters = Object.fromEntries(Object.entries(params).map(([key,value])=>[key,Array.isArray(value)?value[0]??"":value??""]));
  return <main className="shell accerio-page document-operations">
    <WorkspaceStandardHeader title="Document compliance report" description="Review verification, expiry and follow-up across the complete bounded document register." actions={<><a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/reports">Reports</a><a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/employee-documents">Document queue</a></>} />
    <DocumentComplianceReportWorkspace documents={result.data.items} initialFilters={initialFilters} canExport={sessionHasPermission(user,"reports.hr.export")} canReview={sessionHasPermission(user,"documents.verify")} canDownload={sessionHasPermission(user,"documents.export")} />
  </main>;
}
