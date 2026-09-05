"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import { employeeAccessDetailToFormValue } from "@/app/hr-admin/employees/[employeeId]/access/form-values";
import type {
  HrAdminEmployeeAccessDetail,
  HrAdminEmployeeAccessOptions,
  HrAdminEmployeeAccessWriteInput,
} from "@/lib/types";

type AccessFormProps = {
  employeeId: string;
  initialValue: HrAdminEmployeeAccessWriteInput;
  options: HrAdminEmployeeAccessOptions;
  existingAccess: boolean;
  employeeStatus: string;
};

type AccessFieldErrors = Partial<Record<keyof HrAdminEmployeeAccessWriteInput, string>>;

function extractErrors(payload: unknown): { message: string; fieldErrors: AccessFieldErrors } {
  if (!payload || typeof payload !== "object") {
    return { message: "Unable to save employee access.", fieldErrors: {} };
  }

  const record = payload as Record<string, unknown>;
  const fieldErrors: AccessFieldErrors = {};

  Object.entries(record).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) {
      fieldErrors[key as keyof HrAdminEmployeeAccessWriteInput] = String(value[0]);
    } else if (typeof value === "string" && key !== "detail") {
      fieldErrors[key as keyof HrAdminEmployeeAccessWriteInput] = value;
    }
  });

  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) {
    return { message: firstFieldError, fieldErrors };
  }

  if ("detail" in record) {
    return { message: String(record.detail), fieldErrors };
  }

  return { message: "Unable to save employee access.", fieldErrors };
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="muted">{message}</span> : null;
}

