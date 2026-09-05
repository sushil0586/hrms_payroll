import type { HrAdminEmployeeDocument, HrAdminEmployeeDocumentWriteInput } from "@/lib/types";

export function employeeDocumentToFormValue(item: HrAdminEmployeeDocument): HrAdminEmployeeDocumentWriteInput {
  return {
    title: item.title,
    status: item.status,
    verification_status: item.verification_status,
    document_number: item.document_number,
    issued_on: item.issued_on,
    expires_on: item.expires_on,
    rejection_reason: item.rejection_reason,
    reupload_requested: item.reupload_requested,
  };
}
