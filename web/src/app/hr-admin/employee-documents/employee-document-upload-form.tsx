"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { documentUploadSnapshot, useDocumentUploadDraft } from "@/lib/ui/use-document-upload-draft";

import { storedEmployeeDocument } from "@/lib/ui/document-upload-result";
import { FormSection } from "@/components/patterns/form-section";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { UploadProgressStatus } from "@/components/patterns/upload-progress";
import type { HrAdminDocumentCategory, HrAdminDocumentOptions, HrAdminEmployeeListItem, HrAdminEmployeeDocument } from "@/lib/types";
import { uploadFormData, type UploadProgress } from "@/lib/ui/upload-form-data";
import { hasFieldErrors, requireText, requireValue, validateDateNotFuture, validateDateOrder, validateUploadFile } from "@/lib/ui/validation";

type Props = {
  employees: HrAdminEmployeeListItem[];
  categories: HrAdminDocumentCategory[];
  options: HrAdminDocumentOptions;
};

type FormValue = {
  employee_id: string;
  category_id: string;
  title: string;
  document_number: string;
  issued_on: string;
  expires_on: string;
  file: File | null;
};

type FieldErrors = Partial<Record<keyof FormValue, string>>;

const INITIAL_VALUE: FormValue = {
  employee_id: "",
  category_id: "",
  title: "",
  document_number: "",
  issued_on: "",
  expires_on: "",
  file: null,
};

function formatFileSize(fileSizeBytes: number) {
  if (fileSizeBytes < 1024) return `${fileSizeBytes} B`;
  if (fileSizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
  }
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractErrors(payload: unknown): { message: string; fieldErrors: FieldErrors } {
  if (!payload || typeof payload !== "object") {
    return { message: "Unable to upload employee document.", fieldErrors: {} };
  }

  const record = payload as Record<string, unknown>;
  const fieldErrors: FieldErrors = {};

  Object.entries(record).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) {
      fieldErrors[key as keyof FormValue] = String(value[0]);
    } else if (typeof value === "string" && key !== "detail") {
      fieldErrors[key as keyof FormValue] = value;
    }
  });

  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) {
    return { message: firstFieldError, fieldErrors };
  }

  if ("detail" in record) {
    return { message: String(record.detail), fieldErrors };
  }

  return { message: "Unable to upload employee document.", fieldErrors };
}

