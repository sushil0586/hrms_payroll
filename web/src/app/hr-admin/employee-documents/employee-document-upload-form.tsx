"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminDocumentOptions, HrAdminEmployeeListItem } from "@/lib/types";

type Props = {
  employees: HrAdminEmployeeListItem[];
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

export function EmployeeDocumentUploadForm({ employees, options }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState<FormValue>(INITIAL_VALUE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    const body = new FormData();
    body.set("employee_id", formValue.employee_id);
    body.set("category_id", formValue.category_id);
    body.set("title", formValue.title);
    body.set("document_number", formValue.document_number);
    if (formValue.issued_on) body.set("issued_on", formValue.issued_on);
    if (formValue.expires_on) body.set("expires_on", formValue.expires_on);
    if (formValue.file) body.set("file", formValue.file);

    const response = await fetch("/api/hr-admin/employee-documents", {
      method: "POST",
      body,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const nextErrors = extractErrors(payload);
      setError(nextErrors.message);
      setFieldErrors(nextErrors.fieldErrors);
      setIsSubmitting(false);
      return;
    }

    router.push("/hr-admin/employee-documents");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__intro">
          <h2>Employee document upload</h2>
          <p className="section-copy">
            Add a new employee artifact with structured metadata so review, expiry tracking, and verification start from a clean record.
          </p>
        </div>

        <FormSection
          description={`Upload a compliant file and attach it to the correct employee and category. Maximum file size: ${formatFileSize(options.max_upload_size_bytes)}.`}
          title="Upload details"
        >
          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Employee</span>
              <select className="input-control" required value={formValue.employee_id} onChange={(event) => update("employee_id", event.target.value)}>
                <option value="">Select employee</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_code})
                  </option>
                ))}
              </select>
              {fieldErrors.employee_id ? <span className="muted">{fieldErrors.employee_id}</span> : null}
            </label>

            <label className="form-field">
              <span className="muted">Category</span>
              <select className="input-control" required value={formValue.category_id} onChange={(event) => update("category_id", event.target.value)}>
                <option value="">Select category</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category_id ? <span className="muted">{fieldErrors.category_id}</span> : null}
            </label>

            <label className="form-field">
              <span className="muted">Title</span>
              <input className="input-control" required value={formValue.title} onChange={(event) => update("title", event.target.value)} />
              {fieldErrors.title ? <span className="muted">{fieldErrors.title}</span> : null}
            </label>

            <label className="form-field">
              <span className="muted">Document number</span>
              <input className="input-control" value={formValue.document_number} onChange={(event) => update("document_number", event.target.value)} />
              {fieldErrors.document_number ? <span className="muted">{fieldErrors.document_number}</span> : null}
            </label>

            <label className="form-field">
              <span className="muted">Issued on</span>
              <input className="input-control" type="date" value={formValue.issued_on} onChange={(event) => update("issued_on", event.target.value)} />
              {fieldErrors.issued_on ? <span className="muted">{fieldErrors.issued_on}</span> : null}
            </label>

            <label className="form-field">
              <span className="muted">Expires on</span>
              <input className="input-control" type="date" value={formValue.expires_on} onChange={(event) => update("expires_on", event.target.value)} />
              {fieldErrors.expires_on ? <span className="muted">{fieldErrors.expires_on}</span> : null}
            </label>

            <label className="form-field form-field--full">
              <span className="muted">File</span>
              <input
                className="input-control"
                required
                type="file"
                onChange={(event) => update("file", event.target.files?.[0] ?? null)}
              />
              <span className="muted">Supported validation comes from the category and backend storage policy.</span>
              {fieldErrors.file ? <span className="muted">{fieldErrors.file}</span> : null}
            </label>
          </div>
        </FormSection>

        {error ? (
          <div className="notice">
            <strong>Upload failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}

        <div className="form-shell-card__actions">
          <button className="button button--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Uploading..." : "Upload document"}
          </button>
          <button className="button button--secondary" onClick={() => router.push("/hr-admin/employee-documents")} type="button">
            Cancel
          </button>
        </div>
      </section>
    </form>
  );
}
