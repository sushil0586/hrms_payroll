import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import {
  getHrAdminDocumentCategories,
  getHrAdminDocumentRequirements,
  getHrAdminEmployeeDocuments,
  getHrAdminGeneratedLetters,
} from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

export default async function HrAdminDocumentsPage() {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.view", "documents.manage", "documents.verify", "documents.export"],
    fallbackPath: "/hr-admin",
  });
  const canManageDocuments = sessionHasPermission(sessionUser, "documents.manage");
  const canVerifyDocuments = sessionHasPermission(sessionUser, "documents.verify");
  const canViewDocuments = sessionHasPermission(sessionUser, "documents.view");
  const [categoriesResult, requirementsResult, employeeDocumentsResult, generatedLettersResult] = await Promise.all([
    getHrAdminDocumentCategories(),
    getHrAdminDocumentRequirements(),
    getHrAdminEmployeeDocuments(),
    getHrAdminGeneratedLetters(),
  ]);

  const state =
    categoriesResult.state === "live" &&
    requirementsResult.state === "live" &&
    employeeDocumentsResult.state === "live" &&
    generatedLettersResult.state === "live"
      ? "live"
      : "demo";

  return (
    <main className="shell hr-document-workbench">
      <PageIntro
        eyebrow={state === "live" ? "Live document mode" : "Demo document mode"}
        title="Documents control"
        description="Manage document masters, employee verification, generated letters, and compliance coverage."
        actions={
          <>
            {canViewDocuments ? <Link className="button button--primary" href="/hr-admin/document-categories">Open categories</Link> : null}
            {canViewDocuments ? <Link className="button button--secondary" href="/hr-admin/document-requirements">Open requirements</Link> : null}
            {canViewDocuments || canVerifyDocuments ? <Link className="button button--secondary" href="/hr-admin/employee-documents">Open employee documents</Link> : null}
            <Link className="button button--secondary" href="/hr-admin/generated-letters">Open generated letters</Link>
            <Link className="button button--secondary" href="/hr-admin">Back to admin workspace</Link>
          </>
        }
      />

      <section className="workspace-section" aria-label="Document control summary">
        <div className="attendance-summary-strip">
          <span><strong>{categoriesResult.data.length}</strong> categories</span>
          <span><strong>{requirementsResult.data.length}</strong> requirement rules</span>
          <span><strong>{employeeDocumentsResult.data.total_count}</strong> documents in queue</span>
          <span><strong>{generatedLettersResult.data.total_count}</strong> generated letters</span>
        </div>
      </section>

      <section className="workspace-section document-control-grid">
        <article className="workspace-data-panel">
          <div className="workspace-data-panel__header">
            <div>
              <h2 className="section-heading-soft">Document workspaces</h2>
              <p className="section-copy section-copy-soft">Open the focused setup, review, and letter queues.</p>
            </div>
          </div>
          <div className="workspace-table-scroll">
            <table className="workspace-table attendance-directory-table document-control-table" aria-label="Document control workspaces">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Scope</th>
                  <th>Records</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
          {canViewDocuments ? (
            <tr>
              <td className="workspace-table__primary-cell"><div><strong>Document categories</strong><span>Reusable document types and upload behavior.</span></div></td>
              <td>Taxonomy</td>
              <td><span className="workspace-table__secondary">{categoriesResult.data.length} configured / {categoriesResult.data.filter((item) => item.requires_verification).length} verification required</span></td>
              <td><Link className="button button--secondary button--compact" href="/hr-admin/document-categories">{canManageDocuments ? "Manage" : "View"}</Link></td>
            </tr>
          ) : null}
          {canViewDocuments ? (
            <tr>
              <td className="workspace-table__primary-cell"><div><strong>Document requirements</strong><span>Compliance rules by organization and employment context.</span></div></td>
              <td>Compliance</td>
              <td><span className="workspace-table__secondary">{requirementsResult.data.length} rules / {requirementsResult.data.filter((item) => item.is_mandatory).length} mandatory</span></td>
              <td><Link className="button button--secondary button--compact" href="/hr-admin/document-requirements">{canManageDocuments ? "Manage" : "View"}</Link></td>
            </tr>
          ) : null}
          <tr>
            <td className="workspace-table__primary-cell"><div><strong>Generated HR letters</strong><span>Issue downloadable employee letter artifacts.</span></div></td>
            <td>Letters</td>
            <td><span className="workspace-table__secondary">{generatedLettersResult.data.total_count} generated / {generatedLettersResult.data.items.filter((item) => item.artifact_id).length} downloadable</span></td>
            <td><Link className="button button--secondary button--compact" href="/hr-admin/generated-letters">Open</Link></td>
          </tr>
          <tr>
            <td className="workspace-table__primary-cell"><div><strong>Employee document review</strong><span>Verification queue, expiry tracking, and review actions.</span></div></td>
            <td>Operations</td>
            <td><span className="workspace-table__secondary">{employeeDocumentsResult.data.total_count} queued / {employeeDocumentsResult.data.items.length} visible</span></td>
            <td><Link className="button button--primary button--compact" href="/hr-admin/employee-documents">Open queue</Link></td>
          </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