export function EmployeeDocumentUploadForm({ employees, options, categories }: Props) {
  const [formValue, setFormValue] = useState<FormValue>(INITIAL_VALUE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [receipt, setReceipt] = useState<HrAdminEmployeeDocument | null>(null);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const guard = useDocumentUploadDraft(!receipt && documentUploadSnapshot(formValue) !== documentUploadSnapshot(INITIAL_VALUE), isSubmitting);
  const category = categories.find((item) => item.id === formValue.category_id);
  const acceptedMimes = category && typeof category.visibility_rules === "object" && category.visibility_rules !== null && Array.isArray(category.visibility_rules.accepted_mime_types) ? category.visibility_rules.accepted_mime_types.filter((value): value is string => typeof value === "string" && Boolean(value.trim())) : [];
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (receipt) receiptRef.current?.focus(); }, [receipt]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsHydrated(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const sortedEmployees = useMemo(
    () => [...employees].sort((left, right) => left.full_name.localeCompare(right.full_name)),
    [employees],
  );

  function update<Key extends keyof FormValue>(key: Key, value: FormValue[Key]) {
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    setFieldErrors({});
    const nextErrors: FieldErrors = {
      employee_id: requireValue(formValue.employee_id, "Select the employee before uploading."),
      category_id: requireValue(formValue.category_id, "Select the document category."),
      title: requireText(formValue.title, "Enter a document title."),
      issued_on: validateDateNotFuture(formValue.issued_on, "Issued on date cannot be in the future."),
      expires_on: (category?.requires_expiry_date ? requireValue(formValue.expires_on, "Enter the expiry date for this category.") : undefined) ?? validateDateOrder(formValue.issued_on, formValue.expires_on, "Expiry date cannot be earlier than issued on date."),
      file: validateUploadFile(formValue.file, {
        blockedTypeMessage: "Executable or script files are not allowed. Upload a PDF, image, or document file.",
        maxSizeBytes: options.max_upload_size_bytes,
        maxSizeMessage: `File is too large. Maximum upload size is ${formatFileSize(options.max_upload_size_bytes)}.`,
        requiredMessage: "Attach the employee document file.",
      }),
    };
    if (formValue.file && acceptedMimes.length && !acceptedMimes.map((type) => type.trim().toLowerCase()).includes(formValue.file.type.toLowerCase())) nextErrors.file = "This category accepts: " + acceptedMimes.join(", ") + ".";
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted document fields and try again.");
      return;
    }
    inFlight.current = true;
    setIsSubmitting(true);
    setUploadProgress({ loaded: 0, total: formValue.file?.size ?? null });

    const body = new FormData();
    body.set("employee_id", formValue.employee_id);
    body.set("category_id", formValue.category_id);
    body.set("title", formValue.title);
    body.set("document_number", formValue.document_number);
    if (formValue.issued_on) body.set("issued_on", formValue.issued_on);
    if (formValue.expires_on) body.set("expires_on", formValue.expires_on);
    if (formValue.file) body.set("file", formValue.file);

    try {
      const response = await uploadFormData("/api/hr-admin/employee-documents", body, { onProgress: setUploadProgress });
      if (!response.ok) {
        const nextErrors = extractErrors(response.payload);
        setError(response.status >= 500 ? "Upload outcome could not be confirmed. Check document history before retrying; your draft is retained." : nextErrors.message);
        setFieldErrors(nextErrors.fieldErrors);
        return;
      }
      const stored = storedEmployeeDocument(response.payload);
      if (!stored) throw new Error("Unconfirmed storage acknowledgement");
      setReceipt(stored);
    } catch {
      setError("Upload outcome could not be confirmed. Check document history before retrying; your draft is retained.");
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  }

  if (receipt) return <div ref={receiptRef} tabIndex={-1} role="status" className="workspace-standard-panel document-upload-receipt">
    <h2>Document stored</h2><p>{receipt.title} — {receipt.file_name} · v{receipt.version_number}</p>
    <p>{receipt.verification_status === "verified" ? "Accepted automatically by the category policy." : "Submitted for HR verification."}</p>
    <a data-navigation-mode="document" className="button button--primary" href="/hr-admin/employee-documents">View document queue</a>
  </div>;

  return (
    <form ref={formRef} className="section form-layout-modern document-child-form document-upload-form" data-hydrated={isHydrated ? "true" : "false"} noValidate onFocusCapture={(event) => {
      const target = event.target as HTMLElement;
      const footer = formRef.current?.querySelector(".form-actions-bar");
      if (footer && !footer.contains(target) && target.getBoundingClientRect().bottom > footer.getBoundingClientRect().top) target.scrollIntoView({block:"center"});
    }} onSubmit={handleSubmit}>
      <fieldset disabled={!isHydrated || isSubmitting} className="form-shell-card">
        <FormSection
          description={`Select ownership before choosing the file. Maximum file size: ${formatFileSize(options.max_upload_size_bytes)}.`}
          title="Employee and evidence"
        >
          <div className="form-grid">
            <div className="form-field">
              <label className="muted" htmlFor="hr-upload-1">Employee</label>
              <select id="hr-upload-1" aria-invalid={Boolean(fieldErrors.employee_id)} aria-describedby={fieldErrors.employee_id ? "hr-upload-1-error" : undefined} className="input-control" required value={formValue.employee_id} onChange={(event) => update("employee_id", event.target.value)}>
                <option value="">Select employee</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_code})
                  </option>
                ))}
              </select>
              {fieldErrors.employee_id ? <span id="hr-upload-1-error" className="field-error-text">{fieldErrors.employee_id}</span> : null}
            </div>

            <div className="form-field">
              <label className="muted" htmlFor="hr-upload-2">Category</label>
              <select id="hr-upload-2" aria-invalid={Boolean(fieldErrors.category_id)} aria-describedby={fieldErrors.category_id ? "hr-upload-2-error" : undefined} className="input-control" required value={formValue.category_id} onChange={(event) => update("category_id", event.target.value)}>
                <option value="">Select category</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category_id ? <span id="hr-upload-2-error" className="field-error-text">{fieldErrors.category_id}</span> : null}
            </div>

            <div className="form-field">
              <label className="muted" htmlFor="hr-upload-3">Title</label>
              <input id="hr-upload-3" aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "hr-upload-3-error" : undefined} className="input-control" required maxLength={255} value={formValue.title} onChange={(event) => update("title", event.target.value)} />
              {fieldErrors.title ? <span id="hr-upload-3-error" className="field-error-text">{fieldErrors.title}</span> : null}
            </div>

            <div className="form-field">
              <label className="muted" htmlFor="hr-upload-4">Document number</label>
              <input id="hr-upload-4" className="input-control" maxLength={120} value={formValue.document_number} onChange={(event) => update("document_number", event.target.value)} />
              {fieldErrors.document_number ? <span id="hr-upload-4-error" className="field-error-text">{fieldErrors.document_number}</span> : null}
            </div>

            <div className="form-field">
              <label className="muted" htmlFor="hr-upload-5">Issued on</label>
              <input id="hr-upload-5" aria-invalid={Boolean(fieldErrors.issued_on)} aria-describedby={fieldErrors.issued_on ? "hr-upload-5-error" : undefined} className="input-control" type="date" value={formValue.issued_on} onChange={(event) => update("issued_on", event.target.value)} />
              {fieldErrors.issued_on ? <span id="hr-upload-5-error" className="field-error-text">{fieldErrors.issued_on}</span> : null}
            </div>

            <div className="form-field">
              <label className="muted" htmlFor="hr-upload-6">Expires on</label>
              <input id="hr-upload-6" aria-invalid={Boolean(fieldErrors.expires_on)} aria-describedby={fieldErrors.expires_on ? "hr-upload-6-error" : undefined} className="input-control" required={Boolean(category?.requires_expiry_date)} type="date" value={formValue.expires_on} onChange={(event) => update("expires_on", event.target.value)} />
              {fieldErrors.expires_on ? <span id="hr-upload-6-error" className="field-error-text">{fieldErrors.expires_on}</span> : null}
            </div>

            <div className="form-field form-field--full">
              <label className="muted" htmlFor="hr-upload-7">File</label>
              <input id="hr-upload-7"
                accept={acceptedMimes.length ? acceptedMimes.join(",") : undefined}
                disabled={!formValue.employee_id || !formValue.category_id}
                className="input-control"
                required
                type="file"
                aria-invalid={Boolean(fieldErrors.file)} aria-describedby={fieldErrors.file ? "hr-upload-7-error" : undefined}
                onChange={(event) => update("file", event.target.files?.[0] ?? null)}
              />
              <span className="field-help-text">{acceptedMimes.length ? `Category types: ${acceptedMimes.join(", ")}.` : "The server checks category and storage rules on submission."} {category?.requires_expiry_date ? "Expiry date is required." : ""} {category?.allow_multiple_files ? "Multiple active files are permitted." : "An existing active file may require replacement; returned files may be replaced automatically."}</span>
              {formValue.file ? <span className="field-help-text">Selected: {formValue.file.name} · {formatFileSize(formValue.file.size)}</span> : null}
              {fieldErrors.file ? <span id="hr-upload-7-error" className="field-error-text">{fieldErrors.file}</span> : null}
            </div>
          </div>
        </FormSection>

      </fieldset>
        {error ? (
          <div ref={errorRef} tabIndex={-1} className="notice notice--error" role="alert">
            <strong>Review before continuing.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}
        <UploadProgressStatus awaitingConfirmation progress={uploadProgress} />

        <div className="form-actions-bar">
          <span className="muted">A receipt appears only after the server confirms storage.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--secondary" disabled={isSubmitting} onClick={() => guard.cancel("/hr-admin/employee-documents")} type="button">
              Cancel
            </button>
            <AsyncActionButton className="button button--primary" pending={isSubmitting} pendingLabel="Uploading document" type="submit">
              Upload document
            </AsyncActionButton>
          </div>
        </div>
    </form>
  );
}
