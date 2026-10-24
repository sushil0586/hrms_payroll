"use client";
import { useState } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { EmployeeDocumentReviewForm } from "./employee-document-review-form";
import { employeeDocumentToFormValue } from "./form-values";
import type { HrAdminDocumentOptions, HrAdminEmployeeDocument } from "@/lib/types";

export function DocumentReviewDialog({ document, options, cancelHref, successHref, canDownload }: { document: HrAdminEmployeeDocument; options: HrAdminDocumentOptions; cancelHref: string; successHref: string; canDownload: boolean }) {
  const [guard, setGuard] = useState({ busy: false, dirty: false });
  return <HrAdminActionModal className="document-review-modal document-operations" busy={guard.busy} dirty={guard.dirty} closeHref={cancelHref} labelledBy="document-review-modal-title" title={`Review ${document.title}`} description="Check the evidence and record the employee-facing outcome.">
    <EmployeeDocumentReviewForm compact document={document} initialValue={employeeDocumentToFormValue(document)} itemId={document.id} options={options} cancelHref={cancelHref} successHref={successHref} canDownload={canDownload} onStateChange={setGuard} />
  </HrAdminActionModal>;
}
