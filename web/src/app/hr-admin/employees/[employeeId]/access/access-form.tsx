"use client";

import { useEffect, useRef, useState } from "react";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { WorkspaceFormFooter } from "@/components/patterns/workspace-standard";
import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { apiFieldErrors, mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { useMaintenanceDraft, type MaintenanceCallbacks } from "../../use-maintenance-draft";
import { FormSection } from "@/components/patterns/form-section";
import { employeeAccessDetailToFormValue } from "@/app/hr-admin/employees/[employeeId]/access/form-values";
import { hasFieldErrors, requireText, validateEmail } from "@/lib/ui/validation";
import type {
  HrAdminEmployeeAccessDetail,
  HrAdminEmployeeAccessOptions,
  HrAdminEmployeeAccessWriteInput,
} from "@/lib/types";

type AccessFormProps = MaintenanceCallbacks & {
  employeeId: string;
  initialValue: HrAdminEmployeeAccessWriteInput;
  options: HrAdminEmployeeAccessOptions;
  existingAccess: boolean;
  employeeStatus: string;
  cancelHref?: string;
};

type AccessFieldErrors = Partial<Record<keyof HrAdminEmployeeAccessWriteInput, string>>;

function FieldError({ message, field }: { message?: string; field: string }) {
  return message ? <span id={`access-error-${field}`} className="field-error-text">{message}</span> : null;
}

export function EmployeeAccessForm({ employeeId, initialValue, options, existingAccess, employeeStatus, cancelHref, ...callbacks }: AccessFormProps) {
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AccessFieldErrors>({});
  const [successNotice, setSuccessNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [hasAccess, setHasAccess] = useState(existingAccess);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
  const draft = useMaintenanceDraft(formValue, isSubmitting, employeeId, cancelHref, callbacks);
  const formRef = useValidationFocus(fieldErrors);
  const feedbackRef = useFeedbackFocus(error, isSubmitting, hasFieldErrors(fieldErrors));
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (successNotice && !isSubmitting) successRef.current?.focus(); }, [successNotice, isSubmitting]);
  const hasSelectedRoles = formValue.role_ids.length > 0;
  const employeeBlocksActiveAccess = ["inactive", "exited"].includes(employeeStatus);
  const hasActiveAccessSelection = formValue.is_user_active || formValue.membership_status === "active";
  const offboardingMembershipStatus = employeeStatus === "exited" ? "revoked" : "suspended";

  function updateField<Key extends keyof HrAdminEmployeeAccessWriteInput>(key: Key, value: HrAdminEmployeeAccessWriteInput[Key]) {
    setSuccessNotice("");
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(roleId: string) {
    setSuccessNotice("");
    setFieldErrors(current => ({ ...current, role_ids: undefined }));
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
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[name="membership_status"]')?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.ready || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setError("");
    setSuccessNotice("");
    setFieldErrors({});
    const nextErrors: AccessFieldErrors = {
      username: requireText(formValue.username, "Enter the username."),
      email: requireText(formValue.email, "Enter the email address.") ?? validateEmail(formValue.email, "Enter a valid email address."),
      role_ids: formValue.role_ids.length ? undefined : "Select at least one tenant role.",
      membership_status:
        employeeBlocksActiveAccess && hasActiveAccessSelection
          ? `Set membership to ${offboardingMembershipStatus} and turn user access off for this employee status.`
          : undefined,
    };
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted access fields and try again.");
      isSubmittingRef.current = false;
      return;
    }
    if (!window.confirm(hasAccess ? "Save access changes? Sign-in, membership and tenant roles update immediately." : "Provision login access with these membership and tenant role settings?")) {
      isSubmittingRef.current = false;
      return;
    }
    setIsSubmitting(true);

    let response: Response;
    try {
      response = await fetch(`/api/hr-admin/employees/${employeeId}/access`, {
        method: hasAccess ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError(networkMutationMessage);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(mutationErrorMessage(payload, response.status, "Unable to save employee access."));
      setFieldErrors(apiFieldErrors(payload, Object.keys(initialValue) as Array<keyof HrAdminEmployeeAccessWriteInput>));
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    setGeneratedPassword(typeof payload.generated_password === "string" ? payload.generated_password : "");
    setShowGeneratedPassword(false);
    setShowPassword(false);
    setSuccessNotice("Employee access saved. Login, membership and role settings are up to date.");
    const nextValue = employeeAccessDetailToFormValue(payload as HrAdminEmployeeAccessDetail);
    setFormValue(nextValue);
    draft.markSaved(nextValue);
    setHasAccess(true);
    setIsSubmitting(false);
    isSubmittingRef.current = false;
  }

  return (
    <form ref={formRef} aria-busy={isSubmitting} className="section form-layout-modern employee-child-form employee-maintenance-form employee-access-form" noValidate onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{hasAccess ? "Update user access" : "Provision user access"}</h2>
            <p className="section-copy">
              Link login, membership, and role access for ESS or MSS routing.
            </p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip">
              <strong>{hasAccess ? "Existing" : "New"}</strong> access state
            </span>
            <span className="queue-summary-chip">
              <strong>{formValue.role_ids.length}</strong> selected roles
            </span>
          </div>
        </div>

        {cancelHref ? <p className="employee-maintenance-context">{hasAccess ? "Update existing access" : "Provision new access"} · {formValue.role_ids.length} selected roles</p> : null}
        <fieldset disabled={!draft.ready || isSubmitting} className="employee-maintenance-fields">
        <legend className="sr-only">Employee access settings</legend>
        <p className="employee-maintenance-help">Username, email and at least one tenant role are required.</p>
        <div className="form-shell-card__grid">
          <FormSection
            title="Identity and membership"
            description="Set the core login identity and membership state that determines whether the employee can enter the tenant."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Username</span>
                <input name="username" aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? "access-error-username" : undefined} className="input-control" required value={formValue.username} onChange={(event) => updateField("username", event.target.value)} />
                <FieldError field="username" message={fieldErrors.username} />
              </label>
              <label className="form-field">
                <span className="muted">Email</span>
                <input name="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "access-error-email" : undefined} className="input-control" required type="email" value={formValue.email} onChange={(event) => updateField("email", event.target.value)} />
                <FieldError field="email" message={fieldErrors.email} />
              </label>
              <label className="form-field">
                <span className="muted">First name</span>
                <input name="first_name" aria-invalid={Boolean(fieldErrors.first_name)} aria-describedby={fieldErrors.first_name ? "access-error-first_name" : undefined} className="input-control" value={formValue.first_name} onChange={(event) => updateField("first_name", event.target.value)} />
              <FieldError field="first_name" message={fieldErrors.first_name} /></label>
              <label className="form-field">
                <span className="muted">Last name</span>
                <input name="last_name" aria-invalid={Boolean(fieldErrors.last_name)} aria-describedby={fieldErrors.last_name ? "access-error-last_name" : undefined} className="input-control" value={formValue.last_name} onChange={(event) => updateField("last_name", event.target.value)} />
              <FieldError field="last_name" message={fieldErrors.last_name} /></label>
              <label className="form-field">
                <span className="muted">Display name</span>
                <input name="display_name" aria-invalid={Boolean(fieldErrors.display_name)} aria-describedby={fieldErrors.display_name ? "access-error-display_name" : undefined} className="input-control" value={formValue.display_name} onChange={(event) => updateField("display_name", event.target.value)} />
              <FieldError field="display_name" message={fieldErrors.display_name} /></label>
              <label className="form-field">
                <span className="muted">Phone number</span>
                <input name="phone_number" aria-invalid={Boolean(fieldErrors.phone_number)} aria-describedby={fieldErrors.phone_number ? "access-error-phone_number" : undefined} className="input-control" value={formValue.phone_number} onChange={(event) => updateField("phone_number", event.target.value)} />
              <FieldError field="phone_number" message={fieldErrors.phone_number} /></label>
              <label className="form-field">
                <span className="muted">Membership status</span>
                <select name="membership_status" aria-invalid={Boolean(fieldErrors.membership_status)} aria-describedby={fieldErrors.membership_status ? "access-error-membership_status" : undefined} className="input-control" value={formValue.membership_status} onChange={(event) => updateField("membership_status", event.target.value)}>
                  {options.membership_statuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {employeeBlocksActiveAccess ? (
                  <span className="muted">Recommended for offboarding: {offboardingMembershipStatus} membership with user access turned off.</span>
                ) : null}
                <FieldError field="membership_status" message={fieldErrors.membership_status} />
              </label>
              <div className="employee-sensitive-field"><label className="form-field">
                <span className="muted">Temporary password</span>
                <input name="password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "access-error-password" : undefined}
                  className="input-control"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formValue.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder={existingAccess ? "Leave blank to keep current password" : "Leave blank to auto-generate"}
                />

                <FieldError field="password" message={fieldErrors.password} />
              </label><button className="button button--secondary" type="button" aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? "Hide temporary password" : "Show temporary password"}</button></div>
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
                <input name="is_user_active" aria-invalid={Boolean(fieldErrors.is_user_active)} aria-describedby={fieldErrors.is_user_active ? "access-error-is_user_active" : undefined} checked={formValue.is_user_active} onChange={(event) => updateField("is_user_active", event.target.checked)} type="checkbox" />
              <FieldError field="is_user_active" message={fieldErrors.is_user_active} /></label>
              <label className="toggle-field">
                <div>
                  <strong>Must change password</strong>
                  <p className="section-copy">Require a fresh password on the next login for safer provisioning.</p>
                </div>
                <input name="must_change_password" aria-invalid={Boolean(fieldErrors.must_change_password)} aria-describedby={fieldErrors.must_change_password ? "access-error-must_change_password" : undefined} checked={formValue.must_change_password} onChange={(event) => updateField("must_change_password", event.target.checked)} type="checkbox" />
              <FieldError field="must_change_password" message={fieldErrors.must_change_password} /></label>
              <label className="toggle-field">
                <div>
                  <strong>Default membership</strong>
                  <p className="section-copy">Use this membership as the primary tenant membership for the employee.</p>
                </div>
                <input name="is_default_membership" aria-invalid={Boolean(fieldErrors.is_default_membership)} aria-describedby={fieldErrors.is_default_membership ? "access-error-is_default_membership" : undefined} checked={formValue.is_default_membership} onChange={(event) => updateField("is_default_membership", event.target.checked)} type="checkbox" />
              <FieldError field="is_default_membership" message={fieldErrors.is_default_membership} /></label>
            </div>
          </FormSection>

          <FormSection
            fullWidth
            title="Role assignment"
            description="Assign one or more tenant roles. The role mix should stay clear enough that routing and permissions remain understandable."
          >
            <div className="selection-list" role="group" aria-label="Tenant roles">
              {options.roles.map((role) => (
                <label className="selection-row" key={role.id}>
                  <div>
                    <strong>{role.name}</strong>
                    <p className="section-copy">{role.code}</p>
                  </div>
                  <input aria-invalid={Boolean(fieldErrors.role_ids)} aria-describedby={fieldErrors.role_ids ? "access-error-role_ids" : undefined} checked={formValue.role_ids.includes(role.id)} onChange={() => toggleRole(role.id)} type="checkbox" />
                </label>
              ))}
            </div>
            <FieldError field="role_ids" message={fieldErrors.role_ids} />
          </FormSection>
        </div>

        </fieldset>

        {error ? (
          <div ref={feedbackRef} tabIndex={-1} className="notice notice--error" role="alert">
            <strong>Save needs attention.</strong>
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
              <button className="button button--secondary" disabled={!draft.ready || isSubmitting} onClick={applyOffboardingSafeDefaults} type="button">
                Apply offboarding-safe defaults
              </button>
            </div>
          </div>
        ) : null}
        {successNotice ? (
          <div ref={successRef} tabIndex={-1} role="status" className="notice notice--success">
            <strong>Access updated.</strong>
            <span className="muted">{successNotice}</span>
          </div>
        ) : null}

        {generatedPassword ? (
          <section className="employee-generated-credential" aria-label="Generated temporary credential">
            <label className="form-field"><span>Generated temporary password</span><input className="input-control" readOnly type={showGeneratedPassword ? "text" : "password"} value={generatedPassword} autoComplete="off" /></label>
            <button className="button button--secondary" type="button" aria-pressed={showGeneratedPassword} onClick={() => setShowGeneratedPassword(current => !current)}>{showGeneratedPassword ? "Hide generated password" : "Show generated password"}</button>
            <p>Share through your approved secure channel.</p>
          </section>
        ) : null}
        <WorkspaceFormFooter className="form-actions-bar" fixed note="Login, membership and roles update immediately.">
          <button className="button button--secondary" disabled={!draft.ready || isSubmitting} onClick={draft.cancel} type="button">Cancel</button>
          <AsyncActionButton className="button button--primary" disabled={!draft.ready || isSubmitting} pending={isSubmitting} pendingLabel="Saving access" type="submit">{hasAccess ? "Update access" : "Create access"}</AsyncActionButton>
        </WorkspaceFormFooter>
      </section>
    </form>
  );
}