export function EmployeeAccessForm({ employeeId, initialValue, options, existingAccess, employeeStatus }: AccessFormProps) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AccessFieldErrors>({});
  const [successNotice, setSuccessNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSelectedRoles = formValue.role_ids.length > 0;
  const employeeBlocksActiveAccess = ["inactive", "exited"].includes(employeeStatus);
  const hasActiveAccessSelection = formValue.is_user_active || formValue.membership_status === "active";
  const offboardingMembershipStatus = employeeStatus === "exited" ? "revoked" : "suspended";

  function updateField<Key extends keyof HrAdminEmployeeAccessWriteInput>(key: Key, value: HrAdminEmployeeAccessWriteInput[Key]) {
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(roleId: string) {
    setFormValue((current) => {
      const roleIds = current.role_ids.includes(roleId)
        ? current.role_ids.filter((item) => item !== roleId)
        : [...current.role_ids, roleId];
      return { ...current, role_ids: roleIds };
    });
  }

  function applyOffboardingSafeDefaults() {
    setFormValue((current) => ({
      ...current,
      is_user_active: false,
      membership_status: offboardingMembershipStatus,
      must_change_password: true,
    }));
    setError("");
    setFieldErrors({});
    setSuccessNotice("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessNotice("");
    setIsSubmitting(true);

    const response = await fetch(`/api/hr-admin/employees/${employeeId}/access`, {
      method: existingAccess ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formValue),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const nextErrors = extractErrors(payload);
      setError(nextErrors.message);
      setFieldErrors(nextErrors.fieldErrors);
      setIsSubmitting(false);
      return;
    }

    const generatedPassword =
      typeof payload.generated_password === "string" && payload.generated_password
        ? ` Temporary password: ${payload.generated_password}`
        : "";
    setSuccessNotice(`Employee access saved successfully.${generatedPassword}`);
    setFormValue(employeeAccessDetailToFormValue(payload as HrAdminEmployeeAccessDetail));
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{existingAccess ? "Update user access" : "Provision user access"}</h2>
            <p className="section-copy">
              Link this employee to login credentials, tenant membership, and role-based access so they can use ESS or MSS.
            </p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip">
              <strong>{existingAccess ? "Existing" : "New"}</strong> access state
            </span>
            <span className="queue-summary-chip">
              <strong>{formValue.role_ids.length}</strong> selected roles
            </span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection
            title="Identity and membership"
            description="Set the core login identity and membership state that determines whether the employee can enter the tenant."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Username</span>
                <input className="input-control" required value={formValue.username} onChange={(event) => updateField("username", event.target.value)} />
                <FieldError message={fieldErrors.username} />
              </label>
              <label className="form-field">
                <span className="muted">Email</span>
                <input className="input-control" required type="email" value={formValue.email} onChange={(event) => updateField("email", event.target.value)} />
                <FieldError message={fieldErrors.email} />
              </label>
              <label className="form-field">
                <span className="muted">First name</span>
                <input className="input-control" value={formValue.first_name} onChange={(event) => updateField("first_name", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Last name</span>
                <input className="input-control" value={formValue.last_name} onChange={(event) => updateField("last_name", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Display name</span>
                <input className="input-control" value={formValue.display_name} onChange={(event) => updateField("display_name", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Phone number</span>
                <input className="input-control" value={formValue.phone_number} onChange={(event) => updateField("phone_number", event.target.value)} />
              </label>
              <label className="form-field">
                <span className="muted">Membership status</span>
                <select className="input-control" value={formValue.membership_status} onChange={(event) => updateField("membership_status", event.target.value)}>
                  {options.membership_statuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {employeeBlocksActiveAccess ? (
                  <span className="muted">Recommended for offboarding: {offboardingMembershipStatus} membership with user access turned off.</span>
                ) : null}
                <FieldError message={fieldErrors.membership_status} />
              </label>
              <label className="form-field">
                <span className="muted">Temporary password</span>
                <input
                  className="input-control"
                  type="text"
                  value={formValue.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder={existingAccess ? "Leave blank to keep current password" : "Leave blank to auto-generate"}
                />
                <FieldError message={fieldErrors.password} />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Access controls"
            description="These switches define whether the user is active, whether the first login is safe, and how membership resolves."
          >
            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>User active</strong>
                  <p className="section-copy">Allow this user to sign in and receive routed tasks.</p>
                </div>
                <input checked={formValue.is_user_active} onChange={(event) => updateField("is_user_active", event.target.checked)} type="checkbox" />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Must change password</strong>
                  <p className="section-copy">Require a fresh password on the next login for safer provisioning.</p>
                </div>
                <input checked={formValue.must_change_password} onChange={(event) => updateField("must_change_password", event.target.checked)} type="checkbox" />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Default membership</strong>
                  <p className="section-copy">Use this membership as the primary tenant membership for the employee.</p>
                </div>
                <input checked={formValue.is_default_membership} onChange={(event) => updateField("is_default_membership", event.target.checked)} type="checkbox" />
              </label>
            </div>
          </FormSection>

          <FormSection
            fullWidth
            title="Role assignment"
            description="Assign one or more tenant roles. The role mix should stay clear enough that routing and permissions remain understandable."
          >
            <div className="selection-list">
              {options.roles.map((role) => (
                <label className="selection-row" key={role.id}>
                  <div>
                    <strong>{role.name}</strong>
                    <p className="section-copy">{role.code}</p>
                  </div>
                  <input checked={formValue.role_ids.includes(role.id)} onChange={() => toggleRole(role.id)} type="checkbox" />
                </label>
              ))}
            </div>
          </FormSection>
        </div>

        {error ? (
          <div className="notice">
            <strong>Save failed.</strong>
            <span className="muted">{error}</span>
          </div>
        ) : null}
        {!hasSelectedRoles ? (
          <div className="notice">
            <strong>At least one role is required.</strong>
            <span className="muted">Assign a tenant role so workspace routing and access expectations stay explicit.</span>
          </div>
        ) : null}
        {employeeBlocksActiveAccess && hasActiveAccessSelection ? (
          <div className="notice">
            <strong>Employee status blocks active access.</strong>
            <span className="muted">Inactive or exited employees must keep both user access and membership access non-active before this form can be saved.</span>
            <div className="form-actions-bar__buttons">
              <button className="button button--secondary" onClick={applyOffboardingSafeDefaults} type="button">
                Apply offboarding-safe defaults
              </button>
            </div>
          </div>
        ) : null}
        {successNotice ? (
          <div className="notice">
            <strong>Access updated.</strong>
            <span className="muted">{successNotice}</span>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <span className="muted">Provisioning updates immediately refresh the employee access view and keep the account aligned with role routing.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || !hasSelectedRoles || (employeeBlocksActiveAccess && hasActiveAccessSelection)} type="submit">
              {isSubmitting ? "Saving..." : existingAccess ? "Update access" : "Create access"}
            </button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">
              Cancel
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
