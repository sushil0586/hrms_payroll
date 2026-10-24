import { DocumentAccessNotice } from "@/app/hr-admin/documents/document-access-notice";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";

import { createEmptyDocumentRequirementValue, documentRequirementToFormValue } from "@/app/hr-admin/document-requirements/form-values";
import { DocumentRequirementForm } from "@/app/hr-admin/document-requirements/document-requirement-form";
import { DocumentSetupDialog } from "@/app/hr-admin/documents/document-setup-dialog";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentOptions, getHrAdminDocumentRequirements } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function scopeLabel(item: Awaited<ReturnType<typeof getHrAdminDocumentRequirements>>["data"][number]) {
  const scopes = [
    item.legal_entity,
    item.branch,
    item.department,
    item.grade,
    item.employment_type,
  ].filter(Boolean);
  return scopes.length ? scopes.join(" • ") : "Applies to all employees";
}

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminDocumentRequirementsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const createModal = normalizeParam(currentParams.requirementModal) === "create";
  const selectedRequirementId = normalizeParam(currentParams.selectedRequirement);
  const editRequirementId = normalizeParam(currentParams.editRequirement);
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.view", "documents.manage"],
    fallbackPath: "/hr-admin/documents",
  });
  if (!sessionHasPermission(sessionUser, "documents.view")) return <DocumentAccessNotice />;
  const canManageDocuments = sessionHasPermission(sessionUser, "documents.manage");
  const [result, optionsResult] = await Promise.all([
    getHrAdminDocumentRequirements(),
    getHrAdminDocumentOptions(),
  ]);
  const selected = selectedRequirementId
    ? result.data.find((item) => item.id === selectedRequirementId) ?? null
    : editRequirementId
      ? result.data.find((item) => item.id === editRequirementId) ?? null
      : null;
  const editItem = editRequirementId ? result.data.find((item) => item.id === editRequirementId) : null;
  const closeHref = selectedRequirementId ? `/hr-admin/document-requirements?selectedRequirement=${encodeURIComponent(selectedRequirementId)}` : "/hr-admin/document-requirements";

  return (
    <main className="shell hr-document-workbench accerio-page document-operations document-setup-page">
      <WorkspaceStandardHeader
        actions={
          <>
            {canManageDocuments ? <a data-navigation-mode="document" className="button button--primary" href="/hr-admin/document-requirements?requirementModal=create">Create requirement</a> : null}
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/documents">Back to documents</a>
          </>
        }
        description="Define where documents are mandatory across org structure and employee context."
        title="Document requirements"
      />

      {normalizeParam(currentParams.setup_saved) === "1" ? <div className="notice notice--success" role="status">Setup saved. The register reflects the confirmed changes.</div> : null}
      <section className="workspace-section" aria-label="Document requirement summary">
        <div className="attendance-summary-strip">
          <span><strong>{result.data.length}</strong> requirement rules</span>
          <span><strong>{result.data.filter((item) => item.is_mandatory).length}</strong> mandatory</span>
          <span><strong>{result.data.filter((item) => item.is_active).length}</strong> active rules</span>
        </div>
      </section>

      <section className={`workspace-section${selected ? " queue-review-split" : ""}`}>
        <article className="workspace-data-panel record-card document-directory-panel">
          <div className="workspace-data-panel__header">
            <div>
              <h2 className="section-heading-soft">Requirement register</h2>
              <p className="section-copy section-copy-soft">Define mandatory document rules by employee scope.</p>
            </div>
          </div>
          <WorkspaceTableScrollRegion label="Document requirements scroll region" className="workspace-table-scroll workspace-table-region">
            {result.data.length ? (
              <table className="workspace-table attendance-directory-table document-control-table" aria-label="Document requirements">
                <thead>
                  <tr>
                    <th>Requirement</th>
                    <th>Scope</th>
                    <th>State</th>
                    <th>Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((item) => (
                    <tr className={selected?.id === item.id ? "is-selected" : ""} key={item.id}>
                      <td className="workspace-table__primary-cell"><div><strong>{item.category_name}</strong><span>Priority {item.priority}</span></div></td>
                      <td><span className="workspace-table__secondary">{scopeLabel(item)}</span></td>
                      <td>
                        <div className="document-table-badges">
                          <WorkspaceStatusBadge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge>
                          <WorkspaceStatusBadge tone={item.is_mandatory ? "warning" : "info"}>{item.is_mandatory ? "Mandatory" : "Optional"}</WorkspaceStatusBadge>
                        </div>
                      </td>
                      <td>{item.required_within_days_of_joining} day(s)</td>
                      <td>
                        <div className="table-actions">
                          <a data-navigation-mode="document" className="button button--secondary button--compact" href={`/hr-admin/document-requirements?selectedRequirement=${item.id}`}>Inspect</a>
                          {canManageDocuments ? <a data-navigation-mode="document" className="button button--ghost button--compact" href={`/hr-admin/document-requirements?editRequirement=${item.id}`}>Edit</a> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <strong>No document requirements configured.</strong>
                <span className="muted">Create rules to make categories visible as required or optional in ESS.</span>
              </div>
            )}
          </WorkspaceTableScrollRegion>
        </article>
        {selected ? (
          <article className="record-card panel-card-soft employee-detail-drawer document-detail-drawer">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title"><h3>{selected.category_name}</h3><p>{scopeLabel(selected)}</p></div>
              </div>
              <div className="record-card__actions">
                <a data-navigation-mode="document" className="button button--secondary button--compact" href={closeHref}>Close</a>
                {canManageDocuments ? <a data-navigation-mode="document" className="button button--primary button--compact" href={`/hr-admin/document-requirements?selectedRequirement=${selected.id}&editRequirement=${selected.id}`}>Edit</a> : null}
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Legal entity</span><span className="detail-value">{selected.legal_entity || "All"}</span></div>
              <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{selected.branch || "All"}</span></div>
              <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{selected.department || "All"}</span></div>
              <div className="detail-row"><span className="detail-label">Grade</span><span className="detail-value">{selected.grade || "All"}</span></div>
              <div className="detail-row"><span className="detail-label">Employment type</span><span className="detail-value">{selected.employment_type || "All"}</span></div>
              <div className="detail-row"><span className="detail-label">Due window</span><span className="detail-value">{selected.required_within_days_of_joining} day(s)</span></div>
            </div>
          </article>
        ) : null}
      </section>

      {createModal && canManageDocuments ? (
        <DocumentSetupDialog
          closeHref={closeHref}
          description="Scope a document requirement by organization and employment context."
            labelledBy="document-requirement-create-modal"
          title="Create document requirement"
        >
          <DocumentRequirementForm compact initialValue={createEmptyDocumentRequirementValue()} mode="create" options={optionsResult.data} returnPath={closeHref} />
        </DocumentSetupDialog>
      ) : null}

      {editItem && canManageDocuments ? (
        <DocumentSetupDialog
          closeHref={closeHref}
          description="Adjust the organizational scope and due timing for this required document rule."
            labelledBy={`document-requirement-edit-modal-${editItem.id}`}
          title={`Edit ${editItem.category_name}`}
        >
          <DocumentRequirementForm compact initialValue={documentRequirementToFormValue(editItem)} itemId={editItem.id} mode="edit" options={optionsResult.data} returnPath={closeHref} />
        </DocumentSetupDialog>
      ) : null}
    </main>
  );
}
