import Link from "next/link";
import { WorkspaceStandardHeader, WorkspaceStandardPanel } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentCategories, getHrAdminDocumentRequirements, getHrAdminEmployeeDocuments } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { DocumentAccessNotice } from "./document-access-notice";

export default async function HrAdminDocumentsPage() {
  const user = await requireSessionPermission({ permissionKeys: ["documents.view", "documents.manage", "documents.verify", "documents.export"], fallbackPath: "/access-denied" });
  if (!sessionHasPermission(user, "documents.view")) return <DocumentAccessNotice />;
  const [categories, requirements, documents] = await Promise.all([getHrAdminDocumentCategories(), getHrAdminDocumentRequirements(), getHrAdminEmployeeDocuments()]);
  const canManage = sessionHasPermission(user, "documents.manage");
  const canUpload = canManage && sessionHasPermission(user, "employees.view");
  return <main className="shell accerio-page document-operations">
    <WorkspaceStandardHeader title="Documents" description="Review employee evidence, maintain requirements and follow up on expiry."
      actions={<><Link className="button button--primary" href="/hr-admin/employee-documents">Open review queue</Link>{canUpload ? <Link className="button button--secondary" href="/hr-admin/employee-documents/new">Upload document</Link> : null}</>} />
    <section className="document-overview-summary" aria-label="Document overview">
      <span><strong>{documents.data.total_count}</strong> employee documents</span>
      <span><strong>{categories.data.length}</strong> categories</span>
      <span><strong>{requirements.data.length}</strong> requirement rules</span>
    </section>
    <div className="document-destination-grid">
      <WorkspaceStandardPanel title="Document setup" description="Define the evidence employees need and how it is reviewed.">
        <Link href="/hr-admin/document-categories">{canManage ? "Manage" : "View"} categories</Link>
        <p className="muted">Document types, employee uploads, expiry and verification behavior.</p>
        <Link href="/hr-admin/document-requirements">{canManage ? "Manage" : "View"} requirements</Link>
        <p className="muted">Mandatory evidence by organization and employment context.</p>
      </WorkspaceStandardPanel>
      <WorkspaceStandardPanel title="Letters and compliance" description="Issue employee letters and inspect document evidence.">
        {sessionHasPermission(user, "employees.view") ? <><Link href="/hr-admin/generated-letters">Generated HR letters</Link><p className="muted">Prepare a letter, preview its content and store the issued file.</p></> : <p className="muted">Letter workspace also requires employee directory access.</p>}
        {user?.default_membership?.role_codes.includes("hr-admin") ? <><Link href="/hr-admin/reports/document-compliance">Document compliance report</Link><p className="muted">The report loads complete bounded evidence, up to 10,000 records.</p></> : null}
      </WorkspaceStandardPanel>
    </div>
  </main>;
}
