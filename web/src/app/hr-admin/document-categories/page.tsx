import Link from "next/link";

import { createEmptyDocumentCategoryValue, documentCategoryToFormValue } from "@/app/hr-admin/document-categories/form-values";
import { DocumentCategoryForm } from "@/app/hr-admin/document-categories/document-category-form";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { getHrAdminDocumentCategories, getHrAdminDocumentOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function humanizeStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function categoryReviewLabel(item: Awaited<ReturnType<typeof getHrAdminDocumentCategories>>["data"][number]) {
  const flags = [];
  if (item.requires_verification) flags.push("Verification");
  if (item.requires_expiry_date) flags.push("Expiry");
  if (item.allow_employee_upload) flags.push("ESS upload");
  if (item.allow_multiple_files) flags.push("Multiple files");
  return flags.length ? flags.join(", ") : "HR maintained";
}

export default async function HrAdminDocumentCategoriesPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const createModal = normalizeParam(currentParams.categoryModal) === "create";
  const selectedCategoryId = normalizeParam(currentParams.selectedCategory);
  const editCategoryId = normalizeParam(currentParams.editCategory);
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["documents.view", "documents.manage"],
    fallbackPath: "/hr-admin/documents",
  });
  const canManageDocuments = sessionHasPermission(sessionUser, "documents.manage");
  const [result, optionsResult] = await Promise.all([
    getHrAdminDocumentCategories(),
    getHrAdminDocumentOptions(),
  ]);
  const selected = selectedCategoryId
    ? result.data.find((item) => item.id === selectedCategoryId) ?? null
    : editCategoryId
      ? result.data.find((item) => item.id === editCategoryId) ?? null
      : null;
  const editItem = editCategoryId ? result.data.find((item) => item.id === editCategoryId) : null;
  const closeHref = "/hr-admin/document-categories";

  return (
    <main className="shell hr-document-workbench">
      <PageIntro
        actions={
          <>
            {canManageDocuments ? <Link className="button button--primary" href="/hr-admin/document-categories?categoryModal=create">Create category</Link> : null}
            <Link className="button button--secondary" href="/hr-admin/documents">Back to documents</Link>
          </>
        }
        description="Maintain reusable document types, upload behavior, and verification rules."
        eyebrow={result.state === "live" ? "Live document mode" : "Demo document mode"}
        pills={[`${result.data.length} categories`]}
        title="Document categories"
      />

      <section className="workspace-section" aria-label="Document category summary">
        <div className="attendance-summary-strip">
          <span><strong>{result.data.length}</strong> categories</span>
          <span><strong>{result.data.filter((item) => item.requires_verification).length}</strong> verification required</span>
          <span><strong>{result.data.filter((item) => item.allow_employee_upload).length}</strong> employee upload enabled</span>
        </div>
      </section>

      <section className="workspace-section queue-review-split">
        <article className="workspace-data-panel record-card document-directory-panel">
          <div className="workspace-data-panel__header">
            <div>
              <h2 className="section-heading-soft">Category register</h2>
              <p className="section-copy section-copy-soft">Manage reusable document types and upload behavior.</p>
            </div>
          </div>
          <div className="workspace-table-scroll">
            {result.data.length ? (
              <table className="workspace-table attendance-directory-table document-control-table" aria-label="Document categories">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Rules</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((item) => (
                    <tr className={selected?.id === item.id ? "is-selected" : ""} key={item.id}>
                      <td className="workspace-table__primary-cell"><div><strong>{item.name}</strong><span>{item.code} - {item.description || "No description provided."}</span></div></td>
                      <td>{humanizeStatus(item.category_type)}</td>
                      <td><WorkspaceStatusBadge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</WorkspaceStatusBadge></td>
                      <td><span className="workspace-table__secondary">{categoryReviewLabel(item)}</span></td>
                      <td>
                        <div className="table-actions">
                          <Link className="button button--secondary button--compact" href={`/hr-admin/document-categories?selectedCategory=${item.id}`}>Inspect</Link>
                          {canManageDocuments ? <Link className="button button--ghost button--compact" href={`/hr-admin/document-categories?editCategory=${item.id}`}>Edit</Link> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <strong>No document categories configured.</strong>
                <span className="muted">Create a category before defining requirements or accepting uploads.</span>
              </div>
            )}
          </div>
        </article>
        {selected ? (
          <article className="record-card panel-card-soft employee-detail-drawer document-detail-drawer">
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title"><h3>{selected.name}</h3><p>{selected.code} - {humanizeStatus(selected.category_type)}</p></div>
              </div>
              <div className="record-card__actions">
                <Link className="button button--secondary button--compact" href={closeHref}>Close</Link>
                {canManageDocuments ? <Link className="button button--primary button--compact" href={`/hr-admin/document-categories?editCategory=${selected.id}`}>Edit</Link> : null}
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Code</span><span className="detail-value">{selected.code}</span></div>
              <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{selected.is_active ? "Active" : "Inactive"}</span></div>
              <div className="detail-row"><span className="detail-label">Verification</span><span className="detail-value">{selected.requires_verification ? "Required" : "Not required"}</span></div>
              <div className="detail-row"><span className="detail-label">Upload mode</span><span className="detail-value">{selected.allow_employee_upload ? "Employee upload" : "HR only"}</span></div>
              <div className="detail-row"><span className="detail-label">Expiry</span><span className="detail-value">{selected.requires_expiry_date ? "Expiry required" : "Expiry optional"}</span></div>
              <div className="detail-row"><span className="detail-label">Files</span><span className="detail-value">{selected.allow_multiple_files ? "Multiple allowed" : "Single active file"}</span></div>
            </div>
          </article>
        ) : null}
      </section>

      {createModal && canManageDocuments ? (
        <HrAdminActionModal
          closeHref={closeHref}
          description="Create a reusable document type with upload, verification, and expiry behavior."
          eyebrow={optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
          labelledBy="document-category-create-modal"
          title="Create document category"
        >
          <DocumentCategoryForm compact initialValue={createEmptyDocumentCategoryValue(optionsResult.data.document_category_types[0]?.value)} mode="create" options={optionsResult.data} returnPath={closeHref} />
        </HrAdminActionModal>
      ) : null}

      {editItem && canManageDocuments ? (
        <HrAdminActionModal
          closeHref={closeHref}
          description="Update behavior, validation, and upload expectations for this category."
          eyebrow={optionsResult.state === "live" ? "Live document mode" : "Demo document mode"}
          labelledBy={`document-category-edit-modal-${editItem.id}`}
          title={`Edit ${editItem.name}`}
        >
          <DocumentCategoryForm compact initialValue={documentCategoryToFormValue(editItem)} itemId={editItem.id} mode="edit" options={optionsResult.data} returnPath={closeHref} />
        </HrAdminActionModal>
      ) : null}
    </main>
  );
}
