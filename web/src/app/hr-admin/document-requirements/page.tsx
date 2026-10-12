import Link from "next/link";

import { createEmptyDocumentRequirementValue, documentRequirementToFormValue } from "@/app/hr-admin/document-requirements/form-values";
import { DocumentRequirementForm } from "@/app/hr-admin/document-requirements/document-requirement-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PageIntro } from "@/components/patterns/page-intro";
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
  const closeHref = "/hr-admin/document-requirements";

  return (
    <main className="shell hr-document-workbench">
      <PageIntro
        actions={
          <>
            {canManageDocuments ? <Link className="button button--primary" href="/hr-admin/document-requirements?requirementModal=create">Create requirement</Link> : null}
            <Link className="button button--secondary" href="/hr-admin/documents">Back to documents</Link>
          </>
        }
        description="Define where documents are mandatory across org structure and employee context."
        eyebrow={result.state === "live" ? "Live document mode" : "Demo document mode"}
        pills={[`${result.data.length} requirement rules`]}
        title="Document requirements"
      />

      <section className="workspace-section" aria-label="Document requirement summary">
        <div className="attendance-summary-strip">
          <span><strong>{result.data.length}</strong> requirement rules</span>
          <span><strong>{result.data.filter((item) => item.is_mandatory).length}</strong> mandatory</span>
          <span><strong>{result.data.reduce((sum, item) => sum + item.priority, 0)}</strong> priority total</span>
        </div>
      </section>

      <section className="workspace-section queue-review-split">
        <article className="workspace-data-panel record-card document-directory-panel">
          <div className="workspace-data-panel__header">
            <div>
              <h2 className="section-heading-soft">Requirement register</h2>
              <p className="section-copy section-copy-soft">Define mandatory document rules by employee scope.</p>
            </div>
          </div>
          <div className="workspace-table-scroll">
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
                          <Link className="button button--secondary button--compact" href={`/hr-admin/document-requirements?selectedRequirement=${item.id}`}>Inspect</Link>
                          {canManageDocuments ? <Link className="button button--ghost button--compact" href={`/hr-admin/document-requirements?editRequirement=${item.id}`}>Edit</Link> : null}
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
          </div>
        </article>
        {selected ? (
          <article className="record-card panel-card-soft employee-detail-drawer document-detail-drawer">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title"><h3>{selected.category_name}</h3><p>{scopeLabel(selected)}</p></div>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary button--compact" href={closeHref}>Close</Link>
                {canManageDocuments ? <Link className="button button--primary button--compact" href={`/hr-admin/document-requirements?editRequirement=${selected.id}`}>Edit</Link> : null}
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
        <HrAdminActionModal
          closeHref={closeHref}
          description="Scope a document requirement by organization and employment context."
          eyebrow={optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
          labelledBy="document-requirement-create-modal"
          title="Create document requirement"
        >
          <DocumentRequirementForm compact initialValue={createEmptyDocumentRequirementValue()} mode="create" options={optionsResult.data} returnPath={closeHref} />
        </HrAdminActionModal>
      ) : null}

      {editItem && canManageDocuments ? (
        <HrAdminActionModal
          closeHref={closeHref}
          description="Adjust the organizational scope and due timing for this required document rule."
          eyebrow={optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
          labelledBy={`document-requirement-edit-modal-${editItem.id}`}
          title={`Edit ${editItem.category_name}`}
        >
          <DocumentRequirementForm compact initialValue={documentRequirementToFormValue(editItem)} itemId={editItem.id} mode="edit" options={optionsResult.data} returnPath={closeHref} />
        </HrAdminActionModal>
      ) : null}
    </main>
  );
}
