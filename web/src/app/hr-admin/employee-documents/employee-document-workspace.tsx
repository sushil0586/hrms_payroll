"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import type {
  HrAdminDocumentCategory,
  HrAdminDocumentOptions,
  HrAdminEmployeeDocument,
  HrAdminEmployeeDocumentListResponse,
  HrAdminEmployeeListItem,
} from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";
import { EmployeeDocumentQueue } from "./employee-document-queue";
import { EmployeeDocumentUploadForm } from "./employee-document-upload-form";

type Query = {
  q: string;
  verification_status: string;
  status: string;
  category_id: string;
  expiry_filter: string;
  page: number;
  page_size: number;
  reviewDocument: string;
  uploadDocument: string;
};

type Data = HrAdminEmployeeDocumentListResponse & {
  options: HrAdminDocumentOptions;
  reviewDocument: HrAdminEmployeeDocument | null;
  employees: HrAdminEmployeeListItem[] | null;
  uploadCategories: HrAdminDocumentCategory[] | null;
};

const subscribe = () => () => undefined;

function fromLocation(): Query {
  const params = new URLSearchParams(window.location.search);
  const positive = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  };
  return {
    q: params.get("q") || "",
    verification_status: params.get("verification_status") || "",
    status: params.get("status") || "",
    category_id: params.get("category_id") || "",
    expiry_filter: params.get("expiry_filter") || "",
    page: positive("page", 1),
    page_size: Math.min(positive("page_size", 25), 100),
    reviewDocument: params.get("reviewDocument") || "",
    uploadDocument: params.get("uploadDocument") || "",
  };
}

function href(query: Query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === "" || (key === "page" && value === 1) || (key === "page_size" && value === 25)) return;
    params.set(key, String(value));
  });
  return `/hr-admin/employee-documents${params.size ? `?${params}` : ""}`;
}

export function EmployeeDocumentWorkspace({ initialData, initialQuery, canVerifyDocuments, canExportDocuments, canManageDocuments, canUploadDocuments }: {
  initialData: Data;
  initialQuery: Query;
  canVerifyDocuments: boolean;
  canExportDocuments: boolean;
  canManageDocuments: boolean;
  canUploadDocuments: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [notice, setNotice] = useState("");
  const request = useCallback(async (query: Query, signal: AbortSignal) => {
    const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
    const response = await fetch(`/api/hr-admin/employee-documents/workspace?${params}`, { cache: "no-store", signal });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
    if (!response.ok || !Array.isArray((payload as Data).items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Employee document queue could not be updated.", response.status);
    return payload as Data;
  }, []);
  const resource = useScopedWorkspaceResource({
    initialData,
    initialQuery,
    request,
    resolveQuery: (query, data) => ({ ...query, page: data.page, page_size: data.page_size, reviewDocument: data.reviewDocument?.id ?? "" }),
    historyHref: (query) => href(query),
    readHistoryQuery: fromLocation,
    fallbackError: "Employee document queue could not be updated. The last confirmed queue is still shown.",
  });
  const query = resource.query;
  const filters = { q: query.q, verification_status: query.verification_status, status: query.status, category_id: query.category_id, expiry_filter: query.expiry_filter, page: query.page, page_size: query.page_size };
  const refresh = useCallback(async () => (await resource.load(query, "none")).ok, [query, resource]);
  const closeReview = useCallback(() => { void resource.load({ ...query, reviewDocument: "" }, "push"); }, [query, resource]);
  const reviewSaved = useCallback(async () => {
    const result = await resource.load({ ...query, reviewDocument: "" }, "replace");
    if (result.ok) setNotice("Document review updated.");
    return result.ok;
  }, [query, resource]);
  const closeUpload = useCallback(() => { void resource.load({ ...query, uploadDocument: "" }, "push"); }, [query, resource]);
  const stored = useCallback(async () => {
    const result = await resource.load(query, "none");
    if (result.ok) setNotice("Document uploaded and the queue was refreshed.");
    return result.ok;
  }, [query, resource]);
  const expiringOnPage = resource.data.items.filter((item) => item.is_expiring_soon).length;
  const expiredOnPage = resource.data.items.filter((item) => item.is_expired).length;

  return <div data-local-update-hydrated={hydrated ? "true" : "false"}>
    <div className="document-workspace-local-actions">
      {canUploadDocuments ? <button className="button button--primary" type="button" onClick={() => void resource.load({ ...query, uploadDocument: "create", reviewDocument: "" }, "push")}>Upload document</button> : null}
    </div>
    {resource.error ? <div className="notice notice--error" role="alert"><strong>Document update failed.</strong><span>{resource.error}</span><button className="button button--secondary button--compact" onClick={() => void resource.load(query, "none")} type="button">Retry</button></div> : null}
    <EmployeeDocumentQueue
      key={JSON.stringify(filters)}
      items={resource.data.items}
      verificationStatusOptions={resource.data.options.verification_statuses}
      recordStatusOptions={resource.data.options.employee_document_statuses}
      categories={resource.data.options.categories}
      currentFilters={filters}
      pagination={resource.data}
      canExportDocuments={canExportDocuments}
      canManageDocuments={canManageDocuments}
      canVerifyDocuments={canVerifyDocuments}
      documentOptions={resource.data.options}
      reviewDocument={resource.data.reviewDocument}
      initialActionNotice={notice}
      initialActionNoticeTitle="Document action complete."
      summary={{ categoriesConfigured: resource.data.options.categories.length, expiredOnPage, expiringOnPage }}
      pending={resource.isPending}
      onQuery={(next) => { setNotice(""); void resource.load({ ...query, ...next, reviewDocument: "", uploadDocument: "" }); }}
      onReview={(itemId) => { setNotice(""); void resource.load({ ...query, reviewDocument: itemId, uploadDocument: "" }, "push"); }}
      onCloseReview={closeReview}
      onReviewSaved={reviewSaved}
      onRefresh={refresh}
    />
    {query.uploadDocument === "create" && resource.data.employees && resource.data.uploadCategories ? <HrAdminActionModal
      className="document-upload-modal document-operations"
      closeHref={href({ ...query, uploadDocument: "" })}
      onClose={closeUpload}
      labelledBy="employee-document-upload-title"
      title="Upload employee document"
      description="Choose the employee and category, attach a file, and confirm storage."
    ><EmployeeDocumentUploadForm employees={resource.data.employees} categories={resource.data.uploadCategories} options={resource.data.options} onCancel={closeUpload} onStored={stored} /></HrAdminActionModal> : null}
  </div>;
}
